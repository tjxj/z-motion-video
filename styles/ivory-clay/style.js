/* 象牙陶土 ivory-clay · 温和克制的 AI 产品发布会 */
(() => {
  'use strict';
  const { cl, EZ, esc, rich, plain, pad2 } = MV.util;
  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
  const norm = (it, key = 'text') => (it == null ? {} : typeof it === 'object' ? it : { [key]: String(it) });
  const isHot = (d, i, it) => !!(it && it.on) || d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
  const focusOf = (d, api) => d.focus ?? !!api.style.focus;
  const nc = n => ' n' + Math.max(1, Math.min(n, 9));

  // ───── 自定义动画：开关拨动 & 多行安全流式打字 ─────
  MV.kinds.icToggle = {
    f(el, p, o) {
      const v = o.off ? 0 : EZ.o3(p);
      el.style.setProperty('--sw', v.toFixed(4));
    },
  };

  MV.kinds.icStream = {
    prep(tr) {
      const live = tr.el.querySelector('.ic-stream-live');
      if (live && !tr.o.chars) {
        tr.o.fullHtml = live.innerHTML;
        tr.o.chars = Array.from(live.textContent || '');
      }
    },
    f(el, p, o) {
      const live = el.querySelector('.ic-stream-live');
      if (!live || !o.chars) return;
      if (p <= 0) {
        el.style.opacity = 0;
        live.textContent = '';
        el.classList.remove('is-typing');
        return;
      }
      el.style.opacity = 1;
      if (p >= 1) {
        live.innerHTML = o.fullHtml;
        el.classList.remove('is-typing');
        return;
      }
      const n = Math.max(1, Math.floor(p * o.chars.length));
      live.textContent = o.chars.slice(0, n).join('');
      el.classList.add('is-typing');
    },
  };

  // ───── 深色页 & 陶土页变量 ─────
  const DARK_BG =
    'radial-gradient(ellipse 82% 62% at 82% 16%, rgba(204,120,92,.16) 0%, rgba(204,120,92,.03) 44%, transparent 72%),' +
    'radial-gradient(ellipse 68% 58% at 14% 88%, rgba(138,127,114,.09) 0%, transparent 66%), #1F1A17';
  const STMT_BG =
    'radial-gradient(ellipse 88% 72% at 50% 42%, rgba(204,120,92,.22) 0%, rgba(204,120,92,.05) 48%, transparent 76%), #1F1A17';

  const DARK = {
    '--bg': '#1F1A17',
    '--surface': '#29231F',
    '--surface2': '#342C27',
    '--surface3': '#433932',
    '--fg': '#F5F0E8',
    '--fg2': '#CFC6B9',
    '--fg3': '#8A7F72',
    '--accent': '#D98468',
    '--accent-strong': '#E59579',
    '--accent-soft': 'rgba(217,132,104,.16)',
    '--accent-bd': 'rgba(217,132,104,.46)',
    '--on-accent': '#1F1A17',
    '--hl': '#E59579',
    '--line': 'rgba(245,240,232,.13)',
    '--line-strong': 'rgba(245,240,232,.34)',
    '--card-bg': '#29231F',
    '--card-bd': 'rgba(245,240,232,.13)',
    '--shadow-card': '0 2px 4px rgba(0,0,0,.24), 0 24px 54px rgba(0,0,0,.38)',
    '--sw-off': '#4A4039',
    '--sw-knob': '#F5F0E8',
  };

  const CLAY = {
    '--bg': '#CC785C',
    '--surface': '#FAF5EE',
    '--surface2': '#EEDFD0',
    '--surface3': '#E0CBB8',
    '--fg': '#1F1A17',
    '--fg2': '#3E2B23',
    '--fg3': '#694A3D',
    '--accent': '#1F1A17',
    '--accent-strong': '#1F1A17',
    '--accent-soft': 'rgba(31,26,23,.12)',
    '--accent-bd': 'rgba(31,26,23,.38)',
    '--on-accent': '#F5F0E8',
    '--hl': '#FFFDF9',
    '--line': 'rgba(31,26,23,.18)',
    '--line-strong': 'rgba(31,26,23,.48)',
    '--card-bg': 'rgba(255,252,247,.82)',
    '--card-bd': 'rgba(31,26,23,.18)',
    '--shadow-card': '0 14px 36px rgba(31,26,23,.14)',
    '--sw-off': 'rgba(31,26,23,.22)',
    '--sw-knob': '#FAF5EE',
  };

  const DARK_T = { cover: 1, chapter: 1, statement: 1, quote: 1, ending: 1 };

  // 辅助：构建多行安全流式文本节点
  function streamHtml(html) {
    return `<span class="ic-stream-ghost" aria-hidden="true">${html}</span><span class="ic-stream-live">${html}</span>`;
  }

  // 辅助：为任意稿件自动推导出封面对话卡片内容
  function deriveCoverUi(d, api) {
    const ui = d.ui || {};
    const titlePlain = plain(d.title || api.story.title || '').replace(/\n+/g, '');
    const subPlain = plain(d.sub || d.dek || '');
    const tags = arr(d.tags ?? d.chips).map(t => plain(t));
    const session = ui.session || plain(d.kicker || api.story.series || 'Keynote Workspace').replace(/\s*[·|]\s*/g, ' / ');
    const prompt = ui.prompt || (titlePlain ? `请简明讲清楚：${titlePlain}` : '帮我梳理今天的核心要点');
    const reply = ui.reply || subPlain || (tags.length ? `核心拆解方向：${tags.join(' · ')}` : '已为你整理出清晰的结构与关键结论。');
    const placeholder = ui.placeholder || '继续追问，或补充更多背景…';
    const sideItems = ui.sidebar || (tags.length >= 2 ? tags.slice(0, 3) : ['本次主题', '要点拆解', '行动清单']);
    return { session, prompt, reply, placeholder, sideItems };
  }

  // ───── 风格定义 ─────
  MV.style({
    // 柔和克制的交叉淡化转场
    transition: { kind: 'cross', dur: 0.58 },
    motion: {
      kicker: { kind: 'fade', d: 0.5, gap: 0 },
      title: { kind: 'rise', d: 0.68, stagger: 0.08, gap: 0.1, o: { dist: 22 } },
      big: { kind: 'rise', d: 0.72, stagger: 0.1, gap: 0.1, o: { dist: 24 } },
      text: { kind: 'rise', d: 0.6, gap: 0.28, o: { dist: 16 } },
      item: { kind: 'rise', d: 0.52, stagger: 0.06, gap: 0.36, o: { dist: 16 } },
      card: { kind: 'rise', d: 0.58, stagger: 0.07, gap: 0.32, o: { dist: 22 } },
      chip: { kind: 'fade', d: 0.42, stagger: 0.06, gap: 0.22 },
      quote: { kind: 'rise', d: 0.75, stagger: 0.16, gap: 0.18, o: { dist: 18 } },
      note: { kind: 'fade', d: 0.55, gap: 0.32 },
    },
    focus: true,
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'window',
    kenBurns: 0.035,
    quoteMark: '“',

    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'light') return { tone: 'light' };
      if (d.bg === 'clay') return { tone: 'clay', bg: '#CC785C', vars: CLAY };
      if (d.bg === 'dark' || DARK_T[t]) {
        return { tone: 'dark', bg: t === 'statement' ? STMT_BG : DARK_BG, vars: DARK };
      }
      return { tone: 'light' };
    },

    // 象牙白温润纸面：微暖渐变 + 极细颗粒
    paint(g, W, H, R, u) {
      g.fillStyle = '#F5F0E8';
      g.fillRect(0, 0, W, H);
      const glow = g.createRadialGradient(W * 0.84, H * 0.14, 0, W * 0.84, H * 0.14, Math.max(W, H) * 0.65);
      glow.addColorStop(0, 'rgba(204,120,92,.065)');
      glow.addColorStop(0.55, 'rgba(204,120,92,.015)');
      glow.addColorStop(1, 'rgba(204,120,92,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, W, H);

      const vg = g.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.64);
      vg.addColorStop(0, 'rgba(90,72,56,0)');
      vg.addColorStop(1, 'rgba(90,72,56,.055)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
      u.noise(4, 19);
    },

    overlay(g, W, H, R, u) {
      g.fillStyle = '#fff';
      g.fillRect(0, 0, W, H);
      u.noise(6, 23);
    },

    // 全局页眉页脚：陶土呼吸状态点 + 幻灯片编号 + 底部细进度轨
    chrome(c) {
      const top = c.h('div', 'ic-top');
      const brand = c.h('span', 'ic-brand', `<i class="ic-dot-live"></i><span>${c.esc(c.plain(c.story.series || c.story.title || ''))}</span>`);
      const pg = c.h('span', 'ic-pg');
      top.append(brand, pg);

      const foot = c.h('div', 'ic-foot');
      const by = c.h('span', 'ic-by', c.esc(c.plain(c.story.byline || '')));
      const sec = c.h('span', 'ic-sec');
      foot.append(by, sec);

      const segs = c.h('div', 'ic-segs');
      for (let k = 0; k < c.scenes.length; k++) segs.append(c.h('i'));

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
        if (cur >= 0 && bars[cur]) {
          bars[cur].style.setProperty('--f', c.cl((info.t - info.sc.s) / info.sc.dur).toFixed(4));
        }
      };
    },

    // 确定性时间驱动：光标温和闪烁 + 状态灯呼吸
    tick(t, o) {
      const st = o.stage;
      const blink = o.cover ? 1 : (Math.sin(t * Math.PI * 2.1) > -0.18 ? 1 : 0.12);
      const pulse = 0.68 + 0.32 * (0.5 + 0.5 * Math.cos(t * Math.PI * 1.4));
      st.style.setProperty('--caret-a', blink.toFixed(2));
      st.style.setProperty('--dot-a', pulse.toFixed(3));
    },

    link(x1, y1, x2, y2, o) {
      return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} ` + o.arrowHead(x1, y1, x2, y2, 10, 0.52);
    },

    // ───── 按风格重写的模板版式语法 ─────
    templates: {
      // 1) 封面：Keynote 幻灯片 + 产品对话工作台卡片
      cover(d, api) {
        const layout = d.layout || 'split';
        const root = api.root;
        root.classList.add('ic-cover', 'ic-cov-' + layout);

        if (layout === 'minimal') {
          root.classList.add('center');
          api.head({ big: true });
          const tags = arr(d.tags ?? d.chips);
          if (tags.length) {
            const box = api.add(root, 'div', 'chips');
            const els = tags.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
            api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
          }
          const ui = deriveCoverUi(d, api);
          const comp = api.add(
            root,
            'div',
            'ic-composer ic-min-comp',
            `<span class="ic-comp-text">${esc(ui.placeholder)}<i class="ic-caret"></i></span><span class="ic-send">↑</span>`
          );
          api.beat(comp, 'card', null, { gap: 0.25 });
          if (d.meta) api.beat(api.add(root, 'div', 'meta', rich(d.meta)), 'text', d.metaAt);
          return;
        }

        // 默认 split：16:9 左右分栏，3:4 / 9:16 上下分构
        const grid = api.add(root, 'div', 'ic-cov-grid');
        const left = api.add(grid, 'div', 'ic-cov-left');
        const right = api.add(grid, 'div', 'ic-cov-right');

        api.head({ parent: left, big: true });

        const tags = arr(d.tags ?? d.chips);
        if (tags.length) {
          const box = api.add(left, 'div', 'chips');
          const els = tags.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
          api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0], gap: 0.2 });
        }
        if (d.meta) api.beat(api.add(left, 'div', 'meta', rich(d.meta)), 'text', d.metaAt);

        if (d.image) {
          api.media(d.image, { parent: right, frame: d.frame || 'window', at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
          return;
        }

        // 构建产品对话工作台卡片
        const ui = deriveCoverUi(d, api);
        const win = api.add(right, 'div', 'ic-ui-win');
        api.add(
          win,
          'div',
          'ic-ui-bar',
          `<span class="ic-ui-bar-l"><i class="ic-dot-live"></i><span class="ic-ui-title">${esc(ui.session)}</span></span>` +
          `<span class="ic-ui-pill">LIVE</span>`
        );

        const body = api.add(win, 'div', 'ic-ui-body');
        // 微缩侧边栏
        const sideHtml =
          `<div class="ic-side-hd">会话列表</div>` +
          ui.sideItems
            .map((it, idx) => `<div class="ic-side-it${idx === 0 ? ' is-act' : ''}"><i></i><span>${esc(it)}</span></div>`)
            .join('');
        api.add(body, 'div', 'ic-ui-side', sideHtml);

        const chat = api.add(body, 'div', 'ic-ui-chat');
        const uMsg = api.add(
          chat,
          'div',
          'ic-msg ic-msg-u',
          `<div class="ic-msg-role">提问</div><div class="ic-msg-txt">${rich(ui.prompt)}</div>`
        );
        const aMsg = api.add(
          chat,
          'div',
          'ic-msg ic-msg-a',
          `<div class="ic-msg-role"><i class="ic-dot-s"></i>回应</div>` +
          `<div class="ic-msg-txt ic-stream">${streamHtml(rich(ui.reply))}</div>`
        );
        const comp = api.add(
          chat,
          'div',
          'ic-composer',
          `<span class="ic-comp-text">${esc(ui.placeholder)}<i class="ic-caret"></i></span><span class="ic-send">↑</span>`
        );

        api.beat(win, 'card', null, { gap: 0.14 });
        api.beat(uMsg, 'item', null, { gap: 0.18 });
        const streamEl = aMsg.querySelector('.ic-stream');
        const bReply = api.beat(aMsg, 'item', null, {
          gap: 0.22,
          with: [[streamEl, 'icStream', 0.12, { d: 1.05 }]],
        });
        api.marks(aMsg, bReply);
        api.beat(comp, 'fade', null, { kind: 'fade', d: 0.45, gap: 0.18 });
      },

      // 2) 章节页：极细巨大数字 + 延伸陶土线 + 宋体章节名
      chapter(d, api) {
        api.root.classList.add('center', 'ic-chapter');
        const n = d.num ?? pad2(api.sc.chapNo || 1);
        if (n !== false && n !== '') {
          const top = api.add(api.root, 'div', 'ic-chap-row');
          const ne = api.add(top, 'div', 'chap-num', esc(n));
          const rule = api.add(top, 'div', 'ic-chap-rule', '<i class="ic-dot-live"></i><span class="ic-rule-bar"></span>');
          const bar = rule.querySelector('.ic-rule-bar');
          api.beat(ne, 'big', d.numAt, { with: [[bar, 'grow', 0.14, { d: 0.7 }]] });
        }
        api.head({ big: true });
        api.note(api.root, d.note, d.noteAt);
      },

      // 3) 大数字：极细超大 grot 数字 + 卡片化说明区（16:9 左右分栏）
      bignum(d, api) {
        api.root.classList.add('center', 'ic-bignum');
        const wrap = api.add(api.root, 'div', 'ic-bn-wrap');
        const main = api.add(wrap, 'div', 'ic-bn-main');
        api.head({ parent: main });

        const bn = api.add(main, 'div', 'bn');
        const row = api.add(bn, 'div', 'bn-row');
        const v = d.value ?? d.num;
        const { val } = api.num(row, v);
        if (d.unit) api.add(row, 'span', 'bn-u', rich(d.unit));
        api.fitBox(row);
        api.beat(row, 'big', d.valueAt, {
          auto: d.value != null ? String(d.value) : null,
          with: val ? [[val, 'count', 0]] : [],
        });

        if (d.label || d.note) {
          const card = api.add(wrap, 'div', 'ic-bn-card');
          api.add(card, 'div', 'ic-bn-card-hd', '<i class="ic-dot-s"></i><span>KEY METRIC</span>');
          if (d.label) {
            const l = api.add(card, 'div', 'bn-l', rich(d.label));
            const b = api.beat(l, 'text', d.labelAt, { auto: d.label });
            api.marks(l, b);
          }
          if (d.note) api.note(card, d.note, d.noteAt);
          api.beat(card, 'card', null, { gap: 0.18 });
        }
      },

      // 4) 列表：产品「设置面板」+ 讲到时拨动开启的开关
      list(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it));
        const mode = d.mode || (items.some(it => it.ok != null) ? 'check' : 'bullet');
        const body = api.body();
        const panel = api.add(body, 'div', 'ic-panel');
        const pBar = api.add(
          panel,
          'div',
          'ic-panel-bar',
          `<span class="ic-pb-l"><i class="ic-dot-s"></i><span>偏好与检查项</span></span>` +
          `<span class="ic-pb-r">${pad2(items.length)} ITEMS</span>`
        );
        api.beat(panel, 'card', null, { gap: 0.12 });

        const ul = api.add(panel, 'ul', 'list ic-set-list m-' + mode + nc(items.length));
        const cols = d.cols ?? (api.land && items.length >= 4 ? 2 : 1);
        if (cols === 2) ul.classList.add('cols-2');
        ul.style.setProperty('--cols', cols);
        items.forEach((it, i) => {
          const ok = it.ok != null ? !!it.ok : mode === 'check' ? true : mode === 'cross' ? false : undefined;
          const isOff = ok === false;
          const li = api.add(
            ul,
            'li',
            'item ic-set-row' + (ok === true ? ' ok' : isOff ? ' no' : '') + (isHot(d, i, it) ? ' on' : '')
          );
          const sw = api.add(
            li,
            'span',
            'mk ic-sw' + (isOff ? ' is-off' : ''),
            '<span class="ic-sw-track"><span class="ic-sw-knob"></span></span>'
          );
          const tx = api.add(li, 'span', 'tx', rich(it.text ?? it.title));
          if (it.note) api.add(tx, 'span', 'nt', rich(it.note));
          if (mode === 'number') {
            api.add(li, 'span', 'ic-set-idx', pad2(i + 1));
          } else if (isHot(d, i, it)) {
            api.add(li, 'span', 'ic-set-tag', '重点');
          }
          const b = api.beat(li, 'item', it.at, {
            auto: it.text ?? it.title,
            spread: true,
            focus: focusOf(d, api),
            with: [[sw, 'icToggle', 0.12, { d: 0.44, off: isOff }]],
          });
          api.marks(li, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 5) 步骤：产品新手引导分步卡片（1 / 4、2 / 4）
      steps(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'title'));
        const row = d.dir ? d.dir === 'row' : api.land && items.length <= 4;
        const box = api.add(api.body(), 'div', 'steps ic-steps ' + (row ? 'row' : 'col') + nc(items.length));
        const links = api.svg('svg', { class: 'links' });
        box.appendChild(links);
        const beats = [], cards = [];
        const total = items.length;
        items.forEach((it, i) => {
          const st = api.add(box, 'div', 'step ic-step-card' + (isHot(d, i, it) ? ' on' : ''));
          cards.push(st);
          const hd = api.add(st, 'div', 'ic-step-hd');
          api.add(hd, 'div', 'badge ic-step-pill', `<i class="ic-dot-s"></i><span>${i + 1} / ${total}</span>`);
          const pips = Array.from({ length: total }, (_, k) => `<i${k <= i ? ' class="fill"' : ''}></i>`).join('');
          api.add(hd, 'div', 'ic-step-pips', pips);
          const tx = api.add(st, 'div', 'st-tx');
          api.add(tx, 'div', 'st-t', rich(it.title ?? it.text));
          if (it.title && it.text) api.add(tx, 'div', 'st-n', rich(it.text));
          const b = api.beat(st, 'card', it.at, { auto: it.title ?? it.text, spread: true, focus: focusOf(d, api) });
          api.marks(tx, b);
          beats.push(b);
        });
        api.layout(() => {
          links.innerHTML = '';
          if (!row) return;
          for (let i = 0; i + 1 < cards.length; i++) {
            const a = api.rel(cards[i], box), c = api.rel(cards[i + 1], box), g = 7;
            const [x1, y1, x2, y2] = [a.r + g, a.cy, c.x - g, c.cy];
            if (Math.hypot(x2 - x1, y2 - y1) < 8) continue;
            const p = api.svg('path', { d: api.link(x1, y1, x2, y2, i) });
            links.appendChild(p);
            (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.28 });
          }
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 5b) 时间线：轨道节点在卡片外，连接线不穿卡
      timeline(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it));
        const row = d.dir ? d.dir === 'row' : api.land && items.length <= 5;
        const box = api.add(api.body(), 'div', 'tl ic-tl ' + (row ? 'row' : 'col') + nc(items.length));
        const links = api.svg('svg', { class: 'links' });
        box.appendChild(links);
        const beats = [], dots = [];
        items.forEach((it, i) => {
          const el = api.add(box, 'div', 'tl-item ic-tl-item' + (isHot(d, i, it) ? ' on' : ''));
          const rail = api.add(el, 'div', 'ic-tl-rail');
          dots.push(api.add(rail, 'div', 'tl-dot'));
          const card = api.add(el, 'div', 'ic-tl-card');
          const top = api.add(card, 'div', 'ic-tl-top');
          if (it.time != null) api.add(top, 'div', 'tl-time', rich(it.time));
          api.add(top, 'span', 'ic-tl-idx', `STEP ${pad2(i + 1)}`);
          if (it.text) api.add(card, 'div', 'tl-text', rich(it.text));
          const b = api.beat(el, 'item', it.at, { auto: [it.time, it.text], spread: true, focus: focusOf(d, api) });
          api.marks(el, b);
          beats.push(b);
        });
        api.layout(() => {
          links.innerHTML = '';
          for (let i = 0; i + 1 < dots.length; i++) {
            const a = api.rel(dots[i], box), c = api.rel(dots[i + 1], box);
            const ga = a.w / 2 + 8, gc = c.w / 2 + 8;
            const L = Math.hypot(c.cx - a.cx, c.cy - a.cy);
            if (L < ga + gc + 4) continue;
            const ux = (c.cx - a.cx) / L, uy = (c.cy - a.cy) / L;
            const p = api.svg('path', { d: api.link(a.cx + ux * ga, a.cy + uy * ga, c.cx - ux * gc, c.cy - uy * gc, i) });
            links.appendChild(p);
            (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.28 });
          }
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 6) 对比：并排双对话 / 产品结果窗口
      compare(d, api) {
        api.head();
        const body = api.body();
        const g = api.add(body, 'div', 'cmp ic-cmp n2');
        const buildSide = (raw, cls, fallbackTag) => {
          const s = norm(raw, 'label');
          const el = api.add(g, 'div', 'side ic-chat-win ' + cls + (s.win ? ' win' : ''));
          const barTitle = s.tag ? rich(s.tag) : esc(fallbackTag);
          const winBadge = s.win ? '<span class="ic-win-badge">更优结果</span>' : '<span class="ic-win-tag">对照</span>';
          api.add(
            el,
            'div',
            'ic-win-bar',
            `<span class="ic-win-bar-l"><i class="ic-dot-w"></i><span>${barTitle}</span></span>${winBadge}`
          );

          const head = api.add(el, 'div', 'side-h ic-win-head');
          const hasVal = s.value != null && s.value !== '';
          if (s.label) {
            api.add(head, 'div', 'side-l' + (hasVal ? '' : ' ic-prompt-bub'), rich(s.label));
          }
          let val = null;
          if (hasVal) {
            const v = api.add(head, 'div', 'side-v');
            val = api.num(v, s.value).val;
            if (s.unit) api.add(v, 'span', 'side-u', rich(s.unit));
            api.fitBox(v);
          }

          const pts = [];
          if (s.points) {
            const ul = api.add(el, 'ul', 'side-p ic-win-pts');
            arr(s.points).forEach(p => {
              const pp = norm(p);
              const ok = pp.ok;
              const li = api.add(ul, 'li', ok === false ? 'no' : ok === true ? 'ok' : '');
              api.add(li, 'span', 'mk', ok === false ? api.icon('cross') : ok === true ? api.icon('check') : '<i class="dotm"></i>');
              api.add(li, 'span', 'tx', rich(pp.text));
              pts.push({ li, pp });
            });
          }
          return { el, head, val, pts, s };
        };

        const L = buildSide(d.left || {}, 'left', '方案 A');
        const vs = api.add(g, 'div', 'vs', esc(d.vs ?? 'VS'));
        const Rt = buildSide(d.right || {}, 'right', '方案 B');

        const run = (S, key) => {
          const b = api.beat(S.el, 'card', S.s.at ?? key, {
            auto: [S.s.tag, S.s.label],
            with: S.val ? [[S.val, 'count', 0.05]] : [],
          });
          api.marks(S.head, b);
          S.pts.forEach(({ li, pp }) => {
            const b2 = api.beat(li, 'item', pp.at, { auto: pp.text, spread: true, gap: 0.28 });
            api.marks(li, b2);
          });
          return b;
        };
        run(L, d.leftAt);
        api.beat(vs, 'chip', d.vsAt);
        const rb = run(Rt, d.rightAt);
        const win = L.s.win ? L.el : Rt.s.win ? Rt.el : null;
        if (d.verdict) {
          const v = api.add(body, 'div', 'verdict ic-verdict', `<i class="ic-dot-s"></i><span>${rich(d.verdict)}</span>`);
          const b = api.beat(v, 'text', d.verdictAt, { auto: d.verdict, with: win ? [[win, 'mark', 0]] : [] });
          api.marks(v, b);
        } else if (win) {
          (rb.opt.with = rb.opt.with || []).push([win, 'mark', 0.7]);
        }
      },

      // 7) 条形图：圆角数据面板 + 顶部「标签 + 极细数字」+ 胶囊进度轨
      bars(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'label'));
        const vals = items.map(it => Math.abs(parseFloat(String(it.value ?? 0).replace(/,/g, ''))) || 0);
        const log = d.scale === 'log';
        const f = v => (log ? Math.log10(Math.max(v, 1)) : v);
        const mx = d.max != null ? f(+d.max) : Math.max(...vals.map(f), 1e-9);

        const body = api.body();
        const panel = api.add(body, 'div', 'ic-panel ic-bars-panel');
        api.add(
          panel,
          'div',
          'ic-panel-bar',
          `<span class="ic-pb-l"><i class="ic-dot-s"></i><span>数据对比</span></span>` +
          `<span class="ic-pb-r">${log ? 'LOG SCALE' : 'METRIC'}</span>`
        );
        api.beat(panel, 'card', null, { gap: 0.12 });

        const box = api.add(panel, 'div', 'bars ic-bars' + (log ? ' log' : '') + nc(items.length));
        items.forEach((it, i) => {
          const r = api.add(box, 'div', 'bar-row ic-bar-row' + (isHot(d, i, it) ? ' on' : ''));
          const top = api.add(r, 'div', 'ic-bar-top');
          api.add(top, 'div', 'bar-l', rich(it.label));
          const v = api.add(top, 'div', 'bar-v');
          const { val } = api.num(v, it.display ?? it.value);
          if (it.unit) api.add(v, 'span', 'bar-u', rich(it.unit));

          const tr = api.add(r, 'div', 'bar-track');
          const fill = api.add(tr, 'div', 'bar-fill');
          fill.style.setProperty('--w', cl(f(vals[i]) / mx, 0.04, 1).toFixed(4));

          const w = [[fill, 'grow', 0.05]];
          if (val) w.push([val, 'count', 0.05, { d: 0.9 }]);
          const b = api.beat(r, 'bar', it.at, { auto: it.label, spread: true, focus: focusOf(d, api), with: w });
          api.marks(r, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 8) 结尾页：深色 Keynote 收尾 + 互动输入框 CTA 条
      ending(d, api) {
        const root = api.root;
        root.classList.add('center', 'ic-ending');
        api.head({ big: true });

        const tags = arr(d.tags ?? d.chips);
        if (tags.length) {
          const box = api.add(root, 'div', 'chips');
          const els = tags.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
          api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
        }

        if (d.cta) {
          const bar = api.add(
            root,
            'div',
            'cta ic-end-composer',
            `<span class="ic-end-cta"><i class="ic-dot-live"></i><span class="ic-end-txt">${rich(d.cta)}<i class="ic-caret"></i></span></span>` +
            `<span class="ic-send">↑</span>`
          );
          const b = api.beat(bar, 'card', d.ctaAt, { auto: d.cta });
          api.marks(bar, b);
        }

        const by = d.byline ?? api.story.byline;
        if (by) api.beat(api.add(root, 'div', 'meta byline', rich(by)), 'text', d.bylineAt);
      },
    },
  });
})();
