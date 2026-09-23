import { LocalNotifications } from '@capacitor/local-notifications';

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

export async function requestPermission(): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleReminder(r: MealReminder): Promise<void> {
  const now = new Date();
  const at = new Date(now);
  at.setHours(r.hour, r.minute, 0, 0);
  if (at <= now) at.setDate(at.getDate() + 1);

  await LocalNotifications.schedule({
    notifications: [{
      id: r.id,
      title: '🍽️ KulinApp — czas na posiłek!',
      body: `Pamiętaj o wpisaniu ${r.label} do dziennika kalorii`,
      schedule: { at, repeats: true, every: 'day' },
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
