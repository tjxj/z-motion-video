/* 瑞士网格 swiss-grid */
(() => {
  const RED = '#E4002B', INK = '#0F0F0F', PAPER = '#F3F2EE';
  // 和 base.css 的左右安全边距保持一致，参考线才能对上内容
  const MARGIN = { r34: 84, r916: 80, r169: 150 };

  // 章节页：整页瑞士红 + 白字；金句页和结尾页：整页墨黑
  const ON_RED = {
    '--bg': RED, '--fg': '#FFFFFF', '--fg2': 'rgba(255,255,255,.86)', '--fg3': 'rgba(255,255,255,.6)',
    '--accent': INK, '--accent-t': INK, '--hl': INK, '--sq': '#FFFFFF',
    '--line': 'rgba(255,255,255,.3)', '--line-strong': '#FFFFFF', '--card-bd': '#FFFFFF',
  };
  const ON_INK = {
    '--bg': INK, '--fg': PAPER, '--fg2': 'rgba(243,242,238,.74)', '--fg3': 'rgba(243,242,238,.46)',
    '--accent': '#FF2D4F', '--accent-t': '#FF2D4F', '--hl': '#FF2D4F', '--sq': RED,
    '--line': 'rgba(243,242,238,.2)', '--line-strong': PAPER, '--card-bd': PAPER,
  };

  MV.style({
    // 新页面按 6 条栏位从上往下依次落下
    transition: { kind: 'columns', dur: 0.8, n: 6, stagger: 0.45 },
    motion: {
      kicker: { kind: 'wipe', d: 0.5 },
      title: { kind: 'up', d: 0.8, stagger: 0.08, gap: 0.12, o: { dist: 64 } },
      big: { kind: 'up', d: 0.9, stagger: 0.12, gap: 0.12, o: { dist: 110 } },
      text: { kind: 'up', d: 0.7, gap: 0.3, o: { dist: 40 } },
      item: { kind: 'up', d: 0.6, stagger: 0.07, gap: 0.4, o: { dist: 44 } },
      card: { kind: 'up', d: 0.7, stagger: 0.09, gap: 0.35, o: { dist: 56 } },
      chip: { kind: 'wipe', d: 0.4, stagger: 0.06, gap: 0.25 },
      image: { kind: 'wipe', d: 0.8, gap: 0.3 },
      note: { kind: 'up', d: 0.6, gap: 0.4, o: { dist: 30 } },
      quote: { kind: 'up', d: 0.8, stagger: 0.16, gap: 0.2, o: { dist: 56 } },
      stamp: { kind: 'wipe', d: 0.45, gap: 0.3 },
    },
    focus: true,
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'plain',
    kenBurns: 0.04,

    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'light') return { tone: 'light' };
      if (d.bg === 'red' || t === 'chapter') return { tone: 'red', bg: RED, vars: ON_RED };
      if (d.bg === 'dark' || t === 'statement' || t === 'ending') return { tone: 'dark', bg: INK, vars: ON_INK };
      return { tone: 'light' };
    },

    // 暖白纸 + 12 栏参考线 + 上下边缘的红色栏位刻度
    paint(g, W, H, R, u) {
      g.fillStyle = PAPER;
      g.fillRect(0, 0, W, H);
      const m = MARGIN[u.rc] || 84, gut = u.land ? 32 : 24, cw = (W - m * 2 - gut * 11) / 12;
      for (let k = 0; k < 12; k++) {
        const x = m + k * (cw + gut);
        g.fillStyle = 'rgba(15,15,15,.018)';
        g.fillRect(x, 0, cw, H);
        g.fillStyle = 'rgba(15,15,15,.055)';
        g.fillRect(Math.round(x), 0, 1, H);
        g.fillRect(Math.round(x + cw) - 1, 0, 1, H);
        g.fillStyle = 'rgba(228,0,43,.55)';
        g.fillRect(Math.round(x), 0, 2, 16);
        g.fillRect(Math.round(x), H - 16, 2, 16);
      }
      u.noise(3, 41);
    },

    // 页眉三段对齐栏位：系列名 / 小节 / 页码；黑色横线上叠一条红色进度
    chrome(c) {
      const top = c.h('div', 'sg-top');
      const sec = c.h('span', 'sg-sec'), pg = c.h('span', 'sg-pg'), pn = c.h('b'), pt = c.h('i');
      pg.append(pn, pt);
      top.append(c.h('span', 'sg-ser', c.esc(c.plain(c.story.series || c.story.title || ''))), sec, pg);
      const rule = c.h('div', 'sg-rule'), bar = c.h('i', 'sg-bar');
      rule.append(bar);
      const foot = c.h('div', 'sg-foot');
      foot.append(c.h('span', 'sg-by', c.esc(c.plain(c.story.byline || ''))), c.h('i', 'sg-sq'));
      c.el.append(top, rule, foot);
      let last = -2;
      return info => {
        if (info.i !== last) {
          last = info.i;
          pn.textContent = info.page;
          pt.textContent = '/' + info.total;
          sec.textContent = info.cover ? '' : info.section || '';
        }
        bar.style.scale = `${c.cl(info.progress).toFixed(4)} 1`;
      };
    },

    // 直线 + 小箭头
    link(x1, y1, x2, y2, o) {
      if (Math.hypot(x2 - x1, y2 - y1) < 4) return '';
      const f = v => v.toFixed(1);
      return `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} ` + o.arrowHead(x1, y1, x2, y2, 12, 0.5);
    },
    // 编号：两位数 Inter；普通列表：小方块；对错沿用勾叉
    marker(mode, i, ok) {
      if (mode === 'number') return `<b class="sg-n">${String(i + 1).padStart(2, '0')}</b>`;
      if (ok === true || ok === false) return null;
      return '<i class="sg-dot"></i>';
    },
  });
})();
