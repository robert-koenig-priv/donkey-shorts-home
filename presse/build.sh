#!/bin/sh
# Erzeugt Flyer (PDF) und Band-Image (JPG) für den Download-Bereich im Stage Rider
# aus presse/flyer.html und presse/bandbild.html. Benötigt Google Chrome (macOS).
set -e
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=../assets/downloads
TMP=$(mktemp -d)

# Für ein kleines PDF: Fotos und Logo verkleinert (≈ 300 dpi bei Flyergröße) in TMP ablegen
mkdir -p "$TMP/fotos"
# Mitgliederfotos schon hier in Graustufen umwandeln: der CSS-Graustufenfilter würde
# sie im PDF als großes Pixelbild einbetten
GRAY="/System/Library/ColorSync/Profiles/Generic Gray Gamma 2.2 Profile.icc"
for f in ../assets/fotos/*.jpg ../assets/fotos/*.png; do
  n=$(basename "$f"); n="${n%.*}"
  sips -Z 700 -s format jpeg -s formatOptions 75 -m "$GRAY" "$f" --out "$TMP/fotos/$n.jpg" >/dev/null
done
sips -Z 700 -s format jpeg -s formatOptions 75 ../assets/img/logo.png --out "$TMP/fotos/logo.jpg" >/dev/null
sed -E -e 's#\.\./assets/(fotos|img)/([A-Za-z]+)\.(jpg|png)#fotos/\2.jpg#g' \
       -e 's#filter:grayscale\(1\) contrast\(1\.1\) brightness\(\.9\);##' flyer.html > "$TMP/flyer.html"

"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files \
  --virtual-time-budget=5000 --no-pdf-header-footer \
  --print-to-pdf="$OUT/donkey-shorts-flyer.pdf" "file://$TMP/flyer.html"

"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files \
  --virtual-time-budget=5000 --hide-scrollbars \
  --window-size=1600,900 --force-device-scale-factor=2 \
  --screenshot="$TMP/bandbild.png" "file://$PWD/bandbild.html"
sips -s format jpeg -s formatOptions 90 "$TMP/bandbild.png" --out "$OUT/donkey-shorts-bandbild.jpg" >/dev/null

# Vorschaubild des Flyers für die Download-Karte
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files \
  --virtual-time-budget=5000 --hide-scrollbars \
  --window-size=794,1123 \
  --screenshot="$TMP/flyer.png" "file://$PWD/flyer.html"
sips -s format jpeg -s formatOptions 80 "$TMP/flyer.png" --out "$OUT/donkey-shorts-flyer-vorschau.jpg" >/dev/null

rm -rf "$TMP"
ls -lh "$OUT"
