/* 杂志瓷蓝 porcelain · 青花瓷蓝高端生活方式杂志 */
(() => {
  'use strict';
  const { cl, EZ, pad2, esc, rich, plain } = MV.util;
  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
  const norm = (it, key = 'text') => (it == null ? {} : typeof it === 'object' ? it : { [key]: String(it) });
  const lines = v => arr(v).flatMap(s => String(s).split('\n')).filter(s => s.trim() !== '');
  const isHot = (d, i, it) => !!(it && it.on) || d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
  const focusOf = (d, api) => d.focus ?? !!api.style.focus;
  const nc = n => ' n' + Math.max(1, Math.min(n, 9));

  // ───── 自定义转场：翻杂志页（右侧带纸边阴影翻入，旧页微缩沉入书脊）─────
  MV.transitions.magazine = {
    in(p) {
      const e = EZ.io2(p);
      const x = (1 - e) * 100;
      const sh = (0.28 * Math.sin(Math.PI * cl(p))).toFixed(3);
      return {
        translate: `${x.toFixed(3)}% 0`,
        boxShadow: `-36px 0 80px rgba(18, 32, 64, ${sh})`,
      };
    },
    out(p) {
      const e = EZ.io2(p);
      return {
        translate: `${(-e * 9).toFixed(3)}% 0`,
        scale: (1 - 0.028 * e).toFixed(4),
        filter: `brightness(${(1 - 0.14 * e).toFixed(4)})`,
      };
    },
  };

  // ───── 深窑钴蓝配色（章节页 / 封底页 / bg:"dark"）─────
  const COBALT_DARK = {
    '--bg': '#18326F',
    '--fg': '#F6F7F9',
    '--fg2': '#C6D4EE',
    '--fg3': '#9DB2E0',
    '--accent': '#D2B77A',
    '--accent2': '#9DB2E0',
    '--on-accent': '#16233E',
    '--hl': '#E8CE90',
    '--gold': '#D2B77A',
    '--line': 'rgba(246, 247, 249, .2)',
    '--line-strong': 'rgba(246, 247, 249, .55)',
    '--card-bg': 'rgba(255, 255, 255, .07)',
    '--card-bd': 'rgba(210, 183, 122, .38)',
    '--sub-fg': '#F6F7F9',
    '--sub-hl': '#E8CE90',
  };
  const COBALT_BG =
    'radial-gradient(ellipse 85% 75% at 24% 20%, rgba(56, 98, 190, .48) 0%, rgba(24, 50, 111, 0) 68%),' +
    'radial-gradient(ellipse 90% 90% at 85% 88%, rgba(12, 26, 62, .52) 0%, rgba(24, 50, 111, 0) 65%),' +
    '#18326F';

  // ───── 原创 SVG 标志性图形装置 ─────
  // 1. 回纹角饰（四角通用，通过 CSS 镜像旋转）
  const FRET_CORNER_SVG =
    '<svg viewBox="0 0 44 44" aria-hidden="true">' +
    '<path d="M2 42 V2 H42 M10 34 V10 H34 M10 24 H22 V16 H16 V20 M24 10 V22 H32 V16" ' +
    'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter"/>' +
    '</svg>';

  // 2. 莲瓣纹分隔饰件（引用 / 章节 / 封底用）
  const LOTUS_DIVIDER_SVG =
    '<svg viewBox="0 0 180 28" aria-hidden="true">' +
    '<line x1="0" y1="14" x2="62" y2="14" stroke="currentColor" stroke-width="1.2" opacity=".65"/>' +
    '<line x1="118" y1="14" x2="180" y2="14" stroke="currentColor" stroke-width="1.2" opacity=".65"/>' +
    '<path d="M90 3 C96 9, 96 19, 90 25 C84 19, 84 9, 90 3 Z" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
    '<path d="M90 6 C100 10, 108 14, 112 14 C108 14, 100 18, 90 22 C80 18, 72 14, 68 14 C72 14, 80 10, 90 6 Z" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".85"/>' +
    '<circle cx="90" cy="14" r="2.6" fill="currentColor"/>' +
    '<circle cx="64" cy="14" r="1.8" fill="currentColor" opacity=".75"/>' +
    '<circle cx="116" cy="14" r="1.8" fill="currentColor" opacity=".75"/>' +
    '</svg>';

  // 3. 青花团花纹章（章节背景 / 封底 / statement 图版）
  const MEDALLION_SVG =
    '<svg viewBox="0 0 240 240" aria-hidden="true">' +
    '<circle cx="120" cy="120" r="110" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 5" opacity=".6"/>' +
    '<circle cx="120" cy="120" r="98" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".75"/>' +
    '<circle cx="120" cy="120" r="88" fill="none" stroke="currentColor" stroke-width="0.9" opacity=".45"/>' +
    '<g transform="translate(120 120)" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".85">' +
    [0, 45, 90, 135, 180, 225, 270, 315]
      .map(a => `<path d="M0 -78 C14 -56, 16 -26, 0 -10 C-16 -26, -14 -56, 0 -78 Z" transform="rotate(${a})"/>`)
      .join('') +
    [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5]
      .map(a => `<path d="M0 -56 C8 -40, 8 -20, 0 -8 C-8 -20, -8 -40, 0 -56 Z" transform="rotate(${a})" opacity=".55"/>`)
      .join('') +
    '<circle cx="0" cy="0" r="18" stroke-width="1.6"/>' +
    '<circle cx="0" cy="0" r="9" stroke-width="1.1"/>' +
    '<circle cx="0" cy="0" r="3" fill="currentColor"/>' +
    '</g></svg>';

  // 4. 缠枝莲横向纹带（statement 下栏 / 图版装饰）
  const VINE_FRIEZE_SVG =
    '<svg viewBox="0 0 640 76" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
    '<path class="dr" d="M20 38 C70 10, 130 66, 190 38 C250 10, 310 66, 370 38 C430 10, 490 66, 550 38 C585 22, 608 26, 620 38" fill="none" stroke="#1F3F8F" stroke-width="2" stroke-linecap="round"/>' +
    '<path class="dr" d="M88 26 C100 10, 122 10, 128 22 C132 30, 120 36, 114 30" fill="none" stroke="#1F3F8F" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path class="dr" d="M242 50 C254 66, 276 66, 282 54 C286 46, 274 40, 268 46" fill="none" stroke="#1F3F8F" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path class="dr" d="M398 26 C410 10, 432 10, 438 22 C442 30, 430 36, 424 30" fill="none" stroke="#1F3F8F" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path class="dr" d="M518 50 C530 66, 552 66, 558 54" fill="none" stroke="#1F3F8F" stroke-width="1.5" stroke-linecap="round"/>' +
    '<g fill="#1F3F8F" opacity=".82">' +
    '<path d="M190 22 C196 30, 196 46, 190 54 C184 46, 184 30, 190 22 Z"/>' +
    '<path d="M174 38 C182 32, 198 32, 206 38 C198 44, 182 44, 174 38 Z"/>' +
    '<path d="M450 22 C456 30, 456 46, 450 54 C444 46, 444 30, 450 22 Z"/>' +
    '<path d="M434 38 C442 32, 458 32, 466 38 C458 44, 442 44, 434 38 Z"/>' +
    '</g>' +
    '<circle cx="320" cy="38" r="11" fill="#F6F7F9" stroke="#B89B5E" stroke-width="1.5"/>' +
    '<circle cx="320" cy="38" r="4.5" fill="#1F3F8F"/>' +
    '</svg>';

  // 5. 缺省封面图版：没给 image 时用一枚青花团花开光，和题材无关，任何主题都能当封面主视觉
  const DEFAULT_PLATE_SVG =
    '<svg viewBox="0 0 420 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
    '<path d="M22 478 L22 156 A188 134 0 0 1 398 156 L398 478 Z" fill="#F9FBFE" stroke="#1F3F8F" stroke-width="1.6"/>' +
    '<path d="M32 468 L32 160 A178 124 0 0 1 388 160 L388 468 Z" fill="none" stroke="#B89B5E" stroke-width="1"/>' +
    '<circle cx="210" cy="250" r="136" fill="#EDF3FB" stroke="#9DB2E0" stroke-width="1.2" stroke-dasharray="4 5"/>' +
    '<circle cx="210" cy="250" r="112" fill="none" stroke="#1F3F8F" stroke-width="1.6"/>' +
    '<circle cx="210" cy="250" r="104" fill="none" stroke="#9DB2E0" stroke-width="1"/>' +
    '<g fill="none" stroke="#9DB2E0" stroke-width="1.5" stroke-linecap="round">' +
    '<path class="dr" d="M118 196 C76 184, 58 150, 74 124 C86 106, 112 108, 118 126"/>' +
    '<path class="dr" d="M302 196 C344 184, 362 150, 346 124 C334 106, 308 108, 302 126"/>' +
    '<path class="dr" d="M114 318 C76 332, 60 368, 80 394 C94 410, 120 404, 122 384"/>' +
    '<path class="dr" d="M306 318 C344 332, 360 368, 340 394 C326 410, 300 404, 298 384"/>' +
    '</g>' +
    '<g transform="translate(210 250)">' +
    '<g fill="#2348A0" opacity=".38">' +
    [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5]
      .map(a => `<path d="M0 -92 C12 -76, 12 -56, 0 -46 C-12 -56, -12 -76, 0 -92 Z" transform="rotate(${a})"/>`)
      .join('') +
    '</g>' +
    '<g fill="#1F3F8F" opacity=".9">' +
    [0, 45, 90, 135, 180, 225, 270, 315]
      .map(a => `<path d="M0 -84 C22 -60, 22 -22, 0 0 C-22 -22, -22 -60, 0 -84 Z" transform="rotate(${a})"/>`)
      .join('') +
    '</g>' +
    '<circle cx="0" cy="0" r="26" fill="#F6F7F9" stroke="#1F3F8F" stroke-width="2"/>' +
    '<circle cx="0" cy="0" r="17" fill="none" stroke="#B89B5E" stroke-width="1.2"/>' +
    '<circle cx="0" cy="0" r="8" fill="#1F3F8F"/>' +
    '</g>' +
    '<path d="M100 424 Q122 410 144 424 T188 424 T232 424 T276 424 T320 424" fill="none" stroke="#1F3F8F" stroke-width="1.4"/>' +
    '<line x1="88" y1="444" x2="332" y2="444" stroke="#B89B5E" stroke-width="1"/>' +
    '<text x="210" y="462" text-anchor="middle" fill="#1F3F8F" font-family="Georgia, serif" font-style="italic" font-size="13" letter-spacing="2.5">PORCELAIN FOLIO · PLATE</text>' +
    '</svg>';

  // 辅助：刊名
  const mastheadName = story => plain(story.masthead || story.series || '器物志');

  // 辅助：为目录式列表构建条目（杂志目录 Contents 语法）
  function buildContentsList(d, api, parent, items, mode, compact = false) {
    const ul = api.add(parent, 'ul', 'list pc-toc m-' + mode + (compact ? ' pc-toc-compact' : '') + nc(items.length));
    const cols = d.cols ?? (api.land && items.length >= 5 && !compact ? 2 : 1);
    ul.style.setProperty('--cols', cols);
    items.forEach((it, i) => {
      const ok = it.ok != null ? !!it.ok : mode === 'check' ? true : mode === 'cross' ? false : undefined;
      const li = api.add(ul, 'li', 'item' + (ok === true ? ' ok' : ok === false ? ' no' : '') + (isHot(d, i, it) ? ' on' : ''));
      const row = api.add(li, 'div', 'pc-toc-row');
      const left = api.add(row, 'div', 'pc-toc-left');
      if (ok === true || ok === false) {
        api.add(left, 'span', 'mk', api.marker(mode, i, ok));
      } else if (compact) {
        api.add(left, 'span', 'mk pc-toc-idx', pad2(i + 1));
      }
      const tx = api.add(left, 'span', 'tx', rich(it.text ?? it.title));
      if (it.note) api.add(tx, 'span', 'nt', rich(it.note));
      if (!compact) {
        api.add(row, 'span', 'pc-toc-dots');
        api.add(row, 'span', 'pc-toc-num', pad2(i + 1));
      }
      const b = api.beat(li, 'item', it.at, { auto: it.text ?? it.title, spread: true, focus: focusOf(d, api) });
      api.marks(li, b);
    });
    return ul;
  }

  // 辅助：生成缠枝纹 SVG path（用于 steps 和 timeline 的连线，兼顾短距竖连与长距横连）
  function vineLink(x1, y1, x2, y2, i) {
    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy);
    if (L < 8) return '';
    const ux = dx / L, uy = dy / L;
    const nx = -uy, ny = ux;
    const s = i % 2 === 0 ? 1 : -1;
    const amp = Math.min(14, L * 0.18) * s;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const c1x = x1 + dx * 0.32 + nx * amp;
    const c1y = y1 + dy * 0.32 + ny * amp;
    const c2x = x1 + dx * 0.68 - nx * amp;
    const c2y = y1 + dy * 0.68 - ny * amp;
    const f = v => v.toFixed(1);
    // 主藤蔓柔波曲线
    let d = `M${f(x1)} ${f(y1)} C${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(x2)} ${f(y2)}`;
    // 两侧对称伸展的卷草嫩叶（不交叉回环，线条舒展优雅）
    if (L >= 24) {
      const leaf = Math.min(11, L * 0.24);
      const lx1 = mx - ux * (leaf * 0.2) + nx * (leaf * 0.9 * s);
      const ly1 = my - uy * (leaf * 0.2) + ny * (leaf * 0.9 * s);
      const lx2 = mx + ux * (leaf * 0.55) + nx * (leaf * 1.15 * s);
      const ly2 = my + uy * (leaf * 0.55) + ny * (leaf * 1.15 * s);
      const rx1 = mx - ux * (leaf * 0.2) - nx * (leaf * 0.85 * s);
      const ry1 = my - uy * (leaf * 0.2) - ny * (leaf * 0.85 * s);
      const rx2 = mx - ux * (leaf * 0.55) - nx * (leaf * 1.05 * s);
      const ry2 = my - uy * (leaf * 0.55) - ny * (leaf * 1.05 * s);
      d += ` M${f(mx)} ${f(my)} Q${f(lx1)} ${f(ly1)} ${f(lx2)} ${f(ly2)}`;
      d += ` M${f(mx)} ${f(my)} Q${f(rx1)} ${f(ry1)} ${f(rx2)} ${f(ry2)}`;
    }
    return d;
  }

  let chapMedallions = [];

  MV.style({
    transition: { kind: 'magazine', dur: 0.72 },
    motion: {
      kicker: { kind: 'wipe', d: 0.65 },
      title: { kind: 'mask', d: 0.82, stagger: 0.11, gap: 0.12 },
      big: { kind: 'mask', d: 0.88, stagger: 0.14, gap: 0.12 },
      text: { kind: 'fade', d: 0.68, gap: 0.3 },
      item: { kind: 'rise', d: 0.62, stagger: 0.07, gap: 0.42, o: { dist: 24 } },
      card: { kind: 'rise', d: 0.68, stagger: 0.08, gap: 0.36, o: { dist: 30 } },
      chip: { kind: 'fade', d: 0.5, stagger: 0.08, gap: 0.25 },
      image: { kind: 'rise', d: 0.82, gap: 0.25, o: { dist: 26 } },
      quote: { kind: 'mask', d: 0.95, stagger: 0.2, gap: 0.2 },
      line: { kind: 'draw', d: 0.72 },
    },
    focus: true,
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'plain',
    kenBurns: 0.035,
    quoteMark: '“',

    icons: {
      check: '<svg class="ic ic-check" viewBox="0 0 48 48"><path class="dr" d="M10 25 L20 35 L39 13"/></svg>',
      cross: '<svg class="ic ic-cross" viewBox="0 0 48 48"><path class="dr" d="M13 13 L35 35 M35 13 L13 35"/></svg>',
      arrow: '<svg class="ic ic-arrow" viewBox="0 0 48 48"><path class="dr" d="M8 24 H38 M29 15 L38 24 L29 33"/></svg>',
    },

    // ───── 场景明暗配色：chapter 与 ending 切换深窑钴蓝跨页 ─────
    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'light') return { tone: 'light' };
      if (d.bg === 'dark' || d.bg === 'cobalt' || t === 'chapter' || t === 'ending') {
        return { tone: 'dark', bg: COBALT_BG, vars: COBALT_DARK };
      }
      return { tone: 'light' };
    },

    // ───── 瓷白釉面底纸：清透冷白 + 釉面柔光 + 极克制的角落冰裂纹 ─────
    paint(g, W, H, R, u) {
      g.fillStyle = '#F6F7F9';
      g.fillRect(0, 0, W, H);
      const hi = g.createRadialGradient(W * 0.26, H * 0.18, 0, W * 0.26, H * 0.18, Math.max(W, H) * 0.78);
      hi.addColorStop(0, 'rgba(255,255,255,.75)');
      hi.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = hi;
      g.fillRect(0, 0, W, H);
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.64);
      vg.addColorStop(0, 'rgba(31,63,143,0)');
      vg.addColorStop(1, 'rgba(31,63,143,.065)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
      g.lineCap = 'round';
      const crack = (x, y, a, len, dep) => {
        if (dep > 5 || len < 12) return;
        g.lineWidth = Math.max(0.45, 1.15 - dep * 0.14);
        g.strokeStyle = `rgba(31,63,143,${(0.095 - dep * 0.013).toFixed(3)})`;
        g.beginPath();
        g.moveTo(x, y);
        const st = 3 + Math.floor(R() * 3);
        for (let s = 0; s < st; s++) {
          a += (R() - 0.5) * 0.65;
          x += (Math.cos(a) * len) / st;
          y += (Math.sin(a) * len) / st;
          g.lineTo(x, y);
        }
        g.stroke();
        if (R() < 0.72) crack(x, y, a + (R() - 0.5) * 1.1, len * 0.7, dep + 1);
        if (R() < 0.4) crack(x, y, a + (R() < 0.5 ? 1 : -1) * (0.75 + R() * 0.7), len * 0.56, dep + 1);
      };
      const L = Math.min(W, H) * 0.17;
      for (let k = 0; k < 4; k++) crack(W + 2, H * (0.04 + R() * 0.2), Math.PI + (R() - 0.5) * 1.0, L * (0.75 + R() * 0.4), 0);
      for (let k = 0; k < 4; k++) crack(-2, H * (0.76 + R() * 0.2), (R() - 0.5) * 1.0, L * (0.75 + R() * 0.4), 0);
      u.noise(3, 19);
    },

    // ───── 杂志全局框架：细双线框 + 四角回纹 + 运行页眉 + 底部 Folio ─────
    chrome(c) {
      chapMedallions = [];
      const frame = c.h('div', 'pc-frame');
      const inner = c.h('div', 'pc-frame-in');
      const corners = ['tl', 'tr', 'bl', 'br'].map(pos => c.h('div', 'pc-fret ' + pos, FRET_CORNER_SVG));
      frame.append(inner, ...corners);

      const top = c.h('div', 'pc-top');
      const mag = c.h('span', 'pc-mag', esc(mastheadName(c.story)));
      const diam = c.h('i', 'pc-diam');
      const sec = c.h('span', 'pc-sec');
      const topL = c.h('div', 'pc-top-l');
      topL.append(mag, diam, sec);
      const no = c.h('span', 'pc-no');
      top.append(topL, no);
      const rule = c.h('div', 'pc-rule');

      const foot = c.h('div', 'pc-foot');
      const folio = c.h('span', 'pc-folio');
      const by = c.h('span', 'pc-by', esc(plain(c.story.byline || '')));
      foot.append(folio, by);

      const prog = c.h('div', 'pc-prog');
      const bar = c.h('i');
      const gem = c.h('b');
      prog.append(bar, gem);

      c.el.append(frame, top, rule, foot, prog);

      let last = '';
      const magName = mastheadName(c.story);
      return info => {
        const key = info.page + '|' + info.section + '|' + info.type;
        if (key !== last) {
          last = key;
          sec.textContent = info.section && info.section !== magName ? info.section : 'FEATURE';
          no.innerHTML = `<small>NO.</small><b>${info.page}</b>`;
          folio.innerHTML = `<em>P.${info.page} / ${info.total}</em><i class="pc-fsep"></i><span>${esc(magName)}</span>`;
        }
        const p = cl(info.progress);
        bar.style.scale = `${p.toFixed(4)} 1`;
        gem.style.left = `${(p * 100).toFixed(3)}%`;
      };
    },

    // ───── 确定性微动效：章节团花极缓呼吸旋转 ─────
    tick(t) {
      const ang = ((t * 1.2) % 360).toFixed(2);
      for (const el of chapMedallions) {
        if (el && el.isConnected) el.style.transform = `rotate(${ang}deg)`;
      }
    },

    // ───── 按杂志版式语法重做模板 ─────
    templates: {
      // 1. 杂志封面：全幅刊头 + 期号条 + 主视觉（瓷瓶/插图）+ 封面要目
      cover(d, api) {
        const layout = d.layout || 'editorial';
        api.root.classList.add('pc-cover', 'pc-cov-' + layout);
        const mastText = plain(d.masthead || api.story.masthead || api.story.series || '器物志');
        const subMast = d.kicker ? plain(d.kicker) : 'PORCELAIN FOLIO · SPECIAL ISSUE';
        const tags = arr(d.tags ?? d.chips);

        const buildMasthead = parent => {
          const mast = api.add(parent, 'div', 'pc-mast');
          const topBar = api.add(mast, 'div', 'pc-mast-meta');
          api.add(topBar, 'span', 'pc-mast-k', rich(subMast));
          api.add(topBar, 'span', 'pc-mast-en', 'PORCELAIN FOLIO');
          const brand = api.add(mast, 'div', 'pc-mast-brand', esc(mastText));
          api.add(mast, 'div', 'pc-mast-rule');
          api.beat(mast, 'kicker', d.kickerAt);
          return brand;
        };

        const buildTitleBlock = parent => {
          const hd = api.add(parent, 'div', 'head pc-cov-head');
          if (d.title) {
            const h1 = api.add(hd, 'h1', 'title xl');
            String(d.title)
              .split('\n')
              .forEach(l => {
                const ln = api.add(h1, 'span', 'ln', rich(l));
                ln.dataset.src = l;
              });
            const b = api.beat([...h1.children], 'title', d.titleAt);
            h1._beat = b;
            api.marks(h1, b);
            api.fitTitle(h1);
          }
          const sub = d.sub ?? d.dek;
          if (sub) {
            const dk = api.add(hd, 'div', 'dek', rich(sub));
            const b = api.beat(dk, 'text', d.subAt);
            api.marks(dk, b);
          }
          return hd;
        };

        const buildCoverLines = parent => {
          if (!tags.length && !d.meta) return null;
          const clBox = api.add(parent, 'div', 'pc-cov-lines');
          api.add(clBox, 'div', 'pc-cl-cap', 'IN THIS ISSUE');
          const ul = api.add(clBox, 'div', 'pc-cl-list');
          const els = tags.map((t, i) => {
            const row = api.add(ul, 'div', 'pc-cl-item' + (isHot(d, i) ? ' hot' : ''));
            api.add(row, 'span', 'pc-cl-no', pad2(i + 1));
            api.add(row, 'span', 'pc-cl-tx', rich(t));
            return row;
          });
          if (els.length) api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
          if (d.meta) {
            const m = api.add(clBox, 'div', 'pc-cov-meta', rich(d.meta));
            api.beat(m, 'text', d.metaAt);
          }
          return clBox;
        };

        const buildHeroVisual = parent => {
          const vis = api.add(parent, 'div', 'pc-cov-visual');
          if (d.image) {
            api.media(d.image, {
              parent: vis,
              frame: d.frame || 'plain',
              at: d.imageAt,
              kb: d.kb ?? 0.025,
              cap: d.cap,
              title: d.windowTitle,
              cls: 'pc-cov-media',
            });
          } else {
            const plate = api.add(vis, 'div', 'pc-cov-plate', DEFAULT_PLATE_SVG);
            api.beat(plate, 'image', d.imageAt);
          }
          return vis;
        };

        if (api.land || layout === 'split') {
          const grid = api.add(api.root, 'div', 'pc-cov-spread');
          const left = api.add(grid, 'div', 'pc-cov-left');
          buildMasthead(left);
          buildTitleBlock(left);
          buildCoverLines(left);
          const right = api.add(grid, 'div', 'pc-cov-right');
          buildHeroVisual(right);
        } else if (api.rc === 'r916') {
          buildMasthead(api.root);
          buildTitleBlock(api.root);
          const mid = api.add(api.root, 'div', 'pc-cov-mid');
          buildHeroVisual(mid);
          buildCoverLines(api.root);
        } else {
          buildMasthead(api.root);
          buildTitleBlock(api.root);
          const lower = api.add(api.root, 'div', 'pc-cov-lower');
          buildHeroVisual(lower);
          buildCoverLines(lower);
        }
      },

      // 2. 章节页：全幅深窑钴蓝跨页 + 背景团花与超大斜体章节号 + 金线分隔
      chapter(d, api) {
        api.root.classList.add('center', 'pc-chapter');
        const n = d.num ?? pad2(api.sc.chapNo || 1);
        const bgMed = api.add(api.sc.el, 'div', 'pc-chap-med', MEDALLION_SVG);
        chapMedallions.push(bgMed.firstElementChild);

        const wrap = api.add(api.root, 'div', 'pc-chap-grid');
        if (n !== false && n !== '') {
          const numCol = api.add(wrap, 'div', 'pc-chap-numcol');
          const tag = api.add(numCol, 'div', 'pc-chap-tag', 'CHAPTER');
          const ne = api.add(numCol, 'div', 'chap-num', esc(n));
          api.beat([tag, ne], 'big', d.numAt);
        }
        const txCol = api.add(wrap, 'div', 'pc-chap-txcol');
        api.head({ parent: txCol, big: true });
        const div = api.add(txCol, 'div', 'pc-lotus-div', LOTUS_DIVIDER_SVG);
        api.beat(div, 'text', null, { gap: 0.1 });
        api.note(txCol, d.note, d.noteAt);
      },

      // 3. 一句话：杂志跨页编辑体（青花纹样图版 + 首字下沉 + 缠枝纹饰）
      statement(d, api) {
        api.root.classList.add('center', 'pc-statement');
        const ls = lines(d.text ?? d.lines);
        const spread = api.add(api.root, 'div', 'pc-st-spread');

        // 无论横竖屏都提供青花团花开光图版：16:9 在左侧，3:4 / 9:16 在上方作为杂志跨页顶栏图版
        const plate = api.add(spread, 'div', 'pc-st-plate');
        api.add(plate, 'div', 'pc-st-plate-in', MEDALLION_SVG);
        const pMeta = api.add(plate, 'div', 'pc-st-plate-meta');
        api.add(pMeta, 'div', 'pc-st-plate-cap', 'PORCELAIN FOLIO · EDITORIAL');
        api.add(pMeta, 'div', 'pc-st-plate-sub', esc(mastheadName(api.story)) + (api.story.column ? ' · ' + esc(plain(api.story.column)) : ''));
        api.beat(plate, 'image', null, { gap: 0.04 });

        const main = api.add(spread, 'div', 'pc-st-main');
        api.head({ parent: main });

        if (ls.length) {
          const box = api.add(main, 'div', 'say pc-drop-wrap');
          const firstChars = Array.from(ls[0]);
          const useDrop = firstChars.length >= 3 && firstChars[0] !== '【' && firstChars[0] !== '「' && firstChars[0] !== '“';
          if (useDrop) {
            const dc = api.add(box, 'span', 'pc-dropcap', esc(firstChars[0]));
            const restFirst = firstChars.slice(1).join('');
            const linesBox = api.add(box, 'div', 'pc-drop-lines');
            const e0 = api.add(linesBox, 'div', 'sl pc-sl-first', rich(restFirst));
            const b0 = api.beat([dc, e0], 'big', d.textAt, { auto: ls[0], gap: 0.14 });
            api.marks(e0, b0);
            ls.slice(1).forEach(l => {
              const e = api.add(linesBox, 'div', 'sl', rich(l));
              const b = api.beat(e, 'big', null, { auto: l, gap: 0.16 });
              api.marks(e, b);
            });
          } else {
            ls.forEach((l, i) => {
              const e = api.add(box, 'div', 'sl', rich(l));
              const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, gap: 0.16 });
              api.marks(e, b);
            });
          }
        }

        if (!api.land) {
          const fr = api.add(main, 'div', 'pc-vine-frieze', VINE_FRIEZE_SVG);
          api.beat(fr, 'fade', null, { gap: 0.12 });
        }
        api.note(main, d.note, d.noteAt);
      },

      // 4. 大数字：青花开光双线框 + 团花暗纹 + 超大斜体数字
      bignum(d, api) {
        api.root.classList.add('center', 'pc-bignum');
        api.head();
        const plaque = api.add(api.root, 'div', 'bn pc-bn-plaque');
        api.add(plaque, 'div', 'pc-bn-wm', MEDALLION_SVG);
        api.add(plaque, 'div', 'pc-bn-rule top');
        const row = api.add(plaque, 'div', 'bn-row');
        const v = d.value ?? d.num;
        const { val } = api.num(row, v);
        if (d.unit) api.add(row, 'span', 'bn-u', rich(d.unit));
        api.fitBox(row);
        api.beat(row, 'big', d.valueAt, {
          auto: d.value != null ? String(d.value) : null,
          with: val ? [[val, 'count', 0]] : [],
        });
        api.add(plaque, 'div', 'pc-bn-rule bot');
        if (d.label) {
          const l = api.add(plaque, 'div', 'bn-l', rich(d.label));
          const b = api.beat(l, 'text', d.labelAt, { auto: d.label });
          api.marks(l, b);
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // 5. 列表：杂志「目录 Contents」体（左条目 + 中间点线 + 右大斜体页码）
      list(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it));
        const mode = d.mode || (items.some(it => it.ok != null) ? 'check' : 'bullet');
        const body = api.body('pc-toc-body');
        const bar = api.add(body, 'div', 'pc-toc-bar', '<span>CONTENTS · 目录</span><i></i><span>PAGE</span>');
        api.beat(bar, 'kicker', null, { gap: 0.05 });
        buildContentsList(d, api, body, items, mode, false);
        api.note(api.root, d.note, d.noteAt);
      },

      // 6. 步骤：沿 SVG 缠枝纹延伸的工序流（6 项在 16:9 排成 3×2 跨页矩阵）
      steps(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'title'));
        const grid6 = api.land && !d.dir && items.length >= 6;
        const row = !grid6 && (d.dir ? d.dir === 'row' : api.land && items.length <= 5);
        const cls = grid6 ? 'grid6' : row ? 'row' : 'col';
        const box = api.add(api.body(), 'div', 'steps pc-vine-steps ' + cls + nc(items.length));
        const links = api.svg('svg', { class: 'links' });
        box.appendChild(links);
        const beats = [], badges = [];
        items.forEach((it, i) => {
          const st = api.add(box, 'div', 'step' + (isHot(d, i, it) ? ' on' : ''));
          badges.push(api.add(st, 'div', 'badge', `<span>${pad2(i + 1)}</span>`));
          const tx = api.add(st, 'div', 'st-tx');
          api.add(tx, 'div', 'st-t', rich(it.title ?? it.text));
          if (it.title && it.text) api.add(tx, 'div', 'st-n', rich(it.text));
          const b = api.beat(st, 'card', it.at, { auto: it.title ?? it.text, spread: true, focus: focusOf(d, api) });
          api.marks(tx, b);
          beats.push(b);
        });
        api.layout(() => {
          links.innerHTML = '';
          const perRow = grid6 ? Math.ceil(items.length / 2) : 0;
          for (let i = 0; i + 1 < badges.length; i++) {
            if (grid6 && i + 1 === perRow) continue;
            const a = api.rel(badges[i], box), c = api.rel(badges[i + 1], box), g = 8;
            const horiz = row || grid6;
            const [x1, y1, x2, y2] = horiz ? [a.r + g, a.cy, c.x - g, c.cy] : [a.cx, a.b + g, c.cx, c.y - g];
            if (Math.hypot(x2 - x1, y2 - y1) < 10) continue;
            const p = api.svg('path', { d: vineLink(x1, y1, x2, y2, i) });
            links.appendChild(p);
            (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.34 });
          }
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 7. 条形图：瓷蓝色谱杂志账簿（序号 + 标题与大斜体数值齐顶 + 全宽刻度槽渐变色条与金端线）
      bars(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'label'));
        const vals = items.map(it => Math.abs(parseFloat(String(it.value ?? 0).replace(/,/g, ''))) || 0);
        const log = d.scale === 'log';
        const f = v => (log ? Math.log10(Math.max(v, 1)) : v);
        const mx = d.max != null ? f(+d.max) : Math.max(...vals.map(f), 1e-9);
        const body = api.body();
        const hdr = api.add(body, 'div', 'pc-bars-hdr', `<span>DATA SPECIMEN</span><span>${log ? 'LOG SCALE' : 'COMPARISON'}</span>`);
        api.beat(hdr, 'kicker', null, { gap: 0.04 });
        const box = api.add(body, 'div', 'bars pc-bars' + (log ? ' log' : '') + nc(items.length));
        items.forEach((it, i) => {
          const r = api.add(box, 'div', 'bar-row' + (isHot(d, i, it) ? ' on' : ''));
          const top = api.add(r, 'div', 'pc-bar-top');
          const lf = api.add(top, 'div', 'pc-bar-lf');
          api.add(lf, 'span', 'pc-bar-idx', pad2(i + 1));
          api.add(lf, 'div', 'bar-l', rich(it.label));
          const v = api.add(top, 'div', 'bar-v');
          const { val } = api.num(v, it.display ?? it.value);
          if (it.unit) api.add(v, 'span', 'bar-u', rich(it.unit));

          const tr = api.add(r, 'div', 'bar-track');
          const fill = api.add(tr, 'div', 'bar-fill');
          fill.style.setProperty('--w', cl(f(vals[i]) / mx, 0.04, 1).toFixed(4));
          const w = [[fill, 'grow', 0.06]];
          if (val) w.push([val, 'count', 0.06, { d: 0.9 }]);
          const b = api.beat(r, 'bar', it.at, { auto: it.label, spread: true, focus: focusOf(d, api), with: w });
          api.marks(r, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 8. 引用：两侧带细双线与金菱形的拉出引文（Pull Quote）
      quote(d, api) {
        api.root.classList.add('center', 'pc-quote');
        api.head();
        const q = api.add(api.root, 'div', 'qt pc-pullquote');
        const sideL = api.add(q, 'div', 'pc-qt-side left', '<i></i>');
        const inner = api.add(q, 'div', 'pc-qt-inner');
        const sideR = api.add(q, 'div', 'pc-qt-side right', '<i></i>');
        api.add(inner, 'div', 'pc-qt-wm', '“');
        const topDiv = api.add(inner, 'div', 'pc-qt-div top', LOTUS_DIVIDER_SVG);
        api.beat([sideL, sideR, topDiv], 'kicker', d.markAt);
        const qt = api.add(inner, 'div', 'q-text');
        const els = lines(d.text ?? d.quote).map(l => api.add(qt, 'div', 'ql', rich(l)));
        const b = api.beat(els, 'quote', d.textAt);
        els.forEach(e => api.marks(e, b));
        const botDiv = api.add(inner, 'div', 'pc-qt-rule');
        api.beat(botDiv, 'fade', null, { gap: 0.08 });
        const src = d.source ?? d.by ?? d.author;
        if (src) api.beat(api.add(inner, 'div', 'q-src', rich(src)), 'note', d.sourceAt, { auto: src });
      },

      // 9. 图片：精装杂志图版（带 FIG 编号与白卡双线衬框，有要点时右侧/下侧目录式注解）
      image(d, api) {
        api.head();
        const pts = arr(d.points ?? d.items).map(it => norm(it));
        const body = api.body(pts.length ? 'split' : 'solo');
        api.media(d.image ?? d.src, {
          parent: body,
          frame: d.frame,
          cap: d.cap,
          at: d.imageAt,
          kb: d.kb,
          title: d.windowTitle,
        });
        if (pts.length) buildContentsList(d, api, body, pts, d.mode || 'number', true);
        api.note(api.root, d.note, d.noteAt);
      },

      // 10. 结尾：深窑钴蓝杂志封底（Colophon）
      ending(d, api) {
        api.root.classList.add('center', 'pc-ending');
        const med = api.add(api.root, 'div', 'pc-end-med', MEDALLION_SVG);
        chapMedallions.push(med.firstElementChild);
        api.beat(med, 'fade', null, { gap: 0 });
        api.head({ big: true });
        const div = api.add(api.root, 'div', 'pc-lotus-div', LOTUS_DIVIDER_SVG);
        api.beat(div, 'fade', null, { gap: 0.08 });
        const tags = arr(d.tags ?? d.chips);
        if (tags.length) {
          const box = api.add(api.root, 'div', 'chips');
          const els = tags.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
          api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
        }
        if (d.cta) {
          const c = api.add(api.root, 'div', 'cta', rich(d.cta));
          const b = api.beat(c, 'text', d.ctaAt, { auto: d.cta });
          api.marks(c, b);
        }
        const by = d.byline ?? api.story.byline;
        if (by) {
          const colophon = api.add(api.root, 'div', 'meta byline', `${esc(mastheadName(api.story))} · ${rich(by)}`);
          api.beat(colophon, 'text', d.bylineAt);
        }
      },
    },

    // ───── 默认连线（timeline 同样沿用青花缠枝纹）─────
    link(x1, y1, x2, y2, o) {
      return vineLink(x1, y1, x2, y2, o.i);
    },

    badge(i) {
      return `<span>${pad2(i + 1)}</span>`;
    },

    decorate(sc, api) {
      if (sc.t === 'stats') {
        sc.el.querySelectorAll('.stat').forEach((s, idx) => {
          const fig = api.h('div', 'pc-stat-fig', `FIG. ${pad2(idx + 1)}`);
          s.insertBefore(fig, s.firstChild);
        });
      }
      if (sc.t === 'code') {
        const bar = sc.el.querySelector('.code-bar');
        if (bar) {
          const fn = bar.querySelector('span');
          const name = fn ? fn.textContent : 'SPECIMEN';
          bar.innerHTML = `<span class="pc-code-lbl">SPECIMEN</span><span class="pc-code-file">${esc(name)}</span>`;
        }
      }
    },
  });
})();
