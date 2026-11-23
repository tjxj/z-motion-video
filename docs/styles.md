# 做一套新风格

一套风格是 `styles/<名字>/` 下的三个文件：

```text
styles/my-style/
├── style.json   名称、描述、适合题材、用到的字体
├── style.css    颜色、字体、各模板元素的外观
└── style.js     底纸绘制、页眉页脚、出场节奏、转场、每页配色
```

引擎（`engine/`）只管排版骨架、时间轴和逐帧渲染，风格只负责「长什么样、怎么动」。三个文件都只作用于本风格，不会影响别的风格。

## 起步

复制最接近的风格再改，比从零写快得多：

```bash
cp -r $SK/styles/grid-notebook $SK/styles/my-style
python3 $SK/tools/mv.py new ./style-demo
python3 $SK/tools/mv.py snap ./style-demo --style my-style --ratio all
python3 $SK/tools/mv.py compare ./style-demo --styles grid-notebook,my-style --scene 6
```

示例稿有 17 个场景，覆盖了大部分模板。每改一轮就 `snap` 三种画幅，看总览图和 ⚠ 提示，再用 `snap --at 12.3,12.6` 截转场中间的帧检查转场。

## style.json

```json
{
  "label": "瑞士网格",
  "desc": "暖白纸上的 12 栏参考线、粗黑无衬线标题……",
  "suits": ["品牌介绍", "数据解读"],
  "fonts": ["sans", "grot", "mono"],
  "order": 10,
  "preview": "#E4002B"
}
```

| 字段 | 说明 |
|---|---|
| `label` | 中文名，出现在 `styles` 列表和对比图上 |
| `desc` | 一句话描述 |
| `suits` | 适合的题材 |
| `fonts` | 用到的字体，只会下载和加载这里列出的 |
| `order` | 列表里的排序 |
| `preview` | 代表色 |

可用字体：

| key | CSS 里的名字 | 字体 |
|---|---|---|
| `serif` | `"MV Serif"` | 思源宋体（Noto Serif SC） |
| `sans` | `"MV Sans"` | 思源黑体（Noto Sans SC） |
| `hand` | `"MV Hand"` | 霞鹜文楷 |
| `mono` | `"MV Mono"` | JetBrains Mono |
| `cond` | `"MV Cond"` | Oswald（窄体英文和数字） |
| `ital` | `"MV Ital"` | Instrument Serif（衬线斜体英文和数字） |
| `grot` | `"MV Grot"` | Inter（只含拉丁字符） |
| `type` | `"MV Type"` | Courier Prime（打字机） |

`grot`、`cond`、`ital`、`type` 只有拉丁字符，写 `font-family` 时后面要跟一个中文字体，例如 `"MV Grot", "MV Sans", sans-serif`。字体文件优先用本机已安装的同款，没有时从 npm 镜像下载 Fontsource 包（OFL 协议），缓存在 `~/.cache/z-motion-video/fonts`（可用环境变量 `MV_CACHE` 改位置）。设置 `MV_NO_LOCAL_FONTS=1` 可以强制使用下载版，方便检查别人机器上的效果。

## style.css

所有规则都挂在 `#stage.st-<名字>` 或 `.st-<名字>` 下。画幅用 `.r34`、`.r916`、`.r169` 区分，例如 `#stage.st-my-style.r169 { … }`。

### 变量

在 `#stage.st-<名字>` 上覆盖这些变量，就能改掉大部分外观：

| 类别 | 变量 |
|---|---|
| 颜色 | `--bg` `--fg` `--fg2` `--fg3` `--accent` `--accent2` `--on-accent` `--hl`（【】高亮色） `--line` `--line-strong` |
| 卡片 | `--card-bg` `--card-bd` `--radius` |
| 代码 | `--code-bg` `--code-fg` `--code-bar` `--code-hl` |
| 字幕 | `--sub-fg` `--sub-hl` |
| 字体 | `--f-title` `--f-body` `--f-num` `--f-kicker` `--f-subl`（字幕） `--f-quote` `--f-mono` |
| 字重 | `--w-title` `--w-body` `--w-num` `--w-kicker` `--w-subl` `--w-strong` |
| 排版 | `--track-title` `--track-kicker` `--lh-title` `--lh-body` `--tt-kicker`（kicker 大小写） |
| 字号 | `--fs-title` `--fs-title-xl` `--fs-text` `--fs-num` `--fs-stat` `--fs-chip` `--fs-chap` `--fs-subl` 等，三种画幅各有一套默认值 |
| 焦点 | `--dim`：讲过的条目变淡多少，0 不变淡，0.5 变成一半透明度 |

只读的布局变量，写装饰时可以用：

