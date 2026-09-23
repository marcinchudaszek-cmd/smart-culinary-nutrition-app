import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAppStore, FoodEntry } from '../store/useAppStore';
import { todayISO, toLocalISO } from '../lib/date';

type Range = 7 | 14 | 30;

function getDayLabel(dateStr: string, range: Range) {
  const d = new Date(dateStr);
  if (range === 7)  return d.toLocaleDateString('pl-PL', { weekday: 'short' });
  if (range === 14) return `${d.getDate()}.${d.getMonth()+1}`;
  return String(d.getDate());
}

function sumMacro(entries: FoodEntry[], key: keyof FoodEntry) {
  return entries.reduce((s, e) => s + (e[key] as number), 0);
}

export default function CalorieStatsTab() {
  const { foodDiary, dailyGoal, proteinGoal, carbsGoal, fatGoal } = useAppStore();
  const [range, setRange]   = useState<Range>(7);
  const [macro, setMacro]   = useState<'calories' | 'protein' | 'carbs' | 'fat'>('calories');

  const days = useMemo(() => {
    return Array.from({ length: range }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (range - 1 - i));
      return toLocalISO(d);
    });
  }, [range]);

  const data = useMemo(() =>
    days.map(date => {
      const entries = foodDiary.filter(e => e.date === date);
      return {
        date,
        calories: Math.round(sumMacro(entries, 'calories')),
        protein:  Math.round(sumMacro(entries, 'protein')),
        carbs:    Math.round(sumMacro(entries, 'carbs')),
        fat:      Math.round(sumMacro(entries, 'fat')),
        hasData:  entries.length > 0,
      };
    }), [days, foodDiary]);

  const goals: Record<typeof macro, number> = {
    calories: dailyGoal, protein: proteinGoal, carbs: carbsGoal, fat: fatGoal,
  };
  const goal = goals[macro];

  const values   = data.map(d => d[macro]);
  const chartMax = Math.max(...values, goal) * 1.15 || 1;

  const avg = values.filter((_, i) => data[i].hasData).reduce((s, v) => s + v, 0)
    / (data.filter(d => d.hasData).length || 1);

  const macroConfig = {
    calories: { label: 'Kalorie', unit: 'kcal', color: 'bg-orange-400', barActive: 'bg-orange-500', textColor: 'text-orange-600' },
    protein:  { label: 'Białko',  unit: 'g',    color: 'bg-blue-400',   barActive: 'bg-blue-500',   textColor: 'text-blue-600' },
    carbs:    { label: 'Węgle',   unit: 'g',    color: 'bg-yellow-400', barActive: 'bg-yellow-500', textColor: 'text-yellow-600' },
    fat:      { label: 'Tłuszcz', unit: 'g',    color: 'bg-red-400',    barActive: 'bg-red-500',    textColor: 'text-red-600' },
  };
  const cfg = macroConfig[macro];

  // Weekly totals for summary
  const totals = {
    calories: data.reduce((s, d) => s + d.calories, 0),
    protein:  data.reduce((s, d) => s + d.protein,  0),
    carbs:    data.reduce((s, d) => s + d.carbs,    0),
    fat:      data.reduce((s, d) => s + d.fat,      0),
  };

  const avgDiff = avg - goal;
  const TrendIcon = avgDiff > 50 ? TrendingUp : avgDiff < -50 ? TrendingDown : Minus;
  const trendColor = avgDiff > 50 ? 'text-red-500' : avgDiff < -50 ? 'text-green-500' : 'text-gray-400';

  const daysLogged   = data.filter(d => d.hasData).length;
  const daysInGoal   = data.filter(d => d.hasData && d.calories <= dailyGoal * 1.05).length;

  return (
    <div className="space-y-4">

      {/* Macro selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(Object.entries(macroConfig) as [typeof macro, typeof cfg][]).map(([key, c]) => (
          <button key={key} onClick={() => setMacro(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              macro === key ? `${c.color} text-white` : 'bg-gray-100 text-gray-500'
            }`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Range selector */}
      <div className="flex gap-1.5">
        {([7, 14, 30] as Range[]).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              range === r ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
            {r} dni
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
            <BarChart3 size={16} className={cfg.textColor} /> {cfg.label} ({range} dni)
          </h3>
          <div className="flex items-center gap-1">
            <TrendIcon size={14} className={trendColor} />
            <span className={`text-xs font-semibold ${trendColor}`}>
              śr. {Math.round(avg)} {cfg.unit}
            </span>
          </div>
        </div>

        {/* Bar chart */}
        <div className="relative">
          {/* Goal line */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-orange-300 z-10 pointer-events-none"
            style={{ bottom: `${(goal / chartMax) * 100}%` }}
          >
            <span className="absolute right-0 -top-4 text-[9px] text-orange-400 font-bold bg-white px-1">
              cel {goal}{cfg.unit}
            </span>
          </div>

          {/* Bars */}
          <div className="flex items-end gap-1" style={{ height: '140px' }}>
            {data.map((d) => {
              const val = d[macro];
              const h   = chartMax > 0 ? (val / chartMax) * 100 : 0;
              const isToday = d.date === todayISO();
              const overGoal = val > goal * 1.05;
              const barColor = !d.hasData ? 'bg-gray-100'
                : overGoal ? 'bg-red-400'
                : isToday ? cfg.barActive
                : cfg.color;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                  {d.hasData && val > 0 && (
                    <span className="text-[8px] text-gray-400 mb-0.5 leading-none">
                      {val > 999 ? `${(val/1000).toFixed(1)}k` : val}
                    </span>
                  )}
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${barColor} ${isToday ? 'ring-2 ring-offset-1 ring-orange-400' : ''}`}
                    style={{ height: `${Math.max(h, d.hasData ? 3 : 1)}%` }}
                  />
                  <span className={`text-[8px] mt-1 ${isToday ? 'font-bold text-orange-500' : 'text-gray-400'}`}>
                    {getDayLabel(d.date, range)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-3 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-sm ${cfg.color}`} /> OK</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400" /> Powyżej celu</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-100 border border-gray-200" /> Brak danych</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Średnia / cel</p>
          <p className={`text-xl font-bold ${avgDiff > 50 ? 'text-red-500' : avgDiff < -50 ? 'text-green-500' : 'text-gray-800'}`}>
            {Math.round(avg)} <span className="text-sm font-normal text-gray-400">/ {goal}</span>
          </p>
          <p className="text-xs text-gray-400">{cfg.unit} dziennie</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Dni w celu</p>
          <p className="text-xl font-bold text-green-500">
            {daysInGoal} <span className="text-sm font-normal text-gray-400">/ {daysLogged}</span>
          </p>
          <p className="text-xs text-gray-400">dni z wpisami</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Łącznie {cfg.label.toLowerCase()}</p>
          <p className="text-xl font-bold text-gray-800">{Math.round(totals[macro])}</p>
          <p className="text-xs text-gray-400">{cfg.unit} / {range} dni</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Dni z wpisami</p>
          <p className="text-xl font-bold text-orange-500">{daysLogged}</p>
          <p className="text-xs text-gray-400">z {range} dni</p>
        </div>
      </div>

      {/* Macro breakdown for the period */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">Makro łącznie ({range} dni)</h3>
        {[
          { label: 'Białko',  val: totals.protein,  goal: proteinGoal * range, color: 'bg-blue-400',   unit: 'g' },
          { label: 'Węgle',   val: totals.carbs,    goal: carbsGoal   * range, color: 'bg-yellow-400', unit: 'g' },
          { label: 'Tłuszcz', val: totals.fat,      goal: fatGoal     * range, color: 'bg-red-400',    unit: 'g' },
        ].map(({ label, val, goal: g, color, unit }) => (
          <div key={label} className="mb-3 last:mb-0">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{label}</span>
              <span className="font-semibold">{Math.round(val)}{unit} <span className="text-gray-400 font-normal">/ {g}{unit}</span></span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min((val / (g || 1)) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
