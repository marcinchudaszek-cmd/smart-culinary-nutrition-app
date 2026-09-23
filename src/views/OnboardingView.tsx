import { useState } from 'react';
import { ChefHat, ArrowRight, Check, Flame, Droplets, Scale } from 'lucide-react';
import { useAppStore, UserProfile } from '../store/useAppStore';

type Step = 0 | 1 | 2 | 3;

const ACTIVITY_LABELS: Record<UserProfile['activityLevel'], string> = {
  sedentary:   '🛋️ Siedzący (biuro, mało ruchu)',
  light:       '🚶 Lekki (1–3 treningi/tydz.)',
  moderate:    '🏃 Umiarkowany (3–5 treningów)',
  active:      '💪 Aktywny (6–7 treningów)',
  very_active: '🏋️ Bardzo aktywny (sport wyczynowy)',
};

const ACTIVITY_FACTORS: Record<UserProfile['activityLevel'], number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

function calcGoals(p: UserProfile) {
  if (!p.age || !p.height || !p.weight || !p.gender) return null;
  const bmr = p.gender === 'male'
    ? 10 * p.weight + 6.25 * p.height - 5 * p.age + 5
    : 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[p.activityLevel]);
  const cal = p.weightGoal === 'lose' ? tdee - 500 : p.weightGoal === 'gain' ? tdee + 300 : tdee;
  return {
    calories: Math.max(cal, 1200),
    protein:  Math.round(p.weight * (p.weightGoal === 'lose' ? 2.2 : 1.8)),
    carbs:    Math.round((cal * 0.45) / 4),
    fat:      Math.round((cal * 0.25) / 9),
  };
}

