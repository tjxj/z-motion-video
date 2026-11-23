/* 方格手稿 grid-notebook */
MV.style({
  transition: { kind: 'fade', dur: 0.6 },
  motion: {
    kicker: { kind: 'wipe', d: 0.6 },
    note: { kind: 'wipe', d: 0.9, gap: 0.4 },
    title: { kind: 'rise', d: 0.7, stagger: 0.1, gap: 0.12 },
    chip: { kind: 'pop', d: 0.42, stagger: 0.08, gap: 0.3, o: { from: 0.7 } },
  },
  subMax: { r34: 17, r916: 15, r169: 26 },
  mediaFrame: 'paper',

  // 底纸：米白纸 + 纤维 + 蓝色方格 + 红色页边线
  paint(g, W, H, R, u) {
    g.fillStyle = '#F2EDE2';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) {
      const x = R() * W, y = R() * H, l = 6 + R() * 22, a = R() * Math.PI;
      g.strokeStyle = `rgba(120,100,70,${(0.025 + R() * 0.045).toFixed(3)})`;
      g.lineWidth = 0.6 + R() * 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (R() - 0.5) * 4, y + Math.sin(a) * l * 0.5 + (R() - 0.5) * 4, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    const s = 40;
    g.lineWidth = 1;
    for (let x = s; x < W; x += s) {
      g.strokeStyle = x % (s * 5) === 0 ? 'rgba(31,74,122,.15)' : 'rgba(31,74,122,.085)';
      g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke();
    }
    for (let y = s; y < H; y += s) {
      g.strokeStyle = y % (s * 5) === 0 ? 'rgba(31,74,122,.15)' : 'rgba(31,74,122,.085)';
      g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke();
    }
    const mx = { r34: 50, r916: 46, r169: 96 }[u.rc] || 50;
    g.strokeStyle = 'rgba(194,58,34,.32)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(mx, 0); g.lineTo(mx, H); g.stroke();
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    vg.addColorStop(0, 'rgba(90,70,40,0)');
    vg.addColorStop(1, 'rgba(90,70,40,.13)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
    u.noise(7, 11);
  },

  chrome(c) {
    const top = c.h('div', 'gn-top'), page = c.h('span', 'gn-page');
    top.append(c.h('span', 'gn-series', c.esc(c.plain(c.story.series || c.story.title || ''))), page);
    const prog = c.h('div', 'gn-prog'), bar = c.h('i');
    prog.append(bar);
    const foot = c.h('div', 'gn-foot'), sec = c.h('span', 'gn-sec');
    foot.append(c.h('span', 'gn-by', c.esc(c.plain(c.story.byline || ''))), sec);
    c.el.append(top, c.h('div', 'gn-rule'), prog, foot);
    let last = '';
    return info => {
      const k = info.page + '|' + info.section;
      if (k !== last) { last = k; page.textContent = `${info.page} / ${info.total}`; sec.textContent = info.section || ''; }
      bar.style.scale = `${info.progress.toFixed(4)} 1`;
    };
  },

  // 手画箭头
  link(x1, y1, x2, y2, o) {
    return o.rough.line(x1, y1, x2, y2, o.R, 2.6) + ' ' + o.arrowHead(x1, y1, x2, y2, 15, 0.5);
  },
  // 手画圆圈序号
  badge(i, s, api) {
    const ring = api.rough.circle(50, 50, 44, 42, api.R, 1.12, 0.07);
    return `<svg class="gn-ring" viewBox="0 0 100 100"><path class="dr" d="${ring}"/></svg><b>${i + 1}</b>`;
  },
  marker(mode, i) {
    if (mode === 'number') return String(i + 1).padStart(2, '0');
    return null;
  },
});
