# story.json 字段说明

一个项目目录的结构：

```text
my-video/
├── story.json        必需：标题、风格、场景和口播
├── assets/           图片素材，story 里写 assets/xxx.png
├── audio/            配音（tts / timing 生成，也可以自己放 voice.wav）
├── timing.json       时间轴（自动生成）
├── custom.css        可选：在风格样式之后加载
├── custom.js         可选：在风格脚本之后加载
├── build/            构建出的网页（自动生成）
└── out/              截图、对比图、视频（自动生成）
```

## 顶层字段

| 字段 | 说明 |
|---|---|
| `scenes` | 场景数组，必需 |
| `title` | 视频标题。用于网页标题和页眉兜底 |
| `name` | 输出文件名前缀，默认用项目目录名 |
| `series` | 系列名，显示在页眉；第一个章节页之前也把它当作小节名 |
| `byline` | 署名，显示在页脚和结尾页 |
| `ratio` | 默认画幅：`3:4`、`9:16`、`16:9` |
| `style` | 默认风格目录名，例如 `grid-notebook` |
| `subtitles` | 写 `false` 关闭字幕 |
| `pace` | 估算时间轴的参数，见下文「时间轴」 |
| `seal` | `rice-paper` 专用：封面和结尾的印章文字，2～4 个字 |
| `masthead` | `newsprint` 专用：报头名，不写时用 `series` |

## 场景通用字段

每个场景都可以写这些字段，模板专属字段见 [templates.md](templates.md)。

| 字段 | 说明 |
|---|---|
| `type` | 模板名（也可以简写成 `t`），不写时是 `statement` |
| `say` | 口播。字符串或字符串数组，数组里每个元素是一句，对应一段配音和一组字幕 |
| `kicker` | 标题上方的小标签 |
| `title` | 标题，`\n` 换行 |
| `sub` | 副标题（也可以写 `dek`） |
| `note` | 页面底部的补充说明 |
| `section` | 从这一页起页眉显示的小节名。`chapter` 页会自动用自己的标题 |
| `dur` | 这一页的最短时长（秒） |
| `hold` | 最后一句口播说完后再停多久（秒），默认 0.6 |
| `stamp` | 印章 / 角标文字，样式和位置由风格决定，在这一页最后出场 |
| `bg` | 背景变体，各风格支持的值不同（见 SKILL.md「风格」一节） |
| `accent` | 这一页的强调色，例如 `#E4002B` |
| `trans` | 进入这一页时的转场，覆盖风格默认：`cut`、`fade`、`fadeblur`、`rise`、`cross`、`push`、`slide`、`paper`、`columns`、`wipe` |
| `cls` | 给这一页加额外 class，配合 `custom.css` 使用 |
| `tone` | 页眉和字幕按哪种底色配色（`light`、`dark` 等）。只在用 `custom.css` 自己换了背景时才需要写 |
| `focus` | `true` / `false`：列表类模板是否「讲到哪项亮哪项，讲过的变淡」，不写时由风格决定 |
| `hot` | 要标成重点的条目序号（从 0 开始），可以是数字或数组。也可以直接在条目里写 `"on": true` |
| `titleSplit` | 写 `false` 时，标题过长也不自动断成两行 |

## 出场时刻

画面元素默认在口播说到它的文字时出场。比如列表项「平年 365 天」会在口播说到「平年 365 天」时出现。匹配会忽略空格和标点，大小写不敏感。没匹配上的元素在前后两个锚点之间均匀铺开。

需要手动指定时，写对应的 `xxAt` 字段，条目里写 `at`。取值有四种：

| 写法 | 含义 |
|---|---|
| `"闰年"` | 口播说到「闰年」时出场（找这一页口播里第一次出现的位置） |
| `"2.5s"` 或 `2.5` | 这一页开始后第 2.5 秒 |
| `"40%"` | 这一页时长的 40% 处 |
| `["四年一闰", "闰年"]` | 依次尝试，用第一个能匹配上的 |

常用的 `xxAt`：`kickerAt`、`titleAt`、`subAt`、`noteAt`、`imageAt`、`tagsAt`、`metaAt`、`numAt`、`textAt`、`valueAt`、`labelAt`、`leftAt`、`rightAt`、`vsAt`、`verdictAt`、`markAt`、`sourceAt`、`codeAt`、`hlAt`、`texAt`、`ctaAt`、`bylineAt`、`stampAt`。

引擎会保证出场顺序和最小间隔：手动写的时刻比前一个元素还早时，会被顺延到前一个之后。

## 【】强调

- **屏幕文字**里的 `【词】` 会渲染成高亮样式（红笔圈、荧光笔、色块等，由风格决定），口播说到这个词时点亮。
- **口播** `say` 里的 `【词】` 在配音时会去掉括号，字幕里同样高亮。