export default function OnboardingView() {
  const { setOnboardingDone, setUserProfile, setDailyGoal, setProteinGoal, setCarbsGoal, setFatGoal } = useAppStore();

  const [step, setStep] = useState<Step>(0);
  const [profile, setProfile] = useState<UserProfile>({
    age: 0, gender: '', height: 0, weight: 0,
    activityLevel: 'moderate', weightGoal: 'maintain',
  });

  const goals = calcGoals(profile);

  function next() { setStep((s) => Math.min(s + 1, 3) as Step); }

  function finish() {
    setUserProfile(profile);
    if (goals) {
      setDailyGoal(goals.calories);
      setProteinGoal(goals.protein);
      setCarbsGoal(goals.carbs);
      setFatGoal(goals.fat);
    }
    setOnboardingDone(true);
  }

  const upd = (k: keyof UserProfile, v: UserProfile[keyof UserProfile]) =>
    setProfile((p) => ({ ...p, [k]: v }));

  const step1Valid = profile.gender !== '' && profile.age > 0 && profile.height > 0 && profile.weight > 0;

  /* ── Dot indicator ── */
  const Dots = () => (
    <div className="flex justify-center gap-2 mb-8">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`rounded-full transition-all duration-300 ${step === i ? 'w-6 h-2 bg-orange-500' : 'w-2 h-2 bg-orange-200'}`} />
      ))}
    </div>
  );

  /* ── Step 0: Welcome ── */
  if (step === 0) return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex flex-col items-center justify-center px-8 text-white slide-up">
      <div className="bg-white/20 rounded-3xl p-6 mb-8">
        <ChefHat size={64} className="text-white" />
      </div>
      <h1 className="text-4xl font-black mb-3 text-center">KulinApp</h1>
      <p className="text-lg text-white/90 text-center mb-2 font-medium">Twój kucharz i dietetyk w jednym</p>
      <p className="text-sm text-white/70 text-center mb-12">Przepisy · Kalorie · Plan posiłków · AI</p>

      <div className="w-full space-y-3 mb-8">
        {[
          { icon: <Flame size={18} />, text: 'Licznik kalorii i makroskładników' },
          { icon: <Droplets size={18} />, text: 'Śledzenie nawodnienia' },
          { icon: <Scale size={18} />, text: 'Kontrola wagi i BMI' },
          { icon: <ChefHat size={18} />, text: 'Setki polskich przepisów' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
            <span className="text-white/80">{icon}</span>
            <span className="text-sm font-medium">{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={next}
        className="w-full bg-white text-orange-600 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
      >
        Zaczynamy <ArrowRight size={22} />
      </button>
      <button
        onClick={finish}
        className="mt-4 text-white/60 text-sm underline underline-offset-2"
      >
        Pomiń konfigurację
      </button>
    </div>
  );

  /* ── Step 1: Profile ── */
  if (step === 1) return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-6 pt-14 pb-8 slide-up">
      <Dots />
      <h2 className="text-2xl font-black text-gray-800 mb-1">O Tobie</h2>
      <p className="text-gray-400 text-sm mb-8">Podaj swoje dane, by obliczyć indywidualne cele.</p>

      {/* Gender */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Płeć</p>
      <div className="flex gap-3 mb-6">
        {(['male', 'female'] as const).map((g) => (
          <button
            key={g}
            onClick={() => upd('gender', g)}
            className={`flex-1 py-3.5 rounded-2xl font-semibold text-sm transition-all border-2 ${
              profile.gender === g ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            {g === 'male' ? '👨 Mężczyzna' : '👩 Kobieta'}
          </button>
        ))}
      </div>

      {/* Age / Height / Weight */}
      {[
        { label: 'Wiek', key: 'age' as const, unit: 'lat', min: 10, max: 100, placeholder: 'np. 28' },
        { label: 'Wzrost', key: 'height' as const, unit: 'cm', min: 100, max: 250, placeholder: 'np. 175' },
        { label: 'Waga', key: 'weight' as const, unit: 'kg', min: 30, max: 300, placeholder: 'np. 70' },
      ].map(({ label, key, unit, placeholder }) => (
        <div key={key} className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={profile[key] || ''}
              onChange={(e) => upd(key, Number(e.target.value))}
              placeholder={placeholder}
              className="flex-1 bg-white border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-lg font-bold text-gray-800 focus:outline-none focus:border-orange-400 transition-colors"
            />
            <span className="text-gray-400 font-medium w-8">{unit}</span>
          </div>
        </div>
      ))}

      <div className="mt-auto">
        <button
          onClick={next}
          disabled={!step1Valid}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
            step1Valid ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Dalej <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );

  /* ── Step 2: Goal & Activity ── */
  if (step === 2) return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-6 pt-14 pb-8 slide-up">
      <Dots />
      <h2 className="text-2xl font-black text-gray-800 mb-1">Twój cel</h2>
      <p className="text-gray-400 text-sm mb-8">Dostosujemy plan kalorii do Twojego celu.</p>

      {/* Weight goal */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cel wagowy</p>
      <div className="space-y-2 mb-8">
        {([
          { val: 'lose',     emoji: '📉', title: 'Chcę schudnąć',      desc: '-500 kcal poniżej TDEE' },
          { val: 'maintain', emoji: '⚖️', title: 'Chcę utrzymać wagę', desc: 'Jedzenie = spalanie' },
          { val: 'gain',     emoji: '📈', title: 'Chcę przybrać',      desc: '+300 kcal powyżej TDEE' },
        ] as const).map(({ val, emoji, title, desc }) => (
          <button
            key={val}
            onClick={() => upd('weightGoal', val)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
              profile.weightGoal === val ? 'bg-orange-50 border-orange-400' : 'bg-white border-gray-200'
            }`}
          >
            <span className="text-2xl">{emoji}</span>
            <div>
              <p className={`font-semibold text-sm ${profile.weightGoal === val ? 'text-orange-700' : 'text-gray-800'}`}>{title}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            {profile.weightGoal === val && <Check size={16} className="ml-auto text-orange-500" />}
          </button>
        ))}
      </div>

      {/* Activity level */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Poziom aktywności</p>
      <div className="space-y-2">
        {(Object.entries(ACTIVITY_LABELS) as [UserProfile['activityLevel'], string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => upd('activityLevel', val)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
              profile.activityLevel === val ? 'bg-orange-50 border-orange-400 text-orange-800' : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            <span className="text-sm font-medium flex-1">{label}</span>
            {profile.activityLevel === val && <Check size={14} className="text-orange-500" />}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <button
          onClick={next}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-200 active:scale-95 transition-all"
        >
          Oblicz moje cele <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );

  /* ── Step 3: Summary ── */
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-6 pt-14 pb-8 slide-up">
      <Dots />

      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <Check size={40} className="text-green-500" />
      </div>

      <h2 className="text-2xl font-black text-gray-800 mb-2 text-center">Gotowe!</h2>
      <p className="text-gray-400 text-sm text-center mb-8">Twój spersonalizowany plan kalorii jest obliczony.</p>

      {goals && (
        <div className="w-full bg-white rounded-2xl p-5 shadow-sm mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Twoje dzienne cele</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Kalorie', val: goals.calories, unit: 'kcal', color: 'bg-orange-50 text-orange-600', bold: true },
              { label: 'Białko',  val: goals.protein,  unit: 'g',    color: 'bg-blue-50 text-blue-600',    bold: false },
              { label: 'Węgle',   val: goals.carbs,    unit: 'g',    color: 'bg-yellow-50 text-yellow-600',bold: false },
              { label: 'Tłuszcz',val: goals.fat,       unit: 'g',    color: 'bg-red-50 text-red-600',      bold: false },
            ].map(({ label, val, unit, color }) => (
              <div key={label} className={`${color} rounded-xl p-3 text-center`}>
                <p className="text-xl font-bold">{val}</p>
                <p className="text-[10px] font-medium opacity-70">{label}</p>
                <p className="text-[9px] opacity-50">{unit}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">Możesz to zmienić w Ustawieniach w każdej chwili.</p>
        </div>
      )}

      {!goals && (
        <div className="w-full bg-orange-50 rounded-2xl p-4 mb-6">
          <p className="text-sm text-orange-700 text-center">Pominięto konfigurację — zmień cele w Ustawieniach.</p>
        </div>
      )}

      <button
        onClick={finish}
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-orange-200 active:scale-95 transition-all"
      >
        🍳 Zacznij używać KulinApp!
      </button>
    </div>
  );
}
