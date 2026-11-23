/* 杂志瓷蓝 porcelain */
MV.style({
  transition: { kind: 'fadeblur', dur: 0.8 },
  motion: {
    kicker: { kind: 'wipe', d: 0.7 },
    title: { kind: 'mask', d: 0.85, stagger: 0.12, gap: 0.12 },
    big: { kind: 'mask', d: 0.9, stagger: 0.14, gap: 0.12 },
    text: { kind: 'fade', d: 0.7, gap: 0.35 },
    item: { kind: 'mask', d: 0.7, stagger: 0.08, gap: 0.45 },
    card: { kind: 'rise', d: 0.7, stagger: 0.08, gap: 0.4, o: { dist: 36 } },
    chip: { kind: 'fade', d: 0.5, stagger: 0.08, gap: 0.3 },
    quote: { kind: 'mask', d: 1.0, stagger: 0.2, gap: 0.2 },
  },
  focus: true,
  subMax: { r34: 17, r916: 15, r169: 26 },
  mediaFrame: 'plain',

  // 冷白瓷：釉面高光 + 边缘冷调 + 角落冰裂纹 + 细点
  paint(g, W, H, R, u) {
    g.fillStyle = '#E8ECF0';
    g.fillRect(0, 0, W, H);
    const hi = g.createRadialGradient(W * 0.28, H * 0.22, 0, W * 0.28, H * 0.22, Math.max(W, H) * 0.75);
    hi.addColorStop(0, 'rgba(255,255,255,.55)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hi;
    g.fillRect(0, 0, W, H);
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    vg.addColorStop(0, 'rgba(45,92,158,0)');
    vg.addColorStop(1, 'rgba(45,92,158,.09)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
    g.lineCap = 'round';
    const crack = (x, y, a, len, dep) => {
      if (dep > 6 || len < 10) return;
      g.lineWidth = Math.max(0.5, 1.3 - dep * 0.15);
      g.strokeStyle = `rgba(45,92,158,${(0.13 - dep * 0.012).toFixed(3)})`;
      g.beginPath();
      g.moveTo(x, y);
      const st = 3 + Math.floor(R() * 4);
      for (let s = 0; s < st; s++) { a += (R() - 0.5) * 0.7; x += (Math.cos(a) * len) / st; y += (Math.sin(a) * len) / st; g.lineTo(x, y); }
      g.stroke();
      if (R() < 0.8) crack(x, y, a + (R() - 0.5) * 1.2, len * 0.72, dep + 1);
      if (R() < 0.5) crack(x, y, a + (R() < 0.5 ? 1 : -1) * (0.7 + R() * 0.8), len * 0.6, dep + 1);
    };
    const L = Math.min(W, H) * 0.2;
    for (let k = 0; k < 5; k++) crack(W + 4, H * (0.04 + R() * 0.26), Math.PI + (R() - 0.5) * 1.1, L * (0.8 + R() * 0.5), 0);
    for (let k = 0; k < 5; k++) crack(-4, H * (0.7 + R() * 0.26), (R() - 0.5) * 1.1, L * (0.8 + R() * 0.5), 0);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(24,36,58,${(0.04 + R() * 0.08).toFixed(3)})`;
      g.beginPath();
      g.arc(R() * W, R() * H, 0.5 + R() * 1.1, 0, Math.PI * 2);
      g.fill();
    }
    u.noise(4, 9);
  },

  chrome(c) {
    const top = c.h('div', 'pc-top');
    const ser = c.h('span', 'pc-ser', c.esc(c.plain(c.story.series || c.story.title || '')));
    const no = c.h('span', 'pc-no');
    top.append(ser, no);
    const rule = c.h('div', 'pc-rule');
    const foot = c.h('div', 'pc-foot'), sec = c.h('span', 'pc-sec');
    foot.append(c.h('span', 'pc-by', c.esc(c.plain(c.story.byline || ''))), sec);
    const prog = c.h('div', 'pc-prog'), bar = c.h('i');
    prog.append(bar);
    c.el.append(top, rule, foot, prog);
    let last = '';
    return info => {
      const k = info.page + '|' + info.section;
      if (k !== last) { last = k; no.innerHTML = `No.<b>${c.pad2(info.page)}</b>`; sec.textContent = info.section || ''; }
      bar.style.scale = `${info.progress.toFixed(4)} 1`;
    };
  },

  // 章节页背后放一个超大的斜体页码
  decorate(sc, api) {
    if (sc.t === 'chapter') {
      const n = sc.d.num ?? api.pad2(sc.chapNo || 1);
      if (n !== false && n !== '') api.add(sc.el, 'div', 'pc-ghost', api.esc(String(n)));
    }
  },

  link(x1, y1, x2, y2, o) {
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} ` + o.arrowHead(x1, y1, x2, y2, 12, 0.45);
  },
  badge(i) { return `<span>${i + 1}</span>`; },
});
