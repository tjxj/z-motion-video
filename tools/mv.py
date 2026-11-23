#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""z-motion-video 命令行（MIT）

  python3 tools/mv.py check                                  检查环境（Playwright / Chromium / ffmpeg / 字体）
  python3 tools/mv.py styles                                 列出全部风格
  python3 tools/mv.py new <项目目录> [--example leap-year]    新建项目（复制示例 story.json）
  python3 tools/mv.py fonts [--style S | --all]              预下载字体到本机缓存
  python3 tools/mv.py tts <项目> [--engine say|edge]          逐句合成配音（可选）
  python3 tools/mv.py timing <项目> [--estimate | --lines DIR | --audio FILE | --words JSON --voice FILE]
  python3 tools/mv.py build <项目> [--style S] [--ratio 3:4|9:16|16:9|all]
  python3 tools/mv.py snap <项目> [--style S] [--ratio R] [--at 3.5,8]
  python3 tools/mv.py compare <项目> [--ratio R] [--styles a,b,c] [--scene N]
  python3 tools/mv.py render <项目> [--style S] [--ratio R] [--workers 6] [--fps 30] [--bgm music.mp3]
  python3 tools/mv.py verify <项目> [--style S] [--ratio R]
  python3 tools/mv.py preview <项目> [--style S] [--ratio R]

