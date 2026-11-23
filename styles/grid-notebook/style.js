/* 方格手稿 grid-notebook · 学霸课堂笔记本 */
(() => {
  'use strict';
  const { cl, EZ, pad2, esc, rich, plain, rough, arrowHead } = MV.util;
  const f1 = v => (+v).toFixed(1);

  // ───── 自定义动画：手写擦出 & 彩铅填格 ─────
  MV.kinds.handwrite = {
    f(el, p, o) {
      const e = (o.ease || EZ.o3)(p);
      el.style.opacity = p > 0 ? 1 : 0;
      el.style.translate = `0 ${((1 - e) * (o.dist ?? 6)).toFixed(2)}px`;
      el.style.clipPath = p >= 1 ? 'none' : `inset(-24px ${((1 - e) * 100).toFixed(2)}% -28px -24px)`;
    },
  };
  MV.kinds.pencil = {
    f(el, p, o) {
      const e = (o.ease || EZ.o3)(p);
      el.style.scale = `${e.toFixed(4)} 1`;
    },
  };

  // ───── 自定义转场：翻页（右向左掀页，带纸页微倾与折页阴影）─────
  MV.transitions.pageturn = {
    in(p) {
      const e = EZ.o4(p);
      const sh = (0.28 * Math.sin(Math.PI * cl(p))).toFixed(3);
      return {
        translate: `${((1 - e) * 102).toFixed(3)}% 0`,
        rotate: `${((1 - e) * 2.2).toFixed(3)}deg`,
        boxShadow: `-28px 0 64px rgba(48, 36, 20, ${sh})`,
      };
    },
    out(p) {
      const e = EZ.io2(p);
      return {
        translate: `${(-e * 3.5).toFixed(3)}% 0`,
        filter: `brightness(${(1 - 0.11 * e).toFixed(4)})`,
      };
    },
  };

  // ───── 工具：页边栏分类徽章 & 自动提取首段【】关键词或默认批注 ─────
  const TPL_TAG = {
    chapter: '讲次索引',
    statement: '核心观点',
    bignum: '关键数据',
    stats: '数据对比',
    list: '核对清单',
    steps: '步骤流程',
    cards: '拆解卡片',
    compare: '对照分析',
    bars: '方格图表',
    timeline: '时间脉络',
    quote: '原文摘录',
    code: '代码笔记',
    formula: '公式推导',
    image: '图示笔记',
    ending: '课后总结',
    custom: '课堂笔记',
  };
  const FALLBACK_MARGIN = {
    chapter: '新的一讲',
    statement: '★ 划重点',
    bignum: '记住这个数',
    stats: '看清数据',
    list: '逐条核对',
    steps: '按步推进',
    cards: '要点拆解',
    compare: '左右对比看',
    bars: '看清差距',
    timeline: '时间顺序',
    quote: '画线记住',
    code: '动手写一遍',
    formula: '推导过程',
    image: '结合图看',
    ending: '合上本子试',
    custom: '重点批注',
  };
  function pickMarginText(sc) {
    const d = sc.d;
    if (d.margin === false) return '';
    if (d.margin) return String(d.margin);
    const bag = [d.title, d.text, d.verdict, d.label, d.sub, d.cta]
      .concat((d.items || []).map(it => (typeof it === 'string' ? it : `${it.title || ''} ${it.text || ''}`)))
      .filter(Boolean)
      .join(' ');
    const m = /【([^】]{1,10})】/.exec(bag);
    if (m) return `★ ${m[1]}`;
    return FALLBACK_MARGIN[sc.t] || '★ 划重点';
  }

  // ───── 封面原创 SVG 涂鸦（按主题生成物理灯泡流程图或通用钢笔笔记本手绘）─────
  function coverDoodleSvg(story) {
    const all = `${story.title || ''} ${story.series || ''}`;
    const isFeynman = /费曼/.test(all);
    if (isFeynman) {
      return `<svg class="gn-doodle-svg" viewBox="0 0 360 220" fill="none">
        <!-- 左侧：输入与输出闭环小流程图 -->
        <rect x="12" y="30" width="96" height="44" rx="5" fill="#FBF8F0" stroke="#1D1B18" stroke-width="2.6"/>
        <text x="60" y="58" text-anchor="middle" font-family="MV Hand, MV Serif, serif" font-size="20" font-weight="700" fill="#1D1B18">1.选概念</text>
        <path class="dr" d="M112 52 Q144 42 174 52" stroke="#D7372F" stroke-width="2.8" stroke-linecap="round"/>
        <path class="dr" d="M166 45 L176 52 L166 59" stroke="#D7372F" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="12" y="108" width="96" height="44" rx="5" fill="#FFF2EE" stroke="#D7372F" stroke-width="2.6"/>
        <text x="60" y="136" text-anchor="middle" font-family="MV Hand, MV Serif, serif" font-size="20" font-weight="700" fill="#D7372F">2.讲出来</text>
        <path class="dr" d="M60 76 L60 104" stroke="#2B5E9E" stroke-width="2.6" stroke-dasharray="5 4" stroke-linecap="round"/>
        <path class="dr" d="M54 97 L60 105 L66 97" stroke="#2B5E9E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="12" y="192" font-family="MV Script, MV Hand, serif" font-size="24" fill="#D7372F" transform="rotate(-2 12 192)">★ 讲明白才算真懂</text>

        <!-- 右侧：发光灵感灯泡 + 原子环 -->
        <g transform="translate(152, 4)">
          <path class="dr" d="M118 42 C88 42 70 64 70 90 C70 110 82 122 92 134 C96 139 98 145 98 152 L138 152 C138 145 140 139 144 134 C154 122 166 110 166 90 C166 64 148 42 118 42 Z" stroke="#1D1B18" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M90 88 C90 70 103 57 118 57 C134 57 147 70 147 88 C147 103 136 113 130 123 L106 123 C100 113 90 103 90 88 Z" fill="#F6D356" fill-opacity="0.38"/>
          <path class="dr" d="M107 151 L107 118 L113 108 L119 118 L125 108 L130 118 L130 151" stroke="#D7372F" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path class="dr" d="M99 160 L137 160 M101 169 L135 169 M107 178 Q118 184 129 178" stroke="#1D1B18" stroke-width="3" stroke-linecap="round"/>
          <path class="dr" d="M118 14 L118 28 M62 34 L72 44 M174 34 L164 44 M44 88 L58 88 M178 88 L192 88" stroke="#D7372F" stroke-width="3" stroke-linecap="round"/>
          <ellipse class="dr" cx="176" cy="148" rx="25" ry="11" transform="rotate(-24 176 148)" stroke="#2B5E9E" stroke-width="2.4"/>
          <ellipse class="dr" cx="176" cy="148" rx="25" ry="11" transform="rotate(34 176 148)" stroke="#2B5E9E" stroke-width="2.4"/>
          <circle cx="176" cy="148" r="4.2" fill="#D7372F"/>
        </g>
      </svg>`;
    }
    return `<svg class="gn-doodle-svg" viewBox="0 0 360 220" fill="none">
      <!-- 敞开的方格笔记本与荧光标注 -->
      <path class="dr" d="M44 72 Q102 56 162 78 L162 174 Q102 154 44 168 Z" fill="#FBF8F0" stroke="#1D1B18" stroke-width="3.2" stroke-linejoin="round"/>
      <path class="dr" d="M280 72 Q222 56 162 78 L162 174 Q222 154 280 168 Z" fill="#FBF8F0" stroke="#1D1B18" stroke-width="3.2" stroke-linejoin="round"/>
      <rect x="62" y="92" width="76" height="12" rx="2" fill="#F6D356" fill-opacity="0.45"/>
      <path class="dr" d="M62 98 Q102 90 138 100 M62 122 Q102 114 138 124 M62 144 Q102 138 130 146" stroke="#2B5E9E" stroke-width="2.4" stroke-linecap="round"/>
      <path class="dr" d="M184 100 Q222 90 258 98 M184 124 Q222 114 258 122" stroke="#2B5E9E" stroke-width="2.4" stroke-linecap="round"/>
      <ellipse class="dr" cx="222" cy="144" rx="28" ry="11" stroke="#D7372F" stroke-width="2.8"/>
      <!-- 钢笔与星标 -->
      <path class="dr" d="M254 22 L316 62 L272 124 L242 136 L244 106 Z" fill="#F6D356" fill-opacity="0.34" stroke="#1D1B18" stroke-width="3" stroke-linejoin="round"/>
      <path class="dr" d="M242 136 L258 112" stroke="#D7372F" stroke-width="2.8" stroke-linecap="round"/>
      <path class="dr" d="M74 28 L79 42 L93 47 L79 52 L74 66 L69 52 L55 47 L69 42 Z" stroke="#D7372F" stroke-width="2.6" stroke-linejoin="round"/>
      <text x="176" y="202" font-family="MV Script, MV Hand, serif" font-size="25" fill="#D7372F" transform="rotate(-2 176 202)">★ 课堂重点手稿</text>
    </svg>`;
  }

  // 金属回形针 SVG
  const PAPERCLIP_SVG = `<svg class="gn-clip-svg" viewBox="0 0 64 118" fill="none">
    <path d="M22 14 L22 86 C22 100 44 100 44 86 L44 26 C44 14 28 14 28 26 L28 78 C28 84 37 84 37 78 L37 36"
      stroke="#2D3138" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.22" transform="translate(3 4)"/>
    <path d="M22 14 L22 86 C22 100 44 100 44 86 L44 26 C44 14 28 14 28 26 L28 78 C28 84 37 84 37 78 L37 36"
      stroke="#4E5663" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M20.8 16 L20.8 84 C20.8 97 42.5 97 42.5 84 L42.5 27"
      stroke="#D7DCE4" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;

  // 结尾手绘红笔完成徽章 SVG
  const END_SEAL_SVG = `<svg class="gn-end-seal" viewBox="0 0 116 116" fill="none">
    <path class="dr" d="M58 10 C86 8 107 30 105 58 C103 87 82 106 56 105 C28 104 10 83 12 56 C14 27 36 12 63 13" stroke="#D7372F" stroke-width="4" stroke-linecap="round"/>
    <path class="dr" d="M32 58 L50 76 L86 38" stroke="#D7372F" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  MV.style({
    transition: { kind: 'pageturn', dur: 0.62 },
    motion: {
      kicker: { kind: 'handwrite', d: 0.55, gap: 0 },
      title: { kind: 'handwrite', d: 0.72, stagger: 0.14, gap: 0.12 },
      big: { kind: 'handwrite', d: 0.75, stagger: 0.15, gap: 0.14 },
      text: { kind: 'rise', d: 0.52, gap: 0.28, o: { dist: 16 } },
      item: { kind: 'handwrite', d: 0.52, stagger: 0.08, gap: 0.36 },
      card: { kind: 'drop', d: 0.54, stagger: 0.09, gap: 0.32, o: { dist: 20, rot: 1.6 } },
      chip: { kind: 'pop', d: 0.4, stagger: 0.07, gap: 0.25, o: { from: 0.75 } },
      image: { kind: 'drop', d: 0.68, gap: 0.28, o: { dist: 22, rot: -1.5 } },
      bar: { kind: 'fade', d: 0.32, gap: 0.32 },
      grow: { kind: 'pencil', d: 0.85 },
      note: { kind: 'handwrite', d: 0.8, gap: 0.42 },
      quote: { kind: 'handwrite', d: 0.78, stagger: 0.2, gap: 0.2 },
      line: { kind: 'draw', d: 0.62 },
      stamp: { kind: 'stamp', d: 0.48, gap: 0.28 },
    },
    focus: true,
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'paper',
    kenBurns: 0.03,
    quoteMark: '“',

    // ───── 底纸：米白方格纸 + 纤维 + 40px 淡蓝方格 + 左侧装订孔 + 红双竖页边线 + 顶双横线 ─────
    paint(g, W, H, R, u) {
      g.fillStyle = '#F5F0E4';
      g.fillRect(0, 0, W, H);

      // 细腻纸纤维
      for (let i = 0; i < 720; i++) {
        const x = R() * W, y = R() * H, l = 6 + R() * 20, a = R() * Math.PI;
        g.strokeStyle = `rgba(128,108,78,${(0.022 + R() * 0.038).toFixed(3)})`;
        g.lineWidth = 0.6 + R() * 0.7;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(
          x + Math.cos(a) * l * 0.5 + (R() - 0.5) * 3,
          y + Math.sin(a) * l * 0.5 + (R() - 0.5) * 3,
          x + Math.cos(a) * l,
          y + Math.sin(a) * l
        );
        g.stroke();
      }

      // 40px 淡蓝方格（每 5 格一条主线）
      const s = 40;
      g.lineWidth = 1;
      for (let x = s; x < W; x += s) {
        const major = x % (s * 5) === 0;
        g.strokeStyle = major ? 'rgba(43, 94, 158, .19)' : 'rgba(43, 94, 158, .095)';
        g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke();
      }
      for (let y = s; y < H; y += s) {
        const major = y % (s * 5) === 0;
        g.strokeStyle = major ? 'rgba(43, 94, 158, .19)' : 'rgba(43, 94, 158, .095)';
        g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke();
      }

      // 左侧书脊压痕阴影
      const sp = g.createLinearGradient(0, 0, 24, 0);
      sp.addColorStop(0, 'rgba(65, 52, 34, .18)');
      sp.addColorStop(0.45, 'rgba(65, 52, 34, .05)');
      sp.addColorStop(1, 'rgba(65, 52, 34, 0)');
      g.fillStyle = sp;
      g.fillRect(0, 0, 24, H);

      // 左侧活页装订孔（4 个，靠左不挡批注字）
      const hx = u.land ? 30 : 22;
      const hr = u.land ? 10 : 8.5;
      [0.18, 0.39, 0.61, 0.82].forEach(frac => {
        const hy = Math.round(H * frac);
        g.save();
        g.beginPath();
        g.arc(hx, hy, hr, 0, Math.PI * 2);
        g.fillStyle = '#DED7C8';
        g.fill();
        g.lineWidth = 1.5;
        g.strokeStyle = 'rgba(72, 60, 44, .34)';
        g.stroke();
        g.beginPath();
        g.arc(hx + 1.2, hy + 1.2, hr - 1.4, Math.PI * 0.9, Math.PI * 1.9);
        g.strokeStyle = 'rgba(40, 32, 22, .22)';
        g.lineWidth = 1.8;
        g.stroke();
        g.restore();
      });

      // 顶部页眉双横线
      const hy = { r34: 122, r916: 202, r169: 110 }[u.rc] || 122;
      g.strokeStyle = 'rgba(43, 94, 158, .42)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(44, hy); g.lineTo(W - 44, hy); g.stroke();
      g.strokeStyle = 'rgba(43, 94, 158, .24)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(44, hy + 5); g.lineTo(W - 44, hy + 5); g.stroke();

      // 左侧红色双竖页边线（划分「页边批注栏」与「正文方格栏」）
      const mx = u.land ? 276 : 196;
      g.strokeStyle = 'rgba(215, 55, 47, .58)';
      g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(mx, 0); g.lineTo(mx, H); g.stroke();
      g.strokeStyle = 'rgba(215, 55, 47, .26)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(mx + 5, 0); g.lineTo(mx + 5, H); g.stroke();

      // 温和纸边暗角
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      vg.addColorStop(0, 'rgba(90, 72, 46, 0)');
      vg.addColorStop(1, 'rgba(90, 72, 46, .10)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
      u.noise(5.5, 17);
    },

    // ───── 全局页眉 / 页脚 / 进度尺 ─────
    chrome(c) {
      const top = c.h('div', 'gn-top');
      const pg = c.h('span', 'gn-pg');
      const mid = c.h('div', 'gn-top-main');
      const ser = c.h('span', 'gn-ser', c.esc(c.plain(c.story.series || c.story.title || '课堂笔记')));
      const sec = c.h('span', 'gn-sec');
      mid.append(ser, sec);
      top.append(pg, mid);

      // 顶部彩铅进度条 + 红笔小三角游标
      const prog = c.h('div', 'gn-prog');
      const bar = c.h('i', 'gn-prog-fill');
      const ptr = c.h('b', 'gn-prog-ptr');
      prog.append(bar, ptr);

      const foot = c.h('div', 'gn-foot');
      const by = c.h('span', 'gn-by', c.esc(c.plain(c.story.byline || '')));
      const spec = c.h('span', 'gn-spec', '5mm GRID · NOTEBOOK');
      foot.append(by, spec);

      c.el.append(top, prog, foot);
      let last = '';
      return info => {
        const k = `${info.page}|${info.section}|${info.cover ? 1 : 0}|${info.type}`;
        if (k !== last) {
          last = k;
          pg.textContent = info.type === 'cover' ? 'NOTEBOOK' : `P.${info.page}/${info.total}`;
          sec.textContent = info.type === 'cover' ? '' : (info.section || '');
        }
        const p = c.cl(info.progress);
        bar.style.scale = `${p.toFixed(4)} 1`;
        ptr.style.left = `${(p * 100).toFixed(3)}%`;
      };
    },

    // ───── 模板重写：彻底按方格笔记本版式语法重构 ─────
    templates: {
      // 1) 封面：贴在笔记本首页上的标签框 + 回形针 + 胶带 + 下半页手绘速记卡与涂鸦
      cover(d, api) {
        api.root.classList.add('gn-cover-root');
        const split = d.layout === 'split' || api.land;
        const wrap = api.add(api.root, 'div', 'gn-cover-wrap' + (split ? ' is-split' : ''));

        // 主贴纸标签框
        const card = api.add(wrap, 'div', 'gn-cover-card');
        api.add(card, 'div', 'gn-paperclip', PAPERCLIP_SVG);
        api.add(card, 'div', 'gn-tape');

        // 顶部课程 / 卷号 / 规格表头栏
        const metaRow = api.add(card, 'div', 'gn-card-meta');
        const subj = d.kicker || api.story.series || '课堂笔记';
        const noMatch = /\d+/.exec(String(subj));
        const noText = noMatch ? pad2(noMatch[0]) : '01';
        api.add(metaRow, 'div', 'gn-cm-cell gn-cm-subj', `<small>SUBJECT / 主题</small><span>${rich(subj)}</span>`);
        api.add(metaRow, 'div', 'gn-cm-cell gn-cm-no', `<small>NO.</small><span>#${esc(noText)}</span>`);
        api.add(metaRow, 'div', 'gn-cm-cell gn-cm-grid', `<small>GRID</small><span>5mm</span>`);

        // 标签框内正文区（带基线格线）
        const body = api.add(card, 'div', 'gn-card-body');
        if (d.title) {
          const h1 = api.add(body, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const tb = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = tb;
          api.marks(h1, tb);
          api.fitTitle(h1);
          // 标题下方手绘红笔双下划线
          const ulSvg = api.add(body, 'div', 'gn-cover-ul',
            `<svg viewBox="0 0 420 18" preserveAspectRatio="none"><path class="dr" d="M2 7 Q110 2 215 8 T418 6" stroke="#D7372F" stroke-width="3.6" fill="none" stroke-linecap="round"/><path class="dr" d="M6 14 Q130 11 255 15 T414 13" stroke="#D7372F" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.72"/></svg>`);
          api.beat(ulSvg, 'line', null, { gap: 0.08 });
        }
        if (d.sub ?? d.dek) {
          const subEl = api.add(body, 'div', 'dek', rich(d.sub ?? d.dek));
          const sb = api.beat(subEl, 'text', d.subAt);
          api.marks(subEl, sb);
        }
        if (d.meta) {
          const m = api.add(body, 'div', 'gn-cover-meta', rich(d.meta));
          api.beat(m, 'note', d.metaAt);
        }
        api.beat(card, 'card', 0.05, { gap: 0 });
        const cBeat = api.sc.beats.pop();
        api.sc.beats.unshift(cBeat);

        // 下方 / 右侧：手绘速记卡（含索引标签 + 课本涂鸦 或 封面图）
        const side = api.add(wrap, 'div', 'gn-cover-side');
        if (d.image) {
          api.media(d.image, { parent: side, frame: d.frame || 'paper', at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
        } else {
          const tags = Array.isArray(d.tags ?? d.chips) ? (d.tags ?? d.chips) : (d.tags ?? d.chips ? [d.tags ?? d.chips] : []);
          const sideLeft = api.add(side, 'div', 'gn-cover-notes');
          api.add(sideLeft, 'div', 'gn-sketch-kicker', 'KEY POINTS · 课堂速记');
          if (tags.length) {
            const box = api.add(sideLeft, 'div', 'chips gn-tabs');
            const els = tags.map((c, i) => api.add(box, 'span', 'chip gn-tab' + (i === 0 ? ' hot' : ''), rich(c)));
            api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
          }
          const memo = api.add(sideLeft, 'div', 'gn-cover-memo',
            `<span class="gn-memo-star">✎</span><span>${esc(d.margin || '边讲边写 · 重点红笔圈出')}</span>`);
          api.beat(memo, 'note', null, { gap: 0.2 });

          const doodle = api.add(side, 'div', 'gn-doodle', coverDoodleSvg(api.story));
          api.beat(doodle, 'fade', null, { gap: 0.15 });
        }
      },

      // 2) 章节页：翻到新的一页，左上角红笔大号「第 N 讲 / Lesson NN」+ 手绘双横线
      chapter(d, api) {
        api.root.classList.add('center', 'gn-chap-root');
        const rawNum = d.num ?? pad2(api.sc.chapNo || 1);
        const topRow = api.add(api.root, 'div', 'gn-chap-top');
        if (rawNum !== false && rawNum !== '') {
          const isDigits = /^\d+$/.test(String(rawNum).trim());
          const numVal = isDigits ? parseInt(rawNum, 10) : null;
          const labelZh = isDigits ? `第 ${numVal} 讲` : String(rawNum);
          const labelEn = isDigits ? `LESSON ${pad2(numVal)}` : 'CHAPTER';
          const badge = api.add(topRow, 'div', 'gn-chap-badge',
            `<span class="chap-num">${esc(labelZh)}</span><span class="gn-chap-en">${esc(labelEn)}</span>`);
          api.beat(badge, 'big', d.numAt);
        }
        const tab = api.add(topRow, 'div', 'gn-chap-tab', `PART ${pad2(api.sc.chapNo || 1)}`);
        api.beat(tab, 'chip', null, { gap: 0.05 });

        // 手绘红黑双横线
        const rule = api.add(api.root, 'div', 'gn-chap-rule',
          `<svg viewBox="0 0 700 22" preserveAspectRatio="none">
            <path class="dr" d="M2 8 Q180 4 360 9 T698 7" stroke="#D7372F" stroke-width="4.2" fill="none" stroke-linecap="round"/>
            <path class="dr" d="M4 17 Q210 15 430 18 T694 16" stroke="#1D1B18" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.72"/>
          </svg>`);
        api.beat(rule, 'line', null, { gap: 0.08 });

        api.head({ big: true, kicker: null });
        api.note(api.root, d.note, d.noteAt);
      },

      // 3) 大数字：红笔写大并画手绘椭圆圈
      bignum(d, api, base) {
        base(d, api);
        const row = api.root.querySelector('.bn-row');
        if (!row) return;
        const ovalSvg = api.svg('svg', { class: 'gn-bn-oval' });
        row.appendChild(ovalSvg);
        api.layout(() => {
          ovalSvg.innerHTML = '';
          const numEl = row.querySelector('.num');
          if (!numEl) return;
          const r = api.rel(numEl, row);
          const u = row.querySelector('.bn-u');
          const ur = u ? api.rel(u, row) : null;
          const x0 = r.x, x1 = ur ? ur.r : r.r;
          const w = x1 - x0, h = r.h;
          const cx = x0 + w / 2, cy = r.cy;
          const rx = w * 0.54 + 18, ry = h * 0.54 + 12;
          const dPath = rough.circle(cx, cy, rx, ry, api.R, 1.12, 0.055);
          const p = api.svg('path', { class: 'dr', d: dPath });
          ovalSvg.appendChild(p);
          const bnBeat = api.sc.beats.find(b => b.els.includes(row));
          if (bnBeat) (bnBeat.extra = bnBeat.extra || []).push({ el: p, delay: 0.25, d: 0.7 });
        });
      },

      // 4) 对比页：一页对折成两栏，中间画竖线，胜出方画大红勾
      compare(d, api, base) {
        base(d, api);
        const cmp = api.root.querySelector('.cmp');
        if (!cmp) return;
        const fold = api.add(cmp, 'div', 'gn-fold');
        fold.innerHTML = `<svg viewBox="0 0 24 420" preserveAspectRatio="none">
          <path class="dr" d="M12 4 Q10 110 13 215 T11 416" stroke="#1D1B18" stroke-width="2.6" stroke-dasharray="10 7" fill="none" stroke-linecap="round" opacity="0.52"/>
        </svg>`;
        const vs = cmp.querySelector('.vs');
        if (vs) {
          const ring = rough.circle(50, 50, 42, 38, api.R, 1.1, 0.06);
          vs.innerHTML = `<svg class="gn-vs-ring" viewBox="0 0 100 100"><path class="dr" d="${ring}"/></svg><span>${vs.textContent}</span>`;
        }
        const winSide = cmp.querySelector('.side.win');
        if (winSide) {
          api.add(winSide, 'div', 'gn-win-badge',
            `<svg viewBox="0 0 120 104" fill="none">
              <path class="gn-win-circle" d="M58 10 C86 8 108 26 106 52 C104 79 80 96 54 94 C26 92 10 74 12 49 C14 23 36 11 63 12" stroke="#D7372F" stroke-width="3.4" stroke-linecap="round"/>
              <path class="gn-win-tick" d="M26 52 L48 76 L98 20" stroke="#D7372F" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`);
        }
      },

      // 5) 条形图：彩铅填格 + 方格刻度尺
      bars(d, api, base) {
        base(d, api);
        const box = api.root.querySelector('.bars');
        if (!box) return;
        const ticks = d.scale === 'log'
          ? ['0', '×10', '×100', '×1000', 'MAX']
          : ['0', '2格', '4格', '6格', '8格', '10格'];
        const ruler = api.h('div', 'gn-bar-ruler',
          `<span class="gn-br-cap">GRID SCALE</span><div class="gn-br-ticks">${ticks.map(t => `<i>${esc(t)}</i>`).join('')}</div>`);
        box.prepend(ruler);
        api.beat(ruler, 'fade', null, { gap: 0.05 });
        const rBeat = api.sc.beats.pop();
        const firstBarIdx = api.sc.beats.findIndex(b => b.role === 'bar');
        if (firstBarIdx >= 0) api.sc.beats.splice(firstBarIdx, 0, rBeat);
        else api.sc.beats.push(rBeat);
      },

      // 6) 结尾页：笔记本收尾卡 + 手绘完成红勾章 + 红笔下划线 CTA
      ending(d, api) {
        api.root.classList.add('center', 'gn-end-root');
        const card = api.add(api.root, 'div', 'gn-end-card');
        api.add(card, 'div', 'gn-tape gn-tape-l');
        api.add(card, 'div', 'gn-tape gn-tape-r');

        api.head({ big: true, parent: card });
        if (d.tags ?? d.chips) {
          const list = Array.isArray(d.tags ?? d.chips) ? (d.tags ?? d.chips) : [d.tags ?? d.chips];
          if (list.length) {
            const box = api.add(card, 'div', 'chips gn-tabs');
            const els = list.map((c, i) => api.add(box, 'span', 'chip gn-tab' + (i === 0 ? ' hot' : ''), rich(c)));
            api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: list[0] });
          }
        }
        if (d.cta) {
          const cta = api.add(card, 'div', 'cta gn-end-cta', rich(d.cta));
          const b = api.beat(cta, 'text', d.ctaAt, { auto: d.cta });
          api.marks(cta, b);
        }

        // 卡片底部栏：左侧署名、右侧完成红勾章（不压住 CTA 文字）
        const footRow = api.add(card, 'div', 'gn-end-foot');
        const by = d.byline ?? api.story.byline;
        if (by) {
          api.beat(api.add(footRow, 'div', 'meta byline gn-end-by', rich(by)), 'text', d.bylineAt);
        } else {
          api.add(footRow, 'div', 'gn-end-by', 'NOTEBOOK COMPLETED');
        }
        const seal = api.add(footRow, 'div', 'gn-end-seal-wrap', END_SEAL_SVG);
        api.beat(seal, 'fade', null, { last: true });
      },
    },

    // ───── 全局场景装饰：给所有内页构建「左侧页边批注栏」+ 晚半拍手绘红箭头 ─────
    decorate(sc, api) {
      if (sc.t === 'cover') return;

      const margin = api.add(sc.el, 'aside', 'gn-margin');
      // 1) 页边栏笔记分类小标签
      api.add(margin, 'div', 'gn-m-idx', TPL_TAG[sc.t] || '课堂笔记');

      // 2) 把 kicker 挪进左侧页边栏（如果存在）
      const kicker = sc.content.querySelector('.head > .kicker');
      if (kicker) {
        const head = kicker.parentElement;
        kicker.classList.add('gn-m-kicker');
        margin.appendChild(kicker);
        if (head && head.children.length === 0) head.remove();
      }

      // 3) 页边红笔手写批注 + 跨红线的手绘弯曲红箭头（晚半拍出现）
      const mText = pickMarginText(sc);
      if (mText) {
        const noteBox = api.add(margin, 'div', 'gn-m-note');
        const txt = api.add(noteBox, 'div', 'gn-m-text', esc(mText));
        const arrowD = 'M14 10 Q48 42 98 34 ' + arrowHead(52, 39, 98, 34, 13, 0.52);
        const arrowSvg = api.add(noteBox, 'div', 'gn-m-arrow',
          `<svg viewBox="0 0 112 52" fill="none"><path class="dr" d="${arrowD}" stroke="#D7372F" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
        const arrowPath = arrowSvg.querySelector('path');
        const anchor = sc.beats.find(b => !b.opt.free && b.role !== 'kicker') || sc.beats[0];
        sc.beats.push({
          els: [txt],
          role: 'note',
          key: null,
          opt: {
            free: true,
            parent: anchor,
            with: arrowPath ? [[arrowPath, 'line', 0.14, { d: 0.58 }]] : [],
          },
          t: null,
        });
      }

      // 4) 为代码窗口贴上边角胶带
      const codeWin = sc.content.querySelector('.code-win');
      if (codeWin) {
        api.add(codeWin, 'i', 'gn-code-tape gn-ct-l');
        api.add(codeWin, 'i', 'gn-code-tape gn-ct-r');
      }
    },

    // ───── 手画连线箭头（步骤 & 时间线）─────
    link(x1, y1, x2, y2, o) {
      const L = Math.hypot(x2 - x1, y2 - y1);
      if (L < 6) return '';
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
      const curve = Math.min(18, L * 0.14) * (o.i % 2 === 0 ? 1 : -1);
      const cx = mx + nx * curve, cy = my + ny * curve;
      return `M${f1(x1)} ${f1(y1)} Q${f1(cx)} ${f1(cy)} ${f1(x2)} ${f1(y2)} ` + arrowHead(cx, cy, x2, y2, 14, 0.52);
    },

    // ───── 步骤手画红笔双圈序号 ─────
    badge(i, s, api) {
      const r1 = rough.circle(50, 50, 43, 41, api.R, 1.12, 0.065);
      return `<svg class="gn-ring" viewBox="0 0 100 100"><path class="dr" d="${r1}"/></svg><b>${i + 1}</b>`;
    },

    // ───── 列表标记：手画方框（讲到时动态打勾/打叉）、编号手画红圈 ─────
    marker(mode, i, ok, api) {
      if (mode === 'number') {
        const ring = rough.circle(32, 32, 26, 24, api.R, 1.1, 0.07);
        return `<span class="gn-num-mk"><svg viewBox="0 0 64 64"><path class="dr" d="${ring}"/></svg><b>${i + 1}</b></span>`;
      }
      const box = 'M8 10 L40 8 L41 40 L9 41 Z';
      if (ok === false || mode === 'cross') {
        return `<svg class="gn-chk is-no" viewBox="0 0 48 48">
          <path class="gn-box" d="${box}"/>
          <path class="dr gn-x" d="M13 13 L35 35 M36 13 L13 35"/>
        </svg>`;
      }
      const cls = ok === true || mode === 'check' ? 'gn-chk is-ok' : 'gn-chk is-todo';
      return `<svg class="${cls}" viewBox="0 0 48 48">
        <path class="gn-box" d="${box}"/>
        <path class="dr gn-tick" d="M11 24 L21 34 L42 10"/>
      </svg>`;
    },
  });
})();
