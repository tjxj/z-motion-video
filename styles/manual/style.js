/* 装配说明书 manual · 宜家/积木式技术手册风格 */
(() => {
  'use strict';
  const { pad2, plain, esc, rich, cl, rng, hash } = MV.util;
  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
  const norm = (it, key = 'text') => (it == null ? {} : typeof it === 'object' ? it : { [key]: String(it) });
  const lines = v => arr(v).flatMap(s => String(s).split('\n')).filter(s => s.trim() !== '');
  const isHot = (d, i, it) => !!(it && it.on) || d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
  const focusOf = (d, api) => d.focus ?? !!api.style.focus;
  const nc = n => ' n' + Math.max(1, Math.min(n, 9));
  const assetUrl = src => {
    const s = String(src || '');
    if (/^(https?:|data:|file:|blob:)/.test(s)) return s;
    const base = (window.PROJECT && window.PROJECT.assetBase) || '';
    return base + s.replace(/^\.?\//, '');
  };

  // 自定义动效：零件机械落位（干脆利落，轻微回弹）
  MV.kinds.mnSnap = {
    f(el, p, o) {
      const e = MV.util.EZ.back(p);
      el.style.opacity = cl(p * 3.5).toFixed(4);
      el.style.translate = `0 ${((1 - e) * -(o.dist ?? 26)).toFixed(2)}px`;
      el.style.scale = (0.94 + 0.06 * e).toFixed(4);
    },
  };

  // 通用说明书小图标库（纯线稿，等粗黑线）
  const PICTO = {
    person: '<svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="11" r="5.5" stroke="currentColor" stroke-width="2.8"/><path d="M8 30 C8 23 12 19 18 19 C24 19 28 23 28 30" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
    clock: '<svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="12.5" stroke="currentColor" stroke-width="2.8"/><path d="M18 10.5 V18 L23.5 21.5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pages: '<svg viewBox="0 0 36 36" fill="none"><rect x="8" y="6" width="16" height="22" rx="1.5" stroke="currentColor" stroke-width="2.6"/><path d="M12 12 H20 M12 17 H20 M12 22 H17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M24 10 H28 V30 H12 V28" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    wrench: '<svg viewBox="0 0 36 36" fill="none"><path d="M24 7 A 7 7 0 0 0 15.2 15.8 L8.5 22.5 A 2.6 2.6 0 0 0 12.2 26.2 L18.9 19.5 A 7 7 0 0 0 28 11 L23.5 14 L21 11.5 Z" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/></svg>',
    warn: '<svg viewBox="0 0 64 58" fill="none"><path class="dr" d="M32 5 L60 53 H4 Z" fill="#FFC82C" stroke="#111111" stroke-width="4.5" stroke-linejoin="round"/><line x1="32" y1="21" x2="32" y2="36" stroke="#111111" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="45" r="3.2" fill="#111111"/></svg>',
    checkBadge: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="27" fill="#FBFBF8" stroke="#111111" stroke-width="4.5"/><path class="dr" d="M18 33 L28 43 L46 22" stroke="#168A4C" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    crossBadge: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="27" fill="#FBFBF8" stroke="#111111" stroke-width="4.5"/><path class="dr" d="M21 21 L43 43 M43 21 L21 43" stroke="#D92B2B" stroke-width="6.5" stroke-linecap="round"/></svg>',
    doneRing: '<svg viewBox="0 0 96 96" fill="none"><circle cx="48" cy="48" r="42" stroke="#FF5B1F" stroke-width="4" stroke-dasharray="8 6"/><circle cx="48" cy="48" r="34" fill="#FF5B1F" stroke="#FBFBF8" stroke-width="3"/><path class="dr" d="M32 49 L43 60 L65 36" stroke="#111111" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tip: '<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="17" fill="#FFC82C" stroke="#111111" stroke-width="3"/><path d="M20 11 V13 M12 18 H14 M26 18 H28 M15 24 H25 M16.5 28 H23.5" stroke="#111111" stroke-width="2.6" stroke-linecap="round"/><path d="M15 20 A 5 5 0 1 1 25 20 C25 22 23.5 23 23.5 24 H16.5 C16.5 23 15 22 15 20 Z" fill="#FBFBF8" stroke="#111111" stroke-width="2.4"/></svg>',
    loupeMini: '<svg viewBox="0 0 120 120" fill="none"><circle cx="52" cy="52" r="36" fill="#FBFBF8" stroke="#111111" stroke-width="4.5"/><circle cx="52" cy="52" r="28" stroke="#111111" stroke-width="1.5" stroke-dasharray="4 4" stroke-opacity=".4"/><line x1="28" y1="52" x2="76" y2="52" stroke="#111111" stroke-width="2"/><line x1="52" y1="28" x2="52" y2="76" stroke="#111111" stroke-width="2"/><circle cx="52" cy="52" r="8" fill="#FF5B1F" stroke="#111111" stroke-width="2.5"/><line x1="78" y1="78" x2="106" y2="106" stroke="#111111" stroke-width="9" stroke-linecap="round"/></svg>',
  };

  // 通用稿封面默认装配爆炸图 SVG（当 story.json 的 cover 没有配图时自动展示，保证任何题材都有说明书封面主视觉）
  function genericCoverDiagram(seedStr) {
    const R = rng(hash(seedStr || 'manual'));
    const rot = (R() > 0.5 ? 1 : -1) * 12;
    return `<svg class="mn-gen-svg" viewBox="0 0 560 360" fill="none">
      <g stroke="#111111" stroke-opacity="0.16" stroke-width="1.5" stroke-dasharray="5 5">
        <line x1="210" y1="20" x2="210" y2="340"/>
        <line x1="40" y1="180" x2="380" y2="180"/>
      </g>
      <!-- Exploded Isometric Assembly Module -->
      <!-- Bottom Plate -->
      <path d="M100 246 L210 202 L320 246 L210 290 Z" fill="#FBFBF8" stroke="#111111" stroke-width="4" stroke-linejoin="round"/>
      <path d="M100 246 V266 L210 310 L320 266 V246" fill="#EFECE4" stroke="#111111" stroke-width="4" stroke-linejoin="round"/>
      <line x1="210" y1="290" x2="210" y2="310" stroke="#111111" stroke-width="4"/>
      <!-- Vertical Alignment Axes -->
      <line x1="156" y1="120" x2="156" y2="236" stroke="#FF5B1F" stroke-width="2.5" stroke-dasharray="6 5"/>
      <line x1="264" y1="120" x2="264" y2="236" stroke="#FF5B1F" stroke-width="2.5" stroke-dasharray="6 5"/>
      <!-- Middle Core Gear / Ring -->
      <ellipse cx="210" cy="176" rx="74" ry="30" fill="#FBFBF8" stroke="#111111" stroke-width="4"/>
      <ellipse cx="210" cy="176" rx="40" ry="16" fill="#FF5B1F" fill-opacity="0.22" stroke="#FF5B1F" stroke-width="3"/>
      <!-- Top Cap -->
      <path d="M124 94 L210 60 L296 94 L210 128 Z" fill="#FBFBF8" stroke="#111111" stroke-width="4" stroke-linejoin="round"/>
      <path d="M124 94 V112 L210 146 L296 112 V94" fill="#FBFBF8" stroke="#111111" stroke-width="4" stroke-linejoin="round"/>
      <line x1="210" y1="128" x2="210" y2="146" stroke="#111111" stroke-width="4"/>
      <!-- Center Pin Dropping Down -->
      <rect x="201" y="24" width="18" height="44" rx="4" fill="#FF5B1F" stroke="#111111" stroke-width="3.5"/>
      <path class="dr" d="M210 74 V114 M202 104 L210 116 L218 104" stroke="#FF5B1F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Dimension Line Left -->
      <g stroke="#111111" stroke-width="2">
        <line x1="56" y1="60" x2="56" y2="306"/>
        <line x1="46" y1="60" x2="66" y2="60"/>
        <line x1="46" y1="306" x2="66" y2="306"/>
        <path d="M51 72 L56 60 L61 72 M51 294 L56 306 L61 294" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <!-- Loupe Detail Callout Right -->
      <line x1="284" y1="176" x2="394" y2="132" stroke="#111111" stroke-width="2.5" stroke-dasharray="6 5"/>
      <circle cx="284" cy="176" r="5" fill="#FF5B1F"/>
      <g transform="translate(456, 124)">
        <circle cx="0" cy="0" r="64" fill="#FBFBF8" stroke="#111111" stroke-width="4.5"/>
        <circle cx="0" cy="0" r="54" stroke="#111111" stroke-width="1.5" stroke-dasharray="4 4" stroke-opacity="0.35"/>
        <g transform="rotate(${rot})">
          <rect x="-26" y="-26" width="52" height="52" rx="6" fill="#FBFBF8" stroke="#111111" stroke-width="3.5"/>
          <circle cx="0" cy="0" r="14" fill="#FF5B1F" stroke="#111111" stroke-width="3"/>
          <line x1="-26" y1="0" x2="-14" y2="0" stroke="#111111" stroke-width="2.5"/>
          <line x1="14" y1="0" x2="26" y2="0" stroke="#111111" stroke-width="2.5"/>
        </g>
      </g>
      <rect x="404" y="200" width="104" height="24" rx="2" fill="#111111"/>
      <text x="456" y="216" text-anchor="middle" font-family="monospace" font-weight="700" font-size="12" fill="#FBFBF8">FIG · 01</text>
      <!-- Mini Spec Box Bottom Right -->
      <rect x="386" y="246" width="140" height="64" rx="2" fill="#FBFBF8" stroke="#111111" stroke-width="2.8"/>
      <line x1="386" y1="270" x2="526" y2="270" stroke="#111111" stroke-width="2"/>
      <text x="456" y="262" text-anchor="middle" font-family="monospace" font-weight="700" font-size="11" fill="#111111">ASSEMBLY GUIDE</text>
      <circle cx="412" cy="290" r="10" fill="#111111"/>
      <text x="412" y="294" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="12" fill="#FBFBF8">1</text>
      <path d="M430 290 H448" stroke="#FF5B1F" stroke-width="2.5" stroke-dasharray="4 3"/>
      <circle cx="464" cy="290" r="10" fill="#111111"/>
      <text x="464" y="294" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="12" fill="#FBFBF8">2</text>
      <path d="M482 290 H496" stroke="#FF5B1F" stroke-width="2.5" stroke-dasharray="4 3"/>
      <circle cx="508" cy="290" r="10" fill="#FF5B1F" stroke="#111111" stroke-width="2"/>
    </svg>`;
  }

  // 条形码 SVG（用于封底页）
  function barcodeSvg(seedStr) {
    const R = rng(hash((seedStr || 'manual') + '#bar'));
    let x = 0, rects = '';
    for (let i = 0; i < 42; i++) {
      const w = R() > 0.65 ? 5 : R() > 0.35 ? 3 : 1.8;
      const g = R() > 0.55 ? 4 : 2.2;
      if (x + w > 220) break;
      rects += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="42" fill="currentColor"/>`;
      x += w + g;
    }
    return `<svg class="mn-barcode" viewBox="0 0 ${Math.ceil(x)} 42" preserveAspectRatio="none">${rects}</svg>`;
  }

  // 安全橙章节页 & 墨黑封底页配色覆盖
  const ORANGE = {
    '--fg': '#111111', '--fg2': '#381B0D', '--fg3': '#5C2C14',
    '--accent': '#111111', '--accent-t': '#111111', '--hl': '#111111', '--band': '#FBFBF8',
    '--kt-bg': '#111111', '--kt-fg': '#FF5B1F',
    '--line': 'rgba(17,17,17,.26)', '--line-strong': '#111111',
    '--card-bg': '#FFF4EE', '--card-bd': '#111111',
  };
  const INK = {
    '--fg': '#FBFBF8', '--fg2': '#CFCBC2', '--fg3': '#8C887E',
    '--accent': '#FF5B1F', '--accent-t': '#FF7542', '--hl': '#FF5B1F', '--band': '#FF5B1F',
    '--kt-bg': '#FF5B1F', '--kt-fg': '#111111',
    '--line': 'rgba(251,251,248,.2)', '--line-strong': 'rgba(251,251,248,.75)',
    '--card-bg': '#222220', '--card-bd': '#FBFBF8',
  };

  // 构建标准说明书页头（保留 api.head() 的全部功能与自动匹配）
  function buildHead(api, o = {}) {
    return api.head(o);
  }

  MV.style({
    // 翻到说明书下一页：向左平推
    transition: { kind: 'push', dur: 0.55, dirs: ['left'] },
    motion: {
      kicker: { kind: 'wipe', d: 0.42 },
      title: { kind: 'up', d: 0.62, stagger: 0.08, gap: 0.1, o: { dist: 50 } },
      big: { kind: 'mnSnap', d: 0.52, stagger: 0.1, gap: 0.12, o: { dist: 24 } },
      text: { kind: 'fade', d: 0.45, gap: 0.25 },
      item: { kind: 'slideX', d: 0.46, stagger: 0.06, gap: 0.35, o: { dist: -36 } },
      card: { kind: 'mnSnap', d: 0.48, stagger: 0.08, gap: 0.3, o: { dist: 28 } },
      chip: { kind: 'pop', d: 0.38, stagger: 0.06, gap: 0.2, o: { from: 0.72 } },
      image: { kind: 'mnSnap', d: 0.56, gap: 0.25, o: { dist: 20 } },
      note: { kind: 'wipe', d: 0.55, gap: 0.35 },
      quote: { kind: 'up', d: 0.65, stagger: 0.14, gap: 0.18, o: { dist: 42 } },
      stamp: { kind: 'stamp', d: 0.46, gap: 0.2 },
    },
    focus: true,
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'plain',
    kenBurns: 0.025,
    quoteMark: '',

    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'light') return { tone: 'light' };
      if (d.bg === 'orange' || t === 'chapter') return { tone: 'orange', bg: '#FF5B1F', vars: ORANGE };
      if (d.bg === 'dark' || t === 'ending') return { tone: 'dark', bg: '#151515', vars: INK };
      return { tone: 'light' };
    },

    // 说明书白纸 #FBFBF8：浅灰工程小网格 + 十字定位点 + 轻微纸张颗粒
    paint(g, W, H, R, u) {
      g.fillStyle = '#FBFBF8';
      g.fillRect(0, 0, W, H);
      // 极淡 48px 浅灰辅助网格
      const step = 48;
      g.strokeStyle = 'rgba(17,17,17,.042)';
      g.lineWidth = 1;
      g.beginPath();
      for (let x = step; x < W; x += step) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); }
      for (let y = step; y < H; y += step) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); }
      g.stroke();
      // 192px 工程十字定位标
      const cs = 192;
      g.strokeStyle = 'rgba(17,17,17,.11)';
      g.lineWidth = 1.5;
      g.beginPath();
      for (let x = cs; x < W; x += cs) {
        for (let y = cs; y < H; y += cs) {
          g.moveTo(x - 6, y); g.lineTo(x + 6, y);
          g.moveTo(x, y - 6); g.lineTo(x, y + 6);
        }
      }
      g.stroke();
      u.noise(3.5, 19);
    },

    // 装订外框：四角裁切标记 + 顶部手册信息条 + 左侧刻度尺进度 + 底部「3 / 12」页码
    chrome(c) {
      const top = c.h('div', 'mn-top');
      const left = c.h('span', 'mn-l');
      const no = c.h('b', 'mn-no');
      const ser = c.h('span', 'mn-ser', c.esc(c.plain(c.story.series || c.story.title || 'MANUAL')));
      const sec = c.h('span', 'mn-sec');
      left.append(no, ser);
      top.append(left, sec);

      const rule = c.h('div', 'mn-rule');
      const foot = c.h('div', 'mn-foot');
      const by = c.h('span', 'mn-by', c.esc(c.plain(c.story.byline || '')));
      const pg = c.h('span', 'mn-pg');
      foot.append(by, pg);

      const crops = ['tl', 'tr', 'bl', 'br'].map(k => c.h('i', 'mn-crop ' + k));

      // 左侧工程刻度尺进度条（精简不侵占内容区）
      const y0 = c.land ? 116 : 168;
      const y1 = c.rc === 'r916' ? 500 : c.land ? 116 : 168;
      const L = Math.max(200, Math.round(c.H - y0 - y1));
      let dPath = `M12 0 V${L} `;
      for (let k = 0; k <= L; k += 16) {
        const big = k % 96 === 0, mid = k % 48 === 0;
        dPath += `M12 ${k} H${12 + (big ? 16 : mid ? 10 : 5)} `;
      }
      const ruler = c.h('div', 'mn-ruler', `<svg width="36" height="${L}" viewBox="0 0 36 ${L}"><path d="${dPath}"/></svg>`);
      ruler.style.top = y0 + 'px';
      ruler.style.height = L + 'px';
      const fill = c.h('i', 'mn-fill');
      const ptr = c.h('b', 'mn-ptr');
      ruler.append(fill, ptr);

      c.el.append(...crops, ruler, top, rule, foot);
      let last = '';
      return info => {
        const key = `${info.i}:${info.type}:${info.cover ? 1 : 0}`;
        if (key !== last) {
          last = key;
          no.textContent = info.page;
          sec.textContent = info.type === 'cover' ? 'MANUAL // REV. 1.0' : (info.section || '');
          pg.textContent = `${info.i + 1} / ${info.n}`;
        }
        const p = c.cl(info.progress);
        ptr.style.translate = `0 ${(p * L).toFixed(1)}px`;
        fill.style.scale = `1 ${p.toFixed(4)}`;
      };
    },

    // 虚线箭头
    link(x1, y1, x2, y2, o) {
      return o.dash(x1, y1, x2, y2, 12, 8) + ' ' + o.arrowHead(x1, y1, x2, y2, 15, 0.55);
    },

    // 列表标记
    marker(mode, i, ok) {
      if (mode === 'number') return `<b class="mn-n">${i + 1}</b>`;
      if (ok === true) return '<span class="mn-ck ok"><svg class="ic" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#FBFBF8" stroke="#111" stroke-width="3"/><path class="dr" d="M11 21 L17.5 27.5 L29.5 13.5" stroke="#168A4C" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      if (ok === false) return '<span class="mn-ck no"><svg class="ic" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#FBFBF8" stroke="#111" stroke-width="3"/><path class="dr" d="M13.5 13.5 L26.5 26.5 M26.5 13.5 L13.5 26.5" stroke="#D92B2B" stroke-width="4.5" stroke-linecap="round"/></svg></span>';
      return '<i class="mn-tri"></i>';
    },

    // ═══════════════════════════════════════════════════════════════
    // 按装配说明书版式语法重写核心模板
    // ═══════════════════════════════════════════════════════════════
    templates: {
      // ───── 1. 说明书封面（外框封套 + 右上图标 + 大线稿 + 底栏工具图标）─────
      cover(d, api) {
        const sheet = api.add(api.root, 'div', 'mn-cover-sheet');

        // 顶栏：左侧型号黑签 + 右侧人数/耗时图标框
        const bar = api.add(sheet, 'div', 'mn-cover-bar');
        const codeText = d.kicker || api.story.series || 'ASSEMBLY MANUAL';
        const codeEl = api.add(bar, 'div', 'mn-cover-code', `<span class="kt">${rich(codeText)}</span>`);
        api.beat(codeEl, 'kicker', d.kickerAt);

        const specs = arr(d.specs).length ? arr(d.specs) : [
          { icon: 'pages', text: `${api.story.scenes.length} 页` },
          { icon: 'wrench', text: '图解指南' },
        ];
        const specBox = api.add(bar, 'div', 'mn-cover-specs');
        const specEls = specs.map(sp => {
          const ic = PICTO[sp.icon] || PICTO.wrench;
          return api.add(specBox, 'div', 'mn-spec-pill', `<i class="mn-ic">${ic}</i><span>${rich(sp.text)}</span>`);
        });
        api.beat(specEls, 'chip', null, { gap: 0.08 });

        // 主体：竖屏上下，16:9 左右分栏
        const main = api.add(sheet, 'div', 'mn-cover-main');
        const headCol = api.add(main, 'div', 'mn-cover-head');
        if (d.title) {
          const h1 = api.add(headCol, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const tb = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = tb;
          api.marks(h1, tb);
          api.fitTitle(h1);
        }
        if (d.sub || d.dek) {
          const sub = api.add(headCol, 'div', 'dek', rich(d.sub ?? d.dek));
          const sb = api.beat(sub, 'text', d.subAt);
          api.marks(sub, sb);
        }
        if (d.meta) {
          const m = api.add(headCol, 'div', 'meta', rich(d.meta));
          api.beat(m, 'text', d.metaAt);
        }

        // 大号主视觉线稿框
        const figBox = api.add(main, 'div', 'mn-cover-fig');
        api.add(figBox, 'span', 'mn-fig-tag', 'FIG. 00 // OVERVIEW');
        if (d.image) {
          api.media(d.image, { parent: figBox, frame: 'plain', at: d.imageAt, kb: d.kb ?? 0.02, maxScale: 3 });
        } else {
          const gen = api.add(figBox, 'div', 'mn-gen-wrap', genericCoverDiagram(d.title || api.story.title));
          api.beat(gen, 'image', d.imageAt);
        }

        // 底部工具图标栏 / 通用稿标签规格栏
        const tools = arr(d.tools);
        const tags = arr(d.tags ?? d.chips);
        if (tools.length) {
          const strip = api.add(sheet, 'div', 'mn-tool-strip');
          strip.style.setProperty('--cols', tools.length);
          const cells = tools.map(tl => {
            const cell = api.add(strip, 'div', 'mn-tool-cell');
            if (tl.icon) {
              const icHtml = PICTO[tl.icon]
                ? `<div class="mn-tool-ic">${PICTO[tl.icon]}</div>`
                : `<div class="mn-tool-ic"><img src="${esc(assetUrl(tl.icon))}" alt="" decoding="sync"></div>`;
              api.add(cell, 'div', 'mn-tool-art', icHtml);
            }
            const meta = api.add(cell, 'div', 'mn-tool-lb');
            api.add(meta, 'span', 'mn-tool-name', rich(tl.label));
            if (tl.qty) api.add(meta, 'b', 'mn-tool-qty', esc(tl.qty));
            return cell;
          });
          api.beat(cells, 'chip', d.tagsAt ?? d.chipsAt, { auto: tools[0].label });
        } else if (tags.length) {
          const strip = api.add(sheet, 'div', 'mn-tag-strip');
          strip.style.setProperty('--cols', tags.length);
          const cells = tags.map((tg, i) => {
            const cell = api.add(strip, 'div', 'mn-tag-cell' + (isHot(d, i) ? ' hot' : ''));
            api.add(cell, 'b', 'mn-tag-idx', pad2(i + 1));
            api.add(cell, 'span', 'mn-tag-tx', rich(tg));
            return cell;
          });
          api.beat(cells, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
        }
      },

      // ───── 2. 章节分册页（安全橙整页 + 超大黑块 PART 编号）─────
      chapter(d, api) {
        const wrap = api.add(api.root, 'div', 'mn-chap-sheet');
        const n = d.num ?? pad2(api.sc.chapNo || 1);
        if (n !== false && n !== '') {
          const badge = api.add(wrap, 'div', 'mn-chap-badge');
          api.add(badge, 'span', 'mn-chap-k', 'PART // SECTION');
          api.add(badge, 'b', 'mn-chap-n', esc(n));
          api.beat(badge, 'big', d.numAt);
        }
        const info = api.add(wrap, 'div', 'mn-chap-info');
        buildHead(api, { parent: info, big: true });
        api.note(info, d.note, d.noteAt);
      },

      // ───── 3. 说明书步骤分格页（1~4 格粗黑线框 + 大圆步骤号 + 线稿 + 虚线箭头）─────
      steps(d, api) {
        buildHead(api);
        const items = arr(d.items).map(it => norm(it, 'title'));
        const hasImg = items.some(it => it.image);
        const body = api.body();
        const n = items.length;

        // 决定网格排布：16:9 最多 3 列，4 步用 2x2；竖屏 2 步上下、3 步三行（无图或有图都清晰）、4 步 2x2
        let cols = 1;
        if (d.dir === 'row') cols = Math.min(n, 4);
        else if (api.land) cols = n <= 3 ? n : n === 4 ? 2 : 3;
        else cols = n === 4 ? 2 : 1;

        const grid = api.add(body, 'div', 'mn-step-grid' + nc(n) + (hasImg ? ' has-img' : ' no-img') + (cols > 1 ? ' multi' : ' single'));
        grid.style.setProperty('--cols', cols);
        const links = api.svg('svg', { class: 'links mn-step-links' });
        grid.appendChild(links);

        const cells = [], beats = [];
        items.forEach((it, i) => {
          const cell = api.add(grid, 'div', 'mn-step-cell' + (isHot(d, i, it) ? ' on' : ''));
          const stepNum = it.step != null ? String(it.step) : String(i + 1);
          const badge = api.add(cell, 'div', 'mn-step-num', esc(stepNum));
          if (!hasImg) api.add(cell, 'span', 'mn-step-code', `STEP // ${pad2(i + 1)}`);

          if (it.image) {
            const art = api.add(cell, 'div', 'mn-step-art');
            const img = api.add(art, 'img', 'mn-art');
            img.src = assetUrl(it.image);
            img.decoding = 'sync';
          }
          const tx = api.add(cell, 'div', 'mn-step-tx');
          api.add(tx, 'div', 'st-t', rich(it.title ?? it.text));
          if (it.title && it.text) api.add(tx, 'div', 'st-n', rich(it.text));

          const b = api.beat(cell, 'card', it.at, { auto: it.title ?? it.text, spread: true, focus: focusOf(d, api) });
          api.marks(tx, b);
          cells.push({ cell, badge });
          beats.push(b);
        });

        // 在相邻格之间画虚线方向箭头（全部走在左栏或顶栏通道，绝不压正文和插图）
        api.layout(() => {
          links.innerHTML = '';
          if (cols === 1) {
            // 竖排：在左侧步骤圆号通道内绘向下虚线连接箭头
            for (let i = 0; i + 1 < cells.length; i++) {
              const a = api.rel(cells[i].badge, grid), c = api.rel(cells[i + 1].badge, grid);
              if (c.y - a.b > 20) {
                const p = api.svg('path', { d: api.link(a.cx, a.b + 8, c.cx, c.y - 8, i) });
                links.appendChild(p);
                (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.26 });
              }
            }
          } else if (n <= 3) {
            // 横排：在顶部两个步骤圆号之间画水平虚线箭头，干净利落
            for (let i = 0; i + 1 < cells.length; i++) {
              const ba = api.rel(cells[i].badge, grid), bc = api.rel(cells[i + 1].badge, grid);
              if (bc.x - ba.r > 28) {
                const p = api.svg('path', { d: api.link(ba.r + 14, ba.cy, bc.x - 14, bc.cy, i), class: 'mn-join-arr' });
                links.appendChild(p);
                (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.22 });
              }
            }
          }
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // ───── 4. 零件/工具清单表（表格式网格 + 小线稿 + ×2 数量标）─────
      cards(d, api) {
        buildHead(api);
        const items = arr(d.items).map(it => norm(it, 'title'));
        const hasImg = items.some(it => it.image);
        const body = api.body();
        const n = items.length;
        let cols = d.cols;
        if (!cols) {
          if (api.land) cols = n <= 3 ? n : n === 4 ? (hasImg ? 4 : 2) : 3;
          else cols = n <= 3 ? 1 : 2;
        }
        const grid = api.add(body, 'div', 'mn-parts-grid' + nc(n) + (hasImg ? ' has-img' : ' no-img') + (cols === 1 ? ' rows' : ''));
        grid.style.setProperty('--cols', cols);

        items.forEach((it, i) => {
          const cell = api.add(grid, 'div', 'mn-part' + (isHot(d, i, it) ? ' on' : ''));
          const top = api.add(cell, 'div', 'mn-part-top');
          const k = it.tag ?? it.k ?? it.icon ?? (d.index === false ? null : pad2(i + 1));
          if (k != null && k !== '') {
            api.add(top, 'span', 'mn-part-k', it.icon ? (PICTO[it.icon] || api.icon(it.icon) || esc(it.icon)) : rich(k));
          }
          if (it.qty) api.add(top, 'b', 'mn-part-qty', esc(it.qty));
          else if (!hasImg) api.add(top, 'span', 'mn-part-ref', `ITEM // ${pad2(i + 1)}`);

          if (it.image) {
            const art = api.add(cell, 'div', 'mn-part-art');
            const img = api.add(art, 'img', 'mn-art');
            img.src = assetUrl(it.image);
            img.decoding = 'sync';
          }

          const tx = api.add(cell, 'div', 'mn-part-tx');
          if (it.title) api.add(tx, 'div', 'card-t', rich(it.title));
          if (it.text) api.add(tx, 'div', 'card-x', rich(it.text));

          const b = api.beat(cell, 'card', it.at, {
            auto: it.tag != null ? [it.tag, it.title ?? it.text] : it.title ?? it.text,
            spread: true,
            focus: focusOf(d, api),
          });
          api.marks(tx, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // ───── 5. 对错示范双格 / 规格对比（粗圆圈 ✓ / ✗ 盖章 + 线稿）─────
      compare(d, api) {
        buildHead(api);
        const body = api.body();
        const hasImg = !!((d.left && d.left.image) || (d.right && d.right.image));
        const box = api.add(body, 'div', 'mn-cmp' + (hasImg ? ' has-img' : ' no-img'));

        const buildSide = (raw, cls, code) => {
          const s = norm(raw, 'label');
          const isOk = s.ok === true;
          const isNo = s.ok === false;
          const isWin = !!s.win;
          const el = api.add(box, 'div', `mn-side ${cls}${isOk ? ' is-ok' : ''}${isNo ? ' is-no' : ''}${isWin ? ' win' : ''}`);

          // 顶部盖章栏：对错示范大圆圈 ✓ / ✗ 或 A / B
          const bar = api.add(el, 'div', 'mn-side-bar');
          let badgeEl = null;
          if (isOk) badgeEl = api.add(bar, 'div', 'mn-do-stamp ok', PICTO.checkBadge);
          else if (isNo) badgeEl = api.add(bar, 'div', 'mn-do-stamp no', PICTO.crossBadge);
          else if (isWin) badgeEl = api.add(bar, 'div', 'mn-do-stamp ok', PICTO.checkBadge);
          else badgeEl = api.add(bar, 'div', 'mn-side-code', esc(code));

          const hd = api.add(bar, 'div', 'mn-side-hd');
          if (s.tag) api.add(hd, 'div', 'side-k', rich(s.tag));
          if (s.label) api.add(hd, 'div', 'side-l', rich(s.label));

          if (s.image) {
            const art = api.add(el, 'div', 'mn-side-art');
            const img = api.add(art, 'img', 'mn-art');
            img.src = assetUrl(s.image);
            img.decoding = 'sync';
          }

          let val = null;
          if (s.value != null && s.value !== '') {
            const v = api.add(el, 'div', 'side-v');
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
              api.add(li, 'span', 'mk', api.marker('bullet', 0, ok));
              api.add(li, 'span', 'tx', rich(pp.text));
              pts.push({ li, pp });
            });
          }
          return { el, hd, badgeEl, val, pts, s };
        };

        const L = buildSide(d.left || {}, 'left', 'A');
        const Rt = buildSide(d.right || {}, 'right', 'B');

        const run = (S, key) => {
          const withList = [];
          if (S.val) withList.push([S.val, 'count', 0.05]);
          if (S.badgeEl && (S.s.ok != null || S.s.win)) withList.push([S.badgeEl, 'stamp', 0.12]);
          const b = api.beat(S.el, 'card', S.s.at ?? key, { auto: S.s.label, with: withList });
          api.marks(S.hd, b);
          S.pts.forEach(({ li, pp }) => {
            const b2 = api.beat(li, 'item', pp.at, { auto: pp.text, spread: true, gap: 0.25 });
            api.marks(li, b2);
          });
          return b;
        };

        run(L, d.leftAt);
        const rb = run(Rt, d.rightAt);
        const win = L.s.win ? L.el : Rt.s.win ? Rt.el : null;
        if (d.verdict) {
          const v = api.add(body, 'div', 'mn-verdict', `<b class="mn-vd-tag">结论</b><span class="mn-vd-tx">${rich(d.verdict)}</span>`);
          const b = api.beat(v, 'text', d.verdictAt, { auto: d.verdict, with: win ? [[win, 'mark', 0]] : [] });
          api.marks(v, b);
        } else if (win) {
          (rb.opt.with = rb.opt.with || []).push([win, 'mark', 0.7]);
        }
      },

      // ───── 6. 黄黑警示框（statement）─────
      statement(d, api) {
        api.root.classList.add('center');
        buildHead(api);
        const ls = lines(d.text ?? d.lines);
        if (ls.length) {
          const box = api.add(api.root, 'div', 'mn-warn-box');
          api.add(box, 'div', 'mn-hazard-stripe');
          const inner = api.add(box, 'div', 'mn-warn-inner');
          const tri = api.add(inner, 'div', 'mn-warn-tri', PICTO.warn);
          api.beat(tri, 'stamp', null, { gap: 0.05 });
          const txBox = api.add(inner, 'div', 'say');
          ls.forEach((l, i) => {
            const e = api.add(txBox, 'div', 'sl', rich(l));
            const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, gap: 0.14 });
            api.marks(e, b);
          });
          api.add(box, 'div', 'mn-warn-foot', '<span>CAUTION // ATTENTION</span><span>注意核对</span>');
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // ───── 7. 工程大数字 + 卡尺尺寸线 + 放大镜标记（bignum）─────
      bignum(d, api) {
        api.root.classList.add('center');
        buildHead(api);
        const card = api.add(api.root, 'div', 'mn-bn-card');
        const topDim = api.add(card, 'div', 'mn-dim-line', '<i></i><span>SPECIFICATION</span><i></i>');
        api.beat(topDim, 'kicker', null, { gap: 0.05 });

        const main = api.add(card, 'div', 'mn-bn-main');
        const bn = api.add(main, 'div', 'bn');
        const row = api.add(bn, 'div', 'bn-row');
        const v = d.value ?? d.num;
        const { val } = api.num(row, v);
        if (d.unit) api.add(row, 'span', 'bn-u', rich(d.unit));
        api.fitBox(row);
        api.beat(row, 'big', d.valueAt, { auto: d.value != null ? String(d.value) : null, with: val ? [[val, 'count', 0]] : [] });

        const loupe = api.add(main, 'div', 'mn-bn-loupe', PICTO.loupeMini);
        api.beat(loupe, 'chip', null, { gap: 0.08 });

        if (d.label) {
          const l = api.add(card, 'div', 'bn-l', rich(d.label));
          const b = api.beat(l, 'text', d.labelAt, { auto: d.label });
          api.marks(l, b);
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // ───── 8. 工程图版 + 放大镜细节标注（image）─────
      image(d, api) {
        buildHead(api);
        const pts = arr(d.points ?? d.items).map(it => norm(it));
        const body = api.body(pts.length ? 'split mn-img-split' : 'solo mn-img-solo');

        const plate = api.add(body, 'div', 'mn-plate');
        const pbar = api.add(plate, 'div', 'mn-plate-bar', `<b>FIG. ${pad2(api.sc.i + 1)}</b><span>TECHNICAL DIAGRAM</span>`);
        api.beat(pbar, 'kicker', null, { gap: 0.04 });
        api.media(d.image ?? d.src, { parent: plate, frame: d.frame || 'plain', cap: d.cap, at: d.imageAt, kb: d.kb, title: d.windowTitle });

        if (pts.length) {
          const leg = api.add(body, 'div', 'mn-legend');
          api.add(leg, 'div', 'mn-leg-hd', 'CALLOUTS // 要点标注');
          const ul = api.add(leg, 'ul', 'list m-number' + nc(pts.length));
          pts.forEach((it, i) => {
            const ok = it.ok;
            const li = api.add(ul, 'li', 'item' + (ok === true ? ' ok' : ok === false ? ' no' : '') + (isHot(d, i, it) ? ' on' : ''));
            api.add(li, 'span', 'mk', api.marker(d.mode || 'number', i, ok));
            const tx = api.add(li, 'span', 'tx', rich(it.text ?? it.title));
            if (it.note) api.add(tx, 'span', 'nt', rich(it.note));
            const b = api.beat(li, 'item', it.at, { auto: it.text ?? it.title, spread: true, focus: focusOf(d, api) });
            api.marks(li, b);
          });
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // ───── 9. 标尺刻度条形图（bars）─────
      bars(d, api) {
        buildHead(api);
        const items = arr(d.items).map(it => norm(it, 'label'));
        const vals = items.map(it => Math.abs(parseFloat(String(it.value ?? 0).replace(/,/g, ''))) || 0);
        const log = d.scale === 'log';
        const f = v => (log ? Math.log10(Math.max(v, 1)) : v);
        const mx = d.max != null ? f(+d.max) : Math.max(...vals.map(f), 1e-9);

        const wrap = api.add(api.body(), 'div', 'mn-bars-sheet');
        const scaleBar = api.add(wrap, 'div', 'mn-scale-hd',
          `<b>${log ? 'LOG SCALE // 对数刻度' : 'SCALE // 工程标尺'}</b><i>0</i><i>25</i><i>50</i><i>75</i><i>100%</i>`);
        api.beat(scaleBar, 'kicker', null, { gap: 0.05 });

        const box = api.add(wrap, 'div', 'bars' + (log ? ' log' : '') + nc(items.length));
        items.forEach((it, i) => {
          const r = api.add(box, 'div', 'bar-row' + (isHot(d, i, it) ? ' on' : ''));
          api.add(r, 'div', 'bar-l', `<b class="mn-bi">${pad2(i + 1)}</b><span>${rich(it.label)}</span>`);
          const tr = api.add(r, 'div', 'bar-track');
          const fill = api.add(tr, 'div', 'bar-fill');
          fill.style.setProperty('--w', cl(f(vals[i]) / mx, 0.02, 1).toFixed(4));
          const v = api.add(tr, 'div', 'bar-v');
          const { val } = api.num(v, it.display ?? it.value);
          if (it.unit) api.add(v, 'span', 'bar-u', rich(it.unit));
          const w = [[fill, 'grow', 0.05]];
          if (val) w.push([val, 'count', 0.05, { d: 0.85 }]);
          const b = api.beat(r, 'bar', it.at, { auto: it.label, spread: true, focus: focusOf(d, api), with: w });
          api.marks(r, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // ───── 10. 检查清单表格（list）─────
      list(d, api, base) {
        buildHead(api);
        const items = arr(d.items).map(it => norm(it));
        const mode = d.mode || (items.some(it => it.ok != null) ? 'check' : 'bullet');
        const sheet = api.add(api.body(), 'div', 'mn-list-sheet');
        const hdr = api.add(sheet, 'div', 'mn-list-hd', `<span>CHECKLIST // 清单</span><b>${items.length} ITEMS</b>`);
        api.beat(hdr, 'kicker', null, { gap: 0.04 });

        const ul = api.add(sheet, 'ul', 'list m-' + mode + nc(items.length));
        ul.style.setProperty('--cols', d.cols ?? (api.land && items.length >= 5 ? 2 : 1));
        items.forEach((it, i) => {
          const ok = it.ok != null ? !!it.ok : mode === 'check' ? true : mode === 'cross' ? false : undefined;
          const li = api.add(ul, 'li', 'item' + (ok === true ? ' ok' : ok === false ? ' no' : '') + (isHot(d, i, it) ? ' on' : ''));
          api.add(li, 'span', 'mk', api.marker(mode, i, ok));
          const tx = api.add(li, 'span', 'tx', rich(it.text ?? it.title));
          if (it.note) api.add(tx, 'span', 'nt', rich(it.note));
          const b = api.beat(li, 'item', it.at, { auto: it.text ?? it.title, spread: true, focus: focusOf(d, api) });
          api.marks(li, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // ───── 11. 规格参数表（stats）─────
      stats(d, api, base) {
        base(d, api);
        api.root.querySelectorAll('.stat').forEach((el, i) => {
          const tag = api.h('div', 'mn-spec-hd', `SPEC // ${pad2(i + 1)}`);
          el.prepend(tag);
        });
      },

      // ───── 12. 工程师备忘/口诀框（quote）─────
      quote(d, api) {
        api.root.classList.add('center');
        buildHead(api);
        const box = api.add(api.root, 'div', 'mn-tip-box');
        const hd = api.add(box, 'div', 'mn-tip-hd', `<i class="mn-tip-ic">${PICTO.tip}</i><span>TECHNICAL NOTE // 备忘口诀</span>`);
        api.beat(hd, 'chip', d.markAt);
        const qt = api.add(box, 'div', 'q-text');
        const els = lines(d.text ?? d.quote).map(l => api.add(qt, 'div', 'ql', rich(l)));
        const b = api.beat(els, 'quote', d.textAt);
        els.forEach(e => api.marks(e, b));
        const src = d.source ?? d.by ?? d.author;
        if (src) api.beat(api.add(box, 'div', 'q-src', `REF // ${rich(src)}`), 'note', d.sourceAt, { auto: src });
      },

      // ───── 13. 计算公式框（formula）─────
      formula(d, api, base) {
        base(d, api);
        const f = api.root.querySelector('.formula');
        if (f) {
          const wrap = api.h('div', 'mn-calc-box');
          wrap.appendChild(api.h('div', 'mn-calc-hd', 'CALC // FORMULA'));
          f.parentNode.insertBefore(wrap, f);
          wrap.appendChild(f);
        }
      },

      // ───── 14. 说明书封底（墨黑 + 描线完成勾 + 行动框 + 条形码）─────
      ending(d, api) {
        const sheet = api.add(api.root, 'div', 'mn-end-sheet');
        const main = api.add(sheet, 'div', 'mn-end-main');
        const done = api.add(main, 'div', 'mn-done-mark', PICTO.doneRing);
        api.beat(done, 'stamp', null, { gap: 0.05 });

        buildHead(api, { parent: main, big: true });

        const tags = arr(d.tags ?? d.chips);
        if (tags.length) {
          const box = api.add(main, 'div', 'chips');
          const els = tags.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
          api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
        }
        if (d.cta) {
          const c = api.add(main, 'div', 'mn-end-cta', `<b class="mn-cta-arr">▶</b><span>${rich(d.cta)}</span>`);
          const b = api.beat(c, 'text', d.ctaAt, { auto: d.cta });
          api.marks(c, b);
        }

        const foot = api.add(sheet, 'div', 'mn-end-foot');
        const by = d.byline ?? api.story.byline;
        const left = api.add(foot, 'div', 'mn-end-meta',
          `<div class="mn-end-code">REV. 1.0 // COMPLETE</div>${by ? `<div class="mn-end-by">${rich(by)}</div>` : ''}`);
        const bc = api.add(foot, 'div', 'mn-end-bc', barcodeSvg(d.title || api.story.title));
        api.beat([left, bc], 'note', d.bylineAt);
      },
    },
  });
})();
