import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore, type FoodEntry } from '../store/useAppStore';
import { useBackHandler } from '../lib/backButton';

const MEALS: { id: FoodEntry['mealType']; label: string }[] = [
  { id: 'breakfast', label: '🌅 Śniadanie' },
  { id: 'lunch', label: '☀️ Obiad' },
  { id: 'dinner', label: '🌙 Kolacja' },
  { id: 'snack', label: '🍎 Przekąska' },
];

const r1 = (x: number) => Math.round(x * 10) / 10;

// Edycja wpisu w dzienniku: ilość (kalorie i makro przeliczają się proporcjonalnie), posiłek, nazwa.
export default function EditEntrySheet({ entry, onClose }: { entry: FoodEntry; onClose: () => void }) {
  const updateFoodEntry = useAppStore((s) => s.updateFoodEntry);
  useBackHandler(true, onClose);
  const [name, setName] = useState(entry.name);
  const [amount, setAmount] = useState(entry.amount);
  const [mealType, setMealType] = useState(entry.mealType);

  // Wpis bez ilości (np. AI bez porcji) — skalowanie od 1, żeby dało się poprawić.
  const base = entry.amount > 0 ? entry.amount : 1;
  const factor = amount > 0 ? amount / base : 0;
  const preview = Math.round(entry.calories * factor);

  const save = () => {
    if (!(amount > 0)) { toast.error('Podaj ilość większą od zera'); return; }
    if (!name.trim()) { toast.error('Podaj nazwę'); return; }
    updateFoodEntry({
      ...entry,
      name: name.trim(),
      mealType,
      amount,
      calories: Math.round(entry.calories * factor),
      protein: r1(entry.protein * factor),
      carbs: r1(entry.carbs * factor),
      fat: r1(entry.fat * factor),
    });
    toast.success('Wpis zmieniony');
    onClose();
  };

  const unitLabel = entry.unit === '100g' ? 'g' : entry.unit === '100ml' ? 'ml' : entry.unit;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center pb-[var(--sa-bottom)]">
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-lg">Edytuj wpis</h3>
          <button onClick={onClose} aria-label="Zamknij"><X size={22} className="text-gray-400" /></button>
        </div>

        <label className="text-xs text-gray-500 font-medium mb-1 block">Nazwa</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 mb-3"
        />

        <label className="text-xs text-gray-500 font-medium mb-1 block">Ilość ({unitLabel})</label>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={amount || ''}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-orange-400"
        />
        <p className="text-center text-orange-500 font-bold mt-1 mb-4">
          = {preview} kcal · B {r1(entry.protein * factor)} g · W {r1(entry.carbs * factor)} g · T {r1(entry.fat * factor)} g
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {MEALS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMealType(m.id)}
              className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                mealType === m.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-600 font-medium">Anuluj</button>
          <button onClick={save} className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold">Zapisz</button>
        </div>
      </div>
    </div>
  );
}
