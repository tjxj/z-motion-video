/* 漫画分镜 comic
 * 彩色漫画 / 条漫：粗黑分镜格、旁白框、对话/思考/爆炸气泡、拟声字、速度线、网点与原创 SVG 角色。
 */
(() => {
  'use strict';
  const { cl, lerp, EZ, rng, esc, rich, plain, pad2 } = MV.util;
  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
  const norm = (it, key = 'text') => (it == null ? {} : typeof it === 'object' ? it : { [key]: String(it) });
  const lines = v => arr(v).flatMap(s => String(s).split('\n')).filter(s => s.trim() !== '');

  // ───────────── 自定义漫画动效 ─────────────
  MV.kinds.comicPop = {
    f(el, p, o) {
      const e = EZ.back(p);
      const f0 = o.from ?? 0.52;
      const rot = (o.rot ?? -4) * (1 - e);
      el.style.opacity = cl(p * 3.5).toFixed(4);
      el.style.scale = (f0 + (1 - f0) * e).toFixed(4);
      el.style.rotate = `${rot.toFixed(2)}deg`;
    },
  };
  MV.kinds.comicSlam = {
    f(el, p, o) {
      if (p <= 0) { el.style.opacity = 0; return; }
      let s;
      if (p < 0.42) s = lerp(o.from ?? 1.42, 0.94, EZ.i2(p / 0.42));
      else if (p < 0.72) s = lerp(0.94, 1.04, EZ.o2((p - 0.42) / 0.3));
      else s = lerp(1.04, 1, EZ.o2((p - 0.72) / 0.28));
      el.style.opacity = cl(p * 4).toFixed(4);
      el.style.scale = s.toFixed(4);
    },
  };
  MV.kinds.bubblePop = {
    f(el, p, o) {
      const e = EZ.back(p);
      el.style.opacity = cl(p * 4).toFixed(4);
      el.style.scale = (0.35 + 0.65 * e).toFixed(4);
      el.style.translate = `0 ${((1 - e) * (o.dist ?? 18)).toFixed(2)}px`;
    },
  };

  // ───────────── 漫画 SVG 图形库 ─────────────
  // 1) 放射状速度线（边缘聚向中心，中间留白保证文字清晰）
  function speedLinesSvg(opts = {}) {
    const seed = opts.seed ?? 17;
    const count = opts.count ?? 44;
    const color = opts.color ?? '#111111';
    const opacity = opts.opacity ?? 0.14;
    const inner = opts.inner ?? 0.34;
    const R = rng(seed);
    let paths = '';
    const cx = 500, cy = 500, rOut = 760;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (R() - 0.5) * 0.04;
      const spread = 0.008 + R() * 0.018;
      const rIn = (inner + R() * 0.16) * 500;
      const x1 = cx + Math.cos(a) * rIn;
      const y1 = cy + Math.sin(a) * rIn;
      const x2 = cx + Math.cos(a - spread) * rOut;
      const y2 = cy + Math.sin(a - spread) * rOut;
      const x3 = cx + Math.cos(a + spread) * rOut;
      const y3 = cy + Math.sin(a + spread) * rOut;
      paths += `<polygon points="${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x3.toFixed(1)},${y3.toFixed(1)}"/>`;
    }
    return `<svg class="cm-speed" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="${color}" fill-opacity="${opacity}">${paths}</g></svg>`;
  }

  // 2) 锯齿爆炸星形拟声字（SFX）
  function sfxHtml(text, opts = {}) {
    if (!text) return '';
    const fill = opts.fill || '#F2545B';
    const fg = opts.fg || '#FFD23F';
    const cls = opts.cls ? ' ' + opts.cls : '';
    const spikes = opts.spikes || 14;
    const R = rng(opts.seed ?? (text.length * 97 + 13));
    const pts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? 112 + (R() - 0.5) * 16 : 64 + (R() - 0.5) * 10;
      pts.push(`${(130 + Math.cos(a) * rad * 1.15).toFixed(1)},${(90 + Math.sin(a) * rad * 0.72).toFixed(1)}`);
    }
    const isAscii = /^[\x00-\x7f]+$/.test(text);
    const fs = isAscii ? (text.length > 5 ? 38 : 48) : (text.length > 3 ? 34 : 42);
    return `<div class="cm-sfx${cls}"><div class="cm-sfx-in">
      <svg class="cm-sfx-svg" viewBox="0 0 260 180" aria-hidden="true">
        <polygon points="${pts.join(' ')}" fill="#111" transform="translate(6,7)"/>
        <polygon points="${pts.join(' ')}" fill="${fill}" stroke="#111" stroke-width="6" stroke-linejoin="round"/>
      </svg>
      <span class="cm-sfx-tx${isAscii ? ' latin' : ''}" style="color:${fg};font-size:${fs}px">${esc(text)}</span>
    </div></div>`;
  }

  // 3) 漫画条码装饰（单行本封面刊头用）
  function barcodeSvg() {
    const widths = [3, 1.5, 4, 2, 1.5, 3.5, 2, 4, 1.5, 2.5, 3, 1.5, 4, 2];
    let x = 2, rects = '';
    widths.forEach((w, i) => {
      if (i % 2 === 0) rects += `<rect x="${x}" y="2" width="${w}" height="28" fill="#111"/>`;
      x += w + 1.5;
    });
    return `<svg class="cm-barcode" viewBox="0 0 ${Math.ceil(x + 2)} 38" aria-hidden="true">${rects}<text x="${(x / 2).toFixed(1)}" y="37" font-size="7" font-weight="900" font-family="monospace" text-anchor="middle" fill="#111">COMIC-01</text></svg>`;
  }

  // 4) 原创主角「小箱」（纸箱角色，5种表情：happy / shock / run / think / proud）
  function boxMascotSvg(mood = 'happy') {
    const lean = mood === 'run' ? 'rotate(-7 110 120)' : mood === 'shock' ? 'translate(0,-6)' : '';
    // 折耳
    const flaps = mood === 'shock'
      ? `<path d="M44 68 L14 26 L76 34 L88 68 Z" fill="#F6CE88"/><path d="M176 68 L206 26 L144 34 L132 68 Z" fill="#F6CE88"/>`
      : `<path d="M44 68 L18 44 L76 42 L88 68 Z" fill="#F6CE88"/><path d="M176 68 L202 44 L144 42 L132 68 Z" fill="#F6CE88"/>`;
    // 眼睛
    let eyes = '';
    if (mood === 'proud') {
      eyes = `<path d="M78 118 Q90 104 102 118" fill="none" stroke="#111" stroke-width="6.5" stroke-linecap="round"/>
              <path d="M126 118 Q138 104 150 118" fill="none" stroke="#111" stroke-width="6.5" stroke-linecap="round"/>`;
    } else if (mood === 'shock') {
      eyes = `<circle cx="90" cy="116" r="14" fill="#FFF" stroke="#111" stroke-width="5"/>
              <circle cx="90" cy="116" r="5" fill="#111"/>
              <circle cx="138" cy="116" r="14" fill="#FFF" stroke="#111" stroke-width="5"/>
              <circle cx="138" cy="116" r="5" fill="#111"/>`;
    } else if (mood === 'think') {
      eyes = `<ellipse cx="90" cy="116" rx="10" ry="12" fill="#FFF" stroke="#111" stroke-width="4.5"/>
              <circle cx="87" cy="111" r="4.5" fill="#111"/>
              <ellipse cx="138" cy="116" rx="10" ry="12" fill="#FFF" stroke="#111" stroke-width="4.5"/>
              <circle cx="135" cy="111" r="4.5" fill="#111"/>`;
    } else {
      eyes = `<ellipse cx="90" cy="116" rx="10.5" ry="12.5" fill="#FFF" stroke="#111" stroke-width="4.5"/>
              <circle cx="92" cy="116" r="5" fill="#111"/><circle cx="94" cy="112" r="2.2" fill="#FFF" stroke="none"/>
              <ellipse cx="138" cy="116" rx="10.5" ry="12.5" fill="#FFF" stroke="#111" stroke-width="4.5"/>
              <circle cx="140" cy="116" r="5" fill="#111"/><circle cx="142" cy="112" r="2.2" fill="#FFF" stroke="none"/>`;
    }
    // 嘴巴与表情线
    let mouth = `<path d="M101 136 Q114 152 127 136 Z" fill="#F2545B" stroke="#111" stroke-width="4.5" stroke-linejoin="round"/>`;
    let extra = '';
    if (mood === 'shock') {
      mouth = `<ellipse cx="114" cy="142" rx="10" ry="13" fill="#F2545B" stroke="#111" stroke-width="4.5"/>`;
      extra = `<path d="M24 22 L38 36 M196 22 L182 36 M110 10 L110 26" stroke="#F2545B" stroke-width="5.5" stroke-linecap="round"/>`;
    } else if (mood === 'think') {
      mouth = `<path d="M104 140 Q114 136 124 142" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"/>`;
      extra = `<circle cx="188" cy="30" r="14" fill="#FFD23F" stroke="#111" stroke-width="4.5"/>
               <text x="188" y="36" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="18" fill="#111">?</text>`;
    } else if (mood === 'run') {
      mouth = `<path d="M98 136 Q114 154 130 136 Z" fill="#F2545B" stroke="#111" stroke-width="4.5"/>
               <path d="M78 100 L102 106 M150 100 L126 106" stroke="#111" stroke-width="5" stroke-linecap="round"/>`;
      extra = `<path d="M6 106 H32 M0 132 H26 M10 156 H34" stroke="#3FA9F5" stroke-width="5.5" stroke-linecap="round"/>`;
    } else if (mood === 'proud') {
      mouth = `<path d="M98 134 Q114 152 130 134" fill="none" stroke="#111" stroke-width="5.5" stroke-linecap="round"/>`;
      extra = `<path d="M188 34 L193 46 L205 51 L193 56 L188 68 L183 56 L171 51 L183 46 Z" fill="#FFD23F" stroke="#111" stroke-width="3.5" stroke-linejoin="round"/>
               <path d="M28 46 L31 54 L39 57 L31 60 L28 68 L25 60 L17 57 L25 54 Z" fill="#3FA9F5" stroke="#111" stroke-width="3" stroke-linejoin="round"/>`;
    }
    // 手脚
    const limbs = mood === 'run'
      ? `<path d="M44 128 Q20 116 18 96" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/>
         <circle cx="18" cy="94" r="8" fill="#FFD23F" stroke="#111" stroke-width="4.5"/>
         <path d="M176 126 Q198 110 202 90" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/>
         <circle cx="202" cy="88" r="8" fill="#FFD23F" stroke="#111" stroke-width="4.5"/>
         <path d="M84 180 L64 202 M136 180 L164 198" stroke="#111" stroke-width="7" stroke-linecap="round"/>`
      : `<path d="M44 128 Q20 138 24 156" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/>
         <circle cx="24" cy="156" r="8" fill="#FFD23F" stroke="#111" stroke-width="4.5"/>
         <path d="M176 122 Q200 102 198 82" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/>
         <circle cx="198" cy="80" r="8" fill="#FFD23F" stroke="#111" stroke-width="4.5"/>
         <path d="M88 180 L84 204 M136 180 L140 204" stroke="#111" stroke-width="7" stroke-linecap="round"/>`;

    return `<svg class="cm-char-svg" viewBox="0 0 220 220" aria-hidden="true">
      <ellipse cx="112" cy="208" rx="64" ry="9" fill="#111" opacity="0.18"/>
      <g transform="${lean}">
        ${limbs}
        <g stroke="#111" stroke-width="5.5" stroke-linejoin="round">
          ${flaps}
          <!-- 箱身与投影边 -->
          <rect x="44" y="68" width="132" height="114" rx="14" fill="#E8AD57"/>
          <path d="M162 68 H168 Q176 68 176 76 V168 Q176 182 162 182 H152 V68 Z" fill="#D4913B" stroke="none"/>
          <rect x="44" y="68" width="132" height="114" rx="14" fill="none"/>
          <!-- 明黄胶带 -->
          <rect x="96" y="68" width="28" height="36" fill="#FFD23F"/>
          <!-- 小面单贴纸 -->
          <rect x="54" y="78" width="32" height="34" rx="4" fill="#FFF" stroke-width="3.5"/>
          <path d="M59 86 H81 M59 93 H81 M59 100 H74 M59 106 H81" stroke="#111" stroke-width="2.5"/>
        </g>
        <!-- 腮红 -->
        <ellipse cx="70" cy="132" rx="8" ry="4.5" fill="#F2545B" opacity="0.58"/>
        <ellipse cx="156" cy="132" rx="8" ry="4.5" fill="#F2545B" opacity="0.58"/>
        ${eyes}
        ${mouth}
        ${extra}
      </g>
    </svg>`;
  }

  // 5) 通用漫画助手（无 mascot 字段时使用，适配科普/教程/历史等任意题材）
  function sparkMascotSvg(mood = 'happy') {
    let eyes = `<ellipse cx="92" cy="112" rx="10" ry="13" fill="#FFF" stroke="#111" stroke-width="4.5"/>
                <circle cx="94" cy="112" r="5" fill="#111"/><circle cx="96" cy="108" r="2.2" fill="#FFF"/>
                <ellipse cx="132" cy="112" rx="10" ry="13" fill="#FFF" stroke="#111" stroke-width="4.5"/>
                <circle cx="134" cy="112" r="5" fill="#111"/><circle cx="136" cy="108" r="2.2" fill="#FFF"/>`;
    let mouth = `<path d="M98 134 Q112 150 126 134 Z" fill="#F2545B" stroke="#111" stroke-width="4.5" stroke-linejoin="round"/>`;
    if (mood === 'shock') {
      eyes = `<circle cx="92" cy="112" r="13" fill="#FFF" stroke="#111" stroke-width="5"/><circle cx="92" cy="112" r="4.5" fill="#111"/>
              <circle cx="132" cy="112" r="13" fill="#FFF" stroke="#111" stroke-width="5"/><circle cx="132" cy="112" r="4.5" fill="#111"/>`;
      mouth = `<ellipse cx="112" cy="140" rx="9" ry="12" fill="#F2545B" stroke="#111" stroke-width="4.5"/>`;
    } else if (mood === 'proud') {
      eyes = `<path d="M80 114 Q92 100 104 114" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/>
              <path d="M120 114 Q132 100 144 114" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/>`;
      mouth = `<path d="M98 134 Q112 150 126 134" fill="none" stroke="#111" stroke-width="5.5" stroke-linecap="round"/>`;
    } else if (mood === 'think') {
      mouth = `<path d="M102 138 Q112 134 122 140" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"/>`;
    }
    return `<svg class="cm-char-svg" viewBox="0 0 220 220" aria-hidden="true">
      <ellipse cx="112" cy="202" rx="56" ry="8" fill="#111" opacity="0.16"/>
      <!-- 背后漫画爆发光环 -->
      <polygon points="112,18 132,54 174,36 164,78 204,96 172,126 192,166 148,162 134,198 106,172 72,196 68,156 26,154 50,118 22,86 64,74 58,34 96,52"
               fill="#FFD23F" stroke="#111" stroke-width="5.5" stroke-linejoin="round"/>
      <!-- 内部圆脸核心 -->
      <circle cx="112" cy="118" r="56" fill="#3FA9F5" stroke="#111" stroke-width="5.5"/>
      <circle cx="112" cy="118" r="46" fill="#FFFFFF" stroke="#111" stroke-width="4"/>
      <!-- 腮红 -->
      <ellipse cx="78" cy="128" rx="7" ry="4" fill="#F2545B" opacity="0.55"/>
      <ellipse cx="146" cy="128" rx="7" ry="4" fill="#F2545B" opacity="0.55"/>
      ${eyes}
      ${mouth}
      <!-- 头顶小闪电 -->
      <polygon points="168,14 150,46 166,46 156,74 188,38 171,38" fill="#F2545B" stroke="#111" stroke-width="4" stroke-linejoin="round"/>
    </svg>`;
  }

  function mascotHtml(story, mood = 'happy', cls = '') {
    const isBox = story && story.mascot === 'box';
    const svg = isBox ? boxMascotSvg(mood) : sparkMascotSvg(mood);
    return `<div class="cm-char${cls ? ' ' + cls : ''}"><div class="cm-char-in">${svg}</div></div>`;
  }

  // 气泡尾巴 SVG
  function tailSvg(dir = 'right') {
    if (dir === 'down') {
      return `<svg class="cm-tail t-d" viewBox="0 0 64 42" aria-hidden="true">
        <path d="M10 0 L32 36 L54 0" fill="#111" transform="translate(5,5)"/>
        <path d="M10 0 L32 36 L54 0 Z" fill="#FFF" stroke="#111" stroke-width="5.5" stroke-linejoin="round"/>
        <rect x="6" y="-5" width="52" height="10" fill="#FFF"/>
      </svg>`;
    }
    if (dir === 'down-right') {
      return `<svg class="cm-tail t-dr" viewBox="0 0 64 44" aria-hidden="true">
        <path d="M8 0 L54 38 L34 0" fill="#111" transform="translate(5,5)"/>
        <path d="M8 0 L52 36 L34 0 Z" fill="#FFF" stroke="#111" stroke-width="5.5" stroke-linejoin="round"/>
        <rect x="4" y="-5" width="36" height="10" fill="#FFF"/>
      </svg>`;
    }
    if (dir === 'down-left') {
      return `<svg class="cm-tail t-dl" viewBox="0 0 64 44" aria-hidden="true">
        <path d="M56 0 L10 38 L30 0" fill="#111" transform="translate(5,5)"/>
        <path d="M56 0 L12 36 L30 0 Z" fill="#FFF" stroke="#111" stroke-width="5.5" stroke-linejoin="round"/>
        <rect x="24" y="-5" width="36" height="10" fill="#FFF"/>
      </svg>`;
    }
    if (dir === 'left') {
      return `<svg class="cm-tail t-l" viewBox="0 0 44 54" aria-hidden="true">
        <path d="M44 10 L4 28 L44 44" fill="#111" transform="translate(4,5)"/>
        <path d="M44 10 L4 28 L44 44 Z" fill="#FFF" stroke="#111" stroke-width="5.5" stroke-linejoin="round"/>
        <rect x="39" y="6" width="9" height="42" fill="#FFF"/>
      </svg>`;
    }
    return `<svg class="cm-tail t-r" viewBox="0 0 44 54" aria-hidden="true">
      <path d="M0 10 L40 28 L0 44" fill="#111" transform="translate(5,5)"/>
      <path d="M0 10 L40 28 L0 44 Z" fill="#FFF" stroke="#111" stroke-width="5.5" stroke-linejoin="round"/>
      <rect x="-4" y="6" width="9" height="42" fill="#FFF"/>
    </svg>`;
  }

  // ───────────── 样式定义 ─────────────
  const CHAP_THEMES = [
    { tone: 'blue', bg: '#3FA9F5', vars: { '--accent': '#F2545B', '--hl': '#FFD23F', '--on-accent': '#FFFFFF' } },
    { tone: 'yellow', bg: '#FFD23F', vars: { '--accent': '#F2545B', '--hl': '#F2545B', '--on-accent': '#FFFFFF' } },
  ];

  MV.style({
    // 默认推格切页；进入 chapter 页用彩色斜条扫幕
    transition: {
      kind: 'push',
      dur: 0.48,
      dirs: ['left', 'up'],
      panels: [
        { c: '#111111', w: 0.14 },
        { c: '#FFD23F', w: 0.42 },
        { c: '#F2545B', w: 0.36 },
        { c: '#3FA9F5', w: 0.28 },
        { c: '#111111', w: 0.14 },
      ],
      skew: 14,
      sw: 0.5,
    },
    motion: {
      kicker: { kind: 'slideX', d: 0.42, gap: 0, o: { dist: -48 } },
      title: { kind: 'comicPop', d: 0.52, stagger: 0.07, gap: 0.1, o: { from: 0.65, rot: -3 } },
      big: { kind: 'comicSlam', d: 0.55, stagger: 0.1, gap: 0.12, o: { from: 1.38 } },
      text: { kind: 'bubblePop', d: 0.46, gap: 0.25, o: { dist: 16 } },
      item: { kind: 'slideX', d: 0.44, stagger: 0.06, gap: 0.35, o: { dist: -54 } },
      card: { kind: 'comicPop', d: 0.48, stagger: 0.08, gap: 0.32, o: { from: 0.58, rot: -2.5 } },
      chip: { kind: 'comicPop', d: 0.38, stagger: 0.06, gap: 0.2, o: { from: 0.4, rot: 5 } },
      image: { kind: 'comicPop', d: 0.56, gap: 0.25, o: { from: 0.72, rot: -2 } },
      bar: { kind: 'slideX', d: 0.35, gap: 0.3, o: { dist: -36 } },
      grow: { kind: 'grow', d: 0.78, o: { ease: EZ.o4 } },
      quote: { kind: 'bubblePop', d: 0.56, stagger: 0.14, gap: 0.18 },
      note: { kind: 'rise', d: 0.45, gap: 0.3 },
      stamp: { kind: 'stamp', d: 0.48, gap: 0.25 },
      line: { kind: 'draw', d: 0.48 },
    },
    focus: true,
    subMax: { r34: 16, r916: 14, r169: 24 },
    mediaFrame: 'plain',
    kenBurns: 0.025,
    quoteMark: '“',

    // 配色与章节转场
    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'light') return { tone: 'light' };
      if (d.bg === 'yellow' || t === 'ending') {
        return { tone: 'yellow', bg: '#FFD23F', vars: { '--accent': '#F2545B', '--hl': '#F2545B' } };
      }
      if (d.bg === 'blue') {
        return { tone: 'blue', bg: '#3FA9F5', vars: { '--accent': '#FFD23F', '--hl': '#FFD23F' } };
      }
      if (t === 'chapter') {
        const th = CHAP_THEMES[Math.max(0, (o.sc.chap || 1) - 1) % CHAP_THEMES.length];
        return { tone: th.tone, bg: th.bg, vars: th.vars, trans: 'wipe' };
      }
      return { tone: 'light' };
    },

    // 漫画纸底：暖白漫画纸 + 四角 Ben-Day 网点 + 轻微纸张颗粒
    paint(g, W, H, R, u) {
      g.fillStyle = '#FFFDF5';
      g.fillRect(0, 0, W, H);

      // 微妙的漫画原稿浅蓝参考外框（极淡，烘托纸张质感）
      g.strokeStyle = 'rgba(63, 169, 245, 0.13)';
      g.lineWidth = 2;
      g.strokeRect(24, 24, W - 48, H - 48);

      // 顶部右上角与左下角 Ben-Day 彩色漫画网点渐变
      const drawDots = (cx, cy, maxR, step, col) => {
        g.fillStyle = col;
        for (let y = Math.max(0, cy - maxR); y < Math.min(H, cy + maxR); y += step) {
          const row = Math.round(y / step);
          for (let x = Math.max(0, cx - maxR); x < Math.min(W, cx + maxR); x += step) {
            const ox = (row % 2) * (step * 0.5);
            const dist = Math.hypot(x + ox - cx, y - cy);
            if (dist > maxR) continue;
            const rad = (1 - dist / maxR) * (step * 0.28);
            if (rad < 0.9) continue;
            g.beginPath();
            g.arc(x + ox, y, rad, 0, Math.PI * 2);
            g.fill();
          }
        }
      };
      drawDots(W * 0.92, H * 0.08, Math.min(W, H) * 0.42, 16, 'rgba(63, 169, 245, 0.14)');
      drawDots(W * 0.08, H * 0.92, Math.min(W, H) * 0.38, 16, 'rgba(255, 210, 63, 0.24)');

      // 极轻复古印刷纸噪点
      u.noise(5, 73);
    },

    // 页眉页脚：漫画连载刊头标 + 斜切页码贴片 + 底部漫画分格进度条
    chrome(c) {
      const top = c.h('div', 'cm-top');
      const left = c.h('div', 'cm-top-l');
      const ep = c.h('span', 'cm-ep', 'CH.01');
      const ser = c.h('span', 'cm-ser', c.esc(c.plain(c.story.series || c.story.title || 'COMIC')));
      left.append(ep, ser);
      const pg = c.h('div', 'cm-pg');
      top.append(left, pg);

      // 底部：左署名、右小节、中间/下方分格进度槽
      const foot = c.h('div', 'cm-foot');
      const by = c.h('span', 'cm-by', c.esc(c.plain(c.story.byline || '')));
      const sec = c.h('span', 'cm-sec');
      foot.append(by, sec);

      const prog = c.h('div', 'cm-prog');
      const fill = c.h('i', 'cm-prog-fill');
      const ticks = c.h('div', 'cm-prog-ticks');
      const nTicks = Math.min(20, Math.max(2, c.scenes.length));
      for (let k = 1; k < nTicks; k++) {
        const tk = c.h('span');
        tk.style.left = `${((k / nTicks) * 100).toFixed(2)}%`;
        ticks.appendChild(tk);
      }
      prog.append(fill, ticks);

      c.el.append(top, foot, prog);

      let last = '';
      return info => {
        const key = `${info.i}:${info.cover ? 1 : 0}`;
        if (key !== last) {
          last = key;
          ep.textContent = info.chap > 0 ? `EP.${pad2(info.chap)}` : 'VOL.01';
          pg.textContent = `P.${info.page} / ${info.total}`;
          sec.textContent = info.cover ? '' : (info.section || '');
        }
        fill.style.scale = `${c.cl(info.progress).toFixed(4)} 1`;
      };
    },

    // 漫画步骤/时间线连线：粗黑折线/直箭头
    link(x1, y1, x2, y2, o) {
      const f = v => v.toFixed(1);
      return `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} ` + o.arrowHead(x1, y1, x2, y2, 16, 0.52);
    },

    // 列表标记：漫画圆角黑框徽章 / 星标
    marker(mode, i, ok) {
      if (mode === 'number') return `<b class="cm-mk-n">${pad2(i + 1)}</b>`;
      if (ok === true) return '<b class="cm-mk-ok">✓</b>';
      if (ok === false) return '<b class="cm-mk-no">✕</b>';
      return '<b class="cm-mk-star">★</b>';
    },

    // 步骤编号：STEP 01 漫画标
    badge(i) {
      return `<small class="cm-step-lbl">STEP</small><span class="cm-step-n">${pad2(i + 1)}</span>`;
    },

    // 持续确定性微动：拟声字正弦微抖 + 角色轻呼吸弹跳
    tick(t, o) {
      const sc = o.sc;
      if (!sc || !sc.el) return;
      const sfxs = sc.el.querySelectorAll('.cm-sfx-in');
      sfxs.forEach((el, idx) => {
        const ang = Math.sin(t * 11 + idx * 1.9) * 2.6;
        const scv = 1 + Math.sin(t * 6.5 + idx) * 0.035;
        el.style.transform = `rotate(${ang.toFixed(2)}deg) scale(${scv.toFixed(4)})`;
      });
      const chars = sc.el.querySelectorAll('.cm-char-in');
      chars.forEach((el, idx) => {
        const dy = Math.sin(t * 4.2 + idx * 1.3) * 5;
        const rot = Math.sin(t * 2.8 + idx) * 1.6;
        el.style.transform = `translateY(${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
      });
    },

    // ───────────── 漫画专属模板重写 ─────────────
    templates: {
      // 1) 漫画单行本封面
      cover(d, api) {
        const root = api.root;
        root.classList.add('cm-cover', d.layout === 'split' ? 'cm-cov-split' : 'cm-cov-burst');
        const mastText = d.kicker || api.story.series || 'COMIC SPECIAL';
        const volText = d.vol || 'VOL.01';
        const sfxText = d.sfx === false ? null : (d.sfx || (api.story.mascot === 'box' ? 'GO!' : 'POW!'));

        // 左列（16:9）/ 上部（3:4 & 9:16）：刊头 + 大标题横幅 + 对话气泡 + 标签
        const leftCol = api.add(root, 'div', 'cm-cov-head');

        // 刊头条
        const mast = api.add(leftCol, 'div', 'cm-cov-mast');
        api.add(mast, 'span', 'cm-cov-vol', esc(volText));
        api.add(mast, 'span', 'cm-cov-series', rich(mastText));
        api.add(mast, 'span', 'cm-cov-code', barcodeSvg());
        api.beat(mast, 'kicker', d.kickerAt);

        // 超大漫画标题框
        if (d.title) {
          const tbox = api.add(leftCol, 'div', 'cm-cov-tbox');
          const h1 = api.add(tbox, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const tb = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = tb;
          api.marks(h1, tb);
          api.fitTitle(h1);
          api.beat(tbox, 'card', d.titleAt, { d: 0.45, gap: 0 });
        }

        // 主视觉爆炸大格（3:4 / 9:16 在中下部，16:9 在右侧）
        const splash = api.add(root, 'div', 'cm-cov-splash cm-panel');
        splash.insertAdjacentHTML('beforeend', speedLinesSvg({ seed: 31, count: 48, color: '#111', opacity: 0.14, inner: 0.28 }));
        api.add(splash, 'div', 'cm-halftone-corner');

        if (d.image) {
          const imgWrap = api.add(splash, 'div', 'cm-cov-imgwrap');
          api.media(d.image, { parent: imgWrap, frame: d.frame || 'plain', at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
        } else {
          const hero = api.add(splash, 'div', 'cm-cov-hero', mascotHtml(api.story, d.mood || 'happy', 'cm-hero-mascot'));
          api.beat(hero, 'big', d.imageAt ?? '0.25s', { kind: 'comicPop', d: 0.6, o: { from: 0.45, rot: -6 } });
        }

        if (sfxText) {
          const sfxEl = api.add(splash, 'div', 'cm-cov-sfx', sfxHtml(sfxText, { fill: '#F2545B', fg: '#FFD23F', seed: 101 }));
          api.beat(sfxEl, 'chip', null, { kind: 'comicPop', d: 0.45, gap: 0.12, o: { from: 0.25, rot: 12 } });
        }

        // 副标题对话气泡：3:4/9:16 放进 splash，16:9 放进 leftCol
        const subHost = api.land ? leftCol : splash;
        if (d.sub ?? d.dek) {
          const bub = api.add(subHost, 'div', 'cm-bubble cm-cov-bub');
          api.add(bub, 'div', 'cm-bub-tx', rich(d.sub ?? d.dek));
          bub.insertAdjacentHTML('beforeend', tailSvg(api.rc === 'r916' ? 'down' : 'right'));
          const sb = api.beat(bub, 'text', d.subAt, { auto: d.sub ?? d.dek });
          api.marks(bub, sb);
        }

        // 标签贴纸栏 + meta
        const tags = arr(d.tags ?? d.chips);
        if (tags.length || d.meta) {
          const foot = api.add(api.land ? leftCol : root, 'div', 'cm-cov-foot');
          if (tags.length) {
            const box = api.add(foot, 'div', 'chips');
            const els = tags.map((c, i) => api.add(box, 'span', 'chip' + (d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i)) ? ' hot' : ''), rich(c)));
            api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
          }
          if (d.meta) {
            const m = api.add(foot, 'div', 'meta', rich(d.meta));
            api.beat(m, 'text', d.metaAt);
          }
        }
      },

      // 2) 漫画回目扉页
      chapter(d, api) {
        const root = api.root;
        root.classList.add('cm-chapter');
        const panel = api.add(root, 'div', 'cm-chap-panel cm-panel');
        panel.insertAdjacentHTML('beforeend', speedLinesSvg({ seed: 40 + api.sc.i * 7, count: 46, color: '#111', opacity: 0.12, inner: 0.3 }));

        const n = d.num ?? pad2(api.sc.chapNo || 1);
        const topRow = api.add(panel, 'div', 'cm-chap-top');
        if (n !== false && n !== '') {
          const badge = api.add(topRow, 'div', 'cm-chap-badge', `<span class="cm-chap-ep">EPISODE</span><span class="chap-num">${esc(n)}</span>`);
          api.beat(badge, 'big', d.numAt);
        }
        const sfxText = d.sfx === false ? null : (d.sfx || 'NEXT!');
        if (sfxText) {
          const sfx = api.add(topRow, 'div', 'cm-chap-sfx', sfxHtml(sfxText, { fill: '#F2545B', fg: '#FFD23F', seed: 55 + api.sc.i }));
          api.beat(sfx, 'chip', null, { gap: 0.08 });
        }

        // 标题白底粗黑框爆炸横幅
        const mid = api.add(panel, 'div', 'cm-chap-mid');
        if (d.title) {
          const tbox = api.add(mid, 'div', 'cm-chap-tbox');
          const h1 = api.add(tbox, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const tb = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = tb;
          api.marks(h1, tb);
          api.fitTitle(h1);
          api.beat(tbox, 'card', d.titleAt, { gap: 0 });
        }

        // 底部：黄色旁白框 + 奔跑/打气角色
        const bot = api.add(panel, 'div', 'cm-chap-bot');
        if (d.note || d.sub) {
          const nt = api.add(bot, 'div', 'cm-caption cm-chap-note', rich(d.note || d.sub));
          const nb = api.beat(nt, 'note', d.noteAt, { auto: d.note || d.sub });
          api.marks(nt, nb);
        }
        const ch = api.add(bot, 'div', 'cm-chap-char', mascotHtml(api.story, d.mood || 'run'));
        api.beat(ch, 'image', null, { kind: 'comicPop', d: 0.5, gap: 0.1 });
      },

      // 3) 一句话金句：漫画大特写格 + 超大对话气泡 + 角色发言
      statement(d, api) {
        const root = api.root;
        root.classList.add('cm-statement');
        api.head();
        const stage = api.add(root, 'div', 'cm-stmt-panel cm-panel');
        stage.insertAdjacentHTML('beforeend', speedLinesSvg({ seed: 77 + api.sc.i, count: 40, color: '#3FA9F5', opacity: 0.18, inner: 0.36 }));

        const sfxText = d.sfx === false ? null : (d.sfx || 'BAM!');
        if (sfxText) {
          const sfx = api.add(stage, 'div', 'cm-stmt-sfx', sfxHtml(sfxText, { fill: '#3FA9F5', fg: '#FFD23F', seed: 88 + api.sc.i }));
          api.beat(sfx, 'chip', null, { gap: 0.08 });
        }

        const bub = api.add(stage, 'div', 'cm-bubble cm-stmt-bub');
        const ls = lines(d.text ?? d.lines);
        if (ls.length) {
          const box = api.add(bub, 'div', 'say');
          ls.forEach((l, i) => {
            const e = api.add(box, 'div', 'sl', rich(l));
            const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, gap: 0.16, kind: 'comicPop', d: 0.48 });
            api.marks(e, b);
          });
        }
        bub.insertAdjacentHTML('beforeend', tailSvg(api.land ? 'left' : 'down-right'));

        const charEl = api.add(stage, 'div', 'cm-stmt-char', mascotHtml(api.story, d.mood || 'happy'));
        api.beat(charEl, 'image', null, { kind: 'comicPop', d: 0.48, gap: 0.05 });

        api.note(root, d.note, d.noteAt);
      },

      // 4) 大数字：放射速度线重击格 + 对话气泡解说
      bignum(d, api) {
        const root = api.root;
        root.classList.add('cm-bignum');
        api.head();

        const panel = api.add(root, 'div', 'cm-bn-panel cm-panel');
        panel.insertAdjacentHTML('beforeend', speedLinesSvg({ seed: 91 + api.sc.i, count: 52, color: '#111', opacity: 0.16, inner: 0.3 }));

        const sfxText = d.sfx === false ? null : (d.sfx || 'WOW!');
        if (sfxText) {
          const sfx = api.add(panel, 'div', 'cm-bn-sfx', sfxHtml(sfxText, { fill: '#F2545B', fg: '#FFD23F', seed: 92 + api.sc.i }));
          api.beat(sfx, 'chip', null, { gap: 0.05 });
        }

        const bn = api.add(panel, 'div', 'bn');
        const row = api.add(bn, 'div', 'bn-row');
        const v = d.value ?? d.num;
        const { val } = api.num(row, v);
        if (d.unit) api.add(row, 'span', 'bn-u', rich(d.unit));
        api.fitBox(row);
        api.beat(row, 'big', d.valueAt, { auto: d.value != null ? String(d.value) : null, with: val ? [[val, 'count', 0]] : [] });

        // 底部对话条：小角色 + 对话气泡讲出 label
        if (d.label) {
          const talk = api.add(root, 'div', 'cm-bn-talk');
          const ch = api.add(talk, 'div', 'cm-bn-char', mascotHtml(api.story, d.mood || 'shock'));
          api.beat(ch, 'image', null, { kind: 'comicPop', d: 0.45, gap: 0.06 });
          const bub = api.add(talk, 'div', 'cm-bubble cm-bn-bub');
          const l = api.add(bub, 'div', 'bn-l', rich(d.label));
          bub.insertAdjacentHTML('beforeend', tailSvg('left'));
          const b = api.beat(bub, 'text', d.labelAt, { auto: d.label });
          api.marks(l, b);
        }
        api.note(root, d.note, d.noteAt);
      },

      // 5) 左右对比：红蓝漫画对决分镜 + 爆炸 VS + 胜出贴片 + 呐喊结论横幅
      compare(d, api, base) {
        base(d, api);
        const root = api.root;
        root.classList.add('cm-compare');
        const vs = root.querySelector('.vs');
        if (vs) {
          const txt = vs.textContent || 'VS';
          vs.innerHTML = sfxHtml(txt, { fill: '#F2545B', fg: '#FFD23F', spikes: 12, seed: 202, cls: 'cm-vs-sfx' });
        }
        const win = root.querySelector('.side.win');
        if (win) {
          api.add(win, 'div', 'cm-win-tag', 'WIN!');
        }
      },

      // 6) 引用：漫画云朵思考气泡 + 角色思考 + 黑底黄字名牌
      quote(d, api) {
        const root = api.root;
        root.classList.add('cm-quote');
        api.head();
        const panel = api.add(root, 'div', 'cm-qt-panel cm-panel');
        panel.insertAdjacentHTML('beforeend', speedLinesSvg({ seed: 123, count: 32, color: '#3FA9F5', opacity: 0.14, inner: 0.4 }));

        const cloud = api.add(panel, 'div', 'cm-thought qt');
        const mk = api.quoteMark();
        if (mk) api.beat(api.add(cloud, 'div', 'qmark', mk), 'chip', d.markAt);
        const qt = api.add(cloud, 'div', 'q-text');
        const els = lines(d.text ?? d.quote).map(l => api.add(qt, 'div', 'ql', rich(l)));
        const b = api.beat(els, 'quote', d.textAt);
        els.forEach(e => api.marks(e, b));

        // 思考气泡三连小圆尾 + 角色 + 出处名牌
        const bot = api.add(panel, 'div', 'cm-qt-bot');
        api.add(bot, 'div', 'cm-thought-dots', '<i class="d1"></i><i class="d2"></i><i class="d3"></i>');
        const src = d.source ?? d.by ?? d.author;
        if (src) api.beat(api.add(bot, 'div', 'q-src', rich(src)), 'note', d.sourceAt, { auto: src });
        const ch = api.add(bot, 'div', 'cm-qt-char', mascotHtml(api.story, d.mood || 'think'));
        api.beat(ch, 'image', null, { kind: 'comicPop', d: 0.5, gap: 0.08 });
      },

      // 7) 步骤：连环画分镜格 + 拟声贴片
      steps(d, api, base) {
        base(d, api);
        const root = api.root;
        root.classList.add('cm-steps');
        if (d.sfx) {
          const hd = root.querySelector('.head');
          if (hd) {
            hd.classList.add('has-sfx');
            const sfx = api.add(hd, 'div', 'cm-head-sfx', sfxHtml(d.sfx, { fill: '#F2545B', fg: '#FFD23F', seed: 303 }));
            api.beat(sfx, 'chip', null, { gap: 0.08 });
          }
        }
      },

      // 8) 条形图：速度线漫画大面板 + 拟声贴片
      bars(d, api, base) {
        base(d, api);
        const root = api.root;
        root.classList.add('cm-bars');
        const box = root.querySelector('.bars');
        if (box) {
          box.classList.add('cm-panel');
          box.insertAdjacentHTML('afterbegin', speedLinesSvg({ seed: 404, count: 36, color: '#3FA9F5', opacity: 0.12, inner: 0.42 }));
        }
        if (d.sfx) {
          const hd = root.querySelector('.head');
          if (hd) {
            hd.classList.add('has-sfx');
            const sfx = api.add(hd, 'div', 'cm-head-sfx', sfxHtml(d.sfx, { fill: '#3FA9F5', fg: '#FFD23F', seed: 405 }));
            api.beat(sfx, 'chip', null, { gap: 0.08 });
          }
        }
      },

      // 9) 数据卡：3 项竖屏不规则漫画分镜（1 宽格 + 2 并排格）
      stats(d, api, base) {
        base(d, api);
        const box = api.root.querySelector('.stats');
        if (box && !api.land && box.children.length === 3) {
          box.classList.remove('rows');
          box.classList.add('cm-tri');
        }
      },

      // 10) 图片页：加漫画拟声贴片
      image(d, api, base) {
        base(d, api);
        if (d.sfx) {
          const hd = api.root.querySelector('.head');
          if (hd) {
            hd.classList.add('has-sfx');
            const sfx = api.add(hd, 'div', 'cm-head-sfx', sfxHtml(d.sfx, { fill: '#F2545B', fg: '#FFD23F', seed: 505 }));
            api.beat(sfx, 'chip', null, { gap: 0.08 });
          }
        }
      },

      // 11) 结尾页：漫画完结封底 TO BE CONTINUED...
      ending(d, api) {
        const root = api.root;
        root.classList.add('cm-ending');
        const panel = api.add(root, 'div', 'cm-end-panel cm-panel');
        panel.insertAdjacentHTML('beforeend', speedLinesSvg({ seed: 606, count: 52, color: '#111', opacity: 0.13, inner: 0.28 }));

        // 顶部 TO BE CONTINUED 箭头条
        const bar = api.add(panel, 'div', 'cm-tbc', `<span>▶ TO BE CONTINUED...</span>`);
        api.beat(bar, 'kicker', d.kickerAt);

        // 主体：左大对话气泡 + 右得意角色
        const mid = api.add(panel, 'div', 'cm-end-mid');
        const bub = api.add(mid, 'div', 'cm-bubble cm-end-bub');
        if (d.title) {
          const h1 = api.add(bub, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const tb = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = tb;
          api.marks(h1, tb);
          api.fitTitle(h1);
        }
        if (d.sub ?? d.dek) {
          const dk = api.add(bub, 'div', 'dek', rich(d.sub ?? d.dek));
          api.beat(dk, 'text', d.subAt);
        }
        bub.insertAdjacentHTML('beforeend', tailSvg(api.land ? 'right' : 'down-right'));

        const charWrap = api.add(mid, 'div', 'cm-end-char', mascotHtml(api.story, d.mood || 'proud'));
        api.beat(charWrap, 'big', null, { kind: 'comicPop', d: 0.55, gap: 0.06, o: { from: 0.45, rot: 5 } });

        const sfxText = d.sfx === false ? null : (d.sfx || 'FIN!');
        if (sfxText) {
          const sfx = api.add(panel, 'div', 'cm-end-sfx', sfxHtml(sfxText, { fill: '#F2545B', fg: '#FFD23F', seed: 607 }));
          api.beat(sfx, 'chip', null, { gap: 0.1 });
        }

        // 底部：标签贴纸 + 番茄红 CTA 呐喊横幅 + 署名
        const bot = api.add(panel, 'div', 'cm-end-bot');
        const tags = arr(d.tags ?? d.chips);
        if (tags.length) {
          const box = api.add(bot, 'div', 'chips');
          const els = tags.map((c, i) => api.add(box, 'span', 'chip' + (d.hot === i ? ' hot' : ''), rich(c)));
          api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
        }
        if (d.cta) {
          const c = api.add(bot, 'div', 'cta', rich(d.cta));
          const cb = api.beat(c, 'card', d.ctaAt, { auto: d.cta });
          api.marks(c, cb);
        }
        const by = d.byline ?? api.story.byline;
        if (by) api.beat(api.add(bot, 'div', 'meta byline', rich(by)), 'text', d.bylineAt);
      },
    },
  });
})();
