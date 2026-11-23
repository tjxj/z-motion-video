/* 宋式米纸 rice-paper */
(() => {
  const CN = '〇一二三四五六七八九';
  const cn = v => { const n = Math.floor(+v || 0); return (n <= 0 ? '〇' : n < 10 ? CN[n] : n === 10 ? '十' : n < 20 ? '十' + CN[n - 10] : CN[Math.floor(n / 10) % 10] + '十' + (n % 10 ? CN[n % 10] : '')); };

  MV.style({
    transition: { kind: 'fadeblur', dur: 0.9 },
    motion: {
      kicker: { kind: 'fade', d: 0.8 },
      title: { kind: 'ink', d: 1.0, stagger: 0.14, gap: 0.15 },
      big: { kind: 'ink', d: 1.1, stagger: 0.18, gap: 0.15 },
      text: { kind: 'ink', d: 0.9, gap: 0.35 },
      item: { kind: 'ink', d: 0.8, stagger: 0.08, gap: 0.5 },
      card: { kind: 'ink', d: 0.85, stagger: 0.08, gap: 0.45 },
      chip: { kind: 'fade', d: 0.6, stagger: 0.1, gap: 0.3 },
      note: { kind: 'fade', d: 0.9, gap: 0.4 },
      quote: { kind: 'ink', d: 1.2, stagger: 0.3, gap: 0.2 },
      stamp: { kind: 'stamp', d: 0.55, gap: 0.3 },
    },
    subMax: { r34: 16, r916: 14, r169: 24 },
    mediaFrame: 'paper',
    quoteMark: '',

    // 宣纸：底色 + 晕染 + 纤维 + 右下远山
    paint(g, W, H, R, u) {
      g.fillStyle = '#F3ECE0';
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 26; i++) {
        const x = R() * W, y = R() * H, r = 140 + R() * 420, a = 0.02 + R() * 0.035;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(168,136,92,${a.toFixed(3)})`);
        gr.addColorStop(1, 'rgba(168,136,92,0)');
        g.fillStyle = gr;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 1500; i++) {
        const x = R() * W, y = R() * H, long = R() < 0.12, l = long ? 80 + R() * 160 : 8 + R() * 40, a = R() * Math.PI;
        g.strokeStyle = `rgba(122,98,66,${(long ? 0.025 + R() * 0.03 : 0.03 + R() * 0.05).toFixed(3)})`;
        g.lineWidth = long ? 0.5 + R() * 0.4 : 0.5 + R() * 0.8;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (R() - 0.5) * l * 0.25, y + Math.sin(a) * l * 0.5 + (R() - 0.5) * l * 0.25, x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }
      // 远山：三层淡墨，越远越淡越糊
      const ph = [R() * 9, R() * 9, R() * 9, R() * 9];
      for (let l = 0; l < 3; l++) {
        const base = H * (0.83 + l * 0.05), amp = H * (0.11 - l * 0.028), alpha = 0.05 + l * 0.035;
        g.save();
        g.filter = `blur(${(6 - l * 2.2).toFixed(1)}px)`;
        g.beginPath();
        g.moveTo(0, H);
        for (let x = 0; x <= W; x += 6) {
          const k = x / W;
          const env = Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, (k - 0.12 - l * 0.08) / 0.95))), 1.4);
          const n = 0.55 * Math.sin(k * 7.3 + ph[l]) + 0.3 * Math.sin(k * 17.1 + ph[l + 1]) + 0.15 * Math.sin(k * 41 + ph[3]);
          g.lineTo(x, base - amp * env * (0.6 + 0.4 * n));
        }
        g.lineTo(W, H);
        g.closePath();
        const gr = g.createLinearGradient(0, base - amp, 0, H);
        gr.addColorStop(0, `rgba(58,52,46,${alpha.toFixed(3)})`);
        gr.addColorStop(1, `rgba(58,52,46,${(alpha * 0.15).toFixed(3)})`);
        g.fillStyle = gr;
        g.fill();
        g.restore();
      }
      u.noise(6, 3);
    },

    chrome(c) {
      const frame = c.h('div', 'rp-frame');
      const head = c.h('div', 'rp-head', `<i></i><span>${c.esc(c.plain(c.story.series || c.story.title || ''))}</span><i></i>`);
      const prog = c.h('div', 'rp-prog');
      const bar = c.h('i');
      prog.append(bar);
      const pg = c.h('div', 'rp-page');
      c.el.append(frame, head, prog, pg);
      let last = -1;
      return info => {
        if (info.page !== last) { last = info.page; pg.textContent = `${cn(info.page)} · ${cn(info.total)}`; }
        bar.style.scale = `${info.progress.toFixed(4)} 1`;
      };
    },

    decorate(sc, api) {
      // 章节号改成中文数字
      if (sc.t === 'chapter' && sc.d.num == null) {
        const e = sc.el.querySelector('.chap-num');
        if (e) e.innerHTML = `<small>第</small>${cn(sc.chapNo || 1)}<small>章</small>`;
      }
      // 封面和结尾盖印：story.seal（2～4 个字）
      const seal = api.plain(api.story.seal || '').replace(/\s/g, '').slice(0, 4);
      if (seal && (sc.t === 'cover' || sc.t === 'ending')) {
        const e = api.add(sc.el, 'div', 'rp-seal' + (seal.length === 4 ? ' q4' : ''), `<span>${api.esc(seal)}</span>`);
        api.beat(e, 'stamp', null, { last: true });
      }
    },

    link(x1, y1, x2, y2, o) {
      return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} ` + o.arrowHead(x1, y1, x2, y2, 11, 0.42);
    },
    badge(i) { return `<span>${cn(i + 1)}</span>`; },
    marker(mode, i) {
      if (mode === 'number') return cn(i + 1);
      return null;
    },
  });
})();
