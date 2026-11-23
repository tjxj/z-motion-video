---
name: z-motion-video
description: 把口播稿、文章或几条要点做成动效讲解视频（MP4）。写一份 story.json，每页选一个模板、配几句口播，画面元素会跟着口播里的关键词依次出场，字幕、页码、进度条和转场都自动生成。内置 15 套视觉风格（方格手稿、宋式米纸、撞色海报、杂志瓷蓝、象牙陶土、夜航文档、报纸号外、装配说明书、手账拼贴、瑞士网格、漫画分镜、孔版印刷、购物小票、电影胶片、地铁导视），每套有自己的版式和一份专属示范稿，支持 3:4、9:16、16:9 三种画幅。配音可以用 macOS say、edge-tts，也可以接自己的录音或字级时间戳。逐帧渲染，同一时刻永远是同一张画面，支持多进程并行导出和逐帧比对。适合知识科普、产品介绍、操作教程、数据解读、观点输出、读书分享、生活分享等短视频。触发词：动效视频、做个动效视频、动画讲解视频、文字转动效视频、口播配动效、口播动画、讲解动画、竖屏动效视频、横屏动效视频、motion video、explainer video。
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

1. **问清三件事**：讲什么（稿子或要点）、发在哪（决定画幅）、喜欢什么风格。风格拿不准时，先跑 `showcase` 出一张各风格示范稿的总览图让用户挑；想看同一份稿子在各风格下的样子，用用户的稿子跑 `compare`。
2. **建项目**：`python3 $SK/tools/mv.py new ./my-video --style <风格>`，会复制这个风格的示范稿当起点（示范稿用到了这套风格的各种版式，照着改最快）；不写 `--style` 时复制闰年示例。
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

| 风格 | 名称 | 看点 | 示范稿 | 适合 |
|---|---|---|---|---|
| `grid-notebook` | 方格手稿 | 方格笔记本、左侧红线页边批注、手写文楷、红笔圈画打勾 | 费曼学习法 | 知识科普、原理讲解、学习方法、读书笔记 |
| `rice-paper` | 宋式米纸 | 宋画立轴、右侧竖排书法、淡墨远山、乌丝栏手卷、朱砂印 | 二十四节气 | 传统文化、人文历史、节气民俗、诗词读书 |
| `color-block` | 撞色海报 | 运动海报：斜切高饱和色块、超大裁切字、贴纸徽章、四色斜条转场 | 第一次跑 5 公里 | 运动健身、观点输出、清单盘点、活动预告 |
| `porcelain` | 杂志瓷蓝 | 青花瓷蓝生活方式杂志：全幅刊头、双线回纹框、跨页图版、目录点线 | 青花瓷怎么烧成 | 文化工艺、生活方式、品牌故事、人物专访 |
| `ivory-clay` | 象牙陶土 | AI 产品发布会：深浅页交替、宋体大标题、对话界面卡片、设置面板 | 写好提示词 | AI 教程、产品介绍、科技解读、效率方法 |
| `night-doc` | 夜航文档 | 深夜终端和 IDE：标签栏、行号、命令提示符、git log、红绿 diff、分屏 | Git 撤销提交 | 技术教程、开发工具、AI 编程、架构解析 |
| `newsprint` | 报纸号外 | 旧报纸头版：报头双线、多栏竖线正文、网点传真照片、套红号外章 | 人类首次登月 | 历史故事、新闻解读、热点事件、人物传记 |
| `manual` | 装配说明书 | 宜家式说明书：粗黑分格、大号步骤号、技术线稿、零件清单、对错示范 | 自行车补胎 | 操作教程、DIY 指南、产品上手、避坑对比 |
| `scrapbook` | 手账拼贴 | 旅行手账：线圈点阵纸、拍立得和纸胶带、撕口票根、手绘路线、邮戳 | 厦门周末两日 | 旅行攻略、生活分享、美食探店、好物推荐 |
| `swiss-grid` | 瑞士网格 | 12 栏网格和坐标标注、错位粗黑标题、几何数据装置、整页红黑章节 | 地球上的水 | 数据解读、信息设计、品牌介绍、行业观察 |
| `comic` | 漫画分镜 | 彩色条漫：粗黑画格、对话气泡、爆炸拟声字、速度线、网点 | 快递包裹的旅程 | 故事科普、流程拆解、生活趣闻、知识图解 |
| `riso` | 孔版印刷 | 双色孔版印刷：荧光粉加孔版蓝、错版套印、粗网点、再生纸海报 | 第一次去音乐节 | 音乐演出、生活方式、城市攻略、创意科普 |
| `receipt` | 购物小票 | 热敏小票：锯齿撕边、等宽数字、点线明细、红笔圈合计、条形码 | 一杯咖啡一年多少钱 | 消费算账、数据解读、生活科普、清单对比 |
| `film` | 电影胶片 | 35mm 齿孔、2.39:1 宽银幕遮幅、场记板、倒计时片头、24fps 时间码 | 为什么是每秒 24 帧 | 影视科普、文化历史、深度解说、人物故事 |
| `metro` | 地铁导视 | 彩色线路图、换乘站、站台站名牌、车厢 LED 顶栏、出口黄牌 | Python 学习路线 | 学习路线、步骤教程、流程拆解、知识科普 |

`python3 $SK/tools/mv.py styles` 可以随时列出。每套风格的色板、版式和取舍写在 `styles/<风格>/DESIGN.md`。

