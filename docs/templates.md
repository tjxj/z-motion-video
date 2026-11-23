# 模板字段

每个场景用 `type` 选一个模板。所有模板都支持这些通用字段：`say`、`kicker`、`title`、`sub`、`note`、`stamp`，以及 [story.md](story.md) 里列的 `bg`、`trans`、`cls`、`dur`、`hold` 等。

条目类字段（`items`、`points`）既可以写字符串，也可以写对象。写字符串时等于只填了主字段。

列表类模板（stats、list、steps、cards、bars、timeline）的条目对象可以加：

- `"on": true`：标成重点（换强调色或加粗，样式由风格决定）
- `"at": "关键词"`：指定出场时刻，取值见 [story.md](story.md#出场时刻)

这几个模板还支持两个场景级字段：

- `focus`：讲到哪项亮哪项
- `hot`：按序号标重点，序号从 0 开始。`tags` 标签也用它标重点

数字字段（`value`）写成 `"365.2422"`、`"$1.2"`、`"3,000"`、`"98%"` 这类「前缀 + 数字 + 后缀」时，出场会有计数动画。`"9–11"`、`"1:2"` 这类带多个数字的写法照原样显示。

---

## cover 封面

```json
{ "type": "cover", "kicker": "冷知识 · 历法", "title": "为什么每四年\n多出一天？", "sub": "从儒略历到格里历，一次讲清闰年",
  "tags": ["闰年", "2 月 29 日"], "say": "每隔四年，二月就会多出一天。" }
```

| 字段 | 说明 |
|---|---|
| `title` | 大标题，`\n` 换行 |
| `kicker` / `sub` | 小标签 / 副标题 |
| `tags`（或 `chips`） | 标签数组，`tagsAt` 指定出场 |
| `meta` | 一行补充信息（日期、期数等），`metaAt` |
| `image` | 封面配图，配套字段同 `image` 模板：`frame`、`cap`、`kb`、`imageAt`、`windowTitle` |

`snap` 和 `compare` 生成的封面图取第一个 `cover` 场景全部出场后的画面，可以直接当视频封面用。

## chapter 章节页

```json
{ "type": "chapter", "title": "儒略历：四年一闰", "note": "公元前 45 年起施行", "say": "最早系统解决这个问题的，是古罗马的儒略历。" }
```

| 字段 | 说明 |
|---|---|
| `num` | 章节号。不写时自动编号 01、02…（`rice-paper` 显示「第一章」）；写 `false` 隐藏 |
| `title` | 章节名，同时成为后面各页页眉上的小节名 |
| `note` | 补充说明 |
| `numAt` | 章节号出场时刻 |

## statement 一句话

```json
{ "type": "statement", "text": "每年多出将近 6 小时\n四年攒成【一整天】", "say": "每年多出将近 6 个小时，四年攒下来，就是差不多一整天。" }
```

| 字段 | 说明 |
|---|---|
| `text`（或 `lines`） | 大字，每行依次出场。可以写带 `\n` 的字符串，也可以写数组 |
| `textAt` | 第一行出场时刻，后面的行自动匹配口播 |

适合金句、观点、转折句。超过 3 行会显得挤，拆成两页更好。

## bignum 大数字

```json
{ "type": "bignum", "kicker": "地球绕太阳一圈", "value": "365.2422", "unit": "天", "label": "一年并不是整整 365 天",
  "say": "地球绕太阳转一圈，要 365.2422 天。" }
```

| 字段 | 说明 |
|---|---|
| `value`（或 `num`） | 数字，自动计数动画 |
| `unit` | 单位，跟在数字后面 |
| `label` | 数字下方的说明，`labelAt` |
| `valueAt` | 数字出场时刻 |

## stats 数据卡

2～6 个数字并排。

```json
{ "type": "stats", "title": "每年多算了 11 分钟",
  "items": [
    { "value": "365.25", "unit": "天", "label": "儒略历的一年" },
    { "value": "365.2422", "unit": "天", "label": "真实的一年" },
    { "value": "11", "unit": "分钟", "label": "每年多算", "on": true }
  ] }
```

| 字段 | 说明 |
|---|---|
| `items` | `{value, unit, label, note, on, at}`；写字符串时是 `value` |
| `cols` | 列数。不写时竖屏 1～3 项排一列、4 项以上排两列，横屏按数量排 |

## list 列表

```json
{ "type": "list", "title": "儒略历的规则", "mode": "number",
  "items": ["平年 365 天", "每 4 年设一个闰年", { "text": "平均一年 365.25 天", "note": "比真实多 11 分钟" }] }
```

| 字段 | 说明 |
|---|---|
| `items` | `{text, note, ok, on, at}`；写字符串时是 `text` |
| `mode` | `bullet`（圆点，默认）、`number`（编号）、`check`（全是对勾）、`cross`（全是叉）。条目里写了 `ok` 时默认按对错显示 |
| `ok` | 条目级：`true` 显示对勾，`false` 显示叉，适合「该做 / 不该做」混排 |
| `cols` | 列数。横屏 5 项以上自动两列 |

## steps 步骤

带编号和连线箭头的流程。

```json
{ "type": "steps", "title": "三步装好环境",
  "items": [{ "title": "安装 Python", "text": "3.9 以上" }, { "title": "安装浏览器内核" }, { "title": "运行检查" }] }
```

| 字段 | 说明 |
|---|---|
| `items` | `{title, text, on, at}`；写字符串时是 `title` |
| `dir` | `row` 横排、`col` 竖排。不写时横屏且不超过 5 步用横排，其余竖排 |

连线箭头在下一步出场前画出来，箭头样式由风格决定（手绘、虚线、直线）。

## cards 卡片

概念、特点、方案、优缺点。

```json
{ "type": "cards", "title": "三种记账方法",
  "items": [
    { "title": "流水账", "text": "每笔都记，最全也最累" },
    { "title": "预算法", "text": "先分配再花钱" },
    { "tag": "推荐", "title": "三账户法", "text": "收入自动分流", "on": true }
  ] }
```

| 字段 | 说明 |
|---|---|
| `items` | `{title, text, tag, icon, on, at}`；写字符串时是 `title` |
| `tag`（或 `k`） | 卡片角标。不写时自动编号 01、02… |
| `icon` | 用图标做角标：`check`、`cross`、`arrow`，或风格自带的图标名 |
| `index` | 写 `false` 关闭自动编号 |
| `cols` | 列数，规则同 `stats` |

## compare 左右对比

```json
{ "type": "compare", "title": "儒略历 vs 格里历",
  "left": { "label": "儒略历", "value": "365.25", "unit": "天", "points": ["四年一闰", { "text": "128 年差一天", "ok": false }] },
  "right": { "label": "格里历", "value": "365.2425", "unit": "天", "points": ["四百年 97 闰", { "text": "3300 年差一天", "ok": true }], "win": true },
  "verdict": "格里历沿用至今" }
```

| 字段 | 说明 |
|---|---|
| `left` / `right` | `{tag, label, value, unit, points, win, at}`；写字符串时是 `label` |
| `points` | 要点数组，条目可写 `ok: true/false` 显示对勾或叉 |
| `win` | 胜出的一侧，最后会被高亮 |
| `vs` | 中间的字，默认 `VS`，`vsAt` |
| `verdict` | 结论句，出场时同时高亮胜出的一侧，`verdictAt` |
| `leftAt` / `rightAt` | 两侧的出场时刻 |

## bars 条形图

```json
{ "type": "bars", "title": "各国日均刷手机时长",
  "items": [{ "label": "A 国", "value": 5.2, "unit": "小时" }, { "label": "B 国", "value": 3.1, "unit": "小时", "on": true }] }
```

| 字段 | 说明 |
|---|---|
| `items` | `{label, value, unit, display, on, at}` |
| `display` | 显示用的文字，例如 `value` 写 `52000`、`display` 写 `"5.2 万"`；条长仍按 `value` 算 |
| `scale` | 写 `"log"` 用对数刻度，适合数量级差很大的数据 |
| `max` | 固定满格对应的数值，不写时取最大值 |

## timeline 时间线

```json
{ "type": "timeline", "title": "历法简史",
  "items": [{ "time": "前 45 年", "text": "儒略历施行" }, { "time": "1582 年", "text": "格里历颁布", "on": true }] }
```

| 字段 | 说明 |
|---|---|
| `items` | `{time, text, on, at}`；写字符串时是 `text` |
| `dir` | `row` / `col`，规则同 `steps` |

## quote 引用

```json
{ "type": "quote", "text": "简单是可靠的先决条件。", "source": "艾兹格·迪杰斯特拉" }
```

| 字段 | 说明 |
|---|---|
| `text`（或 `quote`） | 引文，`\n` 分行逐行出场，`textAt` |
| `source`（或 `by`、`author`） | 出处，`sourceAt` |
| `markAt` | 引号出场时刻 |

引用别人的话要核实原文和出处。

## code 代码

逐行打字效果，关键字高亮。

```json
{ "type": "code", "title": "判断闰年", "lang": "python", "file": "leap.py", "hl": [2],
  "code": "def is_leap(y):\n    return y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)" }
```

| 字段 | 说明 |
|---|---|
| `code` | 代码文本，制表符会换成 4 个空格 |
| `lang` | 语言，决定注释符号：`python`、`js`、`ts`、`go`、`rust`、`java`、`c`、`sql`、`sh`、`yaml` 等 |
| `file` | 窗口标题栏里的文件名 |
| `hl`（或 `highlight`） | 要高亮的行号数组，从 1 开始，`hlAt` |
| `cps` | 打字速度，每秒字符数，默认 40 |
| `codeAt` | 代码窗口出场时刻 |

代码太长会自动缩小字号。想保持字号，竖屏每行控制在 36 个字符、12 行以内，横屏每行 55 个字符以内。

## formula 公式

用 KaTeX 渲染，只有用到公式的项目才会加载 KaTeX。

```json
{ "type": "formula", "title": "格里历的平均年长", "tex": "365 + \\frac{1}{4} - \\frac{1}{100} + \\frac{1}{400} = \\hl{365.2425}" }
```

| 字段 | 说明 |
|---|---|
| `tex`（或 `formula`） | LaTeX 公式。JSON 里反斜杠要写两个 |
| `\hl{…}` | 公式里要高亮的部分，`hlAt` 指定点亮时刻 |
| `items` / `mode` | 公式下方的说明列表，写法同 `list` |
| `texAt` | 公式出场时刻 |

## image 图片

```json
{ "type": "image", "title": "1582 年 10 月", "image": "assets/oct-1582.png", "frame": "paper",
  "cap": "这个月直接跳过了 10 天", "points": ["4 日之后是 15 日", "季节重新对齐"] }
```

| 字段 | 说明 |
|---|---|
| `image`（或 `src`） | 图片路径，相对项目目录；也可以是 `https://` 地址（渲染时要能联网） |
| `frame` | 相框：`plain`、`window`（浏览器窗口）、`phone`（手机）、`paper`（纸片）、`polaroid`（拍立得）、`halftone`（报纸网点）。不写时用风格默认 |
| `windowTitle` | `window` 相框标题栏里的文字 |
| `cap` | 图片说明 |
| `points`（或 `items`） | 图片旁边的要点列表，`mode` 同 `list`。有要点时图文左右（横屏）或上下（竖屏）排 |
| `kb` | 图片在这一页里缓慢放大的幅度，`0.05` 表示放大 5%，`0` 关闭。不写时用风格默认 |
| `imageAt` | 图片出场时刻 |

截图类图片建议用 `window` 或 `phone` 相框，照片用 `polaroid` 或 `plain`。

## ending 结尾

```json
{ "type": "ending", "title": "下次二月多一天\n你就知道为什么了", "tags": ["#冷知识", "#历法"], "cta": "关注我，每周一个冷知识" }
```

| 字段 | 说明 |
|---|---|
| `title` / `kicker` / `sub` | 结尾标题 |
| `tags`（或 `chips`） | 标签，`tagsAt` |
| `cta` | 行动号召（关注、收藏、评论区见），`ctaAt` |
| `byline` | 署名，不写时用 `story.byline`，`bylineAt` |

## custom 自定义 HTML

模板不够用时，直接写 HTML。

```json
{ "type": "custom", "title": "一年有多少秒", "center": true,
  "html": "<div class='big-row'><b data-role='big' data-at='三千一百万'>31,556,926</b><span data-role='text'>秒</span></div>",
  "css": ".tpl-custom .big-row { font-size: 120px; display: flex; gap: 24px; align-items: baseline; }" }
```

| 字段 | 说明 |
|---|---|
| `html` | 场景内容 |
| `css` | 附加样式，建议以 `.tpl-custom` 开头，避免影响其他页 |
| `center` | `true` 时内容垂直居中 |

元素上的 `data-*` 属性让它参与出场：

| 属性 | 说明 |
|---|---|
| `data-role` | 语义角色：`kicker`、`title`、`big`、`text`、`item`、`card`、`chip`、`image`、`note`、`quote`、`stamp` 等，决定用风格里的哪种出场动画 |
| `data-rv` | 直接指定出场动画，例如 `pop`、`slam`、`wipe`、`draw`，见 [styles.md](styles.md#出场动画) |
| `data-at` | 出场时刻：关键词、`2.5s` 或 `40%` |
| `data-auto` | 自动匹配口播用的文字 |
| `data-spread` | 加上这个属性，没匹配到口播时和相邻元素均匀铺开 |

自定义页面同样要跑 `snap` 检查三种画幅下是否溢出。
