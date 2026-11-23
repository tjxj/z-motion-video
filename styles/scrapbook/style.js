/* 手账拼贴 scrapbook */
(() => {
  // 章节页和结尾页：在点阵纸上盖一层半透明的便利贴颜色（按章节轮换）
  const TINT = ['rgba(255,214,90,.40)', 'rgba(255,160,180,.34)', 'rgba(140,210,175,.38)', 'rgba(150,185,255,.34)'];
  const tint = c => `linear-gradient(${c}, ${c}), var(--paper) 0 0 / 100% 100% no-repeat`;

  // 一段和纸胶带：两头锯齿，条纹或圆点
  function tape(g, cx, cy, w, h, ang, col, pat) {
    g.save();
    g.translate(cx, cy);
    g.rotate(ang);
    const n = 6, hw = w / 2, hh = h / 2, zz = 5;
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
      g.strokeStyle = 'rgba(255,255,255,.42)';
      g.lineWidth = 7;
      for (let x = -hw - h; x < hw + h; x += 19) { g.beginPath(); g.moveTo(x, hh); g.lineTo(x + h, -hh); g.stroke(); }
    } else {
      g.fillStyle = 'rgba(255,255,255,.55)';
      let r = 0;
      for (let y = -hh + 9; y < hh; y += 15, r++) {
        for (let x = -hw + 8 + (r % 2) * 8; x < hw; x += 16) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
      }
    }
    g.restore();
  }

  MV.style({
    // 新的一页像一张纸从下面滑上来
    transition: { kind: 'paper', dur: 0.75 },
    motion: {
      kicker: { kind: 'wipe', d: 0.55 },
      title: { kind: 'rise', d: 0.65, stagger: 0.09, gap: 0.12 },
      big: { kind: 'pop', d: 0.6, stagger: 0.12, gap: 0.12, o: { from: 0.8 } },
      text: { kind: 'rise', d: 0.6, gap: 0.3 },
      item: { kind: 'rise', d: 0.5, stagger: 0.07, gap: 0.4 },
      card: { kind: 'drop', d: 0.6, stagger: 0.1, gap: 0.35, o: { dist: 50, rot: 6 } },
      chip: { kind: 'pop', d: 0.42, stagger: 0.08, gap: 0.25, o: { from: 0.4 } },
      image: { kind: 'drop', d: 0.75, gap: 0.3, o: { dist: 60, rot: -5 } },
      note: { kind: 'rise', d: 0.6, gap: 0.4 },
      quote: { kind: 'rise', d: 0.7, stagger: 0.16, gap: 0.2 },
      stamp: { kind: 'pop', d: 0.45, gap: 0.3, o: { from: 0.3 } },
    },
    subMax: { r34: 16, r916: 14, r169: 24 },
    mediaFrame: 'polaroid',
    kenBurns: 0.03,

    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'light') return { tone: 'light' };
      if (t === 'chapter') return { tone: 'light', bg: tint(TINT[(o.sc.chap || 0) % TINT.length]) };
      if (t === 'ending') return { tone: 'light', bg: tint(TINT[0]) };
      return { tone: 'light' };
    },

    // 奶油色点阵本 + 纸纤维 + 两角和纸胶带
    paint(g, W, H, R, u) {
      g.fillStyle = '#FBF6EA';
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 600; i++) {
        const x = R() * W, y = R() * H, l = 6 + R() * 20, a = R() * Math.PI;
        g.strokeStyle = `rgba(150,120,80,${(0.02 + R() * 0.035).toFixed(3)})`;
        g.lineWidth = 0.6 + R() * 0.6;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }
      const s = 36;
      g.fillStyle = 'rgba(120,100,75,.24)';
      for (let x = s / 2; x < W; x += s) {
        for (let y = s / 2; y < H; y += s) { g.beginPath(); g.arc(x, y, 1.7, 0, Math.PI * 2); g.fill(); }
      }
      tape(g, W - 36, 30, 230, 56, 0.72, 'rgba(255,170,190,.62)', 'stripe');
      tape(g, 34, H - 34, 220, 54, 0.72, 'rgba(150,215,190,.6)', 'dot');
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      vg.addColorStop(0, 'rgba(120,90,50,0)');
      vg.addColorStop(1, 'rgba(120,90,50,.08)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
      u.noise(6, 29);
    },

    // 左上胶带标签写系列名，右上圆形贴纸页码，底部虚线进度
    chrome(c) {
      const ser = c.h('div', 'sb-ser', c.esc(c.plain(c.story.series || c.story.title || '')));
      const pg = c.h('div', 'sb-pg'), pn = c.h('b'), pt = c.h('small');
      pg.append(pn, pt);
      const foot = c.h('div', 'sb-foot'), sec = c.h('span', 'sb-sec');
      foot.append(c.h('span', 'sb-by', c.esc(c.plain(c.story.byline || ''))), sec);
      const prog = c.h('div', 'sb-prog'), done = c.h('i'), dot = c.h('b');
      prog.append(done, dot);
      c.el.append(ser, pg, foot, prog);
      let last = -2;
      return info => {
        if (info.i !== last) {
          last = info.i;
          pn.textContent = info.page;
          pt.textContent = '/' + info.total;
          sec.textContent = info.cover ? '' : info.section || '';
        }
        const p = c.cl(info.progress);
        done.style.scale = `${p.toFixed(4)} 1`;
        dot.style.left = `${(p * 100).toFixed(3)}%`;
      };
    },

    // 手画弧线箭头，左右交替弯
    link(x1, y1, x2, y2, o) {
      const L = Math.hypot(x2 - x1, y2 - y1);
      if (L < 4) return '';
      const nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
      const b = Math.min(26, L * 0.16) * (o.i % 2 ? -1 : 1);
      const cx = (x1 + x2) / 2 + nx * b, cy = (y1 + y2) / 2 + ny * b;
      const f = v => v.toFixed(1);
      return `M${f(x1)} ${f(y1)} Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)} ` + o.arrowHead(cx, cy, x2, y2, 13, 0.5);
    },
    // 编号：彩色圆贴纸；普通列表：小星星；对错沿用勾叉
    marker(mode, i, ok) {
      if (mode === 'number') return `<b class="sb-n">${i + 1}</b>`;
      if (ok === true || ok === false) return null;
      return '<i class="sb-star"></i>';
    },
  });
})();
