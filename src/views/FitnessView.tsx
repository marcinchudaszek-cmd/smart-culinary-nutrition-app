import { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Plus, X, Flame, Activity, RefreshCw, Wifi, WifiOff, Settings2, Dumbbell, Download } from 'lucide-react';
import { Health } from '@capgo/capacitor-health';
import { Capacitor } from '@capacitor/core';
import { useAppStore } from '../store/useAppStore';
import {
  ACTIVITIES,
  ACTIVITY_CATEGORIES,
  calcBurnedCalories,
  Activity as ActivityType,
} from '../data/activities';
import toast from 'react-hot-toast';
import { todayISO, toLocalISO } from '../lib/date';
import { useBackHandler } from '../lib/backButton';

type FitnessTab = 'journal' | 'calculator' | 'indicators' | 'macro';

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcBMR(weight: number, height: number, age: number, gender: string): number {
  if (!weight || !height || !age) return 0;
  if (gender === 'male') return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
}

const ACT_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const WORKOUT_LABELS: Record<string, string> = {
  running: 'Bieganie', walking: 'Chodzenie', cycling: 'Jazda na rowerze',
  swimming: 'Pływanie', swimmingPool: 'Pływanie (basen)', strengthTraining: 'Trening siłowy',
  traditionalStrengthTraining: 'Trening siłowy', yoga: 'Yoga', pilates: 'Pilates',
  soccer: 'Piłka nożna', basketball: 'Koszykówka', tennis: 'Tenis',
  badminton: 'Badminton', volleyball: 'Siatkówka', boxing: 'Boks',
  rowing: 'Wioślarstwo', elliptical: 'Elipsa', stairClimbing: 'Schody',
  skiing: 'Narciarstwo', snowboarding: 'Snowboard', hiking: 'Wędrówki',
  dance: 'Taniec', highIntensityIntervalTraining: 'HIIT', crossTraining: 'CrossFit',
  functionalStrengthTraining: 'Trening funkcjonalny', jumpRope: 'Skakanka',
  martialArts: 'Sztuki walki', gymnastics: 'Gimnastyka', stretching: 'Stretching',
  other: 'Inne',
};

function workoutLabel(type: string): string {
  return WORKOUT_LABELS[type] || type;
}

const MACRO_GOALS = [
  {
    id: 'reduce',  label: 'Redukcja',         emoji: '🔥', desc: 'Spalanie tłuszczu',
    grad: 'from-red-400 to-orange-400',    calMult: 0.8,  p: 0.30, c: 0.40, f: 0.30,
    tips: ['Deficyt 500–700 kcal/d → ~0,5 kg / tydz.', 'Wysokie białko chroni mięśnie', 'Ogranicz cukry proste'],
  },
  {
    id: 'muscle',  label: 'Masa mięśniowa',   emoji: '💪', desc: 'Budowa mięśni',
    grad: 'from-blue-400 to-indigo-500',   calMult: 1.1,  p: 0.35, c: 0.45, f: 0.20,
    tips: ['Nadwyżka 200–400 kcal/d sprzyja masie', 'Białko: 1,8–2,2 g / kg / dzień', 'Węgle przed i po treningu'],
  },
  {
    id: 'recomp',  label: 'Rekompozycja',     emoji: '⚖️', desc: 'Tłuszcz ↓ + mięśnie ↑',
    grad: 'from-purple-400 to-pink-400',   calMult: 0.95, p: 0.35, c: 0.40, f: 0.25,
    tips: ['Wymaga cierpliwości – wolniejszy proces', 'Wysokie białko + trening siłowy', 'Jedz blisko kalorii konserwacyjnych'],
  },
  {
    id: 'health',  label: 'Zdrowe odżywianie', emoji: '🥗', desc: 'Utrzymanie i zdrowie',
    grad: 'from-green-400 to-teal-400',    calMult: 1.0,  p: 0.20, c: 0.50, f: 0.30,
    tips: ['Zbilansowana dieta = dobry fundament', '5 porcji warzyw i owoców / dzień', 'Ogranicz przetworzoną żywność'],
  },
];

