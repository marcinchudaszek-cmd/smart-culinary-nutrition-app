import { useState } from 'react';
import { ArrowLeft, Scale, TrendingUp, TrendingDown, Minus, Target, Trash2, Plus } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import BadgesSection from '../components/BadgesSection';
import toast from 'react-hot-toast';
import { todayISO } from '../lib/date';

function calcBMI(weight: number, height: number): number {
  if (!weight || !height) return 0;
  return weight / Math.pow(height / 100, 2);
}

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Niedowaga', color: 'text-blue-500' };
  if (bmi < 25)   return { label: 'Norma ✓',   color: 'text-green-500' };
  if (bmi < 30)   return { label: 'Nadwaga',    color: 'text-yellow-500' };
  return            { label: 'Otyłość',          color: 'text-red-500' };
}

export default function ProgressView() {
  const { setActiveView, weightLog, addWeightEntry, removeWeightEntry, userProfile, targetWeight, setTargetWeight } = useAppStore();
  const [newWeight, setNewWeight] = useState('');
  const [newDate, setNewDate] = useState(todayISO());
  const [targetInput, setTargetInput] = useState(targetWeight > 0 ? String(targetWeight) : '');

  const sorted = [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const prev   = sorted[sorted.length - 2];

  const bmi = calcBMI(latest?.weight ?? userProfile.weight, userProfile.height);
  const bmiInfo = bmiCategory(bmi);

  const chartData = sorted.slice(-12); // max 12 entries in chart
  const chartMin = chartData.length ? Math.floor(Math.min(...chartData.map(e => e.weight)) - 2) : 50;
  const chartMax = chartData.length ? Math.ceil(Math.max(...chartData.map(e => e.weight)) + 2) : 100;
  const chartRange = chartMax - chartMin || 1;

  function handleAdd() {
    const w = parseFloat(newWeight);
    if (!w || w < 20 || w > 300) { toast.error('Podaj prawidłową wagę (20–300 kg)'); return; }
    addWeightEntry({ date: newDate, weight: w });
    setNewWeight('');
    toast.success(`Zapisano ${w} kg`);
  }

  function handleSetTarget() {
    const t = parseFloat(targetInput);
    if (!t || t < 20 || t > 300) { toast.error('Podaj prawidłową wagę docelową'); return; }
    setTargetWeight(t);
    toast.success(`Cel: ${t} kg`);
  }

  const diff = latest && prev ? (latest.weight - prev.weight) : null;

  return (
    <div className="pb-24 bg-gray-50 dark:bg-gray-900 min-h-dvh">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white px-5 pt-12 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setActiveView('home')} className="bg-white/20 rounded-xl p-2">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Postępy</h1>
            <p className="text-purple-200 text-xs">Śledzenie wagi i BMI</p>
          </div>
        </div>

        {/* BMI + latest weight */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/20 rounded-2xl p-4">
            <p className="text-purple-200 text-xs mb-1">Aktualna waga</p>
            <p className="text-3xl font-bold">{latest?.weight ?? '—'}<span className="text-lg font-normal"> kg</span></p>
            {diff !== null && (
              <div className="flex items-center gap-1 mt-1">
                {diff < 0 ? <TrendingDown size={14} className="text-green-300" /> :
                 diff > 0 ? <TrendingUp size={14} className="text-red-300" /> :
                 <Minus size={14} className="text-white/60" />}
                <span className={`text-xs font-medium ${diff < 0 ? 'text-green-300' : diff > 0 ? 'text-red-300' : 'text-white/60'}`}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                </span>
              </div>
            )}
          </div>
          <div className="bg-white/20 rounded-2xl p-4">
            <p className="text-purple-200 text-xs mb-1">BMI</p>
            {bmi > 0 ? (
              <>
                <p className="text-3xl font-bold">{bmi.toFixed(1)}</p>
                <p className={`text-xs font-medium mt-1 ${bmiInfo.color.replace('text-', 'text-')}`} style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {bmiInfo.label}
                </p>
              </>
            ) : (
              <p className="text-sm text-white/60 mt-2">Uzupełnij profil w Ustawieniach</p>
            )}
          </div>
        </div>

        {/* Target weight */}
        {targetWeight > 0 && latest && (
          <div className="mt-3 bg-white/10 rounded-xl px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-purple-200" />
              <span className="text-sm text-purple-100">Cel: <strong>{targetWeight} kg</strong></span>
            </div>
            <span className="text-sm font-semibold">
              {(latest.weight - targetWeight) > 0
                ? `${(latest.weight - targetWeight).toFixed(1)} kg do celu`
                : '🎯 Cel osiągnięty!'}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 mt-5 space-y-4">
        {/* Add weight */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Scale size={18} className="text-purple-500" /> Dodaj pomiar
          </h3>
          <div className="flex gap-2 mb-2">
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <input
              type="number"
              placeholder="kg"
              value={newWeight}
              onChange={e => setNewWeight(e.target.value)}
              step="0.1"
              className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <button
              onClick={handleAdd}
              className="bg-purple-500 text-white rounded-xl px-4 py-2 font-semibold text-sm hover:bg-purple-600 active:scale-95 transition-all flex items-center gap-1"
            >
              <Plus size={16} />
            </button>
          </div>
          {/* Target weight */}
          <div className="flex gap-2 mt-3">
            <input
              type="number"
              placeholder="Waga docelowa (kg)"
              value={targetInput}
              onChange={e => setTargetInput(e.target.value)}
              step="0.5"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <button
              onClick={handleSetTarget}
              className="bg-indigo-100 text-indigo-700 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-indigo-200 active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap"
            >
              <Target size={14} /> Ustaw cel
            </button>
          </div>
        </div>

        {/* Chart */}
        {chartData.length >= 2 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-purple-500" /> Wykres wagi
            </h3>
            <div className="relative h-36">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-2">
                <span>{chartMax}</span>
                <span>{Math.round((chartMax + chartMin) / 2)}</span>
                <span>{chartMin}</span>
              </div>
              {/* Chart area */}
              <div className="ml-8 h-full flex items-end gap-1">
                {chartData.map((e, i) => {
                  const heightPct = ((e.weight - chartMin) / chartRange) * 100;
                  const isLatest = i === chartData.length - 1;
                  return (
                    <div key={e.date} className="flex-1 flex flex-col items-center justify-end h-full">
                      <span className="text-[9px] text-gray-500 mb-0.5">{e.weight}</span>
                      <div
                        className={`w-full rounded-t-lg transition-all ${isLatest ? 'bg-purple-500' : 'bg-purple-200'}`}
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                      <span className="text-[8px] text-gray-400 mt-0.5 text-center leading-tight">
                        {e.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Target line */}
              {targetWeight > 0 && targetWeight >= chartMin && targetWeight <= chartMax && (
                <div
                  className="absolute left-8 right-0 border-t-2 border-dashed border-green-400 opacity-70"
                  style={{ bottom: `${((targetWeight - chartMin) / chartRange) * 100}%` }}
                >
                  <span className="absolute right-0 -top-3.5 text-[9px] text-green-600 font-semibold bg-green-50 px-1 rounded">
                    cel {targetWeight}kg
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BMI scale */}
        {bmi > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">Skala BMI</h3>
            <div className="relative h-3 rounded-full overflow-hidden flex">
              <div className="flex-1 bg-blue-300" />
              <div className="flex-[1.3] bg-green-400" />
              <div className="flex-1 bg-yellow-400" />
              <div className="flex-1 bg-red-400" />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Niedowaga</span><span>Norma</span><span>Nadwaga</span><span>Otyłość</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-gray-700">
                Twoje BMI: <strong className={bmiInfo.color}>{bmi.toFixed(1)}</strong> — {bmiInfo.label}
              </span>
            </div>
          </div>
        )}

        {/* Weight log */}
        {sorted.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">Historia pomiarów</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {[...sorted].reverse().map((e) => (
                <div key={e.date} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{e.weight} kg</span>
                    <span className="text-xs text-gray-400 ml-2">{e.date}</span>
                  </div>
                  <button
                    onClick={() => removeWeightEntry(e.date)}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {sorted.length === 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <Scale size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Brak pomiarów</p>
            <p className="text-gray-400 text-sm mt-1">Dodaj pierwszy pomiar wagi powyżej</p>
          </div>
        )}

        {/* Badges */}
        <BadgesSection />
      </div>
    </div>
  );
}
