"""Tnie siatkę zdjęć z Canvy (3 kolumny x 2 rzędy) na osobne zdjęcia przepisów i dopisuje je do wybor.json.
Użycie: python scripts/zdjecia/tnij-siatke.py siatka.jpg "id1 id2 id3 id4 id5 id6"
Id "-" pomija pole (np. nieudane). Pliki: scripts/zdjecia/ai/<id>.jpg"""
import json, os, sys
from PIL import Image

src, ids = sys.argv[1], sys.argv[2].split()
cols, rows = 3, 2
img = Image.open(src).convert('RGB')
W, H = img.size
cw, ch = W / cols, H / rows
m = round(W * 0.006)  # margines na białe linie podziału
os.makedirs('scripts/zdjecia/ai', exist_ok=True)
wybor = json.load(open('scripts/zdjecia/wybor.json', encoding='utf-8'))
for i, rid in enumerate(ids):
    if rid == '-':
        continue
    c, r = i % cols, i // cols
    box = (round(c * cw) + m, round(r * ch) + m, round((c + 1) * cw) - m, round((r + 1) * ch) - m)
    path = f'scripts/zdjecia/ai/{rid}.jpg'
    img.crop(box).save(path, quality=93)
    wybor[rid] = {'source': 'ai', 'file': path, 'force': True}
json.dump(wybor, open('scripts/zdjecia/wybor.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{src} {W}x{H} -> {len([x for x in ids if x != "-"])} zdjęć, wybor razem {len(wybor)}')
