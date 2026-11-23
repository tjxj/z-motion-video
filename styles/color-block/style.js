/* 撞色海报 color-block */
(() => {
  // 五块底色；场景里写 "bg": "ink|paper|blue|lime|red" 可以指定
  const PAL = {
    ink: { bg: '#111111', fg: '#F4F2EC', fg2: 'rgba(244,242,236,.68)', fg3: 'rgba(244,242,236,.4)', accent: '#D7FF3A', hlfg: '#111111', card: 'rgba(255,255,255,.06)', bd: 'rgba(244,242,236,.9)' },
    paper: { bg: '#EFEDE6', fg: '#111111', fg2: 'rgba(17,17,17,.66)', fg3: 'rgba(17,17,17,.38)', accent: '#2E4BF5', hlfg: '#FFFFFF', card: '#FFFFFF', bd: '#111111' },
    blue: { bg: '#2E4BF5', fg: '#FFFFFF', fg2: 'rgba(255,255,255,.76)', fg3: 'rgba(255,255,255,.46)', accent: '#D7FF3A', hlfg: '#111111', card: 'rgba(255,255,255,.1)', bd: '#FFFFFF' },
    lime: { bg: '#D7FF3A', fg: '#111111', fg2: 'rgba(17,17,17,.7)', fg3: 'rgba(17,17,17,.42)', accent: '#2E4BF5', hlfg: '#FFFFFF', card: 'rgba(255,255,255,.42)', bd: '#111111' },
    red: { bg: '#FF4D3D', fg: '#111111', fg2: 'rgba(17,17,17,.72)', fg3: 'rgba(17,17,17,.44)', accent: '#FFFFFF', hlfg: '#111111', card: 'rgba(255,255,255,.18)', bd: '#111111' },
  };
  const PUNCH = {
    cover: ['ink', 'blue'], chapter: ['blue', 'red', 'lime'], statement: ['lime', 'blue', 'red'],
    bignum: ['blue', 'lime', 'red'], quote: ['red', 'blue', 'lime'], ending: ['ink', 'blue'],
  };

  MV.style({
    transition: { kind: 'push', dur: 0.55, dirs: ['left', 'up'] },
    motion: {
      kicker: { kind: 'wipe', d: 0.45 },
      title: { kind: 'mask', d: 0.6, stagger: 0.08, gap: 0.1 },
      big: { kind: 'slam', d: 0.5, stagger: 0.12, gap: 0.1, o: { amt: 0.25 } },
      text: { kind: 'mask', d: 0.55, gap: 0.3 },
      item: { kind: 'slideX', d: 0.5, stagger: 0.06, gap: 0.4, o: { dist: -90 } },
      card: { kind: 'pop', d: 0.45, stagger: 0.06, gap: 0.35, o: { from: 0.86 } },
      chip: { kind: 'pop', d: 0.36, stagger: 0.06, gap: 0.25 },
      quote: { kind: 'mask', d: 0.7, stagger: 0.16, gap: 0.2 },
      stamp: { kind: 'stamp', d: 0.45, gap: 0.25 },
    },
    subMax: { r34: 15, r916: 13, r169: 24 },
    mediaFrame: 'plain',

    look(d, i, o) {
      const t = o.sc.t;
      let key = d.bg && PAL[d.bg] ? d.bg : null;
      if (!key) {
        const list = PUNCH[t] || [t === 'code' ? 'ink' : 'paper'];
        const n = o.scenes.slice(0, i).filter(s => s.t === t).length;
        key = list[n % list.length];
        // 相邻两页不用同一块彩色底
        const prev = i > 0 ? o.scenes[i - 1]._cb : null;
        if (prev && prev === key && key !== 'paper') key = list.find(k => k !== prev) || (prev === 'ink' ? 'blue' : 'ink');
      }
      o.sc._cb = key;
      const p = PAL[key];
      return {
        tone: key, bg: p.bg, accent: p.accent,
        vars: { '--fg': p.fg, '--fg2': p.fg2, '--fg3': p.fg3, '--hl-fg': p.hlfg, '--card-bg': p.card, '--card-bd': p.bd, '--line-strong': p.bd, '--bgc': p.bg },
      };
    },

    // 很淡的印刷颗粒
    overlay(g, W, H, R, u) {
      g.fillStyle = '#fff';
      g.fillRect(0, 0, W, H);
      u.noise(14, 5);
    },

    chrome(c) {
      const tick = c.h('div', 'cb-tick'), inner = c.h('div', 'cb-tick-in');
      const unitTxt = [c.story.series, c.story.title].filter(Boolean).map(s => c.esc(c.plain(s))).join('<b>◆</b>') + '<b>◆</b>';
      inner.innerHTML = Array.from({ length: 8 }, () => `<span>${unitTxt}</span>`).join('');
      tick.append(inner);
      const pg = c.h('div', 'cb-page'), sec = c.h('div', 'cb-sec');
      c.el.append(tick, pg, sec);
      let uw = 0, last = '';
      return info => {
        if (!uw) uw = inner.firstChild.offsetWidth || 1;
        inner.style.translate = `${(-((info.t * 70) % uw)).toFixed(1)}px 0`;
        const k = info.page + '|' + info.section;
        if (k !== last) {
          last = k;
          pg.innerHTML = `${c.pad2(info.page)}<small>/${c.pad2(info.total)}</small>`;
          sec.textContent = info.section || '';
        }
      };
    },

    link(x1, y1, x2, y2, o) {
      return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} ` + o.arrowHead(x1, y1, x2, y2, 18, 0.6);
    },
    marker(mode, i) {
      if (mode === 'number') return String(i + 1).padStart(2, '0');
      return null;
    },
  });
})();
