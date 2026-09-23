import { useRef, useState } from 'react';
import { FileText, ClipboardList, X, Loader, ShoppingCart, ChevronDown, ChevronUp, Copy, Check, Flame, PlusCircle, CalendarPlus } from 'lucide-react';
import { useAppStore, activeAI } from '../store/useAppStore';
import { callAI, parseAiJson } from '../lib/aiProvider';
import { todayISO, toLocalISO } from '../lib/date';
import toast from 'react-hot-toast';

// Poniedziałek danego tygodnia (offset 0 = ten tydzień, 1 = następny).
function getMonday(offset: number): Date {
  const d = new Date();
  const wd = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon = 0
  d.setDate(d.getDate() - wd + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Nazwa dnia (PL) → indeks 0=Pon … 6=Nd. Obsługuje też „Dzień 3".
function dayNameToIndex(name: string): number | null {
  const n = name.toLowerCase()
    .replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ó/g, 'o').replace(/ś/g, 's')
    .replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/ć/g, 'c').replace(/ń/g, 'n').replace(/ł/g, 'l');
  const map: Record<string, number> = {
    poniedzialek: 0, wtorek: 1, sroda: 2, czwartek: 3, piatek: 4, sobota: 5, niedziela: 6,
  };
  for (const key in map) if (n.includes(key)) return map[key];
  const m = n.match(/(\d+)/);
  if (m) { const k = Number(m[1]); if (k >= 1 && k <= 7) return k - 1; }
  return null;
}

// Wyciąga tekst ze wszystkich stron pliku PDF (działa lokalnie, bez wysyłania pliku).
// pdf.js ładowany jest dynamicznie — nie obciąża startu aplikacji.
async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  const { default: pdfWorker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ') + '\n';
  }
  return text.trim();
}

// ─── Types ────────────────────────────────────────────────────────────────────
type MealSlotKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';
interface Meal { name: string; kcal?: number }
interface ShoppingItem  { name: string; amount: string }
interface ShoppingGroup { category: string; items: ShoppingItem[] }
interface DayMeals {
  day: string;
  meals: Partial<Record<MealSlotKey, Meal>>;
  totalKcal?: number;
}
interface DietPlan {
  days: DayMeals[];
  shopping_list: ShoppingGroup[];
  dailyKcal?: number;
  notes?: string;
}

const SLOTS: { key: MealSlotKey; label: string }[] = [
  { key: 'breakfast', label: '🌅 Śniadanie' },
  { key: 'lunch',     label: '🍽️ Obiad' },
  { key: 'dinner',    label: '🌙 Kolacja' },
  { key: 'snack',     label: '🍎 Przekąska' },
];

const SAVE_KEY = 'savedDietPlan';

// ─── Normalizacja odpowiedzi AI (może zwrócić tekst LUB obiekt na posiłek) ──────
function toMeal(m: unknown): Meal | undefined {
  if (!m) return undefined;
  if (typeof m === 'string') { const s = m.trim(); return s && s !== 'null' ? { name: s } : undefined; }
  if (typeof m === 'object') {
    const o = m as Record<string, unknown>;
    const name = String(o.name ?? o.opis ?? o.danie ?? '').trim();
    if (!name || name === 'null') return undefined;
    const kcal = Number(o.kcal ?? o.calories ?? o.kalorie);
    return { name, kcal: isFinite(kcal) && kcal > 0 ? Math.round(kcal) : undefined };
  }
  return undefined;
}

