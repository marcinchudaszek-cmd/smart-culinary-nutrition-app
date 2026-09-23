import { useState, useMemo } from 'react';
import { ArrowLeft, Target, Eye, EyeOff, ExternalLink, RotateCcw, FlaskConical, CheckCircle, XCircle, Loader, Search, Bell, Calculator, Moon, Sun } from 'lucide-react';
import { useAppStore, type UserProfile, GEMINI_MODEL, GROQ_VISION_MODEL, OPENROUTER_VISION_MODEL } from '../store/useAppStore';
import { callAI } from '../lib/aiProvider';
import { DEFAULT_REMINDERS, requestPermission, syncReminders, type MealReminder } from '../lib/notifications';
import toast from 'react-hot-toast';

const REMINDERS_KEY = 'mealReminders';
function loadReminders(): MealReminder[] {
  try { return JSON.parse(localStorage.getItem(REMINDERS_KEY) ?? 'null') ?? DEFAULT_REMINDERS; }
  catch { return DEFAULT_REMINDERS; }
}
function saveReminders(r: MealReminder[]) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(r));
}

const CALORIE_PRESETS = [1500, 1800, 2000, 2200, 2500, 3000];

const PROVIDER_LABEL: Record<string, string> = { groq: 'Groq', gemini: 'Gemini', openrouter: 'OpenRouter' };

interface GoalFieldProps {
  label: string;
  value: number;
  onSave: (v: number) => void;
  unit: string;
  color: string;
  presets?: number[];
}

