// Lista nowości pokazywana w okienku „Co nowego” po aktualizacji aplikacji.
// Przy każdym wydaniu dopisz wpis NA POCZĄTKU (wersja = versionName z android/app/build.gradle).
export interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.18.0',
    date: 'listopad 2026',
    items: [
      'Powiadomienie o nowej wersji — aktualizację pobierzesz prosto z aplikacji',
      'Okienko „Co nowego” po każdej aktualizacji',
      'Poprawione ilości składników, kalorie i makro w części przepisów',
      'Usunięte zdublowane przepisy w katalogu',
    ],
  },
  {
    version: '3.17.0',
    date: 'listopad 2026',
    items: [
      'Prawdziwe zdjęcia potraw przy 178 przepisach (z Wikimedia Commons, z podpisem autora)',
    ],
  },
  {
    version: '3.16.0',
    date: 'listopad 2026',
    items: [
      'Menu wigilijne z listą zakupów i planem przygotowań',
      'Kopia zapasowa danych w Ustawieniach',
      'Edycja i cofanie wpisów w dzienniku, minutnik gotowania',
      'Makroskładniki we wszystkich przepisach',
    ],
  },
];

const KEY = 'kulinapp.lastSeenVersion';

function cmp(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

function read(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function markVersionSeen(version: string) {
  try { localStorage.setItem(KEY, version); } catch { /* bez pamięci */ }
}

/**
 * Wpisy do pokazania po aktualizacji. Pusta lista = nic nie pokazujemy.
 * Nowa instalacja (onboarding jeszcze nie przeszedł) tylko zapamiętuje wersję.
 * Użytkownik sprzed wersji 3.18.0 nie ma zapisanej wersji — pokazujemy mu dwa ostatnie wydania.
 */
export function pendingChangelog(current: string, existingUser: boolean): ChangelogEntry[] {
  const seen = read();
  if (seen === current) return [];
  if (!existingUser) {
    markVersionSeen(current);
    return [];
  }
  const upToCurrent = CHANGELOG.filter((e) => cmp(e.version, current) <= 0);
  if (!seen) return upToCurrent.slice(0, 2);
  return upToCurrent.filter((e) => cmp(e.version, seen) > 0).slice(0, 4);
}
