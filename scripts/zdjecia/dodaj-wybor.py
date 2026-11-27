"""Dopisuje przyjęte zdjęcia z pliku kandydatów do wybor.json.
Użycie: python dodaj-wybor.py kandydaci.json "id1 id2 ..." ["cel=źródło ..."]  (cel=źródło: zdjęcie kandydata źródła dla przepisu cel)"""
import json, sys
src = json.load(open(sys.argv[1], encoding='utf-8'))
w = json.load(open('scripts/zdjecia/wybor.json', encoding='utf-8'))
used = {v['title'] for v in w.values()}
pairs = [(k, k) for k in sys.argv[2].split()] + [tuple(p.split('=')) for p in (sys.argv[3].split() if len(sys.argv) > 3 else [])]
for target, source in pairs:
    c = src[source]['candidates'][0]
    if c['title'] in used:
        print('pomijam duplikat', target, c['title']); continue
    used.add(c['title'])
    w[target] = {'source': 'commons', 'thumb': c['thumb'], 'author': c['artist'], 'license': c['license'], 'page': c['page'], 'title': c['title']}
json.dump(w, open('scripts/zdjecia/wybor.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('commons razem', len(w))
