import { FoodEntry } from '../store/useAppStore';
import { toLocalISO } from './date';

/** Returns the current logging streak (consecutive days ending today with ≥1 entry). */
export function calcStreak(foodDiary: FoodEntry[]): number {
  if (foodDiary.length === 0) return 0;

  const logged = new Set(foodDiary.map(e => e.date));
  let streak = 0;
  const d = new Date();

  // Start from today; if today has no entries yet, start from yesterday
  const todayStr = toLocalISO(d);
  if (!logged.has(todayStr)) {
    d.setDate(d.getDate() - 1);
  }

  while (true) {
    const dateStr = toLocalISO(d);
    if (!logged.has(dateStr)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }

  return streak;
}

/** Returns the longest ever logging streak. */
export function calcLongestStreak(foodDiary: FoodEntry[]): number {
  if (foodDiary.length === 0) return 0;

  const logged = Array.from(new Set(foodDiary.map(e => e.date))).sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < logged.length; i++) {
    const prev = new Date(logged[i - 1] + 'T12:00:00');
    const curr = new Date(logged[i]     + 'T12:00:00');
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}
