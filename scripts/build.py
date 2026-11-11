#!/usr/bin/env python3
"""方寸之境 · 构建脚本

把引擎（core/fangcun.js）、页面壳（core/template.html）和某一境的 world.js 合成一个单文件 HTML。

  python3 build.py <工程目录>            生成 <工程目录>/out/preview.html（中间产物，可以覆盖，用来预览和检查）
  python3 build.py <工程目录> --release  生成 <工程目录>/<目录名>-vNNN.html（交付物，版本号自动加一，不覆盖旧版），
                                         同时把这一版的 world.js 存成 <目录名>-vNNN.world.js

引擎从哪里取（先找到的优先）：<工程目录>/_core/ → <系列目录>/_core/ → 技能自带的 core/。
前两处是“自成一格”用的：把技能的 core/ 整个复制过去改，就是你自己的一套风格（见 references/自成一格.md）。
"""
import datetime, pathlib, re, sys

SKILL = pathlib.Path(__file__).resolve().parent.parent


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    proj = pathlib.Path(args[0]).resolve()
    world_path = proj / 'world.js'
    if not world_path.exists():
        sys.exit(f'找不到 {world_path}')
    world = world_path.read_text(encoding='utf-8')
    if not re.search(r'\bconst\s+WORLD\s*=', world):
        sys.exit('world.js 里要有 `const WORLD = { meta: {...}, build(F){...} }`')
    core_dir = next((d for d in (proj / '_core', proj.parent / '_core', SKILL / 'core') if (d / 'fangcun.js').exists() and (d / 'template.html').exists()))
    if core_dir != SKILL / 'core':
        print(f'使用自己的引擎：{core_dir}', file=sys.stderr)
    core = (core_dir / 'fangcun.js').read_text(encoding='utf-8')
    tpl = (core_dir / 'template.html').read_text(encoding='utf-8')
    for src, label in ((core, 'core/fangcun.js'), (world, 'world.js')):
        if '</script' in src.lower():
            sys.exit(f'{label} 里出现了 </script，会把页面截断，请改写那一处')

    m = re.search(r"\bname\s*:\s*['\"]([^'\"]+)['\"]", world)
    title = f'方寸之境 · {m.group(1)}' if m else '方寸之境'
    engine = (core_dir / 'VERSION').read_text(encoding='utf-8').strip() if (core_dir / 'VERSION').exists() else '未标注'
    if core_dir != SKILL / 'core':
        engine += '（自有）'
    html = (tpl.replace('__TITLE__', title)
               .replace('__ENGINE__', engine)
               .replace('__BUILT__', datetime.datetime.now().strftime('%Y-%m-%d %H:%M'))
               .replace('/*__CORE__*/', core)
               .replace('/*__WORLD__*/', world))

    if '--release' in sys.argv:
        slug = proj.name
        nums = [int(x.group(1)) for f in proj.glob(f'{slug}-v*.html') if (x := re.search(r'-v(\d{3})\.html$', f.name))]
        out = proj / f'{slug}-v{max(nums, default=0) + 1:03d}.html'
        out.with_suffix('.world.js').write_text(world, encoding='utf-8')      # 这一版的源文件留档：以后 world.js 再怎么改，这一版都能重新做出来
    else:
        (proj / 'out').mkdir(exist_ok=True)
        out = proj / 'out' / 'preview.html'
    out.write_text(html, encoding='utf-8')
    print(out)


if __name__ == '__main__':
    main()
