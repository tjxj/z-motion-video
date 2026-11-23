/* 夜航文档 night-doc */
(() => {
  // 每章一种强调色；场景里写 "accent": "#xxxxxx" 可以单独指定
  const ACC = ['#6EA8FE', '#45C4B0', '#A78BFA', '#F2B544', '#5CCB7E', '#F07A8E'];
  const rgba = (hex, a) => {
    const n = parseInt(String(hex).replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  MV.style({
    transition: { kind: 'rise', dur: 0.6 },
    motion: {
      kicker: { kind: 'type', d: 0.55, o: { n: 16 } },
      title: { kind: 'rise', d: 0.6, stagger: 0.08, gap: 0.1, o: { dist: 26 } },
      big: { kind: 'blur', d: 0.7, stagger: 0.1, gap: 0.1 },
      text: { kind: 'blur', d: 0.6, gap: 0.3 },
      item: { kind: 'slideX', d: 0.5, stagger: 0.06, gap: 0.4, o: { dist: -36 } },
      card: { kind: 'rise', d: 0.55, stagger: 0.07, gap: 0.35, o: { dist: 30 } },
      chip: { kind: 'fade', d: 0.4, stagger: 0.06, gap: 0.25 },
      quote: { kind: 'blur', d: 0.8, stagger: 0.16, gap: 0.2 },
    },
    focus: true,
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'window',

    look(d, i, o) {
      const a = /^#[0-9a-f]{6}$/i.test(d.accent || '') ? d.accent : ACC[(o.sc.chap || 0) % ACC.length];
      return { tone: 'dark', accent: a, vars: { '--hl': a, '--acc-soft': rgba(a, 0.16), '--acc-line': rgba(a, 0.5), '--glow': rgba(a, 0.38) } };
    },

    // 夜空：深蓝渐变 + 两团星云 + 淡点阵 + 星点
    paint(g, W, H, R, u) {
      const bg = g.createLinearGradient(0, 0, W * 0.35, H);
      bg.addColorStop(0, '#0D1830');
      bg.addColorStop(1, '#091120');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      const blob = (x, y, r, c) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, c);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
      };
      const M = Math.max(W, H);
      blob(W * 0.88, H * 0.1, M * 0.55, 'rgba(70,110,210,.17)');
      blob(W * 0.08, H * 0.92, M * 0.5, 'rgba(120,85,200,.12)');
      g.fillStyle = 'rgba(160,190,255,.075)';
      for (let x = 36; x < W; x += 48) for (let y = 36; y < H; y += 48) g.fillRect(x, y, 2, 2);
      for (let i = 0; i < 110; i++) {
        const r = R() < 0.88 ? 0.6 + R() * 0.8 : 1.3 + R() * 1.1;
        g.fillStyle = `rgba(225,235,255,${(0.18 + R() * 0.5).toFixed(3)})`;
        g.beginPath();
        g.arc(R() * W, R() * H, r, 0, Math.PI * 2);
        g.fill();
      }
      u.noise(3, 21, true);
    },

    chrome(c) {
      const top = c.h('div', 'nd-top'), crumb = c.h('span', 'nd-crumb'), pg = c.h('span', 'nd-pg');
      top.append(crumb, pg);
      const bar = c.h('div', 'nd-bar'), fill = c.h('i');
      bar.append(fill);
      const foot = c.h('div', 'nd-foot');
      foot.append(c.h('span', 'nd-by', c.esc(c.plain(c.story.byline || ''))), c.h('span', 'nd-mark', '● ●  ●'));
      c.el.append(bar, top, foot);
      const series = c.esc(c.plain(c.story.series || c.story.title || ''));
      let last = '';
      return info => {
        const key = info.cover ? 'cover' : info.i + '|' + info.section;
        if (key !== last) {
          last = key;
          const sec = !info.cover && info.section ? ` <b>/</b> <em>${c.esc(info.section)}</em>` : '';
          crumb.innerHTML = `<b>~/</b>${series}${sec}`;
          pg.textContent = info.cover ? '' : `[${info.page}/${info.total}]`;
          // 当前页的强调色同步给页眉和字幕
          const a = info.sc && info.sc.el ? info.sc.el.style.getPropertyValue('--accent') : '';
          if (a) { c.el.style.setProperty('--ca', a); c.stage.style.setProperty('--sub-hl', a); }
        }
        fill.style.scale = `${info.progress.toFixed(4)} 1`;
      };
    },

    link(x1, y1, x2, y2, o) {
      return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} ` + o.arrowHead(x1, y1, x2, y2, 13, 0.5);
    },
    marker(mode, i) {
      if (mode === 'number') return String(i + 1).padStart(2, '0');
      return null;
    },
  });
})();
