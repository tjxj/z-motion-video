---
name: z-motion-video
description: 把口播稿、文章或几条要点做成动效讲解视频（MP4）。写一份 story.json，每页选一个模板、配几句口播，画面元素会跟着口播里的关键词依次出场，字幕、页码、进度条和转场都自动生成。内置 10 套视觉风格（方格手稿、宋式米纸、撞色海报、杂志瓷蓝、象牙陶土、夜航文档、报纸号外、装配说明书、手账拼贴、瑞士网格），支持 3:4、9:16、16:9 三种画幅。配音可以用 macOS say、edge-tts，也可以接自己的录音或字级时间戳。逐帧渲染，同一时刻永远是同一张画面，支持多进程并行导出和逐帧比对。适合知识科普、产品介绍、操作教程、数据解读、观点输出、读书分享、生活分享等短视频。触发词：动效视频、做个动效视频、动画讲解视频、文字转动效视频、口播配动效、口播动画、讲解动画、竖屏动效视频、横屏动效视频、motion video、explainer video。
---

# z-motion-video 动效视频

把一份口播稿变成带动画的讲解视频。流程是：`story.json`（场景 + 口播）→ 网页（HTML/CSS 动画）→ 逐帧截图 → MP4。

下文 `$SK` 指本 skill 所在目录，`./my-video` 指用户的项目目录。

## 环境

```bash
pip install playwright && python3 -m playwright install chromium
```

另需 ffmpeg（macOS：`brew install ffmpeg`）。整段音频对时间、逐句音频去首尾静音要 `pip install numpy`，在线配音要 `pip install edge-tts`，都是可选的。

```bash
python3 $SK/tools/mv.py check
```

字体在第一次构建时自动下载开源字体（思源宋体 / 思源黑体 / 霞鹜文楷 / Inter 等，OFL 协议）到 `~/.cache/z-motion-video`；本机已装同款字体时直接用本机的。

## 工作流

按顺序做，每一步都有产物可以检查。

1. **问清三件事**：讲什么（稿子或要点）、发在哪（决定画幅）、喜欢什么风格。风格拿不准时，先用示例或用户的稿子跑 `compare` 出一张对比图让用户挑。
2. **建项目**：`python3 $SK/tools/mv.py new ./my-video`，会复制示例 `story.json` 和素材。
3. **写 story.json**：把稿子拆成场景，每个场景选一个模板（见下方速查），写屏幕上的字和 `say` 口播句子。写法规则见下一节。
4. **出截图检查排版**：`python3 $SK/tools/mv.py snap ./my-video`。打开 `out/sheet-<风格>-<画幅>.png` 看整体，终端里的 ⚠ 提示（内容溢出、缩到 xx%、标题行太长）要逐条处理：删字、拆场景或换模板。
5. **配音和时间轴**（三选一，没有配音也能先渲染静音版）：
   - 自己有录音：逐句文件 `timing --lines 目录`；整段文件 `timing --audio voice.wav`；有字级时间戳 `timing --words words.json --voice voice.wav`。
   - 机器配音：`tts ./my-video`（macOS say，本地合成）；`tts ./my-video --engine edge`（edge-tts，会把文字发到微软在线语音服务，先征得用户同意）。
   - 暂时没有：跳过，引擎按字数估算时间。
6. **预览**（可选）：`preview ./my-video`，浏览器打开终端给出的地址，空格播放。
7. **导出**：`render ./my-video`，产物是 `out/<name>-<风格>-<3x4|9x16|16x9>.mp4`。`--ratio all` 一次出三种画幅，`--bgm 音乐.mp3` 混入背景音乐（默认 -18 dB，首尾淡入淡出）。
8. **核对**：`verify ./my-video`，抽 6 帧和页面逐帧比对，PSNR 全部 ≥ 30 dB 算通过。

命令里的 `--style`、`--ratio` 不写时读 `story.json` 的 `style`、`ratio` 字段，再没有就用 `grid-notebook`、`3:4`。

## 写 story.json 的规则

- **一页一件事**：每个场景口播 1～3 句，时长 5～15 秒最舒服。信息多就拆成两页。
- **屏幕字是口播的提炼**：标题 6～14 字，列表 3～5 项，每项一行。口播负责讲细节，屏幕只放关键词、数字和结论。
- **顺序一致**：列表、卡片、步骤、时间线的条目顺序要和口播里提到的顺序一致，引擎会在口播说到对应文字时让它出场。
- **点亮关键词**：屏幕文字里用 `【】` 包住要强调的词，口播里说到这个词时它会被高亮。口播里也写 `【】` 时，字幕里的这个词同样高亮。
- **对不上时手动指定**：自动匹配失败时，给元素写 `xxAt`（如 `"titleAt": "闰年"`、`"at": "3.5s"`、`"at": "60%"`），详见 [docs/story.md](docs/story.md)。
- **开头和结尾**：第一页用 `cover`，最后一页用 `ending`；每 3～5 页可以插一个 `chapter` 分段，页眉会显示当前小节名。
- **图片**：放在项目 `assets/` 目录，写相对路径 `"image": "assets/xxx.png"`。
- **口播句子不带画面说明**：`say` 里的文字会直接送去配音和做字幕。

