/* 电影胶片 film
 * 概念：35mm 电影片头与幕后放映室
 * 标志性装置：双侧 35mm 胶片齿孔带（转场同步滚动）、2.39:1 宽银幕遮幅 + 24fps 时间码 HUD、
 *            Academy 倒计时片头准星、SVG 机械场记板（拍板动画）、放映机光束大数字、胶片帧格条形图、演职员表片尾
 */
(() => {
  'use strict';
  const { cl, lerp, EZ, pad2, esc, rich, plain } = MV.util;
  const arr = v => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
  const norm = (it, key = 'text') => (it == null ? {} : typeof it === 'object' ? it : { [key]: String(it) });
  const lines = v => arr(v).flatMap(s => String(s).split('\n')).filter(s => s.trim() !== '');
  const isHot = (d, i, it) => !!(it && it.on) || d.hot === i || (Array.isArray(d.hot) && d.hot.includes(i));
  const focusOf = (d, api) => d.focus ?? !!api.style.focus;
  const nc = n => ' n' + Math.max(1, Math.min(n, 9));

  // ───── 自定义动画 ─────
  // 场记板顶部拍板合拢：从张开 -24deg 迅速拍下至 0deg 并带机械微弹
  MV.kinds.clap = {
    f(el, p) {
      let deg;
      if (p <= 0) deg = -26;
      else if (p < 0.44) deg = -26 * (1 - EZ.i2(p / 0.44));
      else if (p < 0.68) deg = -5.5 * Math.sin(((p - 0.44) / 0.24) * Math.PI);
      else deg = 0;
      el.style.transform = `rotate(${deg.toFixed(2)}deg)`;
    },
  };
  // 倒计时片头雷达扫描臂
  MV.kinds.sweep = {
    f(el, p) {
      const e = EZ.o3(p);
      el.style.transform = `rotate(${(-120 + e * 158).toFixed(2)}deg)`;
      el.style.opacity = cl(p * 3).toFixed(4);
    },
  };
  // 放映机光束点亮
  MV.kinds.beam = {
    f(el, p) {
      const e = EZ.o3(p);
      el.style.opacity = e.toFixed(4);
      el.style.scale = `${(0.76 + 0.24 * e).toFixed(4)} 1`;
    },
  };
  // 片尾演职员表缓慢上浮
  MV.kinds.creditDrift = {
    f(el, p) {
      el.style.translate = `0 ${((1 - EZ.o2(p)) * 18).toFixed(2)}px`;
    },
  };

  // ───── 自定义转场：35mm 胶片向上推格（中间留出 3% 黑画幅分界线）─────
  MV.transitions.filmroll = {
    in: p => ({ translate: `0 ${((1 - EZ.io(p)) * 103).toFixed(3)}%` }),
    out: p => ({ translate: `0 ${(-EZ.io(p) * 103).toFixed(3)}%`, filter: `brightness(${(1 - 0.16 * EZ.io(p)).toFixed(4)})` }),
  };

  // ───── SVG 装置生成器 ─────
  // Academy 倒计时片头准星 SVG
  function leaderSvg(numStr) {
    let ticks = '';
    for (let a = 0; a < 360; a += 15) {
      const rad = (a * Math.PI) / 180;
      const major = a % 45 === 0;
      const r1 = major ? 82 : 88;
      const r2 = 96;
      const x1 = (110 + Math.cos(rad) * r1).toFixed(1);
      const y1 = (110 + Math.sin(rad) * r1).toFixed(1);
      const x2 = (110 + Math.cos(rad) * r2).toFixed(1);
      const y2 = (110 + Math.sin(rad) * r2).toFixed(1);
      ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${major ? '#E8A33D' : 'rgba(233,230,223,.28)'}" stroke-width="${major ? 2.2 : 1.2}"/>`;
    }
    return `
      <svg class="fl-leader-svg" viewBox="0 0 220 220" aria-hidden="true">
        <defs>
          <radialGradient id="flLGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#E8A33D" stop-opacity="0.16"/>
            <stop offset="70%" stop-color="#E8A33D" stop-opacity="0.03"/>
            <stop offset="100%" stop-color="#000" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="110" cy="110" r="106" fill="url(#flLGlow)"/>
        <circle cx="110" cy="110" r="96" fill="none" stroke="rgba(233,230,223,.32)" stroke-width="1.6"/>
        <circle cx="110" cy="110" r="76" fill="none" stroke="#E8A33D" stroke-opacity="0.55" stroke-width="2" stroke-dasharray="10 6"/>
        <circle cx="110" cy="110" r="62" fill="none" stroke="rgba(233,230,223,.22)" stroke-width="1.2"/>
        ${ticks}
        <line x1="6" y1="110" x2="214" y2="110" stroke="rgba(233,230,223,.24)" stroke-width="1.2"/>
        <line x1="110" y1="6" x2="110" y2="214" stroke="rgba(233,230,223,.24)" stroke-width="1.2"/>
        <g class="fl-sweep-arm" style="transform-origin:110px 110px">
          <path d="M110 110 L110 14 A96 96 0 0 1 178 42 Z" fill="rgba(232,163,61,.16)"/>
          <line x1="110" y1="110" x2="110" y2="12" stroke="#E8A33D" stroke-width="3" stroke-linecap="round"/>
          <circle cx="110" cy="110" r="4.5" fill="#E8A33D"/>
        </g>
        <text x="110" y="134" text-anchor="middle" class="fl-leader-num">${esc(numStr)}</text>
        <text x="110" y="69" text-anchor="middle" class="fl-leader-lbl">HEAD LEADER</text>
        <text x="110" y="159" text-anchor="middle" class="fl-leader-lbl">35MM · 24FPS</text>
      </svg>`;
  }

  // 场记板斜纹拍板 SVG（上可动臂 + 下固定条）
  function clapperSvg() {
    let topStripes = '';
    let botStripes = '';
    for (let i = -1; i < 8; i++) {
      const x = i * 96;
      const col = i % 2 === 0 ? '#E9E6DF' : '#E8A33D';
      topStripes += `<polygon points="${x},0 ${x + 48},0 ${x + 24},46 ${x - 24},46" fill="${col}"/>`;
      botStripes += `<polygon points="${x},0 ${x + 48},0 ${x + 72},44 ${x + 24},44" fill="${col}"/>`;
    }
    return `
      <div class="fl-clap-head">
        <div class="fl-clap-arm">
          <svg viewBox="0 0 720 46" preserveAspectRatio="none">
            <defs><clipPath id="flArmClip"><rect x="0" y="0" width="720" height="46" rx="5"/></clipPath></defs>
            <g clip-path="url(#flArmClip)">
              <rect width="720" height="46" fill="#141416"/>
              ${topStripes}
              <rect x="0" y="0" width="720" height="46" fill="none" stroke="rgba(233,230,223,.3)" stroke-width="2"/>
            </g>
          </svg>
        </div>
        <div class="fl-clap-base">
          <svg viewBox="0 0 720 44" preserveAspectRatio="none">
            <defs><clipPath id="flBaseClip"><rect x="0" y="0" width="720" height="44" rx="2"/></clipPath></defs>
            <g clip-path="url(#flBaseClip)">
              <rect width="720" height="44" fill="#141416"/>
              ${botStripes}
            </g>
          </svg>
        </div>
        <div class="fl-clap-hinge" aria-hidden="true"><i></i><i></i><i></i></div>
      </div>`;
  }

  // 35mm 单侧胶片齿孔 SVG（可无缝滚动）
  function sprocketStripSvg(side, railW, totalH, pitch) {
    const holeW = Math.round(railW * 0.48);
    const holeH = Math.round(pitch * 0.52);
    const hx = Math.round((railW - holeW) / 2);
    const count = Math.ceil(totalH / pitch) + 2;
    let holes = '';
    let codes = '';
    for (let i = 0; i < count; i++) {
      const y = i * pitch + Math.round((pitch - holeH) / 2);
      holes += `<rect x="${hx}" y="${y}" width="${holeW}" height="${holeH}" rx="4" fill="#23211E" stroke="rgba(232,163,61,.40)" stroke-width="1.4"/>`;
      // 每 4 齿（1 格 35mm）印一次片边码与箭头
      if (i % 4 === 1) {
        const frameNo = 20 + Math.floor(i / 4);
        const cy = y + holeH / 2;
        const tx = side === 'l' ? railW - 6 : 6;
        const label = side === 'l' ? `${frameNo}A ▶` : `35MM · ${frameNo}`;
        codes += `<text x="${tx}" y="${cy}" transform="rotate(${side === 'l' ? -90 : 90} ${tx} ${cy})" text-anchor="middle" fill="rgba(232,163,61,.56)" font-family="MV Mono, monospace" font-size="10" letter-spacing="1.2">${label}</text>`;
      }
    }
    const edgeX = side === 'l' ? railW - 1 : 1;
    return `<svg width="${railW}" height="${count * pitch}" viewBox="0 0 ${railW} ${count * pitch}" aria-hidden="true">
      <rect width="${railW}" height="${count * pitch}" fill="#060607"/>
      <line x1="${edgeX}" y1="0" x2="${edgeX}" y2="${count * pitch}" stroke="rgba(232,163,61,.22)" stroke-width="1.5"/>
      ${holes}
      ${codes}
    </svg>`;
  }

  // SMPTE 24fps 时间码格式化
  function smpte(t) {
    const fps = 24;
    const total = Math.max(0, Math.floor(t * fps));
    const ff = total % fps;
    const ss = Math.floor(total / fps) % 60;
    const mm = Math.floor(total / (fps * 60)) % 60;
    const hh = Math.floor(total / (fps * 3600));
    return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}:${pad2(ff)}`;
  }

  // 齿孔与放映机闪烁全局引用（由 chrome 创建，tick 更新）
  let RAIL_L = null, RAIL_R = null, FLICK_EL = null, PITCH = 56, FRAME_STEP = 560;
  const TRN_DUR = 0.55, TRN_ALIGN = 0.5;

  MV.style({
    transition: { kind: 'filmroll', dur: TRN_DUR, align: TRN_ALIGN },
    motion: {
      kicker: { kind: 'fade', d: 0.45, gap: 0 },
      title: { kind: 'blur', d: 0.68, stagger: 0.09, gap: 0.12, o: { r: 6 } },
      big: { kind: 'blur', d: 0.72, stagger: 0.12, gap: 0.12, o: { r: 8 } },
      text: { kind: 'fade', d: 0.55, gap: 0.3 },
      item: { kind: 'rise', d: 0.48, stagger: 0.06, gap: 0.36, o: { dist: 22 } },
      card: { kind: 'rise', d: 0.52, stagger: 0.07, gap: 0.34, o: { dist: 24 } },
      chip: { kind: 'fade', d: 0.4, stagger: 0.06, gap: 0.22 },
      image: { kind: 'blur', d: 0.7, gap: 0.25, o: { r: 7 } },
      bar: { kind: 'fade', d: 0.32, gap: 0.32 },
      grow: { kind: 'grow', d: 0.85 },
      note: { kind: 'fade', d: 0.55, gap: 0.35 },
      quote: { kind: 'blur', d: 0.82, stagger: 0.18, gap: 0.2, o: { r: 5 } },
      stamp: { kind: 'stamp', d: 0.46, gap: 0.28 },
    },
    focus: true,
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'plain',
    kenBurns: 0.045,
    quoteMark: '',

    // 配色与转场：全片深色影院基底；封面→正文、进入片尾用黑场叠化
    look(d, i, o) {
      const t = o.sc.t;
      const res = { tone: 'dark' };
      if (i === 1 || t === 'ending') res.trans = 'fade';
      if (t === 'cover' || t === 'chapter' || t === 'statement' || t === 'bignum' || t === 'quote' || t === 'ending') {
        res.cls = 'fl-hero';
      }
      return res;
    },

    // 底纸：暗房深黑 + 中央暖钨丝银幕光晕 + 极细光学暗角
    paint(g, W, H, R, u) {
      g.fillStyle = '#0B0B0C';
      g.fillRect(0, 0, W, H);
      // 放映画幅中心微弱暖光
      const cx = W * 0.5, cy = u.land ? H * 0.48 : H * 0.45;
      const rad = Math.max(W, H) * 0.62;
      const rg = g.createRadialGradient(cx, cy, 20, cx, cy, rad);
      rg.addColorStop(0, 'rgba(42, 36, 28, 0.72)');
      rg.addColorStop(0.5, 'rgba(20, 18, 16, 0.45)');
      rg.addColorStop(1, 'rgba(7, 7, 8, 0.96)');
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);

      // 细微水平胶片扫描纹理
      g.fillStyle = 'rgba(233, 230, 223, 0.012)';
      for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 1);

      u.noise(5, 24, true);
    },

    // 上层纹理（CSS 覆盖为 mix-blend-mode: screen）：银盐胶片颗粒 + 极淡竖向放映划痕
    overlay(g, W, H, R) {
      g.clearRect(0, 0, W, H);
      // 银盐亮点颗粒（一次画好，零逐帧开销）
      const grainN = Math.round((W * H) / 260);
      for (let i = 0; i < grainN; i++) {
        const x = R() * W, y = R() * H;
        const a = 0.03 + R() * 0.11;
        const sz = R() < 0.85 ? 1.2 : 2.1;
        g.fillStyle = R() < 0.72 ? `rgba(233,230,223,${a.toFixed(3)})` : `rgba(232,163,61,${(a * 0.85).toFixed(3)})`;
        g.fillRect(x, y, sz, sz);
      }
      // 几道极细竖向胶片微划痕
      for (let i = 0; i < 9; i++) {
        const x = W * (0.08 + R() * 0.84);
        const y0 = R() * H * 0.35;
        const len = H * (0.25 + R() * 0.55);
        g.strokeStyle = `rgba(233,230,223,${(0.025 + R() * 0.045).toFixed(3)})`;
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(x, y0);
        g.lineTo(x + (R() - 0.5) * 2, y0 + len);
        g.stroke();
      }
    },

    // 全局电影放映门 Chrome：左右 35mm 齿孔带 + 上下遮幅黑边 + REC/时间码 HUD + 取景角标 + 胶片卷进度条
    chrome(c) {
      const railW = c.land ? 64 : c.rc === 'r916' ? 52 : 54;
      PITCH = c.land ? 60 : 56;
      // 每次胶片滚动步进为齿距整数倍，保证无缝循环
      FRAME_STEP = Math.round((c.H * 0.65) / PITCH) * PITCH;
      const stripH = c.H + PITCH * 4;

      const railL = c.h('div', 'fl-rail fl-rail-l');
      const trackL = c.h('div', 'fl-rail-track', sprocketStripSvg('l', railW, stripH, PITCH));
      railL.appendChild(trackL);

      const railR = c.h('div', 'fl-rail fl-rail-r');
      const trackR = c.h('div', 'fl-rail-track', sprocketStripSvg('r', railW, stripH, PITCH));
      railR.appendChild(trackR);

      RAIL_L = trackL;
      RAIL_R = trackR;

      // 顶部黑边遮幅 HUD
      const topBar = c.h('div', 'fl-top');
      const topL = c.h('div', 'fl-top-l');
      const rec = c.h('span', 'fl-rec', '<i class="fl-rec-dot"></i><b>REC</b>');
      const spec = c.h('span', 'fl-spec', '35MM · 24FPS · 2.39:1');
      const ser = c.h('span', 'fl-ser', c.esc(c.plain(c.story.series || c.story.title || '')));
      topL.append(rec, spec, ser);

      const topR = c.h('div', 'fl-top-r');
      const tc = c.h('span', 'fl-tc', '00:00:00:00');
      const reel = c.h('span', 'fl-reel', 'SC 01/01');
      topR.append(tc, reel);
      topBar.append(topL, topR);

      // 底部黑边遮幅（承托字幕 + 胶片卷进度）
      const botBar = c.h('div', 'fl-bot');
      const foot = c.h('div', 'fl-foot');
      const by = c.h('span', 'fl-by', c.esc(c.plain(c.story.byline || '')));
      const progWrap = c.h('div', 'fl-prog');
      const progTrack = c.h('div', 'fl-prog-track');
      const progFill = c.h('i', 'fl-prog-fill');
      progTrack.appendChild(progFill);
      const secEl = c.h('span', 'fl-sec', '');
      progWrap.append(progTrack, secEl);
      const fpsTag = c.h('span', 'fl-fps', '24 FPS');
      foot.append(by, progWrap, fpsTag);
      botBar.appendChild(foot);

      // 取景框四角括号（标注活跃放映画幅）
      const vf = c.h('div', 'fl-vf', '<i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i><b class="tick-t"></b><b class="tick-b"></b>');

      // 放映机闪烁层（纯 opacity 驱动）
      const flick = c.h('div', 'fl-flick');
      FLICK_EL = flick;

      c.el.append(flick, topBar, botBar, railL, railR, vf);
      const recDot = rec.querySelector('.fl-rec-dot');
      let lastI = -2;

      return info => {
        if (info.i !== lastI) {
          lastI = info.i;
          reel.textContent = info.cover ? `REEL 01 · ${info.total}` : `SC ${info.page}/${info.total}`;
          secEl.textContent = info.cover ? 'HEAD LEADER' : (info.section || 'MAIN REEL');
        }
        tc.textContent = smpte(info.t);
        const pulse = info.cover ? 1 : 0.32 + 0.68 * (0.5 + 0.5 * Math.cos(info.t * Math.PI * 2));
        recDot.style.opacity = pulse.toFixed(3);
        progFill.style.scale = `${c.cl(info.progress).toFixed(4)} 1`;
      };
    },

    // 每帧确定性更新：同步齿孔滚动 + 24fps 放映机亮度微闪
    tick(t, o) {
      if (RAIL_L && RAIL_R) {
        const scenes = MV._scenes || [];
        let scroll = 0;
        if (!o.cover) {
          for (let i = 1; i < scenes.length; i++) {
            const sc = scenes[i];
            const kind = (sc.d && sc.d.trans) || sc.trans || 'filmroll';
            if (kind !== 'filmroll') continue;
            const t0 = sc.s - TRN_DUR * TRN_ALIGN;
            if (t <= t0) break;
            const p = cl((t - t0) / TRN_DUR);
            scroll += EZ.io(p) * FRAME_STEP;
          }
        }
        const offset = -((scroll % PITCH) + PITCH);
        const tr = `0 ${offset.toFixed(2)}px`;
        RAIL_L.style.translate = tr;
        RAIL_R.style.translate = tr;
      }
      if (FLICK_EL) {
        const fIdx = Math.floor(t * 24);
        const wave = o.cover ? 0 : (0.5 + 0.5 * Math.sin(fIdx * 12.9898 + 1.3) * Math.cos(fIdx * 4.1414)) * 0.055;
        FLICK_EL.style.opacity = wave.toFixed(4);
      }
    },

    // 剪辑线箭头
    link(x1, y1, x2, y2, o) {
      return o.dash(x1, y1, x2, y2, 10, 7) + ' ' + o.arrowHead(x1, y1, x2, y2, 13, 0.52);
    },

    // 分镜表编号 / 光圈标记
    marker(mode, i, ok) {
      if (mode === 'number') return `<b class="fl-sh">SH-${pad2(i + 1)}</b>`;
      if (ok === true || ok === false) return null;
      return '<i class="fl-ap"></i>';
    },

    badge(i) {
      return pad2(i + 1);
    },

    // ───── 风格专属模板重写 ─────
    templates: {
      // 1. 封面：倒计时片头准星 + 2.39:1 宽银幕标题卡 + 影院演职员标签
      cover(d, api) {
        const split = d.layout === 'split' || api.land;
        api.root.classList.add('center', 'fl-cover', split ? 'fl-cover-split' : 'fl-cover-cinema');

        const stageBox = api.add(api.root, 'div', 'fl-cov-stage');

        // 视觉主装置：若有封面图用宽银幕相框，否则用 Academy 倒计时片头准星
        if (d.image) {
          const mediaWrap = api.add(stageBox, 'div', 'fl-cov-visual');
          api.media(d.image, { parent: mediaWrap, frame: d.frame, at: d.imageAt, kb: d.kb, cap: d.cap, title: d.windowTitle });
        } else {
          const leaderWrap = api.add(stageBox, 'div', 'fl-cov-leader');
          const numStr = d.leaderNum != null ? String(d.leaderNum) : '3';
          leaderWrap.innerHTML = leaderSvg(numStr);
          api.beat(leaderWrap, 'kicker', d.kickerAt, { d: 0.55 });
          const arm = leaderWrap.querySelector('.fl-sweep-arm');
          if (arm) api.track(arm, 'sweep', 0.12, 1.15);
        }

        // 2.39:1 宽银幕片头字幕卡
        const card = api.add(stageBox, 'div', 'fl-title-card');
        api.add(card, 'div', 'fl-tc-bar', '<span>ANAMORPHIC · 2.39:1</span><span>35MM SOUND PRINT</span>');
        const head = api.add(card, 'div', 'fl-tc-body');
        if (d.kicker) {
          const ke = api.add(head, 'div', 'kicker', `<span class="kt">${rich(d.kicker)}</span>`);
          api.beat(ke, 'kicker', d.kickerAt);
        }
        if (d.title) {
          const h1 = api.add(head, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const b = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = b;
          api.marks(h1, b);
          api.fitTitle(h1);
        }
        api.add(head, 'div', 'fl-tc-rule');
        const sub = d.sub ?? d.dek;
        if (sub) {
          const se = api.add(head, 'div', 'dek', rich(sub));
          const sb = api.beat(se, 'text', d.subAt);
          api.marks(se, sb);
        }

        // 底部影院演职员标签栏
        const bill = api.add(api.root, 'div', 'fl-billing');
        const tagList = arr(d.tags ?? d.chips);
        if (tagList.length) {
          const box = api.add(bill, 'div', 'chips');
          const els = tagList.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
          api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tagList[0] });
        }
        const metaText = d.meta || 'PRODUCTION · 24 FRAMES PER SECOND · ALL RIGHTS RESERVED';
        const me = api.add(bill, 'div', 'meta fl-bill-meta', rich(metaText));
        api.beat(me, 'text', d.metaAt);
      },

      // 2. 章节页：SVG 机械场记板 + 拍板合拢动画
      chapter(d, api) {
        api.root.classList.add('center', 'fl-chapter');
        const n = d.num ?? pad2(api.sc.chapNo || 1);
        const slate = api.add(api.root, 'div', 'fl-slate');
        slate.innerHTML = clapperSvg();
        const body = api.add(slate, 'div', 'fl-slate-body');

        // 场记板顶格：SCENE / TAKE / ROLL / FPS
        const prod = plain(api.story.series || api.story.title || 'FEATURE FILM').slice(0, 18);
        const grid = api.add(body, 'div', 'fl-slate-grid');
        grid.innerHTML = `
          <div class="fl-sg-cell fl-sg-sc"><small>SCENE</small><b>${n === false || n === '' ? '--' : esc(n)}</b></div>
          <div class="fl-sg-cell"><small>TAKE</small><b>01</b></div>
          <div class="fl-sg-cell"><small>ROLL</small><b>A${pad2(api.sc.chapNo || 1)}</b></div>
          <div class="fl-sg-cell"><small>FPS</small><b>24</b></div>`;

        const main = api.add(body, 'div', 'fl-slate-main');
        if (d.kicker) {
          api.beat(api.add(main, 'div', 'kicker', `<span class="kt">${rich(d.kicker)}</span>`), 'kicker', d.kickerAt);
        }
        if (d.title) {
          const h1 = api.add(main, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const b = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = b;
          api.marks(h1, b);
          api.fitTitle(h1);
        }

        const foot = api.add(body, 'div', 'fl-slate-foot');
        const noteBox = api.add(foot, 'div', 'fl-sf-l');
        api.add(noteBox, 'small', '', 'DIRECTOR NOTE');
        if (d.note) {
          const ne = api.add(noteBox, 'div', 'note fl-sf-note', rich(d.note));
          const nb = api.beat(ne, 'note', d.noteAt, { auto: d.note });
          api.marks(ne, nb);
        } else {
          api.add(noteBox, 'div', 'note fl-sf-note', esc(prod));
        }
        const prodBox = api.add(foot, 'div', 'fl-sf-r', `<small>PROD.</small><span>${esc(prod)}</span>`);
        foot.appendChild(prodBox);

        // 场记板整体出场 + 拍板合拢自定义动画
        api.beat(slate, 'card', d.numAt, { d: 0.45 });
        const arm = slate.querySelector('.fl-clap-arm');
        if (arm) api.track(arm, 'clap', 0.22, 0.58);
      },

      // 3. 大数字：放映机锥形光束 + 银幕准星大号数字
      bignum(d, api) {
        api.root.classList.add('center', 'fl-bignum');
        const beam = api.add(api.sc.el, 'div', 'fl-beam');
        api.track(beam, 'beam', 0.08, 0.9);

        api.head();
        const stage = api.add(api.root, 'div', 'fl-bn-stage');
        api.add(stage, 'div', 'fl-bn-reticle', '<i></i><i></i>');
        const bn = api.add(stage, 'div', 'bn');
        const row = api.add(bn, 'div', 'bn-row');
        const v = d.value ?? d.num;
        const { val } = api.num(row, v);
        if (d.unit) api.add(row, 'span', 'bn-u', rich(d.unit));
        api.fitBox(row);
        api.beat(row, 'big', d.valueAt, { auto: d.value != null ? String(d.value) : null, with: val ? [[val, 'count', 0]] : [] });
        api.add(bn, 'div', 'fl-bn-rule');
        if (d.label) {
          const l = api.add(bn, 'div', 'bn-l', rich(d.label));
          const b = api.beat(l, 'text', d.labelAt, { auto: d.label });
          api.marks(l, b);
        }
        api.note(api.root, d.note, d.noteAt);
      },

      // 4. 一句话：默片/影院双线字幕卡
      statement(d, api) {
        api.root.classList.add('center', 'fl-statement');
        const card = api.add(api.root, 'div', 'fl-intertitle');
        api.add(card, 'span', 'fl-it-tag', 'INTERTITLE · 2.39:1');
        api.head({ parent: card });
        const ls = lines(d.text ?? d.lines);
        if (ls.length) {
          const box = api.add(card, 'div', 'say');
          ls.forEach((l, i) => {
            const e = api.add(box, 'div', 'sl', rich(l));
            const b = api.beat(e, 'big', i === 0 ? d.textAt : null, { auto: l, gap: 0.16 });
            api.marks(e, b);
          });
        }
        api.note(card, d.note, d.noteAt);
      },

      // 5. 条形图：35mm 胶片帧格条形图
      bars(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it, 'label'));
        const vals = items.map(it => Math.abs(parseFloat(String(it.value ?? 0).replace(/,/g, ''))) || 0);
        const log = d.scale === 'log';
        const f = v => (log ? Math.log10(Math.max(v, 1)) : v);
        const mx = d.max != null ? f(+d.max) : Math.max(...vals.map(f), 1e-9);
        const box = api.add(api.body(), 'div', 'bars fl-bars' + (log ? ' log' : '') + nc(items.length));
        items.forEach((it, i) => {
          const hot = isHot(d, i, it);
          const r = api.add(box, 'div', 'bar-row fl-bar-row' + (hot ? ' on' : ''));
          const hd = api.add(r, 'div', 'fl-bar-hd');
          api.add(hd, 'div', 'bar-l', `<i class="fl-bar-idx">F${pad2(i + 1)}</i><span>${rich(it.label)}</span>`);
          const v = api.add(hd, 'div', 'bar-v');
          const { val } = api.num(v, it.display ?? it.value);
          if (it.unit) api.add(v, 'span', 'bar-u', rich(it.unit));

          const tr = api.add(r, 'div', 'bar-track fl-bar-track');
          const fill = api.add(tr, 'div', 'bar-fill fl-bar-fill');
          fill.style.setProperty('--w', cl(f(vals[i]) / mx, 0.04, 1).toFixed(4));
          const w = [[fill, 'grow', 0.05]];
          if (val) w.push([val, 'count', 0.05, { d: 0.9 }]);
          const b = api.beat(r, 'bar', it.at, { auto: it.label, spread: true, focus: focusOf(d, api), with: w });
          api.marks(r, b);
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 6. 时间线：35mm 剪辑台胶片卷
      timeline(d, api) {
        api.head();
        const items = arr(d.items).map(it => norm(it));
        const row = d.dir ? d.dir === 'row' : api.land && items.length <= 5;
        const box = api.add(api.body(), 'div', 'tl fl-tl ' + (row ? 'row' : 'col') + nc(items.length));
        const links = api.svg('svg', { class: 'links' });
        box.appendChild(links);
        const beats = [], dots = [];
        items.forEach((it, i) => {
          const el = api.add(box, 'div', 'tl-item fl-tl-item' + (isHot(d, i, it) ? ' on' : ''));
          dots.push(api.add(el, 'div', 'tl-dot'));
          const cell = api.add(el, 'div', 'fl-tl-cell');
          const head = api.add(cell, 'div', 'fl-tl-hd');
          api.add(head, 'span', 'fl-tl-fr', `FR ${pad2(i + 1)}`);
          if (it.time != null) api.add(head, 'div', 'tl-time', rich(it.time));
          if (it.text) api.add(cell, 'div', 'tl-text', rich(it.text));
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
            if (L < ga + gc + 6) continue;
            const ux = (c.cx - a.cx) / L, uy = (c.cy - a.cy) / L;
            const p = api.svg('path', { d: api.link(a.cx + ux * ga, a.cy + uy * ga, c.cx - ux * gc, c.cy - uy * gc, i) });
            links.appendChild(p);
            (beats[i + 1].extra = beats[i + 1].extra || []).push({ el: p, delay: -0.32 });
          }
        });
        api.note(api.root, d.note, d.noteAt);
      },

      // 7. 结尾页：影院演职员表片尾
      ending(d, api) {
        api.root.classList.add('center', 'fl-ending');
        const roll = api.add(api.root, 'div', 'fl-credits');
        const fin = api.add(roll, 'div', 'fl-fin', `<span class="fl-fin-line"></span><em>${rich(d.kicker || 'FIN · END OF REEL')}</em><span class="fl-fin-line"></span>`);
        api.beat(fin, 'kicker', d.kickerAt);

        if (d.title) {
          const h1 = api.add(roll, 'h1', 'title xl');
          String(d.title).split('\n').forEach(l => {
            const ln = api.add(h1, 'span', 'ln', rich(l));
            ln.dataset.src = l;
          });
          const b = api.beat([...h1.children], 'title', d.titleAt);
          h1._beat = b;
          api.marks(h1, b);
          api.fitTitle(h1);
        }
        const sub = d.sub ?? d.dek;
        if (sub) {
          const se = api.add(roll, 'div', 'dek', rich(sub));
          api.marks(se, api.beat(se, 'text', d.subAt));
        }

        const tagList = arr(d.tags ?? d.chips);
        if (tagList.length) {
          const box = api.add(roll, 'div', 'chips fl-cred-tags');
          const els = tagList.map((c, i) => api.add(box, 'span', 'chip' + (isHot(d, i) ? ' hot' : ''), rich(c)));
          api.beat(els, 'chip', d.tagsAt ?? d.chipsAt, { auto: tagList[0] });
        }

        if (d.cta) {
          const c = api.add(roll, 'div', 'cta fl-cred-cta', rich(d.cta));
          const b = api.beat(c, 'text', d.ctaAt, { auto: d.cta });
          api.marks(c, b);
        }

        const by = d.byline ?? api.story.byline;
        const credFoot = api.add(roll, 'div', 'fl-cred-foot');
        if (by) {
          const row = api.add(credFoot, 'div', 'fl-cred-row', `<small>PRODUCED BY</small><b>${rich(by)}</b>`);
          api.beat(row, 'text', d.bylineAt);
        }
        api.add(credFoot, 'div', 'fl-cred-spec', '35MM ANAMORPHIC · 24 FPS · DOLBY OPTICAL');
        api.track(roll, 'creditDrift', 0, Math.max(2.5, api.sc.dur * 0.85));
      },
    },

    // 为沿用默认骨架的模板注入影院监视器眉标
    decorate(sc, api) {
      if (sc.t === 'stats') {
        sc.content.querySelectorAll('.stat').forEach((el, i) => {
          const bar = api.h('div', 'fl-mon-bar', `<span>CH.${pad2(i + 1)}</span><i></i>`);
          el.prepend(bar);
        });
      } else if (sc.t === 'compare') {
        sc.content.querySelectorAll('.side').forEach((el, i) => {
          if (!el.querySelector('.side-k')) {
            const hd = el.querySelector('.side-h');
            if (hd) hd.prepend(api.h('div', 'side-k', i === 0 ? 'REEL A' : 'REEL B'));
          }
        });
      } else if (sc.t === 'image') {
        sc.content.querySelectorAll('.frame.f-plain').forEach(fr => {
          fr.prepend(api.h('div', 'fl-frame-bar', '<span>35MM STILL · GATE</span><em>2.39:1</em>'));
        });
      } else if (sc.t === 'quote') {
        const qt = sc.content.querySelector('.qt');
        if (qt) qt.prepend(api.h('div', 'fl-q-eyebrow', 'DIALOGUE · QUOTE'));
      }
    },
  });
})();
