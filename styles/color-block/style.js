/* 撞色海报 color-block · 运动品牌 Campaign 街头海报版式语法 */
(() => {
  'use strict';
  const { cl, lerp, EZ, esc, rich, plain, pad2 } = MV.util;
  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
  const norm = (it, key = 'text') => (it == null ? {} : typeof it === 'object' ? it : { [key]: String(it) });
  const linesOf = v => arr(v).flatMap(s => String(s).split('\n')).filter(s => s.trim() !== '');
  const isHot = (d, i, it) => !!(it && it.on) || d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
  const focusOf = (d, api) => d.focus ?? !!api.style.focus;
  const nc = n => ' n' + Math.max(1, Math.min(n, 9));

  // ───── 自定义动效（冲、硬、快，只用独立属性，不覆盖静态 transform）─────
  MV.kinds.cbSlam = {
    f(el, p, o) {
      const e = EZ.o4(p);
      el.style.opacity = cl(p * 3.2).toFixed(4);
      el.style.scale = (1 + (1 - e) * (o.amt ?? 0.24)).toFixed(4);
      el.style.translate = `${((1 - e) * (o.dx ?? -28)).toFixed(1)}px ${((1 - e) * (o.dy ?? -18)).toFixed(1)}px`;
    },
  };
  MV.kinds.cbBanner = {
    f(el, p, o) {
      const e = EZ.o4(p);
      const dir = o.dir ?? (el.dataset.cbDir === 'r' ? 1 : -1);
      el.style.opacity = cl(p * 3.5).toFixed(4);
      el.style.translate = `${((1 - e) * dir * (o.dist ?? 110)).toFixed(1)}px 0`;
    },
  };
  MV.kinds.cbPunch = {
    f(el, p, o) {
      const e = EZ.back(p);
      el.style.opacity = cl(p * 3.5).toFixed(4);
      el.style.scale = (0.88 + 0.12 * e).toFixed(4);
      el.style.translate = `0 ${((1 - e) * (o.dist ?? 34)).toFixed(1)}px`;
    },
  };

  // ───── 五色运动撞色组合（每页 2~3 色硬切）─────
  const C = {
    ink: '#0D0D0F',
    white: '#FFFFFF',
    paper: '#F4F4EE',
    lime: '#E8FF3A',
    blue: '#2340F5',
    red: '#FF4A2E',
  };

  const PAL = {
    'ink-lime': {
      tone: 'ink', bg: C.ink, slab: C.lime, stripe: C.blue, edge: C.red,
      fg: C.white, fg2: 'rgba(255,255,255,.78)', fg3: 'rgba(255,255,255,.46)',
      accent: C.lime, hlfg: C.ink,
      card: C.white, cardFg: C.ink, cardFg2: 'rgba(13,13,15,.72)', bd: C.ink, sh: C.lime,
      bleed: 'rgba(232,255,58,.14)', bleedStroke: 'rgba(232,255,58,.32)',
    },
    'blue-lime': {
      tone: 'blue', bg: C.blue, slab: C.lime, stripe: C.ink, edge: C.red,
      fg: C.white, fg2: 'rgba(255,255,255,.84)', fg3: 'rgba(255,255,255,.52)',
      accent: C.lime, hlfg: C.ink,
      card: C.white, cardFg: C.ink, cardFg2: 'rgba(13,13,15,.74)', bd: C.ink, sh: C.ink,
      bleed: 'rgba(13,13,15,.18)', bleedStroke: 'rgba(232,255,58,.42)',
    },
    'lime-ink': {
      tone: 'lime', bg: C.lime, slab: C.ink, stripe: C.blue, edge: C.red,
      fg: C.ink, fg2: 'rgba(13,13,15,.76)', fg3: 'rgba(13,13,15,.46)',
      accent: C.blue, hlfg: C.white,
      card: C.white, cardFg: C.ink, cardFg2: 'rgba(13,13,15,.74)', bd: C.ink, sh: C.ink,
      bleed: 'rgba(13,13,15,.11)', bleedStroke: 'rgba(13,13,15,.26)',
    },
    'red-ink': {
      tone: 'red', bg: C.red, slab: C.ink, stripe: C.lime, edge: C.blue,
      fg: C.white, fg2: 'rgba(255,255,255,.88)', fg3: 'rgba(255,255,255,.55)',
      accent: C.lime, hlfg: C.ink,
      card: C.white, cardFg: C.ink, cardFg2: 'rgba(13,13,15,.74)', bd: C.ink, sh: C.ink,
      bleed: 'rgba(13,13,15,.16)', bleedStroke: 'rgba(255,255,255,.35)',
    },
    'white-blue': {
      tone: 'light', bg: C.paper, slab: C.blue, stripe: C.lime, edge: C.red,
      fg: C.ink, fg2: 'rgba(13,13,15,.72)', fg3: 'rgba(13,13,15,.44)',
      accent: C.blue, hlfg: C.white,
      card: C.white, cardFg: C.ink, cardFg2: 'rgba(13,13,15,.72)', bd: C.ink, sh: C.ink,
      bleed: 'rgba(35,64,245,.10)', bleedStroke: 'rgba(13,13,15,.16)',
    },
    'white-red': {
      tone: 'light', bg: C.paper, slab: C.red, stripe: C.lime, edge: C.ink,
      fg: C.ink, fg2: 'rgba(13,13,15,.72)', fg3: 'rgba(13,13,15,.44)',
      accent: C.red, hlfg: C.white,
      card: C.white, cardFg: C.ink, cardFg2: 'rgba(13,13,15,.72)', bd: C.ink, sh: C.ink,
      bleed: 'rgba(255,74,46,.12)', bleedStroke: 'rgba(13,13,15,.16)',
    },
  };

  // 用户手动 bg 别名兼容
  const BG_ALIAS = {
    ink: 'ink-lime', dark: 'ink-lime', black: 'ink-lime',
    blue: 'blue-lime', lime: 'lime-ink', yellow: 'lime-ink',
    red: 'red-ink', paper: 'white-blue', light: 'white-blue', white: 'white-blue',
    'white-red': 'white-red', 'white-blue': 'white-blue',
  };

  // 每种模板首选的撞色序列（剧烈切换但保证高可读）
  const TPL_PAL = {
    cover: ['ink-lime', 'blue-lime'],
    chapter: ['blue-lime', 'red-ink', 'lime-ink'],
    statement: ['lime-ink', 'red-ink', 'blue-lime'],
    bignum: ['blue-lime', 'red-ink', 'ink-lime'],
    list: ['white-blue', 'lime-ink', 'white-red'],
    bars: ['white-red', 'lime-ink', 'white-blue'],
    compare: ['lime-ink', 'blue-lime'],
    steps: ['lime-ink', 'white-blue', 'white-red'],
    cards: ['white-blue', 'white-red', 'lime-ink'],
    stats: ['ink-lime', 'white-blue', 'blue-lime'],
    timeline: ['white-blue', 'lime-ink', 'white-red'],
    quote: ['red-ink', 'blue-lime', 'ink-lime'],
    code: ['ink-lime'],
    formula: ['white-blue', 'lime-ink'],
    image: ['white-red', 'white-blue', 'ink-lime'],
    ending: ['ink-lime', 'blue-lime'],
    custom: ['white-blue', 'lime-ink'],
  };

  // 智能提取封面/背景的巨型裁切字（2~4字符最有视觉冲击力）
  function pickBleedText(d, sc) {
    if (d.bgText) return String(d.bgText).toUpperCase();
    const t = plain(d.title || d.text || d.value || '');
    const mNum = t.match(/\d+(?:\.\d+)?\s*(?:KM|K|%|年|天|步|个|件)?/i);
    if (mNum && mNum[0].replace(/\s/g, '').length <= 5) return mNum[0].replace(/\s/g, '').toUpperCase();
    const tags = arr(d.tags ?? d.chips);
    if (tags.length) {
      const tg = plain(tags[0]).replace(/^#/, '');
      if (tg.length >= 1 && tg.length <= 4) return tg.toUpperCase();
    }
    const clean = t.replace(/[，。！？、：；\s?!.,·\-—]/g, '');
    return clean.slice(0, 2) || pad2((sc ? sc.i : 0) + 1);
  }

  // 封面主视觉中间的主体：hero 写 runner 时画几何冲刺跑者，缺省画一枚和题材无关的爆炸星章
  const starPts = (n, ro, ri) => Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? ri : ro, a = Math.PI * i / n - Math.PI / 2;
    return (r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1);
  }).join(' ');
  const burstSvg = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">
          <circle cx="16" cy="16" r="180" fill="#0D0D0F" opacity="0.28"/>
          <circle r="180" fill="#0D0D0F" stroke="#FFFFFF" stroke-width="8"/>
          <polygon points="${starPts(12, 150, 96)}" fill="#E8FF3A" stroke="#0D0D0F" stroke-width="8"/>
          <circle r="62" fill="#FF4A2E" stroke="#0D0D0F" stroke-width="8"/>
          <polygon points="-44,-22 8,-22 8,-50 60,0 8,50 8,22 -44,22" fill="#FFFFFF" stroke="#0D0D0F" stroke-width="7" stroke-linejoin="round"/>
        </g>`;
  const RUNNER_LAND = `<!-- 极简几何冲刺跑者（纯黑粗轮廓+白高光）-->
        <g transform="translate(210, 120)">
          <!-- 投影 -->
          <g transform="translate(16,16)" fill="#0D0D0F" opacity="0.28">
            <circle cx="205" cy="64" r="44"/>
            <polygon points="150,126 244,126 196,296 106,282"/>
            <polygon points="184,274 282,360 226,482 178,464 222,374 146,316"/>
            <polygon points="128,274 44,368 -24,334 -2,292 48,314 102,248"/>
          </g>
          <!-- 头部 -->
          <circle cx="205" cy="64" r="44" fill="#0D0D0F" stroke="#FFFFFF" stroke-width="8"/>
          <!-- 躯干 -->
          <polygon points="150,126 244,126 196,296 106,282" fill="#0D0D0F" stroke="#FFFFFF" stroke-width="8"/>
          <!-- 前摆臂 -->
          <polygon points="214,152 318,176 346,120 384,138 342,226 198,196" fill="#FF4A2E" stroke="#0D0D0F" stroke-width="8"/>
          <!-- 后摆臂 -->
          <polygon points="150,148 72,188 26,154 0,192 66,242 162,190" fill="#FFFFFF" stroke="#0D0D0F" stroke-width="8"/>
          <!-- 前跨腿 -->
          <polygon points="184,274 294,354 236,486 184,464 232,370 146,314" fill="#0D0D0F" stroke="#FFFFFF" stroke-width="8"/>
          <!-- 后蹬腿 -->
          <polygon points="132,272 52,374 -26,338 -2,292 46,316 102,246" fill="#0D0D0F" stroke="#FFFFFF" stroke-width="8"/>
          <!-- 跑鞋荧光点 -->
          <polygon points="178,456 266,478 256,514 166,492" fill="#E8FF3A" stroke="#0D0D0F" stroke-width="8"/>
          <polygon points="-44,328 -2,286 24,312 -18,354" fill="#E8FF3A" stroke="#0D0D0F" stroke-width="8"/>
        </g>`;
  const RUNNER_PORT = `<!-- 极简几何冲刺人形 -->
      <g transform="translate(530, 14) scale(0.76)">
        <circle cx="215" cy="68" r="44" fill="#0D0D0F" stroke="#FFFFFF" stroke-width="9"/>
        <polygon points="156,130 254,130 202,304 110,290" fill="#0D0D0F" stroke="#FFFFFF" stroke-width="9"/>
        <polygon points="222,156 328,180 356,124 396,142 352,232 204,202" fill="#FF4A2E" stroke="#0D0D0F" stroke-width="9"/>
        <polygon points="156,154 78,194 32,160 4,198 72,248 168,196" fill="#FFFFFF" stroke="#0D0D0F" stroke-width="9"/>
        <polygon points="190,280 302,360 244,492 190,470 238,376 152,320" fill="#0D0D0F" stroke="#FFFFFF" stroke-width="9"/>
        <polygon points="136,278 54,380 -24,344 0,298 48,322 106,252" fill="#0D0D0F" stroke="#FFFFFF" stroke-width="9"/>
        <polygon points="184,462 278,486 266,524 172,500" fill="#E8FF3A" stroke="#0D0D0F" stroke-width="9"/>
        <polygon points="-42,334 2,292 28,318 -16,360" fill="#E8FF3A" stroke="#0D0D0F" stroke-width="9"/>
      </g>`;

  // 封面原创几何运动主视觉 SVG：跑道斜线 + 速度箭簇 + 中间主体（跑者或星章）
  function heroArtSvg(land, kind) {
    const runner = kind === 'runner';
    if (land) {
      return `<svg class="cb-hero-svg" viewBox="0 0 640 720" preserveAspectRatio="xMidYMid meet">
        <!-- 跑道斜线 -->
        <g stroke="#0D0D0F" stroke-width="14" stroke-linecap="square" opacity="0.92">
          <line x1="-20" y1="680" x2="420" y2="80"/>
          <line x1="70" y1="710" x2="510" y2="110"/>
          <line x1="160" y1="740" x2="600" y2="140"/>
        </g>
        <!-- 钴蓝速度块 -->
        <polygon points="90,560 580,290 610,360 120,630" fill="#2340F5" stroke="#0D0D0F" stroke-width="10"/>
        <!-- 番茄红箭头冲刺带 -->
        <g fill="#FF4A2E" stroke="#0D0D0F" stroke-width="8">
          <polygon points="40,180 140,180 180,235 140,290 40,290 80,235"/>
          <polygon points="155,180 255,180 295,235 255,290 155,290 195,235"/>
        </g>
        ${runner ? RUNNER_LAND : burstSvg(400, 360, 1)}
        <!-- 终点格纹小块 -->
        <g transform="translate(460, 560) rotate(-12)">
          <rect x="0" y="0" width="32" height="32" fill="#0D0D0F"/>
          <rect x="32" y="0" width="32" height="32" fill="#FFFFFF"/>
          <rect x="64" y="0" width="32" height="32" fill="#0D0D0F"/>
          <rect x="96" y="0" width="32" height="32" fill="#FFFFFF"/>
          <rect x="0" y="32" width="32" height="32" fill="#FFFFFF"/>
          <rect x="32" y="32" width="32" height="32" fill="#0D0D0F"/>
          <rect x="64" y="32" width="32" height="32" fill="#FFFFFF"/>
          <rect x="96" y="32" width="32" height="32" fill="#0D0D0F"/>
        </g>
      </svg>`;
    }
    // 竖屏 3:4 / 9:16 宽幅横贯冲刺主视觉
    return `<svg class="cb-hero-svg" viewBox="0 0 960 440" preserveAspectRatio="xMidYMid meet">
      <!-- 斜向赛道四道粗线 -->
      <g stroke="#0D0D0F" stroke-width="12" stroke-linecap="square" opacity="0.9">
        <line x1="-20" y1="390" x2="980" y2="170"/>
        <line x1="-20" y1="435" x2="980" y2="215"/>
        <line x1="60" y1="330" x2="640" y2="200" stroke-dasharray="36 22"/>
      </g>
      <!-- 钴蓝几何斜切速度条 -->
      <polygon points="30,270 530,155 552,226 52,340" fill="#2340F5" stroke="#0D0D0F" stroke-width="9"/>
      <!-- 三个番茄红极速箭簇 >>> -->
      <g fill="#FF4A2E" stroke="#0D0D0F" stroke-width="8">
        <polygon points="72,115 150,115 186,162 150,208 72,208 108,162"/>
        <polygon points="172,115 250,115 286,162 250,208 172,208 208,162"/>
        <polygon points="272,115 350,115 386,162 350,208 272,208 308,162"/>
      </g>
      ${runner ? RUNNER_PORT : burstSvg(700, 214, 0.9)}
      <!-- 终点格纹标 -->
      <g transform="translate(74, 342) rotate(-10)">
        <rect x="0" y="0" width="28" height="28" fill="#0D0D0F"/><rect x="28" y="0" width="28" height="28" fill="#FFFFFF"/>
        <rect x="56" y="0" width="28" height="28" fill="#0D0D0F"/><rect x="84" y="0" width="28" height="28" fill="#FFFFFF"/>
        <rect x="112" y="0" width="28" height="28" fill="#0D0D0F"/><rect x="140" y="0" width="28" height="28" fill="#FFFFFF"/>
        <rect x="0" y="28" width="28" height="28" fill="#FFFFFF"/><rect x="28" y="28" width="28" height="28" fill="#0D0D0F"/>
        <rect x="56" y="28" width="28" height="28" fill="#FFFFFF"/><rect x="84" y="28" width="28" height="28" fill="#0D0D0F"/>
        <rect x="112" y="28" width="28" height="28" fill="#FFFFFF"/><rect x="140" y="28" width="28" height="28" fill="#0D0D0F"/>
      </g>
    </svg>`;
  }

  // 注入整页斜切色块 + 背景出画大字装饰层（挂在 sc.el 下，不干扰 content 溢出判定）
  function addPosterBg(sc, api, opt = {}) {
    if (sc._cbBg) return sc._cbBg;
    const mode = opt.mode || sc.t;
    const bg = api.h('div', 'cb-bg cb-bg-' + mode);
    const s1 = api.h('div', 'cb-slab cb-slab-1');
    const s2 = api.h('div', 'cb-slab cb-slab-2');
    const s3 = api.h('div', 'cb-slab cb-slab-3');
    bg.append(s1, s2, s3);

    if (opt.bleed) {
      const bl = api.h('div', 'cb-bleed' + (opt.bleedCls ? ' ' + opt.bleedCls : ''), esc(opt.bleed));
      bg.appendChild(bl);
    }
    if (opt.vert) {
      const vt = api.h('div', 'cb-vert', esc(opt.vert));
      bg.appendChild(vt);
    }
    if (opt.stripes) {
      bg.appendChild(api.h('div', 'cb-slashes', '////////'));
    }
    sc.el.insertBefore(bg, sc.content);
    sc._cbBg = bg;
    return bg;
  }

  function makeChips(d, api, parent, list) {
    list = arr(list);
    if (!list.length) return null;
    const box = api.add(parent, 'div', 'chips');
    const els = list.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
    api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: list[0] });
    return box;
  }

  // 旋转圆形贴纸列表（由 tick(t) 按纯时间 t 轻微自转）
  const SPINNERS = [];

  MV.style({
    // 四色斜条呼啸擦除转场
    transition: {
      kind: 'wipe',
      dur: 0.5,
      skew: 16,
      sw: 0.5,
      panels: [
        { c: C.ink, w: 0.36 },
        { c: C.lime, w: 0.44 },
        { c: C.blue, w: 0.40 },
        { c: C.red, w: 0.34 },
      ],
    },
    motion: {
      kicker: { kind: 'wipe', d: 0.32, gap: 0 },
      title: { kind: 'cbSlam', d: 0.38, stagger: 0.06, gap: 0.08 },
      big: { kind: 'slam', d: 0.38, stagger: 0.09, gap: 0.08, o: { amt: 0.30 } },
      text: { kind: 'slideX', d: 0.38, gap: 0.22, o: { dist: -48 } },
      item: { kind: 'cbBanner', d: 0.36, stagger: 0.05, gap: 0.32, o: { dist: 110 } },
      card: { kind: 'cbPunch', d: 0.36, stagger: 0.06, gap: 0.28 },
      chip: { kind: 'pop', d: 0.30, stagger: 0.05, gap: 0.2, o: { from: 0.5 } },
      bar: { kind: 'slideX', d: 0.32, gap: 0.28, o: { dist: -60 } },
      grow: { kind: 'grow', d: 0.55, o: { ease: EZ.expo } },
      quote: { kind: 'cbSlam', d: 0.44, stagger: 0.12, gap: 0.15 },
      stamp: { kind: 'stamp', d: 0.38, gap: 0.2 },
      image: { kind: 'cbPunch', d: 0.42, gap: 0.22 },
      note: { kind: 'wipe', d: 0.4, gap: 0.28 },
    },
    focus: true,
    subMax: { r34: 15, r916: 13, r169: 24 },
    mediaFrame: 'plain',
    kenBurns: 0.03,
    quoteMark: '“',

    look(d, i, o) {
      const t = o.sc.t;
      let key = d.bg && (PAL[d.bg] ? d.bg : BG_ALIAS[d.bg]) ? (PAL[d.bg] ? d.bg : BG_ALIAS[d.bg]) : null;
      if (!key) {
        const list = TPL_PAL[t] || ['white-blue', 'lime-ink'];
        const n = o.scenes.slice(0, i).filter(s => s.t === t).length;
        key = list[n % list.length];
        const prev = i > 0 ? o.scenes[i - 1]._cbPal : null;
        if (prev && prev === key) {
          key = list.find(k => k !== prev) || (prev === 'white-blue' ? 'lime-ink' : 'white-blue');
        }
      }
      o.sc._cbPal = key;
      const p = PAL[key];
      return {
        tone: p.tone,
        bg: p.bg,
        accent: p.accent,
        cls: 'pal-' + key,
        vars: {
          '--fg': p.fg,
          '--fg2': p.fg2,
          '--fg3': p.fg3,
          '--hl': p.accent,
          '--hl-fg': p.hlfg,
          '--on-accent': p.hlfg,
          '--card-bg': p.card,
          '--card-fg': p.cardFg,
          '--card-fg2': p.cardFg2,
          '--card-bd': p.bd,
          '--line-strong': p.bd,
          '--bgc': p.bg,
          '--slab': p.slab,
          '--stripe': p.stripe,
          '--edge': p.edge,
          '--shadow': p.sh,
          '--bleed': p.bleed,
          '--bleed-stroke': p.bleedStroke,
        },
      };
    },

    // 极轻的丝网海报纸纹颗粒，保持高饱和纯色不发灰
    overlay(g, W, H, R, u) {
      g.fillStyle = '#FFFFFF';
      g.fillRect(0, 0, W, H);
      u.noise(10, 17);
    },

    // 顶部高速跑马灯 + 进度条 + 页码小节（9:16 自动移到顶部避免底部遮挡）
    chrome(c) {
      const tick = c.h('div', 'cb-tick');
      const inner = c.h('div', 'cb-tick-in');
      const rawParts = [c.story.series, c.story.title].filter(Boolean).map(s => c.esc(c.plain(s)));
      const unitTxt = (rawParts.length ? rawParts.join('<b>///</b>') : 'CAMPAIGN') + '<b>>>></b>';
      inner.innerHTML = Array.from({ length: 10 }, () => `<span>${unitTxt}</span>`).join('');
      tick.append(inner);

      const bar = c.h('div', 'cb-foot');
      const pg = c.h('div', 'cb-page');
      const sec = c.h('div', 'cb-sec');
      const prog = c.h('div', 'cb-prog');
      const pfill = c.h('i', 'cb-prog-fill');
      prog.appendChild(pfill);
      bar.append(pg, prog, sec);
      c.el.append(tick, bar);

      let uw = 0, last = '';
      return info => {
        if (!uw) uw = inner.firstChild ? inner.firstChild.offsetWidth : 1;
        const speed = c.land ? 125 : 105;
        inner.style.translate = `${(-((info.t * speed) % Math.max(1, uw))).toFixed(1)}px 0`;
        pfill.style.scale = `${c.cl(info.progress).toFixed(4)} 1`;
        const k = info.page + '|' + info.section + '|' + info.cover;
        if (k !== last) {
          last = k;
          pg.innerHTML = `${info.page}<small>/${info.total}</small>`;
          sec.textContent = info.cover ? (c.plain(c.story.series || '') || 'POSTER') : (info.section || '');
        }
      };
    },

    // 全局每帧持续动效：贴纸小幅弹性摆动（绝不倒转，纯 t 计算，确定性 100%）
    tick(t) {
      for (let i = 0; i < SPINNERS.length; i++) {
        const sp = SPINNERS[i];
        const base = sp._baseDeg || -8;
        const amp = sp._amp || 7;
        sp.style.rotate = `${(base + Math.sin(t * 2.2 + i * 1.3) * amp).toFixed(2)}deg`;
      }
    },

    link(x1, y1, x2, y2, o) {
      return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} ` + o.arrowHead(x1, y1, x2, y2, 20, 0.58);
    },

    marker(mode, i, ok) {
      if (mode === 'number') return `<b class="cb-num-mk">${pad2(i + 1)}</b>`;
      if (ok === true || ok === false) return null;
      return '<i class="cb-arrow-mk">▶</i>';
    },

    badge(i) {
      return `<span>${pad2(i + 1)}</span>`;
    },

    // ───── 核心模板彻底重写（海报级专属版式语法）─────
    templates: {
      // 1. 封面：三色斜切 + 出画巨字 + 几何冲刺主视觉 + 贴纸圆章 + 黑底通栏标签
      cover(d, api) {
        const layout = d.layout === 'split' ? 'split' : 'poster';
        api.sc.el.classList.add('cb-cover-' + layout);
        const bleedTxt = pickBleedText(d, api.sc);
        const bg = addPosterBg(api.sc, api, {
          mode: 'cover-' + layout,
          bleed: bleedTxt,
          bleedCls: 'cb-bleed-cover',
          vert: 'ISSUE // ' + pad2(api.sc.i + 1) + '  ///  ' + plain(d.vert || 'POSTER'),
        });

        // 封面主视觉（无 d.image 时画粗线条几何冲刺海报图）
        if (!d.image) {
          const hero = api.h('div', 'cb-hero-art', heroArtSvg(api.land, d.hero));
          bg.appendChild(hero);
          api.beat(hero, 'image', d.imageAt ?? '0.28s', { kind: 'cbPunch', d: 0.45 });
        }

        // 斜置圆形贴纸徽章（挂在 sc.el 装饰层，永不撑破 content）
        const badgeText = d.badge || (arr(d.tags ?? d.chips)[0] ? plain(arr(d.tags ?? d.chips)[0]).replace(/^#/, '') : 'GO!');
        const sticker = api.add(api.sc.el, 'div', 'cb-sticker cb-cover-sticker', `<b>${esc(badgeText.slice(0, 6))}</b>`);
        sticker._baseDeg = 10;
        sticker._spd = 12;
        SPINNERS.push(sticker);
        api.beat(sticker, 'stamp', d.tagsAt ?? '0.45s', { kind: 'stamp', d: 0.4 });

        // 内容区结构：16:9 左右分栏，3:4/9:16 上标题 + 中视觉窗 + 下底栏
        const grid = api.add(api.root, 'div', 'cb-cover-grid');
        const top = api.add(grid, 'div', 'cb-cover-top');
        api.head({ parent: top, big: true, sub: null });

        if (d.image) {
          const mediaWrap = api.add(grid, 'div', 'cb-cover-media');
          api.media(d.image, { parent: mediaWrap, frame: d.frame || 'plain', at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
        } else if (!api.land) {
          // 竖屏中段留出主视觉展示窗，让斜切色块和冲刺图形透出
          api.add(grid, 'div', 'cb-cover-window');
        }

        const bot = api.add(grid, 'div', 'cb-cover-bot');
        const subTxt = d.sub ?? d.dek;
        if (subTxt) {
          const sb = api.add(bot, 'div', 'cb-sub-bar', rich(subTxt));
          const b = api.beat(sb, 'text', d.subAt, { auto: subTxt });
          api.marks(sb, b);
        }
        makeChips(d, api, bot, d.tags ?? d.chips);
        if (d.meta) {
          const m = api.add(bot, 'div', 'meta', rich(d.meta));
          api.beat(m, 'text', d.metaAt);
        }
      },

      // 2. 章节页：巨型出画章节号 + 90° 竖排侧标 + 粗黑标题牌匾
      chapter(d, api) {
        const n = d.num ?? pad2(api.sc.chapNo || 1);
        const nStr = n !== false && n !== '' ? String(n) : '';
        addPosterBg(api.sc, api, {
          mode: 'chapter',
          bleed: nStr || 'CH',
          bleedCls: 'cb-bleed-chap',
          vert: nStr ? `CHAPTER // ${nStr}` : 'CHAPTER',
          stripes: true,
        });
        api.root.classList.add('center');
        const wrap = api.add(api.root, 'div', 'cb-chap-wrap');
        if (nStr) {
          const pill = api.add(wrap, 'div', 'cb-chap-tag', `<span>PART</span><b>${esc(nStr)}</b>`);
          api.beat(pill, 'kicker', d.numAt);
        }
        const plate = api.add(wrap, 'div', 'cb-chap-plate');
        api.head({ parent: plate, big: true });
        if (d.note) {
          const nt = api.add(wrap, 'div', 'cb-chap-note', rich(d.note));
          const b = api.beat(nt, 'note', d.noteAt, { auto: d.note });
          api.marks(nt, b);
        }
      },

      // 3. 一句话金句：交错撞色标语横条 + 背景速度斜线
      statement(d, api) {
        addPosterBg(api.sc, api, {
          mode: 'statement',
          bleed: pickBleedText(d, api.sc),
          bleedCls: 'cb-bleed-stmt',
          vert: 'STATEMENT ///',
          stripes: true,
        });
        api.root.classList.add('center');
        api.head();
        const ls = linesOf(d.text ?? d.lines);
        if (ls.length) {
          const box = api.add(api.root, 'div', 'say cb-say');
          ls.forEach((l, i) => {
            const e = api.add(box, 'div', 'sl cb-sl-' + (i % 2 ? 'alt' : 'main'), `<span class="cb-sl-box">${rich(l)}</span>`);
            const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, gap: 0.14 });
            api.marks(e, b);
          });
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // 4. 大数字：数字占满海报 + 描边叠影背景 + 斜置单位贴纸 + 底部通栏说明条
      bignum(d, api) {
        const rawV = d.value ?? d.num ?? '';
        addPosterBg(api.sc, api, {
          mode: 'bignum',
          bleed: String(rawV).slice(0, 6),
          bleedCls: 'cb-bleed-num',
          vert: d.unit ? `UNIT // ${plain(d.unit)}` : 'DATA // KEY',
          stripes: true,
        });
        api.root.classList.add('center');
        api.head();
        const bn = api.add(api.root, 'div', 'bn cb-bn');
        const stageRow = api.add(bn, 'div', 'bn-row cb-bn-row');
        const { val } = api.num(stageRow, rawV);
        if (d.unit) api.add(stageRow, 'span', 'bn-u cb-bn-unit', rich(d.unit));
        api.fitBox(stageRow);
        api.beat(stageRow, 'big', d.valueAt, {
          auto: rawV !== '' ? String(rawV) : null,
          with: val ? [[val, 'count', 0]] : [],
        });
        if (d.label) {
          const l = api.add(bn, 'div', 'bn-l cb-bn-bar', rich(d.label));
          const b = api.beat(l, 'text', d.labelAt, { auto: d.label });
          api.marks(l, b);
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // 5. 列表：一行一条全宽粗横幅，条与条交替高对比底色，奇偶双向冲入
      list(d, api) {
        const items = arr(d.items).map(it => norm(it));
        const mode = d.mode || (items.some(it => it.ok != null) ? 'check' : 'bullet');
        addPosterBg(api.sc, api, {
          mode: 'list',
          bleed: pad2(items.length),
          bleedCls: 'cb-bleed-side',
          vert: `LIST // ${pad2(items.length)} ITEMS`,
        });
        api.head();
        const ul = api.add(api.body(), 'ul', 'list cb-banners m-' + mode + nc(items.length));
        const cols = d.cols ?? (api.land && items.length >= 5 ? 2 : 1);
        ul.style.setProperty('--cols', cols);
        items.forEach((it, i) => {
          const ok = it.ok != null ? !!it.ok : mode === 'check' ? true : mode === 'cross' ? false : undefined;
          const hot = isHot(d, i, it);
          const toneCls = hot ? 'cb-ban-hot' : (i % 3 === 0 ? 'cb-ban-ink' : i % 3 === 1 ? 'cb-ban-white' : 'cb-ban-lime');
          const li = api.add(
            ul, 'li',
            `item cb-banner ${toneCls}` + (ok === true ? ' ok' : ok === false ? ' no' : '') + (hot ? ' on' : '')
          );
          li.dataset.cbDir = i % 2 === 0 ? 'l' : 'r';
          api.add(li, 'span', 'mk', api.marker(mode, i, ok));
          const tx = api.add(li, 'span', 'tx', rich(it.text ?? it.title));
          if (it.note) api.add(tx, 'span', 'nt', rich(it.note));
          const b = api.beat(li, 'item', it.at, { auto: it.text ?? it.title, spread: true, focus: focusOf(d, api) });
          api.marks(li, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 6. 条形图：粗壮色块柱 + 数值大到压出柱子边缘
      bars(d, api) {
        const items = arr(d.items).map(it => norm(it, 'label'));
        addPosterBg(api.sc, api, {
          mode: 'bars',
          bleed: 'DATA',
          bleedCls: 'cb-bleed-side',
          vert: 'METRICS /// CHART',
        });
        api.head();
        const vals = items.map(it => Math.abs(parseFloat(String(it.value ?? 0).replace(/,/g, ''))) || 0);
        const log = d.scale === 'log';
        const f = v => (log ? Math.log10(Math.max(v, 1)) : v);
        const mx = d.max != null ? f(+d.max) : Math.max(...vals.map(f), 1e-9);
        const box = api.add(api.body(), 'div', 'bars cb-bars' + (log ? ' log' : '') + nc(items.length));
        // 按最长数值+单位动态预留右侧大字空间，保证长数字（如 3000+年）不触发整页缩容
        const maxValLen = Math.max(1, ...items.map(it => plain(String(it.display ?? it.value ?? '') + (it.unit || '')).length));
        const barMax = api.land
          ? (maxValLen >= 6 ? 58 : maxValLen >= 4 ? 64 : 70)
          : (maxValLen >= 6 ? 48 : maxValLen >= 4 ? 56 : 64);
        const bvK = maxValLen >= 6 ? 0.78 : maxValLen >= 5 ? 0.88 : 1;
        box.style.setProperty('--bar-max', barMax + '%');
        box.style.setProperty('--bv-k', bvK.toFixed(2));
        items.forEach((it, i) => {
          const hot = isHot(d, i, it);
          const r = api.add(box, 'div', 'bar-row cb-bar-row' + (hot ? ' on' : '') + ' cb-bc-' + (i % 3));
          api.add(r, 'div', 'bar-l', rich(it.label));
          const tr = api.add(r, 'div', 'bar-track');
          const fill = api.add(tr, 'div', 'bar-fill');
          fill.style.setProperty('--w', cl(f(vals[i]) / mx, 0.08, 1).toFixed(4));
          const v = api.add(tr, 'div', 'bar-v');
          const { val } = api.num(v, it.display ?? it.value);
          if (it.unit) api.add(v, 'span', 'bar-u', rich(it.unit));
          const w = [[fill, 'grow', 0.05]];
          if (val) w.push([val, 'count', 0.05, { d: 0.7 }]);
          const b = api.beat(r, 'bar', it.at, { auto: it.label, spread: true, focus: focusOf(d, api), with: w });
          api.marks(r, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 7. 对比：整页左右（16:9）或上下（3:4/9:16）两种高饱和底色硬切 + 中心旋转 VS 贴纸
      compare(d, api) {
        api.sc.el.classList.add('cb-cmp-split', api.land ? 'cb-cmp-lr' : 'cb-cmp-tb');
        // 整页硬切双色背景
        const bg = api.h('div', 'cb-bg cb-bg-compare');
        bg.append(api.h('div', 'cb-cmp-half cb-cmp-half-a'), api.h('div', 'cb-cmp-half cb-cmp-half-b'));
        api.sc.el.insertBefore(bg, api.content);
        api.sc._cbBg = bg;

        api.head();
        const body = api.body();
        const g = api.add(body, 'div', 'cmp cb-cmp n2');
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
          if (s.win) api.add(el, 'div', 'cb-win-tag', 'WIN');
          return { el, head, val, pts, s };
        };
        const L = side(d.left || {}, 'left');
        const vs = api.add(g, 'div', 'vs cb-vs', esc(d.vs ?? 'VS'));
        vs._baseDeg = -8;
        vs._amp = 6;
        SPINNERS.push(vs);
        const Rt = side(d.right || {}, 'right');

        const run = (S, key) => {
          const b = api.beat(S.el, 'card', S.s.at ?? key, { auto: S.s.label, with: S.val ? [[S.val, 'count', 0.05]] : [] });
          api.marks(S.head, b);
          S.pts.forEach(({ li, pp }) => { const b2 = api.beat(li, 'item', pp.at, { auto: pp.text, spread: true, gap: 0.25 }); api.marks(li, b2); });
          return b;
        };
        run(L, d.leftAt);
        api.beat(vs, 'stamp', d.vsAt);
        const rb = run(Rt, d.rightAt);
        const win = L.s.win ? L.el : Rt.s.win ? Rt.el : null;
        if (d.verdict) {
          const v = api.add(body, 'div', 'verdict cb-verdict', rich(d.verdict));
          const b = api.beat(v, 'text', d.verdictAt, { auto: d.verdict, with: win ? [[win, 'mark', 0]] : [] });
          api.marks(v, b);
        } else if (win) (rb.opt.with = rb.opt.with || []).push([win, 'mark', 0.6]);
      },

      // 8. 步骤：赛道号码布平行四边形标牌 + 硬框色块卡 + 粗箭折线
      steps(d, api) {
        const items = arr(d.items).map(it => norm(it, 'title'));
        addPosterBg(api.sc, api, {
          mode: 'steps',
          bleed: 'STEP',
          bleedCls: 'cb-bleed-side',
          vert: `ACTION // ${pad2(items.length)} STEPS`,
        });
        api.head();
        const row = d.dir ? d.dir === 'row' : api.land && items.length <= 5;
        const box = api.add(api.body(), 'div', 'steps cb-steps ' + (row ? 'row' : 'col') + nc(items.length));
        const links = api.svg('svg', { class: 'links' });
        box.appendChild(links);
        const beats = [], badges = [];
        items.forEach((it, i) => {
          const st = api.add(box, 'div', 'step cb-step' + (isHot(d, i, it) ? ' on' : '') + (i % 2 ? ' alt' : ''));
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
            const a = api.rel(badges[i], box), c = api.rel(badges[i + 1], box), g = 10;
            const [x1, y1, x2, y2] = row ? [a.r + g, a.cy, c.x - g, c.cy] : [a.cx, a.b + g, c.cx, c.y - g];
            if (Math.hypot(x2 - x1, y2 - y1) < 10) continue;
            const p = api.svg('path', { d: api.link(x1, y1, x2, y2, i) });
            links.appendChild(p);
            (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.26 });
          }
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 9. 结尾：冲线海报（黑白格纹终点线 + 巨型 GO! 裁切字 + 荧光黄 CTA 粗框横幅）
      ending(d, api) {
        const bg = addPosterBg(api.sc, api, {
          mode: 'ending',
          bleed: 'GO!',
          bleedCls: 'cb-bleed-end',
          vert: 'FINISH /// LINE',
          stripes: true,
        });
        bg.appendChild(api.h('div', 'cb-checker cb-checker-top'));

        api.root.classList.add('center');
        api.head({ big: true });
        makeChips(d, api, api.root, d.tags ?? d.chips);
        if (d.cta) {
          const c = api.add(api.root, 'div', 'cta cb-cta', rich(d.cta));
          const b = api.beat(c, 'card', d.ctaAt, { auto: d.cta });
          api.marks(c, b);
        }
        const by = d.byline ?? api.story.byline;
        if (by) api.beat(api.add(api.root, 'div', 'meta byline cb-byline', rich(by)), 'text', d.bylineAt);
      },
    },

    // 给其余通用模板（stats, cards, timeline, quote, code, formula, image, custom）也注入斜切色块与巨字装饰
    decorate(sc, api) {
      if (sc._cbBg) return;
      const d = sc.d;
      const bleedMap = {
        stats: pad2(arr(d.items).length || 4),
        cards: pad2(arr(d.items).length || 4),
        timeline: 'TIME',
        quote: '“',
        code: '</>',
        formula: 'ƒ(x)',
        image: 'VIEW',
        custom: pad2(sc.i + 1),
      };
      addPosterBg(sc, api, {
        mode: sc.t,
        bleed: bleedMap[sc.t] || pad2(sc.i + 1),
        bleedCls: sc.t === 'quote' ? 'cb-bleed-quote' : 'cb-bleed-side',
        vert: `${sc.t.toUpperCase()} // ${pad2(sc.i + 1)}`,
        stripes: sc.t === 'stats',
      });
    },
  });
})();