| 变量 | 含义 |
|---|---|
| `--W` `--H` | 画面宽高 |
| `--ct` `--cb` `--cl` `--cr` | 内容区离上、下、左、右边缘的距离（安全区） |
| `--sub-y` | 字幕所在高度 |
| `--s` | 当前页的自动缩放系数（内容多时变小），装饰尺寸乘上它才能跟着缩 |
| `--si` | 列表类容器里的缩放系数 |

安全区：3:4 上 170 / 下 270 / 左右 84；9:16 上 250 / 下 560 / 左右 80；16:9 上 150 / 下 210 / 左右 150（单位 px）。页眉页脚放在安全区外，内容不会压到它们。

### 元素和状态

常用元素 class：

| 区域 | class |
|---|---|
| 标题区 | `.head` `.kicker` `.kt` `.title` `.title.xl` `.ln`（标题的每一行） `.dek` `.note` |
| 章节 / 金句 / 大数字 | `.chap-num` `.say` `.sl` `.bn` `.bn-row` `.bn-u` `.bn-l` |
| 数据卡 | `.stats` `.stat` `.stat-v` `.stat-u` `.stat-l` `.stat-n` |
| 列表 | `.list` `.item` `.mk`（标记） `.tx` `.nt` |
| 步骤 | `.steps.row` / `.steps.col` `.step` `.badge` `.st-t` `.st-n` `.links path` |
| 卡片 | `.cards` `.card` `.card-k` `.card-t` `.card-x` |
| 对比 | `.cmp` `.side.left` / `.side.right` `.side-k` `.side-l` `.side-v` `.side-p` `.vs` `.verdict` |
| 条形图 | `.bars` `.bar-row` `.bar-l` `.bar-track` `.bar-fill` `.bar-v` |
| 时间线 | `.tl.row` / `.tl.col` `.tl-item` `.tl-dot` `.tl-time` `.tl-text` `.links path` |
| 引用 | `.qt` `.qmark` `.q-text` `.ql` `.q-src` |
| 代码 / 公式 | `.code-win` `.code-bar` `pre.code` `.cl` `.cl.hl-line` `.tok-k` `.tok-s` `.tok-c` `.tok-n` `.tok-f` `.tok-o` `.formula` |
| 图片 | `.media` `.frame.f-plain` / `.f-window` / `.f-phone` / `.f-paper` / `.f-polaroid` / `.f-halftone` `.shot` `.cap` |
| 其他 | `.chips` `.chip` `.chip.hot` `.cta` `.meta` `.byline` `.stamp` `.hl`（【】强调） |
| 字幕 | `#subs` `.subl` `.subl .hl` |
| 每一页 | `.scene.tpl-<模板名>`，带 `data-tone` |

状态 class 和变量：

| 状态 | 说明 |
|---|---|
| `.on` | 条目被标成重点（`on: true` 或 `hot`） |
| `.is-cur` / `.is-past` | 焦点跟随：正在讲的项 / 讲过的项。条目上同时有 `--past`（0→1） |
| `.item.ok` / `.item.no` | 列表里的对勾项 / 叉项 |
| `.side.win` | 对比的胜出方，`--p` 从 0 渐变到 1，用 `color-mix(… calc(var(--p, 1) * 100%) …)` 做渐变 |
| `.hl` | 【】强调词，点亮时 `--p` 从 0 到 1。荧光笔效果可以写 `background-size: calc(var(--p, 1) * 100%) …` |
| `[data-tone]` | `.scene`、`#chrome`、`#subs` 上都有，值来自 `look()` 返回的 `tone`，用来给深色页换页眉和字幕配色 |
| `#chrome[data-type]` | 当前页的模板名，例如封面不显示页码 |

## style.js

```js
(() => {
  MV.style({
    transition: { kind: 'fade', dur: 0.6 },
    motion: { title: { kind: 'up', d: 0.8, stagger: 0.08, o: { dist: 64 } } },
    focus: true,
    subMax: { r34: 17, r916: 15, r169: 26 },
    mediaFrame: 'plain',
    kenBurns: 0.04,
    look(d, i, o) { return o.sc.t === 'chapter' ? { tone: 'dark', bg: '#111', vars: { '--fg': '#fff', '--hl': '#ff0' } } : {}; },
    paint(g, W, H, R, u) { g.fillStyle = '#F3F2EE'; g.fillRect(0, 0, W, H); u.noise(3, 41); },
    chrome(c) { /* 建页眉页脚 DOM */ return info => { /* 每帧更新 */ }; },
  });
})();
```

### 配置项