function normalizePlan(raw: unknown): DietPlan {
  const r = (raw ?? {}) as Record<string, unknown>;
  const rawDays = Array.isArray(r.days) ? r.days : [];
  const days: DayMeals[] = rawDays.map((dd) => {
    const d = (dd ?? {}) as Record<string, unknown>;
    const mealsRaw = (d.meals ?? {}) as Record<string, unknown>;
    const meals: Partial<Record<MealSlotKey, Meal>> = {};
    (['breakfast', 'lunch', 'dinner', 'snack'] as MealSlotKey[]).forEach((k) => {
      const mm = toMeal(mealsRaw[k]);
      if (mm) meals[k] = mm;
    });
    let total = Number(d.totalKcal);
    if (!isFinite(total) || total <= 0) {
      total = Object.values(meals).reduce((s, m) => s + (m?.kcal ?? 0), 0);
    }
    return { day: String(d.day ?? '').trim(), meals, totalKcal: total > 0 ? Math.round(total) : undefined };
  }).filter((d) => d.day || Object.keys(d.meals).length);

  const rawShop = Array.isArray(r.shopping_list) ? r.shopping_list : [];
  const shopping_list: ShoppingGroup[] = rawShop.map((gg) => {
    const g = (gg ?? {}) as Record<string, unknown>;
    const items = (Array.isArray(g.items) ? g.items : []).map((ii) => {
      const i = (ii ?? {}) as Record<string, unknown>;
      return { name: String(i.name ?? '').trim(), amount: String(i.amount ?? '').trim() };
    }).filter((i) => i.name);
    return { category: String(g.category ?? 'Inne').trim(), items };
  }).filter((g) => g.items.length);

  const dailyKcal = Number(r.dailyKcal);
  return {
    days,
    shopping_list,
    notes: r.notes ? String(r.notes) : undefined,
    dailyKcal: isFinite(dailyKcal) && dailyKcal > 0 ? Math.round(dailyKcal) : undefined,
  };
}

function loadSaved(): DietPlan | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as DietPlan) : null;
  } catch { return null; }
}

