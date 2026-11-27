"""Publikuje wybrane zdjęcia przepisów.
Wejście: scripts/zdjecia/wybor.json  {id_przepisu: {"source":"commons", "thumb":url, "author", "license", "page"}
                                      | {"source":"ai", "file": ścieżka_lokalna}}
Robi: pobiera/przycina do 4:3 (640x480, WebP) -> moje-aplikacje-strona/apps/kulinapp/zdjecia/<id>.webp,
      podmienia `thumbnail` w src/data/polishRecipes.ts (i w przepisach przykładowych o tej samej nazwie),
      generuje src/data/photoCredits.ts.
Uruchom z katalogu projektu: python scripts/zdjecia/publikuj.py"""
import io, json, os, re, sys, time, urllib.request
from PIL import Image, ImageOps

SITE = r'C:\Users\Ezra\Desktop\Projekty\moje-aplikacje-strona\apps\kulinapp\zdjecia'
BASE = 'https://beagleapps.pl/apps/kulinapp/zdjecia/'
UA = 'KulinApp/3.17 (https://beagleapps.pl; beagleappsstudio@gmail.com) recipe-photo-publisher'
os.makedirs(SITE, exist_ok=True)
wybor = json.load(open('scripts/zdjecia/wybor.json', encoding='utf-8'))

def load(entry):
    if entry['source'] == 'ai':
        return Image.open(entry['file'])
    url = re.sub(r'/(\d+)px-', '/960px-', entry['thumb'])  # większa miniatura z Commons
    for i in range(4):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=40).read()
            return Image.open(io.BytesIO(data))
        except Exception as e:
            if i == 1:
                url = entry['thumb']  # część plików nie ma wersji 960 px
            time.sleep(3 * (i + 1))
    raise RuntimeError('nie pobrano ' + entry['thumb'])

done = 0
for rid, e in wybor.items():
    out = os.path.join(SITE, f'{rid}.webp')
    if os.path.exists(out) and not e.get('force'):
        done += 1
        continue
    img = ImageOps.exif_transpose(load(e)).convert('RGB')
    img = ImageOps.fit(img, (640, 480), Image.LANCZOS, centering=(0.5, 0.5))
    img.save(out, 'WEBP', quality=74, method=6)
    done += 1
    if e['source'] == 'commons':
        time.sleep(0.4)
print('zdjęć gotowych:', done)

# podmiana adresów w katalogu
cat_path = 'src/data/polishRecipes.ts'
cat = open(cat_path, encoding='utf-8').read()
names = {}
for rid in wybor:
    m = re.search(r"id: '" + re.escape(rid) + r"', name: '((?:[^'\\]|\\.)*)'", cat)
    if not m:
        sys.exit('brak przepisu ' + rid)
    names[m.group(1).lower()] = rid
    start = m.start()
    tm = re.compile(r"thumbnail: '[^']*'").search(cat, start)
    cat = cat[:tm.start()] + f"thumbnail: '{BASE}{rid}.webp'" + cat[tm.end():]
open(cat_path, 'w', encoding='utf-8', newline='\n').write(cat)

# przepisy przykładowe (Moje) o tej samej nazwie dostają to samo zdjęcie
st_path = 'src/store/useAppStore.ts'
st = open(st_path, encoding='utf-8').read()
a = st.index('const SAMPLE_RECIPES')
b = st.index('\n];', a)
block = st[a:b]
def sub_sample(m):
    name = m.group(2).lower()
    rid = names.get(name)
    return m.group(0) if not rid else m.group(1) + re.sub(r"thumbnail:\s*'[^']*'", f"thumbnail: '{BASE}{rid}.webp'", m.group(3), count=1)
block2, n = re.subn(r"(name: '((?:[^'\\]|\\.)*)',)([\s\S]*?thumbnail:\s*'[^']*')", sub_sample, block)
st = st[:a] + block2 + st[b:]
open(st_path, 'w', encoding='utf-8', newline='\n').write(st)

# podpisy
lines = []
for rid, e in sorted(wybor.items()):
    if e['source'] == 'ai':
        lines.append(f"  '{rid}.webp': {{ source: 'ai' }},")
    else:
        esc = lambda s: s.replace('\\', '\\\\').replace("'", "\\'")
        lines.append(f"  '{rid}.webp': {{ source: 'commons', author: '{esc(e['author'][:60])}', license: '{esc(e['license'])}', url: '{esc(e['page'])}' }},")
cred_path = 'src/data/photoCredits.ts'
cred = open(cred_path, encoding='utf-8').read()
cred = re.sub(r"export const PHOTO_CREDITS: Record<string, PhotoCredit> = \{[\s\S]*?\n?\};",
              "export const PHOTO_CREDITS: Record<string, PhotoCredit> = {\n" + "\n".join(lines) + "\n};", cred)
open(cred_path, 'w', encoding='utf-8', newline='\n').write(cred)
print('podpisów:', len(lines))
