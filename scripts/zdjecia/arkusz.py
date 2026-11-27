"""Arkusze przeglądowe: siatka miniatur kandydatów (pierwszy kandydat każdego przepisu) z numerem i nazwą.
Użycie: python scripts/zdjecia/arkusz.py kandydaci.json katalog_wyjsciowy [rozmiar_strony]
Pobrane miniatury trafiają do katalog_wyjsciowy/cache (nie pobiera drugi raz)."""
import json, os, sys, io, hashlib, time, urllib.request
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
per_page = int(sys.argv[3]) if len(sys.argv) > 3 else 30
os.makedirs(os.path.join(out, 'cache'), exist_ok=True)
data = json.load(open(src, encoding='utf-8'))
UA = 'KulinApp/3.16 (https://beagleapps.pl; beagleappsstudio@gmail.com) review-sheet'
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 15)
fontb = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 17)

def fetch(url):
    path = os.path.join(out, 'cache', hashlib.md5(url.encode()).hexdigest() + '.jpg')
    if not os.path.exists(path):
        for i in range(3):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': UA})
                data = urllib.request.urlopen(req, timeout=30).read()
                Image.open(io.BytesIO(data)).convert('RGB').save(path, quality=80)
                break
            except Exception:
                time.sleep(2 * (i + 1))
        else:
            return None
    return Image.open(path)

items = [(rid, v) for rid, v in data.items() if v['candidates']]
W, H, CAP, COLS = 300, 200, 46, 6
for page in range(0, len(items), per_page):
    chunk = items[page:page + per_page]
    rows = (len(chunk) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * W, rows * (H + CAP)), 'white')
    d = ImageDraw.Draw(sheet)
    for i, (rid, v) in enumerate(chunk):
        c = v['candidates'][0]
        x, y = (i % COLS) * W, (i // COLS) * (H + CAP)
        img = fetch(c['thumb'])
        if img:
            img.thumbnail((W - 6, H - 6))
            sheet.paste(img, (x + (W - img.width) // 2, y + (H - img.height) // 2))
        d.rectangle([x, y + H, x + W, y + H + CAP], fill='#111')
        d.text((x + 6, y + H + 2), f"{page + i + 1}. {rid}  ({c['score']:.2f})", font=fontb, fill='#ffd54f')
        d.text((x + 6, y + H + 23), v['name'][:34], font=font, fill='white')
    name = os.path.join(out, f'arkusz-{page // per_page + 1:02d}.jpg')
    sheet.save(name, quality=82)
    print(name)
