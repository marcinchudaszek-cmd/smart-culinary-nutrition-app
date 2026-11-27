# Zdjęcia przepisów — stan prac (26.11.2026)

Cel: wszystkie 444 przepisy z autentycznymi zdjęciami (Commons + AI z Canvy), hostowane na
beagleapps.pl/apps/kulinapp/zdjecia/<id>.webp, z podpisami autorów w aplikacji.

## Zrobione
- `wybor.json`: 178 zdjęć (wydane w 3.17.0, 27.11) — 171 z Wikimedia Commons (przejrzane ręcznie), 7 z AI (`ai/*.jpg`).
- `brak.json` (`node scripts/zdjecia/brak.mjs`): 266 przepisów bez zdjęcia — do wygenerowania w Canvie.
- Aplikacja: `src/data/photoCredits.ts` + podpis w `RecipeDetailView.tsx` (wydane w 3.17.0).
- **Reszta (266) po odnowieniu kredytów AI w Canvie** — potem `publikuj.py`, nowa wersja, push aplikacji i strony.

## Jak generować (sprawdzone)
1. `generate-image`, `aspectRatio: LANDSCAPE_16_9`, kolaż 3 kolumny × 2 rzędy (6 potraw, kolejność wierszami).
   Szablon promptu: zob. siatkę 1 w historii — „Kolaż 3 kolumny × 2 rzędy: sześć osobnych, autentycznych
   zdjęć domowych potraw… jak zrobione telefonem w polskiej domowej kuchni… Górny rząd od lewej: 1…, dolny…”.
2. `create-design`, `format: "Presentation (16:9)"`, `references: [mediaId]`, brief „wyłącznie załączony obraz
   na całą stronę, bez tekstu”.
3. `export-design` jpg **bez width/height** (z parametrem rozmiaru Canva zwraca „Not allowed to access design”)
   → 1920×1080, pole 640×540.
4. `python scripts/zdjecia/tnij-siatke.py siatka.jpg "id1 … id6"` (`-` pomija pole).
5. Gdy komplet: `python scripts/zdjecia/publikuj.py` → webp na stronie, podmiana `thumbnail`, podpisy.
   Potem podgląd, wersja 3.17.0 (79), AAB, push aplikacji i strony.

Już wygenerowane, czekają na create-design: siatka 2 = media `MAHcCoITk9E`
(s2 s4 s6 s7 s8 m1 — pierwsze 6 z `brak.json`).
Grupy po 6: `node -e "const b=require('./scripts/zdjecia/brak.json');for(let i=0;i<b.length;i+=6)console.log(b.slice(i,i+6).map(x=>x[0]+':'+x[1]).join(' | '))"`