最小示例：

```json
{
  "title": "三分钟看懂复利",
  "name": "compound",
  "series": "理财入门",
  "byline": "@你的账号",
  "ratio": "9:16",
  "style": "ivory-clay",
  "scenes": [
    { "type": "cover", "kicker": "理财入门", "title": "三分钟\n看懂复利", "say": "复利到底有多厉害？三分钟讲清楚。" },
    { "type": "bignum", "value": "37.8", "unit": "倍", "label": "每天进步 1%，一年后", "say": "每天进步百分之一，一年后是原来的 37.8 倍。" },
    { "type": "list", "title": "复利的三个条件", "mode": "number",
      "items": ["本金", "收益率", "【时间】"],
      "say": ["复利要三样东西：本金、收益率，", "还有最重要的，【时间】。"] },
    { "type": "ending", "title": "越早开始越好", "cta": "关注我，下期讲定投", "say": "所以，越早开始越好。" }
  ]
}
```

完整示例见 `$SK/examples/leap-year/story.json`（17 个场景，用到了大部分模板）。

## 模板速查

| type | 用途 | 主要字段 |
|---|---|---|
| `cover` | 封面 | kicker、title、sub、tags、image、meta |
| `chapter` | 章节页 | num、title、sub、note |
| `statement` | 一句话金句 / 观点 | text（多行用 `\n`） |
| `bignum` | 一个大数字 | value、unit、label、note |
| `stats` | 2～6 个数据卡 | items[{value, unit, label, note, on}] |
| `list` | 要点 / 编号 / 对错清单 | mode（bullet、number、check、cross）、items |
| `steps` | 步骤流程，带连线箭头 | items[{title, text}]、dir |
| `cards` | 概念 / 特点 / 方案卡片 | items[{tag, title, text, icon}]、cols |
| `compare` | 左右对比 | left、right{label, value, unit, points, win}、verdict |
| `bars` | 横向条形图 | items[{label, value, unit, on}]、scale: log |
| `timeline` | 时间线 | items[{time, text}]、dir |
| `quote` | 引用 | text、source |
| `code` | 代码，逐行打字 | code、lang、file、hl |
| `formula` | 公式（KaTeX） | tex、items |
| `image` | 图片 / 截图，可配要点 | image、frame、cap、points |
| `ending` | 结尾 | title、tags、cta、byline |
| `custom` | 自写 HTML | html、css |

所有模板都能写 `kicker`（小标签）、`title`、`sub`、`note`、`say`。完整字段见 [docs/templates.md](docs/templates.md)。

## 风格

| 风格 | 名称 | 看点 | 适合 |
|---|---|---|---|
| `grid-notebook` | 方格手稿 | 米白方格纸、墨黑宋体、红笔批注，像在笔记本上边讲边画 | 知识科普、原理讲解、学习笔记、读书分享 |
| `rice-paper` | 宋式米纸 | 宣纸底、居中宋体、朱砂印章和着重号、远山淡墨 | 人文历史、传统文化、读书笔记、节气民俗 |
| `color-block` | 撞色海报 | 每页换一块高饱和底色、粗黑体大字、黑底字幕条，节奏快 | 观点输出、清单盘点、产品发布、活动预告 |
| `porcelain` | 杂志瓷蓝 | 冷白瓷底、藏青宋体、斜体数字和冰裂纹，安静的杂志感 | 品牌故事、人物专访、生活方式、艺术设计 |
| `ivory-clay` | 象牙陶土 | 象牙白配陶土橙，封面、章节、金句切成深色页 | 科技解读、产品介绍、行业观察、知识讲解 |
| `night-doc` | 夜航文档 | 深海军蓝、星点和点阵，每章换一种强调色，玻璃卡片 | 技术教程、AI 工具、产品发布、数据报告 |
| `newsprint` | 报纸号外 | 旧报纸纸面、报头和分栏线、粗黑宋体、网点图片 | 新闻解读、热点事件、历史故事、观点评论 |
| `manual` | 装配说明书 | 说明书白纸、圆形步骤号、安全橙重点、虚线箭头、刻度尺进度 | 操作教程、产品上手、流程拆解、工具测评 |
| `scrapbook` | 手账拼贴 | 点阵本、便利贴卡片、和纸胶带、荧光笔、拍立得相框、手写字 | 生活分享、学习笔记、旅行攻略、好物推荐 |
| `swiss-grid` | 瑞士网格 | 12 栏参考线、粗黑无衬线、Inter 大数字、一抹瑞士红 | 品牌介绍、数据解读、行业观察、设计分享 |

