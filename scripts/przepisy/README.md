# Dodawanie przepisów do katalogu

`src/data/polishRecipes.ts` (tablica `POLISH_RECIPES`) nie edytuje się ręcznie przy większych partiach.

- `skladniki.mjs` — baza składników: kcal, białko, węglowodany, tłuszcz na 100 g.
- `dane/*.mjs` — partie przepisów (wersja 3.15.0: fit, Wigilia, Boże Narodzenie). Składnik to
  `[nazwa, ilość do wyświetlenia, gramy, klucz w bazie]`; klucz `null` = 0 kcal (przyprawy, woda).
- `dodaj-przepisy.mjs` — liczy kalorie i makro (pole `macros`), nadaje kolejne id, sprawdza
  unikalność nazw, wstawia przepisy na koniec katalogu.

Gramy podawaj dla części jadalnej (karp, gęś, indyk, nóżki — bez kości), inaczej kalorie na
porcję wyjdą zawyżone. Uruchomienie (nowa partia, NIE ponownie te z `dane/` — już są w katalogu):

```
node scripts/przepisy/dodaj-przepisy.mjs src/data/polishRecipes.ts src/store/useAppStore.ts <plik-z-partia.mjs>
```

Uwaga: sekcja `MOVE` w skrypcie przenosi wskazane przepisy do kategorii — przy nowej partii wyczyść ją.
