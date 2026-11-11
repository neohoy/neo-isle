#!/usr/bin/env python3
"""方寸之境 · 新建一境

  python3 new_world.py <系列目录> <序号> <英文短名> <境名> [--container cube|dome|sphere] [--backdrop space|desk|plain] [--glow normal|soft|strong]

例：python3 new_world.py ./fangcun 2 desert-oasis 沙海绿洲
  → ./fangcun/02-desert-oasis/world.js      （能直接构建的空白地）
  → ./fangcun/02-desert-oasis/造境方案.md   （先写它）
  → ./fangcun/系列境单.md                    （追加一行；没有就新建）
"""
import pathlib, re, sys, zlib

SKILL = pathlib.Path(__file__).resolve().parent.parent
CN = '零一二三四五六七八九十'


def cn(n):
    if n <= 10:
        return CN[n]
    if n < 20:
        return '十' + CN[n - 10]
    return CN[n // 10] + '十' + (CN[n % 10] if n % 10 else '')


def main():
    args, look = [], {'container': 'cube', 'backdrop': 'space', 'glow': 'normal'}
    choices = {'container': ('cube', 'dome', 'sphere'), 'backdrop': ('space', 'desk', 'plain'), 'glow': ('normal', 'soft', 'strong')}
    it = iter(sys.argv[1:])
    for a in it:
        if a.startswith('--'):
            k, v = a[2:], next(it, '')
            if k not in choices or v not in choices[k]:
                sys.exit(f'--{k} 只能是 {" / ".join(choices.get(k, ()))}' if k in choices else f'不认识的参数 {a}')
            look[k] = v
        else:
            args.append(a)
    if len(args) != 4:
        sys.exit(__doc__)
    series, no, slug, name = pathlib.Path(args[0]).resolve(), int(args[1]), args[2], args[3]
    if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', slug):
        sys.exit('英文短名只用小写字母、数字和连字符，例如 desert-oasis')
    proj = series / f'{no:02d}-{slug}'
    if proj.exists():
        sys.exit(f'{proj} 已经存在，不覆盖')
    proj.mkdir(parents=True)
    rep = {'__NO__': str(no), '__CN__': cn(no), '__NAME__': name, '__SEED__': str(zlib.crc32(f'{no}-{slug}'.encode()) % 100000000),
           '__CONTAINER__': look['container'], '__BACKDROP__': look['backdrop'], '__GLOW__': look['glow']}
    for src, dst in (('world.template.js', 'world.js'), ('造境方案.md', '造境方案.md')):
        text = (SKILL / 'templates' / src).read_text(encoding='utf-8')
        for k, v in rep.items():
            text = text.replace(k, v)
        (proj / dst).write_text(text, encoding='utf-8')
    index = series / '系列境单.md'
    if not index.exists():
        index.write_text('# 方寸之境 · 系列境单\n\n| 序号 | 境名 | 目录 | 外观 | 一奇 | 状态 |\n|---|---|---|---|---|---|\n', encoding='utf-8')
    with index.open('a', encoding='utf-8') as f:
        zh = {'cube': '立方体', 'dome': '钟罩', 'sphere': '球', 'space': '深空', 'desk': '桌面', 'plain': '纯色', 'normal': '适中', 'soft': '柔和', 'strong': '强烈'}
        f.write(f'| {no:02d} | {name} | `{proj.name}/` | {zh[look["container"]]} · {zh[look["backdrop"]]} · {zh[look["glow"]]} | | 造境中 |\n')
    print(proj)


if __name__ == '__main__':
    main()
