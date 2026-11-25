import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Minutnik gotowania niezależny od ekranu. Zamiast odliczać co sekundę (WebView zwalnia
// liczniki przy wygaszonym ekranie) zapamiętuje godzinę końca, a koniec ogłasza systemowym
// powiadomieniem — dzwoni nawet przy zamkniętej aplikacji. Stan przeżywa restart aplikacji.
export const TIMER_NOTIFICATION_ID = 9201;
const KEY = 'cookingTimer';

interface TimerState {
  total: number;              // sekundy wybrane w presecie
  endAt: number | null;       // ms — odliczanie trwa
  pausedLeft: number | null;  // sekundy — pauza
  label: string;              // nazwa przepisu do powiadomienia
  done: boolean;
  setPreset: (seconds: number, label: string) => void;
  start: (label: string) => void;
  pause: () => void;
  reset: () => void;
  finish: () => void;
}

type Saved = Pick<TimerState, 'total' | 'endAt' | 'pausedLeft' | 'label' | 'done'>;
const load = (): Saved => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null;
    if (s) return s;
  } catch { /* brak danych */ }
  return { total: 600, endAt: null, pausedLeft: null, label: '', done: false };
};
const save = (s: Saved) => {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* brak miejsca */ }
};

async function notifyAt(endAt: number, label: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted' && (await LocalNotifications.requestPermissions()).display !== 'granted') return;
    await LocalNotifications.cancel({ notifications: [{ id: TIMER_NOTIFICATION_ID }] });
    await LocalNotifications.schedule({
      notifications: [{
        id: TIMER_NOTIFICATION_ID,
        title: '⏰ Czas minął!',
        body: label ? `Minutnik: ${label}` : 'Minutnik gotowania skończył odliczanie',
        schedule: { at: new Date(endAt), allowWhileIdle: true },
      }],
    });
  } catch { /* bez powiadomienia minutnik działa w aplikacji */ }
}
function cancelNotify() {
  if (!Capacitor.isNativePlatform()) return;
  LocalNotifications.cancel({ notifications: [{ id: TIMER_NOTIFICATION_ID }] }).catch(() => {});
}

export const useCookingTimer = create<TimerState>((set, get) => {
  const commit = (patch: Partial<Saved>) => {
    set(patch);
    const { total, endAt, pausedLeft, label, done } = get();
    save({ total, endAt, pausedLeft, label, done });
  };
  return {
    ...load(),
    setPreset: (seconds, label) => { cancelNotify(); commit({ total: seconds, endAt: null, pausedLeft: null, done: false, label }); },
    start: (label) => {
      const s = get();
      const left = s.pausedLeft ?? s.total;
      const endAt = Date.now() + left * 1000;
      commit({ endAt, pausedLeft: null, done: false, label: label || s.label });
      void notifyAt(endAt, label || s.label);
    },
    pause: () => {
      const { endAt } = get();
      if (!endAt) return;
      cancelNotify();
      commit({ endAt: null, pausedLeft: Math.max(0, Math.round((endAt - Date.now()) / 1000)) });
    },
    reset: () => { cancelNotify(); commit({ endAt: null, pausedLeft: null, done: false }); },
    finish: () => commit({ endAt: null, pausedLeft: null, done: true }),
  };
});

/** Pozostałe sekundy, odświeżane co sekundę, gdy minutnik chodzi. */
export function useTimerLeft(): number {
  const { endAt, pausedLeft, total } = useCookingTimer();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!endAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [endAt]);
  if (endAt) return Math.max(0, Math.ceil((endAt - now) / 1000));
  return pausedLeft ?? total;
}

export function fmtTimer(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
