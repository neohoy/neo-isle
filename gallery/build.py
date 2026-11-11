#!/usr/bin/env python3
"""NEO-Isle · 示例页生成

  python3 gallery/build.py           构建各境的可运行页面（docs/isles/），生成 docs/index.html，刷新两份 README 里的境列表
  python3 gallery/build.py --shots   另外把全部预览图重出一遍（慢：每张约 15 秒，三张并行）

要加一境：把它的 world.js 放进 examples/，在 gallery/catalog.json 的 isles 里加一项，然后带 --shots 跑一次。
"""
import concurrent.futures, html, json, pathlib, re, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
GAL, DOCS = ROOT / 'gallery', ROOT / 'docs'
CAT = json.loads((GAL / 'catalog.json').read_text(encoding='utf-8'))
CONTAINERS = [('cube', '立方体', 'Cube'), ('dome', '钟罩', 'Dome'), ('sphere', '球', 'Sphere')]
BACKDROPS = [('space', '深空', 'Deep space'), ('desk', '桌面', 'Desk'), ('plain', '纯色', 'Plain')]
HOURS = [('t07', 7, '晨', 'Dawn'), ('t12', 12.5, '午', 'Noon'), ('t17', 17.6, '昏', 'Dusk'), ('t22', 22.5, '夜', 'Night')]
CN_NUM = '零一二三四五六七八九十'
esc = html.escape


def build_isles():
    """把 examples 里的每个世界文件构建成 docs/isles/<slug>/index.html"""
    for isle in CAT['isles']:
        with tempfile.TemporaryDirectory() as tmp:
            proj = pathlib.Path(tmp) / isle['slug']
            proj.mkdir()
            shutil.copy(ROOT / isle['source'] / 'world.js', proj / 'world.js')
            subprocess.run([sys.executable, str(ROOT / 'scripts' / 'build.py'), str(proj)], check=True, stdout=subprocess.DEVNULL)
            out = DOCS / 'isles' / isle['slug']
            out.mkdir(parents=True, exist_ok=True)
            shutil.copy(proj / 'out' / 'preview.html', out / 'index.html')
        print('境', isle['slug'])


def shot(job):
    name, slug, hour, w, h, extra, out_w, folder = job
    out = DOCS / folder / f'{name}.jpg'
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        png = pathlib.Path(tmp) / 'a.png'
        subprocess.run(['sh', str(ROOT / 'scripts' / 'shot.sh'), str(DOCS / 'isles' / slug / 'index.html'), str(png), str(hour), str(w), str(h), extra],
                       check=True, stdout=subprocess.DEVNULL)
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '--resampleWidth', str(out_w), str(png), '--out', str(out)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return out.name


