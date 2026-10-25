import { create } from 'zustand';
import { persist } from './useAppStore';
import { toLocalISO } from '../lib/date';
import {
  addDays, daysLeft, estimateShelfDays, type PantryCategory, type PantryItem,
} from '../lib/pantry';

// Spiżarnia ma osobny store — główny useAppStore ma już ponad 2 tys. linii,
// a stan spiżarni nie miesza się z dziennikiem kalorii.

export interface PantryReminder {
  enabled: boolean;
  hour: number;
}

export interface NewPantryItem {
  name: string;
  category: PantryCategory;
  quantity?: string;
  price?: number;
  /** Data z opakowania; bez niej termin jest szacowany z kategorii. */
  expiresAt?: string;
}

interface PantryState {
  items: PantryItem[];
  reminder: PantryReminder;
  addItems: (items: NewPantryItem[]) => void;
  updateItem: (id: string, patch: Partial<PantryItem>) => void;
  /** Zjedzone albo wyrzucone — produkt znika z listy, ale zostaje w statystykach. */
  closeItem: (id: string, status: 'eaten' | 'wasted') => void;
  /** Cofa zamknięcie (przycisk „Cofnij” w powiadomieniu toast). */
  reopenItem: (id: string) => void;
  /** Usuwa całkiem — dla pomyłek, nie liczy się do statystyk. */
  removeItem: (id: string) => void;
  setReminder: (r: PantryReminder) => void;
}

const ITEMS_KEY = 'pantryItems';
const REMINDER_KEY = 'pantryReminder';
// Zamknięte pozycje trzymamy do statystyk, ale nie w nieskończoność.
const HISTORY_DAYS = 400;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadItems(): PantryItem[] {
  const cutoff = addDays(toLocalISO(), -HISTORY_DAYS);
  return load<PantryItem[]>(ITEMS_KEY, []).filter((i) => i.status === 'active' || (i.closedAt ?? '') >= cutoff);
}

let seq = 0;
const newId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`;

export const usePantryStore = create<PantryState>((set, get) => {
  const save = (items: PantryItem[]) => {
    persist(ITEMS_KEY, items);
    set({ items });
  };

  return {
    items: loadItems(),
    reminder: load<PantryReminder>(REMINDER_KEY, { enabled: false, hour: 17 }),

    addItems: (incoming) => {
      const today = toLocalISO();
      const created: PantryItem[] = incoming
        .filter((n) => n.name.trim())
        .map((n) => ({
          id: newId(),
          name: n.name.trim(),
          category: n.category,
          quantity: n.quantity?.trim() ?? '',
          price: n.price && n.price > 0 ? Math.round(n.price * 100) / 100 : undefined,
          addedAt: today,
          expiresAt: n.expiresAt || addDays(today, estimateShelfDays(n.name, n.category)),
          estimated: !n.expiresAt,
          status: 'active',
        }));
      save([...created, ...get().items]);
    },

    updateItem: (id, patch) =>
      save(get().items.map((i) => (i.id === id ? { ...i, ...patch } : i))),

    closeItem: (id, status) => {
      const today = toLocalISO();
      save(get().items.map((i) => (i.id === id
        ? { ...i, status, closedAt: today, daysLeftWhenClosed: daysLeft(i.expiresAt, today) }
        : i)));
    },

    reopenItem: (id) =>
      save(get().items.map((i) => (i.id === id
        ? { ...i, status: 'active', closedAt: undefined, daysLeftWhenClosed: undefined }
        : i))),

    removeItem: (id) => save(get().items.filter((i) => i.id !== id)),

    setReminder: (reminder) => {
      persist(REMINDER_KEY, reminder);
      set({ reminder });
    },
  };
});

export interface PantryStats {
  eaten: number;
  wasted: number;
  /** Zjedzone, gdy zostały ≤ 2 dni — realnie uratowane przed koszem. */
  rescued: number;
  eatenValue: number;
  wastedValue: number;
  rescuedValue: number;
  /** Ile pozycji miało cenę — żeby uczciwie pokazać, że kwoty są niepełne. */
  pricedCount: number;
}

/** Statystyki z bieżącego miesiąca kalendarzowego. */
export function monthStats(items: PantryItem[], today: string = toLocalISO()): PantryStats {
  const month = today.slice(0, 7);
  const s: PantryStats = { eaten: 0, wasted: 0, rescued: 0, eatenValue: 0, wastedValue: 0, rescuedValue: 0, pricedCount: 0 };
  for (const i of items) {
    if (i.status === 'active' || !i.closedAt?.startsWith(month)) continue;
    const v = i.price ?? 0;
    if (i.price) s.pricedCount++;
    if (i.status === 'wasted') { s.wasted++; s.wastedValue += v; continue; }
    s.eaten++; s.eatenValue += v;
    if ((i.daysLeftWhenClosed ?? 99) <= 2) { s.rescued++; s.rescuedValue += v; }
  }
  return s;
}