// ── Health Connect sync card ─────────────────────────────────────────────────
// Tylko to, czego używa import treningów: sesje ćwiczeń + spalone kalorie
// (aktywne, a gdy ich brak — całkowite). Musi się zgadzać z AndroidManifest.xml.
const HC_READ: Array<'workouts' | 'calories' | 'totalCalories'> = ['workouts', 'calories', 'totalCalories'];
function HealthSyncCard() {
  const { activityLog, addActivityEntry, userProfile } = useAppStore();
  const [hcAvailable, setHcAvailable] = useState(false);
  const [hcAuthorized, setHcAuthorized] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    Health.isAvailable()
      .then((r) => {
        setHcAvailable(r.available);
        if (r.available) {
          return Health.checkAuthorization({ read: HC_READ });
        }
      })
      .then((status) => {
        if (status) {
          setHcAuthorized(status.readAuthorized.length > 0);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  async function handleConnect() {
    try {
      const status = await Health.requestAuthorization({ read: HC_READ, write: [] });
      setHcAuthorized(status.readAuthorized.length > 0);
      if (status.readAuthorized.length > 0) {
        toast.success('Połączono z Health Connect! 🔗');
      } else {
        toast.error('Odmówiono dostępu do Health Connect');
      }
    } catch {
      toast.error('Health Connect niedostępny na tym urządzeniu');
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const result = await Health.queryWorkouts({
        startDate: start.toISOString(),
        endDate: new Date().toISOString(),
        limit: 100,
        ascending: false,
      });

      let imported = 0;
      for (const w of result.workouts) {
        const entryId = `hc-${w.platformId || w.startDate}`;
        if (activityLog.find((e) => e.id === entryId)) continue;

        // Dzień wg lokalnej strefy — split('T') dawał dzień w UTC, więc trening
        // zaczęty tuż po północy trafiał pod poprzedni dzień.
        const date = toLocalISO(new Date(w.startDate));
        const durationMin = Math.round(w.duration / 60);
        const calories = w.totalEnergyBurned
          ? Math.round(w.totalEnergyBurned)
          : Math.round(5 * (userProfile.weight || 70) * (w.duration / 3600));

        addActivityEntry({
          id: entryId,
          activityId: 'hc-import',
          activityName: `${workoutLabel(w.workoutType)} 🔄 (${w.sourceName || 'Health Connect'})`,
          duration: durationMin,
          caloriesBurned: calories,
          date,
        });
        imported++;
      }

      setLastSyncTime(new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }));
      toast.success(imported > 0 ? `Zaimportowano ${imported} treningów 🔄` : 'Brak nowych treningów');
    } catch {
      toast.error('Błąd synchronizacji z Health Connect');
    } finally {
      setSyncing(false);
    }
  }

  async function handleOpenSettings() {
    try {
      await Health.openHealthConnectSettings();
    } catch {
      toast.error('Nie można otworzyć ustawień Health Connect');
    }
  }

  if (checking) return null;

  const isAndroid = Capacitor.getPlatform() === 'android';

  // Na przeglądarce / iOS — pokaż info
  if (!isAndroid) {
    return (
      <div className="bg-gray-100 dark:bg-gray-700/60 border border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-4 flex items-start gap-3">
        <WifiOff size={20} className="text-gray-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-300">Health Connect — tylko Android</p>
          <p className="text-xs text-gray-400 mt-0.5">Synchronizacja z zegarkiem i innymi aplikacjami działa na urządzeniu z Androidem po zainstalowaniu aplikacji.</p>
        </div>
      </div>
    );
  }

  // Na Androidzie ale HC nie zainstalowany
  if (!hcAvailable) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <WifiOff size={18} className="text-blue-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Zainstaluj Health Connect</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Aplikacja Health Connect jest wymagana do synchronizacji danych z zegarka Wear OS, Samsung Health, Google Fit i Strava.
        </p>
        <div className="flex gap-2 flex-wrap mb-2">
          {['⌚ Wear OS', '🏃 Strava', '📱 Samsung', '💚 Google Fit'].map(l => (
            <span key={l} className="bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 text-[11px] px-2 py-0.5 rounded-full">{l}</span>
          ))}
        </div>
        <button
          onClick={() => Health.openHealthConnectSettings().catch(() => {})}
          className="w-full bg-blue-500 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Download size={15} /> Zainstaluj Health Connect
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-4 border-2 ${hcAuthorized ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {hcAuthorized
            ? <Wifi size={18} className="text-emerald-500" />
            : <WifiOff size={18} className="text-blue-400" />}
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">Health Connect</span>
          {hcAuthorized && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Połączono</span>
          )}
        </div>
        {hcAuthorized && (
          <button onClick={handleOpenSettings} className="text-gray-400 hover:text-gray-600 transition-colors">
            <Settings2 size={16} />
          </button>
        )}
      </div>

      {hcAuthorized ? (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Synchronizuj treningi z Wear OS, Samsung Galaxy Watch, Garmin, Strava, Google Fit i innych aplikacji
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 bg-emerald-500 text-white rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Synchronizuję…' : 'Synchronizuj (7 dni)'}
            </button>
          </div>
          {lastSyncTime && (
            <p className="text-xs text-gray-400 mt-2 text-center">Ostatnia sync: {lastSyncTime}</p>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Połącz KulinApp z Health Connect, aby automatycznie importować treningi z zegarka i innych aplikacji fitness
          </p>
          <div className="flex gap-1 mb-3">
            {['⌚', '📱', '🏃', '🚴', '🏊'].map((i) => (
              <span key={i} className="text-xl">{i}</span>
            ))}
          </div>
          <button
            onClick={handleConnect}
            className="w-full bg-blue-500 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Wifi size={14} /> Połącz z Health Connect
          </button>
        </>
      )}
    </div>
  );
}

// ── JournalTab ───────────────────────────────────────────────────────────────
function JournalTab() {
  const { activityLog, addActivityEntry, removeActivityEntry, userProfile } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [catFilter, setCatFilter] = useState('Cardio');
  const [selected, setSelected] = useState<ActivityType | null>(null);
  const [duration, setDuration] = useState(30);
  useBackHandler(showModal, () => setShowModal(false));

  const today = todayISO();
  const todayLog = activityLog.filter((e) => e.date === today);
  const totalBurned = todayLog.reduce((s, e) => s + e.caloriesBurned, 0);
  const totalDuration = todayLog.reduce((s, e) => s + e.duration, 0);
  const weight = userProfile.weight || 70;
  const preview = selected ? calcBurnedCalories(selected.met, weight, duration) : 0;
  const filtered = ACTIVITIES.filter((a) => a.category === catFilter);

  function handleAdd() {
    if (!selected) { toast.error('Wybierz aktywność'); return; }
    if (duration < 1) { toast.error('Podaj czas trwania'); return; }
    addActivityEntry({
      id: `act-${Date.now()}`,
      activityId: selected.id,
      activityName: selected.name,
      duration,
      caloriesBurned: preview,
      date: today,
    });
    toast.success(`Zapisano: ${selected.name} 🏋️`);
    setShowModal(false);
    setSelected(null);
    setDuration(30);
  }

  return (
    <div className="space-y-4">
      {/* Today stats */}
      <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-xs font-medium">Aktywność dziś</p>
            <div className="flex items-baseline gap-3 mt-0.5">
              <div>
                <span className="text-3xl font-bold">{totalBurned}</span>
                <span className="text-base font-normal ml-1">kcal</span>
              </div>
              <div className="text-green-200 text-sm">
                <span className="font-semibold">{totalDuration}</span> min
                <span className="mx-1.5">·</span>
                <span className="font-semibold">{todayLog.length}</span> treningi
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-white/20 hover:bg-white/30 text-white rounded-2xl px-4 py-2.5 font-semibold text-sm flex items-center gap-2 active:scale-95 transition-all border border-white/30"
          >
            <Plus size={16} /> Dodaj
          </button>
        </div>
      </div>

      {/* Health Connect */}
      <HealthSyncCard />

      {/* Today's log */}
      {todayLog.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-50 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Dzisiejsze treningi</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {[...todayLog].reverse().map((e) => {
              const isHC = e.id.startsWith('hc-');
              return (
                <div key={e.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isHC ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                      <span className="text-lg">{isHC ? '🔄' : '💪'}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{e.activityName}</p>
                      <p className="text-xs text-gray-400">{e.duration} min</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-green-500 text-sm">−{e.caloriesBurned}</p>
                      <p className="text-[10px] text-gray-400">kcal</p>
                    </div>
                    <button onClick={() => removeActivityEntry(e.id)} className="text-gray-200 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm text-center">
          <Activity size={44} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-semibold">Brak aktywności dziś</p>
          <p className="text-gray-400 text-sm mt-1">Dodaj trening ręcznie lub zsynchronizuj z zegarkiem</p>
        </div>
      )}

      {/* History */}
      {activityLog.filter((e) => e.date !== today).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-50 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Historia treningów</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-60 overflow-y-auto">
            {[...activityLog]
              .filter((e) => e.date !== today)
              .reverse()
              .slice(0, 30)
              .map((e) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{e.activityName}</p>
                    <p className="text-xs text-gray-400">{e.date} · {e.duration} min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 font-bold text-sm">−{e.caloriesBurned} kcal</span>
                    <button onClick={() => removeActivityEntry(e.id)} className="text-gray-200 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Add modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end pb-[var(--sa-bottom)] justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">Dodaj aktywność</h3>
                <p className="text-xs text-gray-400">Waga: {weight} kg</p>
              </div>
              <button onClick={() => setShowModal(false)}><X size={22} className="text-gray-400" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 pb-5 pt-3">
              {/* Category tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                {ACTIVITY_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCatFilter(cat); setSelected(null); }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      catFilter === cat ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Activity list */}
              <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                {filtered.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                      selected?.id === a.id
                        ? 'bg-green-50 dark:bg-green-900/30 border-2 border-green-400'
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.icon} {a.name}</span>
                    <div className="text-right">
                      <span className="text-xs text-gray-400 block">MET {a.met}</span>
                      {selected?.id === a.id && duration > 0 && (
                        <span className="text-xs text-green-600 font-bold">
                          {calcBurnedCalories(a.met, weight, duration)} kcal
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Duration */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 font-medium mb-2 block">Czas trwania (minuty)</label>
                <div className="flex gap-1.5 mb-2">
                  {[15, 30, 45, 60, 90].map((m) => (
                    <button
                      key={m}
                      onClick={() => setDuration(m)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        duration === m ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {m}'
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {selected ? (
                <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-4 mb-4 text-white text-center">
                  <p className="text-sm opacity-80">{selected.icon} {selected.name}</p>
                  <p className="text-4xl font-bold my-1">{preview}</p>
                  <p className="text-sm opacity-80">kcal spalonych przez {duration} min</p>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 text-center mb-4">
                  <p className="text-gray-400 text-sm">Wybierz aktywność z listy powyżej</p>
                </div>
              )}

              <button
                onClick={handleAdd}
                className="w-full bg-green-500 text-white py-3.5 rounded-2xl font-bold active:scale-95 transition-all text-base"
              >
                ✓ Zapisz trening
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CalculatorTab ────────────────────────────────────────────────────────────
function CalculatorTab() {
  const { userProfile, addActivityEntry } = useAppStore();
  const [catFilter, setCatFilter] = useState('Cardio');
  const [selected, setSelected] = useState<ActivityType | null>(null);
  const [duration, setDuration] = useState(30);

  const weight = userProfile.weight || 70;
  const burned = selected ? calcBurnedCalories(selected.met, weight, duration) : 0;
  const filtered = ACTIVITIES.filter((a) => a.category === catFilter);

  function handleLog() {
    if (!selected) { toast.error('Wybierz aktywność'); return; }
    const today = todayISO();
    addActivityEntry({
      id: `act-${Date.now()}`,
      activityId: selected.id,
      activityName: selected.name,
      duration,
      caloriesBurned: burned,
      date: today,
    });
    toast.success(`Zapisano: ${burned} kcal 🔥`);
    setSelected(null);
  }

  return (
    <div className="space-y-4">
      {/* Waga info */}
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
          <Dumbbell size={22} className="text-green-600" />
        </div>
        <div>
          <p className="text-xs text-gray-400">Wzór: MET × {weight} kg × czas</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Kalkulator kalorii z ćwiczeń</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-400">Waga</p>
          <p className="font-bold text-gray-700 dark:text-gray-200">{weight} kg</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
          {ACTIVITY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCatFilter(cat); setSelected(null); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                catFilter === cat ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Activity list */}
        <div className="space-y-1.5 max-h-52 overflow-y-auto mb-4">
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                selected?.id === a.id
                  ? 'bg-green-50 dark:bg-green-900/30 border-2 border-green-400'
                  : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.icon} {a.name}</span>
              <div className="text-right">
                <span className="text-xs text-gray-400 block">MET {a.met}</span>
                {selected?.id === a.id && (
                  <span className="text-xs text-green-600 font-bold">{calcBurnedCalories(a.met, weight, duration)} kcal</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Duration */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Czas trwania</label>
            <span className="text-green-600 font-bold text-sm">{duration} min</span>
          </div>
          <input
            type="range" min={5} max={180} step={5} value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-green-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>5'</span><span>90'</span><span>3h</span>
          </div>
        </div>

        {/* Result */}
        {selected ? (
          <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-4 text-white text-center mb-4">
            <p className="text-sm opacity-80 mb-1">{selected.icon} {selected.name}</p>
            <p className="text-5xl font-black">{burned}</p>
            <p className="text-sm opacity-80 mt-1">kcal · {duration} min · {weight} kg</p>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-5 text-center mb-4">
            <Flame size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">Wybierz aktywność powyżej</p>
          </div>
        )}

        <button
          onClick={handleLog}
          disabled={!selected}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-all ${
            selected ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
          }`}
        >
          📋 Zapisz do dziennika aktywności
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold mb-1">ℹ️ Metoda MET</p>
        <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
          MET (Metabolic Equivalent) to wskaźnik intensywności aktywności.{' '}
          <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded font-mono">kcal = MET × kg × h</code>
        </p>
      </div>
    </div>
  );
}

// ── IndicatorsTab ────────────────────────────────────────────────────────────
function IndicatorsTab() {
  const { userProfile } = useAppStore();
  const { weight, height, age, gender, activityLevel } = userProfile;

  const hasProfile = weight > 0 && height > 0 && age > 0;
  const bmi = hasProfile ? weight / Math.pow(height / 100, 2) : 0;
  const bmr = calcBMR(weight, height, age, gender || 'male');
  const tdee = bmr ? Math.round(bmr * (ACT_FACTORS[activityLevel] ?? 1.55)) : 0;
  const ideal = hasProfile && height >= 152.4
    ? (gender === 'male'
        ? Math.round(50 + 2.3 * ((height - 152.4) / 2.54))
        : Math.round(45.5 + 2.3 * ((height - 152.4) / 2.54)))
    : 0;
  const bodyFat = bmi && age
    ? Math.round((1.2 * bmi + 0.23 * age - 10.8 * (gender === 'male' ? 1 : 0) - 5.4) * 10) / 10
    : 0;
  const water = weight
    ? Math.round((weight * 35 + (['active', 'very_active'].includes(activityLevel) ? 500 : 0)) / 100) * 100
    : 0;

  function bmiInfo(b: number) {
    if (b < 18.5) return { text: 'Niedowaga', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    if (b < 25)   return { text: 'Norma ✓',   color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' };
    if (b < 30)   return { text: 'Nadwaga',   color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
    return           { text: 'Otyłość',       color: 'text-red-600',    bg: 'bg-red-100 dark:bg-red-900/30' };
  }

  if (!hasProfile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm text-center">
        <span className="text-5xl block mb-3">📊</span>
        <p className="text-gray-700 dark:text-gray-200 font-bold text-lg mb-2">Uzupełnij profil</p>
        <p className="text-gray-400 text-sm leading-relaxed">
          Aby zobaczyć wskaźniki zdrowotne, uzupełnij profil w Ustawieniach (waga, wzrost, wiek, płeć).
        </p>
      </div>
    );
  }

  const bmi2 = bmiInfo(bmi);

  const cards = [
    { icon: '⚖️', label: 'BMI',              val: bmi.toFixed(1),  unit: '',        sub: bmi2.text,                          grad: 'from-purple-500 to-indigo-500' },
    { icon: '🔥', label: 'BMR',              val: bmr.toString(),   unit: 'kcal/d', sub: 'Podstawowa przemiana materii',      grad: 'from-orange-400 to-red-400'    },
    { icon: '⚡', label: 'TDEE',             val: tdee.toString(),  unit: 'kcal/d', sub: 'Całkowite zapotrzebowanie',         grad: 'from-green-400 to-teal-400'    },
    { icon: '🎯', label: 'Waga idealna',     val: ideal > 0 ? ideal.toString() : '—', unit: 'kg', sub: 'Wzór Devine\'a',    grad: 'from-blue-400 to-cyan-400'     },
    { icon: '📉', label: 'Tkanka tłuszczowa', val: bodyFat > 0 ? bodyFat.toString() : '—', unit: '%', sub: 'Deurenberg',    grad: 'from-yellow-400 to-orange-400' },
    { icon: '💧', label: 'Nawodnienie',       val: (water / 1000).toFixed(1), unit: 'L/d', sub: 'Waga + aktywność',         grad: 'from-blue-300 to-blue-500'     },
  ];

  return (
    <div className="space-y-4">
      {/* BMI highlight */}
      <div className={`${bmi2.bg} rounded-2xl p-4 border-2 ${bmi < 18.5 ? 'border-blue-200' : bmi < 25 ? 'border-green-200' : bmi < 30 ? 'border-yellow-200' : 'border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Twoje BMI</p>
            <p className={`text-4xl font-black ${bmi2.color}`}>{bmi.toFixed(1)}</p>
            <p className={`text-sm font-bold ${bmi2.color}`}>{bmi2.text}</p>
          </div>
          <div className="text-right text-xs text-gray-400 space-y-1">
            <p>Niedowaga: &lt;18.5</p>
            <p className="text-green-600 font-semibold">Norma: 18.5–24.9</p>
            <p>Nadwaga: 25–29.9</p>
            <p>Otyłość: ≥30</p>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`bg-gradient-to-br ${c.grad} rounded-2xl p-4 text-white shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{c.icon}</span>
              <span className="text-[10px] opacity-80 text-right leading-tight font-medium">{c.label}</span>
            </div>
            <p className="text-2xl font-black leading-none">
              {c.val}
              {c.unit && <span className="text-xs font-normal ml-1 opacity-80">{c.unit}</span>}
            </p>
            <p className="text-[11px] opacity-75 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Activity level label */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2 text-sm">Twój poziom aktywności</h4>
        <div className="flex gap-1">
          {[
            { id: 'sedentary', label: 'Siedzący', factor: 1.2 },
            { id: 'light', label: 'Lekki', factor: 1.375 },
            { id: 'moderate', label: 'Umiar.', factor: 1.55 },
            { id: 'active', label: 'Aktywny', factor: 1.725 },
            { id: 'very_active', label: 'Bardzo', factor: 1.9 },
          ].map((lvl) => (
            <div
              key={lvl.id}
              className={`flex-1 py-2 rounded-xl text-center text-[10px] font-semibold transition-all ${
                activityLevel === lvl.id
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
              }`}
            >
              {lvl.label}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Współczynnik: ×{ACT_FACTORS[activityLevel] ?? 1.55} · Zmień w Ustawieniach
        </p>
      </div>
    </div>
  );
}

// ── MacroTab ─────────────────────────────────────────────────────────────────
function MacroTab() {
  const { userProfile } = useAppStore();
  const { weight, height, age, gender, activityLevel } = userProfile;

  const [goalId, setGoalId] = useState('health');

  const hasProfile = weight > 0 && height > 0 && age > 0;
  const bmr = calcBMR(weight, height, age, gender || 'male');
  const tdee = bmr ? Math.round(bmr * (ACT_FACTORS[activityLevel] ?? 1.55)) : 2000;

  const goal = MACRO_GOALS.find((g) => g.id === goalId) ?? MACRO_GOALS[3];
  const targetCal = Math.round(tdee * goal.calMult);
  const proteinG = Math.round((targetCal * goal.p) / 4);
  const carbsG   = Math.round((targetCal * goal.c) / 4);
  const fatG     = Math.round((targetCal * goal.f) / 9);

  return (
    <div className="space-y-4">
      {/* Goal selector */}
      <div className="grid grid-cols-2 gap-3">
        {MACRO_GOALS.map((g) => (
          <button
            key={g.id}
            onClick={() => setGoalId(g.id)}
            className={`rounded-2xl p-4 text-left transition-all ${
              goalId === g.id
                ? `bg-gradient-to-br ${g.grad} text-white shadow-lg scale-[1.03]`
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm border-2 border-transparent hover:border-gray-200'
            }`}
          >
            <span className="text-3xl block mb-1">{g.emoji}</span>
            <p className="font-bold text-sm">{g.label}</p>
            <p className={`text-xs mt-0.5 ${goalId === g.id ? 'text-white/80' : 'text-gray-400'}`}>{g.desc}</p>
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-400">Cel kalorii dziennie</p>
            <p className="text-3xl font-black text-gray-800 dark:text-gray-100">{targetCal} <span className="text-lg font-normal text-gray-400">kcal</span></p>
          </div>
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${goal.grad} flex items-center justify-center text-2xl shadow-sm`}>
            {goal.emoji}
          </div>
        </div>

        {[
          { label: 'Białko',      g: proteinG, pct: Math.round(goal.p * 100), color: 'bg-blue-400',   bar: 'bg-blue-100 dark:bg-blue-900/20',   kcal: proteinG * 4 },
          { label: 'Węglowodany', g: carbsG,   pct: Math.round(goal.c * 100), color: 'bg-yellow-400', bar: 'bg-yellow-100 dark:bg-yellow-900/20', kcal: carbsG * 4   },
          { label: 'Tłuszcze',    g: fatG,     pct: Math.round(goal.f * 100), color: 'bg-red-400',    bar: 'bg-red-100 dark:bg-red-900/20',      kcal: fatG * 9     },
        ].map((m) => (
          <div key={m.label} className="mb-3">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{m.label}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                {m.g}g <span className="text-gray-400 font-normal text-xs">({m.pct}% · {m.kcal} kcal)</span>
              </span>
            </div>
            <div className={`h-3 ${m.bar} rounded-full overflow-hidden`}>
              <div className={`h-full ${m.color} rounded-full transition-all duration-500`} style={{ width: `${m.pct}%` }} />
            </div>
          </div>
        ))}

        {!hasProfile && (
          <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              ⚠️ Uzupełnij profil w Ustawieniach dla dokładnych wyliczeń (teraz: TDEE = 2000 kcal)
            </p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span>💡</span> Wskazówki — {goal.label}
        </h4>
        <ul className="space-y-2">
          {goal.tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="text-green-500 font-bold mt-0.5 flex-shrink-0">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Main FitnessView ──────────────────────────────────────────────────────────
export default function FitnessView() {
  const { setActiveView, activityLog } = useAppStore();
  const [tab, setTab] = useState<FitnessTab>('journal');

  const today = todayISO();
  const todayBurned = activityLog.filter((e) => e.date === today).reduce((s, e) => s + e.caloriesBurned, 0);

  const TABS: { id: FitnessTab; icon: string; label: string }[] = [
    { id: 'journal',    icon: '📋', label: 'Dziennik'  },
    { id: 'calculator', icon: '🔥', label: 'Kcal'      },
    { id: 'indicators', icon: '📊', label: 'Zdrow.'    },
    { id: 'macro',      icon: '💪', label: 'Makro'     },
  ];

  return (
    <div className="pb-24 bg-gray-50 dark:bg-gray-900 min-h-dvh">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-500 to-teal-500 text-white px-5 pt-12 pb-5 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveView('home')} className="bg-white/20 rounded-xl p-2">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Fitness</h1>
              <p className="text-green-100 text-xs">Aktywność i zdrowie</p>
            </div>
          </div>
          {todayBurned > 0 && (
            <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center">
              <p className="text-lg font-black">{todayBurned}</p>
              <p className="text-[10px] text-green-100">kcal dziś</p>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-black/20 rounded-2xl p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-all flex flex-col items-center gap-0.5 ${
                tab === t.id
                  ? 'bg-white text-green-700 shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="text-[11px]">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-5">
        {tab === 'journal'    && <JournalTab />}
        {tab === 'calculator' && <CalculatorTab />}
        {tab === 'indicators' && <IndicatorsTab />}
        {tab === 'macro'      && <MacroTab />}
      </div>
    </div>
  );
}
