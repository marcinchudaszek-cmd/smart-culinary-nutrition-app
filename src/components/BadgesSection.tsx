import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { calcLongestStreak, calcStreak } from '../lib/streak';
import { todayISO } from '../lib/date';

interface Badge {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  earned: boolean;
  progress?: number; // 0–100
}

export default function BadgesSection() {
  const {
    foodDiary, dailyGoal, waterLog, waterGoal,
    weightLog, myRecipes, favoriteIds,
  } = useAppStore();

  const badges: Badge[] = useMemo(() => {
    const today = todayISO();

    // Diary stats
    const loggedDays  = new Set(foodDiary.map(e => e.date));
    const totalDays   = loggedDays.size;
    const streak      = calcStreak(foodDiary);
    const longest     = calcLongestStreak(foodDiary);
    const totalMeals  = foodDiary.length;

    // Days within calorie goal (±10%)
    const calByDay: Record<string, number> = {};
    foodDiary.forEach(e => { calByDay[e.date] = (calByDay[e.date] ?? 0) + e.calories; });
    const daysOnGoal = Object.values(calByDay).filter(c => c >= dailyGoal * 0.9 && c <= dailyGoal * 1.1).length;

    // Water stats
    const waterByDay: Record<string, number> = {};
    waterLog.forEach(e => { waterByDay[e.date] = (waterByDay[e.date] ?? 0) + e.amount; });
    const waterGoalDays = Object.values(waterByDay).filter(a => a >= waterGoal).length;
    const todayWater = waterByDay[today] ?? 0;

    // Weight
    const weightEntries = weightLog.length;

    // Recipes & favourites
    const recipesCount    = myRecipes.length;
    const favouritesCount = favoriteIds.length;

    return [
      // ── Logging badges ──────────────────────────────────────────────
      {
        id: 'first_meal',
        emoji: '🍽️',
        label: 'Pierwszy wpis',
        desc: 'Dodano pierwszy posiłek do dziennika',
        earned: totalMeals >= 1,
      },
      {
        id: 'log_7',
        emoji: '📅',
        label: 'Tydzień nawyku',
        desc: 'Dziennik uzupełniany przez 7 dni',
        earned: totalDays >= 7,
        progress: Math.min((totalDays / 7) * 100, 100),
      },
      {
        id: 'log_30',
        emoji: '📆',
        label: 'Miesięczny maraton',
        desc: '30 dni z wpisami w dzienniku',
        earned: totalDays >= 30,
        progress: Math.min((totalDays / 30) * 100, 100),
      },
      // ── Streak badges ────────────────────────────────────────────────
      {
        id: 'streak_3',
        emoji: '🔥',
        label: 'Mini seria',
        desc: '3 dni pod rząd z wpisami',
        earned: streak >= 3 || longest >= 3,
        progress: Math.min((Math.max(streak, longest) / 3) * 100, 100),
      },
      {
        id: 'streak_7',
        emoji: '🔥🔥',
        label: 'Tygodniowa seria',
        desc: '7 dni pod rząd z wpisami',
        earned: streak >= 7 || longest >= 7,
        progress: Math.min((Math.max(streak, longest) / 7) * 100, 100),
      },
      {
        id: 'streak_14',
        emoji: '🔥🔥🔥',
        label: '2-tygodniowa seria',
        desc: '14 dni pod rząd z wpisami',
        earned: streak >= 14 || longest >= 14,
        progress: Math.min((Math.max(streak, longest) / 14) * 100, 100),
      },
      // ── Goal badges ──────────────────────────────────────────────────
      {
        id: 'goal_1',
        emoji: '🎯',
        label: 'W celu!',
        desc: 'Osiągnięto dzienny cel kalorii',
        earned: daysOnGoal >= 1,
      },
      {
        id: 'goal_7',
        emoji: '🏆',
        label: 'Dyscyplina tygodnia',
        desc: '7 dni w granicach celu kalorycznego',
        earned: daysOnGoal >= 7,
        progress: Math.min((daysOnGoal / 7) * 100, 100),
      },
      {
        id: 'goal_30',
        emoji: '👑',
        label: 'Mistrz diety',
        desc: '30 dni w granicach celu',
        earned: daysOnGoal >= 30,
        progress: Math.min((daysOnGoal / 30) * 100, 100),
      },
      // ── Water badges ─────────────────────────────────────────────────
      {
        id: 'water_first',
        emoji: '💧',
        label: 'Pierwsze nawodnienie',
        desc: 'Osiągnięto dzienny cel nawodnienia',
        earned: waterGoalDays >= 1,
      },
      {
        id: 'water_7',
        emoji: '🌊',
        label: 'Hydro-mistrz',
        desc: '7 dni z wypełnionym celem wody',
        earned: waterGoalDays >= 7,
        progress: Math.min((waterGoalDays / 7) * 100, 100),
      },
      {
        id: 'water_today',
        emoji: '🥤',
        label: 'Dziś nawodniony',
        desc: 'Wypito dzienny cel wody dzisiaj',
        earned: todayWater >= waterGoal,
        progress: Math.min((todayWater / waterGoal) * 100, 100),
      },
      // ── Weight badges ─────────────────────────────────────────────────
      {
        id: 'weight_first',
        emoji: '⚖️',
        label: 'Pierwsza waga',
        desc: 'Dodano pierwszy wpis wagi',
        earned: weightEntries >= 1,
      },
      {
        id: 'weight_10',
        emoji: '📊',
        label: 'Śledzenie postępów',
        desc: '10 pomiarów wagi w historii',
        earned: weightEntries >= 10,
        progress: Math.min((weightEntries / 10) * 100, 100),
      },
      // ── Recipe badges ─────────────────────────────────────────────────
      {
        id: 'recipe_1',
        emoji: '📖',
        label: 'Kucharz amator',
        desc: 'Dodano pierwszy własny przepis',
        earned: recipesCount >= 1,
      },
      {
        id: 'recipe_5',
        emoji: '👨‍🍳',
        label: 'Kucharz pasjonat',
        desc: '5 własnych przepisów w kolekcji',
        earned: recipesCount >= 5,
        progress: Math.min((recipesCount / 5) * 100, 100),
      },
      {
        id: 'fav_5',
        emoji: '❤️',
        label: 'Kolekcjoner smaków',
        desc: '5 przepisów w ulubionych',
        earned: favouritesCount >= 5,
        progress: Math.min((favouritesCount / 5) * 100, 100),
      },
      // ── Milestone badges ─────────────────────────────────────────────
      {
        id: 'meals_50',
        emoji: '🍴',
        label: 'Gourmet',
        desc: '50 posiłków w dzienniku łącznie',
        earned: totalMeals >= 50,
        progress: Math.min((totalMeals / 50) * 100, 100),
      },
      {
        id: 'meals_200',
        emoji: '🌟',
        label: 'Legenda diety',
        desc: '200 posiłków w dzienniku łącznie',
        earned: totalMeals >= 200,
        progress: Math.min((totalMeals / 200) * 100, 100),
      },
    ];
  }, [foodDiary, dailyGoal, waterLog, waterGoal, weightLog, myRecipes, favoriteIds]);

  const earned  = badges.filter(b => b.earned);
  const locked  = badges.filter(b => !b.earned);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 text-sm">🏅 Odznaki</h3>
        <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2.5 py-0.5 rounded-full">
          {earned.length} / {badges.length}
        </span>
      </div>

      {earned.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">
          Zacznij logować posiłki, by zdobyć pierwsze odznaki!
        </p>
      )}

      {/* Earned */}
      {earned.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {earned.map(b => (
            <div key={b.id} className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-100 rounded-xl p-2.5 text-center">
              <p className="text-2xl mb-1">{b.emoji}</p>
              <p className="text-[10px] font-bold text-gray-700 leading-tight">{b.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Locked (show first 6 with progress) */}
      {locked.length > 0 && (
        <>
          <p className="text-xs text-gray-400 font-medium mb-2">Do zdobycia:</p>
          <div className="space-y-2">
            {locked.slice(0, 6).map(b => (
              <div key={b.id} className="flex items-center gap-3 py-1.5">
                <span className="text-xl grayscale opacity-40">{b.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-gray-500">{b.label}</p>
                    {b.progress !== undefined && (
                      <p className="text-[10px] text-gray-400">{Math.round(b.progress)}%</p>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">{b.desc}</p>
                  {b.progress !== undefined && (
                    <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-orange-300 rounded-full transition-all duration-500"
                        style={{ width: `${b.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