```json
{ "type": "statement", "text": "四年攒成【一整天】", "say": "四年攒下来，就是差不多【一整天】。" }
```

## 字幕

字幕来自 `say`，按标点切成短句，每屏的最大字数由风格决定（3:4 约 15～17 字，9:16 约 13～15 字，16:9 约 24～26 字）。句末的逗号、句号会去掉，句中的逗号、顿号换成空格。全片关闭字幕写 `"subtitles": false`。

## 时间轴

`timing.json` 记录每句口播和每个场景的起止时间。生成方式有四种，后三种来自真实配音，会覆盖估算结果。

### 1. 估算（默认）

没有配音时按字数估算，`snap`、`render` 发现 `say` 变了会自动重新估算。参数可以在 `story.pace` 里改：

| 参数 | 默认 | 含义 |
|---|---|---|
| `cps` | 4.5 | 每秒念几个字（英文单词和数字有单独的换算） |
| `lead` | 0.35 | 每页开始到第一句口播的间隔（秒） |
| `gap` | 0.25 | 同一页句子之间的间隔 |
| `hold` | 0.6 | 每页最后一句之后的停留 |
| `min` | 2.5 | 每页最短时长 |
| `tail` | 1.5 | 全片结尾多留的时间 |

估算出的视频是静音的，适合先看画面节奏。

### 2. 逐句音频 `--lines`

```bash
python3 $SK/tools/mv.py timing ./my-video --lines ./recordings
```

目录里放和 `say` 句数一样多的音频（wav、mp3、m4a、aiff、flac、ogg、opus），按文件名里的数字排序一一对应。装了 numpy 时每个文件会先去掉首尾静音（没装就原样使用），再和估算模式一样按 `lead`、`gap`、`hold`、`min`、`tail` 排好，拼成 `audio/voice.wav`。这是最稳的方式。

自己的录音不要放在项目的 `audio/lines/` 里：那是 `tts` 的输出目录，每次运行 `tts` 都会先清空它。

### 3. 整段音频 `--audio`

```bash
python3 $SK/tools/mv.py timing ./my-video --audio 我的录音.wav
```

一整段录音，按停顿切成句子再对到 `say` 上。需要 `pip install numpy`，每个场景至少要有一句 `say`。念得很连贯、停顿不明显时会切不准，改用逐句音频或字级时间戳。

### 4. 字级时间戳 `--words`

```bash
python3 $SK/tools/mv.py timing ./my-video --words words.json --voice 我的录音.wav
```

`words.json` 是语音识别给出的字 / 词级时间，数组里每项写 `{"w": "闰", "s": 1.23, "e": 1.41}`，字段名也可以是 `word`/`text`、`start`/`start_time`、`end`/`end_time`；外层是对象时读取其中的 `words`、`result` 或 `segments`。时间是毫秒时会自动换算。识别文字和 `say` 有出入也没关系，引擎按字对齐，没对上的字插值补齐。和整段音频一样，每个场景至少要有一句 `say`。这种方式出场时刻最准。

## 配音（tts）

```bash
python3 $SK/tools/mv.py tts ./my-video
python3 $SK/tools/mv.py tts ./my-video --engine edge --voice zh-CN-XiaoxiaoNeural --rate 10
```

| 引擎 | 说明 |
|---|---|
| `say`（默认） | macOS 自带，本地合成，默认音色 Tingting。`say -v '?'` 列出可用音色，`--rate` 是每分钟字数 |
| `edge` | 需要 `pip install edge-tts`，默认音色 `zh-CN-YunxiNeural`，`--rate 10` 表示加快 10%。**会把口播文字发到微软在线语音服务** |

合成前会清空 `audio/lines/`，结果写到 `audio/lines/001.wav…`，然后自动按逐句音频的方式生成时间轴和 `audio/voice.wav`。用其他配音工具时，把逐句文件放进项目外或 `recordings/` 这类单独的目录，再跑 `timing --lines`。

## 背景音乐

```bash
python3 $SK/tools/mv.py render ./my-video --bgm music.mp3 --bgm-db -20
```

音乐会循环铺满全片，开头 1.5 秒淡入，结尾 2.5 秒淡出。有配音时默认压到 -18 dB；没有配音时按 `--bgm-db` 加 6 dB 播放。

## 自定义

- `custom.css`：在风格样式之后加载。场景元素都有稳定的 class（`.scene.tpl-list`、`.title`、`.item`、`.card`…），配合场景的 `cls` 字段可以只改某一页。
- `custom.js`：在风格脚本之后加载，可以调用 `MV.template('名字', (d, api) => {…})` 注册自己的模板。
- `custom` 模板：直接写 HTML，元素上加 `data-role`、`data-rv`、`data-at` 参与出场，见 [templates.md](templates.md)。
