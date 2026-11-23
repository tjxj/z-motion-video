/* 装配说明书 manual */
(() => {
  // 章节页：安全橙整页；结尾页：墨黑
  const ORANGE = {
    '--fg': '#1B1B1B', '--fg2': '#3A2216', '--fg3': '#6B3A22', '--accent': '#1B1B1B', '--band': '#FFFFFF',
    '--kt-bg': '#1B1B1B', '--kt-fg': '#FF5B1F',
    '--line': 'rgba(27,27,27,.25)', '--line-strong': 'rgba(27,27,27,.7)', '--card-bg': '#FFF3EC', '--card-bd': '#1B1B1B',
  };
  const INK = {
    '--fg': '#F5F4EF', '--fg2': '#CFCDC4', '--fg3': '#8E8C85', '--accent': '#FF5B1F', '--band': '#FF5B1F',
    '--kt-bg': '#FF5B1F', '--kt-fg': '#1B1B1B',
    '--line': 'rgba(245,244,239,.2)', '--line-strong': 'rgba(245,244,239,.6)', '--card-bg': '#262626', '--card-bd': '#F5F4EF',
  };

  MV.style({
    // 像翻说明书：新页从右边推进来
    transition: { kind: 'push', dur: 0.6, dirs: ['left'] },
    motion: {
      kicker: { kind: 'wipe', d: 0.5 },
      title: { kind: 'up', d: 0.7, stagger: 0.08, gap: 0.12 },
      big: { kind: 'pop', d: 0.6, stagger: 0.12, gap: 0.12, o: { from: 0.72 } },
      text: { kind: 'fade', d: 0.5, gap: 0.3 },
      item: { kind: 'slideX', d: 0.5, stagger: 0.07, gap: 0.4, o: { dist: -44 } },
      card: { kind: 'pop', d: 0.5, stagger: 0.08, gap: 0.35, o: { from: 0.86 } },
      chip: { kind: 'pop', d: 0.4, stagger: 0.07, gap: 0.25 },
      note: { kind: 'wipe', d: 0.7, gap: 0.4 },
      quote: { kind: 'up', d: 0.7, stagger: 0.16, gap: 0.2 },
    },
    focus: true,
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'plain',

    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'light') return { tone: 'light' };
      if (d.bg === 'orange' || t === 'chapter') return { tone: 'orange', bg: '#FF5B1F', vars: ORANGE };
      if (d.bg === 'dark' || t === 'ending') return { tone: 'dark', bg: '#1B1B1B', vars: INK };
      return { tone: 'light' };
    },

    // 说明书白纸：极淡的十字定位点 + 轻微暗角
    paint(g, W, H, R, u) {
      g.fillStyle = '#F5F4EF';
      g.fillRect(0, 0, W, H);
      const s = 120;
      g.strokeStyle = 'rgba(27,27,27,.08)';
      g.lineWidth = 1.5;
      g.beginPath();
      for (let x = s; x < W; x += s) {
        for (let y = s; y < H; y += s) {
          g.moveTo(x - 6, y); g.lineTo(x + 6, y);
          g.moveTo(x, y - 6); g.lineTo(x, y + 6);
        }
      }
      g.stroke();
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      vg.addColorStop(0, 'rgba(60,50,40,0)');
      vg.addColorStop(1, 'rgba(60,50,40,.06)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
      u.noise(4, 23);
    },

    // 页眉：黑底页码 + 系列名 / 小节；四角裁切标记；左侧刻度尺当进度条
    chrome(c) {
      const top = c.h('div', 'mn-top'), left = c.h('span', 'mn-l'), no = c.h('b', 'mn-no'), sec = c.h('span', 'mn-sec');
      left.append(no, c.h('span', 'mn-ser', c.esc(c.plain(c.story.series || c.story.title || ''))));
      top.append(left, sec);
      const foot = c.h('div', 'mn-foot'), pg = c.h('span', 'mn-pg');
      foot.append(c.h('span', 'mn-by', c.esc(c.plain(c.story.byline || ''))), pg);
      const crops = ['tl', 'tr', 'bl', 'br'].map(k => c.h('i', 'mn-crop ' + k));

      const y0 = c.land ? 110 : 150, L = Math.round(c.H - y0 * 2);
      let d = `M14 0 V${L} `, labels = '';
      for (let k = 0; k <= L; k += 10) {
        const big = k % 100 === 0, mid = k % 50 === 0;
        d += `M14 ${k} H${14 + (big ? 22 : mid ? 15 : 8)} `;
        if (big) labels += `<text x="40" y="${k + 4.5}">${k / 100}</text>`;
      }
      const ruler = c.h('div', 'mn-ruler', `<svg width="64" height="${L}" viewBox="0 0 64 ${L}"><path d="${d}"/>${labels}</svg>`);
      ruler.style.top = y0 + 'px';
      ruler.style.height = L + 'px';
      const fill = c.h('i', 'mn-fill'), ptr = c.h('b', 'mn-ptr');
      ruler.append(fill, ptr);

      c.el.append(...crops, ruler, top, c.h('div', 'mn-rule'), foot);
      let last = -2;
      return info => {
        if (info.i !== last) {
          last = info.i;
          no.textContent = info.page;
          sec.textContent = info.cover ? '' : info.section || '';
          pg.textContent = `P.${info.page} / ${info.total}`;
        }
        const p = c.cl(info.progress);
        ptr.style.translate = `0 ${(p * L).toFixed(1)}px`;
        fill.style.scale = `1 ${p.toFixed(4)}`;
      };
    },

    // 虚线箭头
    link(x1, y1, x2, y2, o) {
      return o.dash(x1, y1, x2, y2, 12, 9) + ' ' + o.arrowHead(x1, y1, x2, y2, 14, 0.55);
    },
    // 编号：黑色小圆；普通列表：橙色三角；对错沿用勾叉图标
    marker(mode, i, ok) {
      if (mode === 'number') return `<b class="mn-n">${i + 1}</b>`;
      if (ok === true || ok === false) return null;
      return '<i class="mn-tri"></i>';
    },
  });
})();