| 字段 | 说明 |
|---|---|
| `transition` | 默认转场，见下文「转场」 |
| `motion` | 按语义角色覆盖出场动画，见下文「出场动画」 |
| `focus` | `true` 时列表类模板默认开启焦点跟随（配合 CSS 里的 `--dim`） |
| `subMax` | 每屏字幕最多几个字，按画幅写：`{ r34, r916, r169 }` |
| `mediaFrame` | 图片默认相框：`plain`、`window`、`phone`、`paper`、`polaroid`、`halftone` |
| `kenBurns` | 图片缓慢放大的默认幅度 |
| `quoteMark` | 引用模板的引号字符，写 `''` 不显示 |
| `icons` | 自定义图标 `{ check: '<svg…>', cross: '<svg…>', arrow: '<svg…>' }`，路径加 `class="dr"` 会有描线动画 |
| `revealDelay` | 每页第一个元素最早什么时候出场（秒），默认按转场时长自动算 |

### 钩子

| 钩子 | 调用时机 | 用途 |
|---|---|---|
| `paint(g, W, H, R, u)` | 启动时画一次 | 底纸：在 canvas 2D 上下文 `g` 上画纸纹、网格、渐变。`R()` 是固定种子的随机数，`u` 里有 `rough`（手绘路径）、`rng`、`cl`、`lerp`、`EZ`（缓动函数）、`noise(强度, 种子, 单色)`、`story`、`rc`（画幅）、`land`（是否横屏）。画完会转成图片，每页默认都用它当背景 |
| `overlay(g, W, H, R, u)` | 启动时画一次 | 盖在最上层的纹理（正片叠底），适合纸张颗粒、网点 |
| `chrome(c)` | 启动时一次 | 在 `c.el` 里建页眉、页码、进度条、署名。返回一个函数，每帧收到 `info`：`t`、`i`、`page`、`total`（两位数字符串）、`progress`（0～1）、`section`、`chap`、`tone`、`type`、`cover`。`c` 里有 `h(tag, cls, html)`、`svg`、`esc`、`plain`、`story`、`scenes`、`W`、`H`、`rc`、`land` 等工具 |
| `setup(c)` | `chrome` 之后 | 需要额外全局 DOM 时用，参数同 `chrome` |
| `look(d, i, o)` | 每页搭建前 | 决定这一页的配色，返回 `{ tone, bg, accent, vars, cls, trans }`，见下文 |
| `decorate(sc, api)` | 每页搭建后 | 给某些页加装饰元素（印章、章节号换中文数字等）。`sc.t` 是模板名，`sc.el` 是页面元素 |
| `marker(mode, i, ok, api)` | 列表每一项 | 返回列表标记的 HTML。返回 `null` 用默认（编号 / 圆点 / 对勾 / 叉） |
| `badge(i, item, api)` | 步骤每一步 | 返回步骤编号的 HTML |
| `link(x1, y1, x2, y2, o)` | 步骤和时间线的连线 | 返回 SVG path 的 `d`。`o` 里有 `i`（第几条）、`R`、`rough`、`dash`（虚线）、`arrowHead(x1, y1, x2, y2, 大小, 张角)` |
| `tick(t, o)` | 每帧 | 需要随时间变化的全局装饰（跑马灯、闪烁）。必须只依赖 `t` 计算，不能累加状态 |

### look()：每页换配色

`look(d, i, o)` 里 `d` 是场景数据，`i` 是序号，`o.sc.t` 是模板名，`o.sc.chap` 是第几章，`o.scenes` 是全部场景。返回值：

| 字段 | 说明 |
|---|---|
| `tone` | 色调名，写到 `data-tone` 上，CSS 用它给页眉和字幕换色 |
| `bg` | 这一页的背景，任何 CSS `background` 值。纯色写 `'#111'`；想在底纸上叠一层颜色写 `'linear-gradient(rgba(255,214,90,.4), rgba(255,214,90,.4)), var(--paper) 0 0 / 100% 100% no-repeat'`，其中 `var(--paper)` 是 `paint` 画出的底纸 |
| `accent` | 强调色 |
| `vars` | 这一页要覆盖的 CSS 变量，例如深色页的 `--fg`、`--card-bd` |
| `cls` | 给这一页加 class |
| `trans` | 进入这一页用的转场 |

注意：`--hl` 默认等于 `--accent`，这个等式在 `#stage` 上就已经算好了。`vars` 里改了 `--accent`，也要同时写 `--hl`，否则【】高亮还是旧颜色。

场景里写的 `tone`、`cls`、`accent`、`trans` 优先于 `look()` 的返回值。习惯上让 `d.bg` 指定变体（`'light'`、`'dark'` 等），方便用户在 story 里手动切换。

### 出场动画

每个元素按「语义角色」出场，`motion` 覆盖某个角色的参数：

```js
motion: {
  title: { kind: 'up', d: 0.8, stagger: 0.08, gap: 0.12, o: { dist: 64 } },
  card: { kind: 'drop', d: 0.6, stagger: 0.1, o: { dist: 50, rot: 6 } },
}
```

