/* 孔版印刷 riso · 双色油墨（荧光粉 #FF48B0 + 孔版蓝 #0078BF）· 再生纸 #F3EEE3 · 错版与网点 */
(() => {
  'use strict';

  const { EZ, cl, hash, pad2, esc, rich } = MV.util;

  // ───────────── 自定义动画类型（全部纯时间函数，不改静态 transform） ─────────────
  // 1) 双色错版从大偏移弹回手作微错位（驱动 --reg 1→0）
  MV.kinds.risoReg = {
    f(el, p, o) {
      const e = (o.ease || EZ.back)(p);
      el.style.opacity = cl(p * 3.2).toFixed(4);
      el.style.translate = `0 ${((1 - e) * (o.dist ?? 38)).toFixed(2)}px`;
      el.style.setProperty('--reg', Math.max(0, 1 - e).toFixed(4));
    },
  };
  // 2) 滚筒压印落纸
  MV.kinds.risoStamp = {
    f(el, p, o) {
      const e = EZ.back(p);
      const amt = o.amt ?? 0.14;
      el.style.opacity = cl(p * 3.5).toFixed(4);
      el.style.scale = (1 + (1 - e) * amt).toFixed(4);
      el.style.translate = `0 ${((1 - e) * (o.dist ?? -18)).toFixed(2)}px`;
    },
  };
  // 3) 刮墨擦出
  MV.kinds.risoSweep = {
    f(el, p, o) {
      const e = (o.ease || EZ.o4)(p);
      el.style.opacity = p > 0 ? 1 : 0;
      el.style.clipPath = p >= 1 ? 'none' : `inset(-24px ${((1 - e) * 100).toFixed(2)}% -24px -24px)`;
    },
  };

  // ───────────── 工具：生成星芒多边形路径与孔版套印矢量图 ─────────────
  function starPoints(cx, cy, rOut, rIn, n = 12) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (i * Math.PI) / n - Math.PI / 2;
      const r = i % 2 === 0 ? rOut : rIn;
      pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
    }
    return pts.join(' ');
  }

  // 封面主视觉 SVG（支持 festival 音乐节舞台图腾，也支持任意题材的通用几何太阳图腾）
  function buildCoverArt(d, api) {
    const festival = d.motif === 'festival';
    const land = api.land;
    const vw = land ? 680 : 920;
    const vh = land ? 680 : 540;
    const cx = vw * 0.5;
    const cy = festival ? vh * 0.44 : vh * 0.5;
    const R = Math.min(vw, vh) * (festival ? 0.34 : 0.38);
    const id = 'rs' + api.sc.i;

    // 粗网点渐变圆点阵
    let dots = '';
    const step = 22;
    for (let y = 24; y < vh - 20; y += step) {
      for (let x = 24; x < vw - 20; x += step) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist > R * 0.85 && dist < R * 1.48) {
          const rad = cl((1 - (dist - R * 0.85) / (R * 0.63)) * 5.2, 1.2, 5.2);
          dots += `<circle cx="${x}" cy="${y}" r="${rad.toFixed(1)}" fill="#0078BF" opacity="0.52"/>`;
        }
      }
    }

    // 音乐节专属扁平剪影：音箱塔 + 舞台电吉他 + 人群剪影 + 声波
    let motifSvg = '';
    if (festival) {
      const gy = vh - 12;
      motifSvg = `
        <!-- 声波拱线 -->
        <g fill="none" stroke="#0078BF" stroke-width="6" stroke-dasharray="18 14" opacity="0.82" style="mix-blend-mode:multiply">
          <path d="M${(cx - R * 1.32).toFixed(0)} ${(cy + 40).toFixed(0)} A${(R * 1.32).toFixed(0)} ${(R * 1.32).toFixed(0)} 0 0 1 ${(cx + R * 1.32).toFixed(0)} ${(cy + 40).toFixed(0)}"/>
        </g>
        <!-- 左音箱堆叠（蓝+粉错位） -->
        <g transform="translate(${(vw * 0.06).toFixed(0)}, ${(vh * 0.42).toFixed(0)})">
          <rect x="8" y="8" width="112" height="230" fill="#FF48B0" style="mix-blend-mode:multiply"/>
          <rect x="0" y="0" width="112" height="230" fill="#0078BF" opacity="0.9" style="mix-blend-mode:multiply"/>
          <circle cx="56" cy="56" r="34" fill="#F3EEE3"/>
          <circle cx="56" cy="56" r="14" fill="#FF48B0"/>
          <circle cx="56" cy="148" r="40" fill="#F3EEE3"/>
          <circle cx="56" cy="148" r="16" fill="#1E155C"/>
        </g>
        <!-- 右音箱堆叠 -->
        <g transform="translate(${(vw * 0.94 - 112).toFixed(0)}, ${(vh * 0.46).toFixed(0)})">
          <rect x="-8" y="8" width="112" height="205" fill="#FF48B0" style="mix-blend-mode:multiply"/>
          <rect x="0" y="0" width="112" height="205" fill="#0078BF" opacity="0.9" style="mix-blend-mode:multiply"/>
          <circle cx="56" cy="52" r="30" fill="#F3EEE3"/>
          <circle cx="56" cy="52" r="12" fill="#0078BF"/>
          <circle cx="56" cy="134" r="36" fill="#F3EEE3"/>
          <circle cx="56" cy="134" r="14" fill="#FF48B0"/>
        </g>
        <!-- 斜插电吉他剪影 -->
        <g transform="translate(${(cx + 12).toFixed(0)}, ${(cy + 36).toFixed(0)}) rotate(-26)" style="mix-blend-mode:multiply">
          <path d="M-12 -185 H12 V20 H-12 Z" fill="#0078BF"/>
          <rect x="-24" y="-212" width="48" height="32" rx="4" fill="#FF48B0"/>
          <ellipse cx="0" cy="64" rx="58" ry="66" fill="#0078BF" opacity="0.92"/>
          <ellipse cx="7" cy="69" rx="52" ry="60" fill="#FF48B0" opacity="0.82"/>
          <circle cx="0" cy="52" r="16" fill="#F3EEE3"/>
          <rect x="-18" y="84" width="36" height="10" fill="#F3EEE3"/>
        </g>
        <!-- 底部挥手观众剪影（两色微错位） -->
        <g transform="translate(0, ${gy - 110})">
          <path d="M0 110 L0 64 Q45 50 74 68 L84 22 Q94 12 102 24 L98 62 Q132 42 162 66 L195 36 Q206 28 214 40 L204 72 Q245 48 282 70 L315 16 Q326 6 334 20 L328 66 Q372 46 410 68 L448 24 Q460 14 468 28 L460 66 Q510 44 552 68 L595 18 Q606 8 614 22 L606 66 Q652 46 692 70 L735 30 Q745 20 754 32 L746 68 Q795 48 840 70 L875 26 Q886 16 894 30 L888 72 L920 64 L920 110 Z"
            fill="#FF48B0" transform="translate(7, 5) scale(${(vw / 920).toFixed(3)}, 1)" style="mix-blend-mode:multiply"/>
          <path d="M0 110 L0 64 Q45 50 74 68 L84 22 Q94 12 102 24 L98 62 Q132 42 162 66 L195 36 Q206 28 214 40 L204 72 Q245 48 282 70 L315 16 Q326 6 334 20 L328 66 Q372 46 410 68 L448 24 Q460 14 468 28 L460 66 Q510 44 552 68 L595 18 Q606 8 614 22 L606 66 Q652 46 692 70 L735 30 Q745 20 754 32 L746 68 Q795 48 840 70 L875 26 Q886 16 894 30 L888 72 L920 64 L920 110 Z"
            fill="#0078BF" opacity="0.92" transform="scale(${(vw / 920).toFixed(3)}, 1)" style="mix-blend-mode:multiply"/>
        </g>
      `;
    } else {
      // 通用几何孔版海报图腾（适用于任意题材如闰年科普）：叠印半圆 + 粗波浪 + 条纹圆 + 星芒
      motifSvg = `
        <!-- 左下大蓝半圆 + 粉条纹叠印 -->
        <g style="mix-blend-mode:multiply">
          <path d="M${(vw * 0.08).toFixed(0)} ${(vh * 0.86).toFixed(0)} A150 150 0 0 1 ${(vw * 0.08 + 300).toFixed(0)} ${(vh * 0.86).toFixed(0)} Z" fill="#0078BF" opacity="0.88"/>
          <path d="M${(vw * 0.08 + 14).toFixed(0)} ${(vh * 0.86 + 6).toFixed(0)} A150 150 0 0 1 ${(vw * 0.08 + 314).toFixed(0)} ${(vh * 0.86 + 6).toFixed(0)} Z" fill="url(#${id}st)"/>
        </g>
        <!-- 右侧粗波浪声线 -->
        <g fill="none" stroke-width="11" stroke-linecap="round" style="mix-blend-mode:multiply">
          <path d="M${(vw * 0.56).toFixed(0)} ${(vh * 0.72).toFixed(0)} Q${(vw * 0.64).toFixed(0)} ${(vh * 0.62).toFixed(0)} ${(vw * 0.72).toFixed(0)} ${(vh * 0.72).toFixed(0)} T${(vw * 0.88).toFixed(0)} ${(vh * 0.72).toFixed(0)}" stroke="#FF48B0"/>
          <path d="M${(vw * 0.56).toFixed(0)} ${(vh * 0.79).toFixed(0)} Q${(vw * 0.64).toFixed(0)} ${(vh * 0.69).toFixed(0)} ${(vw * 0.72).toFixed(0)} ${(vh * 0.79).toFixed(0)} T${(vw * 0.88).toFixed(0)} ${(vh * 0.79).toFixed(0)}" stroke="#0078BF"/>
          <path d="M${(vw * 0.56).toFixed(0)} ${(vh * 0.86).toFixed(0)} Q${(vw * 0.64).toFixed(0)} ${(vh * 0.76).toFixed(0)} ${(vw * 0.72).toFixed(0)} ${(vh * 0.86).toFixed(0)} T${(vw * 0.88).toFixed(0)} ${(vh * 0.86).toFixed(0)}" stroke="#FF48B0"/>
        </g>
        <!-- 轨道环 -->
        <ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(R * 1.42).toFixed(0)}" ry="${(R * 0.52).toFixed(0)}" transform="rotate(-14 ${cx.toFixed(0)} ${cy.toFixed(0)})"
          fill="none" stroke="#0078BF" stroke-width="6" stroke-dasharray="18 12" style="mix-blend-mode:multiply"/>
      `;
    }

    return `<svg class="rs-cov-svg" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="${id}st" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <rect width="7" height="16" fill="#FF48B0" opacity="0.82"/>
        </pattern>
      </defs>
      <!-- 粗网点环 -->
      <g>${dots}</g>
      <!-- 巨型双色套印太阳（粉圆 + 错位蓝圆 multiply 叠出深紫核） -->
      <g style="mix-blend-mode:multiply">
        <circle cx="${(cx - 26).toFixed(1)}" cy="${(cy - 10).toFixed(1)}" r="${R.toFixed(1)}" fill="#FF48B0"/>
        <circle cx="${(cx + 30).toFixed(1)}" cy="${(cy + 14).toFixed(1)}" r="${(R * 0.92).toFixed(1)}" fill="#0078BF" opacity="0.86"/>
        <!-- 太阳内部纸色反白同心环 -->
        <circle cx="${(cx + 2).toFixed(1)}" cy="${(cy + 2).toFixed(1)}" r="${(R * 0.44).toFixed(1)}" fill="none" stroke="#F3EEE3" stroke-width="10" stroke-dasharray="22 14"/>
      </g>
      <!-- 旋转星芒（左上 + 右上） -->
      <g class="rs-spin" style="transform-origin:${(vw * 0.14).toFixed(0)}px ${(vh * 0.18).toFixed(0)}px; mix-blend-mode:multiply">
        <polygon points="${starPoints(vw * 0.14, vh * 0.18, 54, 24, 12)}" fill="#FF48B0"/>
        <polygon points="${starPoints(vw * 0.14 + 5, vh * 0.18 + 4, 46, 20, 12)}" fill="#0078BF" opacity="0.72"/>
      </g>
      <g class="rs-spin" data-dir="-1" style="transform-origin:${(vw * 0.86).toFixed(0)}px ${(vh * 0.22).toFixed(0)}px; mix-blend-mode:multiply">
        <polygon points="${starPoints(vw * 0.86, vh * 0.22, 42, 18, 10)}" fill="#0078BF" opacity="0.9"/>
        <polygon points="${starPoints(vw * 0.86 - 5, vh * 0.22 + 4, 36, 15, 10)}" fill="#FF48B0" opacity="0.85"/>
      </g>
      ${motifSvg}
    </svg>`;
  }

  // 每页背景装饰（按模板给独特的孔版几何装置，绝不千篇一律）
  function sceneBackdrop(sc, api) {
    const W = api.W, H = api.H, t = sc.t;
    const id = 'bg' + sc.i;
    let body = '';

    if (t === 'cover') {
      // 封面四角网点斜条带
      body = `
        <rect x="0" y="0" width="${W}" height="28" fill="#FF48B0" opacity="0.9"/>
        <rect x="0" y="10" width="${W}" height="14" fill="#0078BF" opacity="0.82" style="mix-blend-mode:multiply"/>
        <rect x="0" y="${H - 22}" width="${W}" height="22" fill="#0078BF" opacity="0.9"/>
      `;
    } else if (t === 'chapter') {
      // 蓝满版上的粉网点大圆（下移至中下部，避开右上角页码） + 底部大波浪
      const r = Math.min(W, H) * 0.38;
      body = `
        <defs>
          <pattern id="${id}p" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="9" cy="9" r="4.8" fill="#FF48B0" opacity="0.48"/>
          </pattern>
        </defs>
        <circle cx="${W * 0.82}" cy="${H * 0.52}" r="${r}" fill="#FF48B0" opacity="0.88" style="mix-blend-mode:multiply"/>
        <rect x="0" y="${H * 0.72}" width="${W}" height="${H * 0.28}" fill="url(#${id}p)"/>
        <polygon class="rs-spin" style="transform-origin:${W * 0.82}px ${H * 0.52}px" points="${starPoints(W * 0.82, H * 0.52, 110, 52, 14)}" fill="none" stroke="#F3EEE3" stroke-width="5" stroke-dasharray="14 10"/>
      `;
    } else if (t === 'statement') {
      // 粉底斜切大蓝几何块 + 波浪
      body = `
        <polygon points="0,0 ${W},0 ${W},${H * 0.34} 0,${H * 0.56}" fill="#0078BF" opacity="0.84" style="mix-blend-mode:multiply"/>
        <circle cx="${W * 0.86}" cy="${H * 0.78}" r="${Math.min(W, H) * 0.24}" fill="#0078BF" opacity="0.78" style="mix-blend-mode:multiply"/>
        <polygon class="rs-spin" style="transform-origin:${W * 0.14}px ${H * 0.18}px" points="${starPoints(W * 0.14, H * 0.18, 72, 34, 12)}" fill="#F3EEE3" opacity="0.9"/>
      `;
    } else if (t === 'bignum') {
      // 巨型叠印双圆 + 右上星芒
      const r = Math.min(W, H) * 0.32;
      body = `
        <g style="mix-blend-mode:multiply">
          <circle cx="${W * 0.78}" cy="${H * 0.36}" r="${r}" fill="#FF48B0" opacity="0.34"/>
          <circle cx="${W * 0.83}" cy="${H * 0.41}" r="${r * 0.85}" fill="#0078BF" opacity="0.24"/>
        </g>
        <g class="rs-spin" style="transform-origin:${W * 0.82}px ${H * 0.24}px; mix-blend-mode:multiply">
          <polygon points="${starPoints(W * 0.82, H * 0.24, 64, 28, 12)}" fill="#FF48B0" opacity="0.8"/>
        </g>
      `;
    } else if (t === 'ending') {
      // 返场海报：巨型双色放射星芒太阳
      const cx = W * 0.86, cy = H * 0.2;
      body = `
        <g style="mix-blend-mode:multiply">
          <circle cx="${cx}" cy="${cy}" r="${Math.min(W, H) * 0.36}" fill="#FF48B0" opacity="0.72"/>
          <circle cx="${cx - 32}" cy="${cy + 26}" r="${Math.min(W, H) * 0.28}" fill="#0078BF" opacity="0.65"/>
        </g>
        <g class="rs-spin" style="transform-origin:${cx}px ${cy}px">
          <polygon points="${starPoints(cx, cy, 180, 96, 16)}" fill="none" stroke="#F3EEE3" stroke-width="6"/>
        </g>
        <path d="M0 ${H - 170} Q${W * 0.25} ${H - 220} ${W * 0.5} ${H - 165} T${W} ${H - 180} L${W} ${H} L0 ${H} Z" fill="#0078BF" opacity="0.16"/>
      `;
    } else {
      // 内容页：按场景序号轮换 4 种不干扰正文的边角孔版装饰（网点弧、粗条纹角、半圆叠印、波浪边带）
      const m = sc.i % 4;
      if (m === 0) {
        body = `
          <defs><pattern id="${id}d" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="3.6" fill="#FF48B0" opacity="0.34"/></pattern></defs>
          <rect x="${W - 140}" y="0" width="140" height="${H}" fill="url(#${id}d)"/>
          <circle cx="${W - 30}" cy="${H * 0.22}" r="110" fill="#0078BF" opacity="0.18" style="mix-blend-mode:multiply"/>
        `;
      } else if (m === 1) {
        body = `
          <g style="mix-blend-mode:multiply">
            <circle cx="${W * 0.92}" cy="${H * 0.16}" r="126" fill="#FF48B0" opacity="0.28"/>
            <circle cx="${W * 0.87}" cy="${H * 0.21}" r="100" fill="#0078BF" opacity="0.22"/>
          </g>
          <path d="M0 ${H - 120} Q${W * 0.25} ${H - 160} ${W * 0.5} ${H - 110} T${W} ${H - 120}" fill="none" stroke="#FF48B0" stroke-width="10" opacity="0.24"/>
        `;
      } else if (m === 2) {
        body = `
          <defs><pattern id="${id}s" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)"><rect width="7" height="18" fill="#0078BF" opacity="0.18"/></pattern></defs>
          <polygon points="${W - 260},0 ${W},0 ${W},260" fill="url(#${id}s)"/>
          <g class="rs-spin" style="transform-origin:${W - 76}px 128px; mix-blend-mode:multiply">
            <polygon points="${starPoints(W - 76, 128, 42, 18, 10)}" fill="#FF48B0" opacity="0.55"/>
          </g>
        `;
      } else {
        body = `
          <g style="mix-blend-mode:multiply">
            <path d="M0 ${H * 0.72} A160 160 0 0 1 130 ${H * 0.92} L0 ${H * 0.92} Z" fill="#FF48B0" opacity="0.22"/>
            <path d="M${W} ${H * 0.14} A130 130 0 0 0 ${W - 110} ${H * 0.34} L${W} ${H * 0.34} Z" fill="#0078BF" opacity="0.2"/>
          </g>
        `;
      }
    }

    const art = api.h('div', 'rs-art', `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`);
    sc.el.insertBefore(art, sc.content);
  }

  // 套准靶标 SVG
  const REG_SVG = `<svg viewBox="0 0 34 34" width="34" height="34" style="color:#0078BF">
    <circle cx="17" cy="17" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/>
    <path d="M17 2 V32 M2 17 H32" stroke="currentColor" stroke-width="2"/>
    <circle cx="19" cy="18.5" r="4" fill="none" stroke="#FF48B0" stroke-width="1.8" style="mix-blend-mode:multiply"/>
  </svg>`;

  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);

  // ───────────── 样式定义 ─────────────
  let ovlEl = null;
  let spinEls = [];

  MV.style({
    transition: { kind: 'paper', dur: 0.62 },
    motion: {
      kicker: { kind: 'risoSweep', d: 0.45, gap: 0 },
      title: { kind: 'risoReg', d: 0.72, stagger: 0.09, gap: 0.1 },
      big: { kind: 'risoReg', d: 0.76, stagger: 0.12, gap: 0.12 },
      text: { kind: 'rise', d: 0.55, gap: 0.28, o: { dist: 24 } },
      item: { kind: 'slideX', d: 0.52, stagger: 0.07, gap: 0.36, o: { dist: -46 } },
      card: { kind: 'risoStamp', d: 0.54, stagger: 0.09, gap: 0.34 },
      chip: { kind: 'risoStamp', d: 0.42, stagger: 0.07, gap: 0.24 },
      image: { kind: 'risoStamp', d: 0.68, gap: 0.28, o: { amt: 0.08 } },
      bar: { kind: 'fade', d: 0.32, gap: 0.32 },
      grow: { kind: 'risoSweep', d: 0.82 },
      stamp: { kind: 'stamp', d: 0.48, gap: 0.28 },
      quote: { kind: 'risoReg', d: 0.72, stagger: 0.18, gap: 0.18 },
      note: { kind: 'risoSweep', d: 0.55, gap: 0.34 },
    },
    focus: true,
    subMax: { r34: 16, r916: 14, r169: 25 },
    mediaFrame: 'riso',
    kenBurns: 0.025,
    quoteMark: '“',

    // ───────────── 模板重写：按孔版海报语法重构版式 ─────────────
    templates: {
      // 1) 封面：独立音乐节 / 文创海报（满画面、巨型标题、右上双色套印印章、双色太阳主视觉、底部演出信息条）
      cover(d, api) {
        if (d.layout === 'split') api.sc.el.classList.add('rs-layout-split');
        const grid = api.add(api.root, 'div', 'rs-cov-grid');
        const top = api.add(grid, 'div', 'rs-cov-top');
        api.head({ parent: top, big: true, sub: null });
        const sealSvg = `<svg viewBox="0 0 120 120">
          <g style="mix-blend-mode:multiply">
            <polygon points="${starPoints(57, 57, 54, 42, 16)}" fill="#FF48B0"/>
            <circle cx="63" cy="62" r="44" fill="#0078BF" opacity="0.88"/>
          </g>
          <circle cx="60" cy="60" r="34" fill="#F3EEE3" stroke="#1E155C" stroke-width="3"/>
          <text x="60" y="56" text-anchor="middle" fill="#1E155C" font-family="MV Black, sans-serif" font-weight="900" font-size="16" letter-spacing="1">RISO</text>
          <text x="60" y="74" text-anchor="middle" fill="#FF48B0" font-family="MV Black, sans-serif" font-weight="900" font-size="13" letter-spacing="1">2-INK</text>
        </svg>`;
        const seal = api.add(top, 'div', 'rs-cov-seal', sealSvg);
        api.beat(seal, 'stamp', 0.35);

        const hero = api.add(grid, 'div', 'rs-cov-hero');
        if (d.image) {
          api.media(d.image, { parent: hero, frame: d.frame || 'riso', at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
        } else {
          const artWrap = api.add(hero, 'div', 'rs-cov-art', buildCoverArt(d, api));
          artWrap.style.width = '100%';
          artWrap.style.height = '100%';
          api.beat(artWrap, 'image', d.imageAt ?? 0.28);
        }

        const tags = arr(d.tags ?? d.chips);
        if (d.sub || d.dek || tags.length || d.meta) {
          const bill = api.add(grid, 'div', 'rs-cov-bill');
          const subTxt = d.sub ?? d.dek;
          if (subTxt) {
            const subEl = api.add(bill, 'div', 'dek', rich(subTxt));
            const b = api.beat(subEl, 'text', d.subAt, { auto: subTxt });
            api.marks(subEl, b);
          }
          if (tags.length || d.meta) {
            const row = api.add(bill, 'div', 'rs-cov-bill-row');
            if (tags.length) {
              const box = api.add(row, 'div', 'chips');
              const els = tags.map((c, i) => {
                const hot = d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
                return api.add(box, 'span', 'chip' + (hot ? ' hot' : ''), rich(c));
              });
              api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
            }
            if (d.meta) {
              const m = api.add(row, 'div', 'rs-cov-meta', rich(d.meta));
              api.beat(m, 'text', d.metaAt);
            }
          }
        }
      },

      // 2) 章扉页：孔版蓝满版 + 超大荧光粉序号 + 纸色反白倾斜标题块
      chapter(d, api) {
        api.root.classList.add('center');
        const wrap = api.add(api.root, 'div', 'rs-chap-wrap');
        const n = d.num ?? pad2(api.sc.chapNo || 1);
        if (n !== false && n !== '') {
          const ne = api.add(wrap, 'div', 'chap-num', esc(n));
          api.beat(ne, 'big', d.numAt);
        }
        const card = api.add(wrap, 'div', 'rs-chap-card');
        api.head({ parent: card, big: true });
        api.note(card, d.note, d.noteAt);
        api.beat(card, 'card', d.titleAt ?? 0.25);
      },

      // 3) 大数字：双色错版巨字 + 纸色反白倾斜说明飘带
      bignum(d, api) {
        api.root.classList.add('center');
        api.head();
        const stg = api.add(api.root, 'div', 'rs-bn-stage');
        const row = api.add(stg, 'div', 'bn-row');
        const v = d.value ?? d.num;
        const { wrap, val } = api.num(row, v);
        let unitEl = null;
        if (d.unit) unitEl = api.add(row, 'span', 'bn-u', rich(d.unit));
        api.fitBox(row);
        api.beat(row, 'big', d.valueAt, {
          auto: d.value != null ? String(d.value) : null,
          with: val ? [[val, 'count', 0]] : [],
        });
        // 为数字各段与单位设置 data-text，使 ::after 粉墨副版与字号 100% 同步且不撑宽容器
        api.layout(() => {
          wrap.querySelectorAll('.pre, .val, .suf').forEach(sp => {
            sp.dataset.text = sp.textContent;
          });
          if (!val && !wrap.querySelector('.val')) wrap.dataset.text = wrap.textContent;
          if (unitEl) unitEl.dataset.text = unitEl.textContent;
        });
        if (d.label) {
          const rib = api.add(stg, 'div', 'rs-bn-ribbon');
          const l = api.add(rib, 'div', 'bn-l', rich(d.label));
          const b = api.beat(rib, 'card', d.labelAt, { auto: d.label });
          api.marks(l, b);
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // 4) 结尾页：返场海报纸色大框 + 票根 CTA
      ending(d, api) {
        api.root.classList.add('center');
        const card = api.add(api.root, 'div', 'rs-end-card');
        api.head({ parent: card, big: true });
        const tags = arr(d.tags ?? d.chips);
        if (tags.length) {
          const box = api.add(card, 'div', 'chips');
          const els = tags.map((c, i) => api.add(box, 'span', 'chip' + (i === 0 ? ' hot' : ''), rich(c)));
          api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
        }
        if (d.cta) {
          const c = api.add(card, 'div', 'cta', rich(d.cta));
          const b = api.beat(c, 'card', d.ctaAt, { auto: d.cta });
          api.marks(c, b);
        }
        const by = d.byline ?? api.story.byline;
        if (by) api.beat(api.add(card, 'div', 'meta byline', rich(by)), 'text', d.bylineAt);
      },
    },

    // 每页色调切换：chapter 孔版蓝满版，statement 荧光粉满版
    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'light') return { tone: 'light' };
      if (d.bg === 'blue' || t === 'chapter') {
        return {
          tone: 'blue',
          bg: '#0078BF',
          trans: 'columns',
          vars: { '--fg': '#1E155C', '--fg2': '#005F99' },
        };
      }
      if (d.bg === 'pink' || t === 'statement') {
        return {
          tone: 'pink',
          bg: '#FF48B0',
          vars: { '--accent': '#0078BF', '--hl': '#0078BF' },
        };
      }
      return { tone: 'light' };
    },

    // 底纸：暖色再生纸 #F3EEE3 + 可见棉纸纤维 + 微小纸浆斑点 + 柔和边缘印痕
    paint(g, W, H, R, u) {
      g.fillStyle = '#F3EEE3';
      g.fillRect(0, 0, W, H);

      // 再生纸纤维（极细的暖棕与浅蓝回收纤维）
      for (let i = 0; i < 900; i++) {
        const x = R() * W, y = R() * H, l = 4 + R() * 16, a = R() * Math.PI;
        const isBlueFiber = R() < 0.12;
        g.strokeStyle = isBlueFiber
          ? `rgba(0, 120, 191, ${(0.03 + R() * 0.04).toFixed(3)})`
          : `rgba(130, 112, 86, ${(0.03 + R() * 0.05).toFixed(3)})`;
        g.lineWidth = 0.7 + R() * 0.7;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }

      // 再生纸浆微斑点
      for (let i = 0; i < 420; i++) {
        g.fillStyle = `rgba(120, 102, 78, ${(0.04 + R() * 0.06).toFixed(3)})`;
        g.beginPath();
        g.arc(R() * W, R() * H, 0.8 + R() * 1.4, 0, Math.PI * 2);
        g.fill();
      }

      // 纸面极淡的四边滚筒压痕暗角
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.65);
      vg.addColorStop(0, 'rgba(60, 45, 30, 0)');
      vg.addColorStop(1, 'rgba(60, 45, 30, .06)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);

      u.noise(8, 73);
    },

    // 顶层粗颗粒叠印纹理（multiply）：还原大豆油墨多孔纸印的粗颗粒质感
    overlay(g, W, H, R) {
      g.fillStyle = '#FFFFFF';
      g.fillRect(0, 0, W, H);
      const im = g.getImageData(0, 0, W, H);
      const dd = im.data;
      // 2x2 块状粗颗粒（比普通 1px 噪点更有孔版纸墨质感）
      for (let y = 0; y < H; y += 2) {
        for (let x = 0; x < W; x += 2) {
          const v = R();
          let lum = 255;
          if (v < 0.16) lum = 228 + Math.floor(R() * 20);
          else if (v < 0.22) lum = 212 + Math.floor(R() * 18);
          if (lum === 255) continue;
          for (let dy = 0; dy < 2 && y + dy < H; dy++) {
            for (let dx = 0; dx < 2 && x + dx < W; dx++) {
              const idx = ((y + dy) * W + (x + dx)) * 4;
              dd[idx] = lum;
              dd[idx + 1] = lum - 1;
              dd[idx + 2] = lum - 3;
            }
          }
        }
      }
      g.putImageData(im, 0, 0);
    },

    // 全局 Chrome：四角套准靶标 + 左上双色测试圆 + 页码 + 底部双色网点进度条
    chrome(c) {
      ['tl', 'tr', 'bl', 'br'].forEach(pos => c.el.appendChild(c.h('div', 'rs-reg ' + pos, REG_SVG)));

      const top = c.h('div', 'rs-top');
      const brand = c.h('div', 'rs-brand');
      brand.append(
        c.h('span', 'rs-swatches', '<i></i><i></i>'),
        c.h('span', 'rs-ser', c.esc(c.plain(c.story.series || c.story.title || 'RISO PRESS')))
      );
      const pgWrap = c.h('div', 'rs-pg-wrap');
      const inkTag = c.h('span', 'rs-ink-tag', '2-INK RISO');
      const pg = c.h('span', 'rs-pg');
      pgWrap.append(inkTag, pg);
      top.append(brand, pgWrap);

      const foot = c.h('div', 'rs-foot');
      const by = c.h('span', 'rs-by', c.esc(c.plain(c.story.byline || '')));
      const sec = c.h('span', 'rs-sec');
      foot.append(by, sec);

      const prog = c.h('div', 'rs-prog');
      const fill = c.h('div', 'rs-prog-fill');
      const pink = c.h('div', 'rs-prog-pink');
      prog.append(fill, pink);

      c.el.append(top, foot, prog);

      let last = -2;
      return info => {
        if (info.i !== last) {
          last = info.i;
          pg.innerHTML = `<b>${info.page}</b>/${info.total}`;
          sec.textContent = info.cover ? '' : info.section || '';
        }
        const p = c.cl(info.progress);
        fill.style.scale = `${p.toFixed(4)} 1`;
        pink.style.scale = `${Math.max(0, p - 0.012).toFixed(4)} 1`;
      };
    },

    setup(c) {
      ovlEl = c.stage.querySelector('#ovl');
    },

    // 每页搭建后：挂背景孔版图腾 + 在排版完成（含标题断行）后给每行标题写 data-text 实现双色错版
    decorate(sc, api) {
      sceneBackdrop(sc, api);
      api.layout(() => {
        sc.el.querySelectorAll('.title .ln').forEach(ln => {
          ln.dataset.text = ln.textContent;
        });
        spinEls = Array.from(document.querySelectorAll('#stage .rs-spin'));
      });
    },

    // 列表标记：编号用两位数、圆点用星芒、对错沿用粗描线图标
    marker(mode, i, ok) {
      if (mode === 'number') return pad2(i + 1);
      if (ok === true || ok === false) return null;
      return '<span class="rs-star-mk">★</span>';
    },

    badge(i) {
      return pad2(i + 1);
    },

    // 步骤与时间线连线：粗虚线 + 箭头
    link(x1, y1, x2, y2, o) {
      return o.dash(x1, y1, x2, y2, 12, 9) + ' ' + o.arrowHead(x1, y1, x2, y2, 14, 0.55);
    },

    // 确定性微动画（仅依赖 t）：8fps 颗粒轻微跳动 + 星芒慢速旋转
    tick(t) {
      if (ovlEl) {
        const step = Math.floor(t * 8);
        const h1 = hash('riso-gx-' + step) % 1000;
        const h2 = hash('riso-gy-' + step) % 1000;
        const dx = ((h1 / 999) * 2 - 1) * 3;
        const dy = ((h2 / 999) * 2 - 1) * 3;
        ovlEl.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
      }
      if (spinEls.length) {
        const deg = (t * 14) % 360;
        for (let i = 0; i < spinEls.length; i++) {
          const el = spinEls[i];
          const dir = el.dataset.dir === '-1' ? -1 : 1;
          el.style.rotate = `${(deg * dir).toFixed(2)}deg`;
        }
      }
    },
  });

  // 扩展 count 动画：在数字滚动每一帧同步更新 data-text，使双色错版 ::after 实时跟随
  const origCountF = MV.kinds.count.f;
  MV.kinds.count.f = (el, p, o) => {
    origCountF(el, p, o);
    if (el.dataset && 'text' in el.dataset) el.dataset.text = el.textContent;
  };
})();
