// Daty dzienne w aplikacji (dziennik, plan posiłków) liczymy wg LOKALNEJ strefy
// czasowej użytkownika, a nie UTC. Wcześniej używaliśmy date.toISOString().split('T')[0],
// co dla Polski (UTC+1/+2) powodowało, że wpisy dodane po północy trafiały do
// poprzedniego dnia. Te dwie funkcje zwracają poprawny dzień "YYYY-MM-DD".

export function toLocalISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Skrót na "dzisiaj" wg lokalnej strefy.
export function todayISO(): string {
  return toLocalISO();
}