| 参数 | 说明 |
|---|---|
| `kind` | 动画类型，见下表 |
| `d` | 时长（秒） |
| `stagger` | 同一拍里多个元素（如标题的多行）依次错开的间隔 |
| `gap` | 和上一个元素的最小间隔 |
| `o` | 传给动画类型的参数 |

角色：`kicker`、`title`、`big`（大字、大数字）、`text`、`item`（列表项、时间线）、`card`（卡片、数据卡、步骤、对比两侧）、`num`、`count`（数字滚动）、`chip`（标签）、`image`、`bar`、`grow`（条形图伸长）、`mark`（【】点亮）、`stamp`、`line`（描线）、`quote`、`formula`、`code`、`note`、`dot`。

动画类型：

| kind | 效果 | 参数 |
|---|---|---|
| `fade` | 淡入 | `ease` |
| `rise` | 淡入并上移 | `dist`（默认 28px） |
| `up` | 指数缓动快速上移 | `dist`（默认 72px） |
| `slideX` | 横向滑入 | `dist`（默认 -60px，负数从左边来） |
| `drop` | 从上方落下并带一点旋转 | `dist`、`rot`（默认 5°） |
| `pop` | 弹性放大 | `from`（起始比例，默认 0.6） |
| `slam` | 从大砸下来 | `amt`（默认 0.22） |
| `blur` | 从模糊变清晰 | `r`（模糊半径，默认 10px） |
| `ink` | 墨迹晕开 | |
| `print` | 印刷感轻微失焦后变清晰 | |
| `mask` | 从遮罩下方升起 | |
| `wipe` / `wipeDown` | 从左往右 / 从上往下擦出 | |
| `type` | 打字机逐字出现 | `n`（字数） |
| `unfold` | 从中间向上下展开 | |
| `grow` / `growY` | 横向 / 纵向伸长 | |
| `stick` | 像贴纸一样横向贴上 | |
| `stamp` | 盖章：放大落下再回弹 | |
| `draw` | SVG 描线 | |
| `show` / `none` | 直接出现 / 不动 | |

缓动函数在 `MV.util.EZ` 里（`o2`、`o3`、`o4`、`o5`、`io`、`io2`、`expo`、`back`、`soft`），可以通过 `o: { ease: MV.util.EZ.back }` 传入。

### 转场

```js
transition: { kind: 'push', dur: 0.55, dirs: ['left', 'up'] }
```

| kind | 效果 | 参数 |
|---|---|---|
| `cut` | 硬切 | |
| `fade` | 前一页淡出、后一页淡入 | |
| `fadeblur` | 带模糊的淡入淡出 | |
| `rise` | 前一页上移淡出，后一页从下方淡入 | |
| `cross` | 后一页直接叠化在前一页上 | |
| `push` | 后一页把前一页推走 | `dir` / `dirs`：`left`、`right`、`up`、`down`，`dirs` 按页轮换 |
| `slide` | 后一页带阴影滑入，前一页变暗缩小 | `dir` / `dirs` |
| `paper` | 后一页像一张纸从下面滑上来 | |
| `columns` | 后一页按竖条依次落下 | `n`（条数，默认 6）、`stagger`（错开程度，默认 0.45） |
| `wipe` | 彩色斜条扫过画面后换页 | `panels: [{ c: '颜色', w: 宽度 }]`、`skew`（倾斜角度）、`sw`（换页时刻，默认 0.5） |

公共参数：`dur` 时长；`align` 转场相对换页点的位置，默认 0.5（前后各占一半）。

每页的背景都是不透明的（默认就是底纸），所以 `push`、`slide`、`paper`、`columns` 这类两页重叠的转场不会透出下面一页。

## 经验

- **先定 3 个颜色**：底色、正文色、强调色。强调色只用在【】高亮、重点项、进度条上，用多了就不显眼了。
- **深色页**：在 `look()` 里切，`vars` 要覆盖 `--fg`、`--fg2`、`--fg3`、`--line`、`--card-bd`、`--hl`，CSS 里再给 `#chrome[data-tone="dark"]` 和 `#subs[data-tone="dark"]` 换色。
- **旋转元素**：给卡片、贴纸加 `rotate` 时，容器要留出内边距，否则旋转后的角会被判定为溢出，整页被缩小。
- **装饰尺寸乘 `var(--s)`**：内容多的页会自动缩小，装饰不跟着缩就会显得突兀。
- **转场检查**：用 `snap --at` 截换页点前后 0.2 秒的帧，确认两页没有互相透出、页眉配色没有闪。
- **三种画幅都要看**：9:16 底部很高，16:9 列表会排成多列，经常需要 `.r916`、`.r169` 单独调间距。
- **不要读当前时间或随机数**：所有动画只能由时间 `t` 决定，随机数用 `R()` 或 `u.rng(种子)`，否则并行渲染的各段画面会对不上。
