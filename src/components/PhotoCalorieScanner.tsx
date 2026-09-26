import { useState, useRef } from 'react';
import {
  X, Camera, Image as ImageIcon, Loader,
  Plus, Edit3, Check, AlertTriangle,
} from 'lucide-react';
import { Camera as CapCamera, CameraSource, CameraResultType } from '@capacitor/camera';
import { useAppStore, activeAI } from '../store/useAppStore';
import { callAI, parseAiJson } from '../lib/aiProvider';
import toast from 'react-hot-toast';
import { todayISO } from '../lib/date';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '🌅 Śniadanie', lunch: '☀️ Obiad',
  dinner: '🌙 Kolacja',     snack: '🍎 Przekąska',
};

interface AnalysisResult {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: string;
  notes?: string;
}

const PROMPT = `Jesteś ekspertem żywieniowym. Przeanalizuj to zdjęcie posiłku i oszacuj jego wartości odżywcze.

Odpowiedz WYŁĄCZNIE jako JSON (bez markdown):
{
  "name": "nazwa potrawy po polsku",
  "portion": "szacunkowa porcja np. '300 g' lub '1 talerz (ok. 350 g)'",
  "calories": 450,
  "protein": 25,
  "carbs": 45,
  "fat": 15,
  "confidence": "wysoka",
  "notes": "ewentualne uwagi, np. trudno ocenić ilość sosu"
}

Podaj realistyczne wartości dla widocznej porcji. Confidence: wysoka/średnia/niska.`;

