/* 瑞士网格 swiss-grid — 国际主义平面设计与信息设计 */
(() => {
  'use strict';
  const RED = '#E4002B', RED_BRIGHT = '#FF284B', INK = '#111111', PAPER = '#F2F0EB', BLUE = '#6E8CA0';
  const MARGIN = { r34: 84, r916: 80, r169: 150 };
  const GUT = { r34: 16, r916: 16, r169: 24 };

  const ON_RED = {
    '--bg': RED, '--fg': '#FFFFFF', '--fg2': 'rgba(255,255,255,.88)', '--fg3': 'rgba(255,255,255,.62)',
    '--accent': INK, '--accent-t': INK, '--hl': INK, '--sq': '#FFFFFF',
    '--line': 'rgba(255,255,255,.32)', '--line-strong': '#FFFFFF', '--card-bd': '#FFFFFF',
  };
  const ON_INK = {
    '--bg': INK, '--fg': PAPER, '--fg2': 'rgba(242,240,235,.76)', '--fg3': 'rgba(242,240,235,.48)',
    '--accent': RED_BRIGHT, '--accent-t': RED_BRIGHT, '--hl': RED_BRIGHT, '--sq': RED_BRIGHT,
    '--line': 'rgba(242,240,235,.22)', '--line-strong': PAPER, '--card-bd': PAPER,
  };

  // ───── 自定义瑞士动效 ─────
  const { cl, EZ, pad2, plain, esc, rich } = MV.util;

  // 粗细结构线从左向右精准伸长
  MV.kinds.ruleGrow = {
    f(el, p) {
      const e = EZ.expo(p);
      el.style.opacity = p > 0 ? 1 : 0;
      el.style.scale = `${e.toFixed(4)} 1`;
    },
  };
  MV.kinds.ruleGrowY = {
    f(el, p) {
      const e = EZ.expo(p);
      el.style.opacity = p > 0 ? 1 : 0;
      el.style.scale = `1 ${e.toFixed(4)}`;
    },
  };
  // 几何图形精准展开（无弹跳）
  MV.kinds.swissGeo = {
    f(el, p) {
      const e = EZ.o4(p);
      el.style.opacity = cl(p * 2.4).toFixed(4);
      el.style.scale = (0.88 + 0.12 * e).toFixed(4);
    },
  };
  // 100 格点阵按顺序逐格点亮
  MV.kinds.gridCells = {
    f(el, p) {
      const cells = el._cells || (el._cells = [...el.querySelectorAll('.sg-cell')]);
      if (!cells.length) return;
      const e = EZ.o2(p);
      const lit = e * cells.length;
      for (let i = 0; i < cells.length; i++) {
        const q = cl(lit - i, 0, 1);
        cells[i].style.opacity = (0.1 + 0.9 * q).toFixed(3);
        cells[i].style.scale = (0.76 + 0.24 * q).toFixed(3);
      }
    },
  };

  // ───── 辅助几何 SVG 生成器 ─────
  // 封面瑞士海报几何主视觉：红圆 + 墨黑象限弧 + 灰蓝同心环 + 精密十字坐标格
  function posterArtSvg(land) {
    if (land) {
      return `<svg class="sg-geo-svg" viewBox="0 0 480 620" preserveAspectRatio="xMidYMid meet">
        <g stroke="#111111" stroke-opacity="0.16" stroke-width="1.5">
          <line x1="0" y1="124" x2="480" y2="124"/><line x1="0" y1="248" x2="480" y2="248"/>
          <line x1="0" y1="372" x2="480" y2="372"/><line x1="0" y1="496" x2="480" y2="496"/>
          <line x1="120" y1="0" x2="120" y2="620"/><line x1="240" y1="0" x2="240" y2="620"/>
          <line x1="360" y1="0" x2="360" y2="620"/>
        </g>
        <rect x="0" y="0" width="480" height="620" fill="none" stroke="#111111" stroke-width="3"/>
        <rect x="0" y="0" width="120" height="124" fill="#111111"/>
        <text x="18" y="42" font-family="MV Mono, monospace" font-size="18" font-weight="700" fill="#F2F0EB">12G</text>
        <text x="18" y="102" font-family="MV Grot, sans-serif" font-size="38" font-weight="900" fill="#E4002B">01</text>
        <circle cx="240" cy="330" r="194" fill="none" stroke="${BLUE}" stroke-width="22"/>
        <path d="M 240 136 A 194 194 0 0 1 434 330" fill="none" stroke="#111111" stroke-width="22"/>
        <circle cx="240" cy="330" r="136" fill="${RED}"/>
        <line x1="240" y1="86" x2="240" y2="574" stroke="#111111" stroke-width="2"/>
        <line x1="24" y1="330" x2="456" y2="330" stroke="#111111" stroke-width="2"/>
        <rect x="231" y="321" width="18" height="18" fill="#F2F0EB"/>
        <rect x="438" y="578" width="20" height="20" fill="${RED}"/>
        <text x="140" y="40" font-family="MV Mono, monospace" font-size="16" font-weight="700" fill="#111111">COL 08—12 // MODULE</text>
        <text x="24" y="594" font-family="MV Mono, monospace" font-size="15" font-weight="700" fill="#4A4A46">RATIO 97.5 : 02.5</text>
      </svg>`;
    }
    return `<svg class="sg-geo-svg" viewBox="0 0 420 420" preserveAspectRatio="xMidYMid meet">
      <g stroke="#111111" stroke-opacity="0.16" stroke-width="1.5">
        <line x1="0" y1="105" x2="420" y2="105"/><line x1="0" y1="210" x2="420" y2="210"/>
        <line x1="0" y1="315" x2="420" y2="315"/>
        <line x1="105" y1="0" x2="105" y2="420"/><line x1="210" y1="0" x2="210" y2="420"/>
        <line x1="315" y1="0" x2="315" y2="420"/>
      </g>
      <rect x="0" y="0" width="420" height="420" fill="none" stroke="#111111" stroke-width="3"/>
      <rect x="0" y="0" width="105" height="105" fill="#111111"/>
      <text x="16" y="34" font-family="MV Mono, monospace" font-size="15" font-weight="700" fill="#F2F0EB">G12</text>
      <text x="16" y="88" font-family="MV Grot, sans-serif" font-size="36" font-weight="900" fill="#E4002B">01</text>
      <circle cx="222" cy="222" r="158" fill="none" stroke="${BLUE}" stroke-width="20"/>
      <path d="M 222 64 A 158 158 0 0 1 380 222" fill="none" stroke="#111111" stroke-width="20"/>
      <circle cx="222" cy="222" r="112" fill="${RED}"/>
      <line x1="222" y1="32" x2="222" y2="404" stroke="#111111" stroke-width="2"/>
      <line x1="32" y1="222" x2="404" y2="222" stroke="#111111" stroke-width="2"/>
      <rect x="213" y="213" width="18" height="18" fill="#F2F0EB"/>
      <rect x="384" y="384" width="18" height="18" fill="${RED}"/>
      <text x="122" y="32" font-family="MV Mono, monospace" font-size="15" font-weight="700" fill="#111111">COL 07—12 // AXIS</text>
      <text x="18" y="400" font-family="MV Mono, monospace" font-size="14" font-weight="700" fill="#4A4A46">97.5 : 02.5</text>
    </svg>`;
  }

  // bignum 左侧几何装置：百分比自动画同心圆比例图，非百分比画精密刻度尺
  function bignumVisSvg(rawVal, unit) {
    const s = String(rawVal ?? '') + String(unit ?? '');
    const m = /(-?\d+(?:\.\d+)?)\s*%/.exec(s);
    if (m) {
      const pct = cl(parseFloat(m[1]), 0, 100);
      const r = 74, C = 2 * Math.PI * r;
      const dash = (C * pct / 100).toFixed(2);
      const rest = (C - C * pct / 100).toFixed(2);
      return `<svg class="sg-bn-svg" viewBox="0 0 220 220">
        <rect x="1" y="1" width="218" height="218" fill="none" stroke="var(--line-strong)" stroke-width="2"/>
        <line x1="110" y1="12" x2="110" y2="208" stroke="var(--line)" stroke-width="1.5"/>
        <line x1="12" y1="110" x2="208" y2="110" stroke="var(--line)" stroke-width="1.5"/>
        <circle cx="110" cy="110" r="${r}" fill="none" stroke="rgba(17,17,17,.14)" stroke-width="22"/>
        <circle cx="110" cy="110" r="${r}" fill="none" stroke="${BLUE}" stroke-width="22"
          stroke-dasharray="${dash} ${rest}" transform="rotate(-90 110 110)"/>
        <circle cx="110" cy="110" r="42" fill="none" stroke="${RED}" stroke-width="4"/>
        <rect x="104" y="104" width="12" height="12" fill="${RED}"/>
        <text x="14" y="26" font-family="MV Mono, monospace" font-size="14" font-weight="700" fill="var(--fg2)">RATIO ${pct}%</text>
      </svg>`;
    }
    let ticks = '';
    for (let i = 0; i <= 10; i++) {
      const x = 18 + i * 18.4;
      const h2 = i % 5 === 0 ? 34 : 18;
      ticks += `<line x1="${x.toFixed(1)}" y1="128" x2="${x.toFixed(1)}" y2="${128 - h2}" stroke="#111111" stroke-width="${i % 5 === 0 ? 2.5 : 1.5}"/>`;
    }
    return `<svg class="sg-bn-svg" viewBox="0 0 220 176">
      <rect x="1" y="1" width="218" height="174" fill="none" stroke="var(--line-strong)" stroke-width="2"/>
      <rect x="18" y="18" width="18" height="18" fill="${RED}"/>
      <text x="46" y="33" font-family="MV Mono, monospace" font-size="15" font-weight="700" fill="#111111">METRIC // 01</text>
      <line x1="18" y1="128" x2="202" y2="128" stroke="#111111" stroke-width="3"/>
      ${ticks}
      <rect x="18" y="138" width="128" height="12" fill="${BLUE}"/>
      <rect x="146" y="138" width="56" height="12" fill="${RED}"/>
    </svg>`;
  }

  // 结尾页几何印记
  function endingArtSvg() {
    return `<svg class="sg-end-svg" viewBox="0 0 240 240">
      <rect x="1" y="1" width="238" height="238" fill="none" stroke="rgba(242,240,235,.28)" stroke-width="2"/>
      <line x1="120" y1="0" x2="120" y2="240" stroke="rgba(242,240,235,.2)" stroke-width="1.5"/>
      <line x1="0" y1="120" x2="240" y2="120" stroke="rgba(242,240,235,.2)" stroke-width="1.5"/>
      <circle cx="120" cy="120" r="76" fill="${RED_BRIGHT}"/>
      <circle cx="120" cy="120" r="102" fill="none" stroke="${BLUE}" stroke-width="8"/>
      <rect x="113" y="113" width="14" height="14" fill="${INK}"/>
      <rect x="14" y="14" width="14" height="14" fill="#F2F0EB"/>
    </svg>`;
  }

  // 在红/黑整页上叠加 12 栏极淡白色网格参考线
  function addGridOverlay(sc) {
    const g = document.createElement('div');
    g.className = 'sg-tone-grid';
    for (let k = 0; k < 12; k++) {
      const col = document.createElement('i');
      g.appendChild(col);
    }
    sc.el.insertBefore(g, sc.content);
  }

  function addHeadRule(sc, api, heavy) {
    const hd = sc.content.querySelector('.head');
    if (!hd || hd.querySelector('.sg-hd-rule')) return;
    const rule = api.add(hd, 'div', 'sg-hd-rule' + (heavy ? ' heavy' : ''));
    const refBeat = sc.beats.find(b => b.role === 'title' || b.role === 'kicker');
    if (refBeat) {
      (refBeat.extra = refBeat.extra || []).push({ el: rule, kind: 'ruleGrow', delay: 0.14, d: 0.5 });
    } else {
      api.beat(rule, 'line', null, { kind: 'ruleGrow', d: 0.45 });
    }
  }

  function makeChips(d, api, parent, list) {
    const arr = list == null || list === '' ? [] : Array.isArray(list) ? list : [list];
    if (!arr.length) return null;
    const box = api.add(parent, 'div', 'chips');
    const els = arr.map((c, i) => {
      const hot = d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i)) || (d.hot == null && i === 0);
      return api.add(box, 'span', 'chip' + (hot ? ' hot' : ''), rich(c));
    });
    api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: arr[0] });
    return box;
  }

  MV.style({
    // 转场：6 条瑞士栏位依次刷新落下（对应 12 栏两两一组）
    transition: { kind: 'columns', dur: 0.72, n: 6, stagger: 0.42 },
    motion: {
      kicker: { kind: 'wipe', d: 0.42 },
      title: { kind: 'up', d: 0.68, stagger: 0.08, gap: 0.1, o: { dist: 52 } },
      big: { kind: 'up', d: 0.74, stagger: 0.1, gap: 0.12, o: { dist: 80 } },
      text: { kind: 'up', d: 0.52, gap: 0.24, o: { dist: 30 } },
      item: { kind: 'slideX', d: 0.48, stagger: 0.06, gap: 0.32, o: { dist: -36 } },
      card: { kind: 'up', d: 0.56, stagger: 0.08, gap: 0.3, o: { dist: 44 } },
      chip: { kind: 'wipe', d: 0.36, stagger: 0.06, gap: 0.2 },
      image: { kind: 'wipe', d: 0.68, gap: 0.26 },
      note: { kind: 'up', d: 0.42, gap: 0.22, o: { dist: 20 } },
      quote: { kind: 'up', d: 0.68, stagger: 0.14, gap: 0.18, o: { dist: 44 } },
      stamp: { kind: 'wipe', d: 0.38, gap: 0.24 },
      gridCells: { kind: 'gridCells', d: 1.45, gap: 0.12 },
    },
    focus: true,
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'plain',
    kenBurns: 0.03,
    quoteMark: '“',

    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'light') return { tone: 'light' };
      if (d.bg === 'red' || t === 'chapter') return { tone: 'red', bg: RED, vars: ON_RED };
      if (d.bg === 'dark' || t === 'statement' || t === 'ending') return { tone: 'dark', bg: INK, vars: ON_INK };
      return { tone: 'light' };
    },

    // 底纸：纸白 #F2F0EB + 精准 12 栏网格（与 CSS 栏宽逐像素重合）+ 上下红黑刻度
    paint(g, W, H, R, u) {
      g.fillStyle = PAPER;
      g.fillRect(0, 0, W, H);
      const m = MARGIN[u.rc] || 84;
      const gut = GUT[u.rc] || 16;
      const cw = (W - m * 2 - gut * 11) / 12;

      // 水平极淡模数参考线
      g.strokeStyle = 'rgba(17,17,17,.032)';
      g.lineWidth = 1;
      g.beginPath();
      for (let y = 120; y < H; y += 120) {
        g.moveTo(m, y + 0.5);
        g.lineTo(W - m, y + 0.5);
      }
      g.stroke();

      // 12 栏垂直参考线与刻度
      for (let k = 0; k < 12; k++) {
        const x = m + k * (cw + gut);
        g.fillStyle = 'rgba(17,17,17,.017)';
        g.fillRect(x, 0, cw, H);
        g.fillStyle = 'rgba(17,17,17,.065)';
        g.fillRect(Math.round(x), 0, 1, H);
        g.fillRect(Math.round(x + cw) - 1, 0, 1, H);
        // 顶部与底部红黑双色栏位刻度
        g.fillStyle = k === 0 || k === 6 ? 'rgba(228,0,43,.85)' : 'rgba(228,0,43,.45)';
        g.fillRect(Math.round(x), 0, 2, 16);
        g.fillRect(Math.round(x), H - 16, 2, 16);
      }
      u.noise(3, 41);
    },

    // 页眉页脚：顶部 12 栏坐标号 + 三段对齐栏位页眉 + 红黑进度线 + 底部设计稿坐标
    chrome(c) {
      const rail = c.h('div', 'sg-rail');
      const cols = [];
      for (let k = 0; k < 12; k++) {
        const sp = c.h('span', 'sg-rc', pad2(k + 1));
        rail.appendChild(sp);
        cols.push(sp);
      }
      const top = c.h('div', 'sg-top');
      const sec = c.h('span', 'sg-sec');
      const pg = c.h('span', 'sg-pg'), pn = c.h('b'), pt = c.h('i');
      pg.append(pn, pt);
      top.append(c.h('span', 'sg-ser', `<i class="sg-ser-sq"></i>${c.esc(c.plain(c.story.series || c.story.title || ''))}`), sec, pg);
      const rule = c.h('div', 'sg-rule'), bar = c.h('i', 'sg-bar');
      rule.append(bar);
      const foot = c.h('div', 'sg-foot');
      const coord = c.h('span', 'sg-coord', `GRID 12 // ${c.ratio}`);
      const rbox = c.h('span', 'sg-fright');
      const fpg = c.h('span', 'sg-fpg');
      rbox.append(fpg, c.h('i', 'sg-sq'));
      foot.append(c.h('span', 'sg-by', c.esc(c.plain(c.story.byline || ''))), coord, rbox);
      c.el.append(rail, top, rule, foot);

      let lastI = -2, lastCol = -1;
      return info => {
        if (info.i !== lastI) {
          lastI = info.i;
          pn.textContent = info.page;
          pt.textContent = '/' + info.total;
          fpg.textContent = `P.${info.page}`;
          sec.textContent = info.cover ? 'SWISS // 12G' : (info.section || '');
        }
        const p = c.cl(info.progress);
        bar.style.scale = `${p.toFixed(4)} 1`;
        const ac = info.cover ? 0 : Math.min(11, Math.floor(p * 12));
        if (ac !== lastCol) {
          if (lastCol >= 0) cols[lastCol].classList.remove('active');
          cols[ac].classList.add('active');
          lastCol = ac;
        }
      };
    },

    // ───── 按瑞士网格版式语法重写核心模板 ─────
    templates: {
      // 1) 封面：瑞士国际主义海报（竖屏上下分区，横屏左 7 栏排版 + 右 5 栏几何海报块）
      cover(d, api) {
        const layout = d.layout || 'poster';
        const root = api.root;
        root.classList.add('sg-cover', 'sg-cov-' + layout);

        if (api.land) {
          const grid = api.add(root, 'div', 'sg-cov-land');
          const left = api.add(grid, 'div', 'sg-cov-left');
          const right = api.add(grid, 'div', 'sg-cov-right');

          if (d.kicker) {
            api.beat(api.add(left, 'div', 'kicker', `<span class="kt">${rich(d.kicker)}</span>`), 'kicker', d.kickerAt);
          }
          if (d.title) {
            const h1 = api.add(left, 'h1', 'title xl sg-stagger');
            String(d.title).split('\n').forEach((l, idx) => {
              const cls = 'ln' + (idx % 2 === 1 && plain(l).length <= 8 ? ' sg-indent' : '');
              const ln = api.add(h1, 'span', cls, rich(l));
              ln.dataset.src = l;
            });
            const b = api.beat([...h1.children], 'title', d.titleAt);
            h1._beat = b;
            api.marks(h1, b);
            api.fitTitle(h1);
          }
          const rule = api.add(left, 'div', 'sg-cov-rule');
          api.beat(rule, 'line', null, { kind: 'ruleGrow', d: 0.5, gap: 0.08 });

          const bot = api.add(left, 'div', 'sg-cov-lbot');
          if (d.sub ?? d.dek) {
            const e = api.add(bot, 'div', 'dek', rich(d.sub ?? d.dek));
            const b = api.beat(e, 'text', d.subAt);
            api.marks(e, b);
          }
          makeChips(d, api, bot, d.tags ?? d.chips);
          const spec = api.add(bot, 'div', 'sg-cov-meter', '<i class="b"></i><i class="r"></i><span>MOD 12 // SCALE 1:100</span>');
          api.beat(spec, 'text', null, { gap: 0.1 });
          if (d.meta) {
            api.beat(api.add(bot, 'div', 'meta', rich(d.meta)), 'note', d.metaAt);
          }

          if (d.image) {
            api.media(d.image, { parent: right, frame: d.frame, at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
          } else {
            const art = api.add(right, 'div', 'sg-cov-art', posterArtSvg(true));
            api.beat(art, 'image', null, { kind: 'swissGeo', d: 0.68, gap: 0.08 });
          }
          return;
        }

        // 3:4 & 9:16 竖屏：顶部元信息条 + 错位超大标题 + 7px 粗黑线 + 下半 12 栏不对称图文海报
        const topRow = api.add(root, 'div', 'sg-cov-bar');
        if (d.kicker) {
          api.beat(api.add(topRow, 'div', 'kicker', `<span class="kt">${rich(d.kicker)}</span>`), 'kicker', d.kickerAt);
        }
        api.add(topRow, 'div', 'sg-cov-spec', 'GRID 12 // POSTER');

        if (d.title) {
          const h1 = api.add(root, 'h1', 'title xl sg-stagger');
          String(d.title).split('\n').forEach((l, idx) => {
            const cls = 'ln' + (idx % 2 === 1 && plain(l).length <= 7 ? ' sg-indent' : '');
            const ln = api.add(h1, 'span', cls, rich(l));
            ln.dataset.src = l;
          });
          const b = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = b;
          api.marks(h1, b);
          api.fitTitle(h1);
        }

        const rule = api.add(root, 'div', 'sg-cov-rule');
        api.beat(rule, 'line', null, { kind: 'ruleGrow', d: 0.5, gap: 0.08 });

        if (d.image) {
          const lower = api.add(root, 'div', 'sg-cov-img-zone');
          api.media(d.image, { parent: lower, frame: d.frame, at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
          if (d.sub ?? d.dek) {
            const e = api.add(root, 'div', 'dek', rich(d.sub ?? d.dek));
            const b = api.beat(e, 'text', d.subAt);
            api.marks(e, b);
          }
          makeChips(d, api, root, d.tags ?? d.chips);
          if (d.meta) api.beat(api.add(root, 'div', 'meta', rich(d.meta)), 'note', d.metaAt);
          return;
        }

        // 下半屏 12 栏：左 6 栏文字/标签/几何比例尺/来源 + 右 6 栏瑞士红圆几何装置
        const lower = api.add(root, 'div', 'sg-cov-lower');
        const infoCol = api.add(lower, 'div', 'sg-cov-info');
        const topInfo = api.add(infoCol, 'div', 'sg-cov-itop');
        if (d.sub ?? d.dek) {
          const e = api.add(topInfo, 'div', 'dek', rich(d.sub ?? d.dek));
          const b = api.beat(e, 'text', d.subAt);
          api.marks(e, b);
        }
        makeChips(d, api, topInfo, d.tags ?? d.chips);

        const botInfo = api.add(infoCol, 'div', 'sg-cov-ibot');
        const meter = api.add(botInfo, 'div', 'sg-cov-meter', '<i class="b"></i><i class="r"></i><span>MOD 12 // SCALE 1:100</span>');
        api.beat(meter, 'text', null, { gap: 0.1 });
        if (d.meta) {
          api.beat(api.add(botInfo, 'div', 'meta', rich(d.meta)), 'note', d.metaAt);
        }

        const artCol = api.add(lower, 'div', 'sg-cov-art', posterArtSvg(false));
        api.beat(artCol, 'image', null, { kind: 'swissGeo', d: 0.68, gap: 0.1 });
      },

      // 2) 章节页：整页瑞士红 + 不对称超大章节号 + 8px 粗白横线 + 墨黑几何块
      chapter(d, api) {
        const root = api.root;
        root.classList.add('sg-chap');
        const n = d.num ?? pad2(api.sc.chapNo || 1);

        if (api.land) {
          const grid = api.add(root, 'div', 'sg-ch-land');
          const left = api.add(grid, 'div', 'sg-ch-l');
          const right = api.add(grid, 'div', 'sg-ch-r');
          api.add(left, 'div', 'sg-ch-tag', `SECTION // ${n !== false && n !== '' ? esc(n) : 'CH'}`);
          if (n !== false && n !== '') {
            api.beat(api.add(left, 'div', 'chap-num', esc(n)), 'big', d.numAt);
          }
          api.add(left, 'div', 'sg-ch-blk');
          api.head({ parent: right, big: true });
          api.note(right, d.note, d.noteAt);
          return;
        }

        const top = api.add(root, 'div', 'sg-ch-top');
        api.add(top, 'div', 'sg-ch-tag', `SECTION // ${n !== false && n !== '' ? esc(n) : 'CH'}`);
        if (n !== false && n !== '') {
          api.beat(api.add(top, 'div', 'chap-num', esc(n)), 'big', d.numAt);
        }
        const rule = api.add(root, 'div', 'sg-ch-rule');
        api.beat(rule, 'line', null, { kind: 'ruleGrow', d: 0.5, gap: 0.06 });

        const bot = api.add(root, 'div', 'sg-ch-bot');
        const main = api.add(bot, 'div', 'sg-ch-main');
        api.head({ parent: main, big: true });
        api.note(main, d.note, d.noteAt);
        api.add(bot, 'div', 'sg-ch-blk');
      },

      // 3) 大数字：超大 Inter 数字跨全宽 + 6px 粗线 + 下方左 4 栏几何比例装置 & 右 8 栏解说
      bignum(d, api) {
        const root = api.root;
        root.classList.add('sg-bignum');
        const top = api.add(root, 'div', 'sg-bn-top');
        if (d.kicker) api.beat(api.add(top, 'div', 'kicker', `<span class="kt">${rich(d.kicker)}</span>`), 'kicker', d.kickerAt);
        if (d.title) {
          const h1 = api.add(top, 'h1', 'title');
          String(d.title).split('\n').forEach(l => { const ln = api.add(h1, 'span', 'ln', rich(l)); ln.dataset.src = l; });
          const b = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = b;
          api.marks(h1, b);
          api.fitTitle(h1);
        }

        const row = api.add(root, 'div', 'bn-row');
        const v = d.value ?? d.num;
        const { val } = api.num(row, v);
        if (d.unit) api.add(row, 'span', 'bn-u', rich(d.unit));
        api.fitBox(row);
        api.beat(row, 'big', d.valueAt, { auto: v != null ? String(v) : null, with: val ? [[val, 'count', 0]] : [] });

        const rule = api.add(root, 'div', 'sg-bn-rule');
        api.beat(rule, 'line', null, { kind: 'ruleGrow', d: 0.5, gap: 0.08 });

        const lower = api.add(root, 'div', 'sg-bn-lower');
        const vis = api.add(lower, 'div', 'sg-bn-vis', bignumVisSvg(v, d.unit));
        api.beat(vis, 'image', null, { kind: 'swissGeo', d: 0.6, gap: 0.06 });

        const txt = api.add(lower, 'div', 'sg-bn-txt');
        if (d.label) {
          const l = api.add(txt, 'div', 'bn-l', rich(d.label));
          const b = api.beat(l, 'text', d.labelAt, { auto: d.label });
          api.marks(l, b);
        }
        api.note(txt, d.note, d.noteAt);
      },

      // 4) 金句：整页墨黑 + 左侧 14px 粗瑞士红竖条 + 非对称粗黑大字
      statement(d, api) {
        const root = api.root;
        root.classList.add('sg-stmt');
        const grid = api.add(root, 'div', 'sg-st-grid');
        const bar = api.add(grid, 'div', 'sg-st-rail');
        api.beat(bar, 'line', null, { kind: 'ruleGrowY', d: 0.5, gap: 0 });

        const main = api.add(grid, 'div', 'sg-st-main');
        const metaTop = api.add(main, 'div', 'sg-st-meta');
        if (d.kicker) {
          api.beat(api.add(metaTop, 'div', 'kicker', `<span class="kt">${rich(d.kicker)}</span>`), 'kicker', d.kickerAt);
        } else {
          api.add(metaTop, 'div', 'sg-st-tag', 'KEY // STATEMENT');
        }
        if (d.title) api.head({ parent: main, kicker: false });

        const raw = d.text ?? d.lines;
        const ls = (raw == null ? [] : Array.isArray(raw) ? raw : [raw])
          .flatMap(s => String(s).split('\n'))
          .filter(s => s.trim() !== '');
        if (ls.length) {
          const box = api.add(main, 'div', 'say');
          ls.forEach((l, i) => {
            const e = api.add(box, 'div', 'sl', rich(l));
            const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, gap: 0.14 });
            api.marks(e, b);
          });
        }
        api.note(main, d.note, d.noteAt);
      },

      // 5) 结尾：整页墨黑瑞士封底海报 + 粗红顶带 + 几何红圆印记
      ending(d, api) {
        const root = api.root;
        root.classList.add('sg-end');

        const top = api.add(root, 'div', 'sg-end-top');
        const bar = api.add(top, 'div', 'sg-end-bar');
        api.beat(bar, 'line', null, { kind: 'ruleGrow', d: 0.45, gap: 0 });
        api.add(top, 'div', 'sg-end-tag', 'END // SWISS 12G');

        if (d.kicker) {
          api.beat(api.add(root, 'div', 'kicker', `<span class="kt">${rich(d.kicker)}</span>`), 'kicker', d.kickerAt);
        }
        if (d.title) {
          const h1 = api.add(root, 'h1', 'title xl sg-stagger');
          String(d.title).split('\n').forEach((l, idx) => {
            const cls = 'ln' + (idx % 2 === 1 && plain(l).length <= 8 ? ' sg-indent' : '');
            const ln = api.add(h1, 'span', cls, rich(l));
            ln.dataset.src = l;
          });
          const b = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = b;
          api.marks(h1, b);
          api.fitTitle(h1);
        }

        const rule = api.add(root, 'div', 'sg-end-rule');
        api.beat(rule, 'line', null, { kind: 'ruleGrow', d: 0.5, gap: 0.08 });

        const lower = api.add(root, 'div', 'sg-end-lower');
        const info = api.add(lower, 'div', 'sg-end-info');
        makeChips(d, api, info, d.tags ?? d.chips);
        if (d.cta) {
          const c = api.add(info, 'div', 'cta', rich(d.cta));
          const b = api.beat(c, 'text', d.ctaAt, { auto: d.cta });
          api.marks(c, b);
        }
        const by = d.byline ?? api.story.byline;
        if (by) api.beat(api.add(info, 'div', 'meta byline', rich(by)), 'note', d.bylineAt);

        const art = api.add(lower, 'div', 'sg-end-art', endingArtSvg());
        api.beat(art, 'image', null, { kind: 'swissGeo', d: 0.6, gap: 0.1 });
      },

      // 6) 条形图：细长直角条 + 顶部标尺刻度线 + 数值置条外
      bars(d, api, base) {
        base(d, api);
        const box = api.root.querySelector('.bars');
        if (!box) return;
        const axis = document.createElement('div');
        axis.className = 'sg-bars-axis';
        const isLog = d.scale === 'log';
        const ticks = isLog ? ['LOG', '10¹', '10²', '10³+'] : ['0%', '25%', '50%', '75%', '100%'];
        axis.innerHTML = `<span class="sg-ba-lbl">${isLog ? 'SCALE // LOG10' : 'SCALE // LINEAR'}</span>`
          + `<div class="sg-ba-ticks">${ticks.map(t => `<i>${t}</i>`).join('')}</div>`;
        box.insertBefore(axis, box.firstChild);

        box.querySelectorAll('.bar-row').forEach((row, idx) => {
          const l = row.querySelector('.bar-l');
          if (l) l.innerHTML = `<em class="sg-bar-i">${pad2(idx + 1)}</em><span class="sg-bar-t">${l.innerHTML}</span>`;
        });
      },

      // 7) 数据卡 / 代码 / 公式 / 自定义模块
      stats(d, api, base) {
        base(d, api);
        api.root.querySelectorAll('.stat').forEach((el, idx) => {
          const tag = document.createElement('div');
          tag.className = 'sg-stat-idx';
          tag.textContent = 'DATA // ' + pad2(idx + 1);
          el.insertBefore(tag, el.firstChild);
        });
      },

      code(d, api, base) {
        base(d, api);
        const bar = api.root.querySelector('.code-bar');
        if (bar) {
          const fn = d.file ? esc(d.file) : 'SOURCE';
          const lg = d.lang ? esc(String(d.lang).toUpperCase()) : 'CODE';
          bar.innerHTML = `<b class="sg-cb-sq"></b><span class="sg-cb-fn">${fn}</span><em class="sg-cb-lg">SPEC // ${lg}</em>`;
        }
      },

      formula(d, api, base) {
        base(d, api);
        const f = api.root.querySelector('.formula');
        if (f) {
          const plate = document.createElement('div');
          plate.className = 'sg-eq-plate';
          const tag = document.createElement('div');
          tag.className = 'sg-eq-tag';
          tag.textContent = 'EQ // 01';
          f.parentNode.insertBefore(plate, f);
          plate.appendChild(tag);
          plate.appendChild(f);
        }
      },

      custom(d, api, base) {
        base(d, api);
        const grid = api.root.querySelector('.sg-m100-grid');
        if (grid) {
          const blueFull = 97;
          const frag = document.createDocumentFragment();
          for (let i = 0; i < 100; i++) {
            const c = document.createElement('i');
            c.className = 'sg-cell ' + (i < blueFull ? 'blue' : i === blueFull ? 'half' : 'red');
            frag.appendChild(c);
          }
          grid.appendChild(frag);
        }
      },
    },

    decorate(sc, api) {
      if (sc.tone === 'red' || sc.tone === 'dark') addGridOverlay(sc);
      if (['list', 'bars', 'stats', 'cards', 'compare', 'steps', 'timeline', 'code', 'image', 'custom'].includes(sc.t)) {
        addHeadRule(sc, api, sc.t === 'bars' || sc.t === 'list' || sc.t === 'custom');
      }
      if (sc.t === 'image') {
        const fr = sc.content.querySelector('.frame');
        if (fr) {
          ['tl', 'tr', 'bl', 'br'].forEach(k => {
            const mk = document.createElement('i');
            mk.className = 'sg-reg ' + k;
            fr.appendChild(mk);
          });
        }
      }
    },

    link(x1, y1, x2, y2, o) {
      if (Math.hypot(x2 - x1, y2 - y1) < 4) return '';
      const f = v => v.toFixed(1);
      return `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} ` + o.arrowHead(x1, y1, x2, y2, 12, 0.45);
    },

    marker(mode, i, ok) {
      if (mode === 'number') return `<b class="sg-n">${pad2(i + 1)}</b>`;
      if (ok === true || ok === false) return null;
      return '<i class="sg-dot"></i>';
    },

    badge(i) {
      return pad2(i + 1);
    },
  });
})();