def all_shots():
    jobs = []
    for isle in CAT['isles']:
        s = isle['slug']
        jobs.append((f'{s}-cover', s, isle['cover_hour'], 1600, 1200, '', 1400, 'img'))
        jobs.append((f'{s}-poster', s, isle['best_hour'], 1920, 1200, 'dist=1.12', 1600, 'img'))           # 主视觉里，真的境还没跑起来之前先垫着的那张
        for key, hour, _, _ in HOURS:
            jobs.append((f'{s}-{key}', s, hour, 1200, 900, '', 900, 'img'))
    for c, _, _ in CONTAINERS:
        for b, _, _ in BACKDROPS:
            jobs.append((f'look-{c}-{b}', CAT['look_isle'], CAT['look_hour'], 1200, 900, f'container={c}&backdrop={b}', 800, 'img'))
    for r in CAT['readme_shots']:
        jobs.append((r['name'], r['isle'], r['hour'], 1200, 900, r['extra'], 1000, 'readme'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        for i, name in enumerate(ex.map(shot, jobs), 1):
            print(f'图 {i}/{len(jobs)} {name}', flush=True)


def plates():
    out = []
    for i, isle in enumerate(CAT['isles'][::-1]):                       # 最新的一境排在最前
        s, n = isle['slug'], int(isle['num'])
        hours = ''.join(
            f'<button type="button" data-img="img/{s}-{key}.jpg" aria-pressed="false"><b lang="zh">{cn}</b><span>{en}</span></button>'
            for key, _, cn, en in HOURS)
        out.append(f'''
<article class="isle{' flip' if i % 2 else ''}" id="{s}">
  <div class="isle-view">
    <img class="isle-img" src="img/{s}-cover.jpg" data-cover="img/{s}-cover.jpg" alt="{esc(isle['en'])}, isle {isle['num']}" width="1400" height="1050" loading="lazy">
    <div class="hours" role="group" aria-label="Time of day · 时辰">{hours}</div>
  </div>
  <div class="isle-text">
    <h3><span lang="zh">{esc(isle['cn'])}</span><i>Isle {isle['num']} · {esc(isle['en'])} · <span lang="zh">第{CN_NUM[n]}境</span></i></h3>
    <p class="line">{esc(isle['line'])}</p>
    <p class="line-cn" lang="zh">{esc(isle['line_cn'])}</p>
    <p class="wonder"><span>{esc(isle['wonder'])}</span><span lang="zh">{esc(isle['wonder_cn'])}</span></p>
    <div class="acts">
      <button type="button" class="enter" data-isle="{s}">Step in <span lang="zh">走进去</span></button>
      <a href="isles/{s}/">Full page <span lang="zh">整页打开</span></a>
      <a href="https://github.com/{CAT['repo']}/tree/main/{isle['source']}">World file <span lang="zh">世界文件</span></a>
    </div>
  </div>
</article>''')
    return '\n'.join(out)


def looks():
    head = '<tr><td></td>' + ''.join(f'<th scope="col"><span lang="zh">{cn}</span>{en}</th>' for _, cn, en in BACKDROPS) + '</tr>'
    rows = []
    for c, ccn, cen in CONTAINERS:
        cells = ''.join(
            f'<td><button type="button" class="look" data-container="{c}" data-backdrop="{b}"><img src="img/look-{c}-{b}.jpg" alt="{cen} on {ben.lower()}" width="800" height="600" loading="lazy"></button></td>'
            for b, _, ben in BACKDROPS)
        rows.append(f'<tr><th scope="row"><span lang="zh">{ccn}</span>{cen}</th>{cells}</tr>')
    return f'<table class="looks"><thead>{head}</thead><tbody>{"".join(rows)}</tbody></table>'


def index():
    tpl = (GAL / 'template.html').read_text(encoding='utf-8')
    latest = CAT['isles'][-1]
    data = {'isles': [{'slug': i['slug'], 'num': i['num'], 'cn': i['cn'], 'en': i['en'], 'hour': i['best_hour']} for i in CAT['isles']], 'start': latest['slug']}
    page = (tpl.replace('{{PLATES}}', plates()).replace('{{LOOKS}}', looks())
               .replace('{{DATA}}', json.dumps(data, ensure_ascii=False))
               .replace('{{REPO}}', CAT['repo']).replace('{{SITE}}', CAT['site'])
               .replace('{{COUNT}}', str(len(CAT['isles']))).replace('{{POSTER}}', f"img/{latest['slug']}-poster.jpg")
               .replace('{{BRIEF}}', esc((GAL / 'brief.txt').read_text(encoding='utf-8').strip()))
               .replace('{{BRIEFEN}}', esc((GAL / 'brief.en.txt').read_text(encoding='utf-8').strip())))
    left = re.findall(r'\{\{[A-Z]+\}\}', page)
    if left:
        sys.exit(f'模板里还有没替换的占位符：{left}')
    (DOCS / 'index.html').write_text(page, encoding='utf-8')
    (DOCS / '.nojekyll').write_text('', encoding='utf-8')
    print('首页 docs/index.html')


def readme_tables():
    """两份 README 里 <!-- isles:start --> 到 <!-- isles:end --> 之间的境列表由这里生成，不要手改"""
    for name, zh in (('README.md', False), ('README.zh-CN.md', True)):
        p = ROOT / name
        if not p.exists():
            continue
        cells = []
        for isle in CAT['isles'][::-1]:
            title = f"<b>{isle['cn']}</b><br>{isle['en']}" if zh else f"<b>{isle['en']}</b><br>{isle['cn']}"
            line = isle['line_cn'] if zh else isle['line']
            wonder = isle['wonder_cn'] if zh else isle['wonder']
            cells.append(f'<td width="50%" valign="top"><a href="{CAT["site"]}#{isle["slug"]}"><img src="docs/img/{isle["slug"]}-cover.jpg" alt="{isle["en"]}"></a><br>'
                         f'{isle["num"]} · {title}<br><sub>{line} {wonder}</sub></td>')
        if len(cells) % 2:
            cells.append('<td width="50%" valign="top"></td>')
        rows = ''.join(f'<tr>\n{cells[i]}\n{cells[i + 1]}\n</tr>\n' for i in range(0, len(cells), 2))
        table = f'<!-- isles:start -->\n\n<table>\n{rows}</table>\n\n<!-- isles:end -->'
        text = p.read_text(encoding='utf-8')
        new, n = re.subn(r'<!-- isles:start -->.*?<!-- isles:end -->', lambda m: table, text, flags=re.S)
        if n:
            p.write_text(new, encoding='utf-8')
            print('境列表', name)


if __name__ == '__main__':
    build_isles()
    if '--shots' in sys.argv:
        all_shots()
    if (GAL / 'template.html').exists():
        index()
    readme_tables()
