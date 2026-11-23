/* z-motion-video · scene templates (MIT)
 * 每个模板：(d, api) => 往 api.root 里搭 DOM，再用 api.beat 登记出场节拍。
 * d 是 story.json 里的一个场景对象，字段说明见 docs/templates.md。
 */
(() => {
  'use strict';
  const T = MV.template;
  const { pad2, plain, esc, rich, cl } = MV.util;
  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
  const norm = (it, key = 'text') => (it == null ? {} : typeof it === 'object' ? it : { [key]: String(it) });
  const lines = v => arr(v).flatMap(s => String(s).split('\n')).filter(s => s.trim() !== '');
  const isHot = (d, i, it) => !!(it && it.on) || d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
  const focusOf = (d, api) => d.focus ?? !!api.style.focus;
  // 项目数 class：.n1~.n9，base.css 据此把少量项目放大
  const nc = n => ' n' + Math.max(1, Math.min(n, 9));

  function chips(d, api, parent, list) {
    list = arr(list);
    if (!list.length) return null;
    const box = api.add(parent, 'div', 'chips');
    const els = list.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
    api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: list[0] });
    return box;
  }
  // 横屏 / 竖屏下的列数
  function gridCols(d, api, n, long) {
    if (d.cols) return d.cols;
    if (api.land) return n <= 3 ? n : n === 4 ? (long ? 2 : 4) : 3;
    return n <= 3 ? 1 : 2;
  }

  // ───── 封面 ─────
  T('cover', (d, api) => {
    api.root.classList.add('center');
    api.head({ big: true });
    if (d.image) api.media(d.image, { frame: d.frame, at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
    chips(d, api, api.root, d.tags ?? d.chips);
    if (d.meta) {
      const m = api.add(api.root, 'div', 'meta', rich(d.meta));
      api.beat(m, 'text', d.metaAt);
    }
  });

  // ───── 章节页 ─────
  T('chapter', (d, api) => {
    api.root.classList.add('center');
    const n = d.num ?? pad2(api.sc.chapNo || 1);
    if (n !== false && n !== '') {
      const ne = api.add(api.root, 'div', 'chap-num', esc(n));
      api.beat(ne, 'big', d.numAt);
    }
    api.head({ big: true });
    api.note(api.root, d.note, d.noteAt);
  });

  // ───── 一句话（大字金句 / 观点）─────
  T('statement', (d, api) => {
    api.root.classList.add('center');
    api.head();
    const ls = lines(d.text ?? d.lines);
    if (ls.length) {
      const box = api.add(api.root, 'div', 'say');
      ls.forEach((l, i) => {
        const e = api.add(box, 'div', 'sl', rich(l));
        const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, gap: 0.16 });
        api.marks(e, b);
      });
    }
    api.note(api.root, d.note, d.noteAt);
  });

  // ───── 大数字 ─────
  T('bignum', (d, api) => {
    api.root.classList.add('center');
    api.head();
    const bn = api.add(api.root, 'div', 'bn');
    const row = api.add(bn, 'div', 'bn-row');
    const v = d.value ?? d.num;
    const { val } = api.num(row, v);
    if (d.unit) api.add(row, 'span', 'bn-u', rich(d.unit));
    api.fitBox(row);
    api.beat(row, 'big', d.valueAt, { auto: d.value != null ? String(d.value) : null, with: val ? [[val, 'count', 0]] : [] });
    if (d.label) {
      const l = api.add(bn, 'div', 'bn-l', rich(d.label));
      const b = api.beat(l, 'text', d.labelAt, { auto: d.label });
      api.marks(l, b);
    }
    api.note(api.root, d.note, d.noteAt);
  });

  // ───── 数据卡（2~6 个数字）─────
  T('stats', (d, api) => {
    api.head();
    const items = arr(d.items).map(it => norm(it, 'value'));
    const body = api.body();
    const box = api.add(body, 'div', 'stats' + nc(items.length));
    const cols = gridCols(d, api, items.length, false);
    if (cols === 1) box.classList.add('rows');
    box.style.setProperty('--cols', cols);
    items.forEach((it, i) => {
      const s = api.add(box, 'div', 'stat' + (isHot(d, i, it) ? ' on' : ''));
      const v = api.add(s, 'div', 'stat-v');
      const { val } = api.num(v, it.value);
      if (it.unit) api.add(v, 'span', 'stat-u', rich(it.unit));
      api.fitBox(v);
      const tx = api.add(s, 'div', 'stat-tx');
      if (it.label) api.add(tx, 'div', 'stat-l', rich(it.label));
      if (it.note) api.add(tx, 'div', 'stat-n', rich(it.note));
      const b = api.beat(s, 'card', it.at, { auto: [it.label, it.value], spread: true, focus: focusOf(d, api), with: val ? [[val, 'count', 0.05]] : [] });
      api.marks(tx, b);
    });
    api.note(api.root, d.note, d.noteAt);
  });

  // ───── 列表（要点 / 编号 / 对勾 / 叉）─────
  function listInto(d, api, parent, items, mode) {
    const ul = api.add(parent, 'ul', 'list m-' + mode + nc(items.length));
    ul.style.setProperty('--cols', d.cols ?? (api.land && items.length >= 5 && !parent.classList.contains('split') ? 2 : 1));
    items.forEach((it, i) => {
      const ok = it.ok != null ? !!it.ok : mode === 'check' ? true : mode === 'cross' ? false : undefined;
      const li = api.add(ul, 'li', 'item' + (ok === true ? ' ok' : ok === false ? ' no' : '') + (isHot(d, i, it) ? ' on' : ''));
      api.add(li, 'span', 'mk', api.marker(mode, i, ok));
      const tx = api.add(li, 'span', 'tx', rich(it.text ?? it.title));
      if (it.note) api.add(tx, 'span', 'nt', rich(it.note));
      const b = api.beat(li, 'item', it.at, { auto: it.text ?? it.title, spread: true, focus: focusOf(d, api) });
      api.marks(li, b);
    });
    return ul;
  }
  T('list', (d, api) => {
    api.head();
    const items = arr(d.items).map(it => norm(it));
    const mode = d.mode || (items.some(it => it.ok != null) ? 'check' : 'bullet');
    listInto(d, api, api.body(), items, mode);
    api.note(api.root, d.note, d.noteAt);
  });

  // ───── 步骤 / 流程 ─────
  T('steps', (d, api) => {
    api.head();
    const items = arr(d.items).map(it => norm(it, 'title'));
    const row = d.dir ? d.dir === 'row' : api.land && items.length <= 5;
    const box = api.add(api.body(), 'div', 'steps ' + (row ? 'row' : 'col') + nc(items.length));
    const links = api.svg('svg', { class: 'links' });
    box.appendChild(links);
    const beats = [], badges = [];
    items.forEach((it, i) => {
      const st = api.add(box, 'div', 'step' + (isHot(d, i, it) ? ' on' : ''));
      badges.push(api.add(st, 'div', 'badge', api.badge(i, it)));
      const tx = api.add(st, 'div', 'st-tx');
      api.add(tx, 'div', 'st-t', rich(it.title ?? it.text));
      if (it.title && it.text) api.add(tx, 'div', 'st-n', rich(it.text));
      const b = api.beat(st, 'card', it.at, { auto: it.title ?? it.text, spread: true, focus: focusOf(d, api) });
      api.marks(tx, b);
      beats.push(b);
    });
    api.layout(() => {
      links.innerHTML = '';
      for (let i = 0; i + 1 < badges.length; i++) {
        const a = api.rel(badges[i], box), c = api.rel(badges[i + 1], box), g = 12;
        const [x1, y1, x2, y2] = row ? [a.r + g, a.cy, c.x - g, c.cy] : [a.cx, a.b + g, c.cx, c.y - g];
        if (Math.hypot(x2 - x1, y2 - y1) < 10) continue;
        const p = api.svg('path', { d: api.link(x1, y1, x2, y2, i) });
        links.appendChild(p);
        (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.32 });
      }
    });
    api.note(api.root, d.note, d.noteAt);
  });

  // ───── 卡片（概念 / 特点 / 方案）─────
  T('cards', (d, api) => {
    api.head();
    const items = arr(d.items).map(it => norm(it, 'title'));
    const long = items.some(it => plain(it.text || '').length > (api.land ? 12 : 24) || plain(it.title || '').length > (api.land ? 7 : 14));
    const box = api.add(api.body(), 'div', 'cards' + nc(items.length));
    const cols = gridCols(d, api, items.length, long);
    if (cols === 1) box.classList.add('rows');
    box.style.setProperty('--cols', cols);
    items.forEach((it, i) => {
      const c = api.add(box, 'div', 'card' + (isHot(d, i, it) ? ' on' : ''));
      const k = it.tag ?? it.k ?? it.icon ?? (d.index === false ? null : pad2(i + 1));
      if (k != null && k !== '') api.add(c, 'div', 'card-k', it.icon ? api.icon(it.icon) || esc(it.icon) : rich(k));
      const tx = api.add(c, 'div', 'card-tx');
      if (it.title) api.add(tx, 'div', 'card-t', rich(it.title));
      if (it.text) api.add(tx, 'div', 'card-x', rich(it.text));
      const b = api.beat(c, 'card', it.at, { auto: it.tag != null ? [it.tag, it.title ?? it.text] : it.title ?? it.text, spread: true, focus: focusOf(d, api) });
      api.marks(tx, b);
    });
    api.note(api.root, d.note, d.noteAt);
  });

  // ───── 左右对比 ─────
  T('compare', (d, api) => {
    api.head();
    const body = api.body();
    const g = api.add(body, 'div', 'cmp n2');
    const side = (raw, cls) => {
      const s = norm(raw, 'label');
      const el = api.add(g, 'div', 'side ' + cls + (s.win ? ' win' : ''));
      const head = api.add(el, 'div', 'side-h');
      if (s.tag) api.add(head, 'div', 'side-k', rich(s.tag));
      if (s.label) api.add(head, 'div', 'side-l', rich(s.label));
      let val = null;
      if (s.value != null && s.value !== '') {
        const v = api.add(head, 'div', 'side-v');
        val = api.num(v, s.value).val;
        if (s.unit) api.add(v, 'span', 'side-u', rich(s.unit));
        api.fitBox(v);
      }
      const pts = [];
      if (s.points) {
        const ul = api.add(el, 'ul', 'side-p');
        arr(s.points).forEach(p => {
          const pp = norm(p);
          const ok = pp.ok;
          const li = api.add(ul, 'li', ok === false ? 'no' : ok === true ? 'ok' : '');
          api.add(li, 'span', 'mk', ok === false ? api.icon('cross') : ok === true ? api.icon('check') : '<i class="dotm"></i>');
          api.add(li, 'span', 'tx', rich(pp.text));
          pts.push({ li, pp });
        });
      }
      return { el, head, val, pts, s };
    };
    const L = side(d.left || {}, 'left');
    const vs = api.add(g, 'div', 'vs', esc(d.vs ?? 'VS'));
    const Rt = side(d.right || {}, 'right');
    const run = (S, key) => {
      const b = api.beat(S.el, 'card', S.s.at ?? key, { auto: S.s.label, with: S.val ? [[S.val, 'count', 0.05]] : [] });
      api.marks(S.head, b);
      S.pts.forEach(({ li, pp }) => { const b2 = api.beat(li, 'item', pp.at, { auto: pp.text, spread: true, gap: 0.3 }); api.marks(li, b2); });
      return b;
    };
    run(L, d.leftAt);
    api.beat(vs, 'chip', d.vsAt);
    const rb = run(Rt, d.rightAt);
    const win = L.s.win ? L.el : Rt.s.win ? Rt.el : null;
    if (d.verdict) {
      const v = api.add(body, 'div', 'verdict', rich(d.verdict));
      const b = api.beat(v, 'text', d.verdictAt, { auto: d.verdict, with: win ? [[win, 'mark', 0]] : [] });
      api.marks(v, b);
    } else if (win) (rb.opt.with = rb.opt.with || []).push([win, 'mark', 0.8]);
  });

  // ───── 横向条形图 ─────
  T('bars', (d, api) => {
    api.head();
    const items = arr(d.items).map(it => norm(it, 'label'));
    const vals = items.map(it => Math.abs(parseFloat(String(it.value ?? 0).replace(/,/g, ''))) || 0);
    const log = d.scale === 'log';
    const f = v => (log ? Math.log10(Math.max(v, 1)) : v);
    const mx = d.max != null ? f(+d.max) : Math.max(...vals.map(f), 1e-9);
    const box = api.add(api.body(), 'div', 'bars' + (log ? ' log' : '') + nc(items.length));
    items.forEach((it, i) => {
      const r = api.add(box, 'div', 'bar-row' + (isHot(d, i, it) ? ' on' : ''));
      api.add(r, 'div', 'bar-l', rich(it.label));
      const tr = api.add(r, 'div', 'bar-track');
      const fill = api.add(tr, 'div', 'bar-fill');
      fill.style.setProperty('--w', cl(f(vals[i]) / mx, 0.012, 1).toFixed(4));
      const v = api.add(tr, 'div', 'bar-v');
      const { val } = api.num(v, it.display ?? it.value);
      if (it.unit) api.add(v, 'span', 'bar-u', rich(it.unit));
      const w = [[fill, 'grow', 0.05]];
      if (val) w.push([val, 'count', 0.05, { d: 0.9 }]);
      const b = api.beat(r, 'bar', it.at, { auto: it.label, spread: true, focus: focusOf(d, api), with: w });
      api.marks(r, b);
    });
    api.note(api.root, d.note, d.noteAt);
  });

  // ───── 时间线 ─────
  T('timeline', (d, api) => {
    api.head();
    const items = arr(d.items).map(it => norm(it));
    const row = d.dir ? d.dir === 'row' : api.land && items.length <= 5;
    const box = api.add(api.body(), 'div', 'tl ' + (row ? 'row' : 'col') + nc(items.length));
    const links = api.svg('svg', { class: 'links' });
    box.appendChild(links);
    const beats = [], dots = [];
    items.forEach((it, i) => {
      const el = api.add(box, 'div', 'tl-item' + (isHot(d, i, it) ? ' on' : ''));
      dots.push(api.add(el, 'div', 'tl-dot'));
      if (it.time != null) api.add(el, 'div', 'tl-time', rich(it.time));
      if (it.text) api.add(el, 'div', 'tl-text', rich(it.text));
      const b = api.beat(el, 'item', it.at, { auto: [it.time, it.text], spread: true, focus: focusOf(d, api) });
      api.marks(el, b);
      beats.push(b);
    });
    api.layout(() => {
      links.innerHTML = '';
      for (let i = 0; i + 1 < dots.length; i++) {
        const a = api.rel(dots[i], box), c = api.rel(dots[i + 1], box);
        const ga = a.w / 2 + 8, gc = c.w / 2 + 8;
        const L = Math.hypot(c.cx - a.cx, c.cy - a.cy);
        if (L < ga + gc + 6) continue;
        const ux = (c.cx - a.cx) / L, uy = (c.cy - a.cy) / L;
        const p = api.svg('path', { d: api.link(a.cx + ux * ga, a.cy + uy * ga, c.cx - ux * gc, c.cy - uy * gc, i) });
        links.appendChild(p);
        (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.32 });
      }
    });
    api.note(api.root, d.note, d.noteAt);
  });

  // ───── 引用 ─────
  T('quote', (d, api) => {
    api.root.classList.add('center');
    api.head();
    const q = api.add(api.root, 'div', 'qt');
    const mk = api.quoteMark();
    if (mk) api.beat(api.add(q, 'div', 'qmark', mk), 'chip', d.markAt);
    const qt = api.add(q, 'div', 'q-text');
    const els = lines(d.text ?? d.quote).map(l => api.add(qt, 'div', 'ql', rich(l)));
    const b = api.beat(els, 'quote', d.textAt);
    els.forEach(e => api.marks(e, b));
    const src = d.source ?? d.by ?? d.author;
    if (src) api.beat(api.add(q, 'div', 'q-src', rich(src)), 'note', d.sourceAt, { auto: src });
  });

  // ───── 代码 ─────
  const KW = new Set(('def return if elif else for while in and or not is import from as class try except finally with lambda yield pass break continue ' +
    'True False None function const let var new this async await of typeof instanceof null undefined true false switch case default do throw catch ' +
    'extends export func go defer struct type interface fn pub mut impl use match loop where select insert update delete create table where join on group by order limit').split(' '));
  function tokenize(line, lang) {
    const L = String(lang || '').toLowerCase();
    const hashC = !/^(js|javascript|ts|typescript|c|cpp|c\+\+|java|go|rust|swift|kotlin|css|html|sql)$/.test(L);
    const slashC = !/^(py|python|sh|bash|shell|zsh|ruby|rb|yaml|yml|r|toml|sql)$/.test(L);
    const re = /("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|(#.*$)|(\/\/.*$|--\s.*$)|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([=+\-*/%<>!&|^~?:.,;()[\]{}]+)/g;
    let html = '', i = 0, m;
    while ((m = re.exec(line))) {
      const s = m[0];
      if (m.index > i) html += esc(line.slice(i, m.index));
      let cls = null;
      if (m[1]) cls = 'tok-s';
      else if (m[2]) { if (!hashC) { html += '#'; i = m.index + 1; re.lastIndex = i; continue; } cls = 'tok-c'; }
      else if (m[3]) { if (!slashC && !(L === 'sql' && s.startsWith('--'))) { html += esc(s.slice(0, 2)); i = m.index + 2; re.lastIndex = i; continue; } cls = 'tok-c'; }
      else if (m[4]) cls = 'tok-n';
      else if (m[5]) cls = KW.has(L === 'sql' ? s.toLowerCase() : s) ? 'tok-k' : /^\s*\(/.test(line.slice(m.index + s.length)) ? 'tok-f' : null;
      else if (m[6]) cls = 'tok-o';
      html += cls ? `<span class="${cls}">${esc(s)}</span>` : esc(s);
      i = m.index + s.length;
    }
    if (i < line.length) html += esc(line.slice(i));
    return html;
  }
  MV.util.tokenize = tokenize;
  T('code', (d, api) => {
    api.head();
    const body = api.body();
    const win = api.add(body, 'div', 'code-win');
    api.add(win, 'div', 'code-bar', `<i></i><i></i><i></i>${d.file ? `<span>${esc(d.file)}</span>` : ''}`);
    const pre = api.add(win, 'pre', 'code');
    const src = String(d.code ?? '').replace(/\t/g, '    ').replace(/\s+$/, '').split('\n');
    const hl = new Set(arr(d.hl ?? d.highlight).map(Number));
    api.fitBox(pre);
    api.beat(win, 'card', d.codeAt);
    let prevDur = 0.45, first = true;
    src.forEach((ln, i) => {
      const row = api.add(pre, 'span', 'cl' + (hl.has(i + 1) ? ' hl-line' : ''));
      const t = api.add(row, 'span', 'clt', ln.length ? tokenize(ln, d.lang) : '​');
      if (!ln.trim().length) return;
      const n = ln.replace(/^\s+/, '').length;
      const dur = cl(n / (d.cps || 40), 0.25, 1.6);
      const b = api.beat(t, 'code', null, { d: dur, o: { n: ln.length }, gap: first ? 0.45 : prevDur * 0.92 + 0.05 });
      first = false;
      prevDur = dur;
      if (hl.has(i + 1)) api.sc.beats.push({ els: [row], role: 'mark', key: d.hlAt ?? null, opt: { free: true, parent: b }, t: null });
    });
    api.note(api.root, d.note, d.noteAt);
  });

  // ───── 公式（KaTeX）─────
  T('formula', (d, api) => {
    api.root.classList.add('center');
    api.head();
    const f = api.add(api.root, 'div', 'formula');
    if (window.katex) {
      window.katex.render(String(d.tex ?? d.formula ?? ''), f, { displayMode: true, throwOnError: false, trust: true, strict: false, macros: { '\\hl': '\\htmlClass{hl}{#1}' } });
    } else f.textContent = String(d.tex ?? d.formula ?? '');
    api.fitBox(f);
    const b = api.beat(f, 'formula', d.texAt);
    f.querySelectorAll('.hl').forEach(m => api.sc.beats.push({ els: [m], role: 'mark', key: d.hlAt ?? null, opt: { free: true, parent: b }, t: null }));
    if (d.items) listInto(d, api, api.root, arr(d.items).map(it => norm(it)), d.mode || 'bullet').classList.add('f-list');
    api.note(api.root, d.note, d.noteAt);
  });

  // ───── 图片 / 截图 ─────
  T('image', (d, api) => {
    api.head();
    const pts = arr(d.points ?? d.items).map(it => norm(it));
    const body = api.body(pts.length ? 'split' : 'solo');
    api.media(d.image ?? d.src, { parent: body, frame: d.frame, cap: d.cap, at: d.imageAt, kb: d.kb, title: d.windowTitle });
    if (pts.length) listInto(d, api, body, pts, d.mode || 'bullet');
    api.note(api.root, d.note, d.noteAt);
  });

  // ───── 结尾 ─────
  T('ending', (d, api) => {
    api.root.classList.add('center');
    api.head({ big: true });
    chips(d, api, api.root, d.tags ?? d.chips);
    if (d.cta) {
      const c = api.add(api.root, 'div', 'cta', rich(d.cta));
      const b = api.beat(c, 'text', d.ctaAt, { auto: d.cta });
      api.marks(c, b);
    }
    const by = d.byline ?? api.story.byline;
    if (by) api.beat(api.add(api.root, 'div', 'meta byline', rich(by)), 'text', d.bylineAt);
  });

  // ───── 自定义 HTML ─────
  // 元素上写 data-role="item" / data-rv="pop" / data-at="关键词|2.5s|40%" 即可参与出场
  T('custom', (d, api) => {
    if (d.css) { const st = document.createElement('style'); st.textContent = d.css; api.sc.el.appendChild(st); }
    if (d.center) api.root.classList.add('center');
    api.head();
    const box = api.add(api.root, 'div', 'custom', d.html || '');
    box.querySelectorAll('[data-role],[data-rv],[data-at]').forEach(el => {
      const role = el.dataset.role || 'text';
      const kind = el.dataset.rv && MV.kinds[el.dataset.rv] ? el.dataset.rv : undefined;
      const b = api.beat(el, role, el.dataset.at || null, { kind, auto: el.dataset.auto, spread: el.dataset.spread != null });
      api.marks(el, b);
    });
    api.note(api.root, d.note, d.noteAt);
  });
})();
