#!/bin/sh
# 方寸之境 · 出图：用无界面 Chrome 把某一境在指定时辰截成一张图（封面、检查用的定帧都用它）
#
#   sh shot.sh <html 文件> <输出.png> [时辰=17.6] [宽=1600] [高=2000] [附加网址参数]
#
# 例：sh shot.sh P/out/preview.html P/out/check-0700.png 7 1200 900
#     sh shot.sh P/01-xxx-v001.html P/01-xxx-cover-v001.png 17.6 1600 2000 "az=0.9&pol=1.0&dist=0.9"
# 附加参数：az 方位角、pol 俯仰角（弧度，越小越俯视）、dist 距离倍数、tx/ty/tz 注视点、tilt=0 关移轴；
#           container=cube|dome|sphere、backdrop=space|desk|plain、glow=soft|normal|strong 可以临时换外观来比较。
set -e
HTML="$1"; OUT="$2"; HOUR="${3:-17.6}"; W="${4:-1600}"; H="${5:-2000}"; EXTRA="$6"
[ -f "$HTML" ] || { echo "找不到 $HTML" >&2; exit 1; }
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
[ -n "$CHROME" ] && [ -x "$CHROME" ] || { echo "找不到 Chrome：装一个，或用环境变量 CHROME 指定路径" >&2; exit 1; }
ABS="$(cd "$(dirname "$HTML")" && pwd)/$(basename "$HTML")"
URL="file://$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$ABS")?shot=1&hour=$HOUR${EXTRA:+&$EXTRA}"
mkdir -p "$(dirname "$OUT")"
LOG="$(mktemp)"
"$CHROME" --headless=new --hide-scrollbars --enable-unsafe-swiftshader --allow-file-access-from-files \
  --enable-logging=stderr --v=0 \
  --window-size="$W,$H" --force-device-scale-factor=1 --virtual-time-budget=20000 \
  --screenshot="$OUT" "$URL" >/dev/null 2>"$LOG" || true
# 页面里的脚本报错会让画面整片发黑，这里把它们带出来（world.js 写错时第一眼就能看到原因）
ERRS="$(grep -E 'CONSOLE.*(Uncaught|Error|failed|WebGL|方寸之境)' "$LOG" | sed -E 's/^\[[^]]*\] //' | head -8 || true)"
rm -f "$LOG"
[ -z "$ERRS" ] || { echo "页面报错：" >&2; echo "$ERRS" >&2; }
[ -s "$OUT" ] || { echo "没截出图：页面需要联网加载 three.js，确认网络后重试" >&2; exit 1; }
echo "$OUT"
