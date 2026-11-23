/* z-motion-video · engine core (MIT)
 * 逐帧确定性渲染：renderAt(t) 画出 t 秒那一帧，同一个 t 永远得到同一张画面。
 * 图层：#bg 底纸(画一次转成 img) → #scenes 场景 DOM → #chrome 页眉页脚 → #wipe 转场遮罩 → #subs 字幕 → #ovl 纹理
 * 启动顺序：建场景 → 加载字体图片 → 自动排版(缩放/标题断行) → 布局钩子 → 按口播排期 → 预测量 → READY
 */
(() => {
  'use strict';
  const MV = (window.MV = window.MV || {});
  const PJ = window.PROJECT;
  const ST = PJ.story;
  const W = PJ.W, H = PJ.H;
  const RC = { '3:4': 'r34', '9:16': 'r916', '16:9': 'r169' }[PJ.ratio] || 'r34';
  const LAND = PJ.ratio === '16:9';

  // ───────────── 工具 ─────────────
  const cl = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const EZ = {
    lin: t => t,
    i2: t => t * t,
    o2: t => 1 - (1 - t) * (1 - t),
    o3: t => 1 - Math.pow(1 - t, 3),
    o4: t => 1 - Math.pow(1 - t, 4),
    o5: t => 1 - Math.pow(1 - t, 5),
    io: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    io2: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    expo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    soft: t => { const c1 = 0.8, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) {
    let x = 2166136261;
    s = String(s);
    for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function h(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  const str = s => (s == null ? '' : String(s));
  const esc = s => str(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // 【强调】→ <span class="hl">，\n → 换行
  const rich = s => esc(s).replace(/【([^】]*)】/g, '<span class="hl">$1</span>').replace(/\n/g, '<br>');
  const plain = s => str(s).replace(/[【】]/g, '');
  const richLines = s => str(s).split('\n').map(l => `<span class="ln">${rich(l)}</span>`).join('');
  const pad2 = n => String(n).padStart(2, '0');
  const f1 = v => (+v).toFixed(1);

  // 手绘感路径（种子固定，每帧一致）
  const rough = {
    line(x1, y1, x2, y2, R, amp = 2.2) {
      const mx = (x1 + x2) / 2 + (R() - 0.5) * amp * 2, my = (y1 + y2) / 2 + (R() - 0.5) * amp * 2;
      return `M${f1(x1 + (R() - 0.5) * amp)} ${f1(y1 + (R() - 0.5) * amp)} Q${f1(mx)} ${f1(my)} ${f1(x2 + (R() - 0.5) * amp)} ${f1(y2 + (R() - 0.5) * amp)}`;
    },
    circle(cx, cy, rx, ry, R, turns = 1.08, jit = 0.06) {
      const n = 32, a0 = -Math.PI * 0.62 + R() * 0.4, pts = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (i / n) * Math.PI * 2 * turns;
        const k = 1 + (R() - 0.5) * jit + (i / n) * 0.05;
        pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
      }
      return 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join(' L');
    },
    wave(w, y, amp, period, R) {
      let d = `M0 ${f1(y)}`;
      for (let x = 0; x < w; x += period / 2) {
        const yy = y + ((x / (period / 2)) % 2 ? amp : -amp) * (0.7 + R() * 0.6);
        d += ` Q${f1(x + period / 4)} ${f1(yy)} ${f1(Math.min(w, x + period / 2))} ${f1(y)}`;
      }
      return d;
    },
  };
  // 虚线（拆成多段子路径，描线动画照样生效）
  function dash(x1, y1, x2, y2, on = 12, off = 10) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 1) return '';
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    let d = '';
    for (let s = 0; s < L; s += on + off) {
      const e = Math.min(L, s + on);
      d += `M${f1(x1 + ux * s)} ${f1(y1 + uy * s)} L${f1(x1 + ux * e)} ${f1(y1 + uy * e)} `;
    }
    return d;
  }
  function arrowHead(x1, y1, x2, y2, size = 16, spread = 0.55) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const p1 = [x2 - size * Math.cos(a - spread), y2 - size * Math.sin(a - spread)];
    const p2 = [x2 - size * Math.cos(a + spread), y2 - size * Math.sin(a + spread)];
    return `M${f1(p1[0])} ${f1(p1[1])} L${f1(x2)} ${f1(y2)} L${f1(p2[0])} ${f1(p2[1])}`;
  }

  // 数字解析：前缀 + 数字 + 后缀，用于计数动画
  function parseNum(v) {
    const s = str(v);
    const m = /^(.*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/.exec(s);
    if (!m) return null;
    if (/\d/.test(m[3]) || /\d/.test(m[1])) return null; // 9–11、1:2 这类不做计数
    const raw = m[2];
    if (/,/.test(raw) && !/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) return null;
    const dec = raw.includes('.') ? raw.split('.')[1].length : 0;
    const num = parseFloat(raw.replace(/,/g, ''));
    if (!isFinite(num) || raw.replace(/[^\d]/g, '').length > 12) return null;
    return { pre: m[1], num, dec, comma: raw.includes(','), suf: m[3], raw };
  }
  function fmtNum(o, e) {
    const v = o.num * e;
    let s = Math.abs(v).toFixed(o.dec);
    if (o.comma) { const [a, b] = s.split('.'); s = a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : ''); }
    return (v < 0 && Math.abs(v) >= Math.pow(10, -o.dec) ? '-' : '') + s;
  }

  // 关键词匹配：去掉空白和标点后做子串查找
  const PUNCT = /[\s，。！？、；：“”‘’（）《》〈〉【】「」『』—…·,.!?;:'"()<>\[\]{}~`|]/;
  function normMap(s) {
    const out = [], idx = [];
    const t = str(s);
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (PUNCT.test(c)) continue;
      out.push(c.toLowerCase());
      idx.push(i);
    }
    return { n: out.join(''), idx, len: t.length };
  }
  function autoKeys(...texts) {
    const out = [];
    texts.forEach(text => {
      if (text == null || text === '') return;
      const n = normMap(plain(text)).n;
      if (n.length < 2) return;
      if (/^[\x00-\x7f]+$/.test(n)) { out.push(n.slice(0, 14)); return; }
      [6, 5, 4, 3].forEach(k => { if (n.length >= k) out.push(n.slice(0, k)); });
      if (n.length < 3) out.push(n);
    });
    return Array.from(new Set(out));
  }

  MV.util = { cl, lerp, EZ, rng, hash, h, svg, esc, rich, plain, richLines, rough, dash, arrowHead, parseNum, fmtNum, pad2, W, H, LAND, RC };
  MV.templates = MV.templates || {};
  MV.template = (name, fn) => { MV.templates[name] = fn; };
  MV.style = s => { MV.STYLE = s; };

  // ───────────── 动画类型 ─────────────
  // 每个 kind: f(el, p, o)，p 为 0..1 的原始进度；prep(tr) 在排版完成后测量一次
  // 只用 translate / scale / rotate 独立属性，风格里写的静态 transform 不会被覆盖
  const K = {
    none: { f() {} },
    show: { f(el, p) { el.style.opacity = p > 0 ? 1 : 0; } },
    fade: { f(el, p, o) { el.style.opacity = (o.ease || EZ.o2)(p).toFixed(4); } },
    rise: {
      f(el, p, o) {
        const e = (o.ease || EZ.o3)(p);
        el.style.opacity = cl(p * 1.6).toFixed(4);
        el.style.translate = `0 ${((1 - e) * (o.dist ?? 28)).toFixed(2)}px`;
      },
    },
    up: {
      f(el, p, o) {
        const e = EZ.expo(p);
        el.style.opacity = cl(p * 3).toFixed(4);
        el.style.translate = `0 ${((1 - e) * (o.dist ?? 72)).toFixed(2)}px`;
      },
    },
    slideX: {
      f(el, p, o) {
        const e = (o.ease || EZ.o4)(p);
        el.style.opacity = cl(p * 1.8).toFixed(4);
        el.style.translate = `${((1 - e) * (o.dist ?? -60)).toFixed(2)}px 0`;
      },
    },
    drop: {
      f(el, p, o) {
        const e = EZ.back(p);
        el.style.opacity = cl(p * 3).toFixed(4);
        el.style.translate = `0 ${((1 - e) * -(o.dist ?? 46)).toFixed(2)}px`;
        el.style.rotate = `${((1 - e) * (o.rot ?? 5)).toFixed(2)}deg`;
      },
    },
    pop: {
      f(el, p, o) {
        const e = (o.ease || EZ.back)(p), f0 = o.from ?? 0.6;
        el.style.opacity = cl(p * 3).toFixed(4);
        el.style.scale = (f0 + (1 - f0) * e).toFixed(4);
      },
    },
    slam: {
      f(el, p, o) {
        const e = EZ.o3(p);
        el.style.opacity = cl(p * 2.5).toFixed(4);
        el.style.scale = (1 + (1 - e) * (o.amt ?? 0.22)).toFixed(4);
      },
    },
    blur: {
      f(el, p, o) {
        const e = EZ.o3(p);
        el.style.opacity = e.toFixed(4);
        el.style.filter = p >= 1 ? 'none' : `blur(${((1 - e) * (o.r ?? 10)).toFixed(2)}px)`;
      },
    },
    ink: {
      f(el, p) {
        const e = EZ.o2(p);
        el.style.opacity = cl(p * 1.3).toFixed(4);
        el.style.filter = p >= 1 ? 'none' : `blur(${((1 - e) * 7).toFixed(2)}px)`;
        el.style.scale = (1 + (1 - e) * 0.025).toFixed(4);
      },
    },
    print: {
      f(el, p) {
        const e = EZ.o3(p);
        el.style.opacity = cl(p * 2).toFixed(4);
        el.style.filter = p >= 1 ? 'none' : `blur(${((1 - e) * 2.4).toFixed(2)}px)`;
        el.style.scale = (1 + (1 - e) * 0.035).toFixed(4);
      },
    },
    mask: {
      prep(tr) { tr.o.h = tr.el.offsetHeight || 60; },
      f(el, p, o) {
        const e = (o.ease || EZ.o5)(p);
        const d = (1 - e) * (o.h || 60) * 1.05;
        el.style.opacity = p > 0 ? 1 : 0;
        el.style.translate = `0 ${d.toFixed(2)}px`;
        el.style.clipPath = p >= 1 ? 'none' : `inset(-0.4em -80px ${d.toFixed(2)}px -80px)`;
      },
    },
    wipe: {
      f(el, p, o) {
        const e = (o.ease || EZ.io2)(p);
        el.style.opacity = p > 0 ? 1 : 0;
        el.style.clipPath = p >= 1 ? 'none' : `inset(-40px ${((1 - e) * 100).toFixed(2)}% -40px -40px)`;
      },
    },
    wipeDown: {
      f(el, p, o) {
        const e = (o.ease || EZ.io2)(p);
        el.style.opacity = p > 0 ? 1 : 0;
        el.style.clipPath = p >= 1 ? 'none' : `inset(-40px -40px ${((1 - e) * 100).toFixed(2)}% -40px)`;
      },
    },
    type: {
      f(el, p, o) {
        const n = Math.max(1, o.n || 20);
        const q = Math.min(1, Math.floor(p * n + 0.0001) / n);
        el.style.opacity = p > 0 ? 1 : 0;
        el.style.clipPath = q >= 1 ? 'none' : `inset(-12px ${((1 - q) * 100).toFixed(2)}% -12px -12px)`;
      },
    },
    unfold: {
      f(el, p) {
        const e = EZ.o4(p);
        el.style.opacity = cl(p * 3).toFixed(4);
        el.style.clipPath = p >= 1 ? 'none' : `inset(${((1 - e) * 50).toFixed(2)}% -2px ${((1 - e) * 50).toFixed(2)}% -2px)`;
        el.style.scale = (1 + (1 - e) * 0.05).toFixed(4);
      },
    },
    grow: { f(el, p, o) { el.style.scale = `${(o.ease || EZ.o3)(p).toFixed(4)} 1`; } },
    growY: { f(el, p, o) { el.style.scale = `1 ${(o.ease || EZ.o3)(p).toFixed(4)}`; } },
    stick: {
      f(el, p) {
        el.style.opacity = cl(p * 4).toFixed(4);
        el.style.scale = `${EZ.o3(p).toFixed(4)} 1`;
      },
    },
    stamp: {
      f(el, p) {
        if (p <= 0) { el.style.opacity = 0; return; }
        let s;
        if (p < 0.35) s = 2.1 - 1.15 * EZ.i2(p / 0.35);
        else if (p < 0.6) s = 0.95 + 0.07 * EZ.o2((p - 0.35) / 0.25);
        else s = 1.02 - 0.02 * EZ.o2((p - 0.6) / 0.4);
        el.style.opacity = cl(p / 0.18).toFixed(4);
        el.style.scale = s.toFixed(4);
      },
    },
    draw: {
      prep(tr) {
        const L = tr.el.getTotalLength ? Math.max(1, tr.el.getTotalLength()) : 100;
        tr.o.L = L;
        tr.el.style.strokeDasharray = `${L.toFixed(2)} ${(L + 2).toFixed(2)}`;
      },
      f(el, p, o) {
        const e = (o.ease || EZ.io2)(p);
        el.style.strokeDashoffset = ((o.L || 100) * (1 - e)).toFixed(2);
        el.style.opacity = p > 0 ? 1 : 0;
      },
    },
    mark: { f(el, p, o) { el.style.setProperty('--p', (o.ease || EZ.o3)(p).toFixed(4)); } },
    count: {
      prep(tr) {
        const el = tr.el;
        el.textContent = fmtNum(tr.o.n, 1);
        el.style.minWidth = '';
        const w = el.getBoundingClientRect().width / (MV._k || 1);
        el.style.minWidth = Math.ceil(w + 1) + 'px';
      },
      f(el, p, o) { el.textContent = fmtNum(o.n, (o.ease || EZ.o4)(p)); },
    },
    kb: { f(el, p, o) { el.style.scale = (1 + (o.amt ?? 0.06) * EZ.io2(p)).toFixed(5); } },
  };
  MV.kinds = K;

  // 每个语义角色的默认动画，风格用 motion 覆盖
  const ROLE = {
    kicker: { kind: 'fade', d: 0.5, gap: 0 },
    title: { kind: 'rise', d: 0.7, stagger: 0.09, gap: 0.12 },
    big: { kind: 'rise', d: 0.8, stagger: 0.12, gap: 0.12 },
    text: { kind: 'fade', d: 0.6, gap: 0.35 },
    item: { kind: 'rise', d: 0.55, stagger: 0.06, gap: 0.45 },
    card: { kind: 'rise', d: 0.6, stagger: 0.06, gap: 0.4 },
    num: { kind: 'rise', d: 0.6, gap: 0.3 },
    count: { kind: 'count', d: 1.1 },
    chip: { kind: 'pop', d: 0.42, stagger: 0.07, gap: 0.3 },
    image: { kind: 'rise', d: 0.8, gap: 0.3 },
    bar: { kind: 'fade', d: 0.35, gap: 0.35 },
    grow: { kind: 'grow', d: 0.9 },
    mark: { kind: 'mark', d: 0.55 },
    stamp: { kind: 'stamp', d: 0.5, gap: 0.3 },
    line: { kind: 'draw', d: 0.6 },
    quote: { kind: 'fade', d: 0.9, stagger: 0.22, gap: 0.2 },
    formula: { kind: 'fade', d: 0.8, gap: 0.3 },
    code: { kind: 'type', d: 0.6, gap: 0.3 },
    note: { kind: 'fade', d: 0.6, gap: 0.4 },
    dot: { kind: 'pop', d: 0.35 },
  };

  // ───────────── 运行时状态 ─────────────
  let STYLE, ROLES, TRN, REVEAL0;
  const SCENES = [], LINES = [], ISSUES = [], IMGS = [];
  const SUB = { chunks: [], el: null, box: null, cur: -2 };
  let CHROME = null, WIPE = null, FR = 0, DUR = 0;
  const stage = h('div', '');
  stage.id = 'stage';
  MV._scenes = SCENES;

  function issue(sc, msg) { ISSUES.push({ scene: sc ? sc.i + 1 : 0, type: sc ? sc.t : '', msg }); }

  // ───────────── 时间轴 ─────────────
  function buildTimeline() {
    const TM = PJ.timing;
    let k = 0;
    ST.scenes.forEach((d, i) => {
      const say = d.say == null ? [] : Array.isArray(d.say) ? d.say : [d.say];
      const sc = { i, d, t: d.type || d.t || 'statement', lines: [], tracks: [], beats: [], titles: [], fits: [], layouts: [], afters: [] };
      say.forEach(text => {
        const tl = TM.lines[k] || {};
        const p = plain(text);
        LINES.push({ text: str(text), plain: p, nm: normMap(p), sc: i, s: tl.s ?? 0, e: tl.e ?? 0, words: tl.words || null, k });
        sc.lines.push(k);
        k++;
      });
      const ts = (TM.scenes && TM.scenes[i]) || {};
      sc.s = ts.s ?? 0;
      sc.e = ts.e ?? sc.s + 3;
      sc.dur = Math.max(0.05, sc.e - sc.s);
      SCENES.push(sc);
    });
    if (k !== TM.lines.length) throw new Error(`timing.json 的句子数(${TM.lines.length})和 story 的 say 句数(${k})对不上，请重新运行 timing`);
    if (TM.scenes && TM.scenes.length !== SCENES.length) throw new Error(`timing.json 的场景数(${TM.scenes.length})和 story 的场景数(${SCENES.length})对不上，请重新运行 timing`);
    DUR = TM.duration || (SCENES.length ? SCENES[SCENES.length - 1].e : 1);
    // 章节、页码
    let sec = plain(ST.series || ''), chap = 0;
    SCENES.forEach(sc => {
      if (sc.t === 'chapter') { chap++; sc.chapNo = chap; sec = plain(sc.d.section || sc.d.title || sec).replace(/\n/g, ' '); }
      else if (sc.d.section) sec = plain(sc.d.section);
      sc.section = sec;
      sc.chap = chap;
    });
  }

  // 关键词在场景里所有出现位置 → 场景内秒数
  function findCues(sc, kn) {
    const out = [];
    for (const li of sc.lines) {
      const L = LINES[li], m = L.nm;
      let at = m.n.indexOf(kn);
      while (at >= 0) {
        const raw = m.idx[at];
        let t;
        if (L.words && L.words.length) {
          let w = L.words.find(w2 => raw >= w2.c && raw < w2.c + (w2.n || 1));
          if (!w) w = L.words.filter(w2 => w2.c <= raw).pop() || L.words[0];
          t = w.s;
        } else t = L.s + (L.e - L.s) * (raw / Math.max(1, m.len));
        out.push(t - sc.s - 0.12);
        at = m.n.indexOf(kn, at + 1);
      }
    }
    return out;
  }
  // key：口播里的词 / 数字秒 / "2.5s" / "40%"；from：只接受这个时刻之后的出现
  function cueLocal(sc, key, from) {
    if (key == null || key === '') return null;
    if (typeof key === 'number') return key;
    if (Array.isArray(key)) { for (const k2 of key) { const t = cueLocal(sc, k2, from); if (t != null) return t; } return null; }
    const ks = str(key);
    if (/^-?\d+(\.\d+)?%$/.test(ks)) return (parseFloat(ks) / 100) * sc.dur;
    if (/^-?\d+(\.\d+)?s$/.test(ks)) return parseFloat(ks);
    const kn = normMap(plain(ks)).n;
    if (!kn) return null;
    const all = findCues(sc, kn);
    if (!all.length) return null;
    if (from == null) return all[0];
    const ok = all.find(t => t >= from - 0.25);
    return ok == null ? null : ok;
  }

  // 元素相对参考元素的位置（未缩放的像素）
  function rel(el, ref) {
    const a = el.getBoundingClientRect(), b = ref.getBoundingClientRect(), k = MV._k || 1;
    return { x: (a.left - b.left) / k, y: (a.top - b.top) / k, w: a.width / k, h: a.height / k, cx: (a.left - b.left + a.width / 2) / k, cy: (a.top - b.top + a.height / 2) / k, r: (a.right - b.left) / k, b: (a.bottom - b.top) / k };
  }

  // ───────────── 模板 API ─────────────
  function makeApi(sc) {
    const d = sc.d;
    const R = rng(hash((ST.title || '') + '#' + sc.i));
    const api = {
      sc, d, story: ST, W, H, ratio: PJ.ratio, land: LAND, rc: RC, R, EZ, cl, lerp, h, svg, esc, rich, plain, richLines, rough, dash, arrowHead, pad2, rel, parseNum,
      get style() { return STYLE; },
      get root() { return sc.content; },
      add(parent, tag, cls, html) { const e = h(tag, cls, html); (parent || sc.content).appendChild(e); return e; },
      body(cls) { return api.add(sc.content, 'div', 'body' + (cls ? ' ' + cls : '')); },
      // 登记出场节拍：els 一起出场（按 stagger 错开）；key = 口播关键词 / 秒数 / 百分比；opt.auto = 自动匹配用的文字
      beat(els, role, key, opt = {}) {
        els = [].concat(els).filter(Boolean);
        const b = { els, role, key, opt, t: null, auto: opt.auto != null ? autoKeys(...[].concat(opt.auto)) : null };
        if (!opt.free) els.forEach(e => { e._isBeat = true; });
        sc.beats.push(b);
        return b;
      },
      // 【】强调词：口播说到时点亮
      marks(el, parentBeat) {
        el.querySelectorAll('.hl').forEach(m => {
          sc.beats.push({ els: [m], role: 'mark', key: m.textContent, opt: { free: true, parent: parentBeat || sc.beats[sc.beats.length - 1] }, t: null });
        });
      },
      fitTitle(el) { sc.titles.push(el); },
      fitBox(el, opt = {}) { sc.fits.push({ el, opt }); },
      layout(fn) { sc.layouts.push(fn); },
      after(fn) { sc.afters.push(fn); },
      track(el, kind, t0, dur, o = {}) { const tr = { el, kind, t0, dur: Math.max(0.01, dur), o, last: null }; sc.tracks.push(tr); return tr; },
      cue: (key, from) => cueLocal(sc, key, from),
      num(parent, value, cls) {
        const wrap = api.add(parent, 'span', 'num' + (cls ? ' ' + cls : ''));
        const o = typeof value === 'number' || typeof value === 'string' ? parseNum(value) : null;
        if (!o) { wrap.innerHTML = rich(value); return { wrap, val: null }; }
        if (o.pre) api.add(wrap, 'span', 'pre', rich(o.pre));
        const val = api.add(wrap, 'span', 'val', esc(o.raw));
        if (o.suf) api.add(wrap, 'span', 'suf', rich(o.suf));
        val._num = o;
        return { wrap, val };
      },
      head(o = {}) {
        const k = 'kicker' in o ? o.kicker : d.kicker;
        const t = 'title' in o ? o.title : d.title;
        const s = 'sub' in o ? o.sub : d.sub ?? d.dek;
        if (!k && !t && !s) return null;
        const hd = api.add(o.parent || sc.content, 'div', 'head' + (o.cls ? ' ' + o.cls : ''));
        if (k) api.beat(api.add(hd, 'div', 'kicker', `<span class="kt">${rich(k)}</span>`), 'kicker', d.kickerAt);
        if (t) {
          const e = api.add(hd, 'h1', 'title' + (o.big ? ' xl' : ''));
          str(t).split('\n').forEach(l => { const ln = api.add(e, 'span', 'ln', rich(l)); ln.dataset.src = l; });
          const b = api.beat([...e.children], o.role || 'title', d.titleAt);
          e._beat = b;
          api.marks(e, b);
          api.fitTitle(e);
        }
        if (s) {
          const e = api.add(hd, 'div', 'dek', rich(s));
          const b = api.beat(e, 'text', d.subAt);
          api.marks(e, b);
        }
        return hd;
      },
      note(parent, text, key) {
        if (!text) return null;
        const e = api.add(parent || sc.content, 'div', 'note', rich(text));
        const b = api.beat(e, 'note', key, { auto: text });
        api.marks(e, b);
        return e;
      },
      marker(mode, i, ok) {
        if (STYLE.marker) { const r = STYLE.marker(mode, i, ok, api); if (r != null) return r; }
        if (mode === 'number') return pad2(i + 1);
        if (ok === true) return api.icon('check');
        if (ok === false) return api.icon('cross');
        return '<i class="dotm"></i>';
      },
      badge(i, s) {
        if (STYLE.badge) { const r = STYLE.badge(i, s, api); if (r != null) return r; }
        return String(i + 1);
      },
      link(x1, y1, x2, y2, i) {
        if (STYLE.link) { const r = STYLE.link(x1, y1, x2, y2, { R, i, rough, dash, arrowHead, api }); if (r) return r; }
        return `M${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)}`;
      },
      quoteMark: () => (STYLE.quoteMark != null ? STYLE.quoteMark : '“'),
      icon: name => (STYLE.icons && STYLE.icons[name]) || ICON[name] || '',
      media(src, o = {}) {
        const kind = o.frame || STYLE.mediaFrame || 'plain';
        const m = api.add(o.parent || sc.content, 'div', 'media' + (o.cls ? ' ' + o.cls : ''));
        const fr = api.add(m, 'div', 'frame f-' + kind);
        if (kind === 'window') api.add(fr, 'div', 'fbar', `<i></i><i></i><i></i>${o.title ? `<span>${esc(o.title)}</span>` : ''}`);
        if (kind === 'phone') api.add(fr, 'div', 'notch');
        const shot = api.add(fr, 'div', 'shot');
        const img = api.add(shot, 'img', '');
        img.src = assetUrl(src);
        img.decoding = 'sync';
        IMGS.push(img);
        let cap = null;
        if (o.cap) cap = api.add(m, 'div', 'cap', rich(o.cap));
        const b = api.beat(fr, 'image', o.at, { auto: o.auto });
        if (cap) api.beat(cap, 'note', o.capAt);
        api.track(img, 'kb', 0, sc.dur, { amt: o.kb ?? STYLE.kenBurns ?? 0.05 });
        api.layout(() => {
          const nw = img.naturalWidth || 1600, nh = img.naturalHeight || 1000;
          img.style.width = '0px';
          img.style.height = '0px';
          const padW = fr.offsetWidth, padH = fr.offsetHeight;
          const capH = cap ? cap.offsetHeight + parseFloat(getComputedStyle(cap).marginTop || 0) : 0;
          const aw = Math.max(40, m.clientWidth - padW), ah = Math.max(40, m.clientHeight - padH - capH);
          const k2 = Math.min(aw / nw, ah / nh, o.maxScale ?? 2.5);
          img.style.width = Math.floor(nw * k2) + 'px';
          img.style.height = Math.floor(nh * k2) + 'px';
          if (nw * k2 < 220 || nh * k2 < 130) issue(sc, '图片能用的空间太小，文字可能太多');
        });
        return { m, fr, img, cap, b };
      },
      stamp(text, key) {
        const e = api.add(sc.el, 'div', 'stamp', `<span>${rich(text)}</span>`);
        api.beat(e, 'stamp', key ?? d.stampAt, { last: true });
        return e;
      },
    };
    return api;
  }

  const ICON = {
    check: '<svg class="ic ic-check" viewBox="0 0 48 48"><path class="dr" d="M10 25 L20 35 L39 13"/></svg>',
    cross: '<svg class="ic ic-cross" viewBox="0 0 48 48"><path class="dr" d="M13 13 L35 35 M35 13 L13 35"/></svg>',
    arrow: '<svg class="ic ic-arrow" viewBox="0 0 48 48"><path class="dr" d="M8 24 H38 M28 14 L38 24 L28 34"/></svg>',
  };
  MV.icons = ICON;

  function assetUrl(src) {
    src = str(src);
    if (/^(https?:|data:|file:|blob:)/.test(src)) return src;
    return (PJ.assetBase || '') + src.replace(/^\.?\//, '');
  }

  // ───────────── 构建场景 ─────────────
  function buildScene(sc) {
    const el = h('div', 'scene tpl-' + sc.t);
    el.dataset.i = sc.i;
    sc.el = el;
    const look = (STYLE.look && STYLE.look(sc.d, sc.i, { scenes: SCENES, story: ST, sc, rc: RC, land: LAND })) || {};
    sc.tone = sc.d.tone || look.tone || 'light';
    el.dataset.tone = sc.tone;
    if (look.bg) el.style.setProperty('--scene-bg', look.bg);
    if (look.accent) el.style.setProperty('--accent', look.accent);
    if (look.vars) for (const k in look.vars) el.style.setProperty(k, look.vars[k]);
    if (look.cls) el.classList.add(...look.cls.split(/\s+/).filter(Boolean));
    if (look.trans) sc.trans = look.trans;
    if (sc.d.cls) el.classList.add(...str(sc.d.cls).split(/\s+/).filter(Boolean));
    if (sc.d.accent) el.style.setProperty('--accent', sc.d.accent);
    sc.content = h('div', 'content');
    el.appendChild(sc.content);
    document.getElementById('scenes').appendChild(el);
    const api = makeApi(sc);
    sc.api = api;
    const tpl = MV.templates[sc.t];
    if (!tpl) throw new Error(`第 ${sc.i + 1} 个场景用了不存在的模板：${sc.t}`);
    tpl(sc.d, api);
    if (sc.d.stamp) api.stamp(sc.d.stamp);
    if (STYLE.decorate) STYLE.decorate(sc, api);
  }

  // 节拍排期：口播关键词优先，没匹配到的均匀铺开，最后保证顺序和间隔
  function schedule(sc) {
    const D = sc.dur;
    const tEnd = Math.max(REVEAL0 + 0.3, D - Math.max(0.45, TRN.dur * TRN.align + 0.2));
    const seq = sc.beats.filter(b => !b.opt.free && !b.opt.last);
    const lasts = sc.beats.filter(b => b.opt.last);
    const R0 = b => ROLES[b.role] || ROLES.text;
    // 1) 口播锚点
    let from = -1;
    seq.forEach(b => {
      let t = null;
      if (b.key != null) t = cueLocal(sc, b.key, null);
      if (t == null && b.auto && b.auto.length) t = cueLocal(sc, b.auto, from);
      b.cued = t != null;
      b.t = t;
      if (t != null) from = Math.max(from, t);
    });
    // 2) 顺序与最小间隔
    const fwd = () => {
      let prev = -1e9;
      seq.forEach((b, i) => {
        const g = i === 0 ? 0 : b.opt.gap ?? R0(b).gap ?? 0.3;
        const minT = Math.max(REVEAL0, prev + g);
        if (b.t == null) { b.soft = true; b.t = minT; }
        else if (b.t < minT) b.t = minT;
        prev = b.t;
      });
    };
    fwd();
    // 3) 没有锚点的列表项：在前后锚点之间均匀铺开
    for (let i = 0; i < seq.length; i++) {
      if (!(seq[i].soft && seq[i].opt.spread)) continue;
      let j = i;
      while (j < seq.length && seq[j].soft && seq[j].opt.spread) j++;
      const first = i === 0;
      const ta = first ? REVEAL0 : seq[i - 1].t;
      const nextCued = j < seq.length && seq[j].cued;
      const tb = nextCued ? seq[j].t : Math.min(tEnd, ta + (D - ta) * 0.72);
      const cnt = j - i;
      const slots = cnt + (nextCued ? 1 : 0) - (first ? 1 : 0);
      const step = cl((tb - ta) / Math.max(1, slots), 0.3, 1.8);
      for (let q = 0; q < cnt; q++) seq[i + q].t = Math.max(seq[i + q].t, ta + step * (q + (first ? 0 : 1)));
      i = j - 1;
    }
    fwd();
    // 4) 超出场景就整体压缩
    const last = seq.length ? seq[seq.length - 1].t : REVEAL0;
    if (last > tEnd && last > REVEAL0) {
      const k2 = (tEnd - REVEAL0) / (last - REVEAL0);
      seq.forEach(b => { b.t = REVEAL0 + (b.t - REVEAL0) * k2; });
    }
    let endT = seq.length ? seq[seq.length - 1].t + 0.5 : REVEAL0;
    lasts.forEach(b => {
      let t = b.key != null ? cueLocal(sc, b.key, null) : null;
      if (t == null) t = Math.max(endT + 0.25, D * 0.6);
      b.t = cl(t, REVEAL0, tEnd);
      endT = b.t + 0.3;
    });
    // 5) 强调词：跟在所属节拍之后，口播说到再点亮
    sc.beats.filter(b => b.opt.free).forEach(b => {
      const pb = b.opt.parent;
      const pt = pb && pb.t != null ? pb.t : REVEAL0;
      const pr = pb ? ROLES[pb.role] || ROLES.text : ROLES.text;
      const minT = pt + Math.min(0.9, (pr.d || 0.6) * 0.75);
      const c = cueLocal(sc, b.key, pt - 0.5);
      b.t = Math.min(Math.max(minT, c ?? minT), Math.max(minT, tEnd));
    });
    // 6) 生成动画轨道
    sc.beats.forEach(b => {
      const r = ROLES[b.role] || ROLES.text;
      const kind = b.opt.kind || r.kind;
      const dur = b.opt.d || r.d || 0.6;
      const stg = b.opt.stagger ?? r.stagger ?? 0.06;
      b.els.forEach((el, k2) => {
        const o = Object.assign({}, r.o, b.opt.o);
        if (kind === 'count') { if (!el._num) return; o.n = el._num; }
        sc.tracks.push({ el, kind, t0: b.t + k2 * stg, dur, o, last: null });
      });
      (b.opt.with || []).forEach(w => {
        if (!w || !w[0]) return;
        const [el, rk, delay = 0, o2 = {}] = w;
        const rr = ROLES[rk] || {};
        const kd = o2.kind || rr.kind || rk;
        const o = Object.assign({}, rr.o, o2);
        if (kd === 'count') { if (!el._num) return; o.n = el._num; }
        sc.tracks.push({ el, kind: kd, t0: b.t + delay, dur: o2.d || rr.d || 0.8, o, last: null });
      });
      if (!b.opt.free) {
        // 只描属于本节拍的线条（嵌套在子节拍里的交给子节拍）
        const owned = (p, e) => { for (let n = p.parentNode; n && n !== e; n = n.parentNode) if (n._isBeat) return false; return true; };
        const paths = [];
        b.els.forEach(e => e.querySelectorAll && e.querySelectorAll('.dr').forEach(p => { if (owned(p, e)) paths.push(p); }));
        paths.forEach((p, k2) => sc.tracks.push({ el: p, kind: 'draw', t0: b.t + 0.12 + k2 * 0.1, dur: ROLES.line.d || 0.6, o: {}, last: null }));
      }
      (b.extra || []).forEach(x => sc.tracks.push({ el: x.el, kind: x.kind || 'draw', t0: Math.max(0, b.t + (x.delay ?? 0.1)), dur: x.d || ROLES.line.d || 0.6, o: x.o || {}, last: null }));
    });
    // 7) 焦点跟随：当前项高亮，讲过的项变淡
    //    最后一项讲完、场景快结束时全部恢复，收尾画面完整
    const fb = seq.filter(b => b.opt.focus);
    const rel = fb.length > 1 ? Math.max(fb[fb.length - 1].t + 1.6, D - 1.2) : Infinity;
    fb.forEach((b, i) => {
      const off = i + 1 < fb.length ? fb[i + 1].t : Infinity;
      b.els.forEach(el => sc.tracks.push({ el, kind: 'focus', t0: b.t, dur: 1, o: { on: b.t, off, rel }, last: null }));
    });
    sc.afters.forEach(fn => fn());
  }

  // ───────────── 自动排版 ─────────────
  // 标题过长：先在标点/语义处断成两三行，再不够才缩字号
  function splitSrc(src, parts) {
    const chars = Array.from(str(src));
    const vis = [];
    chars.forEach((c, i) => { if (c !== '【' && c !== '】') vis.push(i); });
    const n = vis.length;
    if (n < 4 || parts < 2) return null;
    const isP = c => /[，、：；。！？,;:!?·—\s）」』》”’]/.test(c);
    const isOpen = c => /[（「『《“‘]/.test(c);
    const isAN = c => /[A-Za-z0-9.%+\-]/.test(c);
    const cuts = [];
    for (let k = 1; k < parts; k++) {
      const target = (n * k) / parts;
      let best = -1, bs = 1e9;
      for (let v = 2; v <= n - 2; v++) {
        if (cuts.length && v <= cuts[cuts.length - 1] + 1) continue;
        const a = chars[vis[v - 1]], b = chars[vis[v]];
        if (isP(b) || isOpen(a) || (isAN(a) && isAN(b))) continue;
        let s = Math.abs(v - target) / n;
        if (isP(a)) s -= 0.16;
        if (s < bs) { bs = s; best = v; }
      }
      if (best < 0) return null;
      cuts.push(best);
    }
    const out = [];
    let st = 0;
    cuts.forEach(v => { out.push(chars.slice(st, vis[v]).join('')); st = vis[v]; });
    out.push(chars.slice(st).join(''));
    let open = false;
    return out.map((p, i) => {
      let s = (open ? '【' : '') + p;
      const o = (s.match(/【/g) || []).length, c = (s.match(/】/g) || []).length;
      open = o > c;
      if (open) s += '】';
      s = s.replace(/【】/g, '').trim();
      if (i < out.length - 1) s = s.replace(/[，、,]+(】?)$/, '$1');
      return s;
    }).filter(Boolean);
  }
  function measureTitle(t) {
    let k2 = 1;
    t.querySelectorAll('.ln').forEach(ln => {
      const sw = ln.scrollWidth, cw = ln.clientWidth;
      if (sw > cw + 1 && cw > 0) k2 = Math.min(k2, cw / sw);
    });
    return k2;
  }
  function fitTitles(sc) {
    sc.titles.forEach(t => {
      t.style.setProperty('--ts', 1);
      let k2 = measureTitle(t);
      if (k2 < 0.82 && !t._split && sc.d.titleSplit !== false) {
        t._split = true;
        let changed = false;
        [...t.querySelectorAll('.ln')].forEach(ln => {
          const sw = ln.scrollWidth, cw = ln.clientWidth;
          if (!(sw > cw * 1.2)) return;
          const parts = splitSrc(ln.dataset.src, Math.min(3, Math.ceil(sw / (cw * 0.95))));
          if (!parts || parts.length < 2) return;
          ln.replaceWith(...parts.map(p => { const e = h('span', 'ln', rich(p)); e.dataset.src = p; return e; }));
          changed = true;
        });
        if (changed) {
          if (t._beat) t._beat.els = [...t.querySelectorAll('.ln')];
          sc.beats = sc.beats.filter(b => !(b.opt.free && !b.els[0].isConnected));
          sc.api.marks(t, t._beat);
          k2 = measureTitle(t);
        }
      }
      if (k2 < 1) t.style.setProperty('--ts', Math.max(0.42, k2 * 0.985).toFixed(4));
      t._k = k2;
    });
    sc.fits.forEach(({ el, opt }) => {
      el.style.setProperty('--fk', 1);
      const aw = opt.width || el.clientWidth || el.parentElement.clientWidth;
      const sw = el.scrollWidth;
      let k2 = 1;
      if (sw > aw + 1) k2 = aw / sw;
      if (opt.height) { const sh = el.scrollHeight; if (sh > opt.height) k2 = Math.min(k2, opt.height / sh); }
      if (k2 < 1) el.style.setProperty('--fk', Math.max(opt.min || 0.3, k2 * 0.985).toFixed(4));
      el._fk = k2;
    });
  }
  function fitScene(sc) {
    const el = sc.el, c = sc.content;
    let s = 1;
    el.style.setProperty('--s', 1);
    for (let k2 = 0; k2 < 18; k2++) {
      fitTitles(sc);
      const ov = c.scrollHeight - c.clientHeight, ow = c.scrollWidth - c.clientWidth;
      if (ov <= 1 && ow <= 1) break;
      s = +(s - 0.04).toFixed(3);
      if (s < 0.46) break;
      el.style.setProperty('--s', s);
    }
    sc.scale = s;
    const ov = c.scrollHeight - c.clientHeight, ow = c.scrollWidth - c.clientWidth;
    if (ov > 2 || ow > 2) issue(sc, `内容溢出 ${Math.max(ov, ow)}px，请删减文字或拆成两个场景`);
    else if (s < 0.8) issue(sc, `内容偏多，整体已缩到 ${Math.round(s * 100)}%，建议删减`);
    sc.titles.forEach(t => { if (t._k < 0.7) issue(sc, `标题行太长，已缩到 ${Math.round(t._k * 100)}%：${plain(t.textContent).slice(0, 16)}`); });
  }

  // ───────────── 字幕 ─────────────
  function chunkLine(text, maxC) {
    const parts = str(text).split(/(?<=[，。！？；：、])|(?<=[,!?;:])(?=\s)/).filter(x => x.trim().length);
    const lenOf = s => normMap(plain(s)).n.length;
    const out = [];
    let cur = '';
    parts.forEach(p => {
      if (!cur) { cur = p; return; }
      if (lenOf(cur + p) <= maxC) cur += p;
      else { out.push(cur); cur = p; }
    });
    if (cur) out.push(cur);
    // 仍然过长的硬切（不切断英文单词和数字）
    const res = [];
    out.forEach(c => {
      const n = lenOf(c);
      if (n <= maxC * 1.25) { res.push(c); return; }
      const pieces = Math.ceil(n / maxC);
      const per = Math.ceil(c.length / pieces);
      let i = 0;
      while (i < c.length) {
        let j = Math.min(c.length, i + per);
        let g = 0;
        while (j < c.length && g < 8 && /[A-Za-z0-9.,%]/.test(c[j - 1]) && /[A-Za-z0-9.,%]/.test(c[j])) { j++; g++; }
        res.push(c.slice(i, j));
        i = j;
      }
    });
    // 【】跨块补齐
    let open = false;
    return res.map(c => {
      let s2 = (open ? '【' : '') + c;
      const o = (s2.match(/【/g) || []).length, cnum = (s2.match(/】/g) || []).length;
      open = o > cnum;
      if (open) s2 += '】';
      return s2.replace(/【】/g, '');
    });
  }
  function subHtml(s) {
    const t = str(s).trim().replace(/[，。、；：,;:\s]+(】?)$/g, '$1').replace(/[，。、；：]|[,;:](?=\s)/g, '　');
    return rich(t).replace(/(　\s*)+/g, '<span class="sp"> </span>');
  }
  function buildSubs() {
    const box = h('div', '');
    box.id = 'subs';
    const inner = h('div', 'subl');
    box.appendChild(inner);
    stage.appendChild(box);
    SUB.box = box;
    SUB.el = inner;
    if (ST.subtitles === false) { box.style.display = 'none'; return; }
    const mc = (STYLE.subMax && STYLE.subMax[RC]) || (LAND ? 26 : 16);
    LINES.forEach((L, li) => {
      const parts = chunkLine(L.text, mc);
      const lens = parts.map(p => Math.max(1, normMap(plain(p)).n.length));
      const tot = lens.reduce((a, b) => a + b, 0);
      let acc = 0;
      parts.forEach((p, j) => {
        let s, e;
        if (L.words && L.words.length) {
          const m = L.nm;
          const c0 = m.idx[Math.min(m.idx.length - 1, acc)] ?? 0;
          const c1 = m.idx[Math.min(m.idx.length - 1, acc + lens[j] - 1)] ?? L.plain.length;
          const w0 = L.words.filter(w => w.c <= c0).pop() || L.words[0];
          const w1 = L.words.filter(w => w.c <= c1).pop() || L.words[L.words.length - 1];
          s = j === 0 ? L.s : w0.s;
          e = j === parts.length - 1 ? L.e : Math.max(s + 0.3, w1.e);
        } else {
          s = L.s + (L.e - L.s) * (acc / tot);
          e = L.s + (L.e - L.s) * ((acc + lens[j]) / tot);
        }
        acc += lens[j];
        SUB.chunks.push({ html: subHtml(p), s, e, li, sc: L.sc });
      });
    });
    // 一直显示到下一块开始（间隔太长就提前收）
    SUB.chunks.forEach((c, i) => {
      const nx = SUB.chunks[i + 1];
      c.show = nx ? (nx.s - c.e < 0.8 ? nx.s : c.e + 0.35) : c.e + 0.6;
    });
  }
  function fitSubs() {
    if (ST.subtitles === false) return;
    const el = SUB.el;
    SUB.box.style.visibility = 'hidden';
    const maxW = parseFloat(getComputedStyle(stage).getPropertyValue('--sub-w')) || W * 0.88;
    SUB.chunks.forEach(c => {
      el.innerHTML = c.html;
      el.style.setProperty('--subk', 1);
      el.classList.remove('wrap');
      const w = el.scrollWidth;
      c.k = 1;
      c.wrap = false;
      if (w > maxW) {
        const k2 = maxW / w;
        if (k2 >= 0.8) c.k = k2 * 0.99;
        else c.wrap = true;
      }
    });
    el.innerHTML = '';
    SUB.box.style.visibility = '';
  }
  function updateSubs(t) {
    if (ST.subtitles === false || !SUB.chunks.length) return;
    let ci = -1;
    for (let i = 0; i < SUB.chunks.length; i++) {
      const c = SUB.chunks[i];
      if (t >= c.s - 0.02 && t < c.show) { ci = i; break; }
      if (c.s > t) break;
    }
    const el = SUB.el;
    if (ci !== SUB.cur) {
      SUB.cur = ci;
      if (ci < 0) { el.innerHTML = ''; SUB.box.dataset.on = '0'; }
      else {
        const c = SUB.chunks[ci];
        el.innerHTML = c.html;
        el.style.setProperty('--subk', c.k.toFixed(4));
        el.classList.toggle('wrap', c.wrap);
        SUB.box.dataset.on = '1';
        SUB.box.dataset.tone = SCENES[c.sc] ? SCENES[c.sc].tone : 'light';
      }
    }
    if (ci >= 0) {
      const c = SUB.chunks[ci];
      el.style.setProperty('--sp', EZ.o2(cl((t - c.s) / 0.16)).toFixed(3));
    }
  }

  // ───────────── 转场 ─────────────
  const dirT = (dir, f) => {
    if (dir === 'up') return `0 ${(f * 100).toFixed(3)}%`;
    if (dir === 'down') return `0 ${(-f * 100).toFixed(3)}%`;
    if (dir === 'right') return `${(-f * 100).toFixed(3)}% 0`;
    return `${(f * 100).toFixed(3)}% 0`;
  };
  function colsPoly(p, n, stag) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const q = cl((p - (i / Math.max(1, n - 1)) * stag) / (1 - stag));
      const hh = (EZ.io2(q) * 100.5).toFixed(2);
      pts.push(`${((i / n) * 100).toFixed(3)}% ${hh}%`, `${(((i + 1) / n) * 100).toFixed(3)}% ${hh}%`);
    }
    return `polygon(0% 0%, ${pts.join(', ')}, 100% 0%)`;
  }
  const TK = {
    cut: { in: p => ({ opacity: p >= 0.5 ? 1 : 0 }), out: p => ({ opacity: p < 0.5 ? 1 : 0 }) },
    fade: {
      in: p => ({ opacity: EZ.o2(cl(p * 2 - 1)) }),
      out: p => ({ opacity: 1 - EZ.i2(cl(p * 2)) }),
    },
    fadeblur: {
      in: p => { const q = cl(p * 1.9 - 0.9); return { opacity: EZ.o2(q), filter: q < 1 ? `blur(${((1 - EZ.o2(q)) * 9).toFixed(2)}px)` : '' }; },
      out: p => { const q = cl(p * 1.9); return { opacity: 1 - EZ.i2(q), filter: q > 0 ? `blur(${(EZ.i2(q) * 9).toFixed(2)}px)` : '' }; },
    },
    rise: {
      in: p => { const q = cl(p * 2 - 0.8); return { opacity: EZ.o2(q), translate: `0 ${((1 - EZ.o3(q)) * 34).toFixed(2)}px` }; },
      out: p => { const q = cl(p * 2); return { opacity: 1 - EZ.i2(q), translate: `0 ${(-EZ.i2(q) * 22).toFixed(2)}px` }; },
    },
    cross: { in: p => ({ opacity: EZ.io2(p) }), out: () => ({}) },
    push: {
      in: (p, o) => ({ translate: dirT(o.dir, 1 - EZ.io(p)) }),
      out: (p, o) => ({ translate: dirT(o.dir, -EZ.io(p) * (o.k ?? 1)) }),
    },
    slide: {
      in: (p, o) => ({ translate: dirT(o.dir, 1 - EZ.io(p)), boxShadow: `0 0 80px rgba(0,0,0,${(0.3 * Math.sin(Math.PI * cl(p))).toFixed(3)})` }),
      out: p => ({ filter: `brightness(${(1 - 0.16 * EZ.io(p)).toFixed(4)})`, scale: (1 - 0.035 * EZ.io(p)).toFixed(4) }),
    },
    paper: {
      in: p => { const e = EZ.o4(p); return { translate: `0 ${((1 - e) * 104).toFixed(3)}%`, rotate: `${((1 - e) * -3.5).toFixed(3)}deg`, boxShadow: `0 -10px 60px rgba(60,40,20,${(0.24 * Math.sin(Math.PI * cl(p))).toFixed(3)})` }; },
      out: p => ({ filter: `brightness(${(1 - 0.1 * p).toFixed(4)})` }),
    },
    columns: {
      in: (p, o) => ({ clipPath: p >= 1 ? '' : colsPoly(p, o.n || 6, o.stagger ?? 0.45) }),
      out: () => ({}),
    },
    wipe: {
      in: (p, o) => ({ opacity: p >= (o.sw ?? 0.5) ? 1 : 0 }),
      out: (p, o) => ({ opacity: p < (o.sw ?? 0.5) ? 1 : 0 }),
    },
  };
  MV.transitions = TK;
  const TPROPS = ['opacity', 'translate', 'scale', 'rotate', 'filter', 'clipPath', 'boxShadow', 'zIndex'];
  function trnFor(bi) {
    const sc = SCENES[bi];
    let kind = (sc && (sc.d.trans || sc.trans)) || TRN.kind;
    if (kind === 'wipe' && !WIPE) kind = 'fade';
    const o = Object.assign({}, TRN, { kind });
    if (TRN.dirs) o.dir = TRN.dirs[bi % TRN.dirs.length];
    return o;
  }
  function applyTrans(sc, role, p, bi) {
    let st = {};
    if (role === 'in' || role === 'out') {
      const o = trnFor(bi);
      const tk = TK[o.kind] || TK.fade;
      st = (tk[role] || (() => ({})))(cl(p), o) || {};
      st.zIndex = role === 'in' ? 2 : 1;
    }
    const key = JSON.stringify(st);
    if (sc.tkey === key) return;
    sc.tkey = key;
    TPROPS.forEach(k2 => { sc.el.style[k2] = st[k2] != null ? String(st[k2]) : ''; });
  }
  function buildWipe() {
    const w = h('div', '');
    w.id = 'wipe';
    stage.appendChild(w);
    if (TRN.kind !== 'wipe' && !TRN.panels) return;
    const panels = TRN.panels || [{ c: 'var(--accent)', w: 1.5 }];
    const tot = panels.reduce((a, b) => a + b.w, 0);
    const box = h('div', 'wp');
    const skew = TRN.skew ?? 12;
    Object.assign(box.style, { position: 'absolute', top: `${-H * 0.1}px`, left: '0px', height: `${H * 1.2}px`, width: `${tot * W}px`, display: 'flex', transform: `skewX(${-skew}deg)`, transformOrigin: '50% 50%' });
    panels.forEach(pn => {
      const e = h('div', 'wpp' + (pn.cls ? ' ' + pn.cls : ''));
      e.style.background = pn.c;
      e.style.width = `${pn.w * W}px`;
      e.style.height = '100%';
      e.style.flex = 'none';
      box.appendChild(e);
    });
    w.appendChild(box);
    WIPE = { el: w, box, tot, pad: Math.tan((skew * Math.PI) / 180) * H * 0.6 + 4, on: true };
    updateWipe(null);
  }
  function updateWipe(p) {
    if (!WIPE) return;
    if (p == null) { if (WIPE.on) { WIPE.el.style.display = 'none'; WIPE.on = false; } return; }
    if (!WIPE.on) { WIPE.el.style.display = ''; WIPE.on = true; }
    const x0 = -WIPE.tot * W - WIPE.pad, x1 = W + WIPE.pad;
    WIPE.box.style.translate = `${lerp(x0, x1, EZ.io(cl(p))).toFixed(2)}px 0`;
  }

  // ───────────── 每帧 ─────────────
  function applyTracks(sc, lt, final) {
    for (const tr of sc.tracks) {
      if (tr.kind === 'focus') { applyFocus(tr, lt, final); continue; }
      const p = final ? 1 : cl((lt - tr.t0) / tr.dur);
      if (tr.last === p) continue;
      tr.last = p;
      const k2 = K[tr.kind];
      if (k2) k2.f(tr.el, p, tr.o);
    }
  }
  function applyFocus(tr, lt, final) {
    const o = tr.o;
    let cur = 0, past = 0;
    if (!final && lt >= o.on) {
      const a = EZ.o2(cl((lt - o.on) / 0.3));
      if (lt >= o.off) { const b = EZ.o2(cl((lt - o.off) / 0.35)); cur = a * (1 - b); past = b; }
      else cur = a;
      if (lt >= o.rel) { const r = 1 - EZ.o2(cl((lt - o.rel) / 0.5)); cur *= r; past *= r; }
    }
    const key = cur.toFixed(3) + ',' + past.toFixed(3);
    if (tr.last === key) return;
    tr.last = key;
    tr.el.style.setProperty('--cur', cur.toFixed(3));
    tr.el.style.setProperty('--past', past.toFixed(3));
    tr.el.classList.toggle('is-cur', cur > 0.5);
    tr.el.classList.toggle('is-past', past > 0.5);
  }
  function show(sc, on) {
    if (sc.shown === on) return;
    sc.shown = on;
    sc.el.style.display = on ? 'block' : 'none';
  }
  function curIndex(t) {
    let c = 0;
    for (let i = 0; i < SCENES.length; i++) if (SCENES[i].s <= t + 1e-6) c = i;
    return c;
  }
  function frame(t) {
    FR++;
    const N = SCENES.length;
    const c = curIndex(t);
    const vis = new Map([[c, { role: 'none', p: 0, bi: c }]]);
    const T = TRN.dur, A = TRN.align;
    let wp = null, wbi = -1, dom = c;
    if (c > 0) {
      const b = SCENES[c].s;
      if (t < b + T * (1 - A)) {
        const p = (t - (b - T * A)) / T;
        vis.set(c, { role: 'in', p, bi: c });
        vis.set(c - 1, { role: 'out', p, bi: c });
        wp = p; wbi = c;
        if (p < 0.5) dom = c - 1;
      }
    }
    if (c < N - 1) {
      const b = SCENES[c + 1].s;
      if (t >= b - T * A) {
        const p = (t - (b - T * A)) / T;
        vis.set(c, { role: 'out', p, bi: c + 1 });
        vis.set(c + 1, { role: 'in', p, bi: c + 1 });
        wp = p; wbi = c + 1;
        if (p >= 0.5) dom = c + 1;
      }
    }
    SCENES.forEach((sc, i) => {
      const v = vis.get(i);
      if (!v) { show(sc, false); return; }
      show(sc, true);
      applyTrans(sc, v.role, v.p, v.bi);
      applyTracks(sc, t - sc.s, false);
    });
    updateWipe(wbi >= 0 && trnFor(wbi).kind === 'wipe' ? wp : null);
    updateChrome(t, SCENES[dom], false);
    updateSubs(t);
    if (STYLE.tick) STYLE.tick(t, { sc: SCENES[dom], dur: DUR, stage });
  }
  function updateChrome(t, sc, cover) {
    if (!CHROME) return;
    const info = {
      t, sc, i: sc.i, n: SCENES.length, page: pad2(sc.i + 1), total: pad2(SCENES.length),
      progress: cover ? 0 : cl(t / DUR), section: sc.section, chap: sc.chap, tone: sc.tone, cover: !!cover, story: ST, type: sc.t,
    };
    const ch = document.getElementById('chrome');
    if (ch.dataset.tone !== sc.tone) ch.dataset.tone = sc.tone;
    if (ch.dataset.type !== sc.t) ch.dataset.type = sc.t;
    CHROME(info);
  }
  function renderAt(t) { frame(+t); return FR; }
  function renderCover() {
    FR++;
    let ci = SCENES.findIndex(s => s.t === 'cover');
    if (ci < 0) ci = 0;
    const sc = SCENES[ci];
    SCENES.forEach(s => show(s, s === sc));
    applyTrans(sc, 'none', 0, ci);
    applyTracks(sc, 1e9, true);
    updateWipe(null);
    updateChrome(0, sc, true);
    SUB.cur = -2;
    if (SUB.el) SUB.el.innerHTML = '';
    if (SUB.box) SUB.box.dataset.on = '0';
    if (STYLE.tick) STYLE.tick(0, { sc, dur: DUR, stage, cover: true });
    return FR;
  }

  // ───────────── 启动 ─────────────
  async function boot() {
    try {
      STYLE = MV.STYLE || {};
      TRN = Object.assign({ kind: 'fade', dur: 0.5, align: 0.5 }, STYLE.transition || {});
      ROLES = {};
      for (const k2 in ROLE) ROLES[k2] = Object.assign({}, ROLE[k2], (STYLE.motion || {})[k2] || {});
      for (const k2 in STYLE.motion || {}) if (!ROLES[k2]) ROLES[k2] = STYLE.motion[k2];
      REVEAL0 = STYLE.revealDelay ?? +(TRN.dur * (1 - TRN.align) * 0.7 + 0.12).toFixed(3);

      document.body.appendChild(stage);
      stage.className = `${RC} st-${PJ.style}${ST.subtitles === false ? ' nosub' : ''}`;
      stage.style.setProperty('--W', W + 'px');
      stage.style.setProperty('--H', H + 'px');
      MV._k = 1;

      buildTimeline();

      // 底纸：canvas 画一次 → img（并行渲染时不会丢 GPU 画布）
      const bgUrl = await paintLayer(STYLE.paint);
      const bg = h('img', '');
      bg.id = 'bg';
      if (bgUrl) { bg.src = bgUrl; stage.style.setProperty('--paper', `url("${bgUrl}")`); IMGS.push(bg); }
      else bg.style.display = 'none';
      stage.appendChild(bg);
      const sw = h('div', '');
      sw.id = 'scenes';
      stage.appendChild(sw);
      const ch = h('div', '');
      ch.id = 'chrome';
      stage.appendChild(ch);
      buildWipe();
      buildSubs();
      if (STYLE.overlay) {
        const ovUrl = await paintLayer(STYLE.overlay);
        if (ovUrl) { const ov = h('img', ''); ov.id = 'ovl'; ov.src = ovUrl; stage.appendChild(ov); IMGS.push(ov); }
      }
      const ctx = { el: ch, stage, h, svg, esc, rich, plain, story: ST, scenes: SCENES, W, H, ratio: PJ.ratio, rc: RC, land: LAND, rough, rng, hash, EZ, cl, lerp, pad2 };
      if (STYLE.chrome) CHROME = STYLE.chrome(ctx) || null;
      if (STYLE.setup) STYLE.setup(ctx);

      SCENES.forEach(sc => buildScene(sc));

      // 字体：按实际用到的文字加载
      const allText = stage.textContent + plain(JSON.stringify(ST)) + SUB.chunks.map(c => c.html.replace(/<[^>]+>/g, '')).join('') + '0123456789/·—…%';
      const fams = PJ.fonts || [];
      const sample = Array.from(new Set(allText.replace(/\s/g, ''))).join('');
      const loads = [];
      fams.forEach(f => {
        (f.weights || ['400']).forEach(wt => loads.push(document.fonts.load(`${f.style || 'normal'} ${wt} 40px "${f.family}"`, sample).catch(() => [])));
      });
      await Promise.all(loads);
      await Promise.all(IMGS.map(im => (im.complete && im.naturalWidth ? Promise.resolve() : im.decode().catch(() => issue(null, '图片加载失败：' + im.getAttribute('src'))))));

      // 排版：场景隐身显示出来量尺寸（公式等用到的字体这时才会请求，再等一次）
      SCENES.forEach(sc => { sc.el.style.visibility = 'hidden'; sc.el.style.display = 'block'; });
      void stage.offsetHeight;
      await document.fonts.ready;
      fitSubs();
      SCENES.forEach(sc => { fitScene(sc); sc.layouts.forEach(fn => fn()); });
      SCENES.forEach(sc => schedule(sc));
      SCENES.forEach(sc => sc.tracks.forEach(tr => { const k2 = K[tr.kind]; if (k2 && k2.prep) k2.prep(tr); }));
      await document.fonts.ready;
      SCENES.forEach(sc => { sc.el.style.display = 'none'; sc.el.style.visibility = ''; sc.shown = false; });

      // 字体自检
      const chk = { ok: true, fams: {} };
      fams.forEach(f => {
        const faces = Array.from(document.fonts).filter(ff => ff.family.replace(/["']/g, '') === f.family);
        const loaded = faces.filter(ff => ff.status === 'loaded').length;
        const okf = loaded > 0 && document.fonts.check(`${f.style || 'normal'} ${(f.weights || ['400'])[0]} 40px "${f.family}"`, sample.slice(0, 800));
        chk.fams[f.family] = { faces: faces.length, loaded, ok: okf };
        if (!okf && !f.optional) chk.ok = false;
      });
      window.FONTCHECK = chk;

      window.SCENE_INFO = SCENES.map(sc => {
        const ends = sc.tracks.filter(tr => tr.kind !== 'focus' && tr.kind !== 'kb').map(tr => tr.t0 + tr.dur);
        const rels = sc.tracks.filter(tr => tr.kind === 'focus' && isFinite(tr.o.rel)).map(tr => tr.o.rel + 0.6);
        const full = Math.max(REVEAL0 + 0.5, ...ends, ...rels, 0) + 0.25;
        const lim = sc.dur - TRN.dur * TRN.align - 0.05;
        return { i: sc.i, type: sc.t, s: +sc.s.toFixed(3), e: +sc.e.toFixed(3), snap: +(sc.s + Math.max(0.3, Math.min(full, lim))).toFixed(3), scale: sc.scale, title: plain(sc.d.title || sc.d.text || sc.d.value || '').replace(/\n/g, ' ').slice(0, 24) };
      });
      window.ISSUES = ISSUES;
      window.DURATION = DUR;
      renderAt(0);
      if (/preview/.test(location.hash)) MV.preview();
      window.READY = true;
    } catch (e) {
      window.BOOT_ERROR = String((e && e.stack) || e);
      console.error(e);
      window.READY = true;
    }
  }
  async function paintLayer(fn) {
    if (!fn) return null;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d');
    const r = fn(g, W, H, rng(hash((ST.title || '') + PJ.style)), { rough, rng, cl, lerp, EZ, noise: (a, b, c) => paintNoise(g, a, b, c), story: ST, rc: RC, land: LAND });
    if (r === false) return null;
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    return blob ? URL.createObjectURL(blob) : null;
  }
  function paintNoise(g, amt = 10, seed = 7, mono = true) {
    const im = g.getImageData(0, 0, W, H), dd = im.data, R = rng(seed);
    for (let i = 0; i < dd.length; i += 4) {
      if (mono) { const n = (R() - 0.5) * amt; dd[i] += n; dd[i + 1] += n; dd[i + 2] += n; }
      else { dd[i] += (R() - 0.5) * amt; dd[i + 1] += (R() - 0.5) * amt; dd[i + 2] += (R() - 0.5) * amt; }
    }
    g.putImageData(im, 0, 0);
  }

  // 预览模式：index.html#preview，带播放条，和配音同步
  MV.preview = () => {
    const sk = Math.min((innerWidth - 20) / W, (innerHeight - 70) / H, 1);
    const wrap = h('div', 'pv-wrap');
    Object.assign(wrap.style, { width: W * sk + 'px', height: H * sk + 'px', overflow: 'hidden', margin: '10px auto 0' });
    stage.style.transformOrigin = '0 0';
    stage.style.transform = `scale(${sk})`;
    MV._k = sk;
    document.body.style.background = '#1d1d1d';
    document.body.insertBefore(wrap, stage);
    wrap.appendChild(stage);
    const bar = h('div', 'pv-bar');
    Object.assign(bar.style, { display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', padding: '10px', color: '#ddd', font: '13px/1.2 sans-serif' });
    const btn = h('button', '', '▶');
    const rg = h('input', '');
    rg.type = 'range'; rg.min = 0; rg.max = DUR; rg.step = 0.01; rg.value = 0; rg.style.width = '60%';
    const lab = h('span', '', '0.0s');
    bar.append(btn, rg, lab);
    document.body.appendChild(bar);
    const au = PJ.audio ? new Audio(PJ.audio) : null;
    let playing = false, t0 = 0, w0 = 0, cur = 0;
    const draw = t => { cur = cl(t, 0, DUR); renderAt(cur); rg.value = cur; lab.textContent = cur.toFixed(1) + 's / ' + DUR.toFixed(1) + 's'; };
    const loop = () => {
      if (!playing) return;
      const t = au ? au.currentTime : w0 + (performance.now() - t0) / 1000;
      draw(t);
      if (t >= DUR) { playing = false; btn.textContent = '▶'; return; }
      requestAnimationFrame(loop);
    };
    const play = () => {
      playing = !playing;
      btn.textContent = playing ? '❚❚' : '▶';
      if (playing) { t0 = performance.now(); w0 = cur; if (au) { au.currentTime = cur; au.play(); } requestAnimationFrame(loop); }
      else if (au) au.pause();
    };
    btn.onclick = play;
    rg.oninput = () => { if (au) au.currentTime = +rg.value; w0 = +rg.value; t0 = performance.now(); draw(+rg.value); };
    addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); play(); }
      if (e.code === 'ArrowRight') { rg.value = cur + 1; rg.oninput(); }
      if (e.code === 'ArrowLeft') { rg.value = cur - 1; rg.oninput(); }
    });
  };

  window.renderAt = renderAt;
  window.renderCover = renderCover;
  MV.boot = boot;
})();
