/* 报纸号外 newsprint · 老报纸头版与特刊版式系统 */
(() => {
  'use strict';
  const { cl, EZ, esc, rich, plain, pad2 } = MV.util;
  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
  const norm = (it, key = 'text') => (it == null ? {} : typeof it === 'object' ? it : { [key]: String(it) });
  const lines = v => arr(v).flatMap(s => String(s).split('\n')).filter(s => s.trim() !== '');
  const isHot = (d, i, it) => !!(it && it.on) || d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
  const focusOf = (d, api) => d.focus ?? !!api.style.focus;
  const nc = n => ' n' + Math.max(1, Math.min(n, 9));

  // ───── 自定义印刷感动画 ─────
  MV.kinds.pressSlam = {
    f(el, p, o) {
      const e = EZ.o4(p);
      el.style.opacity = cl(p * 3.2).toFixed(4);
      el.style.scale = (1 + (1 - e) * (o.amt ?? 0.13)).toFixed(4);
      el.style.filter = p >= 1 ? 'none' : `blur(${((1 - e) * 1.8).toFixed(2)}px)`;
    },
  };
  MV.kinds.inkPrint = {
    f(el, p) {
      const e = EZ.o3(p);
      el.style.opacity = cl(p * 2.2).toFixed(4);
      el.style.scale = (1 + (1 - e) * 0.024).toFixed(4);
      el.style.filter = p >= 1 ? 'none' : `blur(${((1 - e) * 1.8).toFixed(2)}px)`;
    },
  };
  MV.kinds.ruleDraw = {
    f(el, p, o) {
      const e = (o.ease || EZ.o3)(p);
      el.style.opacity = p > 0 ? 1 : 0;
      el.style.scale = `${e.toFixed(4)} 1`;
    },
  };

  // 每种模板对应的默认报纸版面栏名
  const DESK = {
    cover: '头版要闻',
    chapter: '专版导读',
    bignum: '特号公报',
    statement: '社论头条',
    cards: '人物·专题',
    stats: '数据公报',
    list: '电讯简报',
    steps: '程序公报',
    compare: '对照专栏',
    bars: '图表统计',
    timeline: '时序日程',
    quote: '社论引语',
    image: '传真摄影',
    code: '电报原码',
    formula: '科学公报',
    ending: '终版封底',
    custom: '特别报道',
  };

  // 反白黑底专版（章节页 / dark 变体）
  const DARK_VARS = {
    '--fg': '#EFE6D2',
    '--fg2': '#C7BCA5',
    '--fg3': '#958B78',
    '--accent': '#DF3B30',
    '--accent2': '#EFE6D2',
    '--on-accent': '#F7F1E3',
    '--hl': '#E84A3E',
    '--line': 'rgba(239, 230, 210, .28)',
    '--line-strong': '#EFE6D2',
    '--card-bg': 'rgba(239, 230, 210, .06)',
    '--card-bd': '#EFE6D2',
    '--sub-fg': '#EFE6D2',
    '--sub-hl': '#F0564A',
  };

  // 工具：提取故事里的章节/重点条目供无图头版「本期要目」使用
  function buildIndexItems(story) {
    const out = [];
    const scs = story.scenes || [];
    const pickText = s => {
      const t = plain(s.title || s.label || (s.text ? String(s.text).split('\n')[0] : '')).replace(/\n/g, ' ').trim();
      return t.length <= 20 ? t : t.slice(0, 19) + '…';
    };
    // 优先收录章节与带标题的重点页
    for (let i = 1; i < scs.length; i++) {
      const s = scs[i];
      if (s.type === 'ending') continue;
      if (s.type === 'chapter' || s.title) {
        const txt = pickText(s);
        if (txt) out.push({ page: pad2(i + 1), text: txt });
      }
      if (out.length >= 4) break;
    }
    if (out.length < 4) {
      for (let i = 1; i < scs.length && out.length < 4; i++) {
        const s = scs[i];
        if (s.type === 'ending' || out.some(x => x.page === pad2(i + 1))) continue;
        const txt = pickText(s);
        if (txt) out.push({ page: pad2(i + 1), text: txt });
      }
    }
    return out;
  }

  // 工具：将通用稿的口播/副题拆分成真实可读的新闻栏段落（避免乱码或空栏）
  function buildCoverColumns(d, story, count) {
    const explicit = arr(d.columns).map(s => String(s).trim()).filter(Boolean);
    if (explicit.length) {
      if (count >= explicit.length) return explicit;
      if (count === 2 && explicit.length >= 3) {
        return [explicit[0] + ' ' + explicit[1], explicit.slice(2).join(' ')];
      }
      return explicit.slice(0, count);
    }
    // 收集故事开头各场景的真实口播句子，均衡填满每一栏（约 55~75 字/栏）
    const sentences = [];
    const say0 = arr(d.say).map(s => plain(s).trim()).filter(Boolean);
    if (say0.length) sentences.push('〔本报讯〕' + say0.join(''));
    const scs = story.scenes || [];
    for (let i = 1; i < scs.length && sentences.length < 8; i++) {
      const s = scs[i];
      if (s.type === 'ending') continue;
      arr(s.say).forEach(x => {
        const t = plain(x).trim();
        if (t) sentences.push(t);
      });
    }
    if (!sentences.length && d.sub) sentences.push(plain(d.sub));
    const cols = Array.from({ length: count }, () => '');
    let ci = 0;
    for (const s of sentences) {
      if (!cols[ci]) cols[ci] = s;
      else if (cols[ci].length < 52) cols[ci] += s;
      else if (ci + 1 < count) { ci++; cols[ci] = s; }
      else if (cols[ci].length < 72) cols[ci] += s;
      else break;
    }
    return cols.filter(Boolean);
  }

  // 工具：首字下沉渲染
  function dropCapHtml(text) {
    const clean = plain(text).trim();
    if (!clean) return '';
    // 如果以〔本报...〕开头，把电头套红加粗，后面首字下沉或直接续接
    const m = clean.match(/^(〔[^〕]{2,8}〕)(.*)$/);
    if (m) {
      return `<span class="np-dateline-lead">${esc(m[1])}</span>${esc(m[2])}`;
    }
    const chars = Array.from(clean);
    const first = chars.shift() || '';
    return `<span class="np-dropcap">${esc(first)}</span>${esc(chars.join(''))}`;
  }

  function addChips(d, api, parent, list) {
    list = arr(list);
    if (!list.length) return null;
    const box = api.add(parent, 'div', 'chips');
    const els = list.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
    api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: list[0] });
    return box;
  }

  MV.style({
    // 新版面像一张报纸从下方翻入覆盖旧版
    transition: { kind: 'paper', dur: 0.66 },
    motion: {
      kicker: { kind: 'wipe', d: 0.42, gap: 0 },
      title: { kind: 'pressSlam', d: 0.52, stagger: 0.09, gap: 0.1, o: { amt: 0.12 } },
      big: { kind: 'pressSlam', d: 0.54, stagger: 0.1, gap: 0.12, o: { amt: 0.14 } },
      text: { kind: 'inkPrint', d: 0.5, gap: 0.22 },
      item: { kind: 'inkPrint', d: 0.46, stagger: 0.06, gap: 0.34 },
      card: { kind: 'inkPrint', d: 0.5, stagger: 0.08, gap: 0.32 },
      chip: { kind: 'pop', d: 0.36, stagger: 0.05, gap: 0.2, o: { from: 0.72 } },
      image: { kind: 'inkPrint', d: 0.62, gap: 0.22 },
      bar: { kind: 'fade', d: 0.32, gap: 0.32 },
      grow: { kind: 'grow', d: 0.82 },
      quote: { kind: 'inkPrint', d: 0.68, stagger: 0.16, gap: 0.18 },
      note: { kind: 'inkPrint', d: 0.48, gap: 0.28 },
      stamp: { kind: 'stamp', d: 0.46, gap: 0.2 },
    },
    focus: true,
    subMax: { r34: 16, r916: 14, r169: 25 },
    mediaFrame: 'halftone',
    kenBurns: 0.035,
    quoteMark: '“',

    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'light') return { tone: 'light' };
      if (d.bg === 'dark' || t === 'chapter') {
        return { tone: 'dark', bg: '#1A1917', vars: DARK_VARS };
      }
      return { tone: 'light' };
    },

    // 底纸：旧报纸米黄 #EFE6D2 + 纸浆纤维 + 油墨微粒 + 边缘微黄 + 中线折痕 + 套准十字标
    paint(g, W, H, R, u) {
      g.fillStyle = '#EFE6D2';
      g.fillRect(0, 0, W, H);

      // 细微底色层次斑驳（模拟陈年新闻纸氧化）
      for (let i = 0; i < 24; i++) {
        const cx = R() * W, cy = R() * H, rad = (0.14 + R() * 0.24) * Math.min(W, H);
        const rg = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
        rg.addColorStop(0, `rgba(165, 134, 78, ${(0.015 + R() * 0.022).toFixed(3)})`);
        rg.addColorStop(1, 'rgba(165, 134, 78, 0)');
        g.fillStyle = rg;
        g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      }

      // 纸浆纤维
      for (let i = 0; i < 1300; i++) {
        const x = R() * W, y = R() * H, l = 4 + R() * 18, a = R() * Math.PI;
        g.strokeStyle = `rgba(92, 74, 48, ${(0.028 + R() * 0.048).toFixed(3)})`;
        g.lineWidth = 0.5 + R() * 0.7;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }

      // 细小印刷墨点
      for (let i = 0; i < 360; i++) {
        const x = R() * W, y = R() * H, r = 0.5 + R() * 1.1;
        g.fillStyle = `rgba(30, 26, 20, ${(0.04 + R() * 0.08).toFixed(3)})`;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }

      // 边缘泛黄暗角
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      vg.addColorStop(0, 'rgba(155, 118, 52, 0)');
      vg.addColorStop(1, 'rgba(145, 108, 44, .18)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);

      // 报纸折痕：竖版横折，横版中缝竖折
      const land = u.land;
      const c0 = land ? W * 0.5 : H * 0.51;
      const gr = land ? g.createLinearGradient(c0 - 34, 0, c0 + 34, 0) : g.createLinearGradient(0, c0 - 34, 0, c0 + 34);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.45, 'rgba(255,252,244,.22)');
      gr.addColorStop(0.5, 'rgba(72,54,28,.14)');
      gr.addColorStop(0.57, 'rgba(72,54,28,0)');
      g.fillStyle = gr;
      if (land) g.fillRect(c0 - 34, 0, 68, H);
      else g.fillRect(0, c0 - 34, W, 68);

      // 四角印刷套准十字线
      const m = land ? 26 : 22;
      g.strokeStyle = 'rgba(26, 26, 26, .22)';
      g.lineWidth = 1.2;
      const corners = [[m, m], [W - m, m], [m, H - m], [W - m, H - m]];
      corners.forEach(([x, y]) => {
        g.beginPath();
        g.moveTo(x - 10, y); g.lineTo(x + 10, y);
        g.moveTo(x, y - 10); g.lineTo(x, y + 10);
        g.stroke();
      });

      u.noise(9, 17);
    },

    overlay(g, W, H, R, u) {
      g.fillStyle = '#fff';
      g.fillRect(0, 0, W, H);
      u.noise(14, 41);
    },

    // 全局报眉（内页显示，头版隐藏让位于大报头）+ 全局报脚（署名 / 墨线进度 / 转版提示）
    chrome(c) {
      const pubName = plain(c.story.masthead || c.story.series || c.story.title || '环球纪事报');
      const top = c.h('div', 'np-top');
      const topRow = c.h('div', 'np-top-row');
      const runName = c.h('span', 'np-run-name', esc(pubName));
      const runSec = c.h('span', 'np-run-sec');
      const runRight = c.h('span', 'np-top-right');
      const runDesk = c.h('span', 'np-run-desk');
      const folio = c.h('span', 'np-folio');
      runRight.append(runDesk, folio);
      topRow.append(runName, runSec, runRight);
      top.append(topRow, c.h('div', 'np-top-rule'));

      const foot = c.h('div', 'np-foot');
      const fLeft = c.h('span', 'np-f-left');
      fLeft.append(
        c.h('span', 'np-by', esc(plain(c.story.byline || ''))),
        c.h('span', 'np-tot', `共 ${pad2(c.scenes.length)} 版`)
      );
      const prog = c.h('div', 'np-prog');
      const progFill = c.h('i', 'np-prog-fill');
      prog.appendChild(progFill);
      const cont = c.h('span', 'np-cont');
      foot.append(fLeft, prog, cont);

      c.el.append(top, foot);
      const fallbackSec = plain(c.story.series || c.story.title || '');
      let lastKey = '';
      return info => {
        const isCover = info.cover || info.type === 'cover';
        const k = (isCover ? 'C' : info.page) + '|' + info.type + '|' + (info.section || '');
        if (k !== lastKey) {
          lastKey = k;
          top.style.display = isCover ? 'none' : '';
          runSec.textContent = info.section || fallbackSec;
          runDesk.textContent = DESK[info.type] || '新闻版';
          folio.innerHTML = `第 <b>${info.page}</b> 版`;
          if (info.i + 1 < info.n) {
            cont.textContent = `下转第 ${pad2(info.i + 2)} 版 ▶`;
            cont.classList.remove('is-end');
          } else {
            cont.textContent = '本号终 · 全文完';
            cont.classList.add('is-end');
          }
        }
        progFill.style.scale = `${cl(info.progress).toFixed(4)} 1`;
      };
    },

    // ───── 模板重写：每一页都是地道的报纸版面 ─────
    templates: {
      // 1) 头版 FRONT PAGE：报头 + 报耳 + 通栏标题 + 网点主图 + 多栏竖线实文 + 号外章
      cover(d, api) {
        const st = api.story;
        const pub = plain(st.masthead || st.series || '环球纪事报');
        const total = pad2((st.scenes || []).length || 1);
        const layout = d.layout || 'classic';

        // 1.1 报头区（固定在头版顶部）
        const mh = api.add(api.root, 'div', 'np-masthead');
        const mhRow = api.add(mh, 'div', 'np-mh-row');
        api.add(mhRow, 'div', 'np-ear l', `<b>号外特刊</b><span>EXTRA EDITION</span>`);
        const mhTitle = api.add(mhRow, 'div', 'np-mh-title', esc(pub));
        api.fitBox(mhTitle, { min: 0.45 });
        api.add(mhRow, 'div', 'np-ear r', `<b>第 01 版</b><span>${esc(st.price || `共 ${total} 版`)}</span>`);

        const dRule = api.add(mh, 'div', 'np-mh-double');
        const bar = api.add(mh, 'div', 'np-mh-bar');
        const leftInfo = plain(d.kicker || st.date || st.series || '号外专电');
        const midInfo = plain(st.issue || `总第 ${total} 版`);
        let rightInfo = plain(d.meta || st.series || '本报特派电讯');
        if (rightInfo === leftInfo) rightInfo = '本报特刊专电';
        api.add(bar, 'span', 'np-mhb-l', esc(leftInfo));
        api.add(bar, 'span', 'np-mhb-m', esc(midInfo));
        api.add(bar, 'span', 'np-mhb-r', esc(rightInfo));
        api.beat(mh, 'kicker', d.kickerAt ?? '0s');
        api.beat(dRule, 'line', '0s', { kind: 'ruleDraw', d: 0.45, free: true });

        // 1.2 通栏大标题 + 副题横条
        const ban = api.add(api.root, 'div', 'np-banner' + (layout === 'extra' ? ' is-extra' : ''));
        if (d.title) {
          const h1 = api.add(ban, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const tb = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = tb;
          api.marks(h1, tb);
          api.fitTitle(h1);
        }
        if (d.sub || d.dek) {
          const sub = api.add(ban, 'div', 'np-banner-sub', rich(d.sub || d.dek));
          const sb = api.beat(sub, 'text', d.subAt);
          api.marks(sub, sb);
        }

        // 1.3 头版主内容区：有图版 vs 无图纯字版
        const hasImg = !!d.image && layout !== 'extra';
        const fp = api.add(api.root, 'div', 'np-fp-grid' + (hasImg ? ' has-img' : ' no-img'));

        if (hasImg) {
          const photoCol = api.add(fp, 'div', 'np-fp-photo');
          api.media(d.image, {
            parent: photoCol,
            frame: d.frame || 'halftone',
            cap: d.cap,
            at: d.imageAt,
            kb: d.kb,
            title: d.windowTitle,
          });

          const storyCol = api.add(fp, 'div', 'np-fp-story');
          const colCount = api.land ? 2 : 3;
          const paras = buildCoverColumns(d, st, colCount);
          const colsBox = api.add(storyCol, 'div', 'np-cols c' + paras.length);
          const colEls = paras.map((p, idx) =>
            api.add(colsBox, 'div', 'np-col' + (idx === 0 ? ' is-lead' : ''), idx === 0 ? dropCapHtml(p) : esc(p))
          );
          api.beat(colEls, 'text', null, { stagger: 0.08 });

          const footRow = api.add(storyCol, 'div', 'np-fp-meta');
          addChips(d, api, footRow, d.tags ?? d.chips);
          const jmp = api.add(footRow, 'span', 'np-fp-jump', '详文转第 02 版 ▶');
          api.beat(jmp, 'note', null);
        } else {
          // 无图通用稿：多栏新闻正文（带首字下沉与竖向栏线） + 「本期要目」报纸索引框
          const textCols = api.land ? 2 : 2;
          const paras = buildCoverColumns(d, st, textCols);
          const colsBox = api.add(fp, 'div', 'np-cols np-lead-cols c' + paras.length);
          const colEls = paras.map((p, idx) =>
            api.add(colsBox, 'div', 'np-col' + (idx === 0 ? ' is-lead' : ''), idx === 0 ? dropCapHtml(p) : esc(p))
          );
          api.beat(colEls, 'text', null, { stagger: 0.08 });

          // 右侧 / 底部「本期要目」索引栏 + 标签
          const idxItems = buildIndexItems(st);
          const side = api.add(fp, 'div', 'np-index-box');
          api.add(side, 'div', 'np-index-hd', '<span>本期要目</span><small>EDITION INDEX</small>');
          const ul = api.add(side, 'ul', 'np-index-list');
          idxItems.forEach(it => {
            api.add(ul, 'li', '', `<b>第${it.page}版</b><span>${esc(it.text)}</span>`);
          });
          if (d.tags || d.chips) addChips(d, api, side, d.tags ?? d.chips);
          api.beat(side, 'card', d.tagsAt ?? d.chipsAt ?? null);
        }

        // 若用户未写 stamp，头版自动加一枚小巧的红色「号外」压印（不压主文）
        if (!d.stamp) {
          const autoSeal = api.add(api.sc.el, 'div', 'stamp np-auto-extra', '<span>号外</span>');
          api.beat(autoSeal, 'stamp', null, { last: true });
        }
      },

      // 2) 章节页 CHAPTER：反白墨黑专版导读
      chapter(d, api) {
        api.root.classList.add('center');
        const box = api.add(api.root, 'div', 'np-chap-box');
        const topRule = api.add(box, 'div', 'np-chap-top', '<span>专版导读</span><i>◆</i><span class="np-mono">SPECIAL EDITION</span>');
        api.beat(topRule, 'kicker', d.kickerAt);

        const n = d.num ?? pad2(api.sc.chapNo || 1);
        if (n !== false && n !== '') {
          const ne = api.add(box, 'div', 'np-chap-badge', `<small>SECTION</small><b>${esc(n)}</b>`);
          api.beat(ne, 'big', d.numAt);
        }

        api.head({ parent: box, big: true });
        const orn = api.add(box, 'div', 'np-chap-orn', '<span></span><i>◆ ◆ ◆</i><span></span>');
        api.beat(orn, 'kicker', null);
        api.note(box, d.note, d.noteAt);
      },

      // 3) 卡片页 CARDS：人物专版 / 报纸方框简介
      cards(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'title'));
        const body = api.body();
        const n = items.length;
        // 竖屏 3 项采用「1 领衔通栏 + 2 并列分栏」，横屏 3 项 3 列；4 项竖屏 2x2 横屏 4 列（字长则 2x2）
        const long = items.some(it => plain(it.text || '').length > 20 || plain(it.title || '').length > 10);
        const layoutCls = !api.land && n === 3 ? ' np-lead3' : '';
        const cols = d.cols || (api.land ? (n <= 3 ? n : n === 4 ? (long ? 2 : 4) : 3) : (n <= 2 ? 1 : 2));
        const box = api.add(body, 'div', 'cards np-cards' + nc(n) + layoutCls);
        box.style.setProperty('--cols', cols);

        items.forEach((it, i) => {
          const isLead = !api.land && n === 3 && i === 0;
          const c = api.add(box, 'div', 'card' + (isHot(d, i, it) ? ' on' : '') + (isLead ? ' is-lead' : ''));
          const k = it.tag ?? it.k ?? it.icon ?? (d.index === false ? null : pad2(i + 1));
          const bar = api.add(c, 'div', 'np-card-bar');
          if (k != null && k !== '') {
            api.add(bar, 'span', 'card-k', it.icon ? api.icon(it.icon) || esc(it.icon) : rich(k));
          }
          api.add(bar, 'span', 'np-card-no', `NO.${pad2(i + 1)}`);
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
        api.note(api.root, d.note, d.noteAt);
      },

      // 4) 数据卡 STATS：双粗黑线报纸数据公报表格
      stats(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'value'));
        const body = api.body();
        const ledger = api.add(body, 'div', 'np-ledger');
        const hd = api.add(ledger, 'div', 'np-ledger-hd', '<span>数据公报</span><span class="np-mono">STATISTICAL LEDGER</span>');
        api.beat(hd, 'kicker', null);

        const cols = d.cols || (api.land ? (items.length <= 4 ? items.length : 3) : (items.length <= 3 ? 1 : 2));
        const box = api.add(ledger, 'div', 'stats' + nc(items.length) + (cols === 1 ? ' rows' : ''));
        box.style.setProperty('--cols', cols);

        items.forEach((it, i) => {
          const s = api.add(box, 'div', 'stat' + (isHot(d, i, it) ? ' on' : ''));
          api.add(s, 'div', 'np-stat-idx', `DATA · ${pad2(i + 1)}`);
          const v = api.add(s, 'div', 'stat-v');
          const { val } = api.num(v, it.value);
          if (it.unit) api.add(v, 'span', 'stat-u', rich(it.unit));
          api.fitBox(v);
          const tx = api.add(s, 'div', 'stat-tx');
          if (it.label) api.add(tx, 'div', 'stat-l', rich(it.label));
          if (it.note) api.add(tx, 'div', 'stat-n', rich(it.note));
          const b = api.beat(s, 'card', it.at, {
            auto: [it.label, it.value],
            spread: true,
            focus: focusOf(d, api),
            with: val ? [[val, 'count', 0.05]] : [],
          });
          api.marks(tx, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 5) 时间线 TIMELINE：报纸日程表 / 时序公报
      timeline(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it));
        const row = d.dir ? d.dir === 'row' : api.land && items.length <= 5;
        const body = api.body();
        const wrap = api.add(body, 'div', 'np-sched' + (row ? ' is-row' : ' is-col'));
        const shd = api.add(wrap, 'div', 'np-ledger-hd', '<span>时序日程</span><span class="np-mono">CHRONOLOGY SCHEDULE</span>');
        api.beat(shd, 'kicker', null);

        const box = api.add(wrap, 'div', 'tl ' + (row ? 'row' : 'col') + nc(items.length));
        const links = api.svg('svg', { class: 'links' });
        box.appendChild(links);
        const beats = [], dots = [];

        items.forEach((it, i) => {
          const el = api.add(box, 'div', 'tl-item' + (isHot(d, i, it) ? ' on' : ''));
          if (it.time != null) api.add(el, 'div', 'tl-time', rich(it.time));
          dots.push(api.add(el, 'div', 'tl-dot'));
          if (it.text) api.add(el, 'div', 'tl-text', rich(it.text));
          const b = api.beat(el, 'item', it.at, { auto: [it.time, it.text], spread: true, focus: focusOf(d, api) });
          api.marks(el, b);
          beats.push(b);
        });

        api.layout(() => {
          links.innerHTML = '';
          for (let i = 0; i + 1 < dots.length; i++) {
            const a = api.rel(dots[i], box), c = api.rel(dots[i + 1], box);
            const ga = a.w / 2 + 6, gc = c.w / 2 + 6;
            const L = Math.hypot(c.cx - a.cx, c.cy - a.cy);
            if (L < ga + gc + 4) continue;
            const ux = (c.cx - a.cx) / L, uy = (c.cy - a.cy) / L;
            const p = api.svg('path', {
              d: `M${(a.cx + ux * ga).toFixed(1)} ${(a.cy + uy * ga).toFixed(1)} L${(c.cx - ux * gc).toFixed(1)} ${(c.cy - uy * gc).toFixed(1)}`,
            });
            links.appendChild(p);
            (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.28 });
          }
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 6) 引用 QUOTE：报纸双黑框引语盒 + 粗大套红引号
      quote(d, api) {
        api.root.classList.add('center');
        api.head();
        const box = api.add(api.root, 'div', 'np-qbox');
        const mk = api.quoteMark();
        if (mk) api.beat(api.add(box, 'div', 'qmark', mk), 'chip', d.markAt);
        const qt = api.add(box, 'div', 'q-text');
        const els = lines(d.text ?? d.quote).map(l => api.add(qt, 'div', 'ql', rich(l)));
        const b = api.beat(els, 'quote', d.textAt);
        els.forEach(e => api.marks(e, b));
        const foot = api.add(box, 'div', 'np-qfoot');
        api.add(foot, 'span', 'np-qtag', '本报实录 · ARCHIVE');
        const src = d.source ?? d.by ?? d.author;
        if (src) api.beat(api.add(foot, 'div', 'q-src', rich(src)), 'note', d.sourceAt, { auto: src });
        api.note(api.root, d.note, d.noteAt);
      },

      // 7) 大数字 BIGNUM：特号公报框（横屏左右双栏，竖屏上下双线公报）
      bignum(d, api) {
        api.root.classList.add('center');
        const bul = api.add(api.root, 'div', 'np-bulletin');
        const kStr = d.kicker || '特号公报';
        const rightTag = /[A-Za-z]/.test(kStr) ? `NO.${pad2(api.sc.i + 1)} · ARCHIVE` : 'SPECIAL BULLETIN';
        const top = api.add(bul, 'div', 'np-bul-top', `<span>${rich(kStr)}</span><span class="np-mono">${rightTag}</span>`);
        api.beat(top, 'kicker', d.kickerAt);

        const main = api.add(bul, 'div', 'np-bul-main');
        const numCol = api.add(main, 'div', 'np-bul-num');
        const row = api.add(numCol, 'div', 'bn-row');
        const { val } = api.num(row, d.value ?? d.num);
        if (d.unit) api.add(row, 'span', 'bn-u', rich(d.unit));
        api.fitBox(row);
        api.beat(row, 'big', d.valueAt, {
          auto: d.value != null ? String(d.value) : null,
          with: val ? [[val, 'count', 0]] : [],
        });

        const txCol = api.add(main, 'div', 'np-bul-tx');
        if (d.title) {
          const th = api.add(txCol, 'h1', 'title');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(th, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const tb = api.beat([...th.children], 'title', d.titleAt);
          th._beat = tb;
          api.marks(th, tb);
          api.fitTitle(th);
        }
        if (d.label) {
          const l = api.add(txCol, 'div', 'bn-l', rich(d.label));
          const lb = api.beat(l, 'text', d.labelAt, { auto: d.label });
          api.marks(l, lb);
        }
        if (d.note) api.note(txCol, d.note, d.noteAt);
      },

      // 8) 金句 STATEMENT：社论通栏大字号外框
      statement(d, api) {
        api.root.classList.add('center');
        api.head();
        const wrap = api.add(api.root, 'div', 'np-stmt');
        api.add(wrap, 'div', 'np-stmt-rule', '<span></span><i>◆</i><span></span>');
        const ls = lines(d.text ?? d.lines);
        if (ls.length) {
          const box = api.add(wrap, 'div', 'say');
          ls.forEach((l, i) => {
            const e = api.add(box, 'div', 'sl', rich(l));
            const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, gap: 0.16 });
            api.marks(e, b);
          });
        }
        api.add(wrap, 'div', 'np-stmt-rule', '<span></span><i>◆</i><span></span>');
        api.note(api.root, d.note, d.noteAt);
      },

      // 9) 条形图 BARS：带印刷刻度参考线的斜纹图表框
      bars(d, api, base) {
        base(d, api);
        const barsEl = api.root.querySelector('.bars');
        if (!barsEl) return;
        const chart = api.h('div', 'np-chart');
        const hd = api.h('div', 'np-ledger-hd', `<span>图表统计</span><span class="np-mono">${d.scale === 'log' ? 'LOG SCALE · 对数刻度' : 'PRINT CHART · 印刷图表'}</span>`);
        const body = barsEl.parentNode;
        body.insertBefore(chart, barsEl);
        chart.append(hd, barsEl);
        // 在每条轨道后面加 4 条刻度参考线
        barsEl.querySelectorAll('.bar-track').forEach(tr => {
          const ticks = api.h('div', 'np-bar-grid', '<i></i><i></i><i></i><i></i>');
          tr.prepend(ticks);
        });
      },

      // 10) 列表 LIST：电讯简报栏头 + 细线分栏
      list(d, api, base) {
        base(d, api);
        const ul = api.root.querySelector('.list');
        if (!ul) return;
        const wrap = api.h('div', 'np-dispatch');
        const hd = api.h('div', 'np-ledger-hd', '<span>电讯要闻</span><span class="np-mono">TELETYPE DISPATCH</span>');
        const body = ul.parentNode;
        body.insertBefore(wrap, ul);
        wrap.append(hd, ul);
      },

      // 11) 结尾 ENDING：终版封底 + 带剪刀虚线剪报回执
      ending(d, api) {
        api.root.classList.add('center');
        const top = api.add(api.root, 'div', 'np-end-top', `<span>${rich(d.kicker || '终版 · 出版编按')}</span><span class="np-mono">FINAL EDITION</span>`);
        api.beat(top, 'kicker', d.kickerAt);

        api.head({ kicker: null, big: true });
        addChips(d, api, api.root, d.tags ?? d.chips);

        if (d.cta) {
          const coupon = api.add(api.root, 'div', 'np-coupon');
          api.add(coupon, 'div', 'np-coupon-cut', '✂ 剪报留存 · CLIPPING COUPON');
          const c = api.add(coupon, 'div', 'cta', rich(d.cta));
          const cb = api.beat(coupon, 'card', d.ctaAt, { auto: d.cta });
          api.marks(c, cb);
        }
        const by = d.byline ?? api.story.byline;
        if (by) {
          const pub = plain(api.story.masthead || '环球纪事报');
          const col = api.add(api.root, 'div', 'np-colophon', `<b>${esc(pub)}</b><i>·</i><span>${rich(by)}</span>`);
          api.beat(col, 'text', d.bylineAt);
        }
      },
    },

    // 给未重写的模板（image / code / formula / compare / steps）补上统一报纸装置
    decorate(sc, api) {
      if (sc.t === 'image') {
        const fr = sc.el.querySelector('.frame');
        if (fr) {
          const bar = api.h('div', 'np-wire-bar', '<span>传真照片</span><span class="np-mono">WIRE PHOTO · ARCHIVE</span>');
          fr.prepend(bar);
        }
      }
      if (sc.t === 'code') {
        const bar = sc.el.querySelector('.code-bar');
        if (bar) {
          const fn = bar.querySelector('span');
          bar.innerHTML = `<b class="np-tt-tag">TELETYPE</b><span>${fn ? fn.innerHTML : 'DISPATCH.TXT'}</span>`;
        }
      }
      if (sc.t === 'formula') {
        const f = sc.el.querySelector('.formula');
        if (f) {
          const wrap = api.h('div', 'np-formula-box');
          const hd = api.h('div', 'np-ledger-hd', '<span>科学公报</span><span class="np-mono">SCIENCE BULLETIN</span>');
          f.parentNode.insertBefore(wrap, f);
          wrap.append(hd, f);
        }
      }
    },

    link(x1, y1, x2, y2, o) {
      return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} ` + o.arrowHead(x1, y1, x2, y2, 16, 0.45);
    },

    marker(mode, i, ok) {
      if (mode === 'number') return `<b class="np-num-mk">${pad2(i + 1)}</b>`;
      if (ok === true || ok === false) return null;
      return '<i class="dotm"></i>';
    },

    badge(i) {
      return pad2(i + 1);
    },
  });
})();