**示范稿**：`styles/<风格>/demo/` 是这套风格的专属示范稿，题材按风格挑，尽量把它的专属版式都用上。`new --style` 复制的就是它，`showcase` 总览图里展示的也是它。示范稿里的价格、步数这类数字只为演示版式，做自己的视频时换成核实过的数据。

**换底色和版式**：多数风格的场景可以写 `"bg"` 切换明暗或底色，`cover` 等模板可以写 `"layout"` 换版式变体，不写时按模板自动安排。下面这些字段都可以不写：

| 风格 | 字段 |
|---|---|
| `grid-notebook` | 场景 `margin` 写页边红笔批注，`false` 关掉；`cover` 的 `layout: "split"` 左右分栏 |
| `rice-paper` | `story.seal` 写 2～4 个字，封面和结尾盖朱砂印；`bg: "ink"` 墨色页；`cover` 的 `layout: "center"` 居中匾额；`list` 的 `layout: "scroll"`（竖排手卷）或 `"rows"`（横栏）；`cards` 的 `layout: "wheel"` 时令盘，圆心字写 `centerLabel` |
| `color-block` | `bg: "ink" \| "blue" \| "lime" \| "red" \| "paper" \| "white-red"`，不写时自动轮换；`cover` 的 `hero: "runner"` 把星芒圆章换成冲刺人形，`vert` 竖排小字，`badge` 圆形贴纸，`bgText` 巨型裁切字，`layout: "split"` 双色硬切 |
| `porcelain` | `story.masthead` 刊名，`story.column` 栏目名；`bg: "light" \| "dark" \| "cobalt"`；`cover` 的 `layout: "split"` |
| `ivory-clay` | `bg: "light" \| "dark" \| "clay"`；`cover` 的 `layout: "minimal"` 极简版，`ui: {"prompt", "reply", "session", "placeholder", "sidebar"}` 自定义封面上的对话，不写时按标题自动生成 |
| `night-doc` | 场景 `accent: "#7CF3C8"` 换强调色，不写时每章自动换色；`cover` 的 `layout: "compact"` 精简版 |
| `newsprint` | `story.masthead` 报头名，不写时用 `series`；`bg: "light" \| "dark"`；`cover` 的 `columns` 写头版分栏正文（字符串数组），`layout: "extra"` 纯文字号外 |
| `manual` | `bg: "light" \| "dark" \| "orange"`；`cover` 的 `specs` 右上角规格、`tools` 底栏工具清单 |
| `scrapbook` | `bg: "light" \| "yellow" \| "pink" \| "mint" \| "blue"`，写 `"light"` 取消章节页的便利贴底色 |
| `swiss-grid` | `bg: "light" \| "dark" \| "red"` |
| `comic` | `story.mascot: "box"` 启用纸箱主角「小箱」，场景 `mood: "happy" \| "shock" \| "run" \| "think" \| "proud"` 换表情，不写时用通用的漫画小助手；`sfx` 拟声字，`false` 关掉；`bg: "light" \| "yellow" \| "blue"`；`cover` 的 `vol` 刊号、`layout: "split"` |
| `riso` | 场景 `motif: "festival"` 叠加舞台、音箱和人群剪影；`bg: "light" \| "pink" \| "blue"`；`cover` 的 `layout: "split"` |
| `receipt` | `story.masthead` 小票抬头，`story.date` 小票日期（例如 `"2026-03-08"`，不写时印 `2026-11-23`）；`bg: "wood" \| "dark"` 换桌面底色 |
| `film` | `cover` 的 `leaderNum` 片头倒计时数字，`layout: "split"` 左右分栏 |
| `metro` | `story.lineCode` 线路代号（最多 3 个字符）；`cover` 的 `stations` 站名数组（4～7 个，不写时从章节和场景标题里取）；`chapter` 的 `en` 英文站名；`bg: "light" \| "dark"` |

想做新风格，复制一个现有风格目录改，接口见 [docs/styles.md](docs/styles.md)。风格可以整个重写某个模板的版式，也能注册自己的入场动画。

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
python3 $SK/tools/mv.py new <项目> [--style S | --example leap-year]  新建项目
python3 $SK/tools/mv.py fonts [--style S | --all]               预下载字体
python3 $SK/tools/mv.py tts <项目> [--engine say|edge] [--voice V] [--rate R]
python3 $SK/tools/mv.py timing <项目> [--estimate | --lines DIR | --audio FILE | --words JSON --voice FILE]
python3 $SK/tools/mv.py snap <项目> [--style S] [--ratio R] [--at 3.5,8]
python3 $SK/tools/mv.py compare <项目> [--ratio R] [--styles a,b] [--scene N]
python3 $SK/tools/mv.py showcase [--ratio R] [--styles a,b] [--pages 3] [--out DIR]
python3 $SK/tools/mv.py preview <项目> [--style S] [--ratio R] [--port 8765]
python3 $SK/tools/mv.py render <项目> [--style S] [--ratio R|all] [--workers N] [--fps 30] [--bgm FILE] [--bgm-db -18]
python3 $SK/tools/mv.py verify <项目> [--style S] [--ratio R]
```

产物位置：

| 命令 | 产物 |
|---|---|
| `snap` | `out/sheet-<风格>-<画幅>.png`（总览），`out/snap/<风格>-<画幅>/sNN.png`（逐页） |
| `compare` | `out/compare-<画幅>.png`，`out/compare/<画幅>/<风格>.png` |
| `showcase` | `<DIR>/showcase-<画幅>.png`（每个风格一行：封面 + 内容页），`<DIR>/showcase-covers-<画幅>.png`，`<DIR>/showcase-<风格>-<画幅>.png` |
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
