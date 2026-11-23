/* 夜航文档 night-doc：深夜终端与 IDE 工作台 */
(() => {
  'use strict';

  const { esc, rich, plain, pad2, hash, cl, EZ } = MV.util;
  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
  const norm = (it, key = 'text') => (it == null ? {} : typeof it === 'object' ? it : { [key]: String(it) });
  const isHot = (d, i, it) => !!(it && it.on) || d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
  const focusOf = (d, api) => d.focus ?? !!api.style.focus;
  const nc = n => ' n' + Math.max(1, Math.min(n, 9));

  // 防止 CLI 参数（如 --soft、--hard、-m、HEAD~1）在换行时被拦腰截断
  function richCmd(s) {
    const html = rich(s);
    return html.replace(/(<[^>]+>)|(--[A-Za-z0-9_-]+|-[A-Za-z]\b|HEAD~\d+)/g, (m, tag, tok) =>
      tag ? tag : `<span class="nd-nb">${tok}</span>`
    );
  }

  const ACC = ['#5EE6D0', '#FFD166', '#FF6B9A', '#5BD68A'];
  const rgba = (hex, a) => {
    const n = parseInt(String(hex).replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // 确定性 7 位 git 短哈希
  function shortHash(seed) {
    return (hash(String(seed)) >>> 0).toString(16).padStart(7, '0').slice(0, 7);
  }

  function cleanPath(s) {
    return plain(s || 'workspace').trim().replace(/\s*[·/]\s*/g, '/').replace(/\s+/g, '-').slice(0, 20);
  }

  // 根据场景生成真实的虚拟文件名（通用稿也自然）
  const EXT = {
    cover: 'README.md', chapter: 'section.md', list: 'git-log.sh', compare: 'changes.diff',
    steps: 'run.sh', cards: 'panes.tmux', stats: 'metrics.json', bignum: 'telemetry.log',
    bars: 'bench.txt', timeline: 'history.log', statement: 'note.md', quote: 'docstring.md',
    code: 'snippet.sh', formula: 'math.tex', image: 'preview.svg', ending: 'exit.sh', custom: 'view.html',
  };
  function sceneFile(sc) {
    const d = sc.d || {};
    if (d.file) return plain(d.file);
    if (d.kicker) {
      const k = plain(d.kicker).trim();
      if (/^[\w.-]+\.(md|sh|js|ts|py|svg|json|diff|tex|log|tmux|yaml|yml)$/i.test(k)) return k;
    }
    const base = EXT[sc.t] || 'doc.md';
    if (sc.t === 'cover') return 'index.md';
    return `${pad2(sc.i + 1)}-${base}`;
  }

  // Shell 命令语法高亮增强（用于 code 模板 lang=sh/bash/zsh）
  function tokenizeShell(line) {
    const mCom = line.match(/^(\s*)(#.*)$/);
    if (mCom) return `${esc(mCom[1])}<span class="tok-c">${esc(mCom[2])}</span>`;
    const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#.*$)|(--[A-Za-z0-9_-]+|-[A-Za-z]\b)|\b(git|commit|revert|reset|add|push|pull|status|log|checkout|branch|merge|rebase|npm|python3|curl|echo)\b|\b(HEAD~\d+|HEAD|\d+(?:\.\d+)?)\b|\b([0-9a-f]{7})\b/g;
    let html = '', i = 0, m;
    while ((m = re.exec(line))) {
      if (m.index > i) html += esc(line.slice(i, m.index));
      const s = m[0];
      if (m[1]) html += `<span class="tok-s">${esc(s)}</span>`;
      else if (m[2]) html += `<span class="tok-c">${esc(s)}</span>`;
      else if (m[3]) html += `<span class="tok-flag">${esc(s)}</span>`;
      else if (m[4]) html += `<span class="${s === 'git' ? 'tok-f' : 'tok-k'}">${esc(s)}</span>`;
      else if (m[5]) html += `<span class="tok-n">${esc(s)}</span>`;
      else if (m[6]) html += `<span class="tok-n">${esc(s)}</span>`;
      else html += esc(s);
      i = m.index + s.length;
    }
    if (i < line.length) html += esc(line.slice(i));
    return html;
  }

  const MOON_SVG = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z" fill="#FFD166"/>
    <circle cx="17.5" cy="6" r="1.2" fill="#5EE6D0"/>
    <circle cx="20.5" cy="9.5" r=".9" fill="#E6EDF7"/>
  </svg>`;

  const BRANCH_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="6" cy="6" r="3" stroke="currentColor" stroke-width="2.6"/>
    <circle cx="18" cy="6" r="3" stroke="currentColor" stroke-width="2.6"/>
    <circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="2.6"/>
    <path d="M6 9v6M18 9c0 5-12 3-12 9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;

  // ───── 自定义动画：终端日志行快显 ─────
  MV.kinds.ndLog = {
    f(el, p) {
      const e = EZ.o4(p);
      el.style.opacity = cl(p * 3.5).toFixed(4);
      el.style.translate = `0 ${((1 - e) * 14).toFixed(2)}px`;
    },
  };

  function gridCols(d, api, n, long) {
    if (d.cols) return d.cols;
    if (api.land) return n <= 3 ? n : n === 4 ? (long ? 2 : 4) : 3;
    return n <= 3 ? 1 : 2;
  }

  function makeChips(d, api, parent, list) {
    list = arr(list);
    if (!list.length) return null;
    const box = api.add(parent, 'div', 'chips');
    const els = list.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
    api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: list[0] });
    return box;
  }

  function makeMeter(api, parent, litCount, total = 16, cls = 'nd-meter') {
    const m = api.add(parent, 'div', cls);
    for (let i = 0; i < total; i++) {
      api.add(m, 'i', i < litCount ? (i >= total - 3 ? 'lit hot' : 'lit') : '');
    }
    return m;
  }

  MV.style({
    // 终端清屏式快速切换：窗口外框不动，视口内清屏重绘
    transition: { kind: 'fade', dur: 0.34 },
    motion: {
      kicker: { kind: 'type', d: 0.48, o: { n: 20 } },
      title: { kind: 'slideX', d: 0.45, stagger: 0.08, gap: 0.1, o: { dist: -26 } },
      big: { kind: 'rise', d: 0.5, stagger: 0.1, gap: 0.1, o: { dist: 22 } },
      text: { kind: 'fade', d: 0.42, gap: 0.25 },
      item: { kind: 'ndLog', d: 0.36, stagger: 0.06, gap: 0.32 },
      card: { kind: 'rise', d: 0.45, stagger: 0.07, gap: 0.3, o: { dist: 22 } },
      chip: { kind: 'fade', d: 0.32, stagger: 0.06, gap: 0.2 },
      quote: { kind: 'fade', d: 0.6, stagger: 0.16, gap: 0.18 },
      log: { kind: 'ndLog', d: 0.3, stagger: 0.08, gap: 0.16 },
    },
    focus: true,
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'window',
    quoteMark: '/**',

    look(d, i, o) {
      let a = '#5EE6D0';
      if (/^#[0-9a-f]{6}$/i.test(d.accent || '')) a = d.accent;
      else if (o.sc.t === 'chapter') a = ACC[(Math.max(0, (o.sc.chap || 1) - 1)) % ACC.length];
      return {
        tone: 'dark',
        accent: a,
        vars: {
          '--hl': a,
          '--acc-soft': rgba(a, 0.15),
          '--acc-line': rgba(a, 0.48),
          '--glow': rgba(a, 0.32),
        },
      };
    },

    // 深海军蓝底 + 微弱代码网格点阵 + 深夜角落微光
    paint(g, W, H, R, u) {
      g.fillStyle = '#080D18';
      g.fillRect(0, 0, W, H);
      const is916 = u.rc === 'r916';
      const wx = u.land ? 22 : 18;
      const wt = is916 ? 108 : 18;
      const wb = is916 ? 316 : 18;
      g.fillStyle = '#0E1525';
      g.fillRect(wx, wt, W - wx * 2, H - wt - wb);

      const blob = (x, y, r, c) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, c);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(wx, wt, W - wx * 2, H - wt - wb);
      };
      const M = Math.max(W, H);
      blob(W * 0.84, wt + (H - wt - wb) * 0.12, M * 0.45, 'rgba(94,230,208,.075)');
      blob(W * 0.18, H - wb - 80, M * 0.4, 'rgba(255,107,154,.045)');

      g.fillStyle = 'rgba(148,173,214,.065)';
      for (let x = wx + 28; x < W - wx; x += 40) {
        for (let y = wt + 100; y < H - wb - 52; y += 40) {
          g.fillRect(x, y, 1.8, 1.8);
        }
      }
      u.noise(2.5, 42, true);
    },

    // IDE 窗口壳：标签栏 + 面包屑 + 16:9 文件树 + 行号栏 + 状态栏 + 扫描线
    chrome(c) {
      const win = c.h('div', 'nd-win');

      const tabbar = c.h('div', 'nd-tabbar');
      const tbl = c.h('div', 'nd-tabbar-l');
      tbl.append(c.h('div', 'nd-dots', '<i></i><i></i><i></i>'));
      const tabs = c.h('div', 'nd-tabs');
      const tabCur = c.h('div', 'nd-tab active');
      const tabName = c.h('span', 'nd-tname');
      tabCur.append(c.h('span', 'nd-ticon', '#'), tabName, c.h('i', 'nd-tdot'));
      const tab2 = c.h('div', 'nd-tab ghost', `<span class="nd-ticon">$</span><span>terminal.sh</span>`);
      const tab3 = c.h('div', 'nd-tab ghost', `<span class="nd-ticon">⌥</span><span>git-log</span>`);
      tabs.append(tabCur, tab2);
      if (c.land) tabs.append(tab3);
      tbl.append(tabs);

      const tbr = c.h('div', 'nd-tabbar-r');
      const moon = c.h('span', 'nd-moon', `${MOON_SVG}<span>02:14</span>`);
      const pgTop = c.h('span', 'nd-pg-top');
      tbr.append(moon, pgTop);
      tabbar.append(tbl, tbr);

      const repoRaw = plain(c.story.series || c.story.name || c.story.title || 'workspace');
      const repo = cleanPath(repoRaw);
      const crumbbar = c.h('div', 'nd-crumbbar');
      const crumb = c.h('span', 'nd-crumb');
      const crumbR = c.h('span', 'nd-crumb-r', `<span class="nd-live">●</span><span>UTF-8</span><span>LF</span>`);
      crumbbar.append(crumb, crumbR);

      const sidebar = c.h('div', 'nd-sidebar');
      sidebar.append(
        c.h('div', 'nd-side-h', 'EXPLORER'),
        c.h('div', 'nd-tree-dir', `▾ ${esc(repo)}/`)
      );
      const treeUl = c.h('ul', 'nd-tree');
      const treeItems = c.scenes.map((sc, idx) => {
        const fn = sceneFile(sc);
        const icon = fn.endsWith('.sh') ? '$' : fn.endsWith('.diff') ? '±' : fn.endsWith('.svg') ? '◈' : '#';
        const li = c.h('li', '', `<i>${icon}</i><span>${esc(fn)}</span>`);
        li.dataset.idx = idx;
        treeUl.appendChild(li);
        return li;
      });
      sidebar.append(treeUl, c.h('div', 'nd-side-foot', `<span>${c.scenes.length} files</span><span>git:clean</span>`));

      const gutter = c.h('div', 'nd-gutter');
      const lineCount = c.land ? 18 : c.rc === 'r916' ? 24 : 22;
      const gutSpans = [];
      for (let n = 1; n <= lineCount; n++) {
        const sp = c.h('span', '', pad2(n));
        gutter.appendChild(sp);
        gutSpans.push(sp);
      }

      const statusbar = c.h('div', 'nd-statusbar');
      const stl = c.h('div', 'nd-st-l');
      const branch = c.h('span', 'nd-branch', `${BRANCH_SVG}<span>main</span>`);
      const pos = c.h('span', 'nd-pos', 'Ln 01, Col 01');
      stl.append(branch, pos);

      const progWrap = c.h('div', 'nd-prog-wrap');
      const progFill = c.h('i');
      progWrap.appendChild(progFill);

      const str = c.h('div', 'nd-st-r');
      const enc = c.h('span', 'nd-enc', 'UTF-8');
      const by = c.h('span', 'nd-by', esc(plain(c.story.byline || '@night-dev')));
      const stPg = c.h('span', 'nd-st-pg', '01/12');
      str.append(enc, by, stPg);
      statusbar.append(stl, progWrap, str);

      const scan = c.h('div', 'nd-scan');

      win.append(tabbar, crumbbar, sidebar, gutter, statusbar, scan);
      c.el.appendChild(win);

      let lastKey = '';
      return info => {
        const sc = info.sc || c.scenes[0];
        const fn = sceneFile(sc);
        const key = `${info.i}|${info.cover ? 1 : 0}`;
        if (key !== lastKey) {
          lastKey = key;
          tabName.textContent = fn;
          pgTop.textContent = info.cover ? 'LIVE' : `${info.page}/${info.total}`;
          stPg.textContent = `${info.page}/${info.total}`;
          const secClean = info.section && info.section !== repoRaw && info.section !== repo ? info.section : '';
          const sec = !info.cover && secClean ? ` <b>/</b> <em>${esc(secClean)}</em>` : '';
          crumb.innerHTML = `<b>~/</b>${esc(repo)}${sec} <b>/</b> <em>${esc(fn)}</em>`;

          const a = sc && sc.el ? sc.el.style.getPropertyValue('--accent') : '';
          if (a) {
            c.el.style.setProperty('--ca', a);
            c.stage.style.setProperty('--sub-hl', a);
          }

          const curLn = (info.i * 3 + 2) % lineCount;
          gutSpans.forEach((sp, k) => sp.classList.toggle('cur', k === curLn));
          const maxVis = 12;
          const stIdx = Math.max(0, Math.min(Math.max(0, treeItems.length - maxVis), info.i - 5));
          treeItems.forEach((li, k) => {
            li.classList.toggle('active', k === info.i);
            li.style.display = (k >= stIdx && k < stIdx + maxVis) ? '' : 'none';
          });
        }
        const ln = ((info.i * 7 + Math.floor(info.progress * 30)) % 64) + 1;
        const col = ((Math.floor(info.t * 4) + info.i * 5) % 42) + 1;
        pos.textContent = `Ln ${pad2(ln)}, Col ${pad2(col)}`;
        progFill.style.scale = `${cl(info.progress).toFixed(4)} 1`;
      };
    },

    tick(t, o) {
      const blink = o.cover || Math.floor(t * 2.2) % 2 === 0;
      o.stage.style.setProperty('--cur-op', blink ? '1' : '0.12');
      const H = o.stage.clientHeight || 1440;
      o.stage.style.setProperty('--scan-y', `${((t * 68) % H).toFixed(1)}px`);
    },

    link(x1, y1, x2, y2, o) {
      return o.dash(x1, y1, x2, y2, 10, 8) + ' ' + o.arrowHead(x1, y1, x2, y2, 12, 0.5);
    },

    marker(mode, i, ok) {
      if (mode === 'number') return pad2(i + 1);
      if (ok === true || ok === false) return null;
      return '›';
    },

    decorate(sc, api) {
      const addSubbar = (target, leftHtml, rightText) => {
        if (!target || !target.parentNode) return;
        const bar = api.h('div', 'nd-subbar', `<span>${leftHtml}</span><span class="r">${esc(rightText)}</span>`);
        target.parentNode.insertBefore(bar, target);
      };
      if (sc.t === 'bars') {
        const box = sc.content.querySelector('.bars');
        const flag = sc.d.scale === 'log' ? '--scale=log' : '--linear';
        addSubbar(box, `<b class="p">$</b>bench --chart ${flag}`, `${arr(sc.d.items).length} series`);
      } else if (sc.t === 'timeline') {
        const box = sc.content.querySelector('.tl');
        addSubbar(box, `<b class="p">$</b>git log --graph --oneline`, `${arr(sc.d.items).length} commits`);
      } else if (sc.t === 'formula') {
        const box = sc.content.querySelector('.formula');
        addSubbar(box, `<b class="p">∑</b>LaTeX // math-engine`, `UTF-8 · rendered`);
      } else if (sc.t === 'statement') {
        const box = sc.content.querySelector('.say');
        addSubbar(box, `<b class="p">▸</b>stdout // highlight`, `● ACTIVE`);
      }
    },

    // ───── 模板重写 ─────
    templates: {
      // 1) 封面：深夜终端窗口 + 打字命令 + 滚动日志 + 小月亮 + commit graph
      cover(d, api) {
        const wrap = api.add(api.root, 'div', 'nd-cov');
        const main = api.add(wrap, 'div', 'nd-cov-main');
        const slug = cleanPath(api.story.series || api.story.name || 'workspace');

        api.add(main, 'div', 'nd-cov-bar',
          `<span class="nd-cov-bar-l"><b>zsh</b><span>— ~/${esc(slug)}</span></span>` +
          `<span class="nd-cov-moon">${MOON_SVG}<span>02:14 AM</span></span>`
        );

        const body = api.add(main, 'div', 'nd-cov-body');
        const pr = api.add(body, 'div', 'nd-prompt-line',
          `<span class="p-user">dev@night</span><span class="p-path">~/${esc(slug)}</span><span class="p-br">(main)</span>`
        );
        api.beat(pr, 'kicker', d.kickerAt, { d: 0.35 });

        if (d.kicker) {
          const cmd = api.add(body, 'div', 'nd-cov-cmd', `<b>$</b><span>${richCmd(d.kicker)}</span>`);
          api.beat(cmd, 'kicker', d.kickerAt, { d: 0.55, o: { n: Math.max(10, plain(d.kicker).length) } });
        }

        if (d.title) {
          const h1 = api.add(body, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const b = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = b;
          api.marks(h1, b);
          api.fitTitle(h1);
        }

        if (d.sub || d.dek) {
          const s = api.add(body, 'div', 'dek', richCmd(d.sub ?? d.dek));
          const b = api.beat(s, 'text', d.subAt);
          api.marks(s, b);
        }

        if (d.image) {
          api.media(d.image, { parent: body, frame: d.frame, at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
        }

        makeChips(d, api, body, d.tags ?? d.chips);

        if (d.meta) {
          const m = api.add(body, 'div', 'meta', richCmd(d.meta));
          api.beat(m, 'text', d.metaAt);
        }

        if (d.layout !== 'compact' && !d.image) {
          const logBox = api.add(wrap, 'div', 'nd-cov-log');
          api.add(logBox, 'div', 'nd-log-head',
            `<span>OUTPUT · TERMINAL</span><span class="ok-dot">● READY</span>`
          );
          const linesEl = api.add(logBox, 'div', 'nd-log-lines');

          const chaps = api.story.scenes.filter(s => (s.type || s.t) === 'chapter').map(s => plain(s.title || '').replace(/\n/g, ' '));
          const tags = arr(d.tags ?? d.chips).map(x => plain(x));
          const nSc = api.story.scenes.length;
          const h1 = shortHash(slug + '1'), h2 = shortHash(slug + '2');
          const logData = [
            { ts: '02:14:01', lv: 'INIT', cls: '', msg: `session loaded · ${nSc} scenes · branch main` },
            { ts: '02:14:02', lv: 'GIT ', cls: 'lv-git', msg: `HEAD -> ${h1} (${tags.length ? tags.join(' · ') : slug})` },
            { ts: '02:14:03', lv: 'INFO', cls: 'lv-warn', msg: chaps.length ? `outline: ${chaps.slice(0, 3).join(' / ')}` : `target: ${plain(d.title || slug).replace(/\n/g, ' ')}` },
            { ts: '02:14:04', lv: 'OK  ', cls: 'lv-ok', msg: `build clean (${h2}) — ready to walk through` },
          ];
          const logNodes = logData.map(row => api.add(linesEl, 'div', 'nd-ll ' + row.cls,
            `<span class="ts">[${row.ts}]</span><span class="lv">${row.lv}</span><span class="msg">${esc(row.msg)}</span>`
          ));
          api.beat(logNodes, 'log', null, { stagger: 0.14, gap: 0.18 });

          const graphSvg = `<svg viewBox="0 0 180 28" fill="none" aria-hidden="true">
            <path d="M14 14 H164" stroke="#5EE6D0" stroke-opacity=".45" stroke-width="2.5"/>
            <path d="M56 14 C72 14, 76 6, 94 6 H128 C142 6, 146 14, 160 14" stroke="#FF6B9A" stroke-width="2.2" fill="none"/>
            <circle cx="14" cy="14" r="5" fill="#5EE6D0"/>
            <circle cx="56" cy="14" r="5" fill="#FFD166"/>
            <circle cx="110" cy="6" r="4.5" fill="#FF6B9A"/>
            <circle cx="164" cy="14" r="5.5" fill="#5BD68A"/>
          </svg>`;
          api.add(logBox, 'div', 'nd-cov-graph', `${graphSvg}<span>${h1}..${h2} · clean</span>`);
        }
      },

      // 2) 章节页：Markdown ## 标题 + 虚线分隔 + 后续大纲预览
      chapter(d, api) {
        api.root.classList.add('center');
        const box = api.add(api.root, 'div', 'nd-chap');
        const n = d.num ?? pad2(api.sc.chapNo || 1);
        const showNum = n !== false && n !== '';

        api.add(box, 'div', 'nd-chap-meta',
          `<span><b>MARKDOWN</b> // section-${esc(showNum ? n : pad2(api.sc.i + 1))}</span><span>README.md</span>`
        );

        const mdRow = api.add(box, 'div', 'nd-chap-md');
        const hashEl = api.add(mdRow, 'span', 'nd-chap-hash', '##');
        const numEl = showNum ? api.add(mdRow, 'span', 'nd-chap-num', esc(n)) : null;
        api.beat(numEl ? [hashEl, numEl] : [hashEl], 'big', d.numAt, { stagger: 0.08 });

        if (d.title) {
          const h1 = api.add(box, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const b = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = b;
          api.marks(h1, b);
          api.fitTitle(h1);
        }

        const rule = api.add(box, 'div', 'nd-chap-rule');
        api.beat(rule, 'grow', null, { d: 0.45, gap: 0.08 });

        if (d.note) {
          const nt = api.add(box, 'div', 'nd-chap-note', richCmd(d.note));
          const b = api.beat(nt, 'text', d.noteAt, { auto: d.note });
          api.marks(nt, b);
        }

        const upcoming = [];
        for (let k = api.sc.i + 1; k < api.story.scenes.length && upcoming.length < 2; k++) {
          const ns = api.story.scenes[k];
          const nt = ns.type || ns.t;
          if (nt === 'chapter' || nt === 'ending') break;
          const label = plain(ns.title || ns.text || ns.kicker || '').replace(/\n/g, ' ').trim();
          if (label) upcoming.push(label);
        }
        if (upcoming.length) {
          const toc = api.add(box, 'div', 'nd-chap-toc');
          const rows = upcoming.map(t => api.add(toc, 'div', 'toc-row',
            `<span class="toc-box">[ ]</span><span>${esc(t)}</span>`
          ));
          api.beat(rows, 'log', null, { stagger: 0.1, gap: 0.15 });
        }
      },

      // 3) 列表：git log --oneline 视图
      list(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it));
        const mode = d.mode || (items.some(it => it.ok != null) ? 'check' : 'bullet');
        const body = api.body();
        const shell = api.add(body, 'div', 'nd-log-shell' + nc(items.length));
        const cmdText = mode === 'check' || mode === 'cross'
          ? `git status --short`
          : mode === 'number'
            ? `git log --oneline -n ${items.length}`
            : `git log --oneline --decorate -n ${items.length}`;
        api.add(shell, 'div', 'nd-cmd-bar',
          `<span><b class="p">$</b>${esc(cmdText)}</span><span class="r">${items.length} entries</span>`
        );

        const ul = api.add(shell, 'ul', 'list nd-gitlog m-' + mode + nc(items.length));
        ul.style.setProperty('--cols', d.cols ?? (api.land && items.length >= 5 ? 2 : 1));
        items.forEach((it, i) => {
          const ok = it.ok != null ? !!it.ok : mode === 'check' ? true : mode === 'cross' ? false : undefined;
          const hot = isHot(d, i, it);
          const li = api.add(ul, 'li', 'item' + (ok === true ? ' ok' : ok === false ? ' no' : '') + (hot ? ' on' : ''));
          const h7 = shortHash((it.text ?? it.title ?? '') + '#' + api.sc.i + '#' + i);
          let mkHtml;
          if (ok === true) mkHtml = `<span class="nd-hash">✓ ${h7.slice(0, 5)}</span>`;
          else if (ok === false) mkHtml = `<span class="nd-hash">✗ ${h7.slice(0, 5)}</span>`;
          else if (mode === 'number') mkHtml = `<span class="nd-hash">${pad2(i + 1)} · ${h7.slice(0, 4)}</span>`;
          else mkHtml = `<span class="nd-hash">${h7}</span>`;
          if (hot) mkHtml += `<span class="nd-ref">HEAD → main</span>`;
          api.add(li, 'span', 'mk', mkHtml);
          const tx = api.add(li, 'span', 'tx', richCmd(it.text ?? it.title));
          if (it.note) api.add(tx, 'span', 'nt', richCmd(it.note));
          const b = api.beat(li, 'item', it.at, { auto: it.text ?? it.title, spread: true, focus: focusOf(d, api) });
          api.marks(li, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 4) 对比：Git Diff 红 (-) / 绿 (+) 视图
      compare(d, api) {
        api.head();
        const body = api.body();
        const L0 = norm(d.left || {}, 'label');
        const R0 = norm(d.right || {}, 'label');
        const lpts = arr(L0.points).length || 1;
        const rpts = arr(R0.points).length || 1;
        const cleanSlug = (s, fb) => plain(s || fb).trim().replace(/\s+(?=-)/g, '_').replace(/\s+/g, '-').slice(0, 22);
        const lName = cleanSlug(L0.label, 'before');
        const rName = cleanSlug(R0.label, 'after');
        const hL = shortHash(lName + '#L'), hR = shortHash(rName + '#R');
        const hasDiffKicker = /^diff\b/i.test(plain(d.kicker || '').trim());
        const diffLeftText = hasDiffKicker
          ? `index ${hL}..${hR} 100644 · unified diff`
          : `diff --git a/${lName} b/${rName}`;

        const wrap = api.add(body, 'div', 'nd-diff-wrap n2');
        api.add(wrap, 'div', 'nd-diff-top',
          `<span class="df-f">${esc(diffLeftText)}</span><span class="df-h">@@ -1,${lpts} +1,${rpts} @@</span>`
        );

        const g = api.add(wrap, 'div', 'cmp nd-diff n2');
        const buildSide = (s, cls, isLeft) => {
          const el = api.add(g, 'div', 'side ' + cls + (s.win ? ' win' : ''));
          const sh = api.add(el, 'div', 'nd-diff-sh');
          const shl = api.add(sh, 'div', 'nd-diff-sh-l');
          api.add(shl, 'span', 'nd-diff-sig', isLeft ? '--- a/' : '+++ b/');
          if (s.label) api.add(shl, 'div', 'side-l', richCmd(s.label));
          if (s.win) api.add(sh, 'span', 'nd-diff-win-tag', '✓ MERGE');
          else if (s.tag) api.add(sh, 'div', 'side-k', rich(s.tag));

          let val = null;
          if (s.value != null && s.value !== '') {
            const v = api.add(el, 'div', 'side-v');
            val = api.num(v, s.value).val;
            if (s.unit) api.add(v, 'span', 'side-u', rich(s.unit));
            api.fitBox(v);
          }

          const pts = [];
          if (s.points) {
            const ul = api.add(el, 'ul', 'side-p');
            arr(s.points).forEach((p, idx) => {
              const pp = norm(p);
              const ok = pp.ok;
              const sym = ok === false ? '-' : ok === true ? '+' : (isLeft ? '-' : '+');
              const li = api.add(ul, 'li', ok === false ? 'no' : ok === true ? 'ok' : '');
              api.add(li, 'span', 'nd-dlno', String(idx + 1));
              api.add(li, 'span', 'nd-dsym', sym);
              api.add(li, 'span', 'tx', richCmd(pp.text));
              pts.push({ li, pp });
            });
          }
          return { el, sh, val, pts, s };
        };

        const L = buildSide(L0, 'left', true);
        const Rt = buildSide(R0, 'right', false);

        const run = (S, key) => {
          const b = api.beat(S.el, 'card', S.s.at ?? key, { auto: S.s.label, with: S.val ? [[S.val, 'count', 0.05]] : [] });
          api.marks(S.sh, b);
          S.pts.forEach(({ li, pp }) => {
            const b2 = api.beat(li, 'item', pp.at, { auto: pp.text, spread: true, gap: 0.24 });
            api.marks(li, b2);
          });
          return b;
        };
        run(L, d.leftAt);
        const rb = run(Rt, d.rightAt);
        const win = L.s.win ? L.el : Rt.s.win ? Rt.el : null;

        if (d.verdict) {
          const ft = api.add(wrap, 'div', 'nd-diff-foot');
          const v = api.add(ft, 'div', 'verdict', richCmd(d.verdict));
          api.add(ft, 'div', 'nd-diff-stat', `<span class="add">+${rpts}</span><span class="del">-${lpts}</span>`);
          const b = api.beat(ft, 'text', d.verdictAt, { auto: d.verdict, with: win ? [[win, 'mark', 0]] : [] });
          api.marks(v, b);
        } else if (win) {
          (rb.opt.with = rb.opt.with || []).push([win, 'mark', 0.6]);
        }
      },

      // 5) 步骤：终端命令 + 灰色输出行（连线精准接在卡片间隙中）
      steps(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'title'));
        const row = d.dir ? d.dir === 'row' : api.land && items.length <= 5;
        const box = api.add(api.body(), 'div', 'steps nd-steps ' + (row ? 'row' : 'col') + nc(items.length));
        const links = api.svg('svg', { class: 'links' });
        box.appendChild(links);
        const beats = [], cards = [], badges = [];

        items.forEach((it, i) => {
          const st = api.add(box, 'div', 'step nd-step' + (isHot(d, i, it) ? ' on' : ''));
          let badge;
          if (row) {
            const top = api.add(st, 'div', 'nd-st-top');
            badge = api.add(top, 'div', 'badge', pad2(i + 1));
            api.add(top, 'span', 'nd-exit', 'exit 0');
          } else {
            badge = api.add(st, 'div', 'badge', pad2(i + 1));
          }
          cards.push(st);
          badges.push(badge);
          const tx = api.add(st, 'div', 'st-tx');
          const cmd = api.add(tx, 'div', 'nd-st-cmd');
          api.add(cmd, 'div', 'st-t', richCmd(it.title ?? it.text));
          if (!row) api.add(cmd, 'span', 'nd-exit', 'exit 0');
          if (it.title && it.text) api.add(tx, 'div', 'st-n', richCmd(it.text));
          const b = api.beat(st, 'card', it.at, { auto: it.title ?? it.text, spread: true, focus: focusOf(d, api) });
          api.marks(tx, b);
          beats.push(b);
        });

        api.layout(() => {
          links.innerHTML = '';
          for (let i = 0; i + 1 < cards.length; i++) {
            const ca = api.rel(cards[i], box), cb = api.rel(cards[i + 1], box);
            const ba = api.rel(badges[i], box);
            const g = 5;
            const [x1, y1, x2, y2] = row
              ? [ca.r + g, ca.cy, cb.x - g, cb.cy]
              : [ba.cx, ca.b + g, ba.cx, cb.y - g];
            if (Math.hypot(x2 - x1, y2 - y1) < 8) continue;
            const p = api.svg('path', { d: api.link(x1, y1, x2, y2, i) });
            links.appendChild(p);
            (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.28 });
          }
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 6) 卡片：tmux 多分屏窗格
      cards(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'title'));
        const long = items.some(it => plain(it.text || '').length > (api.land ? 14 : 22) || plain(it.title || '').length > (api.land ? 10 : 14));
        const body = api.body();
        const tmux = api.add(body, 'div', 'nd-tmux');
        const box = api.add(tmux, 'div', 'cards' + nc(items.length));
        const cols = gridCols(d, api, items.length, long);
        if (cols === 1) box.classList.add('rows');
        box.style.setProperty('--cols', cols);

        items.forEach((it, i) => {
          const hot = isHot(d, i, it);
          const c = api.add(box, 'div', 'card' + (hot ? ' on' : ''));
          const k = it.tag ?? it.k ?? (d.index === false ? null : `pane-${pad2(i + 1)}`);
          api.add(c, 'div', 'nd-pane-bar',
            `<span><b class="p-id">[${i}]</b>${k != null ? rich(k) : ''}</span>` +
            `<span class="p-st">${hot ? '● ACTIVE' : 'idle'}</span>`
          );
          const pb = api.add(c, 'div', 'nd-pane-body');
          if (it.title) api.add(pb, 'div', 'card-t', richCmd(it.title));
          if (it.text) api.add(pb, 'div', 'card-x', richCmd(it.text));
          const b = api.beat(c, 'card', it.at, { auto: it.tag != null ? [it.tag, it.title ?? it.text] : it.title ?? it.text, spread: true, focus: focusOf(d, api) });
          api.marks(pb, b);
        });

        const winTags = items.slice(0, 4).map((it, i) => {
          const nm = plain(it.tag || it.title || `p${i}`).slice(0, 8);
          return isHot(d, i, it) ? `<b>${i}:${esc(nm)}*</b>` : `<span>${i}:${esc(nm)}</span>`;
        }).join('');
        api.add(tmux, 'div', 'nd-tmux-bar', `<span class="t-wins">${winTags}</span><span>tmux · ${items.length} panes</span>`);
        api.note(api.root, d.note, d.noteAt);
      },

      // 7) 大数字：btop 风格监控仪表盘
      bignum(d, api) {
        api.root.classList.add('center');
        api.head();
        const mon = api.add(api.root, 'div', 'nd-mon');
        api.add(mon, 'div', 'nd-mon-bar', `<span>TELEMETRY // METRIC</span><span class="live">● NOMINAL</span>`);
        const mb = api.add(mon, 'div', 'nd-mon-body');
        const row = api.add(mb, 'div', 'bn-row');
        const v = d.value ?? d.num;
        const { val } = api.num(row, v);
        if (d.unit) api.add(row, 'span', 'bn-u', rich(d.unit));
        api.fitBox(row);
        api.beat(row, 'big', d.valueAt, { auto: d.value != null ? String(d.value) : null, with: val ? [[val, 'count', 0]] : [] });

        const lit = 10 + (hash(String(v)) % 5);
        const meter = makeMeter(api, mb, lit, 16);
        api.beat(meter, 'wipe', null, { d: 0.55, gap: 0.08 });

        if (d.label) {
          const l = api.add(mb, 'div', 'bn-l', rich(d.label));
          const b = api.beat(l, 'text', d.labelAt, { auto: d.label });
          api.marks(l, b);
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // 8) 数据卡：监控多格指标面板
      stats(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'value'));
        const body = api.body();
        const box = api.add(body, 'div', 'stats' + nc(items.length));
        const cols = gridCols(d, api, items.length, false);
        if (cols === 1) box.classList.add('rows');
        box.style.setProperty('--cols', cols);

        items.forEach((it, i) => {
          const hot = isHot(d, i, it);
          const s = api.add(box, 'div', 'stat' + (hot ? ' on' : ''));
          api.add(s, 'div', 'nd-stat-top', `<span>METRIC_${pad2(i + 1)}</span><span>${hot ? '● WARN' : '○ OK'}</span>`);
          const v = api.add(s, 'div', 'stat-v');
          const { val } = api.num(v, it.value);
          if (it.unit) api.add(v, 'span', 'stat-u', rich(it.unit));
          api.fitBox(v);
          const tx = api.add(s, 'div', 'stat-tx');
          if (it.label) api.add(tx, 'div', 'stat-l', rich(it.label));
          if (it.note) api.add(tx, 'div', 'stat-n', rich(it.note));
          makeMeter(api, s, hot ? 10 : 5 + ((i * 3) % 5), 12, 'nd-mini-meter');
          const b = api.beat(s, 'card', it.at, { auto: [it.label, it.value], spread: true, focus: focusOf(d, api), with: val ? [[val, 'count', 0.05]] : [] });
          api.marks(tx, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 9) 代码：增强 Shell 语法高亮（git 命令、flags、哈希彩色高亮）
      code(d, api, base) {
        base(d, api);
        const L = String(d.lang || '').toLowerCase();
        if (/^(sh|bash|shell|zsh)$/.test(L)) {
          const src = String(d.code ?? '').replace(/\t/g, '    ').replace(/\s+$/, '').split('\n');
          const rows = api.root.querySelectorAll('pre.code .clt');
          rows.forEach((el, i) => {
            if (src[i] && src[i].length) el.innerHTML = tokenizeShell(src[i]);
          });
        }
      },

      // 10) 结尾：深夜终端收工卡
      ending(d, api) {
        api.root.classList.add('center');
        const box = api.add(api.root, 'div', 'nd-end');
        api.add(box, 'div', 'nd-end-bar',
          `<span class="nd-end-ok">[OK] Process exited with code 0</span>` +
          `<span class="nd-cov-moon">${MOON_SVG}<span>GOOD NIGHT</span></span>`
        );
        const eb = api.add(box, 'div', 'nd-end-body');
        if (d.kicker) api.beat(api.add(eb, 'div', 'kicker', `<span class="kt">${richCmd(d.kicker)}</span>`), 'kicker', d.kickerAt);
        if (d.title) {
          const h1 = api.add(eb, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const b = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = b;
          api.marks(h1, b);
          api.fitTitle(h1);
        }
        if (d.sub || d.dek) {
          const s = api.add(eb, 'div', 'dek', richCmd(d.sub ?? d.dek));
          api.marks(s, api.beat(s, 'text', d.subAt));
        }
        makeChips(d, api, eb, d.tags ?? d.chips);
        if (d.cta) {
          const c = api.add(eb, 'div', 'nd-end-cta', richCmd(d.cta));
          api.marks(c, api.beat(c, 'text', d.ctaAt, { auto: d.cta }));
        }
        const by = d.byline ?? api.story.byline;
        if (by) {
          const ft = api.add(eb, 'div', 'nd-end-foot',
            `<span>$ echo "${esc(plain(by))}"</span><span class="by">${rich(by)}<span class="nd-cursor"></span></span>`
          );
          api.beat(ft, 'text', d.bylineAt);
        }
      },
    },
  });
})();
