import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { appVersion } from './appInfo';
import { toLocalISO } from './date';

// Kopia zapasowa = wszystkie dane aplikacji z localStorage (dziennik, przepisy, waga, woda,
// plan, spiżarnia, ustawienia) w jednym pliku JSON. Bez kluczy API (plik bywa wysyłany
// mailem albo trzymany na Dysku) i bez pamięci podręcznych, które aplikacja odtworzy sama.
const EXCLUDED = new Set(['geminiApiKey', 'groqApiKey', 'openrouterApiKey', 'spoonacularApiKey', 'lastBackupAt']);
const EXCLUDED_PREFIX = ['onlineRecipeCache_'];
const isBackedUp = (k: string) => !EXCLUDED.has(k) && !EXCLUDED_PREFIX.some((p) => k.startsWith(p));

export interface BackupFile {
  app: 'KulinApp';
  format: 1;
  created: string;
  version: string;
  data: Record<string, string>;
}

export function buildBackup(): BackupFile {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && isBackedUp(k)) data[k] = localStorage.getItem(k) ?? '';
  }
  return { app: 'KulinApp', format: 1, created: new Date().toISOString(), version: appVersion, data };
}

/** Zapisuje kopię: na telefonie przez systemowe „Udostępnij” (Dysk, e-mail, Pliki), w przeglądarce jako pobranie. */
export async function exportBackup(): Promise<void> {
  const json = JSON.stringify(buildBackup());
  const name = `kulinapp-kopia-${toLocalISO()}.json`;
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: 'Kopia zapasowa KulinApp', text: 'Kopia danych KulinApp', files: [uri], dialogTitle: 'Zapisz kopię zapasową' });
  } else {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  try { localStorage.setItem('lastBackupAt', new Date().toISOString()); } catch { /* brak miejsca */ }
}

/** Sprawdza plik kopii; rzuca błąd z czytelnym komunikatem, gdy to nie jest kopia KulinApp. */
export function parseBackup(text: string): BackupFile {
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { throw new Error('To nie jest plik kopii KulinApp (nieprawidłowy format).'); }
  const b = obj as Partial<BackupFile>;
  if (b?.app !== 'KulinApp' || b.format !== 1 || !b.data || typeof b.data !== 'object') {
    throw new Error('To nie jest plik kopii KulinApp.');
  }
  for (const v of Object.values(b.data)) if (typeof v !== 'string') throw new Error('Plik kopii jest uszkodzony.');
  return b as BackupFile;
}

/** Zastępuje dane aplikacji danymi z kopii (klucze API na tym telefonie zostają). Po wywołaniu przeładuj aplikację. */
export function restoreBackup(b: BackupFile): void {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && isBackedUp(k)) toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
  for (const [k, v] of Object.entries(b.data)) if (isBackedUp(k)) localStorage.setItem(k, v);
}

/** Krótki opis zawartości kopii do okna potwierdzenia. */
export function describeBackup(b: BackupFile): string {
  const count = (key: string) => {
    try { const v = JSON.parse(b.data[key] ?? '[]'); return Array.isArray(v) ? v.length : 0; } catch { return 0; }
  };
  // Odmiana: 1 wpis, 2–4 wpisy, 5+ wpisów (12–14 też „wpisów”).
  const pl = (n: number, one: string, few: string, many: string) =>
    `${n} ${n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many}`;
  const date = new Date(b.created).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
  return `Kopia z ${date} (wersja ${b.version}): ${pl(count('foodDiary'), 'wpis', 'wpisy', 'wpisów')} w dzienniku, `
    + `${pl(count('myRecipes'), 'przepis', 'przepisy', 'przepisów')}, ${pl(count('weightLog'), 'pomiar', 'pomiary', 'pomiarów')} wagi.`;
}
