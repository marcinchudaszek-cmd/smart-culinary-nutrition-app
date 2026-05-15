import { useState } from 'react';
import { ArrowLeft, Target, Eye, EyeOff, ExternalLink, RotateCcw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import toast from 'react-hot-toast';

const CALORIE_PRESETS = [1500, 1800, 2000, 2200, 2500, 3000];

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
    if (temp > 0) {
      onSave(temp);
      toast.success(`${label} zaktualizowane!`);
    }
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
                value === p ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'
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
    geminiApiKey, setGeminiApiKey,
  } = useAppStore();

  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [showKey, setShowKey] = useState(false);

  const saveApiKey = () => {
    setGeminiApiKey(apiKeyInput.trim());
    toast.success(apiKeyInput.trim() ? 'Klucz API zapisany!' : 'Klucz API usunięty');
  };

  const resetGoals = () => {
    setDailyGoal(2000);
    setProteinGoal(60);
    setCarbsGoal(250);
    setFatGoal(65);
    toast.success('Cele zresetowane do domyślnych');
  };

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('home')}
            className="bg-gray-100 rounded-full p-2"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Ustawienia</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Daily goals */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Target size={18} className="text-orange-500" />
              Dzienne cele
            </h2>
            <button
              onClick={resetGoals}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          </div>

          <div className="space-y-4">
            <GoalField
              label="Kalorie"
              value={dailyGoal}
              onSave={setDailyGoal}
              unit="kcal"
              color="border-orange-200 text-orange-600"
              presets={CALORIE_PRESETS}
            />
            <div className="h-px bg-gray-100" />
            <GoalField
              label="Białko"
              value={proteinGoal}
              onSave={setProteinGoal}
              unit="g"
              color="border-blue-200 text-blue-600"
              presets={[40, 60, 80, 100, 130, 160]}
            />
            <div className="h-px bg-gray-100" />
            <GoalField
              label="Węglowodany"
              value={carbsGoal}
              onSave={setCarbsGoal}
              unit="g"
              color="border-yellow-200 text-yellow-600"
              presets={[150, 200, 250, 300, 350]}
            />
            <div className="h-px bg-gray-100" />
            <GoalField
              label="Tłuszcze"
              value={fatGoal}
              onSave={setFatGoal}
              unit="g"
              color="border-red-200 text-red-500"
              presets={[40, 55, 65, 80, 100]}
            />
          </div>
        </div>

        {/* Gemini API */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
            🤖 Skaner AI — Gemini
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Podaj darmowy klucz API Google Gemini, aby skaner rozpoznawał potrawy ze zdjęcia.
          </p>

          <div className="relative mb-3">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-orange-400 font-mono"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            onClick={saveApiKey}
            className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm active:scale-95 transition-all hover:bg-orange-600 mb-3"
          >
            Zapisz klucz API
          </button>

          {geminiApiKey && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-3 py-2 text-xs font-medium mb-3">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Klucz API aktywny
            </div>
          )}

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-500 text-xs font-medium hover:underline"
          >
            <ExternalLink size={13} />
            Pobierz darmowy klucz — Google AI Studio
          </a>
          <p className="text-xs text-gray-400 mt-2">
            Darmowy plan: 15 zapytań/min, 1 500 000 tokenów/dzień. Nie wymaga karty kredytowej.
          </p>
        </div>

        {/* Info */}
        <div className="bg-orange-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-orange-600 font-medium">KulinApp</p>
          <p className="text-xs text-orange-400 mt-0.5">Dane zapisywane lokalnie w przeglądarce</p>
        </div>
      </div>
    </div>
  );
}
