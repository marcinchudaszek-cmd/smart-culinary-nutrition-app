import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface MealReminder {
  id: number;
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
}

export const DEFAULT_REMINDERS: MealReminder[] = [
  { id: 1, label: 'Śniadanie', hour: 8,  minute: 0, enabled: false },
  { id: 2, label: 'Obiad',     hour: 13, minute: 0, enabled: false },
  { id: 3, label: 'Kolacja',   hour: 19, minute: 0, enabled: false },
];

const REMINDERS_KEY = 'mealReminders';

export function loadReminders(): MealReminder[] {
  try { return JSON.parse(localStorage.getItem(REMINDERS_KEY) ?? 'null') ?? DEFAULT_REMINDERS; }
  catch { return DEFAULT_REMINDERS; }
}

export function saveReminders(r: MealReminder[]) {
  try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(r)); } catch { /* brak miejsca */ }
}

export async function requestPermission(): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

// Codziennie o wskazanej godzinie. NIE używamy `at` + `repeats` — wtyczka liczy
// wtedy odstęp jako „czas do pierwszego powiadomienia" (np. co 11 h zamiast
// co dobę). `on` z godziną i minutą wtyczka przelicza na kolejny dzień sama.
export async function scheduleReminder(r: MealReminder): Promise<void> {
  await LocalNotifications.schedule({
    notifications: [{
      id: r.id,
      title: '🍽️ KulinApp — czas na posiłek!',
      body: `Pamiętaj o wpisaniu ${r.label} do dziennika kalorii`,
      schedule: { on: { hour: r.hour, minute: r.minute }, allowWhileIdle: true },
    }],
  });
}

export async function cancelReminder(id: number): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {}
}

export async function syncReminders(reminders: MealReminder[]): Promise<void> {
  for (const r of reminders) {
    await cancelReminder(r.id);
    if (r.enabled) await scheduleReminder(r);
  }
}

// Przy starcie aplikacji: przeplanuj włączone przypomnienia. Naprawia to
// powiadomienia zaplanowane starą, błędną metodą (bez wchodzenia w Ustawienia).
export async function resyncRemindersOnStart(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const reminders = loadReminders();
  if (!reminders.some((r) => r.enabled)) return;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;
    await syncReminders(reminders);
  } catch { /* brak wtyczki / uprawnień — pomijamy */ }
}
