/* 购物小票 receipt · 热敏打印小票 / 柜台账单风格 */
(() => {
  'use strict';
  const { cl, lerp, EZ, esc, rich, plain, pad2, rough, dash, arrowHead } = MV.util;
  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
  const norm = (it, key = 'text') => (it == null ? {} : typeof it === 'object' ? it : { [key]: String(it) });
  const linesOf = v => arr(v).flatMap(s => String(s).split('\n')).filter(s => s.trim() !== '');
  const isHot = (d, i, it) => !!(it && it.on) || d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
  const focusOf = (d, api) => d.focus ?? !!api.style.focus;
  const nc = n => ' n' + Math.max(1, Math.min(n, 9));

  // 判断备注是否适合右对齐放在点线右侧（如价格 ¥25、约 ¥3.8、+10%、250 天、292 杯等短数值）
  const isRightTag = s => {
    const t = plain(s || '').trim();
    if (!t || t.length > 12) return false;
    return /^(?:[¥￥$€£+\-≈~约共]\s*)*\d/.test(t) || /[¥￥$元%天杯年项]$/.test(t);
  };

  // ───── 自定义动效：逐行热敏打印 + 纸卷步进吐纸 ─────
  MV.kinds.printLine = {
    f(el, p, o) {
      if (p <= 0) {
        el.style.opacity = 0;
        el.style.translate = `0 ${-(o.dist ?? 12)}px`;
        el.style.clipPath = 'inset(-16px -36px 100% -36px)';
        return;
      }
      const e = EZ.o3(p);
      el.style.opacity = cl(p * 4.5).toFixed(4);
      el.style.translate = `0 ${((1 - e) * -(o.dist ?? 12)).toFixed(2)}px`;
      el.style.clipPath = p >= 1 ? 'none' : `inset(-16px -36px ${((1 - e) * 100).toFixed(2)}% -36px)`;
    },
  };

  MV.kinds.paperFeed = {
    f(el, p, o) {
      const times = o.times || [];
      const maxShift = o.maxShift ?? 28;
      if (!times.length || p >= 1) {
        el.style.translate = '0 0px';
        return;
      }
      const lt = o.t0 + p * o.dur;
      let done = 0;
      for (let i = 0; i < times.length; i++) {
        done += EZ.o3(cl((lt - times[i]) / 0.28));
      }
      const frac = cl(done / times.length);
      const y = -(1 - frac) * maxShift;
      el.style.translate = `0 ${y.toFixed(2)}px`;
    },
  };

  // ───── 小票通用构件：锯齿撕边、店名抬头、条形码、红笔手绘圆圈 ─────
  function addEdges(api, paper, cls = '') {
    api.add(paper, 'div', 'rc-edge top' + (cls ? ' ' + cls : ''));
    const inner = api.add(paper, 'div', 'rc-inner');
    api.add(paper, 'div', 'rc-edge bot' + (cls ? ' ' + cls : ''));
    return inner;
  }

  function storeNameOf(api) {
    const raw = plain(api.story.masthead || api.story.series || api.story.title || 'THERMAL RECEIPT').trim();
    return raw.length > 16 ? raw.slice(0, 16) : raw;
  }

  function timestampOf(api) {
    const idx = api.sc.i;
    const min = 5 + idx * 3;
    const hh = 10 + Math.floor(min / 60);
    const mm = min % 60;
    const day = plain(api.story.date || '2026-11-23').trim().slice(0, 16);
    return `${day}  ${pad2(hh)}:${pad2(mm)}`;
  }

  function addMasthead(api, parent, opts = {}) {
    const mh = api.add(parent, 'div', 'rc-mh' + (opts.compact ? ' compact' : ''));
    if (!opts.compact) {
      api.add(mh, 'div', 'rc-stars', '* * * * * * * * * * * * * * * *');
      api.add(mh, 'div', 'rc-store', esc(opts.store || storeNameOf(api)));
    }
    const meta = api.add(mh, 'div', 'rc-meta-row');
    api.add(meta, 'span', 'rc-date', opts.left || `DATE ${timestampOf(api)}`);
    api.add(meta, 'span', 'rc-no', opts.right || `NO.#${String(api.sc.i + 1).padStart(3, '0')}`);
    api.add(mh, 'div', 'rc-rule dashed');
    return mh;
  }

  function makeBarcodeSvg(api, barsCount = 52) {
    const R = api.R;
    const w = 360, h = 44;
    let x = 10;
    let rects = '';
    const pattern = [];
    for (let i = 0; i < barsCount; i++) {
      const guard = i < 3 || i >= barsCount - 3 || (i >= Math.floor(barsCount / 2) - 1 && i <= Math.floor(barsCount / 2) + 1);
      const bw = guard ? 2.6 : (R() < 0.25 ? 5.2 : R() < 0.6 ? 3.2 : 1.7);
      const gap = guard ? 2.4 : (R() < 0.35 ? 4.4 : 2.3);
      pattern.push([bw, gap, guard]);
    }
    const tot = pattern.reduce((a, b) => a + b[0] + b[1], 0);
    const scale = (w - 20) / Math.max(1, tot);
    for (const [bw, gap, guard] of pattern) {
      const rw = Math.max(1.2, bw * scale);
      const bh = guard ? h : h - 5;
      rects += `<rect x="${x.toFixed(1)}" y="0" width="${rw.toFixed(1)}" height="${bh}"/>`;
      x += (bw + gap) * scale;
    }
    return `<svg class="rc-bc-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${rects}</svg>`;
  }

  function barcodeDigits(api, suffix) {
    const R = api.R;
    const a = String(130 + api.sc.i * 7).padStart(4, '0');
    const b = String(Math.floor(1000 + R() * 8999));
    const c = suffix || String(Math.floor(1000 + R() * 8999));
    return `013 ${a} ${b} ${c}`;
  }

  function addBarcodeFoot(api, parent, opts = {}) {
    const ft = api.add(parent, 'div', 'rc-foot' + (opts.compact ? ' compact' : '') + (opts.big ? ' big' : ''));
    if (!opts.noRule) api.add(ft, 'div', 'rc-rule dashed');
    const bc = api.add(ft, 'div', 'rc-bc', makeBarcodeSvg(api, opts.bars || 52));
    api.add(bc, 'div', 'rc-bc-num', esc(opts.code || barcodeDigits(api)));
    if (opts.thanks !== false) {
      api.add(ft, 'div', 'rc-thanks', esc(opts.thanks || '*** 谢谢惠顾 · THANK YOU ***'));
    }
    return ft;
  }

  // 在目标元素周围加手绘红笔椭圆圈（自动跟随父节拍描线）
  function attachRedCircle(api, hostEl, targetEl, parentBeat, opt = {}) {
    api.layout(() => {
      const box = api.rel(targetEl, hostEl);
      if (box.w < 10 || box.h < 10) return;
      const padX = opt.padX ?? 26;
      const padY = opt.padY ?? 14;
      const w = box.w + padX * 2;
      const h = box.h + padY * 2;
      const svgEl = api.svg('svg', {
        class: 'rc-red-circle',
        viewBox: `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`,
        width: w.toFixed(1),
        height: h.toFixed(1),
      });
      svgEl.style.left = `${(box.x - padX).toFixed(1)}px`;
      svgEl.style.top = `${(box.y - padY).toFixed(1)}px`;
      const d = rough.circle(w / 2, h / 2, w * 0.48, h * 0.46, api.R, 1.12, 0.05);
      const p = api.svg('path', { d });
      svgEl.appendChild(p);
      hostEl.appendChild(svgEl);
      if (parentBeat) {
        (parentBeat.extra = parentBeat.extra || []).push({ el: p, kind: 'draw', delay: opt.delay ?? 0.25, d: 0.7 });
      }
    });
  }

  // 建立一张标准单联小票
  function createPaper(api, cls = '', opts = {}) {
    const paper = api.add(opts.parent || api.root, 'div', 'rc-paper' + (cls ? ' ' + cls : ''));
    const inner = addEdges(api, paper, opts.edgeCls || '');
    if (opts.masthead !== false) addMasthead(api, inner, opts.mhOpts || {});
    return { paper, inner };
  }

  // 16:9 双联桌面：左抬头联 + 右主内容联
  function createTwoSlips(api, cls = '', opts = {}) {
    const wrap = api.add(api.root, 'div', 'rc-desk-2col' + (cls ? ' ' + cls : ''));
    const leftPaper = api.add(wrap, 'div', 'rc-paper rc-stub');
    const leftInner = addEdges(api, leftPaper);
    addMasthead(api, leftInner, opts.leftMh || {});
    const rightPaper = api.add(wrap, 'div', 'rc-paper rc-main');
    const rightInner = addEdges(api, rightPaper);
    if (opts.rightMh !== false) {
      addMasthead(api, rightInner, Object.assign({ compact: true, left: opts.rightLeft || 'ITEMIZED SLIP · 明细联', right: opts.rightRight || `PG.${pad2(api.sc.i + 1)}` }, opts.rightMh || {}));
    }
    return { wrap, leftPaper, leftInner, rightPaper, rightInner };
  }

  // 通用列表渲染（带点线引导与右侧价格/标记）
  function buildReceiptList(d, api, parent, items, mode) {
    const ul = api.add(parent, 'ul', 'list rc-list m-' + mode + nc(items.length));
    items.forEach((it, i) => {
      const ok = it.ok != null ? !!it.ok : mode === 'check' ? true : mode === 'cross' ? false : undefined;
      const hot = isHot(d, i, it);
      const li = api.add(ul, 'li', 'item rc-item' + (ok === true ? ' ok' : ok === false ? ' no' : '') + (hot ? ' on' : ''));
      const row = api.add(li, 'div', 'rc-row-main');
      api.add(row, 'span', 'mk', api.marker(mode, i, ok));
      api.add(row, 'span', 'tx', rich(it.text ?? it.title));
      const rightVal = it.right ?? (isRightTag(it.note) ? it.note : null);
      api.add(row, 'span', 'rc-dots');
      if (rightVal) {
        api.add(row, 'span', 'rc-val', rich(rightVal));
      } else if (ok === true || ok === false) {
        api.add(row, 'span', 'rc-val muted', ok ? 'OK' : 'NO');
      }
      if (it.note && !rightVal) {
        api.add(li, 'div', 'nt rc-subline', rich(it.note));
      }
      const b = api.beat(li, 'item', it.at, { auto: it.text ?? it.title, spread: true, focus: focusOf(d, api) });
      api.marks(li, b);
    });
    return ul;
  }

  // 小票底部汇总栏 + 条码
  function addListSummary(api, parent, count, noteText, noteAt) {
    const sum = api.add(parent, 'div', 'rc-sum-row');
    api.add(sum, 'span', 'rc-sum-l', `SUBTOTAL · 共 ${count} 项`);
    api.add(sum, 'span', 'rc-sum-r', 'VERIFIED ✓');
    api.beat(sum, 'note', null, { gap: 0.15 });
    if (noteText) api.note(parent, noteText, noteAt);
  }

  // ───── 风格主配置 ─────
  MV.style({
    transition: { kind: 'push', dur: 0.55, dirs: ['up'] },
    motion: {
      kicker: { kind: 'printLine', d: 0.36, gap: 0 },
      title: { kind: 'printLine', d: 0.5, stagger: 0.08, gap: 0.08, o: { dist: 14 } },
      big: { kind: 'printLine', d: 0.55, stagger: 0.1, gap: 0.1, o: { dist: 16 } },
      text: { kind: 'printLine', d: 0.44, gap: 0.22, o: { dist: 10 } },
      item: { kind: 'printLine', d: 0.42, stagger: 0.05, gap: 0.34, o: { dist: 10 } },
      card: { kind: 'printLine', d: 0.46, stagger: 0.06, gap: 0.3, o: { dist: 12 } },
      num: { kind: 'printLine', d: 0.45, gap: 0.2 },
      count: { kind: 'count', d: 0.95 },
      chip: { kind: 'printLine', d: 0.34, stagger: 0.06, gap: 0.2, o: { dist: 8 } },
      image: { kind: 'printLine', d: 0.58, gap: 0.22, o: { dist: 14 } },
      bar: { kind: 'printLine', d: 0.36, gap: 0.3, o: { dist: 8 } },
      grow: { kind: 'grow', d: 0.78 },
      mark: { kind: 'mark', d: 0.46 },
      stamp: { kind: 'stamp', d: 0.44, gap: 0.25 },
      line: { kind: 'draw', d: 0.5 },
      quote: { kind: 'fade', d: 0.65, stagger: 0.18, gap: 0.18 },
      formula: { kind: 'printLine', d: 0.55, gap: 0.22 },
      code: { kind: 'type', d: 0.5, gap: 0.22 },
      note: { kind: 'printLine', d: 0.42, gap: 0.25, o: { dist: 8 } },
    },
    focus: true,
    subMax: { r34: 16, r916: 14, r169: 26 },
    mediaFrame: 'plain',
    kenBurns: 0.025,
    quoteMark: '“',

    look(d, i, o) {
      if (d.bg === 'wood') return { tone: 'light', bg: '#D9CDB8' };
      if (d.bg === 'dark') return { tone: 'dark', bg: '#2C3430', vars: { '--desk-ink': 'rgba(250,250,247,.75)' } };
      return { tone: 'light' };
    },

    // 灰绿色哑光柜台桌面（左右柔光、无上下明显暗角，确保 push up 转场无缝）
    paint(g, W, H, R, u) {
      g.fillStyle = '#B9C6BE';
      g.fillRect(0, 0, W, H);

      // 左右轻微柜台光影（上下完全均匀，避免 push up 出现横缝）
      const lg = g.createLinearGradient(0, 0, W, 0);
      lg.addColorStop(0, 'rgba(38, 52, 45, .13)');
      lg.addColorStop(0.18, 'rgba(255, 255, 255, .04)');
      lg.addColorStop(0.5, 'rgba(255, 255, 255, .09)');
      lg.addColorStop(0.82, 'rgba(255, 255, 255, .04)');
      lg.addColorStop(1, 'rgba(38, 52, 45, .14)');
      g.fillStyle = lg;
      g.fillRect(0, 0, W, H);

      // 极淡桌面材质点阵 / 细砂纹理
      g.fillStyle = 'rgba(40, 54, 46, .045)';
      const step = 48;
      for (let x = step / 2; x < W; x += step) {
        for (let y = step / 2; y < H; y += step) {
          g.fillRect(x - 1, y - 1, 2, 2);
        }
      }

      // 细微水平柜台纹理线（自然石材/哑光台面）
      for (let i = 0; i < 240; i++) {
        const x = R() * W, y = R() * H, len = 18 + R() * 70;
        g.strokeStyle = R() > 0.5 ? 'rgba(255,255,255,.04)' : 'rgba(35,48,42,.035)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + len, y);
        g.stroke();
      }
      u.noise(5, 37);
    },

    // 页眉页脚：POS 终端状态栏 + 虚线进纸进度条 + 底部台面署名
    chrome(c) {
      const top = c.h('div', 'rc-ch-top');
      const left = c.h('div', 'rc-ch-l');
      const led = c.h('i', 'rc-led');
      const pos = c.h('span', 'rc-pos', 'POS-01');
      const sec = c.h('span', 'rc-sec');
      left.append(led, pos, sec);
      const right = c.h('div', 'rc-ch-r');
      const pg = c.h('span', 'rc-pg');
      const cur = c.h('span', 'rc-cursor', '▮');
      right.append(pg, cur);
      top.append(left, right);

      const prog = c.h('div', 'rc-ch-prog');
      const track = c.h('div', 'rc-ch-track');
      const fill = c.h('i', 'rc-ch-fill');
      const head = c.h('b', 'rc-ch-head');
      track.append(fill, head);
      prog.append(track);

      const foot = c.h('div', 'rc-ch-foot');
      const by = c.h('span', 'rc-ch-by', c.esc(c.plain(c.story.byline || '')));
      const roll = c.h('span', 'rc-ch-roll');
      foot.append(by, roll);

      c.el.append(top, prog, foot);
      let last = -2;
      return info => {
        if (info.i !== last) {
          last = info.i;
          sec.textContent = info.cover ? c.plain(c.story.series || c.story.title || '') : (info.section || c.plain(c.story.series || ''));
          pg.textContent = info.cover ? `NEW ORDER · ${info.total}P` : `NO.${info.page} / ${info.total}`;
        }
        const p = c.cl(info.progress);
        fill.style.scale = `${p.toFixed(4)} 1`;
        head.style.left = `${(p * 100).toFixed(2)}%`;
        roll.textContent = `THERMAL 80MM · ${String(Math.round(p * 100)).padStart(3, '0')}%`;
        // 确定性光标闪烁
        const blink = info.cover ? 1 : (Math.floor(info.t * 2.4) % 2 === 0 ? 1 : 0.22);
        cur.style.opacity = blink;
        led.style.opacity = blink > 0.5 ? 1 : 0.4;
      };
    },

    // 列表标记
    marker(mode, i, ok) {
      if (mode === 'number') return `<b class="rc-idx">${pad2(i + 1)}</b>`;
      if (ok === true) return '<b class="rc-ok">[✓]</b>';
      if (ok === false) return '<b class="rc-no">[×]</b>';
      return '<b class="rc-bul">*</b>';
    },

    // 步骤编号
    badge(i) {
      return `<span>${pad2(i + 1)}</span>`;
    },

    // 虚线打印箭头
    link(x1, y1, x2, y2, o) {
      return o.dash(x1, y1, x2, y2, 9, 7) + ' ' + o.arrowHead(x1, y1, x2, y2, 13, 0.55);
    },

    // ───── 按小票版式语法重写的 17 个模板 ─────
    templates: {
      // 1. 封面：完整海报级小票 + 巨型合计框（带红笔手绘圆圈）+ 底部条形码
      cover(d, api) {
        api.root.classList.add('center');
        const tags = arr(d.tags ?? d.chips);
        const hasTotal = !!(d.meta && String(d.meta).trim());

        if (api.land) {
          // 16:9 左右双联：左主小票（店名 + 标题 + 副标题 + 合计），右订单副联（明细标签 + 条形码 + 印章）
          const wrap = api.add(api.root, 'div', 'rc-desk-2col rc-cover-2col');
          const leftPaper = api.add(wrap, 'div', 'rc-paper rc-cover-main');
          const leftIn = addEdges(api, leftPaper);
          addMasthead(api, leftIn, { right: 'POS #01 · RECEIPT' });
          api.head({ big: true, parent: leftIn });
          if (d.image) {
            api.media(d.image, { parent: leftIn, frame: d.frame, at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
          }

          const rightPaper = api.add(wrap, 'div', 'rc-paper rc-cover-side');
          const rightIn = addEdges(api, rightPaper);
          addMasthead(api, rightIn, { compact: true, left: 'ORDER SUMMARY', right: `ITEMS ${pad2(Math.max(1, tags.length))}` });

          if (hasTotal) {
            const totBox = api.add(rightIn, 'div', 'rc-hero-total');
            api.add(totBox, 'div', 'rc-ht-label', 'TOTAL · 年度合计');
            const totVal = api.add(totBox, 'div', 'rc-ht-val');
            const { val } = api.num(totVal, d.meta);
            api.fitBox(totVal);
            const tb = api.beat(totBox, 'big', d.metaAt, { with: val ? [[val, 'count', 0.08]] : [] });
            attachRedCircle(api, totBox, totVal, tb, { padX: 28, padY: 16, delay: 0.3 });
          }

          if (tags.length) {
            const tbl = api.add(rightIn, 'div', 'rc-cover-tags');
            tags.forEach((tg, i) => {
              const row = api.add(tbl, 'div', 'rc-ct-row' + (isHot(d, i) ? ' hot' : ''));
              api.add(row, 'span', 'rc-ct-i', pad2(i + 1));
              api.add(row, 'span', 'rc-ct-t', rich(tg));
              api.add(row, 'span', 'rc-dots');
              api.add(row, 'span', 'rc-ct-s', isHot(d, i) ? '★' : 'OK');
              api.beat(row, 'chip', i === 0 ? (d.tagsAt ?? d.chipsAt) : null, { auto: tg, gap: 0.14 });
            });
          } else {
            const st = api.add(rightIn, 'div', 'rc-cover-status', 'STATUS: PRINTED · READY');
            api.beat(st, 'note', null);
          }

          addBarcodeFoot(api, rightIn, { big: true, code: barcodeDigits(api, '2026') });
          return;
        }

        // 3:4 & 9:16：居中标志性长条小票
        const { paper, inner } = createPaper(api, 'rc-cover-paper', { mhOpts: { right: 'POS #01' } });
        api.head({ big: true, parent: inner });
        if (d.image) {
          api.media(d.image, { parent: inner, frame: d.frame, at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
        }

        api.add(inner, 'div', 'rc-rule double');

        if (hasTotal) {
          const totBox = api.add(inner, 'div', 'rc-hero-total');
          const row = api.add(totBox, 'div', 'rc-ht-row');
          api.add(row, 'span', 'rc-ht-label', 'TOTAL\n合计');
          const totVal = api.add(row, 'span', 'rc-ht-val');
          const { val } = api.num(totVal, d.meta);
          api.fitBox(totVal);
          const tb = api.beat(totBox, 'big', d.metaAt, { with: val ? [[val, 'count', 0.08]] : [] });
          attachRedCircle(api, totBox, totVal, tb, { padX: 26, padY: 14, delay: 0.3 });
          api.add(inner, 'div', 'rc-rule dashed');
        }

        if (tags.length) {
          const tbl = api.add(inner, 'div', 'rc-cover-tags');
          tags.forEach((tg, i) => {
            const row = api.add(tbl, 'div', 'rc-ct-row' + (isHot(d, i) ? ' hot' : ''));
            api.add(row, 'span', 'rc-ct-i', pad2(i + 1));
            api.add(row, 'span', 'rc-ct-t', rich(tg));
            api.add(row, 'span', 'rc-dots');
            api.add(row, 'span', 'rc-ct-s', isHot(d, i) ? '★' : 'OK');
            api.beat(row, 'chip', i === 0 ? (d.tagsAt ?? d.chipsAt) : null, { auto: tg, gap: 0.14 });
          });
        }

        addBarcodeFoot(api, inner, { big: true, code: barcodeDigits(api, '2026') });
      },

      // 2. 章节页：黑底反白联次条 + 大标题 + 条形码
      chapter(d, api) {
        api.root.classList.add('center');
        const n = d.num ?? pad2(api.sc.chapNo || 1);
        if (api.land) {
          const wrap = api.add(api.root, 'div', 'rc-desk-2col rc-chap-2col');
          const lp = api.add(wrap, 'div', 'rc-paper rc-chap-stub');
          const li = addEdges(api, lp);
          addMasthead(api, li, { compact: true, left: 'NEW RECEIPT ROLL', right: 'CUT HERE ✂' });
          if (n !== false && n !== '') {
            const band = api.add(li, 'div', 'rc-chap-band');
            api.add(band, 'div', 'rc-chap-tag', 'SECTION · 联次');
            const ne = api.add(band, 'div', 'chap-num', esc(n));
            api.beat(band, 'big', d.numAt);
          }
          addBarcodeFoot(api, li, { compact: true, thanks: '--- 换联分隔 ---' });

          const rp = api.add(wrap, 'div', 'rc-paper rc-chap-main');
          const ri = addEdges(api, rp);
          addMasthead(api, ri, { right: `SEC #${esc(n || '01')}` });
          api.head({ big: true, parent: ri });
          api.note(ri, d.note, d.noteAt);
          return;
        }

        const { inner } = createPaper(api, 'rc-chap-paper', { mhOpts: { right: `SEC #${esc(n || '01')}` } });
        if (n !== false && n !== '') {
          const band = api.add(inner, 'div', 'rc-chap-band');
          api.add(band, 'div', 'rc-chap-tag', 'SECTION · 联次');
          api.add(band, 'div', 'chap-num', esc(n));
          api.beat(band, 'big', d.numAt);
        }
        api.head({ big: true, parent: inner });
        api.note(inner, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true, thanks: '*** 继续打印 · NEXT ***' });
      },

      // 3. 一句话：账单提示联
      statement(d, api) {
        api.root.classList.add('center');
        const ls = linesOf(d.text ?? d.lines);
        if (api.land) {
          const { leftInner, rightInner } = createTwoSlips(api, 'rc-stmt-2col', {
            rightLeft: 'RECEIPT MEMO · 提示联',
            rightRight: 'IMPORTANT',
          });
          api.add(leftInner, 'div', 'rc-memo-badge', '★ NOTICE / 账单提示');
          api.head({ parent: leftInner });
          api.note(leftInner, d.note, d.noteAt);
          addBarcodeFoot(api, leftInner, { compact: true });

          const box = api.add(rightInner, 'div', 'say rc-say');
          ls.forEach((l, i) => {
            const e = api.add(box, 'div', 'sl', rich(l));
            const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, gap: 0.16 });
            api.marks(e, b);
          });
          api.add(rightInner, 'div', 'rc-rule double');
          return;
        }

        const { inner } = createPaper(api, 'rc-stmt-paper');
        api.add(inner, 'div', 'rc-memo-badge', '★ NOTICE / 账单提示');
        api.head({ parent: inner });
        if (ls.length) {
          const box = api.add(inner, 'div', 'say rc-say');
          ls.forEach((l, i) => {
            const e = api.add(box, 'div', 'sl', rich(l));
            const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, gap: 0.16 });
            api.marks(e, b);
          });
        }
        api.note(inner, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true });
      },

      // 4. 大数字：合计栏（TOTAL + 手绘红笔圆圈）
      bignum(d, api) {
        api.root.classList.add('center');
        const v = d.value ?? d.num;

        const buildTotal = (parent) => {
          const bn = api.add(parent, 'div', 'bn rc-bn');
          api.add(bn, 'div', 'rc-bn-tag', 'TOTAL · 合计金额 / 数值');
          const box = api.add(bn, 'div', 'rc-bn-box');
          const row = api.add(box, 'div', 'bn-row');
          const { wrap, val } = api.num(row, v);
          if (d.unit) api.add(row, 'span', 'bn-u', rich(d.unit));
          api.fitBox(row);
          const b = api.beat(row, 'big', d.valueAt, {
            auto: v != null ? String(v) : null,
            with: val ? [[val, 'count', 0]] : [],
          });
          attachRedCircle(api, box, wrap || row, b, { padX: 22, padY: 14, delay: 0.35 });
          return bn;
        };

        if (api.land) {
          const { leftInner, rightInner } = createTwoSlips(api, 'rc-bn-2col', {
            rightLeft: 'TOTAL SUMMARY · 合计联',
            rightRight: 'VERIFIED',
          });
          api.head({ parent: leftInner });
          if (d.label) {
            const l = api.add(leftInner, 'div', 'bn-l', rich(d.label));
            const b = api.beat(l, 'text', d.labelAt, { auto: d.label });
            api.marks(l, b);
          }
          api.note(leftInner, d.note, d.noteAt);
          addBarcodeFoot(api, leftInner, { compact: true });

          buildTotal(rightInner);
          api.add(rightInner, 'div', 'rc-rule double');
          return;
        }

        const { inner } = createPaper(api, 'rc-bn-paper');
        api.head({ parent: inner });
        api.add(inner, 'div', 'rc-rule double');
        const bn = buildTotal(inner);
        api.add(inner, 'div', 'rc-rule double');
        if (d.label) {
          const l = api.add(inner, 'div', 'bn-l', rich(d.label));
          const b = api.beat(l, 'text', d.labelAt, { auto: d.label });
          api.marks(l, b);
        }
        api.note(inner, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true });
      },

      // 5. 数据卡：小计明细账单
      stats(d, api) {
        const items = arr(d.items).map(it => norm(it, 'value'));

        const fillStats = (parent) => {
          const box = api.add(parent, 'div', 'stats rc-stats' + nc(items.length));
          const cols = d.cols || (api.land && items.length >= 4 ? 2 : 1);
          box.style.setProperty('--cols', cols);
          if (cols === 1) box.classList.add('rows');
          items.forEach((it, i) => {
            const s = api.add(box, 'div', 'stat rc-stat' + (isHot(d, i, it) ? ' on' : ''));
            const tx = api.add(s, 'div', 'stat-tx');
            if (it.label) api.add(tx, 'div', 'stat-l', rich(it.label));
            if (it.note) api.add(tx, 'div', 'stat-n', rich(it.note));
            if (cols === 1) api.add(s, 'span', 'rc-dots');
            const v = api.add(s, 'div', 'stat-v');
            const { val } = api.num(v, it.value);
            if (it.unit) api.add(v, 'span', 'stat-u', rich(it.unit));
            api.fitBox(v);
            const b = api.beat(s, 'card', it.at, {
              auto: [it.label, it.value],
              spread: true,
              focus: focusOf(d, api),
              with: val ? [[val, 'count', 0.05]] : [],
            });
            api.marks(tx, b);
          });
        };

        if (api.land && d.title) {
          const { leftInner, rightInner } = createTwoSlips(api, 'rc-stats-2col', { rightLeft: 'SUBTOTAL BREAKDOWN · 小计明细' });
          api.head({ parent: leftInner });
          api.note(leftInner, d.note, d.noteAt);
          addBarcodeFoot(api, leftInner, { compact: true });
          const body = api.add(rightInner, 'div', 'rc-body');
          fillStats(body);
          addListSummary(api, rightInner, items.length);
          return;
        }

        const { inner } = createPaper(api, 'rc-stats-paper');
        api.head({ parent: inner });
        api.add(inner, 'div', 'rc-rule dashed');
        const body = api.add(inner, 'div', 'rc-body');
        fillStats(body);
        addListSummary(api, inner, items.length, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true });
      },

      // 6. 列表：小票商品明细
      list(d, api) {
        const items = arr(d.items).map(it => norm(it));
        const mode = d.mode || (items.some(it => it.ok != null) ? 'check' : 'bullet');

        if (api.land && d.title) {
          const { leftInner, rightInner } = createTwoSlips(api, 'rc-list-2col', { rightLeft: 'ITEM / DESCRIPTION', rightRight: 'AMT' });
          api.head({ parent: leftInner });
          api.note(leftInner, d.note, d.noteAt);
          addBarcodeFoot(api, leftInner, { compact: true });
          const body = api.add(rightInner, 'div', 'rc-body');
          buildReceiptList(d, api, body, items, mode);
          addListSummary(api, rightInner, items.length);
          return;
        }

        const { inner } = createPaper(api, 'rc-list-paper');
        api.head({ parent: inner });
        const colHd = api.add(inner, 'div', 'rc-col-hd');
        api.add(colHd, 'span', '', 'ITEM · 明细');
        api.add(colHd, 'span', '', 'PRICE / TAG');
        const body = api.add(inner, 'div', 'rc-body');
        buildReceiptList(d, api, body, items, mode);
        addListSummary(api, inner, items.length, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true });
      },

      // 7. 步骤：下单打印流程
      steps(d, api) {
        const items = arr(d.items).map(it => norm(it, 'title'));
        const fillSteps = (parent) => {
          const box = api.add(parent, 'div', 'steps col rc-steps' + nc(items.length));
          const links = api.svg('svg', { class: 'links' });
          box.appendChild(links);
          const beats = [], badges = [];
          items.forEach((it, i) => {
            const st = api.add(box, 'div', 'step rc-step' + (isHot(d, i, it) ? ' on' : ''));
            badges.push(api.add(st, 'div', 'badge', api.badge(i, it)));
            const tx = api.add(st, 'div', 'st-tx');
            api.add(tx, 'div', 'st-t', rich(it.title ?? it.text));
            if (it.title && it.text) api.add(tx, 'div', 'st-n', rich(it.text));
            const b = api.beat(st, 'card', it.at, { auto: it.title ?? it.text, spread: true, focus: focusOf(d, api) });
            api.marks(tx, b);
            beats.push(b);
          });
          api.layout(() => {
            links.innerHTML = '';
            for (let i = 0; i + 1 < badges.length; i++) {
              const a = api.rel(badges[i], box), c = api.rel(badges[i + 1], box), g = 8;
              const x1 = a.cx, y1 = a.b + g, x2 = c.cx, y2 = c.y - g;
              if (Math.hypot(x2 - x1, y2 - y1) < 8) continue;
              const p = api.svg('path', { d: api.link(x1, y1, x2, y2, i) });
              links.appendChild(p);
              (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.28 });
            }
          });
        };

        if (api.land && d.title) {
          const { leftInner, rightInner } = createTwoSlips(api, 'rc-steps-2col', { rightLeft: 'ORDER FLOW · 流程联' });
          api.head({ parent: leftInner });
          api.note(leftInner, d.note, d.noteAt);
          addBarcodeFoot(api, leftInner, { compact: true });
          const body = api.add(rightInner, 'div', 'rc-body');
          fillSteps(body);
          return;
        }

        const { inner } = createPaper(api, 'rc-steps-paper');
        api.head({ parent: inner });
        api.add(inner, 'div', 'rc-rule dashed');
        const body = api.add(inner, 'div', 'rc-body');
        fillSteps(body);
        api.note(inner, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true });
      },

      // 8. 卡片：小票优惠券 / 分联卡
      cards(d, api) {
        const items = arr(d.items).map(it => norm(it, 'title'));
        const fillCards = (parent) => {
          const box = api.add(parent, 'div', 'cards rc-cards' + nc(items.length));
          const cols = d.cols || (items.length <= 3 && !api.land ? 1 : 2);
          box.style.setProperty('--cols', cols);
          if (cols === 1) box.classList.add('rows');
          items.forEach((it, i) => {
            const c = api.add(box, 'div', 'card rc-coupon' + (isHot(d, i, it) ? ' on' : ''));
            const k = it.tag ?? it.k ?? it.icon ?? (d.index === false ? null : pad2(i + 1));
            const topBar = api.add(c, 'div', 'rc-cp-top');
            api.add(topBar, 'span', 'card-k', it.icon ? api.icon(it.icon) || esc(it.icon) : rich(k || pad2(i + 1)));
            api.add(topBar, 'span', 'rc-cp-cut', isHot(d, i, it) ? '★ HOT' : '✂ COUPON');
            const tx = api.add(c, 'div', 'card-tx');
            if (it.title) api.add(tx, 'div', 'card-t', rich(it.title));
            if (it.text) api.add(tx, 'div', 'card-x', rich(it.text));
            const b = api.beat(c, 'card', it.at, {
              auto: it.tag != null ? [it.tag, it.title ?? it.text] : it.title ?? it.text,
              spread: true,
              focus: focusOf(d, api),
            });
            api.marks(tx, b);
          });
        };

        if (api.land && d.title) {
          const { leftInner, rightInner } = createTwoSlips(api, 'rc-cards-2col', { rightLeft: 'COUPON STUBS · 分联卡' });
          api.head({ parent: leftInner });
          api.note(leftInner, d.note, d.noteAt);
          addBarcodeFoot(api, leftInner, { compact: true });
          const body = api.add(rightInner, 'div', 'rc-body');
          fillCards(body);
          return;
        }

        const { inner } = createPaper(api, 'rc-cards-paper');
        api.head({ parent: inner });
        api.add(inner, 'div', 'rc-rule dashed');
        const body = api.add(inner, 'div', 'rc-body');
        fillCards(body);
        api.note(inner, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true });
      },

      // 9. 左右对比：两张锯齿小票并排摊在桌面上！
      compare(d, api) {
        const headBand = api.add(api.root, 'div', 'rc-cmp-head');
        api.head({ parent: headBand });

        const body = api.body('rc-cmp-body');
        const g = api.add(body, 'div', 'cmp rc-cmp n2');

        const makeSideReceipt = (raw, cls, tagDef) => {
          const s = norm(raw, 'label');
          const el = api.add(g, 'div', 'side rc-paper rc-cmp-slip ' + cls + (s.win ? ' win' : ''));
          const inn = addEdges(api, el);
          const mh = api.add(inn, 'div', 'rc-cmp-mh');
          api.add(mh, 'span', 'side-k', rich(s.tag || tagDef));
          api.add(mh, 'span', 'rc-cmp-no', cls === 'left' ? '#A01' : '#B02');

          const head = api.add(inn, 'div', 'side-h');
          if (s.label) api.add(head, 'div', 'side-l', rich(s.label));
          let val = null;
          if (s.value != null && s.value !== '') {
            const v = api.add(head, 'div', 'side-v');
            val = api.num(v, s.value).val;
            if (s.unit) api.add(v, 'span', 'side-u', rich(s.unit));
            api.fitBox(v);
          }
          api.add(inn, 'div', 'rc-rule dashed');

          const pts = [];
          if (s.points) {
            const ul = api.add(inn, 'ul', 'side-p');
            arr(s.points).forEach(p => {
              const pp = norm(p);
              const ok = pp.ok;
              const li = api.add(ul, 'li', ok === false ? 'no' : ok === true ? 'ok' : '');
              api.add(li, 'span', 'mk', ok === false ? '[×]' : ok === true ? '[✓]' : '*');
              api.add(li, 'span', 'tx', rich(pp.text));
              pts.push({ li, pp });
            });
          }

          if (s.win) {
            api.add(inn, 'div', 'rc-win-tag', '★ 账单更低 / WIN');
          }
          addBarcodeFoot(api, inn, { compact: true, thanks: false, bars: 32, code: cls === 'left' ? '013-A-0001' : '013-B-0002' });
          return { el, head, val, pts, s };
        };

        const L = makeSideReceipt(d.left || {}, 'left', 'RECEIPT A');
        const vs = api.add(g, 'div', 'vs rc-vs', esc(d.vs ?? 'VS'));
        const Rt = makeSideReceipt(d.right || {}, 'right', 'RECEIPT B');

        const run = (S, key) => {
          const b = api.beat(S.el, 'card', S.s.at ?? key, { auto: S.s.label, with: S.val ? [[S.val, 'count', 0.06]] : [] });
          api.marks(S.head, b);
          S.pts.forEach(({ li, pp }) => {
            const b2 = api.beat(li, 'item', pp.at, { auto: pp.text, spread: true, gap: 0.28 });
            api.marks(li, b2);
          });
          return b;
        };
        run(L, d.leftAt);
        api.beat(vs, 'stamp', d.vsAt, { gap: 0.12 });
        const rb = run(Rt, d.rightAt);
        const win = L.s.win ? L.el : Rt.s.win ? Rt.el : null;
        if (d.verdict) {
          const v = api.add(body, 'div', 'verdict rc-verdict', `<span class="rc-vd-tag">DIFF</span><span class="rc-vd-tx">${rich(d.verdict)}</span>`);
          const b = api.beat(v, 'text', d.verdictAt, { auto: d.verdict, with: win ? [[win, 'mark', 0]] : [] });
          api.marks(v, b);
        } else if (win) {
          (rb.opt.with = rb.opt.with || []).push([win, 'mark', 0.7]);
        }
      },

      // 10. 条形图：小票上的 ASCII 字符块条形图（▇▇▇▇）
      bars(d, api) {
        const items = arr(d.items).map(it => norm(it, 'label'));
        const vals = items.map(it => Math.abs(parseFloat(String(it.value ?? 0).replace(/,/g, ''))) || 0);
        const log = d.scale === 'log';
        const f = v => (log ? Math.log10(Math.max(v, 1)) : v);
        const mx = d.max != null ? f(+d.max) : Math.max(...vals.map(f), 1e-9);

        const fillBars = (parent) => {
          const box = api.add(parent, 'div', 'bars rc-bars' + (log ? ' log' : '') + nc(items.length));
          items.forEach((it, i) => {
            const ratio = cl(f(vals[i]) / mx, 0.04, 1);
            const r = api.add(box, 'div', 'bar-row rc-bar-row' + (isHot(d, i, it) ? ' on' : ''));
            const top = api.add(r, 'div', 'rc-bar-top');
            api.add(top, 'div', 'bar-l', rich(it.label));
            const v = api.add(top, 'div', 'bar-v');
            const { val } = api.num(v, it.display ?? it.value);
            if (it.unit) api.add(v, 'span', 'bar-u', rich(it.unit));

            const tr = api.add(r, 'div', 'bar-track rc-bar-track');
            const fill = api.add(tr, 'div', 'bar-fill rc-bar-fill');
            fill.style.setProperty('--w', ratio.toFixed(4));
            const pct = api.add(tr, 'span', 'rc-bar-pct', `${Math.round(ratio * 100)}%`);

            const w = [[fill, 'grow', 0.05]];
            if (val) w.push([val, 'count', 0.05, { d: 0.85 }]);
            const b = api.beat(r, 'bar', it.at, { auto: it.label, spread: true, focus: focusOf(d, api), with: w });
            api.marks(r, b);
          });
        };

        if (api.land && d.title) {
          const { leftInner, rightInner } = createTwoSlips(api, 'rc-bars-2col', { rightLeft: 'ASCII GRAPH · 字符柱图', rightRight: log ? 'LOG' : 'LINEAR' });
          api.head({ parent: leftInner });
          api.note(leftInner, d.note, d.noteAt);
          addBarcodeFoot(api, leftInner, { compact: true });
          const body = api.add(rightInner, 'div', 'rc-body');
          fillBars(body);
          return;
        }

        const { inner } = createPaper(api, 'rc-bars-paper');
        api.head({ parent: inner });
        const colHd = api.add(inner, 'div', 'rc-col-hd');
        api.add(colHd, 'span', '', 'ITEM · 项目');
        api.add(colHd, 'span', '', log ? 'LOG SCALE' : 'AMOUNT');
        const body = api.add(inner, 'div', 'rc-body');
        fillBars(body);
        api.note(inner, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true });
      },

      // 11. 时间线：一串打印时间戳流水
      timeline(d, api) {
        const items = arr(d.items).map(it => norm(it));

        const fillTl = (parent) => {
          const box = api.add(parent, 'div', 'tl col rc-tl' + nc(items.length));
          const links = api.svg('svg', { class: 'links' });
          box.appendChild(links);
          const beats = [], dots = [];
          items.forEach((it, i) => {
            const el = api.add(box, 'div', 'tl-item rc-tl-item' + (isHot(d, i, it) ? ' on' : ''));
            dots.push(api.add(el, 'div', 'tl-dot rc-tl-dot'));
            const tx = api.add(el, 'div', 'rc-tl-body');
            if (it.time != null) api.add(tx, 'div', 'tl-time rc-tl-time', `[${rich(it.time)}]`);
            if (it.text) api.add(tx, 'div', 'tl-text rc-tl-text', rich(it.text));
            const b = api.beat(el, 'item', it.at, { auto: [it.time, it.text], spread: true, focus: focusOf(d, api) });
            api.marks(el, b);
            beats.push(b);
          });
          api.layout(() => {
            links.innerHTML = '';
            for (let i = 0; i + 1 < dots.length; i++) {
              const a = api.rel(dots[i], box), c = api.rel(dots[i + 1], box);
              const y1 = a.b + 6, y2 = c.y - 6;
              if (y2 - y1 < 6) continue;
              const p = api.svg('path', { d: dash(a.cx, y1, c.cx, y2, 7, 6) });
              links.appendChild(p);
              (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.26 });
            }
          });
        };

        if (api.land && d.title) {
          const { leftInner, rightInner } = createTwoSlips(api, 'rc-tl-2col', { rightLeft: 'TIMESTAMP LOG · 打印流水' });
          api.head({ parent: leftInner });
          api.note(leftInner, d.note, d.noteAt);
          addBarcodeFoot(api, leftInner, { compact: true });
          const body = api.add(rightInner, 'div', 'rc-body');
          fillTl(body);
          return;
        }

        const { inner } = createPaper(api, 'rc-tl-paper');
        api.head({ parent: inner });
        api.add(inner, 'div', 'rc-rule dashed');
        const body = api.add(inner, 'div', 'rc-body');
        fillTl(body);
        api.note(inner, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true });
      },

      // 12. 引用：小票背面手写的一句话（翻转纸背 + 镜像正面透印 + 霞鹜文楷手写）
      quote(d, api) {
        api.root.classList.add('center');
        const { paper, inner } = createPaper(api, 'rc-quote-back', { masthead: false, edgeCls: 'back' });

        // 极淡镜像透印（正面账单从纸背隐约透出）
        const ghost = api.add(inner, 'div', 'rc-ghost');
        ghost.innerHTML =
          `<div class="rc-g-hd">*** ${esc(storeNameOf(api))} ***</div>` +
          `<div class="rc-g-ln">01 ITEM .................. 25.00</div>` +
          `<div class="rc-g-ln">02 ITEM .................. 25.00</div>` +
          `<div class="rc-g-ln">--------------------------------</div>` +
          `<div class="rc-g-tot">TOTAL                    9125.00</div>` +
          `<div class="rc-g-bc">|||| ||| || |||| | ||| || ||||</div>`;

        api.add(inner, 'div', 'rc-back-tag', 'BACK OF RECEIPT · 小票背面');
        api.head({ parent: inner });
        const q = api.add(inner, 'div', 'qt rc-qt');
        const mk = api.quoteMark();
        if (mk) api.beat(api.add(q, 'div', 'qmark', mk), 'chip', d.markAt);
        const qt = api.add(q, 'div', 'q-text');
        const els = linesOf(d.text ?? d.quote).map(l => api.add(qt, 'div', 'ql', rich(l)));
        const b = api.beat(els, 'quote', d.textAt);
        els.forEach(e => api.marks(e, b));
        const src = d.source ?? d.by ?? d.author;
        if (src) api.beat(api.add(q, 'div', 'q-src', rich(src)), 'note', d.sourceAt, { auto: src });
      },

      // 13. 代码：热敏机自检程序输出（浅纸高对比 + 荧光黄高亮行）
      code(d, api) {
        const buildCode = (parent) => {
          const win = api.add(parent, 'div', 'code-win rc-code-win');
          api.add(win, 'div', 'code-bar rc-code-bar', `<b>POS SELF-TEST</b><span>${esc(d.file || (d.lang ? `script.${d.lang}` : 'output.txt'))}</span>`);
          const pre = api.add(win, 'pre', 'code');
          const src = String(d.code ?? '').replace(/\t/g, '    ').replace(/\s+$/, '').split('\n');
          const hl = new Set(arr(d.hl ?? d.highlight).map(Number));
          api.fitBox(pre);
          api.beat(win, 'card', d.codeAt);
          let prevDur = 0.42, first = true;
          src.forEach((ln, i) => {
            const row = api.add(pre, 'span', 'cl' + (hl.has(i + 1) ? ' hl-line' : ''));
            const t = api.add(row, 'span', 'clt', ln.length ? MV.util.tokenize(ln, d.lang) : '\u200b');
            if (!ln.trim().length) return;
            const n = ln.replace(/^\s+/, '').length;
            const dur = cl(n / (d.cps || 42), 0.24, 1.4);
            const b = api.beat(t, 'code', null, { d: dur, o: { n: ln.length }, gap: first ? 0.4 : prevDur * 0.9 + 0.05 });
            first = false;
            prevDur = dur;
            if (hl.has(i + 1)) api.sc.beats.push({ els: [row], role: 'mark', key: d.hlAt ?? null, opt: { free: true, parent: b }, t: null });
          });
        };

        if (api.land && d.title) {
          const { leftInner, rightInner } = createTwoSlips(api, 'rc-code-2col', { rightLeft: 'RAW PRINTOUT · 代码联' });
          api.head({ parent: leftInner });
          api.note(leftInner, d.note, d.noteAt);
          addBarcodeFoot(api, leftInner, { compact: true });
          const body = api.add(rightInner, 'div', 'rc-body');
          buildCode(body);
          return;
        }

        const { inner } = createPaper(api, 'rc-code-paper');
        api.head({ parent: inner });
        const body = api.add(inner, 'div', 'rc-body');
        buildCode(body);
        api.note(inner, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true });
      },

      // 14. 公式：算式核对栏
      formula(d, api) {
        api.root.classList.add('center');
        const buildFormula = (parent) => {
          const box = api.add(parent, 'div', 'rc-formula-box');
          api.add(box, 'div', 'rc-fm-tag', 'AUDIT · 算式验算');
          const f = api.add(box, 'div', 'formula');
          if (window.katex) {
            window.katex.render(String(d.tex ?? d.formula ?? ''), f, {
              displayMode: true, throwOnError: false, trust: true, strict: false,
              macros: { '\\hl': '\\htmlClass{hl}{#1}' },
            });
          } else {
            f.textContent = String(d.tex ?? d.formula ?? '');
          }
          api.fitBox(f);
          const b = api.beat(f, 'formula', d.texAt);
          f.querySelectorAll('.hl').forEach(m => {
            api.sc.beats.push({ els: [m], role: 'mark', key: d.hlAt ?? null, opt: { free: true, parent: b }, t: null });
          });
          return box;
        };

        if (api.land && d.title) {
          const { leftInner, rightInner } = createTwoSlips(api, 'rc-fm-2col', { rightLeft: 'CALCULATION AUDIT · 验算联' });
          api.head({ parent: leftInner });
          api.note(leftInner, d.note, d.noteAt);
          addBarcodeFoot(api, leftInner, { compact: true });
          const body = api.add(rightInner, 'div', 'rc-body');
          buildFormula(body);
          if (d.items) buildReceiptList(d, api, body, arr(d.items).map(it => norm(it)), d.mode || 'bullet').classList.add('f-list');
          return;
        }

        const { inner } = createPaper(api, 'rc-fm-paper');
        api.head({ parent: inner });
        buildFormula(inner);
        if (d.items) buildReceiptList(d, api, inner, arr(d.items).map(it => norm(it)), d.mode || 'bullet').classList.add('f-list');
        api.note(inner, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true });
      },

      // 15. 图片：小票贴图 / 热敏图解框
      image(d, api) {
        const pts = arr(d.points ?? d.items).map(it => norm(it));

        if (api.land) {
          const { leftInner, rightInner } = createTwoSlips(api, 'rc-img-2col', { rightLeft: 'ATTACHMENT · 附图联' });
          api.head({ parent: leftInner });
          if (pts.length) {
            api.add(leftInner, 'div', 'rc-rule dashed');
            buildReceiptList(d, api, leftInner, pts, d.mode || 'bullet');
          }
          api.note(leftInner, d.note, d.noteAt);
          addBarcodeFoot(api, leftInner, { compact: true });

          const body = api.add(rightInner, 'div', 'body solo rc-img-body');
          api.media(d.image ?? d.src, { parent: body, frame: d.frame, cap: d.cap, at: d.imageAt, kb: d.kb, title: d.windowTitle });
          return;
        }

        const { inner } = createPaper(api, 'rc-img-paper', { mhOpts: { compact: true, left: `DATE ${timestampOf(api)}`, right: `FIG.#${pad2(api.sc.i + 1)}` } });
        api.head({ parent: inner });
        const body = api.add(inner, 'div', 'body ' + (pts.length ? 'split' : 'solo') + ' rc-img-body');
        api.media(d.image ?? d.src, { parent: body, frame: d.frame, cap: d.cap, at: d.imageAt, kb: d.kb, title: d.windowTitle });
        if (pts.length) buildReceiptList(d, api, body, pts, d.mode || 'bullet');
        api.note(inner, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true, thanks: false, bars: 44 });
      },

      // 16. 结尾：结清联「谢谢惠顾」+ 红印章 + 条形码
      ending(d, api) {
        api.root.classList.add('center');
        const tags = arr(d.tags ?? d.chips);
        const by = d.byline ?? api.story.byline;

        if (api.land) {
          const wrap = api.add(api.root, 'div', 'rc-desk-2col rc-end-2col');
          const lp = api.add(wrap, 'div', 'rc-paper rc-end-main');
          const li = addEdges(api, lp);
          addMasthead(api, li, { right: 'PAID · 已结清' });
          api.head({ big: true, parent: li });
          if (d.cta) {
            const c = api.add(li, 'div', 'cta rc-cta', rich(d.cta));
            const b = api.beat(c, 'text', d.ctaAt, { auto: d.cta });
            api.marks(c, b);
          }

          const rp = api.add(wrap, 'div', 'rc-paper rc-end-side');
          const ri = addEdges(api, rp);
          addMasthead(api, ri, { compact: true, left: 'THANK YOU · 谢谢惠顾', right: 'PAID' });
          const seal = api.add(ri, 'div', 'rc-paid-seal', '<span>已结清</span><small>PAID IN FULL</small>');
          api.beat(seal, 'stamp', null, { gap: 0.2 });
          if (tags.length) {
            const box = api.add(ri, 'div', 'chips');
            const els = tags.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
            api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
          }
          addBarcodeFoot(api, ri, { big: true, code: barcodeDigits(api, 'END') });
          if (by) api.beat(api.add(ri, 'div', 'meta byline rc-by', `CASHIER: ${rich(by)}`), 'text', d.bylineAt);
          return;
        }

        const { inner } = createPaper(api, 'rc-end-paper', { mhOpts: { right: 'PAID · 已结清' } });
        api.head({ big: true, parent: inner });
        api.add(inner, 'div', 'rc-rule double');
        if (!d.stamp) {
          const seal = api.add(inner, 'div', 'rc-paid-seal', '<span>已结清</span><small>PAID IN FULL</small>');
          api.beat(seal, 'stamp', null, { gap: 0.18 });
        }
        if (d.cta) {
          const c = api.add(inner, 'div', 'cta rc-cta', rich(d.cta));
          const b = api.beat(c, 'text', d.ctaAt, { auto: d.cta });
          api.marks(c, b);
        }
        if (tags.length) {
          const box = api.add(inner, 'div', 'chips');
          const els = tags.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
          api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
        }
        addBarcodeFoot(api, inner, { big: true, code: barcodeDigits(api, 'END') });
        if (by) api.beat(api.add(inner, 'div', 'meta byline rc-by', `CASHIER: ${rich(by)}`), 'text', d.bylineAt);
      },

      // 17. 自定义：自动套进热敏小票纸框
      custom(d, api) {
        if (d.css) {
          const st = document.createElement('style');
          st.textContent = d.css;
          api.sc.el.appendChild(st);
        }
        if (d.center) api.root.classList.add('center');
        const { inner } = createPaper(api, 'rc-custom-paper');
        api.head({ parent: inner });
        const box = api.add(inner, 'div', 'custom', d.html || '');
        box.querySelectorAll('[data-role],[data-rv],[data-at]').forEach(el => {
          const role = el.dataset.role || 'text';
          const kind = el.dataset.rv && MV.kinds[el.dataset.rv] ? el.dataset.rv : undefined;
          const b = api.beat(el, role, el.dataset.at || null, { kind, auto: el.dataset.auto, spread: el.dataset.spread != null });
          api.marks(el, b);
        });
        api.note(inner, d.note, d.noteAt);
        addBarcodeFoot(api, inner, { compact: true });
      },
    },

    // 给单张小票加上随逐行打印步进吐纸的确定性轨道
    decorate(sc, api) {
      if (sc.t === 'compare' || sc.t === 'quote') return;
      const paper = sc.content.querySelector('.rc-paper');
      if (!paper || sc.content.querySelector('.rc-desk-2col')) return;
      api.after(() => {
        const times = sc.beats
          .filter(b => !b.opt.free && !b.opt.last && b.t != null)
          .map(b => b.t)
          .sort((a, b) => a - b);
        if (times.length < 2) return;
        const t0 = Math.max(0, times[0] - 0.1);
        const dur = Math.max(0.4, times[times.length - 1] - t0 + 0.35);
        api.track(paper, 'paperFeed', t0, dur, { times, t0, dur, maxShift: 26 });
      });
    },
  });
})();
