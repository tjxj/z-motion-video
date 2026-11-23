/* 地铁导视 metro */
(() => {
  'use strict';

  const LINES = [
    { code: 'L1', num: '1', color: '#E4002B', fg: '#FFFFFF', name: '1 号线' },
    { code: 'L2', num: '2', color: '#00A651', fg: '#FFFFFF', name: '2 号线' },
    { code: 'L3', num: '3', color: '#0072CE', fg: '#FFFFFF', name: '3 号线' },
    { code: 'L4', num: '4', color: '#8E44AD', fg: '#FFFFFF', name: '4 号线' },
    { code: 'L5', num: '5', color: '#E09F00', fg: '#1D1D1F', name: '5 号线' },
  ];

  const DARK_VARS = {
    '--bg': '#1D1D1F',
    '--fg': '#F7F7F5',
    '--fg2': '#B6B9C2',
    '--fg3': '#7D818C',
    '--line': 'rgba(255, 255, 255, .16)',
    '--line-strong': 'rgba(255, 255, 255, .78)',
    '--card-bg': '#26282C',
    '--card-bd': 'rgba(255, 255, 255, .28)',
    '--hl': '#FFD100',
  };

  // 0° / 45° / 90° 圆角折线 SVG path 生成器
  function roundedPoly(pts, r = 20) {
    if (!pts || pts.length < 2) return '';
    const f = v => v.toFixed(1);
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      const v1x = p0[0] - p1[0], v1y = p0[1] - p1[1];
      const v2x = p2[0] - p1[0], v2y = p2[1] - p1[1];
      const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
      const cr = Math.min(r, l1 * 0.42, l2 * 0.42);
      const ax = p1[0] + (v1x / l1) * cr, ay = p1[1] + (v1y / l1) * cr;
      const bx = p1[0] + (v2x / l2) * cr, by = p1[1] + (v2y / l2) * cr;
      d += ` L${f(ax)} ${f(ay)} Q${f(p1[0])} ${f(p1[1])} ${f(bx)} ${f(by)}`;
    }
    const last = pts[pts.length - 1];
    d += ` L${f(last[0])} ${f(last[1])}`;
    return d;
  }

  // 精确估算中英文混排 SVG 标签宽度
  function measurePillW(str, fontSize) {
    let units = 0;
    for (const ch of String(str)) {
      if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch)) units += 1.02;
      else if (/\s/.test(ch)) units += 0.34;
      else units += 0.58;
    }
    return Math.max(66, Math.round(units * fontSize + 24));
  }

  // 创建 SVG 迷你列车图标
  function makeSvgTrain(api, scale = 1) {
    const g = api.svg('g', { class: 'mt-svg-train' });
    const inner = api.svg('g', scale === 1 ? {} : { transform: `scale(${scale})` });
    inner.appendChild(api.svg('rect', {
      x: -22, y: -11, width: 44, height: 22, rx: 7,
      fill: '#1D1D1F', stroke: '#FFD100', 'stroke-width': 3,
    }));
    inner.appendChild(api.svg('rect', { x: -14, y: -5, width: 8, height: 10, rx: 1.5, fill: '#FFD100' }));
    inner.appendChild(api.svg('rect', { x: -2, y: -5, width: 8, height: 10, rx: 1.5, fill: '#FFD100' }));
    inner.appendChild(api.svg('rect', { x: 10, y: -5, width: 7, height: 10, rx: 2, fill: '#FFFFFF' }));
    g.appendChild(inner);
    return g;
  }

  // 自定义动画：小列车沿 SVG path 确定性行驶（纯函数，仅依赖进度 p）
  MV.kinds.trainMove = {
    prep(tr) {
      const p = tr.o.path;
      tr.o.L = p && p.getTotalLength ? Math.max(1, p.getTotalLength()) : 0;
    },
    f(el, p, o) {
      const path = o.path;
      if (!path || !o.L) { el.style.opacity = 0; return; }
      const e = (o.ease || MV.util.EZ.io2)(p);
      const from = o.from ?? 0.02;
      const to = o.to ?? 0.94;
      const dist = (from + (to - from) * e) * o.L;
      const pt = path.getPointAtLength(dist);
      const pt2 = path.getPointAtLength(Math.min(o.L, dist + 2.5));
      const ang = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * (180 / Math.PI);
      el.style.opacity = p <= 0.001 ? 0 : 1;
      el.setAttribute('transform', `translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}) rotate(${ang.toFixed(1)})`);
    },
  };

  function lineFor(sc, i) {
    if (sc.t === 'cover') return LINES[2];
    const idx = sc.chap > 0 ? (sc.chap - 1) : Math.floor(i / 2);
    return LINES[idx % LINES.length];
  }

  // 自动从故事中提取封面站点名（若未显式写 d.stations）
  function deriveStations(d, api) {
    if (Array.isArray(d.stations) && d.stations.length >= 4) {
      return d.stations.slice(0, 7).map(s => api.plain(String(s)).trim());
    }
    const list = [];
    const scenes = MV._scenes || [];
    scenes.forEach(s => {
      if (s.t === 'cover' || s.t === 'ending') return;
      const raw = api.plain(s.d.title || s.d.kicker || s.d.text || '').replace(/\n/g, ' ').trim();
      if (!raw) return;
      const short = raw.split(/[：:，,。！？]/)[0].trim().slice(0, 6);
      if (short && !list.includes(short)) list.push(short);
    });
    const picked = [];
    if (list.length >= 6) {
      for (let k = 0; k < 6; k++) {
        picked.push(list[Math.round((k * (list.length - 1)) / 5)]);
      }
      picked.push('终点站');
      return picked;
    }
    const tags = (d.tags || d.chips || []).map(t => api.plain(String(t)).slice(0, 8));
    const base = ['起点站', ...list, ...tags, '核心原理', '实战应用', '终点站'];
    const uniq = [];
    base.forEach(x => { if (x && !uniq.includes(x) && uniq.length < 7) uniq.push(x); });
    while (uniq.length < 7) uniq.push(`第 ${uniq.length} 站`);
    return uniq;
  }

  // 构建封面 0°/45°/90° 多线地铁线路图 SVG（留出右下角安全区放线路徽标）
  function buildCoverMap(d, api, parent) {
    const stations = deriveStations(d, api);
    const land = api.land;
    const r916 = api.rc === 'r916';
    const W = land ? 880 : 920;
    const H = land ? 640 : (r916 ? 620 : 510);

    const wrap = api.add(parent, 'div', 'mt-cov-map');
    const svg = api.svg('svg', {
      class: 'mt-cov-svg',
      viewBox: `0 0 ${W} ${H}`,
      preserveAspectRatio: 'xMidYMid meet',
    });
    wrap.appendChild(svg);

    // 淡灰地图底格 + 45° 淡蓝河道带
    const bgG = api.svg('g', { class: 'mt-map-bg' });
    const step = 44;
    let gridD = '';
    for (let x = step; x < W; x += step) gridD += `M${x} 0 V${H} `;
    for (let y = step; y < H; y += step) gridD += `M0 ${y} H${W} `;
    bgG.appendChild(api.svg('path', { d: gridD, stroke: 'rgba(29,29,31,.055)', 'stroke-width': 1.2, fill: 'none' }));

    const riverPts = land
      ? [[0, H * 0.78], [W * 0.28, H * 0.78], [W * 0.44, H * 0.62], [W * 0.72, H * 0.62], [W, H * 0.34]]
      : [[0, H * 0.80], [W * 0.28, H * 0.80], [W * 0.46, H * 0.62], [W * 0.78, H * 0.62], [W, H * 0.40]];
    bgG.appendChild(api.svg('path', {
      d: roundedPoly(riverPts, 28),
      stroke: 'rgba(0, 114, 206, .085)',
      'stroke-width': 44,
      'stroke-linecap': 'round',
      fill: 'none',
    }));
    svg.appendChild(bgG);

    // 主线（7 站，严格 0° / 45° / 90°）与两条换乘支线，避开右下角徽标区域
    let mainPts, stCoords, sec1Pts, sec2Pts;
    if (land) {
      // 16:9 横向宽幅线路图（拉开顶部 5/6 站水平间距，彻底避免长站名相碰）
      mainPts = [
        [96, 464], [276, 464], [376, 364], [376, 224], [496, 104], [714, 104], [802, 192], [802, 344],
      ];
      stCoords = [
        { x: 96, y: 464, tx: 96, ty: 514, anchor: 'middle', kind: 'origin' },
        { x: 276, y: 464, tx: 276, ty: 514, anchor: 'middle', kind: 'normal' },
        { x: 376, y: 314, tx: 344, ty: 322, anchor: 'end', kind: 'interchange' },
        { x: 422, y: 178, tx: 392, ty: 184, anchor: 'end', kind: 'normal' },
        { x: 520, y: 104, tx: 520, ty: 64, anchor: 'middle', kind: 'interchange' },
        { x: 714, y: 104, tx: 714, ty: 64, anchor: 'middle', kind: 'normal' },
        { x: 802, y: 344, tx: 766, ty: 352, anchor: 'end', kind: 'terminal' },
      ];
      sec1Pts = [[64, 214], [276, 214], [376, 314], [584, 314], [684, 414], [852, 414]];
      sec2Pts = [[520, 24], [520, 396], [434, 482], [434, 608]];
    } else if (r916) {
      // 9:16 纵向舒展 S 形 0°/45°/90° 线路图
      mainPts = [
        [136, 94], [386, 94], [506, 214], [764, 214], [764, 314], [644, 434], [236, 434], [140, 530],
      ];
      stCoords = [
        { x: 136, y: 94, tx: 136, ty: 54, anchor: 'middle', kind: 'origin' },
        { x: 346, y: 94, tx: 346, ty: 54, anchor: 'middle', kind: 'normal' },
        { x: 506, y: 214, tx: 506, ty: 174, anchor: 'middle', kind: 'interchange' },
        { x: 744, y: 214, tx: 744, ty: 174, anchor: 'middle', kind: 'normal' },
        { x: 610, y: 434, tx: 610, ty: 392, anchor: 'middle', kind: 'interchange' },
        { x: 386, y: 434, tx: 386, ty: 480, anchor: 'middle', kind: 'normal' },
        { x: 140, y: 530, tx: 174, ty: 538, anchor: 'start', kind: 'terminal' },
      ];
      sec1Pts = [[506, 34], [506, 314], [386, 434], [386, 594]];
      sec2Pts = [[40, 314], [490, 314], [610, 434], [880, 434]];
    } else {
      // 3:4 经典横向折角地铁图（第 5 站标签放线上方，彻底避开右下角徽标）
      mainPts = [
        [114, 108], [344, 108], [464, 228], [764, 228], [764, 294], [692, 366], [204, 366],
      ];
      stCoords = [
        { x: 114, y: 108, tx: 114, ty: 68, anchor: 'middle', kind: 'origin' },
        { x: 320, y: 108, tx: 320, ty: 68, anchor: 'middle', kind: 'normal' },
        { x: 464, y: 228, tx: 464, ty: 188, anchor: 'middle', kind: 'interchange' },
        { x: 704, y: 228, tx: 704, ty: 188, anchor: 'middle', kind: 'normal' },
        { x: 620, y: 366, tx: 620, ty: 326, anchor: 'middle', kind: 'interchange' },
        { x: 410, y: 366, tx: 410, ty: 414, anchor: 'middle', kind: 'normal' },
        { x: 204, y: 366, tx: 204, ty: 414, anchor: 'middle', kind: 'terminal' },
      ];
      sec1Pts = [[464, 28], [464, 312], [410, 366], [410, 488]];
      sec2Pts = [[36, 276], [530, 276], [620, 366], [888, 366]];
    }

    const sec1 = api.svg('path', {
      d: roundedPoly(sec1Pts, 18),
      stroke: '#00A651', 'stroke-width': 10, 'stroke-linecap': 'round', fill: 'none', opacity: 0.92,
    });
    const sec2 = api.svg('path', {
      d: roundedPoly(sec2Pts, 18),
      stroke: '#FFC72C', 'stroke-width': 10, 'stroke-linecap': 'round', fill: 'none', opacity: 0.96,
    });
    svg.append(sec1, sec2);

    const decDots = land
      ? [[144, 214, '#00A651'], [732, 414, '#00A651'], [444, 548, '#FFC72C']]
      : r916
        ? [[166, 314, '#FFC72C'], [822, 434, '#FFC72C'], [386, 554, '#00A651']]
        : [[126, 276, '#FFC72C'], [828, 366, '#FFC72C'], [464, 62, '#00A651']];
    decDots.forEach(([x, y, c]) => {
      svg.appendChild(api.svg('circle', { cx: x, cy: y, r: 7, fill: '#FFFFFF', stroke: c, 'stroke-width': 4 }));
    });

    const mainD = roundedPoly(mainPts, 20);
    const mainHalo = api.svg('path', {
      d: mainD, stroke: '#FFFFFF', 'stroke-width': 22, 'stroke-linecap': 'round', fill: 'none',
    });
    const mainLine = api.svg('path', {
      d: mainD, stroke: '#E4002B', 'stroke-width': 14, 'stroke-linecap': 'round', fill: 'none',
    });
    svg.append(mainHalo, mainLine);

    const stGroup = api.svg('g', { class: 'mt-map-stations' });
    svg.appendChild(stGroup);
    const stNodes = [];
    stCoords.forEach((st, idx) => {
      const name = stations[idx] || `第 ${idx + 1} 站`;
      const g = api.svg('g', { class: 'mt-st' });
      if (st.kind === 'interchange') {
        g.appendChild(api.svg('circle', { cx: st.x, cy: st.y, r: 17, fill: '#FFFFFF', stroke: '#1D1D1F', 'stroke-width': 5.5 }));
        g.appendChild(api.svg('circle', { cx: st.x, cy: st.y, r: 7, fill: '#FFD100', stroke: '#1D1D1F', 'stroke-width': 2.5 }));
      } else if (st.kind === 'origin') {
        g.appendChild(api.svg('rect', { x: st.x - 16, y: st.y - 16, width: 32, height: 32, rx: 8, fill: '#1D1D1F', stroke: '#FFFFFF', 'stroke-width': 3.5 }));
        const t = api.svg('text', { x: st.x, y: st.y + 8, 'text-anchor': 'middle', fill: '#FFD100', 'font-size': 22, class: 'st-code' });
        t.textContent = 'S0';
        g.appendChild(t);
      } else if (st.kind === 'terminal') {
        g.appendChild(api.svg('rect', { x: st.x - 18, y: st.y - 18, width: 36, height: 36, rx: 9, fill: '#FFD100', stroke: '#1D1D1F', 'stroke-width': 4 }));
        const t = api.svg('text', { x: st.x, y: st.y + 8, 'text-anchor': 'middle', fill: '#1D1D1F', 'font-size': 23, class: 'st-code' });
        t.textContent = 'END';
        g.appendChild(t);
      } else {
        g.appendChild(api.svg('circle', { cx: st.x, cy: st.y, r: 11.5, fill: '#FFFFFF', stroke: '#E4002B', 'stroke-width': 5.5 }));
      }

      const fontSize = st.kind === 'terminal' || st.kind === 'origin' ? 23 : 21;
      const estW = measurePillW(name, fontSize);
      const pillH = fontSize + 12;
      const bx = st.anchor === 'middle' ? st.tx - estW / 2 : st.anchor === 'end' ? st.tx - estW : st.tx;
      const by = st.ty - fontSize - 3;
      const isKey = st.kind === 'terminal' || st.kind === 'interchange';
      g.appendChild(api.svg('rect', {
        x: bx, y: by, width: estW, height: pillH, rx: 6,
        fill: st.kind === 'terminal' ? '#1D1D1F' : 'rgba(247, 247, 245, .95)',
        stroke: isKey ? '#1D1D1F' : 'rgba(29, 29, 31, .18)',
        'stroke-width': isKey ? 2 : 1.2,
      }));
      const lbl = api.svg('text', {
        x: bx + estW / 2,
        y: by + pillH / 2 + fontSize * 0.34,
        'text-anchor': 'middle',
        fill: st.kind === 'terminal' ? '#FFD100' : '#1D1D1F',
        'font-size': fontSize,
        'font-weight': isKey ? 900 : 700,
      });
      lbl.textContent = name;
      g.appendChild(lbl);
      stGroup.appendChild(g);
      stNodes.push(g);
    });

    // 沿主线行驶的小列车图标
    const train = makeSvgTrain(api, 1);
    svg.appendChild(train);

    // 右下角线路编号徽标
    const lineCode = String(d.lineCode || api.story.lineCode || 'M1').slice(0, 3).toUpperCase();
    const emb = api.add(wrap, 'div', 'mt-cov-emblem',
      `<div class="mt-cov-emblem-sq">${api.esc(lineCode)}</div>` +
      `<div class="mt-cov-emblem-tx"><b>LINE 01</b><span>${stations.length} STATIONS ↗</span></div>`);

    const mapBeat = api.beat(wrap, 'card', null, {
      gap: 0.15,
      with: [
        [sec1, 'line', 0.05, { d: 0.7 }],
        [sec2, 'line', 0.12, { d: 0.7 }],
        [mainHalo, 'line', 0.16, { d: 0.9 }],
        [mainLine, 'line', 0.16, { d: 0.9 }],
      ],
    });
    api.beat(stNodes, 'dot', null, { stagger: 0.07, gap: 0.15 });
    api.beat(emb, 'chip', null, { gap: 0.12 });
    api.track(train, 'trainMove', 0.35, Math.max(1.8, api.sc.dur - 0.6), { path: mainLine, from: 0.03, to: 0.89 });
    return { wrap, mapBeat };
  }

  MV.style({
    // 转场：列车驶入下一站（干脆利落推入）
    transition: { kind: 'push', dur: 0.48, dirs: ['left'] },
    motion: {
      kicker: { kind: 'wipe', d: 0.42 },
      title: { kind: 'up', d: 0.62, stagger: 0.07, gap: 0.1, o: { dist: 56 } },
      big: { kind: 'up', d: 0.65, stagger: 0.1, gap: 0.12, o: { dist: 50 } },
      text: { kind: 'fade', d: 0.48, gap: 0.25 },
      item: { kind: 'slideX', d: 0.46, stagger: 0.06, gap: 0.35, o: { dist: -48 } },
      card: { kind: 'rise', d: 0.52, stagger: 0.07, gap: 0.32, o: { dist: 32 } },
      chip: { kind: 'pop', d: 0.38, stagger: 0.06, gap: 0.22, o: { from: 0.65 } },
      dot: { kind: 'pop', d: 0.34, stagger: 0.06, gap: 0.15, o: { from: 0.4 } },
      line: { kind: 'draw', d: 0.55 },
      note: { kind: 'slideX', d: 0.5, gap: 0.35, o: { dist: -36 } },
      quote: { kind: 'up', d: 0.62, stagger: 0.14, gap: 0.18, o: { dist: 42 } },
      stamp: { kind: 'stamp', d: 0.45, gap: 0.25 },
    },
    focus: true,
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'plain',
    kenBurns: 0.03,
    quoteMark: '“',

    look(d, i, o) {
      const sc = o.sc;
      const t = sc.t;
      const line = lineFor(sc, i);
      sc._line = line;

      const isDark = d.bg === 'dark' || (d.bg !== 'light' && (t === 'chapter' || t === 'ending'));
      if (isDark) {
        return {
          tone: 'dark',
          bg: '#1D1D1F',
          accent: line.color,
          vars: Object.assign({}, DARK_VARS, {
            '--accent': line.color,
            '--on-accent': line.fg,
          }),
        };
      }
      return {
        tone: 'light',
        accent: line.color,
        vars: {
          '--accent': line.color,
          '--on-accent': line.fg,
          '--hl': line.color,
        },
      };
    },

    // 底纸：导视白站厅瓷砖微栅格 + 极轻灯箱边暗
    paint(g, W, H, R, u) {
      g.fillStyle = '#F7F7F5';
      g.fillRect(0, 0, W, H);
      const s = 60;
      g.strokeStyle = 'rgba(29, 29, 31, .042)';
      g.lineWidth = 1;
      g.beginPath();
      for (let x = s; x < W; x += s) { g.moveTo(x, 0); g.lineTo(x, H); }
      for (let y = s; y < H; y += s) { g.moveTo(0, y); g.lineTo(W, y); }
      g.stroke();
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.64);
      vg.addColorStop(0, 'rgba(29, 29, 31, 0)');
      vg.addColorStop(1, 'rgba(29, 29, 31, .045)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
      u.noise(3, 19);
    },

    // 全局车厢 LED 顶栏 + 微型列车进度条 + 底部署名
    chrome(c) {
      const led = c.h('div', 'mt-led');
      const top = c.h('div', 'mt-led-top');
      const left = c.h('div', 'mt-led-l');
      const badge = c.h('span', 'mt-lbadge', c.esc(String(c.story.lineCode || 'M1').slice(0, 3).toUpperCase()));
      const lbl = c.h('span', 'mt-led-lbl', '始发站');
      const next = c.h('span', 'mt-led-next', '');
      left.append(badge, lbl, next);

      const right = c.h('div', 'mt-led-r');
      const dot = c.h('i', 'mt-led-dot');
      const pg = c.h('span', 'mt-led-pg', '');
      right.append(dot, pg);
      top.append(left, right);

      const stripes = c.h('div', 'mt-led-stripes',
        LINES.map(l => `<span style="background:${l.color}"></span>`).join(''));

      const rail = c.h('div', 'mt-rail');
      const track = c.h('div', 'mt-rail-track');
      const done = c.h('i', 'mt-rail-done');
      const dotsWrap = c.h('div', 'mt-rail-dots');
      const dotEls = c.scenes.map(() => c.h('i', 'mt-rail-dot'));
      dotsWrap.append(...dotEls);
      const train = c.h('div', 'mt-rail-train', '<i></i><i></i><i></i>');
      track.append(done, dotsWrap, train);
      rail.appendChild(track);

      led.append(top, stripes, rail);

      const foot = c.h('div', 'mt-foot');
      const by = c.h('span', 'mt-by', c.esc(c.plain(c.story.byline || '')));
      const ser = c.h('span', 'mt-ser', c.esc(c.plain(c.story.series || c.story.title || 'METRO SYSTEM')));
      foot.append(by, ser);

      c.el.append(led, foot);

      const lineCode = String(c.story.lineCode || '').trim().toUpperCase();
      let lastKey = '';

      return info => {
        const sc = info.sc;
        const line = (sc && sc._line) || LINES[0];
        const key = `${info.i}:${info.cover ? 1 : 0}`;
        if (key !== lastKey) {
          lastKey = key;
          c.el.style.setProperty('--chrome-lc', line.color);
          c.el.style.setProperty('--chrome-lf', line.fg);
          badge.textContent = lineCode || line.code;

          if (info.cover || info.type === 'cover') {
            lbl.textContent = '始发站';
            next.textContent = c.plain(c.story.series || c.story.title || '线路总图');
          } else if (info.type === 'ending') {
            lbl.textContent = '终点站';
            next.textContent = '全部下车 · 欢迎再次乘坐';
          } else {
            lbl.textContent = '下一站';
            const secText = info.section || c.plain((sc && sc.d && sc.d.title) || c.story.title || '').replace(/\n/g, ' ');
            next.textContent = secText;
          }
          pg.innerHTML = `${info.page}<small>/${info.total}</small>`;
          dotEls.forEach((de, idx) => {
            de.classList.toggle('past', idx < info.i);
            de.classList.toggle('cur', idx === info.i);
          });
        }
        const p = c.cl(info.progress);
        done.style.scale = `${p.toFixed(4)} 1`;
        train.style.left = `${(p * 100).toFixed(3)}%`;
        dot.style.opacity = info.cover ? '1' : (Math.sin(info.t * 4.5) > -0.35 ? '1' : '0.35');
      };
    },

    // 0° / 45° / 90° 地铁连接线（用于 steps / timeline）
    link(x1, y1, x2, y2) {
      const f = v => v.toFixed(1);
      const dx = x2 - x1, dy = y2 - y1;
      if (Math.abs(dx) < 3 || Math.abs(dy) < 3) return `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`;
      const m = Math.min(Math.abs(dx), Math.abs(dy));
      const sx = dx >= 0 ? 1 : -1, sy = dy >= 0 ? 1 : -1;
      const mx = x1 + sx * m, my = y1 + sy * m;
      return roundedPoly([[x1, y1], [mx, my], [x2, y2]], 14);
    },

    // 列表站点标记
    marker(mode, i, ok) {
      if (mode === 'number') return `<b class="mt-st-num">${MV.util.pad2(i + 1)}</b>`;
      if (ok === true || ok === false) return null;
      return '<i class="mt-st-dot"></i>';
    },

    // 步骤站点号
    badge(i) {
      return `S${i + 1}`;
    },

    // ───── 按地铁导视语法重写核心模板 ─────
    templates: {
      // 1) 封面：线路图例盒 + 完整多线 0°/45°/90° 地铁线路图 + 右下角线路徽标
      cover(d, api) {
        const box = api.add(api.root, 'div', 'mt-cov');
        const leg = api.add(box, 'div', 'mt-cov-legend');
        api.head({ parent: leg, big: true });
        const tags = d.tags ?? d.chips;
        if (tags && tags.length) {
          const ch = api.add(leg, 'div', 'chips');
          const els = tags.map((c, i) => {
            const hot = d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
            return api.add(ch, 'span', 'chip' + (hot ? ' hot' : ''), api.rich(c));
          });
          api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
        }
        if (d.meta) {
          const m = api.add(leg, 'div', 'meta', api.rich(d.meta));
          api.beat(m, 'text', d.metaAt);
        }
        const { wrap } = buildCoverMap(d, api, box);
        if (d.image) {
          const holder = api.add(wrap, 'div', 'mt-cov-media');
          api.media(d.image, { parent: holder, frame: d.frame, at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
        }
      },

      // 2) 章节页：站台站名牌（横贯色带 + 线路色块站号 + 大站名 + 上/下一站导视箭头）
      chapter(d, api) {
        api.root.classList.add('center');
        const band = api.add(api.sc.el, 'div', 'mt-plat-band');
        api.beat(band, 'text', null, { kind: 'wipe', d: 0.5, gap: 0 });

        const wrap = api.add(api.root, 'div', 'mt-sign-wrap');
        const card = api.add(wrap, 'div', 'mt-sign-card');
        api.beat(card, 'card', null, { gap: 0.04 });
        const num = d.num ?? api.pad2(api.sc.chapNo || 1);
        if (num !== false && num !== '') {
          const badge = api.add(card, 'div', 'mt-sign-badge', `<small>STATION</small><b>${api.esc(num)}</b>`);
          api.beat(badge, 'chip', d.numAt, { gap: 0.08 });
        }
        const main = api.add(card, 'div', 'mt-sign-main');
        const h1 = api.add(main, 'h1', 'title');
        String(d.title || '').split('\n').forEach(l => {
          const ln = api.add(h1, 'span', 'ln', api.rich(l));
          ln.dataset.src = l;
        });
        const tb = api.beat([...h1.children], 'title', d.titleAt);
        h1._beat = tb;
        api.marks(h1, tb);
        api.fitTitle(h1);

        const enText = d.en || `LINE ${api.sc.chapNo || 1} · STATION ${num === false ? '' : num}`;
        const en = api.add(main, 'div', 'mt-sign-en', api.esc(enText));
        api.beat(en, 'text', null, { gap: 0.12 });

        if (d.note) {
          const nt = api.add(main, 'div', 'mt-sign-note', api.rich(d.note));
          const nb = api.beat(nt, 'note', d.noteAt, { auto: d.note, gap: 0.18 });
          api.marks(nt, nb);
        }

        // 自动推导上一站 / 下一站（优先匹配章节页，无前序章节显示「始发站」）
        const scenes = MV._scenes || [];
        const curI = api.sc.i;
        let prevName = '始发站 · ORIGIN';
        let nextName = '终点站 · TERMINAL';
        for (let k = curI - 1; k >= 0; k--) {
          if (scenes[k].t === 'chapter') {
            prevName = api.plain(scenes[k].d.title || prevName).replace(/\n/g, ' ');
            break;
          }
        }
        for (let k = curI + 1; k < scenes.length; k++) {
          if (scenes[k].t === 'chapter') {
            nextName = api.plain(scenes[k].d.title || nextName).replace(/\n/g, ' ');
            break;
          }
        }
        const nav = api.add(wrap, 'div', 'mt-sign-nav');
        const p1 = api.add(nav, 'div', 'mt-nav-pill prev',
          `<span class="mt-nav-arr">◀</span><div class="mt-nav-tx"><small>PREV · 上一站</small><b>${api.esc(prevName)}</b></div>`);
        const p2 = api.add(nav, 'div', 'mt-nav-pill next',
          `<div class="mt-nav-tx"><small>NEXT · 下一站</small><b>${api.esc(nextName)}</b></div><span class="mt-nav-arr">▶</span>`);
        api.beat([p1, p2], 'item', null, { stagger: 0.1, gap: 0.2 });
      },

      // 3) 一句话：车厢广播导视牌
      statement(d, api) {
        api.root.classList.add('center');
        api.head();
        const ls = (Array.isArray(d.text ?? d.lines) ? (d.text ?? d.lines) : [d.text ?? d.lines])
          .filter(Boolean).flatMap(s => String(s).split('\n')).filter(s => s.trim() !== '');
        if (ls.length) {
          const box = api.add(api.root, 'div', 'say');
          const line = api.sc._line || LINES[0];
          const bar = api.add(box, 'div', 'mt-say-bar', `<span>● BROADCAST · 车厢广播</span><span>${line.code}</span>`);
          api.beat(bar, 'kicker', null, { gap: 0.08 });
          const inner = api.add(box, 'div', 'mt-say-body');
          ls.forEach((l, i) => {
            const e = api.add(inner, 'div', 'sl', api.rich(l));
            const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, gap: 0.16 });
            api.marks(e, b);
          });
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // 4) 大数字：站台里程/倒计时巨牌
      bignum(d, api, base) {
        base(d, api);
        const bn = api.root.querySelector('.bn');
        if (bn) {
          bn.classList.add('mt-bn-card');
          const row = bn.querySelector('.bn-row');
          if (row) {
            const ruler = api.h('div', 'mt-bn-ruler');
            row.after(ruler);
            api.beat(ruler, 'text', null, { kind: 'wipe', d: 0.65, gap: 0.1 });
          }
        }
      },

      // 5) 条形图：各线路里程/耗时轨道图
      bars(d, api, base) {
        base(d, api);
        const rows = api.root.querySelectorAll('.bar-row');
        rows.forEach((r, idx) => {
          const line = LINES[idx % LINES.length];
          r.style.setProperty('--row-c', r.classList.contains('on') ? '#E4002B' : line.color);
          const badge = api.h('div', 'bar-badge', `L${idx + 1}`);
          r.prepend(badge);
        });
      },

      // 6) 数据卡：每张信息卡赋独立线路顶色
      stats(d, api, base) {
        base(d, api);
        api.root.querySelectorAll('.stat').forEach((s, idx) => {
          s.style.setProperty('--stat-c', LINES[idx % LINES.length].color);
        });
      },

      // 7) 卡片：出口导视牌顶色分配
      cards(d, api, base) {
        base(d, api);
        api.root.querySelectorAll('.card').forEach((c, idx) => {
          c.style.setProperty('--card-c', LINES[idx % LINES.length].color);
        });
      },

      // 8) 引用：左侧四色线路竖带灯箱
      quote(d, api, base) {
        base(d, api);
        const qt = api.root.querySelector('.qt');
        if (qt) {
          const stripes = api.h('div', 'mt-qt-stripes',
            LINES.slice(0, 4).map(l => `<i style="background:${l.color}"></i>`).join(''));
          qt.prepend(stripes);
        }
      },

      // 9) 步骤：增加沿轨道行驶的独立顶层小列车（清晰停在接近终点的轨道段上）
      steps(d, api, base) {
        base(d, api);
        api.after(() => {
          const box = api.root.querySelector('.steps');
          if (!box) return;
          const badges = [...box.querySelectorAll('.badge')];
          if (badges.length < 2) return;
          const pts = badges.map(b => {
            const r = api.rel(b, box);
            return [r.cx, r.cy];
          });
          const layer = api.svg('svg', { class: 'mt-train-layer' });
          box.appendChild(layer);
          const guide = api.svg('path', { d: roundedPoly(pts, 12), fill: 'none', stroke: 'none' });
          layer.appendChild(guide);
          const train = makeSvgTrain(api, 0.78);
          layer.appendChild(train);
          api.track(train, 'trainMove', 0.4, Math.max(1.4, api.sc.dur - 0.8), { path: guide, from: 0.08, to: 0.78 });
        });
      },

      // 9b) 时间线：同样配沿线推进的小列车
      timeline(d, api, base) {
        base(d, api);
        api.after(() => {
          const box = api.root.querySelector('.tl');
          if (!box) return;
          const dots = [...box.querySelectorAll('.tl-dot')];
          if (dots.length < 2) return;
          const pts = dots.map(el => {
            const r = api.rel(el, box);
            return [r.cx, r.cy];
          });
          const layer = api.svg('svg', { class: 'mt-train-layer' });
          box.appendChild(layer);
          const guide = api.svg('path', { d: roundedPoly(pts, 12), fill: 'none', stroke: 'none' });
          layer.appendChild(guide);
          const train = makeSvgTrain(api, 0.72);
          layer.appendChild(train);
          api.track(train, 'trainMove', 0.4, Math.max(1.4, api.sc.dur - 0.8), { path: guide, from: 0.08, to: 0.82 });
        });
      },

      // 10) 结尾：终点站台完成线路图（全线亮起 + 列车进站）
      ending(d, api, base) {
        const route = api.add(api.root, 'div', 'mt-end-route');
        const svg = api.svg('svg', { viewBox: '0 0 880 64', preserveAspectRatio: 'xMidYMid meet' });
        const segs = [
          [24, 200, '#E4002B'], [200, 380, '#00A651'], [380, 560, '#0072CE'], [560, 740, '#8E44AD'], [740, 840, '#FFC72C'],
        ];
        const paths = segs.map(([x1, x2, c]) => {
          const p = api.svg('path', { d: `M${x1} 32 H${x2}`, stroke: c, 'stroke-width': 12, 'stroke-linecap': 'round', fill: 'none' });
          svg.appendChild(p);
          return p;
        });
        [24, 200, 380, 560, 740].forEach(x => {
          svg.appendChild(api.svg('circle', { cx: x, cy: 32, r: 9, fill: '#1D1D1F', stroke: '#FFFFFF', 'stroke-width': 4 }));
        });
        // 终点换乘大站
        svg.appendChild(api.svg('circle', { cx: 840, cy: 32, r: 17, fill: '#FFD100', stroke: '#FFFFFF', 'stroke-width': 5 }));
        svg.appendChild(api.svg('circle', { cx: 840, cy: 32, r: 6, fill: '#1D1D1F' }));
        // 列车驶向终点
        const fullGuide = api.svg('path', { d: 'M24 32 H840', fill: 'none', stroke: 'none' });
        svg.appendChild(fullGuide);
        const train = makeSvgTrain(api, 0.9);
        svg.appendChild(train);
        route.appendChild(svg);

        api.beat(route, 'kicker', null, {
          gap: 0,
          with: paths.map((p, k) => [p, 'line', k * 0.08, { d: 0.4 }]),
        });
        api.track(train, 'trainMove', 0.2, Math.max(1.4, api.sc.dur - 0.8), { path: fullGuide, from: 0.05, to: 0.91 });
        base(d, api);
      },
    },
  });
})();
