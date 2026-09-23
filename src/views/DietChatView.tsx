import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader, Bot, User, Trash2, Utensils } from 'lucide-react';
import { useAppStore, activeAI } from '../store/useAppStore';
import { callAI } from '../lib/aiProvider';
import MealComposer from '../components/MealComposer';
import toast from 'react-hot-toast';
import { todayISO, toLocalISO } from '../lib/date';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

function buildContext(store: ReturnType<typeof useAppStore.getState>): string {
  const today = todayISO();
  const todayEntries = store.foodDiary.filter(e => e.date === today);
  const todayCal  = Math.round(todayEntries.reduce((s, e) => s + e.calories, 0));
  const todayProt = Math.round(todayEntries.reduce((s, e) => s + e.protein, 0));
  const todayCarb = Math.round(todayEntries.reduce((s, e) => s + e.carbs, 0));
  const todayFat  = Math.round(todayEntries.reduce((s, e) => s + e.fat, 0));

  // Last 7 days avg
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return toLocalISO(d);
  });
  const weekEntries = store.foodDiary.filter(e => days.includes(e.date));
  const weekCal = weekEntries.reduce((s, e) => s + e.calories, 0);
  const avgCal  = days.length > 0 ? Math.round(weekCal / 7) : 0;

  const { userProfile, dailyGoal, proteinGoal, carbsGoal, fatGoal, waterGoal,
    waterLog, weightLog } = store;

  const todayWater = waterLog.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
  const latestWeight = weightLog.length > 0
    ? [...weightLog].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
    : null;

  const bmi = userProfile.height && latestWeight
    ? (latestWeight.weight / Math.pow(userProfile.height / 100, 2)).toFixed(1)
    : null;

  const mealsList = todayEntries.map(e => `${e.name} (${e.calories} kcal)`).join(', ');

  return `KONTEKST UŻYTKOWNIKA:
- Dziś (${today}): ${todayCal} kcal / cel ${dailyGoal} kcal
- Makro dziś: białko ${todayProt}g (cel ${proteinGoal}g), węgle ${todayCarb}g (cel ${carbsGoal}g), tłuszcz ${todayFat}g (cel ${fatGoal}g)
- Nawodnienie dziś: ${todayWater} ml / cel ${waterGoal} ml
- Średnia kaloryczna (7 dni): ${avgCal} kcal
- Posiłki dziś: ${mealsList || 'brak wpisów'}
${userProfile.age ? `- Profil: ${userProfile.age} lat, ${userProfile.gender === 'male' ? 'mężczyzna' : 'kobieta'}, ${userProfile.height} cm, ${latestWeight?.weight ?? '?'} kg` : ''}
${bmi ? `- BMI: ${bmi}` : ''}
${userProfile.weightGoal ? `- Cel: ${userProfile.weightGoal === 'lose' ? 'odchudzanie' : userProfile.weightGoal === 'gain' ? 'przyrost masy' : 'utrzymanie wagi'}` : ''}`;
}

const SYSTEM_PROMPT = `Jesteś przyjaznym asystentem dietetycznym i kulinarnym o imieniu NutriBot. Odpowiadasz wyłącznie po polsku. Jesteś zwięzły, konkretny i pomocny. Możesz:
- Doradzać w kwestiach diety i żywienia
- Wyjaśniać wartości odżywcze produktów
- Proponować zdrowe zamiany składników
- Analizować jadłospis użytkownika
- Odpowiadać na pytania o kalorie i makroskładniki
- Motywować do zdrowego stylu życia

Nie jesteś lekarzem — w przypadku problemów zdrowotnych odsyłaj do specjalisty.`;

const QUICK_PROMPTS = [
  'Podsumuj mój dzisiejszy jadłospis',
  'Ile białka mi jeszcze brakuje?',
  'Co jeść wieczorem żeby nie przytyć?',
  'Jak poprawić nawodnienie?',
  'Czym zastąpić cukier w przepisach?',
  'Ile kalorii mam dziś spalić?',
];

export default function DietChatView() {
  const store = useAppStore();
  const { setActiveView, aiProvider } = store;

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Cześć! Jestem NutriBot 🥦 Twój asystent diety. Mam dostęp do Twojego dziennika kalorii i profilu. W czym mogę Ci dziś pomóc?',
      ts: Date.now(),
    }
  ]);
  const [input, setInput]   = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const { apiKey, model } = activeAI(store);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text: string) {
    const question = text.trim();
    if (!question) return;
    if (!apiKey) { toast.error('Brak klucza API — uzupełnij w Ustawieniach'); return; }

    const userMsg: Message = { role: 'user', text: question, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build history for multi-turn context (last 6 messages)
    const history = [...messages.slice(-6), userMsg];
    const historyText = history
      .map(m => `${m.role === 'user' ? 'Użytkownik' : 'NutriBot'}: ${m.text}`)
      .join('\n');

    const ctx = buildContext(useAppStore.getState());
    const prompt = `${SYSTEM_PROMPT}\n\n${ctx}\n\nROZMOWA:\n${historyText}\n\nNutriBot:`;

    try {
      const reply = await callAI(aiProvider, apiKey, model, { text: prompt });
      setMessages(prev => [...prev, { role: 'assistant', text: reply.trim(), ts: Date.now() }]);
    } catch (err) {
      toast.error('Błąd AI: ' + (err instanceof Error ? err.message.slice(0, 60) : ''));
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([{
      role: 'assistant',
      text: 'Rozmowa wyczyszczona. W czym mogę Ci pomóc? 🥦',
      ts: Date.now(),
    }]);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveView('home')} className="bg-gray-100 rounded-full p-2">
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <div>
              <h1 className="font-bold text-gray-800 flex items-center gap-2">
                <Bot size={18} className="text-green-500" /> NutriBot
              </h1>
              <p className="text-xs text-gray-400">Asystent diety</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowComposer(true)}
              className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-full hover:bg-orange-100 transition-colors active:scale-95"
            >
              <Utensils size={13} /> Skomponuj posiłek
            </button>
            <button onClick={clearChat} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {showComposer && <MealComposer onClose={() => setShowComposer(false)} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-orange-500' : 'bg-green-500'
            }`}>
              {msg.role === 'user'
                ? <User size={14} className="text-white" />
                : <Bot size={14} className="text-white" />}
            </div>
            <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-orange-500 text-white rounded-tr-sm'
                : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 2 && !loading && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="whitespace-nowrap bg-white border border-gray-200 text-gray-600 text-xs px-3 py-2 rounded-full shadow-sm hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all active:scale-95 flex-shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex gap-2 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Zadaj pytanie o dietę…"
          disabled={loading}
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-60"
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="bg-green-500 text-white rounded-2xl p-2.5 hover:bg-green-600 disabled:opacity-40 active:scale-95 transition-all"
        >
          {loading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
}