// ─── AI prompt ────────────────────────────────────────────────────────────────
const PROMPT = `Jesteś asystentem dietetycznym. Przeanalizuj DOKŁADNIE plan diety poniżej. NIE streszczaj i NIE pomijaj szczegółów.

Zasady:
1. Dla każdego dnia wypisz posiłki: śniadanie (breakfast), obiad (lunch), kolacja (dinner), przekąska (snack).
2. Dla KAŻDEGO posiłku w polu "name" zachowaj PEŁNY opis z planu — nazwę dania, wszystkie składniki i gramatury/porcje dokładnie tak jak są w planie. To ma być kompletny opis, a nie sama nazwa.
3. Dla każdego posiłku podaj "kcal": jeśli plan podaje kalorie — użyj ich; jeśli nie — oszacuj realistycznie na podstawie składników.
4. Policz "totalKcal" dla każdego dnia (suma kcal posiłków) oraz "dailyKcal" (średnia dzienna lub cel kaloryczny z planu).
5. Zbuduj kompletną listę zakupów na cały okres, pogrupowaną w kategorie, z ilościami.

Odpowiedz WYŁĄCZNIE poprawnym JSON (bez markdown, bez komentarzy):
{
  "dailyKcal": 1800,
  "days": [
    {
      "day": "Poniedziałek",
      "meals": {
        "breakfast": { "name": "Owsianka na mleku (płatki 50g, mleko 250ml) z bananem i orzechami", "kcal": 420 },
        "lunch": { "name": "Kurczak grillowany 150g z ryżem 100g i brokułami 200g", "kcal": 650 },
        "dinner": { "name": "Sałatka grecka z fetą i oliwą", "kcal": 480 },
        "snack": { "name": "Jogurt naturalny z owocami", "kcal": 180 }
      },
      "totalKcal": 1730
    }
  ],
  "shopping_list": [
    { "category": "Warzywa i owoce", "items": [ { "name": "pomidory", "amount": "500 g" } ] }
  ],
  "notes": "uwagi, cel kaloryczny, alergeny, makroskładniki jeśli podano"
}

Jeśli danego posiłku nie ma w danym dniu, pomiń to pole. Zachowaj polski język planu.`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function PdfDietImporter({ onClose }: { onClose: () => void }) {
  const store = useAppStore();
  const { aiProvider, addFoodEntry, setMealTextSlot } = store;

  const [mode, setMode]         = useState<'pdf' | 'text'>('pdf');
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<DietPlan | null>(() => loadSaved());
  const [isSaved, setIsSaved]   = useState<boolean>(() => !!loadSaved());
  const [rawError, setRawError] = useState('');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { apiKey, model } = activeAI(store);

  // ── PDF upload handler ──────────────────────────────────────────────────────
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so same file can be re-selected
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Wybierz plik PDF'); return; }
    if (file.size > 18 * 1024 * 1024)    { toast.error('Plik zbyt duży (max 18 MB)'); return; }
    if (!apiKey) { toast.error('Brak klucza API — uzupełnij w Ustawieniach'); return; }

    setLoading(true);
    setResult(null);
    setRawError('');
    try {
      const text = await extractPdfText(file);
      if (!text || text.length < 20) {
        throw new Error('Nie udało się odczytać tekstu z PDF. Plik może być skanem (obrazem) — użyj trybu „Wklej tekst".');
      }
      await runAnalysis({ extraText: `\n\nTREŚĆ PLANU DIETY (z pliku PDF):\n${text}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nie udało się odczytać pliku PDF';
      setRawError(msg);
      toast.error(msg.slice(0, 90));
      setLoading(false);
    }
  }

  // ── Text paste handler ──────────────────────────────────────────────────────
  function handleText() {
    if (!pasteText.trim()) { toast.error('Wklej tekst planu diety'); return; }
    runAnalysis({ extraText: `\n\nTREŚĆ PLANU DIETY:\n${pasteText}` });
  }

  // ── Core AI call ────────────────────────────────────────────────────────────
  async function runAnalysis({ extraText }: { extraText?: string }) {
    if (!apiKey) { toast.error('Brak klucza API — uzupełnij w Ustawieniach'); return; }
    setLoading(true);
    setResult(null);
    setRawError('');
    setIsSaved(false);

    try {
      const raw = await callAI(aiProvider, apiKey, model, {
        text: PROMPT + (extraText ?? ''),
      });

      const parsed = normalizePlan(parseAiJson(raw));
      if (parsed.days.length === 0) {
        throw new Error('AI nie rozpoznało posiłków w tym planie. Spróbuj wkleić tekst ręcznie lub użyj innego pliku.');
      }
      setResult(parsed);
      autoSave(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nieznany błąd';
      setRawError(msg);
      toast.error('Błąd analizy: ' + msg.slice(0, 80));
    } finally {
      setLoading(false);
    }
  }

  // ── Zapis planu (localStorage) — nie znika po zamknięciu ──────────────────────
  function autoSave(plan: DietPlan) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(plan));
      setIsSaved(true);
      toast.success('Plan zapisany 💾');
    } catch {
      toast.error('Nie udało się zapisać planu');
    }
  }

  // ── Dodanie posiłków danego dnia do dziennika kalorii (na dziś) ───────────────
  function addDayToDiary(d: DayMeals) {
    let count = 0, kcal = 0;
    const date = todayISO();
    SLOTS.forEach(({ key }) => {
      const m = d.meals[key];
      if (!m) return;
      addFoodEntry({
        id: `entry-${Date.now()}-${key}-${Math.random().toString(36).slice(2, 6)}`,
        name: m.name.length > 90 ? m.name.slice(0, 90) + '…' : m.name,
        calories: m.kcal ?? 0,
        protein: 0, carbs: 0, fat: 0,
        amount: 1, unit: 'porcja',
        date,
        mealType: key,
      });
      count++;
      kcal += m.kcal ?? 0;
    });
    if (count === 0) { toast('Ten dzień nie ma posiłków', { icon: 'ℹ️' }); return; }
    toast.success(`Dodano ${count} posiłków (${kcal} kcal) do dziennika na dziś`);
  }

  // ── Zapis całego planu do Planu posiłków (ten / następny tydzień) ─────────────
  function addPlanToWeek(offset: number) {
    if (!result) return;
    const monday = getMonday(offset);
    let count = 0;
    result.days.forEach((d, i) => {
      const idx = dayNameToIndex(d.day) ?? (i % 7);
      const dt = new Date(monday);
      dt.setDate(dt.getDate() + idx);
      const date = toLocalISO(dt);
      SLOTS.forEach(({ key }) => {
        const m = d.meals[key];
        if (m) { setMealTextSlot(date, key, { name: m.name, kcal: m.kcal }); count++; }
      });
    });
    if (count === 0) { toast('Brak posiłków do dodania', { icon: 'ℹ️' }); return; }
    toast.success(`Dodano ${count} posiłków do planu (${offset === 0 ? 'ten' : 'następny'} tydzień) 📅`);
  }

  // ── Copy shopping list ──────────────────────────────────────────────────────
  function copyShoppingList() {
    if (!result) return;
    const lines: string[] = ['📋 LISTA ZAKUPÓW\n'];
    result.shopping_list.forEach(group => {
      lines.push(`${group.category}:`);
      group.items.forEach(item => lines.push(`  • ${item.name}${item.amount ? ' — ' + item.amount : ''}`));
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Skopiowano do schowka!');
    });
  }

  function resetToNew() {
    setResult(null);
    setRawError('');
    setPasteText('');
    setIsSaved(false);
  }

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end">
      <div className="bg-white w-full max-h-[92vh] rounded-t-3xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <FileText size={18} className="text-teal-500" />
            Importuj plan diety
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 pb-10 space-y-4">

          {/* Mode tabs */}
          {!result && !loading && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMode('pdf')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${mode === 'pdf' ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-gray-100 text-gray-500'}`}>
                  <FileText size={16} /> Upload PDF
                </button>
                <button onClick={() => setMode('text')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${mode === 'text' ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-gray-100 text-gray-500'}`}>
                  <ClipboardList size={16} /> Wklej tekst
                </button>
              </div>

              {mode === 'pdf' && (
                <div className="space-y-3">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 transition-all border-teal-300 text-teal-600 hover:bg-teal-50 active:scale-98 cursor-pointer"
                  >
                    <FileText size={32} />
                    <div className="text-center">
                      <p className="font-semibold text-sm">Wybierz plik PDF</p>
                      <p className="text-xs mt-0.5 opacity-70">Tygodniowy plan diety, max 18 MB</p>
                    </div>
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Tekst odczytujemy z pliku na urządzeniu i analizujemy przez AI (Groq lub Gemini).
                  </p>
                  <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
                </div>
              )}

              {mode === 'text' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">Wklej lub przepisz zawartość planu diety. Działa z Groq i Gemini.</p>
                  <textarea
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder={`Np.:\nPoniedziałek:\n  Śniadanie: Owsianka z owocami (płatki 50g, mleko 250ml)\n  Obiad: Kurczak z ryżem i warzywami\n  Kolacja: Sałatka grecka\n...`}
                    rows={10}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 resize-none font-mono"
                  />
                  <button
                    onClick={handleText}
                    className="w-full bg-teal-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-600 active:scale-95 transition-all"
                  >
                    🤖 Analizuj plan diety
                  </button>
                </div>
              )}
            </>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader size={36} className="text-teal-500 animate-spin" />
              <p className="text-gray-600 font-medium">AI analizuje plan diety…</p>
              <p className="text-xs text-gray-400">Może potrwać kilkanaście sekund</p>
            </div>
          )}

          {/* Error */}
          {rawError && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <p className="text-red-700 font-semibold text-sm">Błąd analizy</p>
              <p className="text-red-600 text-xs font-mono break-all">{rawError}</p>
              <button onClick={() => setRawError('')} className="text-sm text-red-500 font-medium underline">
                Spróbuj ponownie
              </button>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="space-y-4">
              {/* Saved banner + daily kcal */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {isSaved && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                      <Check size={12} /> Zapisany
                    </span>
                  )}
                  {result.dailyKcal && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                      <Flame size={12} /> ~{result.dailyKcal} kcal/dzień
                    </span>
                  )}
                </div>
                <button onClick={resetToNew} className="text-xs text-teal-600 font-semibold underline">
                  Analizuj nowy
                </button>
              </div>

              {/* Notes */}
              {result.notes && (
                <div className="bg-teal-50 rounded-xl p-3 text-sm text-teal-700">
                  💡 {result.notes}
                </div>
              )}

              {/* Meal plan per day */}
              <div>
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  📅 Plan posiłków
                </h3>
                <div className="space-y-2">
                  {result.days.map((d) => {
                    const mealCount = SLOTS.filter((s) => d.meals[s.key]).length;
                    const open = expandedDay === d.day;
                    return (
                      <div key={d.day} className="bg-gray-50 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedDay(open ? null : d.day)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left"
                        >
                          <span className="font-semibold text-gray-800 text-sm">{d.day || 'Dzień'}</span>
                          <div className="flex items-center gap-2">
                            {d.totalKcal ? (
                              <span className="text-xs font-semibold text-orange-500">{d.totalKcal} kcal</span>
                            ) : null}
                            <span className="text-xs text-gray-400">{mealCount} pos.</span>
                            {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                          </div>
                        </button>
                        {open && (
                          <div className="px-4 pb-3 space-y-2 border-t border-gray-100 pt-2">
                            {SLOTS.map(({ key, label }) => {
                              const m = d.meals[key];
                              if (!m) return null;
                              return (
                                <div key={key} className="text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-gray-400 text-xs font-medium">{label}</span>
                                    {m.kcal ? <span className="text-orange-500 text-xs font-semibold flex-shrink-0">{m.kcal} kcal</span> : null}
                                  </div>
                                  <p className="text-gray-700 leading-snug mt-0.5">{m.name}</p>
                                </div>
                              );
                            })}
                            <button
                              onClick={() => addDayToDiary(d)}
                              className="w-full mt-1 bg-green-500 text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all hover:bg-green-600"
                            >
                              <PlusCircle size={15} /> Dodaj ten dzień do dziennika
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dodaj cały plan do Planu posiłków */}
              <div className="bg-teal-50 rounded-2xl p-4">
                <p className="font-semibold text-teal-800 text-sm flex items-center gap-2 mb-1">
                  <CalendarPlus size={16} className="text-teal-500" /> Dodaj do planu posiłków
                </p>
                <p className="text-xs text-teal-600/80 mb-3">
                  Rozłoży posiłki po dniach tygodnia (Poniedziałek → Niedziela) w zakładce Plan.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addPlanToWeek(0)}
                    className="bg-white border border-teal-200 text-teal-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-100 active:scale-95 transition-all"
                  >
                    Ten tydzień
                  </button>
                  <button
                    onClick={() => addPlanToWeek(1)}
                    className="bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-600 active:scale-95 transition-all"
                  >
                    Następny tydzień
                  </button>
                </div>
              </div>

              {/* Shopping list */}
              {result.shopping_list.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <ShoppingCart size={16} className="text-teal-500" /> Lista zakupów
                    </h3>
                    <button
                      onClick={copyShoppingList}
                      className="flex items-center gap-1.5 text-xs text-teal-600 font-semibold bg-teal-50 px-3 py-1.5 rounded-full hover:bg-teal-100 transition-colors active:scale-95"
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? 'Skopiowano!' : 'Kopiuj'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {result.shopping_list.map((group) => (
                      <div key={group.category} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                        <p className="font-semibold text-gray-600 text-xs uppercase tracking-wide mb-2">{group.category}</p>
                        <div className="space-y-1">
                          {group.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">• {item.name}</span>
                              <span className="text-gray-400 font-medium">{item.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={resetToNew}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 active:scale-95 transition-all"
                >
                  Analizuj nowy
                </button>
                {result.shopping_list.length > 0 && (
                  <button
                    onClick={copyShoppingList}
                    className="flex-1 bg-teal-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={16} />
                    Kopiuj listę
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
