/* 手账拼贴 scrapbook · 旅行手账本版式语法、动效与翻页转场 */
(() => {
  'use strict';
  const { cl, EZ, esc, rich, plain, pad2 } = MV.util;
  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
  const norm = (it, key = 'text') => (it == null ? {} : typeof it === 'object' ? it : { [key]: String(it) });
  const lines = v => arr(v).flatMap(s => String(s).split('\n')).filter(s => s.trim() !== '');
  const isHot = (d, i, it) => !!(it && it.on) || d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
  const focusOf = (d, api) => d.focus ?? !!api.style.focus;
  const nc = n => ' n' + Math.max(1, Math.min(n, 9));

  // ───── 自定义动画（严格由进度 p 决定，无状态累加） ─────
  MV.kinds.scrapDrop = {
    f(el, p, o) {
      const e = EZ.back(p);
      const dist = o.dist ?? 52;
      const rot = o.rot ?? 5;
      el.style.opacity = cl(p * 3.2).toFixed(4);
      el.style.translate = `0 ${((1 - e) * -dist).toFixed(2)}px`;
      el.style.rotate = `${((1 - e) * rot).toFixed(2)}deg`;
      el.style.scale = (0.94 + 0.06 * EZ.o3(p)).toFixed(4);
    },
  };
  MV.kinds.tapeStick = {
    f(el, p, o) {
      const e = (o.ease || EZ.o3)(p);
      el.style.opacity = cl(p * 4.5).toFixed(4);
      el.style.scale = `${Math.max(0.001, e).toFixed(4)} 1`;
    },
  };
  MV.kinds.stickerPop = {
    f(el, p, o) {
      const e = EZ.back(p);
      const from = o.from ?? 0.52;
      const rot = o.rot ?? -8;
      el.style.opacity = cl(p * 3.5).toFixed(4);
      el.style.scale = (from + (1 - from) * e).toFixed(4);
      el.style.rotate = `${((1 - e) * rot).toFixed(2)}deg`;
    },
  };
  MV.kinds.postmarkStamp = {
    f(el, p) {
      if (p <= 0) { el.style.opacity = 0; return; }
      let s;
      if (p < 0.36) s = 1.9 - 0.96 * EZ.i2(p / 0.36);
      else if (p < 0.65) s = 0.94 + 0.08 * EZ.o2((p - 0.36) / 0.29);
      else s = 1.02 - 0.02 * EZ.o2((p - 0.65) / 0.35);
      el.style.opacity = cl(p / 0.2).toFixed(4);
      el.style.scale = s.toFixed(4);
    },
  };

  // ───── 自定义转场：翻手账页 ─────
  MV.transitions.journalFlip = {
    in(p) {
      const e = EZ.o4(p);
      const sh = (0.28 * Math.sin(Math.PI * cl(p))).toFixed(3);
      return {
        translate: `${((1 - e) * 102).toFixed(3)}% ${((1 - e) * 4).toFixed(3)}%`,
        rotate: `${((1 - e) * -2.6).toFixed(3)}deg`,
        boxShadow: p > 0.01 && p < 0.99 ? `-24px 0 64px rgba(72,52,32,${sh})` : '',
      };
    },
    out(p) {
      const e = EZ.io2(p);
      return {
        scale: (1 - 0.028 * e).toFixed(4),
        filter: p > 0.01 && p < 0.99 ? `brightness(${(1 - 0.09 * e).toFixed(4)})` : '',
      };
    },
  };

  // ───── 原创内联 SVG 装饰工具 ─────
  function postmarkSvg(topTxt, midTxt, botTxt, color = '#E05263') {
    const t1 = esc((topTxt || 'JOURNAL').slice(0, 10));
    const t2 = esc((midTxt || 'NOTE').slice(0, 6));
    const t3 = esc((botTxt || '★ ★ ★').slice(0, 10));
    return `<svg class="sb-pm-svg" viewBox="0 0 180 120" aria-hidden="true">
      <g stroke="${color}" fill="none" opacity="0.82">
        <path d="M98 34 Q112 27 126 34 T154 34 T176 34" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M102 52 Q116 45 130 52 T158 52 T176 52" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M102 70 Q116 63 130 70 T158 70 T176 70" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M98 88 Q112 81 126 88 T154 88 T176 88" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="58" cy="60" r="48" stroke-width="3"/>
        <circle cx="58" cy="60" r="40" stroke-width="1.6" stroke-dasharray="5 4"/>
        <line x1="16" y1="45" x2="100" y2="45" stroke-width="1.5"/>
        <line x1="16" y1="75" x2="100" y2="75" stroke-width="1.5"/>
      </g>
      <g fill="${color}" font-family="'MV Mono','MV Sans',sans-serif" font-weight="700" text-anchor="middle" opacity="0.88">
        <text x="58" y="38" font-size="11" letter-spacing="1.4">${t1}</text>
        <text x="58" y="65" font-size="16" font-family="'MV Fun','MV Hand',sans-serif">${t2}</text>
        <text x="58" y="90" font-size="10" letter-spacing="1.2">${t3}</text>
      </g>
    </svg>`;
  }

  function pushpinSvg(color = '#E05263', dark = '#B53848') {
    return `<svg class="sb-pin-svg" viewBox="0 0 44 44" aria-hidden="true">
      <ellipse cx="24" cy="34" rx="11" ry="5" fill="rgba(68,52,36,0.22)"/>
      <circle cx="22" cy="20" r="15" fill="${dark}"/>
      <circle cx="20.5" cy="18" r="13.5" fill="${color}"/>
      <ellipse cx="16" cy="13.5" rx="5" ry="3.2" transform="rotate(-28 16 13.5)" fill="rgba(255,255,255,0.62)"/>
      <circle cx="20.5" cy="18" r="4.5" fill="rgba(255,255,255,0.22)"/>
    </svg>`;
  }

  function paperclipSvg() {
    return `<svg class="sb-clip-svg" viewBox="0 0 42 86" aria-hidden="true">
      <path d="M14 26 V64 C14 75 28 75 28 64 V18 C28 9 18 9 18 18 V58 C18 64 24 64 24 58 V26"
        fill="none" stroke="#8C7458" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M13 26 V64 C13 75 27 75 27 64 V18 C27 9 17 9 17 18 V58"
        fill="none" stroke="#D8BF98" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;
  }

  function starStickerSvg(fill = '#FFE27A', stroke = '#FFFDF8') {
    return `<svg class="sb-doodle-svg" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 6 L39.5 22.5 L57.5 24.5 L44 36.8 L47.8 54.8 L32 45.8 L16.2 54.8 L20 36.8 L6.5 24.5 L24.5 22.5 Z"
        fill="${fill}" stroke="${stroke}" stroke-width="5.5" stroke-linejoin="round"/>
    </svg>`;
  }

  function heartStickerSvg(fill = '#F6B8C6', stroke = '#FFFDF8') {
    return `<svg class="sb-doodle-svg" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 54 C14 42 8 31 8 22 C8 13 15 8 22.5 8 C27.2 8 30.5 10.6 32 13.8 C33.5 10.6 36.8 8 41.5 8 C49 8 56 13 56 22 C56 31 50 42 32 54 Z"
        fill="${fill}" stroke="${stroke}" stroke-width="5.5" stroke-linejoin="round"/>
    </svg>`;
  }

  // 无配图封面时自动生成的「手账插画拍立得」SVG，保证通用稿封面饱满
  function fallbackPolaroidSvg(title, kicker) {
    const label = esc(plain(kicker || title || 'NOTEBOOK').slice(0, 12));
    return `<svg class="sb-fallback-art" viewBox="0 0 640 440" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sbFbSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#D9EFFA"/>
          <stop offset="55%" stop-color="#F7F1E2"/>
          <stop offset="100%" stop-color="#F9E0E6"/>
        </linearGradient>
      </defs>
      <rect width="640" height="440" fill="url(#sbFbSky)"/>
      <g stroke="#9CCBEB" stroke-width="1.2" opacity="0.32">
        <line x1="0" y1="88" x2="640" y2="88"/><line x1="0" y1="176" x2="640" y2="176"/>
        <line x1="0" y1="264" x2="640" y2="264"/><line x1="0" y1="352" x2="640" y2="352"/>
        <line x1="128" y1="0" x2="128" y2="440"/><line x1="256" y1="0" x2="256" y2="440"/>
        <line x1="384" y1="0" x2="384" y2="440"/><line x1="512" y1="0" x2="512" y2="440"/>
      </g>
      <path d="M56 350 Q168 250 288 286 T564 116" fill="none" stroke="#E05263" stroke-width="4" stroke-dasharray="10 10" stroke-linecap="round" opacity="0.72"/>
      <g transform="translate(150, 96) rotate(-5)">
        <rect x="8" y="14" width="332" height="224" rx="14" fill="#A89580" opacity="0.24"/>
        <rect x="0" y="0" width="166" height="224" rx="10" fill="#FFFDF8" stroke="#4D4137" stroke-width="4"/>
        <rect x="166" y="0" width="166" height="224" rx="10" fill="#FBF6EC" stroke="#4D4137" stroke-width="4"/>
        <line x1="166" y1="8" x2="166" y2="216" stroke="#CBBCA9" stroke-width="3" stroke-dasharray="6 6"/>
        <rect x="24" y="28" width="114" height="86" rx="4" fill="#A8DCC8" stroke="#4D4137" stroke-width="2.5"/>
        <circle cx="58" cy="60" r="14" fill="#FFE27A"/>
        <path d="M26 108 L64 76 L94 98 L116 80 L136 108 Z" fill="#5E9E84"/>
        <g stroke="#B8AA98" stroke-width="3.5" stroke-linecap="round">
          <line x1="28" y1="142" x2="134" y2="142"/>
          <line x1="28" y1="164" x2="116" y2="164"/>
          <line x1="28" y1="186" x2="96" y2="186"/>
        </g>
        <rect x="190" y="34" width="112" height="26" rx="4" fill="#FFE27A"/>
        <g stroke="#4D4137" stroke-width="3" fill="none" stroke-linecap="round">
          <rect x="192" y="84" width="18" height="18" rx="3"/><path d="M195 93 L200 98 L209 86" stroke="#E05263"/>
          <line x1="222" y1="93" x2="298" y2="93" stroke="#7A6D60"/>
          <rect x="192" y="122" width="18" height="18" rx="3"/><path d="M195 131 L200 136 L209 124" stroke="#E05263"/>
          <line x1="222" y1="131" x2="288" y2="131" stroke="#7A6D60"/>
          <rect x="192" y="160" width="18" height="18" rx="3"/>
          <line x1="222" y1="169" x2="278" y2="169" stroke="#7A6D60"/>
        </g>
      </g>
      <g transform="translate(508, 294)">
        <circle cx="0" cy="0" r="52" fill="#FFFDF8" stroke="#E05263" stroke-width="4"/>
        <circle cx="0" cy="0" r="42" fill="none" stroke="#E05263" stroke-width="2" stroke-dasharray="5 4"/>
        <polygon points="0,-28 9,0 0,28 -9,0" fill="#F6B8C6"/>
        <polygon points="0,-28 9,0 -9,0" fill="#E05263"/>
        <circle cx="0" cy="0" r="5" fill="#FFFDF8" stroke="#3A3A3A" stroke-width="2"/>
      </g>
      <g transform="translate(92, 292) rotate(-32)">
        <rect x="0" y="0" width="110" height="18" rx="5" fill="#9CCBEB" stroke="#3A3A3A" stroke-width="3"/>
        <polygon points="110,0 132,9 110,18" fill="#F4D8B4" stroke="#3A3A3A" stroke-width="3" stroke-linejoin="round"/>
        <polygon points="124,6 132,9 124,12" fill="#3A3A3A"/>
      </g>
      <rect x="44" y="42" width="168" height="36" rx="4" fill="#F6B8C6" opacity="0.88" transform="rotate(-4 128 60)"/>
      <text x="128" y="66" text-anchor="middle" fill="#3A3A3A" font-size="18" font-family="'MV Hand','MV Sans',sans-serif" font-weight="700" transform="rotate(-4 128 60)">${label}</text>
    </svg>`;
  }

  function makeChips(d, api, parent, list) {
    list = arr(list);
    if (!list.length) return null;
    const box = api.add(parent, 'div', 'chips');
    const els = list.map((c, i) => {
      const ch = api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c));
      const ang = ((api.R() - 0.5) * 4.2).toFixed(2);
      ch.style.setProperty('--tilt', ang + 'deg');
      return ch;
    });
    api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: list[0] });
    return box;
  }

  // 拍立得：底边图注绝对定位在 padding-bottom 内，不干扰 api.media 的 padW 测量！
  function buildPolaroid(api, parent, src, opts = {}) {
    const res = api.media(src, {
      parent,
      frame: opts.frame || 'polaroid',
      cap: null,
      at: opts.at,
      kb: opts.kb,
      title: opts.title,
      cls: opts.cls,
      maxScale: opts.maxScale ?? 2.2,
    });
    const fr = res.fr;
    const ang = opts.tilt != null ? opts.tilt : ((api.R() - 0.5) * 3.8).toFixed(2);
    fr.style.setProperty('--tilt', ang + 'deg');
    if (fr.classList.contains('f-polaroid')) {
      api.add(fr, 'i', 'sb-ptape pt-l ' + (opts.tapeA || 'tp-pink'));
      api.add(fr, 'i', 'sb-ptape pt-r ' + (opts.tapeB || 'tp-mint'));
      const chin = api.add(fr, 'div', 'sb-pol-chin');
      if (opts.cap) {
        const capEl = api.add(chin, 'span', 'sb-pol-cap', rich(opts.cap));
        api.beat(capEl, 'note', opts.capAt, { gap: 0.12 });
      } else {
        api.add(chin, 'span', 'sb-pol-date', esc(opts.fallbackDate || 'JOURNAL · PHOTO'));
      }
    } else if (opts.cap) {
      const capEl = api.add(res.m, 'div', 'cap', rich(opts.cap));
      api.beat(capEl, 'note', opts.capAt);
    }
    return res;
  }

  // 活页撕纸清单
  function buildChecklist(d, api, parent, items, mode, wrapClass = '') {
    const sheet = api.add(parent, 'div', 'sb-memo-sheet' + (wrapClass ? ' ' + wrapClass : ''));
    api.add(sheet, 'i', 'sb-sheet-tape');
    api.add(sheet, 'div', 'sb-sheet-perf');
    const ul = api.add(sheet, 'ul', 'list m-' + mode + nc(items.length));
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
    return { sheet, ul };
  }

  // 底纸装饰和纸胶带绘制
  function drawWashiTape(g, cx, cy, w, h, ang, col, pat) {
    g.save();
    g.translate(cx, cy);
    g.rotate(ang);
    const n = 7, hw = w / 2, hh = h / 2, zz = 6;
    g.beginPath();
    g.moveTo(-hw, -hh);
    g.lineTo(hw, -hh);
    for (let k = 1; k <= n; k++) g.lineTo(hw - (k % 2 ? zz : 0), -hh + (h * k) / n);
    g.lineTo(-hw, hh);
    for (let k = n - 1; k >= 0; k--) g.lineTo(-hw + (k % 2 ? zz : 0), -hh + (h * k) / n);
    g.closePath();
    g.fillStyle = col;
    g.fill();
    g.clip();
    if (pat === 'stripe') {
      g.strokeStyle = 'rgba(255,255,255,0.46)';
      g.lineWidth = 7;
      for (let x = -hw - h; x < hw + h; x += 18) {
        g.beginPath(); g.moveTo(x, hh); g.lineTo(x + h, -hh); g.stroke();
      }
    } else {
      g.fillStyle = 'rgba(255,255,255,0.58)';
      let r = 0;
      for (let y = -hh + 8; y < hh; y += 14, r++) {
        for (let x = -hw + 8 + (r % 2) * 8; x < hw; x += 16) {
          g.beginPath(); g.arc(x, y, 2.7, 0, Math.PI * 2); g.fill();
        }
      }
    }
    g.restore();
  }

  const TINTS = [
    'rgba(246,184,198,.25)',
    'rgba(168,220,200,.25)',
    'rgba(255,226,122,.27)',
    'rgba(156,203,235,.25)',
  ];
  const tintBg = c => `linear-gradient(${c}, ${c}), var(--paper) 0 0 / 100% 100% no-repeat`;

  MV.style({
    transition: { kind: 'journalFlip', dur: 0.72 },
    motion: {
      kicker: { kind: 'tapeStick', d: 0.5, gap: 0 },
      title: { kind: 'rise', d: 0.65, stagger: 0.08, gap: 0.12, o: { dist: 24 } },
      big: { kind: 'stickerPop', d: 0.6, stagger: 0.1, gap: 0.12, o: { from: 0.76, rot: -4 } },
      text: { kind: 'rise', d: 0.55, gap: 0.28, o: { dist: 22 } },
      item: { kind: 'rise', d: 0.48, stagger: 0.06, gap: 0.36, o: { dist: 20 } },
      card: { kind: 'scrapDrop', d: 0.62, stagger: 0.09, gap: 0.32, o: { dist: 46, rot: 4.5 } },
      chip: { kind: 'stickerPop', d: 0.44, stagger: 0.07, gap: 0.22, o: { from: 0.45, rot: -10 } },
      image: { kind: 'scrapDrop', d: 0.72, gap: 0.25, o: { dist: 56, rot: -4.2 } },
      bar: { kind: 'fade', d: 0.3, gap: 0.32 },
      grow: { kind: 'tapeStick', d: 0.78 },
      note: { kind: 'rise', d: 0.55, gap: 0.35, o: { dist: 16 } },
      quote: { kind: 'rise', d: 0.68, stagger: 0.14, gap: 0.18, o: { dist: 20 } },
      stamp: { kind: 'postmarkStamp', d: 0.52, gap: 0.25 },
    },
    focus: true,
    subMax: { r34: 16, r916: 14, r169: 24 },
    mediaFrame: 'polaroid',
    kenBurns: 0.025,
    quoteMark: '“',

    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'light') return { tone: 'light' };
      if (d.bg === 'pink') return { tone: 'light', bg: tintBg(TINTS[0]) };
      if (d.bg === 'mint') return { tone: 'light', bg: tintBg(TINTS[1]) };
      if (d.bg === 'yellow') return { tone: 'light', bg: tintBg(TINTS[2]) };
      if (d.bg === 'blue') return { tone: 'light', bg: tintBg(TINTS[3]) };
      if (t === 'chapter') return { tone: 'light', bg: tintBg(TINTS[(o.sc.chap || 0) % TINTS.length]) };
      if (t === 'ending') return { tone: 'light', bg: tintBg('rgba(255,226,122,.22)') };
      return { tone: 'light' };
    },

    // 底纸：奶白点阵纸 + 纤维 + 活页线圈(竖屏) / 双跨页折痕(横屏) + 右上/右下对角胶带
    paint(g, W, H, R, u) {
      g.fillStyle = '#FBF6EC';
      g.fillRect(0, 0, W, H);

      for (let i = 0; i < 650; i++) {
        const x = R() * W, y = R() * H, l = 6 + R() * 18, a = R() * Math.PI;
        g.strokeStyle = `rgba(148,120,84,${(0.022 + R() * 0.032).toFixed(3)})`;
        g.lineWidth = 0.7 + R() * 0.6;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }

      const step = 36;
      const xStart = u.land ? 36 : 72;
      g.fillStyle = 'rgba(126,108,86,0.25)';
      for (let x = xStart; x < W - 24; x += step) {
        for (let y = 32; y < H - 24; y += step) {
          g.beginPath();
          g.arc(x, y, 1.75, 0, Math.PI * 2);
          g.fill();
        }
      }

      if (u.land) {
        g.fillStyle = '#E8D8BC';
        g.fillRect(0, 0, W, 16);
        g.fillRect(0, H - 16, W, 16);
        g.fillRect(0, 0, 22, H);
        g.fillRect(W - 22, 0, 22, H);
        g.strokeStyle = 'rgba(110,88,62,0.22)';
        g.lineWidth = 2;
        g.strokeRect(22, 16, W - 44, H - 32);
        const cx = W / 2;
        const sg = g.createLinearGradient(cx - 46, 0, cx + 46, 0);
        sg.addColorStop(0, 'rgba(92,70,46,0)');
        sg.addColorStop(0.45, 'rgba(92,70,46,0.065)');
        sg.addColorStop(0.5, 'rgba(72,54,34,0.14)');
        sg.addColorStop(0.55, 'rgba(92,70,46,0.065)');
        sg.addColorStop(1, 'rgba(92,70,46,0)');
        g.fillStyle = sg;
        g.fillRect(cx - 46, 16, 92, H - 32);
        g.strokeStyle = 'rgba(130,104,76,0.34)';
        g.lineWidth = 2;
        [0.16, 0.5, 0.84].forEach(f => {
          const yy = H * f;
          g.beginPath(); g.moveTo(cx, yy - 18); g.lineTo(cx, yy + 18); g.stroke();
        });
        drawWashiTape(g, W - 42, 34, 170, 40, 0.72, 'rgba(246,184,198,0.68)', 'stripe');
        drawWashiTape(g, 42, H - 28, 150, 36, 0.72, 'rgba(168,220,200,0.62)', 'dot');
      } else {
        g.fillStyle = '#E7D7BC';
        g.fillRect(0, 0, 20, H);
        const bg = g.createLinearGradient(20, 0, 62, 0);
        bg.addColorStop(0, 'rgba(84,64,42,0.14)');
        bg.addColorStop(0.4, 'rgba(84,64,42,0.04)');
        bg.addColorStop(1, 'rgba(84,64,42,0)');
        g.fillStyle = bg;
        g.fillRect(20, 0, 42, H);
        g.strokeStyle = 'rgba(138,116,90,0.18)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(W - 8, 18); g.lineTo(W - 8, H - 18);
        g.moveTo(W - 14, 24); g.lineTo(W - 14, H - 24);
        g.stroke();
        const ringGap = H > 1600 ? 116 : 104;
        for (let y = 92; y < H - 72; y += ringGap) {
          g.fillStyle = '#D9C9AE';
          g.beginPath(); g.arc(40, y, 8.5, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(80,60,40,0.28)';
          g.lineWidth = 1.5;
          g.stroke();
          [-5, 5].forEach(dy => {
            g.strokeStyle = '#6E6256';
            g.lineWidth = 4.2;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(-2, y + dy - 2);
            g.quadraticCurveTo(22, y + dy - 6, 40, y + dy * 0.55);
            g.stroke();
            g.strokeStyle = '#C9B9A6';
            g.lineWidth = 1.4;
            g.beginPath();
            g.moveTo(2, y + dy - 3);
            g.quadraticCurveTo(21, y + dy - 6.5, 37, y + dy * 0.55 - 1);
            g.stroke();
          });
        }
        // 右上角粉胶带 + 右下角薄荷绿斜胶带（完全避开左下角署名和进度条）
        drawWashiTape(g, W - 34, 34, 190, 44, 0.72, 'rgba(246,184,198,0.68)', 'stripe');
        drawWashiTape(g, W - 24, H - 20, 150, 38, -0.74, 'rgba(168,220,200,0.62)', 'dot');
      }

      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.hypot(W, H) * 0.64);
      vg.addColorStop(0, 'rgba(110,82,48,0)');
      vg.addColorStop(1, 'rgba(110,82,48,0.075)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
      u.noise(5, 29);
    },

    chrome(c) {
      const serTxt = c.plain(c.story.series || c.story.title || '');
      const ser = c.h('div', 'sb-ser', c.esc(serTxt));
      const pg = c.h('div', 'sb-pg');
      const pgRing = c.h('div', 'sb-pg-ring');
      const pn = c.h('b'), pt = c.h('small');
      pgRing.append(pn, pt);
      pg.append(pgRing);

      const foot = c.h('div', 'sb-foot');
      const by = c.h('span', 'sb-by', c.esc(c.plain(c.story.byline || '')));
      const sec = c.h('span', 'sb-sec');
      foot.append(by, sec);

      const prog = c.h('div', 'sb-prog');
      const done = c.h('i'), dot = c.h('b');
      prog.append(done, dot);

      c.el.append(ser, pg, foot, prog);
      let last = -2;
      return info => {
        if (info.i !== last) {
          last = info.i;
          pn.textContent = info.page;
          pt.textContent = '/' + info.total;
          sec.textContent = info.cover || info.type === 'cover' ? '' : info.section || '';
        }
        const p = c.cl(info.progress);
        done.style.scale = `${p.toFixed(4)} 1`;
        dot.style.left = `${(p * 100).toFixed(3)}%`;
      };
    },

    tick(t, o) {
      const sc = o.sc;
      if (!sc || !sc.el) return;
      const doodles = sc.el.querySelectorAll('.sb-float');
      for (let i = 0; i < doodles.length; i++) {
        const el = doodles[i];
        const ph = i * 1.7 + sc.i * 0.9;
        const dy = Math.sin(t * 2.1 + ph) * 3.5;
        const dr = Math.cos(t * 1.6 + ph) * 2.4;
        el.style.transform = `translateY(${dy.toFixed(2)}px) rotate(${dr.toFixed(2)}deg)`;
      }
    },

    // 手绘弯曲虚线路线
    link(x1, y1, x2, y2, o) {
      const L = Math.hypot(x2 - x1, y2 - y1);
      if (L < 6) return '';
      const nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
      const bend = Math.min(34, L * 0.18) * (o.i % 2 ? -1 : 1);
      const cx = (x1 + x2) / 2 + nx * bend;
      const cy = (y1 + y2) / 2 + ny * bend;
      const f = v => v.toFixed(1);
      const segs = Math.max(4, Math.floor(L / 22));
      let d = '';
      for (let k = 0; k < segs; k++) {
        const t0 = k / segs, t1 = Math.min(1, (k + 0.56) / segs);
        const pt = tt => {
          const u = 1 - tt;
          return [u * u * x1 + 2 * u * tt * cx + tt * tt * x2, u * u * y1 + 2 * u * tt * cy + tt * tt * y2];
        };
        const a = pt(t0), b = pt(t1);
        d += `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} `;
      }
      return d + o.arrowHead(cx, cy, x2, y2, 12, 0.52);
    },

    marker(mode, i, ok) {
      if (mode === 'number') return `<b class="sb-n">${i + 1}</b>`;
      if (ok === true) {
        return `<span class="sb-chk is-ok"><svg class="ic ic-check" viewBox="0 0 48 48"><rect x="7" y="7" width="34" height="34" rx="7" class="sb-chk-box"/><path class="dr" d="M13 25 L21 33 L37 14"/></svg></span>`;
      }
      if (ok === false) {
        return `<span class="sb-chk is-no"><svg class="ic ic-cross" viewBox="0 0 48 48"><rect x="7" y="7" width="34" height="34" rx="7" class="sb-chk-box"/><path class="dr" d="M15 15 L33 33 M33 15 L15 33"/></svg></span>`;
      }
      return `<i class="sb-star s-${i % 4}"></i>`;
    },

    badge(i) {
      return `<span class="sb-bnum">${pad2(i + 1)}</span>`;
    },

    // ───── 定制手账模板 ─────
    templates: {
      // 1. 封面：手账跨页拼贴（大标题 + 大拍立得 + 胶带 + 压叠撕口票根 + 贴纸与邮戳）
      cover(d, api) {
        const layout = d.layout || 'collage';
        api.root.classList.add('sb-cov-root', 'sb-cov-l-' + layout);
        const spread = api.add(api.root, 'div', 'sb-cov-spread');

        const left = api.add(spread, 'div', 'sb-cov-head');
        const topRow = api.add(left, 'div', 'sb-cov-top');
        if (d.kicker) {
          const kEl = api.add(topRow, 'div', 'kicker', `<span class="kt">${rich(d.kicker)}</span>`);
          api.beat(kEl, 'kicker', d.kickerAt);
        }
        const pmTxt = plain(d.series || api.story.series || 'JOURNAL');
        const pm = api.add(topRow, 'div', 'sb-cov-pm', postmarkSvg('SCRAPBOOK', pmTxt.slice(0, 4), 'WEEKEND ★'));
        api.beat(pm, 'stamp', d.kickerAt, { gap: 0.08 });

        if (d.title) {
          const titleBox = api.add(left, 'div', 'sb-cov-tbox');
          const h1 = api.add(titleBox, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const tb = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = tb;
          api.marks(h1, tb);
          api.fitTitle(h1);
          const wave = api.add(titleBox, 'div', 'sb-title-wave',
            '<svg viewBox="0 0 360 18" preserveAspectRatio="none"><path class="dr" d="M4 11 Q34 3 64 11 T124 11 T184 11 T244 11 T304 11 T356 10" fill="none" stroke="#F6B8C6" stroke-width="8" stroke-linecap="round"/></svg>');
          api.beat(wave, 'line', null, { gap: 0.05 });
        }

        if (d.sub ?? d.dek) {
          const subText = d.sub ?? d.dek;
          const dek = api.add(left, 'div', 'dek sb-cov-dek', rich(subText));
          const sb = api.beat(dek, 'text', d.subAt, { auto: subText });
          api.marks(dek, sb);
        }

        const chipsParent = api.land ? left : api.root;

        const right = api.add(spread, 'div', 'sb-cov-collage');
        const starA = api.add(right, 'div', 'sb-doodle sb-d-star sb-float', starStickerSvg('#FFE27A'));
        const heartA = api.add(right, 'div', 'sb-doodle sb-d-heart sb-float', heartStickerSvg('#F6B8C6'));

        if (d.image) {
          buildPolaroid(api, right, d.image, {
            frame: d.frame || 'polaroid',
            cap: d.cap || d.sub,
            at: d.imageAt,
            kb: d.kb,
            title: d.windowTitle,
            tilt: -2.4,
            tapeA: 'tp-pink',
            tapeB: 'tp-mint',
            cls: 'sb-cov-media',
          });
        } else {
          const polWrap = api.add(right, 'div', 'media sb-cov-media');
          const fr = api.add(polWrap, 'div', 'frame f-polaroid sb-sketch-pol');
          fr.style.setProperty('--tilt', '-2.2deg');
          api.add(fr, 'i', 'sb-ptape pt-l tp-pink');
          api.add(fr, 'i', 'sb-ptape pt-r tp-mint');
          api.add(fr, 'div', 'shot sb-sketch-shot', fallbackPolaroidSvg(d.title, d.kicker));
          const chin = api.add(fr, 'div', 'sb-pol-chin');
          api.add(chin, 'span', 'sb-pol-cap', rich(d.cap || d.kicker || d.title || '旅行手账'));
          api.beat(fr, 'image', d.imageAt);
        }

        // 压叠在拍立得右下角的真实撕口票根
        const metaText = d.meta || d.kicker || api.story.series || 'SCRAPBOOK EDITION';
        const ticket = api.add(right, 'div', 'sb-cov-ticket');
        ticket.style.setProperty('--tilt', '2.8deg');
        const tkFace = api.add(ticket, 'div', 'sb-ticket-notched sb-cov-tk-face');
        const tParts = plain(metaText).split(/[·•|]/).map(s => s.trim()).filter(Boolean);
        api.add(tkFace, 'div', 'sb-tk-stub', `<span class="sb-tk-hole"></span><b>NO.${pad2(api.sc.i + 1)}</b>`);
        const tMain = api.add(tkFace, 'div', 'sb-tk-body');
        api.add(tMain, 'div', 'sb-tk-k', esc(tParts[0] || 'TRAVEL PASS'));
        api.add(tMain, 'div', 'sb-tk-v', esc(tParts.slice(1).join(' · ') || 'SPECIAL ISSUE'));
        api.beat(ticket, 'card', d.metaAt, { gap: 0.14 });
        api.beat([starA, heartA], 'chip', null, { gap: 0.08 });

        makeChips(d, api, chipsParent, d.tags ?? d.chips);
      },

      // 2. 章节页：大号真实撕口船票/登机牌
      chapter(d, api) {
        api.root.classList.add('center');
        const n = d.num ?? pad2(api.sc.chapNo || 1);
        const wrap = api.add(api.root, 'div', 'sb-chap-wrap');
        const passWrap = api.add(wrap, 'div', 'sb-chap-tilt');
        passWrap.style.setProperty('--tilt', ((api.sc.chapNo || 1) % 2 ? '-1.3deg' : '1.2deg'));
        api.add(passWrap, 'i', 'sb-ptape pt-l tp-yellow');
        api.add(passWrap, 'i', 'sb-ptape pt-r tp-blue');

        const pass = api.add(passWrap, 'div', 'sb-ticket-notched sb-chap-ticket');
        if (n !== false && n !== '') {
          const stub = api.add(pass, 'div', 'sb-chap-stub');
          api.add(stub, 'span', 'sb-tk-hole');
          api.add(stub, 'span', 'sb-chap-tag', 'TICKET');
          const ne = api.add(stub, 'div', 'chap-num', esc(n));
          api.add(stub, 'div', 'sb-barcode');
          api.beat(ne, 'big', d.numAt);
        }

        const main = api.add(pass, 'div', 'sb-chap-main');
        api.add(main, 'div', 'sb-chap-kbar', '<span>SCRAPBOOK PASS</span><span>★ ADMIT ONE</span>');
        api.head({ big: true, parent: main });
        if (d.note) {
          const nt = api.add(main, 'div', 'note sb-chap-note', rich(d.note));
          const nb = api.beat(nt, 'note', d.noteAt, { auto: d.note });
          api.marks(nt, nb);
        }

        const pm = api.add(wrap, 'div', 'sb-chap-pm', postmarkSvg('CHAPTER', 'NO.' + (n || '01'), 'STAMP ★'));
        api.beat(passWrap, 'card', d.numAt, { gap: 0 });
        api.beat(pm, 'stamp', null, { gap: 0.15 });
      },

      // 3. 一句话：双层撕纸拼贴便签 + 对角胶带
      statement(d, api) {
        api.root.classList.add('center');
        api.head();
        const ls = lines(d.text ?? d.lines);
        if (ls.length) {
          const stack = api.add(api.root, 'div', 'sb-stmt-stack');
          api.add(stack, 'div', 'sb-stmt-back');
          const tape1 = api.add(stack, 'i', 'sb-ptape pt-tl tp-pink');
          const tape2 = api.add(stack, 'i', 'sb-ptape pt-br tp-mint');
          const box = api.add(stack, 'div', 'say sb-torn');
          api.add(box, 'div', 'sb-stmt-doodle sb-float', starStickerSvg('#FFFDF8', '#E05263'));
          ls.forEach((l, i) => {
            const e = api.add(box, 'div', 'sl', rich(l));
            const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, gap: 0.14 });
            api.marks(e, b);
          });
          api.beat([stack, tape1, tape2], 'card', d.textAt, { gap: 0, stagger: 0 });
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // 4. 大数字：纪念票根 + 邮戳大数字框
      bignum(d, api) {
        api.root.classList.add('center');
        api.head();
        const wrap = api.add(api.root, 'div', 'sb-bn-wrap');
        wrap.style.setProperty('--tilt', '-1.1deg');
        api.add(wrap, 'i', 'sb-ptape pt-l tp-mint');
        api.add(wrap, 'i', 'sb-ptape pt-r tp-pink');

        const frame = api.add(wrap, 'div', 'sb-ticket-notched sb-bn-ticket');
        const bn = api.add(frame, 'div', 'bn');
        const row = api.add(bn, 'div', 'bn-row');
        const v = d.value ?? d.num;
        const { val } = api.num(row, v);
        if (d.unit) api.add(row, 'span', 'bn-u', rich(d.unit));
        api.fitBox(row);
        api.beat(wrap, 'card', d.valueAt, { gap: 0 });
        api.beat(row, 'big', d.valueAt, { auto: d.value != null ? String(d.value) : null, with: val ? [[val, 'count', 0]] : [] });

        if (d.label) {
          const l = api.add(bn, 'div', 'bn-l', rich(d.label));
          const b = api.beat(l, 'text', d.labelAt, { auto: d.label });
          api.marks(l, b);
        }

        const pm = api.add(wrap, 'div', 'sb-bn-pm', postmarkSvg('MEMORY', String(v || '').slice(0, 6), 'RECORD ★'));
        api.beat(pm, 'stamp', null, { gap: 0.12 });
        api.note(api.root, d.note, d.noteAt);
      },

      // 5. 数据卡：白边模切异形贴纸群
      stats(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'value'));
        const body = api.body();
        const box = api.add(body, 'div', 'stats sb-stickers' + nc(items.length));
        const cols = d.cols || (api.land ? (items.length <= 4 ? items.length : 3) : (items.length <= 2 ? 1 : 2));
        if (cols === 1) box.classList.add('rows');
        box.style.setProperty('--cols', cols);
        const shapes = ['sh-round', 'sh-pill', 'sh-stamp', 'sh-tag'];
        items.forEach((it, i) => {
          const s = api.add(box, 'div', 'stat sb-st-' + (i % 4) + ' ' + shapes[i % shapes.length] + (isHot(d, i, it) ? ' on' : ''));
          const tilt = ((api.R() - 0.5) * 3.6).toFixed(2);
          s.style.setProperty('--tilt', tilt + 'deg');
          const v = api.add(s, 'div', 'stat-v');
          const { val } = api.num(v, it.value);
          if (it.unit) api.add(v, 'span', 'stat-u', rich(it.unit));
          api.fitBox(v);
          const tx = api.add(s, 'div', 'stat-tx');
          if (it.label) api.add(tx, 'div', 'stat-l', rich(it.label));
          if (it.note) api.add(tx, 'div', 'stat-n', rich(it.note));
          const b = api.beat(s, 'chip', it.at, { auto: [it.label, it.value], spread: true, focus: focusOf(d, api), with: val ? [[val, 'count', 0.05]] : [] });
          api.marks(tx, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 6. 列表：活页撕纸打勾清单
      list(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it));
        const mode = d.mode || (items.some(it => it.ok != null) ? 'check' : 'bullet');
        buildChecklist(d, api, api.body(), items, mode);
        api.note(api.root, d.note, d.noteAt);
      },

      // 7. 步骤：圆贴纸编号 + 手绘虚线弧箭头 + 倾斜便签条
      steps(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'title'));
        const row = d.dir ? d.dir === 'row' : api.land && items.length <= 5;
        const box = api.add(api.body(), 'div', 'steps sb-route-steps ' + (row ? 'row' : 'col') + nc(items.length));
        const links = api.svg('svg', { class: 'links' });
        box.appendChild(links);
        const beats = [], badges = [];
        items.forEach((it, i) => {
          const st = api.add(box, 'div', 'step sb-step-' + (i % 4) + (isHot(d, i, it) ? ' on' : ''));
          const tilt = ((i % 2 ? 1 : -1) * (0.7 + api.R() * 0.9)).toFixed(2);
          st.style.setProperty('--tilt', tilt + 'deg');
          badges.push(api.add(st, 'div', 'badge', api.badge(i, it)));
          const tx = api.add(st, 'div', 'st-tx sb-step-card');
          api.add(tx, 'div', 'st-t', rich(it.title ?? it.text));
          if (it.title && it.text) api.add(tx, 'div', 'st-n', rich(it.text));
          const b = api.beat(st, 'card', it.at, { auto: it.title ?? it.text, spread: true, focus: focusOf(d, api) });
          api.marks(tx, b);
          beats.push(b);
        });
        api.layout(() => {
          links.innerHTML = '';
          for (let i = 0; i + 1 < badges.length; i++) {
            const a = api.rel(badges[i], box), c = api.rel(badges[i + 1], box), g = 14;
            const [x1, y1, x2, y2] = row ? [a.r + g, a.cy, c.x - g, c.cy] : [a.cx, a.b + g, c.cx, c.y - g];
            if (Math.hypot(x2 - x1, y2 - y1) < 12) continue;
            const p = api.svg('path', { d: api.link(x1, y1, x2, y2, i) });
            links.appendChild(p);
            (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.3 });
          }
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 8. 卡片：拼贴便签组 / 白边大贴纸组（可选附迷你拍立得）
      cards(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'title'));
        const layout = d.layout || 'collage';
        const hasImg = !!d.image;
        const body = api.body(hasImg ? 'sb-cards-with-img' : '');

        if (hasImg) {
          buildPolaroid(api, body, d.image, {
            frame: d.frame || 'polaroid',
            cap: d.cap,
            at: d.imageAt,
            kb: d.kb,
            tilt: -2.2,
            tapeA: 'tp-yellow',
            tapeB: 'tp-pink',
            cls: 'sb-cards-media',
          });
        }

        const long = items.some(it => plain(it.text || '').length > (api.land ? 14 : 24) || plain(it.title || '').length > (api.land ? 8 : 14));
        const box = api.add(body, 'div', 'cards sb-cards-' + layout + nc(items.length));
        let cols;
        if (d.cols) cols = d.cols;
        else if (hasImg) cols = api.land ? 1 : (items.length <= 3 ? 1 : 2);
        else cols = api.land ? (items.length <= 3 ? items.length : items.length === 4 ? (long ? 2 : 4) : 3) : (items.length <= 3 ? 1 : 2);
        if (cols === 1) box.classList.add('rows');
        box.style.setProperty('--cols', cols);

        items.forEach((it, i) => {
          const c = api.add(box, 'div', 'card sb-c-' + (i % 4) + (isHot(d, i, it) ? ' on' : ''));
          const tilt = ((i % 2 ? 1 : -1) * (0.7 + api.R() * 1.1)).toFixed(2);
          c.style.setProperty('--tilt', tilt + 'deg');
          if (layout === 'collage' && i % 4 === 3) {
            api.add(c, 'div', 'sb-card-clip', paperclipSvg());
          }
          const k = it.tag ?? it.k ?? it.icon ?? (d.index === false ? null : pad2(i + 1));
          if (k != null && k !== '') {
            api.add(c, 'div', 'card-k', it.icon ? api.icon(it.icon) || esc(it.icon) : rich(k));
          }
          const tx = api.add(c, 'div', 'card-tx');
          if (it.title) api.add(tx, 'div', 'card-t', rich(it.title));
          if (it.text) api.add(tx, 'div', 'card-x', rich(it.text));
          const b = api.beat(c, layout === 'stickers' ? 'chip' : 'card', it.at, {
            auto: it.tag != null ? [it.tag, it.title ?? it.text] : it.title ?? it.text,
            spread: true,
            focus: focusOf(d, api),
          });
          api.marks(tx, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 9. 条形图：一截截彩色花纹和纸胶带
      bars(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'label'));
        const vals = items.map(it => Math.abs(parseFloat(String(it.value ?? 0).replace(/,/g, ''))) || 0);
        const log = d.scale === 'log';
        const f = v => (log ? Math.log10(Math.max(v, 1)) : v);
        const mx = d.max != null ? f(+d.max) : Math.max(...vals.map(f), 1e-9);
        const sheet = api.add(api.body(), 'div', 'sb-bars-sheet');
        api.add(sheet, 'i', 'sb-sheet-tape');
        const box = api.add(sheet, 'div', 'bars' + (log ? ' log' : '') + nc(items.length));
        const pats = ['tp-blue', 'tp-mint', 'tp-yellow', 'tp-pink'];
        items.forEach((it, i) => {
          const hot = isHot(d, i, it);
          const r = api.add(box, 'div', 'bar-row' + (hot ? ' on' : ''));
          api.add(r, 'div', 'bar-l', rich(it.label));
          const tr = api.add(r, 'div', 'bar-track');
          const fill = api.add(tr, 'div', 'bar-fill sb-tape-bar ' + (hot ? 'tp-coral' : pats[i % pats.length]));
          fill.style.setProperty('--w', cl(f(vals[i]) / mx, 0.06, 1).toFixed(4));
          fill.style.setProperty('--tilt', (i % 2 ? 0.35 : -0.35).toFixed(2) + 'deg');
          const v = api.add(tr, 'div', 'bar-v');
          const { val } = api.num(v, it.display ?? it.value);
          if (it.unit) api.add(v, 'span', 'bar-u', rich(it.unit));
          const w = [[fill, 'grow', 0.04]];
          if (val) w.push([val, 'count', 0.06, { d: 0.85 }]);
          const b = api.beat(r, 'bar', it.at, { auto: it.label, spread: true, focus: focusOf(d, api), with: w });
          api.marks(r, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 10. 时间线：左侧蜿蜒手绘虚线路线图 + 立体图钉（路线全程清晰不被卡片遮挡！）
      timeline(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it));
        const row = d.dir ? d.dir === 'row' : api.land && items.length <= 5;
        const box = api.add(api.body(), 'div', 'tl sb-route-tl ' + (row ? 'row' : 'col') + nc(items.length));
        const links = api.svg('svg', { class: 'links' });
        box.appendChild(links);
        const pinCols = [
          ['#E05263', '#B03445'],
          ['#4EA885', '#347D61'],
          ['#E8A628', '#B87E16'],
          ['#4B8EC9', '#326A9E'],
        ];
        const beats = [], dots = [];
        items.forEach((it, i) => {
          const el = api.add(box, 'div', 'tl-item sb-tl-' + (i % 4) + (i % 2 ? ' is-alt' : '') + (isHot(d, i, it) ? ' on' : ''));
          const [pc, pd] = pinCols[i % pinCols.length];
          const dot = api.add(el, 'div', 'tl-dot sb-pin', pushpinSvg(pc, pd));
          dots.push(dot);
          const card = api.add(el, 'div', 'sb-tl-card');
          card.style.setProperty('--tilt', ((i % 2 ? 1 : -1) * (0.7 + api.R() * 0.9)).toFixed(2) + 'deg');
          if (it.time != null) api.add(card, 'div', 'tl-time', rich(it.time));
          if (it.text) api.add(card, 'div', 'tl-text', rich(it.text));
          const b = api.beat(el, 'card', it.at, { auto: [it.time, it.text], spread: true, focus: focusOf(d, api) });
          api.marks(card, b);
          beats.push(b);
        });
        api.layout(() => {
          links.innerHTML = '';
          for (let i = 0; i + 1 < dots.length; i++) {
            const a = api.rel(dots[i], box), c = api.rel(dots[i + 1], box);
            const ga = a.w / 2 + 6, gc = c.w / 2 + 6;
            const L = Math.hypot(c.cx - a.cx, c.cy - a.cy);
            if (L < ga + gc + 8) continue;
            const ux = (c.cx - a.cx) / L, uy = (c.cy - a.cy) / L;
            const p = api.svg('path', { d: api.link(a.cx + ux * ga, a.cy + uy * ga, c.cx - ux * gc, c.cy - uy * gc, i) });
            links.appendChild(p);
            (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.3 });
          }
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 11. 图片：斜贴拍立得（双角胶带 + 手写图注）+ 胶带批注便签
      image(d, api) {
        api.head();
        const pts = arr(d.points ?? d.items).map(it => norm(it));
        const body = api.body(pts.length ? 'split' : 'solo');
        buildPolaroid(api, body, d.image ?? d.src, {
          frame: d.frame || 'polaroid',
          cap: d.cap,
          at: d.imageAt,
          kb: d.kb,
          title: d.windowTitle,
          tilt: -1.6,
          tapeA: 'tp-pink',
          tapeB: 'tp-yellow',
        });
        if (pts.length) {
          buildChecklist(d, api, body, pts, d.mode || 'bullet', 'sb-split-memo');
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // 12. 左右对比：两张相向倾斜的对比票根 + 贴纸 VS + 底部胶带结论
      compare(d, api, base) {
        base(d, api);
        const sides = api.root.querySelectorAll('.side');
        sides.forEach((s, i) => {
          s.classList.add('sb-cmp-ticket');
          s.style.setProperty('--tilt', i === 0 ? '-1.1deg' : '1.1deg');
          api.add(s, 'i', 'sb-ptape pt-top ' + (i === 0 ? 'tp-blue' : 'tp-pink'));
        });
      },

      // 13. 引用：手写复古明信片（右上邮票 + 邮戳）
      quote(d, api, base) {
        base(d, api);
        const qt = api.root.querySelector('.qt');
        if (qt) {
          qt.classList.add('sb-postcard');
          api.add(qt, 'i', 'sb-ptape pt-tl tp-pink');
          api.add(qt, 'div', 'sb-pc-stamp',
            '<div class="sb-postage"><span>POST</span><b>★</b></div>' + postmarkSvg('POSTCARD', 'QUOTE', 'AIR MAIL'));
        }
      },

      // 14. 结尾：手账封底明信片 + 大邮戳 + 贴纸标签 + 胶带 CTA
      ending(d, api) {
        api.root.classList.add('center');
        const card = api.add(api.root, 'div', 'sb-end-card');
        card.style.setProperty('--tilt', '-0.7deg');
        api.add(card, 'i', 'sb-ptape pt-l tp-mint');
        api.add(card, 'i', 'sb-ptape pt-r tp-pink');
        api.add(card, 'div', 'sb-doodle sb-end-star sb-float', starStickerSvg('#FFE27A'));
        api.add(card, 'div', 'sb-doodle sb-end-heart sb-float', heartStickerSvg('#F6B8C6'));

        const pm = api.add(card, 'div', 'sb-end-pm', postmarkSvg('THE END', '旅途愉快', 'SCRAPBOOK'));
        api.beat(pm, 'stamp', null, { gap: 0.05 });

        api.head({ big: true, parent: card });
        makeChips(d, api, card, d.tags ?? d.chips);
        if (d.cta) {
          const c = api.add(card, 'div', 'cta sb-end-cta', rich(d.cta));
          const b = api.beat(c, 'text', d.ctaAt, { auto: d.cta });
          api.marks(c, b);
        }
        const by = d.byline ?? api.story.byline;
        if (by) api.beat(api.add(card, 'div', 'meta byline', rich(by)), 'text', d.bylineAt);
        api.beat(card, 'card', null, { gap: 0 });
      },
    },
  });
})();