`python3 $SK/tools/mv.py styles` 可以随时列出。几个风格有专属字段：

- `rice-paper`：`story.seal` 写 2～4 个字，封面和结尾会盖一方朱砂印。
- `newsprint`：`story.masthead` 是报头名，不写时用 `series`。
- `color-block`：场景写 `"bg": "ink|paper|blue|lime|red"` 指定底色，不写时自动轮换。
- `ivory-clay`：`"bg": "light|dark|clay"`；`manual`：`"bg": "light|dark|orange"`；`swiss-grid`：`"bg": "light|dark|red"`；`scrapbook`：`"bg": "light"` 取消章节页的便利贴底色。
- `night-doc`：场景写 `"accent": "#7CF3C8"` 换强调色，不写时每章自动换色。

想做新风格，复制一个现有风格目录改，接口见 [docs/styles.md](docs/styles.md)。

## 画幅

| 画幅 | 尺寸 | 常见用途 |
|---|---|---|
| `3:4` | 1080×1440 | 公众号、小红书 |
| `9:16` | 1080×1920 | 抖音、视频号、快手 |
| `16:9` | 1920×1080 | B 站、YouTube、横屏播放 |

同一份 `story.json` 三种画幅都能直接出。9:16 底部留了约 560px 给平台按钮和标题栏，字幕在它上面；16:9 会把列表、卡片、步骤自动排成多列或横排。三种画幅的字数容量不同，换画幅后重新 `snap` 检查一遍。

## 命令速查

```text
python3 $SK/tools/mv.py check                                   检查环境
python3 $SK/tools/mv.py styles                                  列出风格
python3 $SK/tools/mv.py new <项目> [--example leap-year]         新建项目
python3 $SK/tools/mv.py fonts [--style S | --all]               预下载字体
python3 $SK/tools/mv.py tts <项目> [--engine say|edge] [--voice V] [--rate R]
python3 $SK/tools/mv.py timing <项目> [--estimate | --lines DIR | --audio FILE | --words JSON --voice FILE]
python3 $SK/tools/mv.py snap <项目> [--style S] [--ratio R] [--at 3.5,8]
python3 $SK/tools/mv.py compare <项目> [--ratio R] [--styles a,b] [--scene N]
python3 $SK/tools/mv.py preview <项目> [--style S] [--ratio R] [--port 8765]
python3 $SK/tools/mv.py render <项目> [--style S] [--ratio R|all] [--workers N] [--fps 30] [--bgm FILE] [--bgm-db -18]
python3 $SK/tools/mv.py verify <项目> [--style S] [--ratio R]
```

产物位置：

| 命令 | 产物 |
|---|---|
| `snap` | `out/sheet-<风格>-<画幅>.png`（总览），`out/snap/<风格>-<画幅>/sNN.png`（逐页） |
| `compare` | `out/compare-<画幅>.png`，`out/compare/<画幅>/<风格>.png` |
| `tts` / `timing` | `audio/lines/NNN.wav`、`audio/voice.wav`、`timing.json` |
| `render` | `out/<name>-<风格>-<画幅>.mp4` |
| `verify` | `out/verify/` 里的比对帧 |

## 注意事项

- 改了 `say` 之后要重新跑 `tts` 或 `timing`。估算模式会自动重新估算；来自录音的时间轴在句数对不上时会报错提醒。
- `timing --lines` 的音频文件数要和 `say` 句数一致，按文件名里的数字排序对应。用户自己的录音放在 `recordings/` 这类单独目录，不要放进 `audio/lines/`，`tts` 每次运行都会清空那里。
- `timing --audio` 和 `timing --words` 都要求每个场景至少有一句 `say`。`--audio` 按停顿切句，停顿不明显时改用逐句录音或字级时间戳更准。
- `render` 默认开「CPU 核数 − 2」个进程并行（最多 8 个），机器卡顿时用 `--workers` 调小。
- 项目目录里放 `custom.css`、`custom.js` 会在风格之后加载，可以微调某个风格而不改 skill 本身。
- 不要在 `say` 里写屏幕说明、括号注释或网址，它们会被念出来。
