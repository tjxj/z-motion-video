/* 宋式米纸 rice-paper · 宋画册页 × 书法题跋 × 立轴手卷 */
(() => {
  'use strict';

  const CN = '零一二三四五六七八九';
  const CN0 = '〇一二三四五六七八九';

  // 中文数字（0~9999，用于页码、章节、节气数字）
  function cnNum(v) {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n) || n < 0) return '';
    if (n === 0) return '零';
    if (n < 10) return CN[n];
    if (n === 10) return '十';
    if (n < 20) return '十' + CN[n - 10];
    if (n < 100) return CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
    if (n < 1000) {
      const h = Math.floor(n / 100), r = n % 100;
      if (r === 0) return CN[h] + '百';
      if (r < 10) return CN[h] + '百零' + CN[r];
      if (r < 20) return CN[h] + '百一十' + (r % 10 ? CN[r % 10] : '');
      return CN[h] + '百' + cnNum(r);
    }
    if (n < 10000) {
      const th = Math.floor(n / 1000), r = n % 1000;
      if (r === 0) return CN[th] + '千';
      if (r < 100) return CN[th] + '千零' + cnNum(r);
      return CN[th] + '千' + cnNum(r);
    }
    return '';
  }

  // 竖排文字富文本：将 1~2 位数字转为纵中横 .tcy，3~4 位数字转为直立 .vu，保留【】高亮
  function vRich(text) {
    const html = MV.util.rich(text);
    return html.replace(/(<[^>]+>)|(\d{1,4})/g, (m, tag, digits) => {
      if (tag) return tag;
      if (digits.length <= 2) return `<span class="tcy">${digits}</span>`;
      return `<span class="vu">${digits}</span>`;
    });
  }

  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
  const norm = (it, key = 'text') => (it == null ? {} : typeof it === 'object' ? it : { [key]: String(it) });
  const linesOf = v => arr(v).flatMap(s => String(s).split('\n')).filter(s => s.trim() !== '');
  const isHot = (d, i, it) => !!(it && it.on) || d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
  const focusOf = (d, api) => d.focus ?? !!api.style.focus;

  // 竖排长行自动断列（在标点或中点处拆为两列，避免单列过长溢出）
  function splitVerticalLines(rawLines, maxChars, allowSplit) {
    if (!allowSplit) return rawLines;
    const out = [];
    rawLines.forEach(line => {
      const p = MV.util.plain(line).trim();
      if (p.length <= maxChars) { out.push(line); return; }
      // 优先在标点处切分
      const chars = Array.from(line);
      let vis = 0, totalVis = p.length;
      let bestIdx = -1, bestDist = 1e9;
      let inMark = false;
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if (c === '【') { inMark = true; continue; }
        if (c === '】') { inMark = false; continue; }
        vis++;
        if (vis < 2 || vis > totalVis - 2) continue;
        const isPunc = /[，、：；。！？·—]/.test(c);
        const dist = Math.abs(vis - totalVis / 2) - (isPunc ? 2.5 : 0);
        if (!inMark && dist < bestDist) { bestDist = dist; bestIdx = i + 1; }
      }
      if (bestIdx > 0) {
        const a = chars.slice(0, bestIdx).join('').replace(/[，、]+$/, '').trim();
        const b = chars.slice(bestIdx).join('').trim();
        if (a && b) { out.push(a, b); return; }
      }
      out.push(line);
    });
    return out;
  }

  // ───── 自定义动效：书法落笔、手卷右起展开、水墨晕环 ─────
  MV.kinds.brushDown = {
    f(el, p) {
      const e = MV.util.EZ.o3(p);
      el.style.opacity = MV.util.cl(p * 2.2).toFixed(4);
      el.style.clipPath = p >= 1 ? 'none' : `inset(-28px -32px ${((1 - e) * 100).toFixed(2)}% -32px)`;
      el.style.translate = `0 ${((1 - e) * -14).toFixed(2)}px`;
    },
  };
  MV.kinds.scrollUnroll = {
    f(el, p) {
      const e = MV.util.EZ.o4(p);
      el.style.opacity = MV.util.cl(p * 2.4).toFixed(4);
      el.style.clipPath = p >= 1 ? 'none' : `inset(-24px -24px -24px ${((1 - e) * 100).toFixed(2)}%)`;
      el.style.translate = `${((1 - e) * 28).toFixed(2)}px 0`;
    },
  };
  MV.kinds.inkRing = {
    f(el, p) {
      const e = MV.util.EZ.o3(p);
      el.style.opacity = e.toFixed(4);
      el.style.scale = (0.92 + 0.08 * e).toFixed(4);
    },
  };

  // ───── 自定义转场：墨色晕染叠化 ─────
  MV.transitions.inkWash = {
    in(p) {
      const q = MV.util.cl(p * 1.45 - 0.35);
      const e = MV.util.EZ.o2(q);
      return {
        opacity: e.toFixed(4),
        filter: q < 1 ? `blur(${((1 - e) * 6).toFixed(2)}px)` : '',
        scale: q < 1 ? (1.016 - 0.016 * e).toFixed(4) : '',
      };
    },
    out(p) {
      const q = MV.util.cl(p * 1.45);
      const e = MV.util.EZ.i2(q);
      return {
        opacity: (1 - e).toFixed(4),
        filter: q > 0 ? `blur(${(e * 5).toFixed(2)}px)` : '',
      };
    },
  };

  // ───── 原创水墨山水意境 SVG（封面 / 结尾 / 金句）─────
  function makeLandscapeSvg(variant, land) {
    const vw = land ? 1920 : 1080, vh = land ? 1080 : 1200;
    const gid = `rp_${variant}_${land ? 'l' : 'p'}`;
    if (variant === 'cover') {
      const moonX = land ? 360 : 250, moonY = land ? 250 : 275, moonR = land ? 72 : 66;
      return `<svg class="rp-landscape" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <radialGradient id="${gid}_moon" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#FFFBF2" stop-opacity="0.96"/>
            <stop offset="68%" stop-color="#F7EFE0" stop-opacity="0.65"/>
            <stop offset="100%" stop-color="#F4EDE0" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="${gid}_fadeR" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="white" stop-opacity="1"/>
            <stop offset="64%" stop-color="white" stop-opacity="0.95"/>
            <stop offset="88%" stop-color="white" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="white" stop-opacity="0"/>
          </linearGradient>
          <mask id="${gid}_mask">
            <rect width="${vw}" height="${vh}" fill="url(#${gid}_fadeR)"/>
          </mask>
          <linearGradient id="${gid}_m1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3E5D6B" stop-opacity="0.24"/>
            <stop offset="65%" stop-color="#3E5D6B" stop-opacity="0.09"/>
            <stop offset="100%" stop-color="#F4EDE0" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="${gid}_m2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2E2925" stop-opacity="0.25"/>
            <stop offset="70%" stop-color="#2E2925" stop-opacity="0.09"/>
            <stop offset="100%" stop-color="#F4EDE0" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="${gid}_m3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1F1B18" stop-opacity="0.33"/>
            <stop offset="80%" stop-color="#1F1B18" stop-opacity="0.11"/>
            <stop offset="100%" stop-color="#1F1B18" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        <!-- 淡月光晕 -->
        <circle cx="${moonX}" cy="${moonY}" r="${moonR * 1.9}" fill="url(#${gid}_moon)"/>
        <circle cx="${moonX}" cy="${moonY}" r="${moonR}" fill="#FCF8EE" stroke="#9C7A40" stroke-opacity="0.24" stroke-width="1.3"/>
        <!-- 飞鸟（随 tick 极缓移动） -->
        <g class="rp-birds" fill="none" stroke="#2E2925" stroke-width="2.2" stroke-linecap="round" opacity="0.62">
          <path d="M ${moonX + 94} ${moonY + 26} q 11 -11 22 0 q 11 -11 22 0"/>
          <path d="M ${moonX + 150} ${moonY + 54} q 9 -9 18 0 q 9 -9 18 0" stroke-width="1.8"/>
          <path d="M ${moonX + 118} ${moonY + 82} q 7 -7 14 0 q 7 -7 14 0" stroke-width="1.5" opacity="0.72"/>
        </g>
        <g mask="url(#${gid}_mask)">
          <!-- 远山（石青淡墨） -->
          <path d="M -20 ${vh * 0.67} Q ${vw * 0.14} ${vh * 0.43} ${vw * 0.30} ${vh * 0.56} T ${vw * 0.62} ${vh * 0.50} T ${vw + 20} ${vh * 0.66} L ${vw + 20} ${vh} L -20 ${vh} Z" fill="url(#${gid}_m1)"/>
          <!-- 烟岚云带 -->
          <g class="rp-mist" opacity="0.58">
            <ellipse cx="${vw * 0.32}" cy="${vh * 0.65}" rx="${vw * 0.28}" ry="${vh * 0.044}" fill="#F6F0E4"/>
            <ellipse cx="${vw * 0.56}" cy="${vh * 0.72}" rx="${vw * 0.25}" ry="${vh * 0.036}" fill="#F6F0E4"/>
          </g>
          <!-- 中山（重墨） -->
          <path d="M -20 ${vh * 0.76} Q ${vw * 0.13} ${vh * 0.60} ${vw * 0.27} ${vh * 0.69} T ${vw * 0.56} ${vh * 0.63} T ${vw + 20} ${vh * 0.77} L ${vw + 20} ${vh} L -20 ${vh} Z" fill="url(#${gid}_m2)"/>
          <!-- 近峰 -->
          <path d="M -20 ${vh * 0.85} Q ${vw * 0.16} ${vh * 0.73} ${vw * 0.34} ${vh * 0.82} T ${vw * 0.68} ${vh * 0.78} T ${vw + 20} ${vh * 0.88} L ${vw + 20} ${vh} L -20 ${vh} Z" fill="url(#${gid}_m3)"/>
          <!-- 远水微纹 -->
          <g stroke="#3E5D6B" stroke-opacity="0.24" stroke-width="1.3" stroke-linecap="round">
            <line x1="${vw * 0.08}" y1="${vh * 0.90}" x2="${vw * 0.28}" y2="${vh * 0.90}"/>
            <line x1="${vw * 0.16}" y1="${vh * 0.925}" x2="${vw * 0.42}" y2="${vh * 0.925}"/>
            <line x1="${vw * 0.34}" y1="${vh * 0.95}" x2="${vw * 0.56}" y2="${vh * 0.95}"/>
          </g>
        </g>
      </svg>`;
    }
    if (variant === 'ending') {
      return `<svg class="rp-landscape" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="${gid}_fadeR" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="white" stop-opacity="1"/>
            <stop offset="68%" stop-color="white" stop-opacity="0.9"/>
            <stop offset="94%" stop-color="white" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="white" stop-opacity="0"/>
          </linearGradient>
          <mask id="${gid}_mask"><rect width="${vw}" height="${vh}" fill="url(#${gid}_fadeR)"/></mask>
          <linearGradient id="${gid}_e1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3E5D6B" stop-opacity="0.20"/>
            <stop offset="100%" stop-color="#F4EDE0" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="${gid}_e2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2E2925" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="#F4EDE0" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <g mask="url(#${gid}_mask)">
          <path d="M -20 ${vh * 0.77} Q ${vw * 0.20} ${vh * 0.59} ${vw * 0.44} ${vh * 0.70} T ${vw + 20} ${vh * 0.68} L ${vw + 20} ${vh} L -20 ${vh} Z" fill="url(#${gid}_e1)"/>
          <path d="M -20 ${vh * 0.85} Q ${vw * 0.26} ${vh * 0.73} ${vw * 0.54} ${vh * 0.82} T ${vw + 20} ${vh * 0.80} L ${vw + 20} ${vh} L -20 ${vh} Z" fill="url(#${gid}_e2)"/>
          <!-- 一叶孤舟与水波 -->
          <g class="rp-birds" transform="translate(${vw * 0.22}, ${vh * 0.83})" opacity="0.58">
            <path d="M -42 0 Q 0 12 46 -2 Q 18 4 -20 4 Z" fill="#2E2925"/>
            <path d="M -6 -1 Q 2 -14 14 -1 Z" fill="#3E5D6B" opacity="0.72"/>
            <line x1="-64" y1="12" x2="60" y2="12" stroke="#3E5D6B" stroke-width="1.3" stroke-opacity="0.42"/>
          </g>
        </g>
      </svg>`;
    }
    // 简约竹影 / 疏枝点缀（金句与引文左侧）
    return `<svg class="rp-sprig" viewBox="0 0 320 520" aria-hidden="true">
      <g fill="none" stroke="#2E2925" stroke-opacity="0.18" stroke-linecap="round">
        <path d="M 46 510 Q 74 370 96 230 T 142 36" stroke-width="4.5"/>
        <path d="M 96 230 Q 145 190 198 168" stroke-width="2.2"/>
        <path d="M 76 340 Q 128 308 176 296" stroke-width="2"/>
      </g>
      <g fill="#3E5D6B" fill-opacity="0.16">
        <path d="M 142 36 Q 178 44 202 68 Q 162 64 142 36 Z"/>
        <path d="M 134 78 Q 168 92 186 122 Q 150 112 134 78 Z"/>
        <path d="M 198 168 Q 238 158 268 172 Q 230 184 198 168 Z"/>
        <path d="M 164 184 Q 196 202 216 230 Q 180 218 164 184 Z"/>
        <path d="M 176 296 Q 214 292 242 310 Q 204 316 176 296 Z"/>
      </g>
      <circle cx="116" cy="148" r="5" fill="#B5302A" fill-opacity="0.32"/>
      <circle cx="158" cy="212" r="3.5" fill="#B5302A" fill-opacity="0.28"/>
    </svg>`;
  }

  // 横向飞白墨刷 SVG（章节页中央横贯笔触）
  function makeBrushStrokeSvg() {
    return `<svg class="rp-stroke-svg" viewBox="0 0 1200 130" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="rp_ink_brush" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stop-color="#1F1B18" stop-opacity="0.32"/>
          <stop offset="35%" stop-color="#2E2925" stop-opacity="0.20"/>
          <stop offset="72%" stop-color="#3E5D6B" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#3E5D6B" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="M 1190 36 C 980 20, 750 26, 510 35 C 300 43, 130 52, 10 62 C 165 70, 365 77, 625 80 C 865 82, 1055 92, 1188 76 C 1198 67, 1198 44, 1190 36 Z" fill="url(#rp_ink_brush)"/>
      <path d="M 1170 53 C 920 45, 650 51, 320 60" fill="none" stroke="#F4EDE0" stroke-opacity="0.52" stroke-width="4.5" stroke-dasharray="150 28 85 18 220 35"/>
      <path d="M 1130 68 C 850 63, 550 65, 200 71" fill="none" stroke="#F4EDE0" stroke-opacity="0.38" stroke-width="2.8" stroke-dasharray="95 24 165 32"/>
    </svg>`;
  }

  // 圆形时令盘核心 SVG（用于 cards layout: "wheel"）
  function makeWheelDialSvg(centerLabel) {
    let ticks = '';
    for (let i = 0; i < 24; i++) {
      const deg = i * 15;
      const major = i % 6 === 0;
      const mid = i % 3 === 0 && !major;
      const y2 = major ? -142 : mid ? -147 : -153;
      const col = major ? '#B5302A' : mid ? '#3E5D6B' : '#2E2925';
      const sw = major ? 3 : mid ? 1.9 : 1.1;
      const op = major ? 0.88 : mid ? 0.58 : 0.36;
      ticks += `<line x1="0" y1="-164" x2="0" y2="${y2}" transform="rotate(${deg})" stroke="${col}" stroke-width="${sw}" stroke-opacity="${op}"/>`;
    }
    const quadHints = centerLabel === '四时'
      ? `<text x="-78" y="-66" fill="#4A6F4F" fill-opacity="0.52" font-family='"MV Serif", serif' font-size="22" text-anchor="middle">春</text>
         <text x="78" y="-66" fill="#B5302A" fill-opacity="0.52" font-family='"MV Serif", serif' font-size="22" text-anchor="middle">夏</text>
         <text x="78" y="80" fill="#9C7A40" fill-opacity="0.52" font-family='"MV Serif", serif' font-size="22" text-anchor="middle">秋</text>
         <text x="-78" y="80" fill="#3E5D6B" fill-opacity="0.52" font-family='"MV Serif", serif' font-size="22" text-anchor="middle">冬</text>`
      : '';
    return `<svg class="rp-wheel-svg" viewBox="-190 -190 380 380" aria-hidden="true">
      <circle r="176" fill="none" stroke="#3E5D6B" stroke-opacity="0.26" stroke-width="1.3" stroke-dasharray="4 6"/>
      <circle r="164" fill="rgba(252,248,240,0.68)" stroke="#2E2925" stroke-opacity="0.54" stroke-width="1.9"/>
      <circle r="142" fill="none" stroke="#2E2925" stroke-opacity="0.22" stroke-width="1"/>
      <circle r="110" fill="none" stroke="#3E5D6B" stroke-opacity="0.24" stroke-width="1"/>
      <line x1="-164" y1="0" x2="164" y2="0" stroke="#2E2925" stroke-opacity="0.14" stroke-width="1"/>
      <line x1="0" y1="-164" x2="0" y2="164" stroke="#2E2925" stroke-opacity="0.14" stroke-width="1"/>
      <line x1="-116" y1="-116" x2="116" y2="116" stroke="#3E5D6B" stroke-opacity="0.14" stroke-width="1" stroke-dasharray="4 6"/>
      <line x1="116" y1="-116" x2="-116" y2="116" stroke="#3E5D6B" stroke-opacity="0.14" stroke-width="1" stroke-dasharray="4 6"/>
      ${ticks}
      ${quadHints}
      <circle cx="0" cy="-164" r="5.5" fill="#B5302A"/>
      <circle cx="164" cy="0" r="5.5" fill="#B5302A"/>
      <circle cx="0" cy="164" r="5.5" fill="#B5302A"/>
      <circle cx="-164" cy="0" r="5.5" fill="#B5302A"/>
      <circle r="54" fill="#B5302A" fill-opacity="0.92"/>
      <circle r="47" fill="none" stroke="#FBF3E6" stroke-width="1.6" stroke-opacity="0.9"/>
      <text x="0" y="11" fill="#FBF3E6" font-family='"MV Brush", "MV Serif", serif' font-size="34" text-anchor="middle" letter-spacing="4">${MV.util.esc(centerLabel)}</text>
    </svg>`;
  }

  // 日晷刻度圆环 SVG（用于 bignum）
  function makeSundialSvg() {
    let ticks = '';
    for (let i = 0; i < 24; i++) {
      const deg = i * 15;
      const maj = i % 6 === 0;
      ticks += `<line x1="0" y1="-192" x2="0" y2="${maj ? -174 : -182}" transform="rotate(${deg})" stroke="${maj ? '#B5302A' : '#2E2925'}" stroke-width="${maj ? 2.4 : 1.1}" stroke-opacity="${maj ? 0.72 : 0.28}"/>`;
    }
    return `<svg class="rp-sundial-svg" viewBox="-210 -210 420 420" aria-hidden="true">
      <circle r="200" fill="none" stroke="#3E5D6B" stroke-opacity="0.18" stroke-width="1.2" stroke-dasharray="5 8"/>
      <circle r="192" fill="rgba(252,248,240,0.42)" stroke="#2E2925" stroke-opacity="0.3" stroke-width="1.6"/>
      <circle r="172" fill="none" stroke="#2E2925" stroke-opacity="0.14" stroke-width="1"/>
      ${ticks}
    </svg>`;
  }

  // 构建朱砂方印元素
  function makeSeal(api, parent, text, cls = '') {
    const clean = api.plain(text || '').replace(/\s/g, '').slice(0, 4);
    if (!clean) return null;
    const e = api.add(parent, 'div', `rp-seal${clean.length === 4 ? ' q4' : ''}${cls ? ' ' + cls : ''}`, `<span>${api.esc(clean)}</span>`);
    return e;
  }

  // 竖排题柱（在 16:9 横卷中用作右侧标题区）
  function buildRightVHead(d, api, parent) {
    if (!d.kicker && !d.title && !d.sub && !d.dek) return null;
    const hd = api.add(parent, 'div', 'rp-vhead');
    if (d.kicker) {
      const k = api.add(hd, 'div', 'rp-vkicker', `<span>${vRich(d.kicker)}</span>`);
      api.beat(k, 'kicker', d.kickerAt);
    }
    if (d.title) {
      const box = api.add(hd, 'h1', 'rp-vtitle');
      const ls = splitVerticalLines(linesOf(d.title), 7, d.titleSplit !== false);
      const els = ls.map(l => api.add(box, 'span', 'vln', vRich(l)));
      const b = api.beat(els, 'title', d.titleAt, { kind: 'brushDown', d: 0.9, stagger: 0.16 });
      els.forEach(e => api.marks(e, b));
      api.fitBox(box, { height: 610, width: 220, min: 0.5 });
    }
    const sub = d.sub ?? d.dek;
    if (sub) {
      const s = api.add(hd, 'div', 'rp-vsub', vRich(sub));
      const b = api.beat(s, 'text', d.subAt);
      api.marks(s, b);
    }
    return hd;
  }

  // 判断列表是否适合「乌丝栏竖排手卷」
  function canScrollVertical(items, api, d) {
    if (d.layout === 'rows') return false;
    if (d.layout === 'scroll') return true;
    if (items.length < 2 || items.length > 5) return false;
    const maxLen = Math.max(...items.map(it => api.plain(it.text ?? it.title ?? '').length));
    const hasLongNote = items.some(it => api.plain(it.note || '').length > 10);
    const hasLatinWord = items.some(it => /[A-Za-z]{4,}/.test(api.plain(it.text ?? it.title ?? '')));
    if (hasLatinWord || hasLongNote) return false;
    return api.land ? maxLen <= 18 : maxLen <= 19;
  }

  // 引首闲章字库（随章节循环）
  const INTRO_SEALS = ['起', '承', '转', '合', '续', '终'];

  MV.style({
    transition: { kind: 'inkWash', dur: 0.85 },
    motion: {
      kicker: { kind: 'fade', d: 0.75, gap: 0 },
      title: { kind: 'brushDown', d: 0.95, stagger: 0.16, gap: 0.14 },
      big: { kind: 'ink', d: 1.0, stagger: 0.18, gap: 0.14 },
      text: { kind: 'ink', d: 0.85, gap: 0.32 },
      item: { kind: 'scrollUnroll', d: 0.78, stagger: 0.08, gap: 0.42 },
      card: { kind: 'ink', d: 0.82, stagger: 0.09, gap: 0.38 },
      chip: { kind: 'fade', d: 0.55, stagger: 0.08, gap: 0.28 },
      image: { kind: 'ink', d: 0.9, gap: 0.25 },
      bar: { kind: 'fade', d: 0.4, gap: 0.32 },
      grow: { kind: 'grow', d: 0.95 },
      note: { kind: 'fade', d: 0.85, gap: 0.35 },
      quote: { kind: 'brushDown', d: 1.05, stagger: 0.26, gap: 0.18 },
      stamp: { kind: 'stamp', d: 0.55, gap: 0.25 },
      line: { kind: 'draw', d: 0.75 },
    },
    focus: true,
    subMax: { r34: 16, r916: 14, r169: 24 },
    mediaFrame: 'paper',
    kenBurns: 0.03,
    quoteMark: '',
    icons: {
      check: '<svg class="ic ic-check" viewBox="0 0 48 48"><path class="dr" d="M9 26 Q17 34 21 37 Q29 22 40 12"/></svg>',
      cross: '<svg class="ic ic-cross" viewBox="0 0 48 48"><path class="dr" d="M12 13 Q24 23 36 36 M36 12 Q24 24 12 36"/></svg>',
      arrow: '<svg class="ic ic-arrow" viewBox="0 0 48 48"><path class="dr" d="M8 24 H37 M27 15 Q33 20 38 24 Q33 28 27 33"/></svg>',
    },

    // 每页细微气韵：章节用淡青烟宣纸，引用用暖茶古笺，支持 dark/ink 深墨夜色变体
    look(d, i, o) {
      const t = o.sc.t;
      if (d.bg === 'dark' || d.bg === 'ink') {
        return {
          tone: 'dark',
          bg: 'radial-gradient(circle at 30% 25%, #2A2724 0%, #191715 100%)',
          vars: {
            '--bg': '#1B1917', '--fg': '#F2EBE0', '--fg2': '#BDB2A3', '--fg3': '#857B6F',
            '--accent': '#C9443A', '--hl': '#C9443A', '--accent2': '#6E93A3',
            '--line': 'rgba(242,235,224,.16)', '--line-strong': 'rgba(242,235,224,.42)',
            '--card-bg': 'rgba(38,34,30,.72)', '--card-bd': 'rgba(242,235,224,.28)',
            '--sub-fg': '#F2EBE0', '--sub-hl': '#E06055',
          },
        };
      }
      if (t === 'chapter') {
        return {
          tone: 'light',
          bg: 'linear-gradient(180deg, rgba(62,93,107,.065), rgba(244,237,224,.02) 55%, rgba(62,93,107,.05)), var(--paper) 0 0 / 100% 100% no-repeat',
        };
      }
      if (t === 'quote') {
        return {
          tone: 'light',
          bg: 'linear-gradient(180deg, rgba(156,122,64,.06), rgba(156,122,64,.02)), var(--paper) 0 0 / 100% 100% no-repeat',
        };
      }
      return { tone: 'light' };
    },

    // 宣纸底纸：暖米熟宣 + 淡茶晕染 + 桑皮纤维 + 天头地脚装裱暗绫 + 极淡远山气韵
    paint(g, W, H, R, u) {
      g.fillStyle = '#F4EDE0';
      g.fillRect(0, 0, W, H);

      // 柔和宣纸晕染
      for (let i = 0; i < 24; i++) {
        const x = R() * W, y = R() * H, r = 160 + R() * 440, a = 0.018 + R() * 0.032;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(166,134,88,${a.toFixed(3)})`);
        gr.addColorStop(1, 'rgba(166,134,88,0)');
        g.fillStyle = gr;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }

      // 装裱绫边（立轴天地头 / 横卷左右包首）
      g.fillStyle = 'rgba(218,203,176,0.34)';
      if (u.land) {
        g.fillRect(0, 0, 56, H);
        g.fillRect(W - 56, 0, 56, H);
        g.fillRect(56, 0, W - 112, 34);
        g.fillRect(56, H - 34, W - 112, 34);
      } else {
        const th = u.rc === 'r916' ? 148 : 88;
        const bh = u.rc === 'r916' ? 116 : 82;
        g.fillRect(0, 0, W, th);
        g.fillRect(0, H - bh, W, bh);
        // 绫纸纹理微斜线
        g.strokeStyle = 'rgba(140,116,80,0.06)';
        g.lineWidth = 1;
        for (let y = 8; y < th; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        for (let y = H - bh + 8; y < H; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      }

      // 宣纸桑皮纤维
      for (let i = 0; i < 1400; i++) {
        const x = R() * W, y = R() * H, long = R() < 0.11;
        const l = long ? 70 + R() * 150 : 8 + R() * 36, a = R() * Math.PI;
        g.strokeStyle = `rgba(124,98,64,${(long ? 0.022 + R() * 0.026 : 0.026 + R() * 0.042).toFixed(3)})`;
        g.lineWidth = long ? 0.5 + R() * 0.4 : 0.45 + R() * 0.7;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(
          x + Math.cos(a) * l * 0.5 + (R() - 0.5) * l * 0.24,
          y + Math.sin(a) * l * 0.5 + (R() - 0.5) * l * 0.24,
          x + Math.cos(a) * l, y + Math.sin(a) * l
        );
        g.stroke();
      }

      // 极淡底纸远山气韵（偏左下，衬托内容页不抢字）
      const ph = [R() * 7, R() * 7, R() * 7];
      for (let l = 0; l < 2; l++) {
        const base = H * (0.87 + l * 0.045), amp = H * (0.075 - l * 0.022), alpha = 0.036 + l * 0.022;
        g.save();
        g.filter = `blur(${(5 - l * 1.8).toFixed(1)}px)`;
        g.beginPath();
        g.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) {
          const k = x / W;
          const env = Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, (1 - k + 0.12 - l * 0.06) / 1.05))), 1.5);
          const n = 0.6 * Math.sin(k * 6.4 + ph[l]) + 0.4 * Math.sin(k * 15.2 + ph[l + 1]);
          g.lineTo(x, base - amp * env * (0.62 + 0.38 * n));
        }
        g.lineTo(W, H);
        g.closePath();
        const gr = g.createLinearGradient(0, base - amp, 0, H);
        gr.addColorStop(0, l === 0 ? `rgba(62,93,107,${alpha.toFixed(3)})` : `rgba(46,41,37,${alpha.toFixed(3)})`);
        gr.addColorStop(1, 'rgba(46,41,37,0)');
        g.fillStyle = gr;
        g.fill();
        g.restore();
      }

      // 边缘柔暗角
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.64);
      vg.addColorStop(0, 'rgba(90,72,46,0)');
      vg.addColorStop(1, 'rgba(90,72,46,0.065)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);

      u.noise(5, 3);
    },

    // 装裱框架、卷名、章节、右起进度墨线与朱砂点、中文页码
    chrome(c) {
      const frame = c.h('div', 'rp-frame');
      // 9:16 立轴惊燕带；16:9 横卷左右木轴头
      if (c.rc === 'r916') {
        frame.append(c.h('i', 'rp-jinyan l'), c.h('i', 'rp-jinyan r'));
      }
      if (c.land) {
        c.el.append(
          c.h('div', 'rp-roller rp-roller-l', '<i></i><b></b><i></i>'),
          c.h('div', 'rp-roller rp-roller-r', '<i></i><b></b><i></i>')
        );
      }

      const barTop = c.h('div', 'rp-topbar');
      const ser = c.h('div', 'rp-ser', `<i></i><span>${c.esc(c.plain(c.story.series || c.story.title || ''))}</span>`);
      const sec = c.h('div', 'rp-sec');
      barTop.append(ser, sec);

      // 进度条：从右往左推进，前端带朱砂小印点
      const prog = c.h('div', 'rp-prog');
      const fill = c.h('i', 'rp-prog-fill');
      const dot = c.h('b', 'rp-prog-dot');
      prog.append(fill, dot);

      const foot = c.h('div', 'rp-foot');
      const by = c.h('span', 'rp-by', c.esc(c.plain(c.story.byline || '')));
      const pg = c.h('span', 'rp-page');
      foot.append(by, pg);

      c.el.append(frame, barTop, prog, foot);

      let last = -2;
      return info => {
        if (info.i !== last || info.cover) {
          last = info.i;
          pg.textContent = `${cnNum(info.page)} · ${cnNum(info.total)}`;
          sec.textContent = info.cover ? '' : (info.section || '');
        }
        const p = c.cl(info.progress);
        fill.style.scale = `${p.toFixed(4)} 1`;
        dot.style.right = `${(p * 100).toFixed(3)}%`;
      };
    },

    // 持续微妙动效：飞鸟与云岚按时间 t 确定性缓移
    tick(t, o) {
      if (!o || !o.sc || !o.sc.el) return;
      const birds = o.sc.el.querySelector('.rp-birds');
      if (birds) {
        const dx = Math.sin(t * 0.45) * 10 - (t % 20) * 0.9;
        const dy = Math.sin(t * 0.8) * 3.5;
        birds.style.translate = `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
      }
      const mist = o.sc.el.querySelector('.rp-mist');
      if (mist) {
        mist.style.translate = `${(Math.sin(t * 0.32) * 14).toFixed(2)}px 0`;
      }
    },

    // ═════════════ 彻底重做的宋画版式模板 ═════════════
    templates: {
      // 1. 封面：右侧竖排书法 + 左侧淡墨山水留白 + 左下朱砂大印（挂轴 / 横卷）
      cover(d, api) {
        const centerMode = d.layout === 'center';
        const hasImg = !!d.image;
        api.sc.el.classList.add(centerMode ? 'rp-cover-center' : 'rp-cover-scroll');
        if (hasImg) api.sc.el.classList.add('rp-cover-img');

        // 左侧水墨远山孤月飞鸟（无自定义封面图时铺在左侧画心）
        if (!hasImg) {
          const art = api.add(api.sc.el, 'div', 'rp-art rp-art-cover', makeLandscapeSvg('cover', api.land));
          api.beat(art, 'image', 0.05, { kind: 'ink', d: 1.25 });
        }

        const wrap = api.add(api.root, 'div', 'rp-cov-grid');

        // 左侧画心区：图片 / 留白 + 左下标签、落款、朱砂大印
        const left = api.add(wrap, 'div', 'rp-cov-left');
        if (hasImg) {
          api.media(d.image, { parent: left, frame: d.frame || 'paper', at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
        }
        const foot = api.add(left, 'div', 'rp-cov-foot');
        const sealTxt = api.plain(api.story.seal || d.title || '宋纸').replace(/[^\u4e00-\u9fa5A-Za-z]/g, '').slice(0, 4);
        const seal = makeSeal(api, foot, sealTxt || '印', 'rp-seal-cov');
        if (seal) api.beat(seal, 'stamp', null, { last: true });

        const infoCol = api.add(foot, 'div', 'rp-cov-info');
        const tags = arr(d.tags ?? d.chips);
        if (tags.length) {
          const box = api.add(infoCol, 'div', 'chips rp-cov-tags');
          const els = tags.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), api.rich(c)));
          api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
        }
        if (d.meta) {
          const m = api.add(infoCol, 'div', 'meta rp-cov-meta', api.rich(d.meta));
          api.beat(m, 'text', d.metaAt);
        }

        // 右侧竖排书法主视觉区
        const right = api.add(wrap, 'div', 'rp-cov-right');
        if (d.kicker) {
          const k = api.add(right, 'div', 'rp-vkicker rp-cov-kicker', `<span>${vRich(d.kicker)}</span>`);
          api.beat(k, 'kicker', d.kickerAt);
        }
        if (d.title) {
          const tbox = api.add(right, 'h1', 'rp-vtitle rp-cov-title');
          const maxC = api.land ? 8 : api.rc === 'r916' ? 10 : 9;
          const ls = splitVerticalLines(linesOf(d.title), maxC, d.titleSplit !== false);
          const els = ls.map(l => api.add(tbox, 'span', 'vln', vRich(l)));
          const b = api.beat(els, 'title', d.titleAt, { kind: 'brushDown', d: 1.0, stagger: 0.18 });
          els.forEach(e => api.marks(e, b));
          const maxH = api.land ? 650 : api.rc === 'r916' ? 980 : 880;
          const maxW = api.land ? 480 : 410;
          api.fitBox(tbox, { height: maxH, width: maxW, min: 0.45 });
        }
        const sub = d.sub ?? d.dek;
        if (sub) {
          const s = api.add(right, 'div', 'rp-vsub rp-cov-sub', vRich(sub));
          const b = api.beat(s, 'text', d.subAt, { kind: 'brushDown', d: 0.9 });
          api.marks(s, b);
          api.fitBox(s, { height: api.land ? 600 : 780, width: 120, min: 0.65 });
        }
      },

      // 2. 章节页：中央淡墨横扫笔触 + 右侧竖排「卷一」与椭圆引首章 + 竖排题名 + 左题跋
      chapter(d, api) {
        const stroke = api.add(api.sc.el, 'div', 'rp-chap-stroke', makeBrushStrokeSvg());
        api.beat(stroke, 'line', 0.08, { kind: 'scrollUnroll', d: 1.05 });

        const wrap = api.add(api.root, 'div', 'rp-chap-grid');
        // 左：题跋 note
        const left = api.add(wrap, 'div', 'rp-chap-left');
        if (d.note) {
          const nt = api.add(left, 'div', 'rp-vnote rp-chap-note', vRich(d.note));
          const b = api.beat(nt, 'note', d.noteAt, { auto: d.note, kind: 'ink' });
          api.marks(nt, b);
        }

        // 右：竖排卷号 + 椭圆引首章 + 竖排章节标题
        const right = api.add(wrap, 'div', 'rp-chap-right');
        const chapIdx = api.sc.chapNo || 1;
        const n = d.num ?? `卷${cnNum(chapIdx)}`;
        if (n !== false && n !== '') {
          const numCol = api.add(right, 'div', 'rp-chap-numcol');
          const ovalTxt = INTRO_SEALS[(chapIdx - 1) % INTRO_SEALS.length];
          const oval = api.add(numCol, 'div', 'rp-oval-seal', `<span>${ovalTxt}</span>`);
          const ne = api.add(numCol, 'div', 'rp-chap-num', vRich(String(n)));
          api.beat(ne, 'big', d.numAt, { kind: 'brushDown', d: 0.85 });
          api.beat(oval, 'stamp', null, { gap: 0.08 });
        }
        if (d.title) {
          const tbox = api.add(right, 'h1', 'rp-vtitle rp-chap-title');
          const maxC = api.land ? 8 : 10;
          const ls = splitVerticalLines(linesOf(d.title), maxC, d.titleSplit !== false);
          const els = ls.map(l => api.add(tbox, 'span', 'vln', vRich(l)));
          const b = api.beat(els, 'title', d.titleAt, { kind: 'brushDown', d: 0.95, stagger: 0.16 });
          els.forEach(e => api.marks(e, b));
          api.fitBox(tbox, { height: api.land ? 610 : 860, width: api.land ? 480 : 380, min: 0.45 });
        }
        if (d.kicker) {
          const k = api.add(right, 'div', 'rp-vkicker', `<span>${vRich(d.kicker)}</span>`);
          api.beat(k, 'kicker', d.kickerAt);
        }
      },

      // 3. 一句话：右起竖排书法题跋 + 乌丝栏细线 + 左侧竹影留白
      statement(d, api) {
        const sprig = api.add(api.sc.el, 'div', 'rp-art rp-art-sprig', makeLandscapeSvg('sprig', api.land));
        api.beat(sprig, 'image', 0.05, { kind: 'fade', d: 1.0 });

        const wrap = api.add(api.root, 'div', 'rp-stmt-grid');
        // 左侧留白与落款注记
        const left = api.add(wrap, 'div', 'rp-stmt-left');
        if (d.note) {
          const nt = api.add(left, 'div', 'rp-stmt-note', api.rich(d.note));
          const b = api.beat(nt, 'note', d.noteAt, { auto: d.note });
          api.marks(nt, b);
        }

        // 右侧竖排书法大字
        const right = api.add(wrap, 'div', 'rp-stmt-right');
        if (d.kicker) {
          const k = api.add(right, 'div', 'rp-vkicker', `<span>${vRich(d.kicker)}</span>`);
          api.beat(k, 'kicker', d.kickerAt);
        }
        if (d.title) {
          const th = api.add(right, 'div', 'rp-stmt-head', vRich(d.title));
          api.beat(th, 'title', d.titleAt, { kind: 'brushDown', d: 0.85 });
        }
        const raw = linesOf(d.text ?? d.lines);
        const maxC = api.land ? 9 : api.rc === 'r916' ? 12 : 11;
        const ls = splitVerticalLines(raw, maxC, true);
        if (ls.length) {
          const box = api.add(right, 'div', 'rp-vsay');
          ls.forEach((l, i) => {
            const e = api.add(box, 'div', 'rp-vsl', vRich(l));
            const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, kind: 'brushDown', d: 0.95, gap: 0.18 });
            api.marks(e, b);
          });
          const maxH = api.land ? 610 : api.rc === 'r916' ? 920 : 820;
          const maxW = api.land ? 920 : 620;
          api.fitBox(box, { height: maxH, width: maxW, min: 0.45 });
        }
      },

      // 4. 大数字：淡墨日晷刻度环 + 中文书法数字配小字阿拉伯数字 + 右侧竖排题签
      bignum(d, api) {
        const raw = d.value ?? d.num;
        const parsed = typeof raw === 'number' || typeof raw === 'string' ? api.parseNum(raw) : null;
        // 仅对 1~999 的干净纯整数（无小数点、无前后符号）启用超大中文书法主数字
        const isPureSmallInt = parsed && !parsed.dec && !parsed.pre && !parsed.suf && parsed.num >= 1 && parsed.num <= 999 && Number.isInteger(parsed.num);

        const wrap = api.add(api.root, 'div', 'rp-bn-grid');

        // 左侧/中央：日晷刻度盘与数字主视觉
        const main = api.add(wrap, 'div', 'rp-bn-main');
        const dial = api.add(main, 'div', 'rp-bn-dial');
        const dialSvg = api.add(dial, 'div', 'rp-bn-ring', makeSundialSvg());
        api.beat(dialSvg, 'image', 0.08, { kind: 'inkRing', d: 0.95 });

        const core = api.add(dial, 'div', 'rp-bn-core');
        if (isPureSmallInt) {
          const cnRow = api.add(core, 'div', 'rp-bn-cn');
          api.add(cnRow, 'span', 'rp-bn-cnv', cnNum(parsed.num));
          if (d.unit) api.add(cnRow, 'span', 'rp-bn-cnu', api.rich(d.unit));
          api.fitBox(cnRow, { width: api.land ? 420 : 440, min: 0.5 });

          const araRow = api.add(core, 'div', 'rp-bn-ara');
          const { val } = api.num(araRow, raw);
          if (d.unit) api.add(araRow, 'span', 'rp-bn-arau', api.rich(d.unit));
          api.beat(cnRow, 'big', d.valueAt, { auto: [String(raw), cnNum(parsed.num)], kind: 'ink', d: 1.0, with: val ? [[val, 'count', 0.1]] : [] });
          api.beat(araRow, 'text', null, { gap: 0.15 });
        } else {
          const row = api.add(core, 'div', 'bn-row rp-bn-arafull');
          const { val } = api.num(row, raw);
          if (d.unit) api.add(row, 'span', 'bn-u', api.rich(d.unit));
          api.fitBox(row, { width: api.land ? 760 : 640, min: 0.42 });
          api.beat(row, 'big', d.valueAt, { auto: raw != null ? String(raw) : null, with: val ? [[val, 'count', 0]] : [] });
        }

        if (d.label && !api.land) {
          const lb = api.add(main, 'div', 'rp-bn-label-h', api.rich(d.label));
          const b = api.beat(lb, 'text', d.labelAt, { auto: d.label });
          api.marks(lb, b);
        }
        api.note(main, d.note, d.noteAt);

        // 右侧：竖排 kicker +（横屏时含竖排 label）
        if (d.kicker || (d.label && api.land)) {
          const side = api.add(wrap, 'div', 'rp-bn-side');
          if (d.kicker) {
            const k = api.add(side, 'div', 'rp-vkicker', `<span>${vRich(d.kicker)}</span>`);
            api.beat(k, 'kicker', d.kickerAt);
          }
          if (d.label && api.land) {
            const lb = api.add(side, 'div', 'rp-vtitle rp-bn-label-v');
            const ls = splitVerticalLines(linesOf(d.label), 9, true);
            const els = ls.map(l => api.add(lb, 'span', 'vln', vRich(l)));
            const b = api.beat(els, 'text', d.labelAt, { auto: d.label, kind: 'brushDown', d: 0.9, stagger: 0.14 });
            els.forEach(e => api.marks(e, b));
            api.fitBox(lb, { height: 580, width: 220, min: 0.55 });
          }
        }
      },

      // 5. 引用：纯竖排书法引文 + 朱砂直角引号 + 左侧小楷出处（避让左下印章）
      quote(d, api) {
        const sprig = api.add(api.sc.el, 'div', 'rp-art rp-art-sprig', makeLandscapeSvg('sprig', api.land));
        api.beat(sprig, 'image', 0.05, { kind: 'fade', d: 1.0 });

        const wrap = api.add(api.root, 'div', 'rp-qt-grid');

        // 左侧：竖排小楷出处（若有 stamp 则自动抬升避让）
        const left = api.add(wrap, 'div', 'rp-qt-left' + (d.stamp ? ' has-stamp' : ''));
        const src = d.source ?? d.by ?? d.author;
        if (src) {
          const se = api.add(left, 'div', 'rp-qt-src', `<span>${vRich(src)}</span>`);
          api.beat(se, 'note', d.sourceAt, { auto: src, kind: 'brushDown', d: 0.8 });
        }

        // 右侧：竖排题签 kicker + 竖排书法引文（从右往左逐列挥毫）
        const right = api.add(wrap, 'div', 'rp-qt-right');
        if (d.kicker) {
          const k = api.add(right, 'div', 'rp-vkicker rp-qt-kicker', `<span>${vRich(d.kicker)}</span>`);
          api.beat(k, 'kicker', d.kickerAt);
        }
        const qt = api.add(right, 'div', 'rp-vquote');
        const raw = linesOf(d.text ?? d.quote);
        const maxC = api.land ? 9 : api.rc === 'r916' ? 12 : 10;
        const ls = splitVerticalLines(raw, maxC, true);
        const els = ls.map((l, i) => {
          const cls = 'rp-vql' + (i === 0 ? ' first' : '') + (i === ls.length - 1 ? ' last' : '');
          return api.add(qt, 'div', cls, vRich(l));
        });
        const b = api.beat(els, 'quote', d.textAt, { kind: 'brushDown', d: 1.0, stagger: 0.24 });
        els.forEach(e => api.marks(e, b));
        api.fitBox(qt, { height: api.land ? 620 : api.rc === 'r916' ? 960 : 840, width: api.land ? 1050 : 620, min: 0.45 });
      },

      // 6. 列表：从右往左展开的乌丝栏手卷竖列（长句自动优雅回退为宋版刻本横笺）
      list(d, api, base) {
        const items = arr(d.items).map(it => norm(it));
        const mode = d.mode || (items.some(it => it.ok != null) ? 'check' : 'bullet');
        const useScroll = canScrollVertical(items, api, d);

        if (!useScroll) {
          // 宋版横栏笺纸（16:9 用右竖题 + 左横笺，竖屏用宋式题签 + 乌丝横栏）
          if (api.land && (d.title || d.kicker)) {
            const split = api.add(api.root, 'div', 'rp-land-split');
            const left = api.add(split, 'div', 'rp-land-main');
            const ul = api.add(left, 'ul', 'list m-' + mode + ' n' + Math.max(1, Math.min(items.length, 9)));
            ul.style.setProperty('--cols', d.cols ?? (items.length >= 6 ? 2 : 1));
            items.forEach((it, i) => {
              const ok = it.ok != null ? !!it.ok : mode === 'check' ? true : mode === 'cross' ? false : undefined;
              const li = api.add(ul, 'li', 'item' + (ok === true ? ' ok' : ok === false ? ' no' : '') + (isHot(d, i, it) ? ' on' : ''));
              api.add(li, 'span', 'mk', api.marker(mode, i, ok));
              const tx = api.add(li, 'span', 'tx', api.rich(it.text ?? it.title));
              if (it.note) api.add(tx, 'span', 'nt', api.rich(it.note));
              const b = api.beat(li, 'item', it.at, { auto: it.text ?? it.title, spread: true, focus: focusOf(d, api) });
              api.marks(li, b);
            });
            api.note(left, d.note, d.noteAt);
            buildRightVHead(d, api, split);
            return;
          }
          base(d, api);
          return;
        }

        // 乌丝栏手卷竖列（从右往左展开！）
        api.sc.el.classList.add('rp-scroll-list');
        if (!api.land) {
          api.head();
        }
        const wrap = api.add(api.land ? api.root : api.body(), 'div', 'rp-wusilan-wrap');
        const cols = api.add(wrap, 'div', 'rp-wusilan n' + items.length);

        items.forEach((it, i) => {
          const ok = it.ok != null ? !!it.ok : mode === 'check' ? true : mode === 'cross' ? false : undefined;
          const col = api.add(cols, 'div', 'rp-wcol' + (ok === true ? ' ok' : ok === false ? ' no' : '') + (isHot(d, i, it) ? ' on' : ''));
          api.add(col, 'div', 'rp-wmk', api.marker(mode, i, ok));
          const tx = api.add(col, 'div', 'rp-wtx', vRich(it.text ?? it.title));
          if (it.note) api.add(col, 'div', 'rp-wnt', vRich(it.note));
          const b = api.beat(col, 'item', it.at, { auto: it.text ?? it.title, spread: true, focus: focusOf(d, api), kind: 'scrollUnroll', d: 0.8 });
          api.marks(col, b);
        });

        if (api.land) {
          buildRightVHead(d, api, wrap);
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // 7. 卡片：支持圆形「时令盘」(layout: "wheel") + 默认宋式册页签牌
      cards(d, api, base) {
        const items = arr(d.items).map(it => norm(it, 'title'));
        if (d.layout === 'wheel' && items.length >= 2 && items.length <= 6) {
          api.sc.el.classList.add('rp-wheel-scene');
          const centerText = d.centerLabel || (items.length === 4 ? '四时' : '时令');

          if (api.land) {
            const split = api.add(api.root, 'div', 'rp-land-split rp-wheel-land');
            const stageArea = api.add(split, 'div', 'rp-wheel-stage');
            const links = api.svg('svg', { class: 'links rp-wheel-links' });
            stageArea.appendChild(links);

            const half = Math.ceil(items.length / 2);
            const leftCol = api.add(stageArea, 'div', 'rp-wheel-col rp-wheel-col-l');
            const dialWrap = api.add(stageArea, 'div', 'rp-wheel-center', makeWheelDialSvg(centerText));
            const rightCol = api.add(stageArea, 'div', 'rp-wheel-col rp-wheel-col-r');
            api.beat(dialWrap, 'image', 0.1, { kind: 'inkRing', d: 0.95 });

            const cardEls = [];
            const beats = [];
            // 按古法顺时针/右起：前一半在右侧（春、夏），后一半在左侧（秋、冬）
            items.forEach((it, i) => {
              const parentCol = i < half ? rightCol : leftCol;
              const c = api.add(parentCol, 'div', 'rp-wcard' + (isHot(d, i, it) ? ' on' : '') + ` rp-s${i % 4}`);
              const k = it.tag ?? it.k ?? cnNum(i + 1);
              api.add(c, 'div', 'rp-wcard-k', api.rich(k));
              const tx = api.add(c, 'div', 'rp-wcard-tx');
              if (it.title) api.add(tx, 'div', 'rp-wcard-t', api.rich(it.title));
              if (it.text) api.add(tx, 'div', 'rp-wcard-x', api.rich(it.text));
              const b = api.beat(c, 'card', it.at, { auto: [it.tag, it.title ?? it.text], spread: true, focus: focusOf(d, api) });
              api.marks(tx, b);
              cardEls.push(c);
              beats.push(b);
            });

            api.layout(() => {
              links.innerHTML = '';
              const ctr = api.rel(dialWrap, stageArea);
              const R0 = Math.min(ctr.w, ctr.h) * 0.44;
              cardEls.forEach((cel, i) => {
                const cr = api.rel(cel, stageArea);
                const toRight = cr.cx > ctr.cx;
                const x2 = toRight ? cr.x - 6 : cr.r + 6;
                const y2 = cr.cy;
                const ang = Math.atan2(y2 - ctr.cy, x2 - ctr.cx);
                const x1 = ctr.cx + Math.cos(ang) * R0;
                const y1 = ctr.cy + Math.sin(ang) * R0;
                const p = api.svg('path', { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}` });
                links.appendChild(p);
                (beats[i].extra = beats[i].extra || []).push({ el: p, delay: -0.25 });
              });
            });

            buildRightVHead(d, api, split);
            api.note(api.root, d.note, d.noteAt);
            return;
          }

          // 竖屏（3:4 & 9:16）：上二卡 + 中央大圆形时令盘 + 下二卡 + 放射连线
          api.head();
          const body = api.body('rp-wheel-body');
          const links = api.svg('svg', { class: 'links rp-wheel-links' });
          body.appendChild(links);

          const half = Math.ceil(items.length / 2);
          const topRow = api.add(body, 'div', 'rp-wheel-row');
          const dialWrap = api.add(body, 'div', 'rp-wheel-center', makeWheelDialSvg(centerText));
          const botRow = api.add(body, 'div', 'rp-wheel-row');
          api.beat(dialWrap, 'image', 0.1, { kind: 'inkRing', d: 0.95 });

          const cardEls = [], beats = [];
          items.forEach((it, i) => {
            const row = i < half ? topRow : botRow;
            const c = api.add(row, 'div', 'rp-wcard' + (isHot(d, i, it) ? ' on' : '') + ` rp-s${i % 4}`);
            const k = it.tag ?? it.k ?? cnNum(i + 1);
            api.add(c, 'div', 'rp-wcard-k', api.rich(k));
            const tx = api.add(c, 'div', 'rp-wcard-tx');
            if (it.title) api.add(tx, 'div', 'rp-wcard-t', api.rich(it.title));
            if (it.text) api.add(tx, 'div', 'rp-wcard-x', api.rich(it.text));
            const b = api.beat(c, 'card', it.at, { auto: [it.tag, it.title ?? it.text], spread: true, focus: focusOf(d, api) });
            api.marks(tx, b);
            cardEls.push(c);
            beats.push(b);
          });

          api.layout(() => {
            links.innerHTML = '';
            const ctr = api.rel(dialWrap, body);
            const R0 = Math.min(ctr.w, ctr.h) * 0.44;
            cardEls.forEach((cel, i) => {
              const cr = api.rel(cel, body);
              const isTop = cr.cy < ctr.cy;
              const x2 = cr.cx;
              const y2 = isTop ? cr.b + 6 : cr.y - 6;
              const ang = Math.atan2(y2 - ctr.cy, x2 - ctr.cx);
              const x1 = ctr.cx + Math.cos(ang) * R0;
              const y1 = ctr.cy + Math.sin(ang) * R0;
              const p = api.svg('path', { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}` });
              links.appendChild(p);
              (beats[i].extra = beats[i].extra || []).push({ el: p, delay: -0.25 });
            });
          });

          api.note(api.root, d.note, d.noteAt);
          return;
        }

        // 默认宋式册页签牌（16:9 右竖题左签格）
        if (api.land && (d.title || d.kicker)) {
          const split = api.add(api.root, 'div', 'rp-land-split');
          const left = api.add(split, 'div', 'rp-land-main');
          const box = api.add(left, 'div', 'cards n' + Math.max(1, Math.min(items.length, 9)));
          const cols = d.cols || (items.length <= 3 ? items.length : 2);
          box.style.setProperty('--cols', cols);
          items.forEach((it, i) => {
            const c = api.add(box, 'div', 'card' + (isHot(d, i, it) ? ' on' : ''));
            const k = it.tag ?? it.k ?? it.icon ?? (d.index === false ? null : cnNum(i + 1));
            if (k != null && k !== '') api.add(c, 'div', 'card-k', it.icon ? api.icon(it.icon) || api.esc(it.icon) : api.rich(k));
            const tx = api.add(c, 'div', 'card-tx');
            if (it.title) api.add(tx, 'div', 'card-t', api.rich(it.title));
            if (it.text) api.add(tx, 'div', 'card-x', api.rich(it.text));
            const b = api.beat(c, 'card', it.at, { auto: it.tag != null ? [it.tag, it.title ?? it.text] : it.title ?? it.text, spread: true, focus: focusOf(d, api) });
            api.marks(tx, b);
          });
          api.note(left, d.note, d.noteAt);
          buildRightVHead(d, api, split);
          return;
        }
        base(d, api);
      },

      // 8. 数据卡：16:9 右竖题左册页格；简洁整数自动加中文数字淡墨印记
      stats(d, api, base) {
        const items = arr(d.items).map(it => norm(it, 'value'));
        const buildGrid = (parent) => {
          const box = api.add(parent, 'div', 'stats n' + Math.max(1, Math.min(items.length, 9)));
          const cols = d.cols || (api.land ? (items.length <= 3 ? items.length : 2) : (items.length <= 3 ? 1 : 2));
          if (cols === 1) box.classList.add('rows');
          box.style.setProperty('--cols', cols);
          items.forEach((it, i) => {
            const s = api.add(box, 'div', 'stat' + (isHot(d, i, it) ? ' on' : ''));
            const p = typeof it.value === 'number' || typeof it.value === 'string' ? api.parseNum(it.value) : null;
            if (p && !p.dec && !p.pre && !p.suf && p.num >= 1 && p.num <= 99 && Number.isInteger(p.num)) {
              api.add(s, 'span', 'rp-stat-cn', cnNum(p.num));
            }
            const v = api.add(s, 'div', 'stat-v');
            const { val } = api.num(v, it.value);
            if (it.unit) api.add(v, 'span', 'stat-u', api.rich(it.unit));
            api.fitBox(v);
            const tx = api.add(s, 'div', 'stat-tx');
            if (it.label) api.add(tx, 'div', 'stat-l', api.rich(it.label));
            if (it.note) api.add(tx, 'div', 'stat-n', api.rich(it.note));
            const b = api.beat(s, 'card', it.at, { auto: [it.label, it.value], spread: true, focus: focusOf(d, api), with: val ? [[val, 'count', 0.05]] : [] });
            api.marks(tx, b);
          });
        };

        if (api.land && (d.title || d.kicker)) {
          const split = api.add(api.root, 'div', 'rp-land-split');
          const left = api.add(split, 'div', 'rp-land-main');
          buildGrid(left);
          api.note(left, d.note, d.noteAt);
          buildRightVHead(d, api, split);
        } else {
          api.head();
          buildGrid(api.body());
          api.note(api.root, d.note, d.noteAt);
        }
      },

      // 9. 时间线：从右往左展开的手卷年表（长文字在竖屏优雅切为右纪年碑 + 左史事笺）
      timeline(d, api) {
        const items = arr(d.items).map(it => norm(it));
        const maxLen = Math.max(0, ...items.map(it => api.plain(it.text || '').length));
        const canVScroll = items.length >= 2 && items.length <= 4 && maxLen <= 16;

        // 16:9 横向长卷：从右往左展开！
        if (api.land) {
          api.sc.el.classList.add('rp-tl-scroll-land');
          const split = api.add(api.root, 'div', 'rp-land-split');
          const left = api.add(split, 'div', 'rp-land-main');
          const box = api.add(left, 'div', 'rp-tl-rtl n' + Math.max(1, Math.min(items.length, 9)));
          const links = api.svg('svg', { class: 'links' });
          box.appendChild(links);
          const beats = [], dots = [];
          items.forEach((it, i) => {
            const el = api.add(box, 'div', 'rp-tli' + (isHot(d, i, it) ? ' on' : ''));
            if (it.time != null) api.add(el, 'div', 'rp-tl-time', api.rich(it.time));
            dots.push(api.add(el, 'div', 'rp-tl-dot'));
            if (it.text) api.add(el, 'div', 'rp-tl-text', api.rich(it.text));
            const b = api.beat(el, 'item', it.at, { auto: [it.time, it.text], spread: true, focus: focusOf(d, api), kind: 'scrollUnroll', d: 0.75 });
            api.marks(el, b);
            beats.push(b);
          });
          api.layout(() => {
            links.innerHTML = '';
            for (let i = 0; i + 1 < dots.length; i++) {
              const a = api.rel(dots[i], box), c = api.rel(dots[i + 1], box);
              const ga = a.w / 2 + 8, gc = c.w / 2 + 8;
              const L = Math.hypot(c.cx - a.cx, c.cy - a.cy);
              if (L < ga + gc + 6) continue;
              const ux = (c.cx - a.cx) / L, uy = (c.cy - a.cy) / L;
              const p = api.svg('path', { d: api.link(a.cx + ux * ga, a.cy + uy * ga, c.cx - ux * gc, c.cy - uy * gc, i) });
              links.appendChild(p);
              (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.3 });
            }
          });
          api.note(left, d.note, d.noteAt);
          buildRightVHead(d, api, split);
          return;
        }

        // 竖屏：短条目走从右往左的手卷竖轴；长条目走「右朱砂纪年碑 + 左史事笺」
        api.head();
        if (canVScroll) {
          api.sc.el.classList.add('rp-tl-vscroll');
          const box = api.add(api.body(), 'div', 'rp-tl-vcols n' + items.length);
          const links = api.svg('svg', { class: 'links' });
          box.appendChild(links);
          const beats = [], dots = [];
          items.forEach((it, i) => {
            const el = api.add(box, 'div', 'rp-tl-vcol' + (isHot(d, i, it) ? ' on' : ''));
            dots.push(api.add(el, 'div', 'rp-tl-dot'));
            if (it.time != null) api.add(el, 'div', 'rp-tl-vtime', vRich(it.time));
            if (it.text) api.add(el, 'div', 'rp-tl-vtext', vRich(it.text));
            const b = api.beat(el, 'item', it.at, { auto: [it.time, it.text], spread: true, focus: focusOf(d, api), kind: 'scrollUnroll', d: 0.78 });
            api.marks(el, b);
            beats.push(b);
          });
          api.layout(() => {
            links.innerHTML = '';
            for (let i = 0; i + 1 < dots.length; i++) {
              const a = api.rel(dots[i], box), c = api.rel(dots[i + 1], box);
              const ga = a.w / 2 + 8, gc = c.w / 2 + 8;
              const L = Math.hypot(c.cx - a.cx, c.cy - a.cy);
              if (L < ga + gc + 6) continue;
              const ux = (c.cx - a.cx) / L, uy = (c.cy - a.cy) / L;
              const p = api.svg('path', { d: api.link(a.cx + ux * ga, a.cy + uy * ga, c.cx - ux * gc, c.cy - uy * gc, i) });
              links.appendChild(p);
              (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.3 });
            }
          });
          api.note(api.root, d.note, d.noteAt);
          return;
        }

        // 长文字竖屏时间线：右纪年碑 + 竖墨线 + 左史事笺
        const box = api.add(api.body(), 'div', 'rp-tl-stele n' + Math.max(1, Math.min(items.length, 9)));
        const links = api.svg('svg', { class: 'links' });
        box.appendChild(links);
        const beats = [], dots = [];
        items.forEach((it, i) => {
          const el = api.add(box, 'div', 'rp-stele-row' + (isHot(d, i, it) ? ' on' : ''));
          if (it.text) api.add(el, 'div', 'rp-stele-text', api.rich(it.text));
          dots.push(api.add(el, 'div', 'rp-tl-dot'));
          if (it.time != null) api.add(el, 'div', 'rp-stele-time', api.rich(it.time));
          const b = api.beat(el, 'item', it.at, { auto: [it.time, it.text], spread: true, focus: focusOf(d, api) });
          api.marks(el, b);
          beats.push(b);
        });
        api.layout(() => {
          links.innerHTML = '';
          for (let i = 0; i + 1 < dots.length; i++) {
            const a = api.rel(dots[i], box), c = api.rel(dots[i + 1], box);
            const ga = a.h / 2 + 8, gc = c.h / 2 + 8;
            const L = Math.hypot(c.cx - a.cx, c.cy - a.cy);
            if (L < ga + gc + 6) continue;
            const ux = (c.cx - a.cx) / L, uy = (c.cy - a.cy) / L;
            const p = api.svg('path', { d: api.link(a.cx + ux * ga, a.cy + uy * ga, c.cx - ux * gc, c.cy - uy * gc, i) });
            links.appendChild(p);
            (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.3 });
          }
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 10. 条形图：16:9 右竖题左墨条；竖屏宋式题签 + 乌丝刻度松烟墨条
      bars(d, api, base) {
        if (!api.land || (!d.title && !d.kicker)) {
          base(d, api);
          return;
        }
        const items = arr(d.items).map(it => norm(it, 'label'));
        const vals = items.map(it => Math.abs(parseFloat(String(it.value ?? 0).replace(/,/g, ''))) || 0);
        const log = d.scale === 'log';
        const f = v => (log ? Math.log10(Math.max(v, 1)) : v);
        const mx = d.max != null ? f(+d.max) : Math.max(...vals.map(f), 1e-9);
        const split = api.add(api.root, 'div', 'rp-land-split');
        const left = api.add(split, 'div', 'rp-land-main');
        const box = api.add(left, 'div', 'bars' + (log ? ' log' : '') + ' n' + Math.max(1, Math.min(items.length, 9)));
        items.forEach((it, i) => {
          const r = api.add(box, 'div', 'bar-row' + (isHot(d, i, it) ? ' on' : ''));
          api.add(r, 'div', 'bar-l', api.rich(it.label));
          const tr = api.add(r, 'div', 'bar-track');
          const fill = api.add(tr, 'div', 'bar-fill');
          fill.style.setProperty('--w', api.cl(f(vals[i]) / mx, 0.014, 1).toFixed(4));
          const v = api.add(tr, 'div', 'bar-v');
          const { val } = api.num(v, it.display ?? it.value);
          if (it.unit) api.add(v, 'span', 'bar-u', api.rich(it.unit));
          const w = [[fill, 'grow', 0.05]];
          if (val) w.push([val, 'count', 0.05, { d: 0.9 }]);
          const b = api.beat(r, 'bar', it.at, { auto: it.label, spread: true, focus: focusOf(d, api), with: w });
          api.marks(r, b);
        });
        api.note(left, d.note, d.noteAt);
        buildRightVHead(d, api, split);
      },

      // 11. 对比：册页左右对开折页 + 中缝朱印（16:9 右竖题 + 左对开，避免整页缩小）
      compare(d, api, base) {
        const d2 = d.vs == null ? Object.assign({}, d, { vs: '对' }) : d;
        if (!api.land || (!d.title && !d.kicker)) {
          base(d2, api);
          const vs0 = api.sc.el.querySelector('.vs');
          if (vs0) vs0.innerHTML = `<span class="rp-vs-seal">${api.esc(d2.vs)}</span>`;
          return;
        }
        const split = api.add(api.root, 'div', 'rp-land-split');
        const leftBox = api.add(split, 'div', 'rp-land-main');
        const g = api.add(leftBox, 'div', 'cmp n2');
        const side = (raw, cls) => {
          const s = norm(raw, 'label');
          const el = api.add(g, 'div', 'side ' + cls + (s.win ? ' win' : ''));
          const head = api.add(el, 'div', 'side-h');
          if (s.tag) api.add(head, 'div', 'side-k', api.rich(s.tag));
          if (s.label) api.add(head, 'div', 'side-l', api.rich(s.label));
          let val = null;
          if (s.value != null && s.value !== '') {
            const v = api.add(head, 'div', 'side-v');
            val = api.num(v, s.value).val;
            if (s.unit) api.add(v, 'span', 'side-u', api.rich(s.unit));
            api.fitBox(v);
          }
          const pts = [];
          if (s.points) {
            const ul = api.add(el, 'ul', 'side-p');
            arr(s.points).forEach(p => {
              const pp = norm(p);
              const ok = pp.ok;
              const li = api.add(ul, 'li', ok === false ? 'no' : ok === true ? 'ok' : '');
              api.add(li, 'span', 'mk', ok === false ? api.icon('cross') : ok === true ? api.icon('check') : '<i class="dotm"></i>');
              api.add(li, 'span', 'tx', api.rich(pp.text));
              pts.push({ li, pp });
            });
          }
          return { el, head, val, pts, s };
        };
        const L = side(d2.left || {}, 'left');
        const vs = api.add(g, 'div', 'vs', `<span class="rp-vs-seal">${api.esc(d2.vs)}</span>`);
        const Rt = side(d2.right || {}, 'right');
        const run = (S, key) => {
          const b = api.beat(S.el, 'card', S.s.at ?? key, { auto: S.s.label, with: S.val ? [[S.val, 'count', 0.05]] : [] });
          api.marks(S.head, b);
          S.pts.forEach(({ li, pp }) => { const b2 = api.beat(li, 'item', pp.at, { auto: pp.text, spread: true, gap: 0.3 }); api.marks(li, b2); });
          return b;
        };
        run(L, d2.leftAt);
        api.beat(vs, 'chip', d2.vsAt);
        const rb = run(Rt, d2.rightAt);
        const win = L.s.win ? L.el : Rt.s.win ? Rt.el : null;
        if (d2.verdict) {
          const v = api.add(leftBox, 'div', 'verdict', api.rich(d2.verdict));
          const b = api.beat(v, 'text', d2.verdictAt, { auto: d2.verdict, with: win ? [[win, 'mark', 0]] : [] });
          api.marks(v, b);
        } else if (win) (rb.opt.with = rb.opt.with || []).push([win, 'mark', 0.8]);
        buildRightVHead(d2, api, split);
      },

      // 12. 结尾：右侧竖排书法结语 + 左侧跋文、标签、署名 + 左下朱砂大印与孤舟远山
      ending(d, api) {
        const art = api.add(api.sc.el, 'div', 'rp-art rp-art-end', makeLandscapeSvg('ending', api.land));
        api.beat(art, 'image', 0.05, { kind: 'ink', d: 1.2 });

        const wrap = api.add(api.root, 'div', 'rp-end-grid');

        // 左侧：跋文 cta + 标签 + 署名 + 朱砂落款大印
        const left = api.add(wrap, 'div', 'rp-end-left');
        if (d.cta) {
          const c = api.add(left, 'div', 'cta rp-end-cta', api.rich(d.cta));
          const b = api.beat(c, 'text', d.ctaAt, { auto: d.cta });
          api.marks(c, b);
        }
        const tags = arr(d.tags ?? d.chips);
        if (tags.length) {
          const box = api.add(left, 'div', 'chips rp-end-tags');
          const els = tags.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), api.rich(c)));
          api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tags[0] });
        }
        const foot = api.add(left, 'div', 'rp-end-foot');
        const sealTxt = api.plain(api.story.seal || '岁时').replace(/[^\u4e00-\u9fa5A-Za-z]/g, '').slice(0, 4);
        const seal = makeSeal(api, foot, sealTxt || '终', 'rp-seal-end');
        if (seal) api.beat(seal, 'stamp', null, { last: true });
        const by = d.byline ?? api.story.byline;
        if (by) {
          api.beat(api.add(foot, 'div', 'meta byline rp-end-by', api.rich(by)), 'text', d.bylineAt);
        }

        // 右侧：竖排书法结语
        const right = api.add(wrap, 'div', 'rp-end-right');
        if (d.kicker) {
          const k = api.add(right, 'div', 'rp-vkicker', `<span>${vRich(d.kicker)}</span>`);
          api.beat(k, 'kicker', d.kickerAt);
        }
        if (d.title) {
          const tbox = api.add(right, 'h1', 'rp-vtitle rp-end-title');
          const maxC = api.land ? 8 : 10;
          const ls = splitVerticalLines(linesOf(d.title), maxC, d.titleSplit !== false);
          const els = ls.map(l => api.add(tbox, 'span', 'vln', vRich(l)));
          const b = api.beat(els, 'title', d.titleAt, { kind: 'brushDown', d: 1.0, stagger: 0.18 });
          els.forEach(e => api.marks(e, b));
          api.fitBox(tbox, { height: api.land ? 610 : api.rc === 'r916' ? 920 : 820, width: api.land ? 480 : 380, min: 0.45 });
        }
        const sub = d.sub ?? d.dek;
        if (sub) {
          const s = api.add(right, 'div', 'rp-vsub', vRich(sub));
          const b = api.beat(s, 'text', d.subAt);
          api.marks(s, b);
        }
      },
    },

    // 连线：微带手绘笔意的墨线 + 小箭锋
    link(x1, y1, x2, y2, o) {
      const L = Math.hypot(x2 - x1, y2 - y1);
      if (L < 6) return '';
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const bend = Math.min(8, L * 0.04) * (o.i % 2 ? 1 : -1);
      const nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
      const cx = mx + nx * bend, cy = my + ny * bend;
      return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)} ` + o.arrowHead(cx, cy, x2, y2, 10, 0.42);
    },
    badge(i) { return `<span>${cnNum(i + 1)}</span>`; },
    marker(mode, i) {
      if (mode === 'number') return `<b class="rp-cnmk">${cnNum(i + 1)}</b>`;
      return null;
    },
  });
})();