export default function PhotoCalorieScanner({ onClose }: { onClose: () => void }) {
  const store = useAppStore();
  const { aiProvider, addFoodEntry } = store;

  const [imageUrl, setImageUrl]     = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<AnalysisResult | null>(null);
  const [editMode, setEditMode]     = useState(false);
  const [edited, setEdited]         = useState<AnalysisResult | null>(null);
  const [mealType, setMealType]     = useState<MealType>('lunch');
  const [added, setAdded]           = useState(false);
  const [customGrams, setCustomGrams] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Wyciąga liczbę gramów z tekstu porcji np. "250 g" → 250, "1 talerz (ok. 350 g)" → 350
  function parsePortion(portion: string): number {
    const match = portion.match(/(\d+(?:[.,]\d+)?)\s*g/i);
    return match ? parseFloat(match[1].replace(',', '.')) : 100;
  }

  const { apiKey, model } = activeAI(store);

  async function openCamera() {
    try {
      const photo = await CapCamera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.DataUrl,
        quality: 85,
      });
      if (photo.dataUrl) analyse(photo.dataUrl);
    } catch { /* cancelled */ }
  }

  async function openGallery() {
    try {
      const photo = await CapCamera.getPhoto({
        source: CameraSource.Photos,
        resultType: CameraResultType.DataUrl,
        quality: 85,
      });
      if (photo.dataUrl) analyse(photo.dataUrl);
    } catch {
      fileRef.current?.click();
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      analyse(url);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function analyse(dataUrl: string) {
    if (!apiKey) { toast.error('Brak klucza API — uzupełnij w Ustawieniach'); return; }
    setImageUrl(dataUrl);
    setLoading(true);
    setResult(null);
    setAdded(false);

    try {
      const raw = await callAI(aiProvider, apiKey, model, {
        text: PROMPT,
        imageDataUrl: dataUrl,
      });
      const parsed = parseAiJson<AnalysisResult>(raw);
      if (!parsed || typeof parsed.calories !== 'number') {
        throw new Error('AI nie rozpoznało potrawy na zdjęciu. Spróbuj zrobić wyraźniejsze zdjęcie.');
      }
      setResult(parsed);
      setEdited({ ...parsed });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nieznany błąd analizy', { duration: 5000 });
      setImageUrl(null);
    } finally {
      setLoading(false);
    }
  }

  function addToDiary() {
    const data = editMode ? edited! : result!;
    const baseGrams = parsePortion(data.portion);
    const actualGrams = customGrams ?? baseGrams;
    const scale = baseGrams > 0 ? actualGrams / baseGrams : 1;
    const scaledCalories = Math.round(data.calories * scale);
    addFoodEntry({
      id: `photo-${Date.now()}`,
      name: data.name,
      calories: scaledCalories,
      protein: Math.round(data.protein * scale * 10) / 10,
      carbs: Math.round(data.carbs * scale * 10) / 10,
      fat: Math.round(data.fat * scale * 10) / 10,
      amount: actualGrams,
      unit: 'g',
      date: todayISO(),
      mealType,
    });
    setAdded(true);
    toast.success(`Dodano: ${data.name} (${scaledCalories} kcal)`);
  }

  const display = editMode ? edited : result;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end pb-[var(--sa-bottom)]">
      <div className="bg-white w-full max-h-[92vh] rounded-t-3xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Camera size={18} className="text-orange-500" />
            Kalorie ze zdjęcia
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* No image yet */}
          {!imageUrl && !loading && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 text-center">Zrób zdjęcie posiłku, a AI oszacuje kalorie i makroskładniki.</p>
              <button
                onClick={openCamera}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-200"
              >
                <Camera size={22} /> Zrób zdjęcie
              </button>
              <button
                onClick={openGallery}
                className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-gray-200 active:scale-95 transition-all"
              >
                <ImageIcon size={22} /> Wybierz z galerii
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center py-10 gap-4">
              {imageUrl && (
                <img src={imageUrl} alt="" className="w-full max-h-52 object-cover rounded-2xl mb-2" />
              )}
              <Loader size={32} className="text-orange-500 animate-spin" />
              <p className="text-gray-600 font-medium">AI analizuje posiłek…</p>
              <p className="text-xs text-gray-400">Szacowanie kalorii i makroskładników</p>
            </div>
          )}

          {/* Result */}
          {display && !loading && (
            <div className="space-y-4">
              {imageUrl && (
                <img src={imageUrl} alt={display.name} className="w-full max-h-52 object-cover rounded-2xl" />
              )}

              {/* Confidence badge */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  display.confidence === 'wysoka'
                    ? 'bg-green-100 text-green-700'
                    : display.confidence === 'średnia'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}>
                  {display.confidence === 'wysoka' ? '✓' : display.confidence === 'średnia' ? '~' : '!'} Pewność: {display.confidence}
                </span>
                {display.confidence === 'niska' && (
                  <AlertTriangle size={14} className="text-red-400" />
                )}
              </div>

              {/* Dish name & portion */}
              {editMode ? (
                <div className="space-y-2">
                  <input
                    value={edited!.name}
                    onChange={e => setEdited(p => ({ ...p!, name: e.target.value }))}
                    className="w-full border-2 border-orange-200 rounded-xl px-3 py-2 font-semibold text-gray-800 focus:outline-none focus:border-orange-400"
                  />
                  <input
                    value={edited!.portion}
                    onChange={e => setEdited(p => ({ ...p!, portion: e.target.value }))}
                    placeholder="Porcja"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-orange-300"
                  />
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{display.name}</h3>
                  <p className="text-sm text-gray-500">{display.portion}</p>
                </div>
              )}

              {/* Macros */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Kalorie', key: 'calories' as keyof AnalysisResult, unit: 'kcal', color: 'bg-orange-50 text-orange-600' },
                  { label: 'Białko',  key: 'protein'  as keyof AnalysisResult, unit: 'g',    color: 'bg-blue-50 text-blue-600' },
                  { label: 'Węgle',   key: 'carbs'    as keyof AnalysisResult, unit: 'g',    color: 'bg-yellow-50 text-yellow-600' },
                  { label: 'Tłuszcz', key: 'fat'      as keyof AnalysisResult, unit: 'g',    color: 'bg-red-50 text-red-600' },
                ].map(({ label, key, unit, color }) => (
                  <div key={key} className={`${color} rounded-xl p-2.5 text-center`}>
                    {editMode ? (
                      <input
                        type="number"
                        value={edited![key] as number}
                        onChange={e => setEdited(p => ({ ...p!, [key]: Number(e.target.value) }))}
                        className="w-full bg-transparent text-center font-bold text-lg focus:outline-none"
                      />
                    ) : (
                      <p className="text-lg font-bold">{display![key] as number}</p>
                    )}
                    <p className="text-[10px] font-medium opacity-70">{label}</p>
                    <p className="text-[9px] opacity-50">{unit}</p>
                  </div>
                ))}
              </div>

              {display.notes && (
                <p className="text-xs text-gray-400 italic">💡 {display.notes}</p>
              )}

              {/* Edit toggle */}
              <button
                onClick={() => { setEditMode(!editMode); if (editMode) setEdited({ ...result! }); }}
                className="flex items-center gap-1.5 text-sm text-gray-500 font-medium"
              >
                <Edit3 size={14} /> {editMode ? 'Anuluj edycję' : 'Popraw wartości'}
              </button>

              {/* Portion input */}
              {!added && (() => {
                const base = parsePortion(display.portion);
                const actual = customGrams ?? base;
                const scale = base > 0 ? actual / base : 1;
                const scaledKcal = Math.round(display.calories * scale);
                return (
                  <div className="bg-gray-50 rounded-2xl p-3">
                    <p className="text-xs text-gray-500 font-medium mb-2">Porcja:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={actual}
                        min={1}
                        onChange={e => setCustomGrams(Math.max(1, Number(e.target.value)))}
                        className="w-24 border-2 border-orange-300 rounded-xl px-3 py-2 text-center text-lg font-bold focus:outline-none focus:border-orange-500"
                      />
                      <span className="text-gray-500 font-medium">g</span>
                      {customGrams !== null && customGrams !== base && (
                        <button
                          onClick={() => setCustomGrams(null)}
                          className="text-xs text-orange-500 underline ml-1"
                        >reset ({base}g)</button>
                      )}
                      <span className="ml-auto text-orange-600 font-bold text-base">= {scaledKcal} kcal</span>
                    </div>
                    {scale !== 1 && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        B: {Math.round(display.protein * scale * 10)/10}g · W: {Math.round(display.carbs * scale * 10)/10}g · T: {Math.round(display.fat * scale * 10)/10}g
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Meal type */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Dodaj do posiłku:</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(MEAL_LABELS) as [MealType, string][]).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => setMealType(type)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                        mealType === type ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add / Done */}
              {!added ? (
                <button
                  onClick={addToDiary}
                  className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-200"
                >
                  <Plus size={20} /> Dodaj do dziennika
                </button>
              ) : (
                <div className="w-full bg-green-500 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2">
                  <Check size={20} /> Dodano! ({(display as AnalysisResult).calories} kcal)
                </div>
              )}

              {/* Scan another */}
              <button
                onClick={() => { setImageUrl(null); setResult(null); setEdited(null); setAdded(false); setEditMode(false); setCustomGrams(null); }}
                className="w-full bg-gray-100 text-gray-600 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-200 active:scale-95 transition-all"
              >
                📸 Skanuj kolejny posiłek
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
