/* 报纸号外 newsprint */
MV.style({
  // 新的一版从右边盖过来
  transition: { kind: 'slide', dur: 0.62, dirs: ['left'] },
  motion: {
    kicker: { kind: 'pop', d: 0.35, o: { from: 0.6 } },
    title: { kind: 'print', d: 0.7, stagger: 0.1, gap: 0.12 },
    big: { kind: 'slam', d: 0.5, stagger: 0.1, gap: 0.12, o: { amt: 0.16 } },
    text: { kind: 'print', d: 0.6, gap: 0.3 },
    item: { kind: 'print', d: 0.5, stagger: 0.07, gap: 0.4 },
    card: { kind: 'print', d: 0.55, stagger: 0.08, gap: 0.35 },
    chip: { kind: 'fade', d: 0.4, stagger: 0.06, gap: 0.25 },
    quote: { kind: 'print', d: 0.8, stagger: 0.18, gap: 0.2 },
    stamp: { kind: 'stamp', d: 0.45, gap: 0.25 },
  },
  subMax: { r34: 16, r916: 14, r169: 25 },
  mediaFrame: 'halftone',

  // 新闻纸：米黄底 + 纤维 + 发黄的边 + 中间一道折痕
  paint(g, W, H, R, u) {
    g.fillStyle = '#ECE6D6';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 1100; i++) {
      const x = R() * W, y = R() * H, l = 4 + R() * 16, a = R() * Math.PI;
      g.strokeStyle = `rgba(90,75,50,${(0.03 + R() * 0.05).toFixed(3)})`;
      g.lineWidth = 0.5 + R() * 0.7;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    vg.addColorStop(0, 'rgba(150,115,50,0)');
    vg.addColorStop(1, 'rgba(150,115,50,.2)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
    // 折痕：竖版横着折，横版竖着折
    const land = u.land;
    const c0 = land ? W * 0.5 : H * 0.52;
    const gr = land ? g.createLinearGradient(c0 - 30, 0, c0 + 30, 0) : g.createLinearGradient(0, c0 - 30, 0, c0 + 30);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.45, 'rgba(255,255,255,.18)');
    gr.addColorStop(0.5, 'rgba(80,60,30,.13)');
    gr.addColorStop(0.56, 'rgba(80,60,30,0)');
    g.fillStyle = gr;
    if (land) g.fillRect(c0 - 30, 0, 60, H);
    else g.fillRect(0, c0 - 30, W, 60);
    u.noise(9, 7);
  },
  overlay(g, W, H, R, u) {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, W, H);
    u.noise(16, 31);
  },

  // 报头：版次 / 报名 / 总版数，双线，下面是日期行
  chrome(c) {
    const name = c.esc(c.plain(c.story.masthead || c.story.series || c.story.title || ''));
    const mast = c.h('div', 'np-mast');
    const row = c.h('div', 'np-row'), left = c.h('span', 'np-side'), right = c.h('span', 'np-side r');
    row.append(left, c.h('span', 'np-name', name), right);
    const date = c.h('div', 'np-date'), dl = c.h('span'), dr = c.h('span');
    date.append(dl, dr);
    mast.append(row, c.h('div', 'np-rule'), date);
    const foot = c.h('div', 'np-foot');
    foot.append(c.h('span', 'np-by', c.esc(c.plain(c.story.byline || ''))), c.h('span', 'np-cont'));
    c.el.append(mast, foot);
    const series = c.esc(c.plain(c.story.series || ''));
    const cont = foot.lastChild;
    let last = '';
    return info => {
      const k = info.cover ? 'c' : info.page + '|' + info.section;
      if (k === last) return;
      last = k;
      left.innerHTML = info.cover ? '特 刊' : `第 <b>${info.page}</b> 版`;
      right.innerHTML = `共 <b>${info.total}</b> 版`;
      dl.innerHTML = series;
      dr.textContent = info.cover ? '' : info.section || '';
      cont.textContent = !info.cover && info.i + 1 < info.n ? '下转第 ' + c.pad2(info.i + 2) + ' 版' : '';
    };
  },

  link(x1, y1, x2, y2, o) {
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} ` + o.arrowHead(x1, y1, x2, y2, 16, 0.42);
  },
  marker(mode, i) {
    if (mode === 'number') return String(i + 1);
    return null;
  },
});
