/* 象牙陶土 ivory-clay */
(() => {
  // 深色页：封面、章节、引用、结尾；陶土页：金句
  const DARK = {
    '--fg': '#F7F4EC', '--fg2': '#CFC8B8', '--fg3': '#8C8578', '--accent': '#DD7A5A', '--hl': '#DD7A5A',
    '--line': 'rgba(247,244,236,.16)', '--line-strong': 'rgba(247,244,236,.5)',
    '--card-bg': 'rgba(247,244,236,.06)', '--card-bd': 'rgba(247,244,236,.16)',
  };
  const CLAY = {
    '--fg': '#1A1917', '--fg2': '#3B2A22', '--fg3': '#6E4A3B', '--accent': '#FFFDF8', '--hl': '#FFFDF8',
    '--line': 'rgba(26,25,23,.2)', '--line-strong': 'rgba(26,25,23,.6)',
    '--card-bg': 'rgba(255,253,248,.2)', '--card-bd': 'rgba(26,25,23,.2)',
  };
  const DARK_T = { cover: 1, chapter: 1, quote: 1, ending: 1 };

  MV.style({
    // 平时轻轻上浮；进入深色页时用陶土色块扫过
    transition: { kind: 'rise', dur: 0.75, panels: [{ c: '#CF6A4C', w: 1.3 }, { c: '#1A1917', w: 0.12 }], skew: 9, sw: 0.5 },
    motion: {
      kicker: { kind: 'wipe', d: 0.6 },
      title: { kind: 'rise', d: 0.7, stagger: 0.1, gap: 0.12, o: { dist: 30 } },
      big: { kind: 'up', d: 0.8, stagger: 0.12, gap: 0.12 },
      text: { kind: 'rise', d: 0.65, gap: 0.3 },
      item: { kind: 'rise', d: 0.55, stagger: 0.07, gap: 0.4 },
      card: { kind: 'rise', d: 0.6, stagger: 0.08, gap: 0.35, o: { dist: 40 } },
      chip: { kind: 'fade', d: 0.45, stagger: 0.07, gap: 0.25 },
      quote: { kind: 'rise', d: 0.8, stagger: 0.18, gap: 0.2 },
    },
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'window',

    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'light') return { tone: 'light' };
      if (d.bg === 'dark' || DARK_T[t]) return { tone: 'dark', bg: '#1A1917', vars: DARK, trans: 'wipe' };
      if (d.bg === 'clay' || t === 'statement') return { tone: 'clay', bg: '#CF6A4C', vars: CLAY };
      return { tone: 'light' };
    },

    // 象牙纸：极淡的纤维和颗粒
    paint(g, W, H, R, u) {
      g.fillStyle = '#F7F4EC';
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 500; i++) {
        const x = R() * W, y = R() * H, l = 8 + R() * 26, a = R() * Math.PI;
        g.strokeStyle = `rgba(140,120,90,${(0.02 + R() * 0.03).toFixed(3)})`;
        g.lineWidth = 0.6 + R() * 0.6;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }
      const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      vg.addColorStop(0, 'rgba(120,90,60,0)');
      vg.addColorStop(1, 'rgba(120,90,60,.07)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
      u.noise(5, 13);
    },
    overlay(g, W, H, R, u) {
      g.fillStyle = '#fff';
      g.fillRect(0, 0, W, H);
      u.noise(9, 17);
    },

    chrome(c) {
      const top = c.h('div', 'ic-top'), pg = c.h('span', 'ic-pg');
      top.append(c.h('span', 'ic-ser', '<i></i>' + c.esc(c.plain(c.story.series || c.story.title || ''))), pg);
      const segs = c.h('div', 'ic-segs');
      const N = c.scenes.length;
      for (let k = 0; k < N; k++) segs.append(c.h('i'));
      const foot = c.h('div', 'ic-foot'), sec = c.h('span', 'ic-sec');
      foot.append(c.h('span', 'ic-by', c.esc(c.plain(c.story.byline || ''))), sec);
      c.el.append(top, foot, segs);
      const bars = [...segs.children];
      let last = -2;
      return info => {
        const cur = info.cover ? -1 : info.i;
        if (cur !== last) {
          last = cur;
          pg.textContent = info.cover ? '' : `${info.page} / ${info.total}`;
          sec.textContent = info.cover ? '' : info.section || '';
          bars.forEach((b, k) => b.style.setProperty('--f', k < cur ? '1' : '0'));
        }
        if (cur >= 0 && bars[cur]) bars[cur].style.setProperty('--f', c.cl((info.t - info.sc.s) / info.sc.dur).toFixed(4));
      };
    },

    // 点状连线 + 小箭头
    link(x1, y1, x2, y2, o) {
      return o.dash(x1, y1, x2, y2, 0.1, 13) + ' ' + o.arrowHead(x1, y1, x2, y2, 12, 0.5);
    },
    marker(mode, i) {
      if (mode === 'number') return String(i + 1).padStart(2, '0');
      return null;
    },
  });
})();
