import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { addDays, daysLeft, type PantryItem } from './pantry';
import { toLocalISO } from './date';
import type { PantryReminder } from '../store/usePantryStore';

// Przypomnienie o produktach z kończącym się terminem. Treść zależy od stanu
// spiżarni, więc zamiast jednego powtarzalnego powiadomienia planujemy osobne
// na kilka najbliższych dni i przeplanowujemy je po każdej zmianie listy.
// Identyfikatory 9101+ nie kolidują z przypomnieniami o posiłkach (1–3).
const BASE_ID = 9101;
const DAYS_AHEAD = 4;
export const PANTRY_NOTIFICATION_IDS = Array.from({ length: DAYS_AHEAD }, (_, i) => BASE_ID + i);

function bodyFor(names: string[]): string {
  const shown = names.slice(0, 3).join(', ');
  const rest = names.length - 3;
  return rest > 0 ? `${shown} i ${rest} inne. Zjedzone? Wyrzucone? Zajrzyj do spiżarni.` : `${shown}. Zjedzone? Wyrzucone? Zajrzyj do spiżarni.`;
}

export async function schedulePantryReminders(items: PantryItem[], reminder: PantryReminder): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: PANTRY_NOTIFICATION_IDS.map((id) => ({ id })) });
    if (!reminder.enabled) return;
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;

    const now = new Date();
    const today = toLocalISO(now);
    const active = items.filter((i) => i.status === 'active');
    const notifications = [];
    for (let d = 0; d < DAYS_AHEAD; d++) {
      const day = addDays(today, d);
      const [y, m, dd] = day.split('-').map(Number);
      const at = new Date(y, m - 1, dd, reminder.hour, 0, 0);
      if (at <= now) continue;
      // Tego dnia: produkty, którym zostało ≤ 1 dzień (po terminie też — trzeba zdecydować).
      const urgent = active
        .filter((i) => daysLeft(i.expiresAt, day) <= 1)
        .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
        .map((i) => i.name);
      if (!urgent.length) continue;
      notifications.push({
        id: BASE_ID + d,
        title: `🥬 Kończy się termin (${urgent.length})`,
        body: bodyFor(urgent),
        schedule: { at, allowWhileIdle: true },
        extra: { view: 'pantry' },
      });
    }
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch { /* brak wtyczki albo uprawnień — spiżarnia działa i bez powiadomień */ }
}