function GoalField({ label, value, onSave, unit, color, presets }: GoalFieldProps) {
  const [temp, setTemp] = useState(value);
  const commit = () => {
    if (temp > 0) { onSave(temp); toast.success(`${label} zaktualizowane!`); }
  };
  return (
    <div>
      <label className="text-xs text-gray-500 font-medium mb-1 block">{label}</label>
      <div className="flex gap-2">
        <input
          type="number"
          value={temp}
          onChange={(e) => setTemp(Number(e.target.value))}
          onBlur={commit}
          className={`flex-1 border-2 rounded-xl px-3 py-2.5 text-center text-lg font-bold outline-none focus:border-orange-400 transition-colors ${color}`}
        />
        <span className="flex items-center text-sm text-gray-400 font-medium px-1">{unit}</span>
      </div>
      {presets && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => { setTemp(p); onSave(p); toast.success(`${label}: ${p} ${unit}`); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                value === p ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsView() {
  const {
    setActiveView,
    dailyGoal, setDailyGoal,
    proteinGoal, setProteinGoal,
    carbsGoal, setCarbsGoal,
    fatGoal, setFatGoal,
    aiProvider, setAiProvider,
    groqApiKey, setGroqApiKey,
    geminiApiKey, setGeminiApiKey,
    openrouterApiKey, setOpenrouterApiKey,
    spoonacularApiKey, setSpoonacularApiKey,
    userProfile, setUserProfile,
    waterGoal, setWaterGoal,
    darkMode, setDarkMode,
    setOnboardingDone,
  } = useAppStore();

  // BMI/BMR state
  const [profile, setProfile] = useState<UserProfile>(userProfile);
  const [waterGoalInput, setWaterGoalInput] = useState(String(waterGoal));

  const bmr = useMemo(() => {
    const { age, gender, height, weight } = profile;
    if (!age || !height || !weight || !gender) return 0;
    // Mifflin-St Jeor
    const base = 10 * weight + 6.25 * height - 5 * age;
    return Math.round(gender === 'male' ? base + 5 : base - 161);
  }, [profile]);

  const activityFactors: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  const tdee = useMemo(() => {
    if (!bmr) return 0;
    const factor = activityFactors[profile.activityLevel] ?? 1.55;
    return Math.round(bmr * factor);
  }, [bmr, profile.activityLevel]);

  const suggestedCalories = useMemo(() => {
    if (!tdee) return 0;
    if (profile.weightGoal === 'lose') return Math.max(tdee - 500, 1200);
    if (profile.weightGoal === 'gain') return tdee + 300;
    return tdee;
  }, [tdee, profile.weightGoal]);

  const bmi = useMemo(() => {
    const { height, weight } = profile;
    if (!height || !weight) return 0;
    return Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;
  }, [profile]);

  function saveProfile() {
    setUserProfile(profile);
    toast.success('Profil zapisany!');
  }

  function applyCalories() {
    if (!suggestedCalories) return;
    setDailyGoal(suggestedCalories);
    // Also set reasonable macro goals based on TDEE
    setProteinGoal(Math.round(suggestedCalories * 0.25 / 4));
    setCarbsGoal(Math.round(suggestedCalories * 0.45 / 4));
    setFatGoal(Math.round(suggestedCalories * 0.30 / 9));
    toast.success(`Cel dzienny ustawiony: ${suggestedCalories} kcal`);
  }

  const [groqInput, setGroqInput] = useState(groqApiKey);
  const [geminiInput, setGeminiInput] = useState(geminiApiKey);
  const [openrouterInput, setOpenrouterInput] = useState(openrouterApiKey);
  const [spoonInput, setSpoonInput] = useState(spoonacularApiKey);
  const [showKey, setShowKey] = useState(false);
  const [showSpoonKey, setShowSpoonKey] = useState(false);
  const [spoonTestStatus, setSpoonTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [spoonTestError, setSpoonTestError] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [testErrorRaw, setTestErrorRaw] = useState('');
  const [reminders, setReminders] = useState<MealReminder[]>(loadReminders);

  const updateReminder = async (updated: MealReminder[]) => {
    setReminders(updated);
    saveReminders(updated);
    const hasEnabled = updated.some((r) => r.enabled);
    if (hasEnabled) {
      const granted = await requestPermission();
      if (!granted) { toast.error('Brak uprawnień do powiadomień'); return; }
    }
    await syncReminders(updated);
  };

  const activeKey = aiProvider === 'gemini' ? geminiInput : aiProvider === 'openrouter' ? openrouterInput : groqInput;
  const activeModel = aiProvider === 'gemini' ? GEMINI_MODEL : aiProvider === 'openrouter' ? OPENROUTER_VISION_MODEL : GROQ_VISION_MODEL;

  const saveKey = () => {
    if (aiProvider === 'groq') setGroqApiKey(groqInput.trim());
    else if (aiProvider === 'openrouter') setOpenrouterApiKey(openrouterInput.trim());
    else setGeminiApiKey(geminiInput.trim());
    setTestStatus('idle');
    toast.success('Klucz API zapisany!');
  };

  const testApi = async () => {
    const key = activeKey.trim();
    if (!key) { toast.error('Najpierw wpisz klucz API'); return; }
    setTestStatus('loading');
    setTestError('');
    setTestErrorRaw('');
    try {
      await callAI(aiProvider, key, activeModel, { text: 'Odpowiedz jednym słowem po polsku: działa' });
      setTestStatus('ok');
      toast.success(`${PROVIDER_LABEL[aiProvider]} działa poprawnie!`);
    } catch (e: unknown) {
      setTestStatus('error');
      setTestError(e instanceof Error ? e.message : 'Błąd połączenia');
      setTestErrorRaw((e as { raw?: string })?.raw ?? '');
    }
  };

  const resetGoals = () => {
    setDailyGoal(2000); setProteinGoal(60); setCarbsGoal(250); setFatGoal(65);
    toast.success('Cele zresetowane do domyślnych');
  };

  const activeKeyStored = aiProvider === 'gemini' ? geminiApiKey : aiProvider === 'openrouter' ? openrouterApiKey : groqApiKey;

  return (
    <div className="pb-24 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveView('home')} className="bg-gray-100 rounded-full p-2">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Ustawienia</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* AI Provider */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
            🤖 Skaner AI
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Wybierz dostawcę AI do rozpoznawania potraw i analizy składników.
          </p>

          {/* Provider selector */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              onClick={() => { setAiProvider('groq'); setTestStatus('idle'); }}
              className={`rounded-2xl p-3 border-2 text-left transition-all ${
                aiProvider === 'groq' ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⚡</span>
                <span className={`text-sm font-bold ${aiProvider === 'groq' ? 'text-green-700' : 'text-gray-700'}`}>Groq</span>
              </div>
              <p className="text-xs text-gray-400">Darmowy • szybki</p>
              <p className="text-xs text-gray-300 mt-0.5">console.groq.com</p>
            </button>

            <button
              onClick={() => { setAiProvider('gemini'); setTestStatus('idle'); }}
              className={`rounded-2xl p-3 border-2 text-left transition-all ${
                aiProvider === 'gemini' ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🔷</span>
                <span className={`text-sm font-bold ${aiProvider === 'gemini' ? 'text-blue-700' : 'text-gray-700'}`}>Gemini</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Polecany</span>
              </div>
              <p className="text-xs text-gray-400">Google • zdjęcia</p>
              <p className="text-xs text-gray-300 mt-0.5">aistudio.google.com</p>
            </button>

            <button
              onClick={() => { setAiProvider('openrouter'); setTestStatus('idle'); }}
              className={`rounded-2xl p-3 border-2 text-left transition-all col-span-2 ${
                aiProvider === 'openrouter' ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🧩</span>
                <span className={`text-sm font-bold ${aiProvider === 'openrouter' ? 'text-purple-700' : 'text-gray-700'}`}>OpenRouter</span>
                <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">Zapasowy</span>
              </div>
              <p className="text-xs text-gray-400">Darmowe modele • zdjęcia • niezależny od Groq/Google</p>
              <p className="text-xs text-gray-300 mt-0.5">openrouter.ai/keys</p>
            </button>
          </div>

          {/* Key input */}
          <div className="relative mb-3">
            <input
              type={showKey ? 'text' : 'password'}
              value={activeKey}
              onChange={(e) => {
                if (aiProvider === 'groq') setGroqInput(e.target.value);
                else if (aiProvider === 'openrouter') setOpenrouterInput(e.target.value);
                else setGeminiInput(e.target.value);
                setTestStatus('idle');
              }}
              placeholder={aiProvider === 'groq' ? 'gsk_...' : aiProvider === 'openrouter' ? 'sk-or-...' : 'AIza...'}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-orange-400 font-mono"
            />
            <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-3 text-gray-400">
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={saveKey}
              className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm active:scale-95 transition-all"
            >
              Zapisz klucz
            </button>
            <button
              onClick={testApi}
              disabled={testStatus === 'loading'}
              className="flex items-center gap-1.5 bg-blue-500 text-white py-3 px-4 rounded-xl font-semibold text-sm active:scale-95 disabled:opacity-60 transition-all"
            >
              {testStatus === 'loading' ? <Loader size={16} className="animate-spin" /> : <FlaskConical size={16} />}
              Test
            </button>
          </div>

          {testStatus === 'ok' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-3 py-2 text-xs font-medium mb-3">
              <CheckCircle size={14} /> Połączenie OK — {PROVIDER_LABEL[aiProvider]} działa!
            </div>
          )}
          {testStatus === 'error' && (
            <div className="bg-red-50 rounded-xl px-3 py-2 mb-3">
              <div className="flex items-center gap-2 text-red-600 text-xs font-semibold mb-0.5">
                <XCircle size={14} /> Błąd połączenia
              </div>
              <p className="text-red-400 text-xs">{testError}</p>
              {testErrorRaw && testErrorRaw !== testError && (
                <details className="mt-1">
                  <summary className="text-[11px] text-gray-400 cursor-pointer">Szczegóły techniczne</summary>
                  <p className="text-[11px] text-gray-400 mt-1 break-all">{testErrorRaw}</p>
                </details>
              )}
              {aiProvider !== 'gemini' && (
                <p className="text-gray-400 text-xs mt-1">💡 Jeśli nie działa — przełącz na Gemini (najpewniejszy, obsługuje zdjęcia).</p>
              )}
            </div>
          )}
          {activeKeyStored && testStatus === 'idle' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-3 py-2 text-xs font-medium mb-3">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Klucz zapisany — kliknij Test aby sprawdzić
            </div>
          )}

          {/* Get key link */}
          {aiProvider === 'groq' ? (
            <div className="space-y-2">
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-green-600 text-xs font-medium hover:underline"
              >
                <ExternalLink size={13} />
                Pobierz darmowy klucz — Groq Console
              </a>
              <p className="text-xs text-gray-400">
                ✅ Rejestracja bez karty kredytowej • 14 400 zapytań/dzień • rozpoznaje zdjęcia potraw
              </p>
            </div>
          ) : aiProvider === 'openrouter' ? (
            <div className="space-y-2">
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-purple-600 text-xs font-medium hover:underline"
              >
                <ExternalLink size={13} />
                Pobierz darmowy klucz — OpenRouter
              </a>
              <p className="text-xs text-gray-400">
                ✅ Jeden klucz = wiele darmowych modeli (modele z „:free" nie zużywają środków).
                Dobry zapas, gdy Groq albo Gemini przestaną działać.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-500 text-xs font-medium hover:underline"
              >
                <ExternalLink size={13} />
                Pobierz klucz — Google AI Studio
              </a>
              <p className="text-xs text-gray-400">
                ⚠️ Jeśli Gemini nie działa (limit/niedostępny model) — przełącz na OpenRouter (przycisk powyżej).
              </p>
            </div>
          )}
        </div>

        {/* Spoonacular */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Search size={16} className="text-orange-500" />
            Wyszukiwanie przepisów online
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Klucz Spoonacular umożliwia wyszukiwanie przepisów z całego świata po polsku. Bez klucza działa bezpłatna baza TheMealDB.
          </p>

          <div className="relative mb-3">
            <input
              type={showSpoonKey ? 'text' : 'password'}
              value={spoonInput}
              onChange={(e) => { setSpoonInput(e.target.value); setSpoonTestStatus('idle'); }}
              placeholder="Klucz Spoonacular API..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-orange-400 font-mono"
            />
            <button onClick={() => setShowSpoonKey(!showSpoonKey)} className="absolute right-3 top-3 text-gray-400">
              {showSpoonKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => {
                setSpoonacularApiKey(spoonInput.trim());
                setSpoonTestStatus('idle');
                toast.success('Klucz Spoonacular zapisany!');
              }}
              className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm active:scale-95 transition-all"
            >
              Zapisz klucz
            </button>
            <button
              onClick={async () => {
                const key = spoonInput.trim();
                if (!key) { toast.error('Najpierw wpisz klucz'); return; }
                setSpoonTestStatus('loading');
                setSpoonTestError('');
                try {
                  const res = await fetch(
                    `https://api.spoonacular.com/recipes/complexSearch?query=soup&number=1&apiKey=${key}`
                  );
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  const data = await res.json();
                  if (data.results !== undefined) {
                    setSpoonTestStatus('ok');
                    toast.success('Spoonacular działa!');
                  } else {
                    throw new Error('Nieoczekiwana odpowiedź');
                  }
                } catch (e: unknown) {
                  setSpoonTestStatus('error');
                  setSpoonTestError(e instanceof Error ? e.message : 'Błąd');
                }
              }}
              disabled={spoonTestStatus === 'loading'}
              className="flex items-center gap-1.5 bg-blue-500 text-white py-3 px-4 rounded-xl font-semibold text-sm active:scale-95 disabled:opacity-60 transition-all"
            >
              {spoonTestStatus === 'loading' ? <Loader size={16} className="animate-spin" /> : <FlaskConical size={16} />}
              Test
            </button>
          </div>

          {spoonTestStatus === 'ok' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-3 py-2 text-xs font-medium mb-3">
              <CheckCircle size={14} /> Spoonacular połączony!
            </div>
          )}
          {spoonTestStatus === 'error' && (
            <div className="bg-red-50 rounded-xl px-3 py-2 mb-3">
              <div className="flex items-center gap-2 text-red-600 text-xs font-semibold mb-0.5">
                <XCircle size={14} /> Błąd połączenia
              </div>
              <p className="text-red-400 text-xs">{spoonTestError}</p>
            </div>
          )}
          {spoonacularApiKey && spoonTestStatus === 'idle' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-3 py-2 text-xs font-medium mb-3">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Klucz zapisany — wyszukiwanie online aktywne
            </div>
          )}
          {!spoonacularApiKey && spoonTestStatus === 'idle' && (
            <div className="flex items-center gap-2 text-gray-500 bg-gray-50 rounded-xl px-3 py-2 text-xs font-medium mb-3">
              <span className="w-2 h-2 bg-gray-300 rounded-full" />
              Brak klucza — używana bezpłatna baza TheMealDB
            </div>
          )}

          <a
            href="https://spoonacular.com/food-api"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-orange-500 text-xs font-medium hover:underline"
          >
            <ExternalLink size={13} />
            Pobierz darmowy klucz — spoonacular.com/food-api
          </a>
          <p className="text-xs text-gray-400 mt-1">
            ✅ Darmowy plan: 150 zapytań/dzień • tysiące przepisów • obsługuje polskie zapytania
          </p>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Bell size={16} className="text-orange-500" />
            Przypomnienia o posiłkach
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Codzienne powiadomienia o wpisaniu posiłku do dziennika.
          </p>
          <div className="space-y-3">
            {reminders.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const updated = reminders.map((x) => x.id === r.id ? { ...x, enabled: !x.enabled } : x);
                    void updateReminder(updated);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative ${r.enabled ? 'bg-orange-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${r.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm font-medium text-gray-700 flex-1">{r.label}</span>
                <input
                  type="time"
                  value={`${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    const updated = reminders.map((x) => x.id === r.id ? { ...x, hour: h, minute: m } : x);
                    void updateReminder(updated);
                  }}
                  disabled={!r.enabled}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
            ))}
          </div>
          {reminders.some((r) => r.enabled) && (
            <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
              <CheckCircle size={12} /> Przypomnienia aktywne — działają tylko na urządzeniu Android
            </p>
          )}
        </div>

        {/* BMI / BMR Calculator */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Calculator size={18} className="text-purple-500" />
            Kalkulator zapotrzebowania
          </h2>
          <p className="text-xs text-gray-400 mb-4">Oblicz BMI, BMR i dzienny cel kalorii dopasowany do Twojego stylu życia.</p>

          {/* Gender */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 font-medium mb-1 block">Płeć</label>
            <div className="grid grid-cols-2 gap-2">
              {(['male', 'female'] as const).map(g => (
                <button key={g} onClick={() => setProfile(p => ({ ...p, gender: g }))}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                    profile.gender === g ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-500'
                  }`}>
                  {g === 'male' ? '👨 Mężczyzna' : '👩 Kobieta'}
                </button>
              ))}
            </div>
          </div>

          {/* Age / Height / Weight */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {([
              { key: 'age', label: 'Wiek', unit: 'lat', min: 10, max: 100 },
              { key: 'height', label: 'Wzrost', unit: 'cm', min: 100, max: 250 },
              { key: 'weight', label: 'Waga', unit: 'kg', min: 20, max: 300 },
            ] as { key: keyof UserProfile; label: string; unit: string; min: number; max: number }[]).map(({ key, label, unit }) => (
              <div key={key}>
                <label className="text-[10px] text-gray-400 font-medium mb-1 block">{label} ({unit})</label>
                <input
                  type="number"
                  value={(profile[key] as number) || ''}
                  onChange={e => setProfile(p => ({ ...p, [key]: Number(e.target.value) }))}
                  placeholder="—"
                  className="w-full border-2 border-gray-100 rounded-xl px-2 py-2 text-center text-base font-bold text-gray-700 focus:outline-none focus:border-purple-300"
                />
              </div>
            ))}
          </div>

          {/* Activity level */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 font-medium mb-1 block">Poziom aktywności</label>
            <select
              value={profile.activityLevel}
              onChange={e => setProfile(p => ({ ...p, activityLevel: e.target.value as UserProfile['activityLevel'] }))}
              className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-purple-300 bg-white"
            >
              <option value="sedentary">🪑 Siedzący (brak ćwiczeń)</option>
              <option value="light">🚶 Lekki (1–3 treningi/tydz.)</option>
              <option value="moderate">🏃 Umiarkowany (3–5 treningów/tydz.)</option>
              <option value="active">💪 Aktywny (6–7 treningów/tydz.)</option>
              <option value="very_active">🔥 Bardzo aktywny (2× dziennie)</option>
            </select>
          </div>

          {/* Goal */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 font-medium mb-1 block">Cel</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'lose',     label: '📉 Odchudzanie' },
                { v: 'maintain', label: '⚖️ Utrzymanie' },
                { v: 'gain',     label: '📈 Masa mięśniowa' },
              ] as const).map(({ v, label }) => (
                <button key={v} onClick={() => setProfile(p => ({ ...p, weightGoal: v }))}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all border-2 ${
                    profile.weightGoal === v ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-500'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {bmr > 0 && (
            <div className="bg-purple-50 rounded-2xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">BMI</span>
                <span className="font-bold text-purple-700">
                  {bmi} {bmi < 18.5 ? '(niedowaga)' : bmi < 25 ? '(norma ✓)' : bmi < 30 ? '(nadwaga)' : '(otyłość)'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">BMR (podstawa)</span>
                <span className="font-semibold text-gray-700">{bmr} kcal</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">TDEE (z aktywnością)</span>
                <span className="font-semibold text-gray-700">{tdee} kcal</span>
              </div>
              <div className="h-px bg-purple-100" />
              <div className="flex justify-between text-sm">
                <span className="text-purple-700 font-semibold">Zalecany cel</span>
                <span className="font-bold text-purple-700 text-base">{suggestedCalories} kcal</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={saveProfile} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-200 active:scale-95 transition-all">
              Zapisz profil
            </button>
            {suggestedCalories > 0 && (
              <button onClick={applyCalories} className="flex-1 bg-purple-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-purple-600 active:scale-95 transition-all">
                ✓ Zastosuj ({suggestedCalories} kcal)
              </button>
            )}
          </div>
        </div>

        {/* Water goal */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-base">
            💧 Cel nawodnienia
          </h2>
          <div className="flex gap-2">
            <input
              type="number"
              value={waterGoalInput}
              onChange={e => setWaterGoalInput(e.target.value)}
              className="flex-1 border-2 border-blue-100 rounded-xl px-3 py-2.5 text-center text-lg font-bold text-blue-600 focus:outline-none focus:border-blue-400"
            />
            <span className="flex items-center text-sm text-gray-400 font-medium px-1">ml</span>
            <button
              onClick={() => {
                const v = Number(waterGoalInput);
                if (v >= 500 && v <= 5000) { setWaterGoal(v); toast.success(`Cel wody: ${v} ml`); }
                else toast.error('Podaj wartość 500–5000 ml');
              }}
              className="bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-600 active:scale-95 transition-all"
            >
              Zapisz
            </button>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {[1500, 2000, 2500, 3000].map(v => (
              <button key={v} onClick={() => { setWaterGoalInput(String(v)); setWaterGoal(v); toast.success(`Cel wody: ${v} ml`); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${waterGoal === v ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {v} ml
              </button>
            ))}
          </div>
        </div>

        {/* Daily goals */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Target size={18} className="text-orange-500" />
              Dzienne cele
            </h2>
            <button onClick={resetGoals} className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors">
              <RotateCcw size={13} /> Reset
            </button>
          </div>
          <div className="space-y-4">
            <GoalField label="Kalorie" value={dailyGoal} onSave={setDailyGoal} unit="kcal" color="border-orange-200 text-orange-600" presets={CALORIE_PRESETS} />
            <div className="h-px bg-gray-100" />
            <GoalField label="Białko" value={proteinGoal} onSave={setProteinGoal} unit="g" color="border-blue-200 text-blue-600" presets={[40, 60, 80, 100, 130, 160]} />
            <div className="h-px bg-gray-100" />
            <GoalField label="Węglowodany" value={carbsGoal} onSave={setCarbsGoal} unit="g" color="border-yellow-200 text-yellow-600" presets={[150, 200, 250, 300, 350]} />
            <div className="h-px bg-gray-100" />
            <GoalField label="Tłuszcze" value={fatGoal} onSave={setFatGoal} unit="g" color="border-red-200 text-red-500" presets={[40, 55, 65, 80, 100]} />
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
            {darkMode ? <Moon size={18} className="text-indigo-500" /> : <Sun size={18} className="text-yellow-500" />}
            Wygląd
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Tryb ciemny</p>
              <p className="text-xs text-gray-400">Ciemne tło dla komfortowego czytania</p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 ${darkMode ? 'bg-indigo-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${darkMode ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {/* App info */}
        <div className="bg-orange-50 rounded-2xl p-4 text-center space-y-2">
          <p className="text-xs text-orange-600 font-medium">KulinApp v2.9</p>
          <p className="text-xs text-orange-400">Dane zapisywane lokalnie na urządzeniu</p>
          <button
            onClick={() => { setOnboardingDone(false); toast.success('Onboarding zresetowany'); }}
            className="text-[10px] text-orange-300 underline underline-offset-2"
          >
            Powtórz konfigurację
          </button>
        </div>
      </div>
    </div>
  );
}