项目目录：story.json（必需）、assets/（图片）、audio/voice.wav（配音）、timing.json（自动生成）、
custom.css / custom.js（可选），产物在 build/ 和 out/。
"""
from __future__ import annotations

import argparse
import difflib
import functools
import hashlib
import html
import http.server
import json
import os
import re
import shutil
import socketserver
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request
import wave
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
ENGINE = SKILL / 'engine'
STYLES = SKILL / 'styles'
VENDOR = SKILL / 'vendor'
EXAMPLES = SKILL / 'examples'
CACHE = Path(os.environ.get('MV_CACHE') or (Path.home() / '.cache' / 'z-motion-video'))
FONT_DIR = CACHE / 'fonts'
RATIOS = {'3:4': (1080, 1440), '9:16': (1080, 1920), '16:9': (1920, 1080)}
RTAG = {'3:4': '3x4', '9:16': '9x16', '16:9': '16x9'}
CHROME_ARGS = ['--allow-file-access-from-files', '--font-render-hinting=none', '--force-color-profile=srgb', '--disable-gpu']
ENC = ['-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int',
       '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-tune', 'animation', '-pix_fmt', 'yuv420p',
       '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
REGISTRIES = ['https://registry.npmmirror.com', 'https://registry.npmjs.org']
SR = 48000

# 字体：风格只写 key，这里决定用哪个文件。优先用本机已装的同款字体，没有就下载 Fontsource / npm 上的开源字体（OFL）
FONTS = {
    'serif': dict(family='MV Serif', pkg='@fontsource-variable/noto-serif-sc', ver='5.3.1', css=['wght.css'], weights=['400', '700', '900'],
                  local=[('SourceHanSerifSC-VF.ttf', '250 900'), ('SourceHanSerifSC-VF.otf', '250 900')]),
    'sans': dict(family='MV Sans', pkg='@fontsource-variable/noto-sans-sc', ver='5.3.1', css=['wght.css'], weights=['400', '700', '900'],
                 local=[('SourceHanSansSC-VF.ttf', '250 900'), ('SourceHanSansSC-VF.otf', '250 900')]),
    'hand': dict(family='MV Hand', pkg='lxgw-wenkai-webfont', ver='1.7.0', css=['lxgwwenkai-regular.css', 'lxgwwenkai-bold.css'], weights=['400', '700'],
                 local=[('LXGWWenKai-Regular.ttf', '400'), ('LXGWWenKai-Medium.ttf', '700')]),
    'mono': dict(family='MV Mono', pkg='@fontsource-variable/jetbrains-mono', ver='5.3.0', css=['wght.css'], weights=['400', '700']),
    'cond': dict(family='MV Cond', pkg='@fontsource-variable/oswald', ver='5.3.0', css=['wght.css'], weights=['500', '700']),
    'ital': dict(family='MV Ital', pkg='@fontsource/instrument-serif', ver='5.3.0', css=['400.css', '400-italic.css'], weights=['400'], styles=['normal', 'italic']),
    'grot': dict(family='MV Grot', pkg='@fontsource-variable/inter', ver='5.3.0', css=['wght.css'], weights=['400', '700', '900']),
    'type': dict(family='MV Type', pkg='@fontsource/courier-prime', ver='5.3.0', css=['400.css', '700.css'], weights=['400', '700']),
}
LOCAL_FONT_DIRS = [Path.home() / 'Library/Fonts', Path('/Library/Fonts'), Path('/System/Library/Fonts/Supplemental'),
                   Path.home() / '.local/share/fonts', Path.home() / '.fonts', Path('/usr/share/fonts'), Path('/usr/local/share/fonts'),
                   Path('C:/Windows/Fonts'), Path(os.environ.get('LOCALAPPDATA', '/nonexistent')) / 'Microsoft/Windows/Fonts']


def die(msg: str, code: int = 1):
    print(f'✗ {msg}', file=sys.stderr)
    sys.exit(code)


def ok(msg: str):
    print(f'✓ {msg}', flush=True)


def info(msg: str):
    print(f'· {msg}', flush=True)


def ffmpeg_bin(name='ffmpeg') -> str:
    p = shutil.which(name) or (f'/opt/homebrew/bin/{name}' if Path(f'/opt/homebrew/bin/{name}').exists() else None)
    if not p:
        die(f'找不到 {name}。macOS: brew install ffmpeg；Ubuntu: sudo apt install ffmpeg；Windows: winget install ffmpeg')
    return p


def run(cmd, **kw):
    return subprocess.run([str(c) for c in cmd], check=True, **kw)


# ───────────────────────── story ─────────────────────────
def load_story(proj: Path) -> dict:
    p = proj / 'story.json'
    if not p.exists():
        die(f'{proj} 里没有 story.json（可先运行：mv.py new {proj}）')
    try:
        st = json.loads(p.read_text(encoding='utf-8'))
    except json.JSONDecodeError as e:
        die(f'story.json 不是合法 JSON：第 {e.lineno} 行第 {e.colno} 列 {e.msg}')
    if not isinstance(st.get('scenes'), list) or not st['scenes']:
        die('story.json 需要一个非空的 scenes 数组')
    known = set(re.findall(r"T\('([\w-]+)'", (ENGINE / 'templates.js').read_text(encoding='utf-8')))
    cj = proj / 'custom.js'
    if cj.exists():
        known |= set(re.findall(r"MV\.template\(\s*['\"]([\w-]+)['\"]", cj.read_text(encoding='utf-8')))
    for i, sc in enumerate(st['scenes'], 1):
        t = sc.get('type') or sc.get('t') or 'statement'
        if t not in known:
            die(f'第 {i} 个场景的 type「{t}」不存在，可用：{", ".join(sorted(known))}')
    return st


def say_list(sc: dict) -> list:
    s = sc.get('say')
    if s is None or s == '':
        return []
    return [str(x) for x in (s if isinstance(s, list) else [s]) if str(x).strip()]


def all_lines(st: dict) -> list:
    return [l for sc in st['scenes'] for l in say_list(sc)]


def plain(s: str) -> str:
    return re.sub(r'[【】]', '', s)


def tts_text(s: str) -> str:
    return re.sub(r'\s+', ' ', plain(s)).strip()


def story_hash(st: dict) -> str:
    key = json.dumps([[say_list(sc), sc.get('dur'), sc.get('hold')] for sc in st['scenes']] + [st.get('pace')], ensure_ascii=False)
    return hashlib.sha1(key.encode('utf-8')).hexdigest()[:12]


def project_name(proj: Path, st: dict) -> str:
    n = st.get('name') or proj.resolve().name
    return re.sub(r'[\\/:*?"<>|\s]+', '-', n).strip('-') or 'video'


def style_list() -> list:
    out = []
    for d in sorted(STYLES.iterdir()) if STYLES.exists() else []:
        f = d / 'style.json'
        if f.exists():
            m = json.loads(f.read_text(encoding='utf-8'))
            m['name'] = d.name
            out.append(m)
    out.sort(key=lambda m: m.get('order', 99))
    return out


def style_meta(name: str) -> dict:
    f = STYLES / name / 'style.json'
    if not f.exists():
        die(f'没有风格「{name}」，可用：{", ".join(m["name"] for m in style_list())}')
    m = json.loads(f.read_text(encoding='utf-8'))
    m['name'] = name
    return m


def pick(a, st, key, default):
    v = getattr(a, key, None) or st.get(key) or default
    return v


def ratios_of(v: str) -> list:
    if v == 'all':
        return list(RATIOS)
    rs = [x.strip() for x in str(v).split(',') if x.strip()]
    for r in rs:
        if r not in RATIOS:
            die(f'不支持的画幅 {r}，可用：3:4、9:16、16:9、all')
    return rs


# ───────────────────────── 估时 / 时间轴 ─────────────────────────
PACE = dict(cps=4.5, lead=0.35, gap=0.25, hold=0.6, min=2.5, tail=1.5)


def speak_seconds(text: str, cps: float) -> float:
    t = plain(text)
    n = 0.0
    for m in re.finditer(r"[A-Za-z]+(?:['’][A-Za-z]+)?|\d+(?:[.,]\d+)*%?|[\u3400-\u9fff\uf900-\ufaff]", t):
        s = m.group()
        if s[0].isalpha() and s[0].isascii():
            n += max(1.2, len(s) / 3.0)
        elif s[0].isdigit():
            n += 1.3 * sum(c.isdigit() for c in s) + (0.6 if '.' in s else 0) + (1 if s.endswith('%') else 0)
        else:
            n += 1
    pauses = 0.16 * len(re.findall(r'[，、；：,;:—]', t)) + 0.28 * len(re.findall(r'[。！？!?…]', t))
    return max(0.8, n / cps + pauses)


def layout(st: dict, durs: list) -> dict:
    P = dict(PACE, **(st.get('pace') or {}))
    t, k = 0.0, 0
    lines, scenes = [], []
    for sc in st['scenes']:
        say = say_list(sc)
        s0 = t
        if say:
            t = s0 + P['lead']
        for j, text in enumerate(say):
            if j:
                t += P['gap']
            lines.append({'s': round(t, 3), 'e': round(t + durs[k], 3), 'text': text})
            t += durs[k]
            k += 1
        if say:
            t += float(sc.get('hold', P['hold']))
        e = max(t, s0 + max(P['min'], float(sc.get('dur', 0) or 0)))
        scenes.append({'s': round(s0, 3), 'e': round(e, 3)})
        t = e
    dur = round(t + P['tail'], 3)
    scenes[-1]['e'] = dur
    return {'duration': dur, 'lines': lines, 'scenes': scenes}


def estimate(st: dict) -> dict:
    P = dict(PACE, **(st.get('pace') or {}))
    tm = layout(st, [speak_seconds(l, P['cps']) for l in all_lines(st)])
    tm['source'] = 'estimate'
    tm['hash'] = story_hash(st)
    return tm


def write_timing(proj: Path, tm: dict):
    (proj / 'timing.json').write_text(json.dumps(tm, ensure_ascii=False, indent=1), encoding='utf-8')


def get_timing(proj: Path, st: dict) -> dict:
    tp = proj / 'timing.json'
    n = len(all_lines(st))
    if tp.exists():
        tm = json.loads(tp.read_text(encoding='utf-8'))
        same = len(tm.get('lines', [])) == n and len(tm.get('scenes', [])) == len(st['scenes'])
        if tm.get('source') == 'estimate':
            if same and tm.get('hash') == story_hash(st):
                return tm
        elif same:
            return tm
        else:
            die(f'timing.json（来自 {tm.get("source")}）和 story.json 的句数/场景数对不上。改了口播就要重新生成：'
                f'mv.py tts {proj} 或 mv.py timing {proj} --lines/--audio/--words；只想先看画面可用 --estimate')
    tm = estimate(st)
    write_timing(proj, tm)
    info(f'按字数估算时间轴：{len(tm["lines"])} 句，{tm["duration"]:.1f}s（有配音后运行 timing 换成真实时间）')
    return tm


# ───────────────────────── 音频 ─────────────────────────
def decode_pcm(f: Path) -> bytes:
    r = subprocess.run([ffmpeg_bin(), '-v', 'error', '-i', str(f), '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True)
    if r.returncode != 0:
        die(f'无法解码音频 {f}：{r.stderr.decode(errors="ignore")[:300]}')
    return r.stdout


def write_wav(path: Path, pcm: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm)


def trim_pcm(pcm: bytes, margin=0.04) -> bytes:
    try:
        import numpy as np
    except ImportError:
        return pcm
    x = np.frombuffer(pcm, np.int16)
    if not len(x):
        return pcm
    a = np.abs(x.astype(np.int32))
    thr = max(300, int(a.max() * 0.03))
    idx = np.nonzero(a > thr)[0]
    if not len(idx):
        return pcm
    m = int(margin * SR)
    s, e = max(0, idx[0] - m), min(len(x), idx[-1] + m)
    return x[s:e].tobytes()


def natural_key(p: Path):
    return [int(t) if t.isdigit() else t for t in re.split(r'(\d+)', p.name)]


def timing_from_lines(proj: Path, st: dict, d: Path):
    exts = {'.wav', '.mp3', '.m4a', '.aiff', '.aif', '.flac', '.ogg', '.opus'}
    files = sorted([p for p in d.iterdir() if p.suffix.lower() in exts], key=natural_key)
    lines = all_lines(st)
    if len(files) != len(lines):
        die(f'{d} 里有 {len(files)} 个音频，story 有 {len(lines)} 句口播，需要一一对应（按文件名数字排序）')
    pcms = [trim_pcm(decode_pcm(f)) for f in files]
    durs = [len(p) / 2 / SR for p in pcms]
    tm = layout(st, durs)
    buf = bytearray(int(tm['duration'] * SR) * 2)
    for L, p in zip(tm['lines'], pcms):
        o = int(round(L['s'] * SR)) * 2
        buf[o:o + len(p)] = p
    write_wav(proj / 'audio' / 'voice.wav', bytes(buf))
    tm['source'] = 'lines'
    write_timing(proj, tm)
    ok(f'逐句配音 {len(files)} 句 → audio/voice.wav，总长 {tm["duration"]:.1f}s')


def silences(x, min_len=0.14):
    import numpy as np
    hop = SR // 100
    n = len(x) // hop
    fr = x[:n * hop].reshape(n, hop)
    db = 20 * np.log10(np.sqrt((fr.astype(np.float64) ** 2).mean(axis=1)) / 32768 + 1e-9)
    lo, hi = np.percentile(db, 8), np.percentile(db, 92)
    thr = lo + 0.3 * (hi - lo)
    sil = db < thr
    out, i = [], 0
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]:
                j += 1
            if (j - i) / 100 >= min_len:
                out.append((i / 100, j / 100))
            i = j
        else:
            i += 1
    voiced = np.nonzero(~sil)[0]
    return out, (voiced[0] / 100 if len(voiced) else 0), ((voiced[-1] + 1) / 100 if len(voiced) else n / 100)


def scenes_from_lines(st: dict, lines: list, total: float) -> list:
    P = dict(PACE, **(st.get('pace') or {}))
    scenes, k, prev_e = [], 0, 0.0
    bounds = []
    for sc in st['scenes']:
        n = len(say_list(sc))
        if n == 0:
            die('用整段音频或字级时间戳对时间时，每个场景至少要有一句 say（没有口播的场景请改用 tts 或 --lines）')
        bounds.append((k, k + n - 1))
        k += n
    for i, (a, b) in enumerate(bounds):
        s = 0.0 if i == 0 else max(prev_e + 0.05, lines[a]['s'] - min(P['lead'], (lines[a]['s'] - lines[a - 1]['e']) * 0.6))
        if i:
            scenes[-1]['e'] = round(s, 3)
        scenes.append({'s': round(s, 3), 'e': None})
        prev_e = lines[b]['e']
    scenes[-1]['e'] = round(total, 3)
    return scenes


def timing_from_audio(proj: Path, st: dict, f: Path):
    try:
        import numpy as np
    except ImportError:
        die('整段音频对时间需要 numpy：pip install numpy（或者改用逐句音频 --lines）')
    pcm = decode_pcm(f)
    x = np.frombuffer(pcm, np.int16)
    lines = all_lines(st)
    N = len(lines)
    P = dict(PACE, **(st.get('pace') or {}))
    exp = [speak_seconds(l, P['cps']) for l in lines]
    sil, v0, v1 = silences(x)
    cands = [(a, b) for a, b in sil if a > v0 + 0.2 and b < v1 - 0.2]
    if len(cands) < N - 1:
        sil, v0, v1 = silences(x, 0.06)
        cands = [(a, b) for a, b in sil if a > v0 + 0.2 and b < v1 - 0.2]
    speech = v1 - v0
    tot = sum(exp)
    exp = [e / tot * speech for e in exp]
    bounds = []
    if len(cands) >= N - 1 and N > 1:
        # 动态规划：在停顿处切 N-1 刀，让每句时长最接近按字数估的比例，长停顿优先
        M = len(cands)
        cen = [(a + b) / 2 for a, b in cands]
        INF = float('inf')
        cost = lambda s, e, k: ((e - s) - exp[k]) ** 2 / max(exp[k], 0.6)
        f_ = [[INF] * M for _ in range(N - 1)]
        bk = [[-1] * M for _ in range(N - 1)]
        for j in range(M):
            f_[0][j] = cost(v0, cen[j], 0) - 0.3 * min(cands[j][1] - cands[j][0], 1.0)
        for k in range(1, N - 1):
            for j in range(k, M):
                best, bi = INF, -1
                for i in range(k - 1, j):
                    if f_[k - 1][i] == INF:
                        continue
                    c = f_[k - 1][i] + cost(cen[i], cen[j], k)
                    if c < best:
                        best, bi = c, i
                f_[k][j] = best - 0.3 * min(cands[j][1] - cands[j][0], 1.0)
                bk[k][j] = bi
        last = min(range(M), key=lambda j: f_[N - 2][j] + cost(cen[j], v1, N - 1) if f_[N - 2][j] < INF else INF)
        cuts = [last]
        for k in range(N - 2, 0, -1):
            cuts.append(bk[k][cuts[-1]])
        cuts = cuts[::-1]
        s = v0
        for k in range(N):
            if k < N - 1:
                a, b = cands[cuts[k]]
                bounds.append((s, a))
                s = b
            else:
                bounds.append((s, v1))
    else:
        if N > 1:
            info('停顿太少，按字数比例切分（建议逐句录音或提供 STT 字级时间）')
        s = v0
        for e in exp:
            bounds.append((s, s + e))
            s += e
    total = len(x) / SR + P['tail']
    tl = [{'s': round(a, 3), 'e': round(b, 3), 'text': t} for (a, b), t in zip(bounds, lines)]
    tm = {'duration': round(total, 3), 'lines': tl, 'scenes': scenes_from_lines(st, tl, total), 'source': 'audio'}
    write_wav(proj / 'audio' / 'voice.wav', pcm + bytes(int(P['tail'] * SR) * 2))
    write_timing(proj, tm)
    ok(f'整段配音按停顿切成 {N} 句 → timing.json，总长 {total:.1f}s（建议 snap 后抽查字幕是否对齐）')


def timing_from_words(proj: Path, st: dict, f: Path, voice: Path | None):
    raw = json.loads(f.read_text(encoding='utf-8'))
    if isinstance(raw, dict):
        raw = raw.get('words') or raw.get('result') or raw.get('segments') or []
    ws = []
    for w in raw:
        t = str(w.get('w') or w.get('word') or w.get('text') or '')
        s = w.get('s', w.get('start', w.get('start_time')))
        e = w.get('e', w.get('end', w.get('end_time')))
        if t and s is not None and e is not None:
            ws.append((t, float(s), float(e)))
    if not ws:
        die('词级时间文件里没读到 {w/word/text, s/start, e/end}')
    if max(e for _, _, e in ws) > 3600 * 3:
        ws = [(t, s / 1000, e / 1000) for t, s, e in ws]
    PUN = re.compile(r'[\s，。！？、；：“”‘’（）《》〈〉【】「」『』—…·,.!?;:\'"()<>\[\]{}~`|]')
    stt, stt_t = [], []
    for t, s, e in ws:
        cs = [c.lower() for c in t if not PUN.match(c)]
        for i, c in enumerate(cs):
            stt.append(c)
            stt_t.append((s + (e - s) * i / max(1, len(cs)), s + (e - s) * (i + 1) / max(1, len(cs))))
    lines = all_lines(st)
    ref, ref_pos = [], []
    for li, l in enumerate(lines):
        p = plain(l)
        for ci, c in enumerate(p):
            if not PUN.match(c):
                ref.append(c.lower())
                ref_pos.append((li, ci))
    sm = difflib.SequenceMatcher(None, ref, stt, autojunk=False)
    times = [None] * len(ref)
    for a, b, n in sm.get_matching_blocks():
        for q in range(n):
            times[a + q] = stt_t[b + q]
    known = [i for i, t in enumerate(times) if t]
    if len(known) < len(ref) * 0.5:
        die(f'STT 文字和口播稿只对上 {len(known)}/{len(ref)} 个字，请确认是同一段音频')
    for i in range(len(times)):
        if times[i] is None:
            prv = max([k for k in known if k < i], default=None)
            nxt = min([k for k in known if k > i], default=None)
            if prv is not None and nxt is not None:
                a, b = times[prv][1], times[nxt][0]
                fr = (i - prv) / (nxt - prv)
                times[i] = (a + (b - a) * fr, a + (b - a) * fr)
            elif prv is not None:
                times[i] = (times[prv][1], times[prv][1])
            else:
                times[i] = (times[nxt][0], times[nxt][0])
    per = {}
    for (li, ci), t in zip(ref_pos, times):
        per.setdefault(li, []).append({'c': ci, 'n': 1, 's': round(t[0], 3), 'e': round(t[1], 3)})
    tl = []
    for li, l in enumerate(lines):
        w = per.get(li) or [{'c': 0, 'n': 1, 's': tl[-1]['e'] if tl else 0, 'e': tl[-1]['e'] if tl else 0}]
        tl.append({'s': w[0]['s'], 'e': max(w[-1]['e'], w[0]['s'] + 0.3), 'text': l, 'words': w})
    vf = voice or (proj / 'audio' / 'voice.wav')
    if not vf.exists():
        die('需要配音文件：--voice 你的音频（或已有 audio/voice.wav）')
    pcm = decode_pcm(vf)
    P = dict(PACE, **(st.get('pace') or {}))
    total = len(pcm) / 2 / SR + P['tail']
    if voice:
        write_wav(proj / 'audio' / 'voice.wav', pcm + bytes(int(P['tail'] * SR) * 2))
    tm = {'duration': round(total, 3), 'lines': tl, 'scenes': scenes_from_lines(st, tl, total), 'source': 'words'}
    write_timing(proj, tm)
    ok(f'按字级时间对齐 {len(lines)} 句（匹配 {len(known)}/{len(ref)} 字）→ timing.json')


# ───────────────────────── 字体 ─────────────────────────
def find_local(name: str):
    if os.environ.get('MV_NO_LOCAL_FONTS'):
        return None
    for d in LOCAL_FONT_DIRS:
        try:
            p = d / name
            if p.exists():
                return p
        except OSError:
            pass
    return None


def safe_extract(tf: tarfile.TarFile, dest: Path):
    dest = dest.resolve()
    for m in tf.getmembers():
        if not (m.isfile() or m.isdir()):
            continue
        name = m.name.split('/', 1)[1] if '/' in m.name else ''
        if not name:
            continue
        out = (dest / name).resolve()
        if not str(out).startswith(str(dest) + os.sep):
            continue
        if m.isdir():
            out.mkdir(parents=True, exist_ok=True)
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        with tf.extractfile(m) as src, open(out, 'wb') as dst:
            shutil.copyfileobj(src, dst)


def fetch_pkg(pkg: str, ver: str) -> Path:
    fid = pkg.split('/')[-1] + '-' + ver
    dest = FONT_DIR / fid
    if (dest / 'package.json').exists():
        return dest
    base = pkg.split('/')[-1]
    err = None
    for reg in REGISTRIES:
        url = f'{reg}/{pkg}/-/{base}-{ver}.tgz'
        try:
            info(f'下载字体 {pkg}@{ver} …')
            req = urllib.request.Request(url, headers={'User-Agent': 'z-motion-video'})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            if data[:2] != b'\x1f\x8b':
                raise RuntimeError('返回的不是 tgz')
            tmp = dest.with_name(fid + '.part')
            if tmp.exists():
                shutil.rmtree(tmp)
            tmp.mkdir(parents=True)
            with tarfile.open(fileobj=__import__('io').BytesIO(data), mode='r:gz') as tf:
                safe_extract(tf, tmp)
            if dest.exists():
                shutil.rmtree(dest)
            tmp.rename(dest)
            return dest
        except Exception as e:  # noqa: BLE001
            err = e
    die(f'字体 {pkg}@{ver} 下载失败：{err}。可设置代理后重试，或手动解压到 {dest}')


def font_css(keys: list) -> tuple:
    """返回 (fonts.css 文本, PROJECT.fonts 列表, 说明)"""
    css, fams, notes = [], [], []
    for key in keys:
        F = FONTS.get(key)
        if not F:
            die(f'未知字体 key：{key}（可用 {", ".join(FONTS)}）')
        fam = F['family']
        loc = [(find_local(n), wt) for n, wt in F.get('local', [])]
        if loc and loc[0][0]:
            (FONT_DIR / 'local').mkdir(parents=True, exist_ok=True)
            for p, wt in loc:
                if not p:
                    continue
                link = FONT_DIR / 'local' / p.name
                if not link.exists():
                    try:
                        link.symlink_to(p)
                    except OSError:
                        shutil.copy2(p, link)
                fmt = 'opentype' if p.suffix.lower() == '.otf' else 'truetype'
                css.append(f"@font-face {{ font-family: '{fam}'; src: url('fonts/local/{p.name}') format('{fmt}'); "
                           f"font-weight: {wt}; font-style: normal; font-display: block; }}")
            notes.append(f'{fam} ← 本机 {loc[0][0].name}')
        else:
            d = fetch_pkg(F['pkg'], F['ver'])
            for c in F['css']:
                t = (d / c).read_text(encoding='utf-8')
                t = re.sub(r"font-family:\s*['\"]?[^;'\"]+['\"]?\s*;", f"font-family: '{fam}';", t)
                t = re.sub(r"url\((['\"]?)\./files/", lambda m: f"url({m.group(1)}fonts/{d.name}/files/", t)
                t = t.replace('font-display: swap', 'font-display: block')
                css.append(t)
            notes.append(f'{fam} ← {F["pkg"]}@{F["ver"]}')
        for stl in F.get('styles', ['normal']):
            fams.append({'family': fam, 'weights': F['weights'], 'style': stl})
    return '\n'.join(css), fams, notes


# ───────────────────────── build ─────────────────────────
def link_or_copy(src: Path, dst: Path):
    if dst.is_symlink() or dst.is_file():
        dst.unlink()
    elif dst.is_dir():
        shutil.rmtree(dst)
    try:
        dst.symlink_to(src.resolve(), target_is_directory=src.is_dir())
    except OSError:
        if src.is_dir():
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)


def build(proj: Path, style: str, ratio: str, quiet=False) -> Path:
    st = load_story(proj)
    meta = style_meta(style)
    W, H = RATIOS[ratio]
    tm = get_timing(proj, st)
    out = proj / 'build' / f'{style}-{RTAG[ratio]}'
    (out / 'engine').mkdir(parents=True, exist_ok=True)
    (out / 'style').mkdir(parents=True, exist_ok=True)
    for f in ('core.js', 'templates.js', 'base.css'):
        shutil.copy2(ENGINE / f, out / 'engine' / f)
    for f in ('style.css', 'style.js'):
        shutil.copy2(STYLES / style / f, out / 'style' / f)
    css, fams, notes = font_css(meta.get('fonts', ['serif']))
    (out / 'fonts.css').write_text(css, encoding='utf-8')
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    link_or_copy(FONT_DIR, out / 'fonts')
    uses_tex = any((sc.get('type') == 'formula') for sc in st['scenes'])
    if uses_tex:
        link_or_copy(VENDOR / 'katex', out / 'katex')
    for d in ('assets', 'audio'):
        if (proj / d).exists():
            link_or_copy(proj / d, out / d)
    custom_css = (proj / 'custom.css').exists()
    custom_js = (proj / 'custom.js').exists()
    if custom_css:
        shutil.copy2(proj / 'custom.css', out / 'custom.css')
    if custom_js:
        shutil.copy2(proj / 'custom.js', out / 'custom.js')
    voice = proj / 'audio' / 'voice.wav'
    pj = {'ratio': ratio, 'W': W, 'H': H, 'fps': 30, 'style': style, 'story': st, 'timing': tm, 'fonts': fams,
          'audio': 'audio/voice.wav' if voice.exists() and tm.get('source') != 'estimate' else None, 'assetBase': ''}
    (out / 'project.js').write_text('window.PROJECT = ' + json.dumps(pj, ensure_ascii=False) + ';\n', encoding='utf-8')
    tags = ['<!doctype html>', '<html lang="zh-CN"><head><meta charset="utf-8">', f'<title>{html.escape(str(st.get("title", "z-motion-video")))}</title>',
            '<link rel="stylesheet" href="fonts.css">']
    if uses_tex:
        tags.append('<link rel="stylesheet" href="katex/katex.min.css">')
    tags += ['<link rel="stylesheet" href="engine/base.css">', '<link rel="stylesheet" href="style/style.css">']
    if custom_css:
        tags.append('<link rel="stylesheet" href="custom.css">')
    tags.append('<script src="project.js"></script>')
    if uses_tex:
        tags.append('<script src="katex/katex.min.js"></script>')
    tags += ['<script src="engine/core.js"></script>', '<script src="engine/templates.js"></script>', '<script src="style/style.js"></script>']
    if custom_js:
        tags.append('<script src="custom.js"></script>')
    tags.append('</head><body><script>MV.boot()</script></body></html>')
    (out / 'index.html').write_text('\n'.join(tags) + '\n', encoding='utf-8')
    if not quiet:
        ok(f'构建 {meta.get("label", style)} · {ratio} → {out}')
        for n in notes:
            info(n)
    return out


# ───────────────────────── 浏览器 ─────────────────────────
def chromium(p):
    try:
        return p.chromium.launch(args=CHROME_ARGS)
    except Exception as e:  # noqa: BLE001
        die(f'Chromium 启动失败：{e}\n先运行：python3 -m playwright install chromium')


def open_stage(br, out: Path, ratio: str, check=True):
    W, H = RATIOS[ratio]
    pg = br.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto((out / 'index.html').as_uri())
    pg.wait_for_function('window.READY===true', timeout=240000)
    be = pg.evaluate('window.BOOT_ERROR')
    if be:
        die('页面启动出错：\n' + be)
    if errs:
        die('页面脚本报错：\n' + '\n'.join(errs[:5]))
    fc = pg.evaluate('window.FONTCHECK')
    if check and not (fc and fc.get('ok')):
        die(f'字体没有全部加载：{json.dumps(fc, ensure_ascii=False)}')
    return pg


def playwright():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        die('需要 Playwright：pip install playwright && python3 -m playwright install chromium')
    return sync_playwright()


def contact_sheet(br, files: list, labels: list, out: Path, tile_w: int, cols: int, title=''):
    cells = ''.join(
        f'<figure><img src="{Path(f).resolve().as_uri()}"><figcaption>{html.escape(l)}</figcaption></figure>' for f, l in zip(files, labels))
    doc = (f'<!doctype html><meta charset="utf-8"><style>body{{margin:0;background:#151515;font:600 18px/1.3 "Source Han Sans SC","Noto Sans SC","Microsoft YaHei",sans-serif;color:#eee}}'
           f'h1{{font-size:20px;margin:16px 16px 0;font-weight:600;color:#aaa}}main{{display:grid;grid-template-columns:repeat({cols},{tile_w}px);gap:12px;padding:16px}}'
           f'figure{{margin:0;position:relative}}img{{width:{tile_w}px;display:block;border-radius:4px}}'
           f'figcaption{{position:absolute;left:6px;top:6px;background:rgba(0,0,0,.72);padding:3px 9px;border-radius:4px;font-size:15px}}</style>'
           f'{"<h1>" + html.escape(title) + "</h1>" if title else ""}<main>{cells}</main>')
    hp = out.with_suffix('.html')
    hp.write_text(doc, encoding='utf-8')
    pg = br.new_page(viewport={'width': cols * (tile_w + 12) + 20, 'height': 600}, device_scale_factor=1)
    pg.goto(hp.as_uri())
    pg.wait_for_function('Array.from(document.images).every(i => i.complete)')
    pg.screenshot(path=str(out), full_page=True)
    pg.close()
    hp.unlink()


def snap(proj: Path, style: str, ratio: str, at=None, br=None) -> dict:
    out = build(proj, style, ratio, quiet=True)
    sdir = proj / 'out' / 'snap' / f'{style}-{RTAG[ratio]}'
    if sdir.exists():
        shutil.rmtree(sdir)
    sdir.mkdir(parents=True)
    W, H = RATIOS[ratio]
    own = br is None
    ctx = playwright() if own else None
    p = ctx.__enter__() if own else None
    try:
        br = br or chromium(p)
        pg = open_stage(br, out, ratio, check=False)
        fc = pg.evaluate('window.FONTCHECK')
        si = pg.evaluate('window.SCENE_INFO')
        issues = pg.evaluate('window.ISSUES')
        files, labels = [], []
        pg.evaluate('renderCover()')
        f = sdir / 'cover.png'
        pg.screenshot(path=str(f))
        files.append(f)
        labels.append('封面')
        if at:
            for t in at:
                pg.evaluate(f'renderAt({t})')
                f = sdir / f't_{t:07.2f}.png'
                pg.screenshot(path=str(f))
                files.append(f)
                labels.append(f'{t:.2f}s')
        else:
            for s in si:
                pg.evaluate(f'renderAt({s["snap"]})')
                f = sdir / f's{s["i"] + 1:02d}.png'
                pg.screenshot(path=str(f))
                files.append(f)
                labels.append(f'{s["i"] + 1:02d} {s["type"]} {s["snap"]:.1f}s')
        tile = 300 if ratio != '16:9' else 420
        cols = 4 if ratio != '16:9' else 3
        sheet = proj / 'out' / f'sheet-{style}-{RTAG[ratio]}.png'
        contact_sheet(br, files, labels, sheet, tile, cols, f'{style} · {ratio}')
        pg.close()
    finally:
        if own:
            br.close()
            ctx.__exit__(None, None, None)
    return {'dir': sdir, 'sheet': sheet, 'issues': issues, 'fontcheck': fc, 'scenes': si}


def report(r: dict, style: str, ratio: str):
    fc = r['fontcheck'] or {}
    bad = [k for k, v in (fc.get('fams') or {}).items() if not v.get('ok')]
    ok(f'{style} · {ratio}：{len(r["scenes"])} 个场景 → {r["sheet"]}')
    if bad:
        print(f'  ⚠ 字体未就绪：{", ".join(bad)}')
    for it in r['issues'] or []:
        print(f'  ⚠ 第 {it["scene"]} 个场景（{it["type"]}）：{it["msg"]}')


# ───────────────────────── render ─────────────────────────
def part_worker(out: str, ratio: str, a: int, b: int, fps: int, dst: str):
    W, H = RATIOS[ratio]
    with playwright() as p:
        br = chromium(p)
        pg = open_stage(br, Path(out), ratio)
        ff = subprocess.Popen([ffmpeg_bin(), '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(fps), '-c:v', 'png', '-i', '-', *ENC, dst],
                              stdin=subprocess.PIPE)
        t0 = time.time()
        for f in range(a, b):
            pg.evaluate(f'renderAt({f / fps})')
            ff.stdin.write(pg.screenshot(type='png'))
            if (f - a) % 300 == 0 and f > a:
                print(f'  [{Path(dst).stem}] {f - a}/{b - a} 帧 {time.time() - t0:.0f}s', flush=True)
        ff.stdin.close()
        rc = ff.wait()
        br.close()
    if rc:
        die(f'ffmpeg 编码失败 rc={rc}')


def render(proj: Path, style: str, ratio: str, workers: int, fps: int, bgm=None, bgm_db=-18.0) -> Path:
    st = load_story(proj)
    out = build(proj, style, ratio)
    tm = get_timing(proj, st)
    dur = tm['duration']
    N = int(round(dur * fps))
    nw = max(1, min(workers, N // 120))
    rdir = proj / 'out' / f'.parts-{style}-{RTAG[ratio]}'
    if rdir.exists():
        shutil.rmtree(rdir)
    rdir.mkdir(parents=True)
    bounds = [round(N * i / nw) for i in range(nw + 1)]
    info(f'渲染 {N} 帧（{dur:.1f}s @ {fps}fps），{nw} 个进程并行 …')
    t0 = time.time()
    procs = [subprocess.Popen([sys.executable, __file__, '_part', str(out), ratio, str(bounds[k]), str(bounds[k + 1]), str(fps), str(rdir / f'part_{k:02d}.mp4')])
             for k in range(nw)]
    rcs = [p.wait() for p in procs]
    if any(rcs):
        die(f'有渲染进程失败：{rcs}')
    lst = rdir / 'parts.txt'
    lst.write_text(''.join(f"file '{(rdir / f'part_{k:02d}.mp4').as_posix()}'\n" for k in range(nw)), encoding='utf-8')
    silent = rdir / 'silent.mp4'
    FF = ffmpeg_bin()
    run([FF, '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', silent])
    final = proj / 'out' / f'{project_name(proj, st)}-{style}-{RTAG[ratio]}.mp4'
    voice = proj / 'audio' / 'voice.wav'
    has_voice = voice.exists() and tm.get('source') != 'estimate'
    cmd = [FF, '-y', '-loglevel', 'error', '-i', silent]
    if has_voice:
        cmd += ['-i', voice]
    if bgm:
        cmd += ['-stream_loop', '-1', '-i', bgm]
    if has_voice and bgm:
        fo = max(0.0, dur - 2.5)
        cmd += ['-filter_complex', f'[1:a]apad[v];[2:a]volume={bgm_db}dB,afade=t=in:st=0:d=1.5,afade=t=out:st={fo:.2f}:d=2.5[b];[v][b]amix=inputs=2:duration=longest:normalize=0[a]',
                '-map', '0:v', '-map', '[a]']
    elif has_voice:
        cmd += ['-map', '0:v', '-map', '1:a', '-af', 'apad']
    elif bgm:
        fo = max(0.0, dur - 2.5)
        cmd += ['-map', '0:v', '-map', '1:a', '-af', f'volume={bgm_db + 6}dB,afade=t=in:st=0:d=1.5,afade=t=out:st={fo:.2f}:d=2.5']
    if has_voice or bgm:
        cmd += ['-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', f'{dur}', '-movflags', '+faststart', final]
    else:
        cmd += ['-c', 'copy', '-movflags', '+faststart', final]
    run(cmd)
    shutil.rmtree(rdir)
    ok(f'完成 {final}（{time.time() - t0:.0f}s）{"" if has_voice else "  ※ 无配音，静音视频"}')
    return final


def psnr(a: Path, b: Path) -> float:
    r = subprocess.run([ffmpeg_bin(), '-v', 'info', '-i', str(a), '-i', str(b), '-lavfi', 'psnr', '-f', 'null', '-'], capture_output=True, text=True)
    m = re.search(r'average:([\d.]+|inf)', r.stderr)
    return float('inf') if m and m.group(1) == 'inf' else float(m.group(1)) if m else 0.0


def verify(proj: Path, style: str, ratio: str, fps=30):
    st = load_story(proj)
    out = proj / 'build' / f'{style}-{RTAG[ratio]}'
    mp4 = proj / 'out' / f'{project_name(proj, st)}-{style}-{RTAG[ratio]}.mp4'
    if not mp4.exists():
        die(f'没找到 {mp4}，先 render')
    tm = get_timing(proj, st)
    N = int(round(tm['duration'] * fps))
    vdir = proj / 'out' / 'verify'
    vdir.mkdir(parents=True, exist_ok=True)
    frames = sorted({0, N // 5, 2 * N // 5, 3 * N // 5, 4 * N // 5, N - 1})
    worst = 1e9
    with playwright() as p:
        br = chromium(p)
        pg = open_stage(br, out, ratio)
        for f in frames:
            a = vdir / f'v_{f:05d}.png'
            b = vdir / f'p_{f:05d}.png'
            run([ffmpeg_bin(), '-y', '-v', 'error', '-i', mp4, '-vf', f'select=eq(n\\,{f})', '-vsync', '0', '-frames:v', '1', a])
            pg.evaluate(f'renderAt({f / fps})')
            pg.screenshot(path=str(b))
            v = psnr(a, b)
            worst = min(worst, v)
            print(f'  帧 {f:5d}（{f / fps:6.2f}s）PSNR {v:.1f} dB')
        br.close()
    if worst >= 30:
        ok(f'逐帧比对通过：视频和页面一致（最低 {worst:.1f} dB）')
    else:
        print(f'⚠ 最低 {worst:.1f} dB，可能有掉帧或渲染不一致，请查看 {vdir}')


# ───────────────────────── 命令 ─────────────────────────
def cmd_check(a):
    print(f'Python {sys.version.split()[0]}')
    print('ffmpeg  ', shutil.which('ffmpeg') or '✗ 未安装')
    try:
        import playwright as _  # noqa: F401
        print('Playwright ✓')
        with playwright() as p:
            br = p.chromium.launch(args=CHROME_ARGS)
            print('Chromium ✓', br.version)
            br.close()
    except SystemExit:
        raise
    except Exception as e:  # noqa: BLE001
        print('Chromium ✗', e, '\n  运行：python3 -m playwright install chromium')
    for k, F in FONTS.items():
        loc = [find_local(n) for n, _ in F.get('local', [])]
        cached = (FONT_DIR / (F['pkg'].split('/')[-1] + '-' + F['ver']) / 'package.json').exists()
        src = f'本机 {loc[0].name}' if loc and loc[0] else ('已缓存' if cached else '首次构建时下载')
        print(f'字体 {k:5s} {F["family"]:9s} {src}')


def cmd_styles(a):
    for m in style_list():
        print(f'{m["name"]:14s} {m.get("label", ""):8s} {m.get("desc", "")}')
        if m.get('suits'):
            print(f'{"":14s} 适合：{"、".join(m["suits"])}')


def cmd_new(a):
    dst = Path(a.dir)
    src = EXAMPLES / a.example
    if not src.exists():
        die(f'没有示例 {a.example}，可用：{", ".join(p.name for p in EXAMPLES.iterdir() if p.is_dir())}')
    if dst.exists() and any(dst.iterdir()):
        die(f'{dst} 已存在且非空')
    dst.mkdir(parents=True, exist_ok=True)
    for f in src.iterdir():
        if f.name in ('build', 'out', 'timing.json', 'audio'):
            continue
        (shutil.copytree if f.is_dir() else shutil.copy2)(f, dst / f.name)
    ok(f'新建项目 {dst}（来自示例 {a.example}）。改 story.json 后运行：mv.py snap {dst}')


def cmd_fonts(a):
    keys = list(FONTS) if a.all else (style_meta(a.style).get('fonts', ['serif']) if a.style else sorted({k for m in style_list() for k in m.get('fonts', [])}))
    _, _, notes = font_css(keys)
    for n in notes:
        ok(n)


def cmd_tts(a):
    proj = Path(a.proj)
    st = load_story(proj)
    lines = all_lines(st)
    d = proj / 'audio' / 'lines'
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)
    FF = ffmpeg_bin()
    with tempfile.TemporaryDirectory() as td:
        for i, l in enumerate(lines, 1):
            t = tts_text(l)
            tmp = Path(td) / f'{i:03d}'
            if a.engine == 'say':
                if not shutil.which('say'):
                    die('say 只在 macOS 上可用，换 --engine edge 或自备逐句音频')
                cmd = ['say', '-v', a.voice or 'Tingting', '-o', str(tmp) + '.aiff']
                if a.rate:
                    cmd += ['-r', str(a.rate)]
                run(cmd + [t])
                srcf = str(tmp) + '.aiff'
            else:
                if not shutil.which('edge-tts'):
                    die('没有 edge-tts：pip install edge-tts（会把文字发到微软在线语音服务）')
                cmd = ['edge-tts', '--voice', a.voice or 'zh-CN-YunxiNeural', '--text', t, '--write-media', str(tmp) + '.mp3']
                if a.rate:
                    cmd += ['--rate', a.rate if str(a.rate).startswith(('+', '-')) else f'+{a.rate}%']
                run(cmd, capture_output=True)
                srcf = str(tmp) + '.mp3'
            run([FF, '-y', '-v', 'error', '-i', srcf, '-ac', '1', '-ar', str(SR), d / f'{i:03d}.wav'])
            print(f'  {i}/{len(lines)} {t[:30]}', flush=True)
    timing_from_lines(proj, st, d)


def cmd_timing(a):
    proj = Path(a.proj)
    st = load_story(proj)
    if a.lines:
        timing_from_lines(proj, st, Path(a.lines))
    elif a.audio:
        timing_from_audio(proj, st, Path(a.audio))
    elif a.words:
        timing_from_words(proj, st, Path(a.words), Path(a.voice) if a.voice else None)
    else:
        tm = estimate(st)
        write_timing(proj, tm)
        ok(f'估算时间轴：{len(tm["lines"])} 句，{tm["duration"]:.1f}s')


def cmd_build(a):
    proj = Path(a.proj)
    st = load_story(proj)
    for r in ratios_of(pick(a, st, 'ratio', '3:4')):
        build(proj, pick(a, st, 'style', 'grid-notebook'), r)


def cmd_snap(a):
    proj = Path(a.proj)
    st = load_story(proj)
    at = [float(x) for x in a.at.split(',')] if a.at else None
    style = pick(a, st, 'style', 'grid-notebook')
    with playwright() as p:
        br = chromium(p)
        for r in ratios_of(pick(a, st, 'ratio', '3:4')):
            report(snap(proj, style, r, at, br), style, r)
        br.close()


def cmd_compare(a):
    proj = Path(a.proj)
    st = load_story(proj)
    styles = a.styles.split(',') if a.styles else [m['name'] for m in style_list()]
    for ratio in ratios_of(a.ratio or st.get('ratio') or '3:4'):
        files, labels = [], []
        tdir = proj / 'out' / 'compare' / RTAG[ratio]
        tdir.mkdir(parents=True, exist_ok=True)
        with playwright() as p:
            br = chromium(p)
            for s in styles:
                out = build(proj, s, ratio, quiet=True)
                pg = open_stage(br, out, ratio)
                if a.scene:
                    si = pg.evaluate('window.SCENE_INFO')
                    k = max(1, min(len(si), a.scene)) - 1
                    pg.evaluate(f'renderAt({si[k]["snap"]})')
                else:
                    pg.evaluate('renderCover()')
                f = tdir / f'{s}.png'
                pg.screenshot(path=str(f))
                pg.close()
                files.append(f)
                labels.append(f'{style_meta(s).get("label", s)} · {s}')
                info(f'{s} ✓')
            sheet = proj / 'out' / f'compare-{RTAG[ratio]}{"-s" + str(a.scene) if a.scene else ""}.png'
            contact_sheet(br, files, labels, sheet, 300 if ratio != '16:9' else 460, 5 if ratio != '16:9' else 3)
            br.close()
        ok(f'风格对比 → {sheet}')


def cmd_render(a):
    proj = Path(a.proj)
    st = load_story(proj)
    for r in ratios_of(pick(a, st, 'ratio', '3:4')):
        render(proj, pick(a, st, 'style', 'grid-notebook'), r, a.workers, a.fps, a.bgm, a.bgm_db)


def cmd_verify(a):
    proj = Path(a.proj)
    st = load_story(proj)
    for r in ratios_of(pick(a, st, 'ratio', '3:4')):
        verify(proj, pick(a, st, 'style', 'grid-notebook'), r, a.fps)


def cmd_preview(a):
    proj = Path(a.proj)
    st = load_story(proj)
    r = ratios_of(pick(a, st, 'ratio', '3:4'))[0]
    out = build(proj, pick(a, st, 'style', 'grid-notebook'), r)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(out))
    http.server.SimpleHTTPRequestHandler.log_message = lambda *x: None
    with socketserver.TCPServer(('127.0.0.1', a.port), handler) as srv:
        ok(f'预览：http://127.0.0.1:{a.port}/index.html#preview （空格播放，←→ 快进，Ctrl+C 结束）')
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '_part':
        _, _, out, ratio, a, b, fps, dst = sys.argv
        part_worker(out, ratio, int(a), int(b), int(fps), dst)
        return
    ap = argparse.ArgumentParser(prog='mv.py', description='z-motion-video：把口播稿做成逐帧渲染的动效视频')
    sp = ap.add_subparsers(dest='cmd', required=True)
    sp.add_parser('check', help='检查环境').set_defaults(fn=cmd_check)
    sp.add_parser('styles', help='列出风格').set_defaults(fn=cmd_styles)
    s = sp.add_parser('new', help='新建项目')
    s.add_argument('dir')
    s.add_argument('--example', default='leap-year')
    s.set_defaults(fn=cmd_new)
    s = sp.add_parser('fonts', help='预下载字体')
    s.add_argument('--style')
    s.add_argument('--all', action='store_true')
    s.set_defaults(fn=cmd_fonts)
    s = sp.add_parser('tts', help='逐句合成配音')
    s.add_argument('proj')
    s.add_argument('--engine', choices=['say', 'edge'], default='say')
    s.add_argument('--voice')
    s.add_argument('--rate')
    s.set_defaults(fn=cmd_tts)
    s = sp.add_parser('timing', help='生成时间轴')
    s.add_argument('proj')
    g = s.add_mutually_exclusive_group()
    g.add_argument('--estimate', action='store_true')
    g.add_argument('--lines', help='逐句音频目录（001.wav、002.wav…）')
    g.add_argument('--audio', help='整段配音文件')
    g.add_argument('--words', help='STT 字/词级时间 JSON')
    s.add_argument('--voice', help='配合 --words：配音文件')
    s.set_defaults(fn=cmd_timing)
    for name, fn, h in [('build', cmd_build, '构建页面'), ('snap', cmd_snap, '逐场景截图 + 排版检查'), ('render', cmd_render, '渲染视频'),
                        ('verify', cmd_verify, '视频逐帧比对'), ('preview', cmd_preview, '浏览器预览')]:
        s = sp.add_parser(name, help=h)
        s.add_argument('proj')
        s.add_argument('--style')
        s.add_argument('--ratio', help='3:4 / 9:16 / 16:9 / all，可逗号分隔')
        s.add_argument('--fps', type=int, default=30)
        if name == 'snap':
            s.add_argument('--at', help='指定时间点（秒），逗号分隔')
        if name == 'render':
            s.add_argument('--workers', type=int, default=max(1, min(8, (os.cpu_count() or 4) - 2)))
            s.add_argument('--bgm', help='背景音乐文件')
            s.add_argument('--bgm-db', type=float, default=-18.0)
        if name == 'preview':
            s.add_argument('--port', type=int, default=8765)
        s.set_defaults(fn=fn)
    s = sp.add_parser('compare', help='同一份稿子，所有风格对比图')
    s.add_argument('proj')
    s.add_argument('--ratio')
    s.add_argument('--styles')
    s.add_argument('--scene', type=int)
    s.set_defaults(fn=cmd_compare)
    a = ap.parse_args()
    a.fn(a)


if __name__ == '__main__':
    main()
