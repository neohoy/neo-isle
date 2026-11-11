# NEO-Isle · 维护说明

这份是给维护这个技能的人看的：目录各是什么、怎么手动跑脚本、怎么改引擎、怎么更新示例页。给使用者看的首页是 `README.md`（英文）和 `README.zh-CN.md`（中文）。

## 目录

```
SKILL.md                 代理的入口：流程和规矩
templates/
  境帖.md                给使用者的填空帖
  world.template.js      空白境
  造境方案.md            方案模板
references/
  风格规范.md            哪些由引擎保证、哪些可选、哪些每境重做、验收清单
  造境指南.md            境帖怎么拆、九个槽位、外观怎么选、一奇、布局、候选题材
  制作与避坑.md          引擎工具、外观预设的写法、坐标尺度、出图参数、踩过的坑
  自成一格.md            把引擎复制出去改成自己的风格
core/
  fangcun.js             引擎
  template.html          页面壳
  VERSION                引擎版本
scripts/
  new_world.py           新建一境（空白地 + 方案模板 + 登记到系列境单），可带 --container / --backdrop / --glow
  build.py               合成单文件 HTML（预览版 / 带版本号的发布版，发布时给世界文件留档）
  shot.sh                无界面 Chrome 出图（检查定帧、封面、外观对比），会打印页面报错
examples/                示范境的世界文件（只学手法）：01-雪山河谷、02-雪落寒山
gallery/                 示例页的生成脚本、模板和目录清单
docs/                    生成出来的示例页（GitHub Pages 用）和 README 用的图
PRODUCT.md               产品事实记录（做界面设计时的依据）
```

## 手动用法

```bash
python3 scripts/new_world.py ./fangcun 3 desert-oasis 沙海绿洲 --container dome --backdrop desk
python3 scripts/build.py ./fangcun/03-desert-oasis                 # 预览版 → out/preview.html
sh scripts/shot.sh ./fangcun/03-desert-oasis/out/preview.html /tmp/a.png 17.6 1200 900
python3 scripts/build.py ./fangcun/03-desert-oasis --release       # 发布版 → 03-desert-oasis-v001.html 和 03-desert-oasis-v001.world.js
```

依赖：Python 3、Google Chrome。页面运行时从 jsdelivr 加载 three.js 0.160，需要联网。

## 示例页

示例页是 `docs/` 下的一个静态站点，由 `gallery/build.py` 生成：

```bash
python3 gallery/build.py           # 构建各境的可运行页面、docs/index.html，刷新两份 README 里的境列表
python3 gallery/build.py --shots   # 另外把全部预览图重出一遍（约七分钟）
```

- `gallery/catalog.json`：有哪些境、各自的中英文名和介绍、封面用哪个时辰、仓库和站点地址。
- `gallery/template.html`：页面模板。`gallery/brief.txt` 和 `brief.en.txt` 是页面上那份境帖。
- 加一境：把它的 `world.js` 放进 `examples/`，在 `catalog.json` 的 `isles` 里加一项，带 `--shots` 跑一次。
- 两份 README 里 `<!-- isles:start -->` 到 `<!-- isles:end -->` 之间的表格是脚本生成的，不要手改。
- 本地看：`cd docs && python3 -m http.server`，然后打开 `http://localhost:8000/`。直接双击 `docs/index.html` 也能看，但主视觉里的境读不到“已就绪”的信号，会多等几秒。

## 改引擎

改 `core/` 之后：把 `core/VERSION` 加一；把两个示范境在三种容器、三种背景下各出图确认没坏；再提交。已经发布的各境是自带引擎的单文件，不受影响；想让旧境用上新引擎，重新 `--release` 一版。

使用者想改引擎时不要让他改这里，走 `references/自成一格.md`：复制到他自己的系列目录里。

## 版本

- 1.1.0：外观预设（容器、背景、光效）、境帖、自成一格、发布时世界文件留档、出图打印页面报错。
- 1.0.0：引擎与世界文件分离，第一境《雪山河谷》。

## 来历

2026-11 由一段“玻璃立方体里的 3D 微缩生态场景”提示词做出的第一境整理而来。结构参考了 NEO-Cine：薄入口、风格固定项与每次重做的部分分开、先写方案再看示范、交付升版不覆盖。
