import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Minus, Plus, Share2, ShoppingCart, CalendarClock, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { useAppStore } from '../store/useAppStore';
import { POLISH_RECIPES, catalogToRecipe, type PolishRecipe } from '../data/polishRecipes';
import { buildShoppingList } from '../lib/shoppingList';

// Menu wigilijne: wybór potraw (tradycyjnie 12), lista zakupów przeliczona na liczbę gości
// i plan przygotowań z datami. Stan zapisany w localStorage — wraca po zamknięciu aplikacji.
const KEY = 'xmasMenu';
interface MenuState { guests: number; selected: string[]; checked: string[] }
const load = (): MenuState => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as MenuState | null;
    if (s && Array.isArray(s.selected)) return { guests: s.guests || 6, selected: s.selected, checked: s.checked ?? [] };
  } catch { /* brak danych */ }
  return { guests: 6, selected: [], checked: [] };
};

const CLASSIC_12 = [
  'Barszcz wigilijny z uszkami', 'Zupa grzybowa wigilijna z łazankami', 'Karp smażony po polsku',
  'Karp po żydowsku w galarecie', 'Ryba po grecku', 'Śledź w śmietanie z cebulą', 'Śledź po japońsku',
  'Pierogi z kapustą i grzybami', 'Kapusta z grochem wigilijna', 'Kutia wigilijna', 'Kluski z makiem',
  'Kompot z suszu wigilijny',
];

const GROUPS: { title: string; test: (n: string) => boolean }[] = [
  { title: '🥣 Zupy', test: (n) => /barszcz|zupa|zakwas/i.test(n) },
  { title: '🐟 Ryby', test: (n) => /karp|ryba|sandacz|dorsz|szczupak/i.test(n) },
  { title: '🐠 Śledzie', test: (n) => /śledź|śledzie|rolmops/i.test(n) },
  { title: '🥟 Pierogi, kapusta i dodatki', test: () => true },
];
const SWEET = /kutia|mak|moczka|kompot|łamańce|makiełki/i;

type Stage = { id: string; title: string; when: string; hint: string };
const year = new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear();
const day = (d: number) => new Date(year, 11, d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
const STAGES: Stage[] = [
  { id: 'weeks', title: '3–4 tygodnie przed', when: `do ${day(1)}`, hint: 'Ciasto na piernik i marynaty muszą dojrzeć.' },
  { id: 'week', title: 'Tydzień przed', when: `ok. ${day(17)}`, hint: 'Zakwas i śledzie potrzebują kilku dni.' },
  { id: 'freeze', title: 'Kilka dni przed', when: `${day(20)}–${day(22)}`, hint: 'Lepienie pierogów i uszek — można je zamrozić.' },
  { id: 'day', title: 'Dzień przed Wigilią', when: day(23), hint: 'Kapusta, galarety, desery z makiem i kompot — smaczniejsze po nocy.' },
  { id: 'eve', title: 'W Wigilię', when: day(24), hint: 'Smażenie karpia, gotowanie zup i podgrzewanie.' },
  { id: 'xmas', title: 'Na święta', when: `${day(25)}–${day(26)}`, hint: 'Pieczenie mięs i obiad świąteczny (marynaty zacznij dzień wcześniej).' },
];
function stageFor(r: PolishRecipe): string {
  const t = r.time.toLowerCase(), n = r.name.toLowerCase();
  if (/tyg/.test(t) || /dojrzewając/.test(n)) return 'weeks';
  if (/dni/.test(t) || /zakwas|rolmops/.test(n)) return 'week';
  if (/pierog|uszk|krokiet|gołąbk|pierniczk/.test(n)) return 'freeze';
  if (r.category === 'Boże Narodzenie') return /noc|chłodz/.test(t) || /galaret|nóżki|pasztet|sernik/.test(n) ? 'day' : 'xmas';
  // „+ noc” albo co najmniej 4 godziny czekania (2-godzinna marynata robi się w dniu podania).
  const wait = t.match(/\+\s*(\d+(?:,\d+)?)\s*godz/);
  if (/noc/.test(t) || (wait && parseFloat(wait[1].replace(',', '.')) >= 4)) return 'day';
  if (/kapust|galaret|kutia|makiełk|moczk|kompot|łamańc/.test(n)) return 'day';
  return 'eve';
}

export default function ChristmasMenuView() {
  const { setActiveView, setSelectedRecipe } = useAppStore();
  const [state, setState] = useState<MenuState>(load);
  const [tab, setTab] = useState<'dishes' | 'shop' | 'plan'>(() => (load().selected.length ? 'shop' : 'dishes'));
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* brak miejsca */ }
  }, [state]);

  const wigilia = useMemo(() => POLISH_RECIPES.filter((r) => r.category === 'Wigilia'), []);
  const swieta = useMemo(() => POLISH_RECIPES.filter((r) => r.category === 'Boże Narodzenie'), []);
  const byId = useMemo(() => new Map(POLISH_RECIPES.map((r) => [r.id, r])), []);
  const selected = state.selected.map((id) => byId.get(id)).filter((r): r is PolishRecipe => !!r);
  const wigiliaCount = selected.filter((r) => r.category === 'Wigilia').length;

  const sections = useMemo(() => {
    const used = new Set<string>();
    const out: { title: string; items: PolishRecipe[] }[] = [];
    const savory = wigilia.filter((r) => !SWEET.test(r.name));
    for (const g of GROUPS) {
      const items = savory.filter((r) => !used.has(r.id) && g.test(r.name));
      items.forEach((r) => used.add(r.id));
      if (items.length) out.push({ title: g.title, items });
    }
    out.push({ title: '🍯 Desery i napoje wigilijne', items: wigilia.filter((r) => SWEET.test(r.name)) });
    out.push({ title: '🎁 Na pierwszy i drugi dzień świąt', items: swieta });
    return out;
  }, [wigilia, swieta]);

  const shopping = useMemo(() => buildShoppingList(selected.map((r) => ({
    name: r.name, factor: state.guests / r.servings, ingredients: r.ingredients,
  }))), [selected, state.guests]);
  const checkedCount = shopping.filter((i) => state.checked.includes(i.key)).length;

  const toggle = (id: string) => setState((s) => ({
    ...s, selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
  }));
  const toggleItem = (key: string) => setState((s) => ({
    ...s, checked: s.checked.includes(key) ? s.checked.filter((x) => x !== key) : [...s.checked, key],
  }));
  const setGuests = (g: number) => setState((s) => ({ ...s, guests: Math.min(30, Math.max(1, g)) }));
  const classic = () => {
    const ids = CLASSIC_12.map((n) => POLISH_RECIPES.find((r) => r.name === n)?.id).filter((x): x is string => !!x);
    setState((s) => ({ ...s, selected: [...new Set([...ids, ...s.selected.filter((id) => byId.get(id)?.category !== 'Wigilia')])] }));
    toast.success(`Wybrano ${ids.length} klasycznych potraw wigilijnych`);
  };
  const openRecipe = (r: PolishRecipe) => { setSelectedRecipe(catalogToRecipe(r)); setActiveView('recipe-detail'); };

  const shareList = async () => {
    const lines = shopping.filter((i) => !state.checked.includes(i.key)).map((i) => `☐ ${i.name} — ${i.label}`);
    const text = `🎄 Zakupy na Wigilię (${state.guests} os.)\n\n${lines.join('\n')}\n\n— KulinApp`;
    try {
      if (Capacitor.isNativePlatform()) await Share.share({ title: 'Zakupy na Wigilię', text });
      else if (navigator.share) await navigator.share({ title: 'Zakupy na Wigilię', text });
      else { await navigator.clipboard.writeText(text); toast.success('Lista skopiowana do schowka'); }
    } catch { /* anulowano */ }
  };

  const tabBtn = (id: typeof tab, label: string, Icon: typeof ShoppingCart) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
        tab === id ? 'bg-white shadow text-gray-800' : 'text-gray-500'
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  );

  return (
    <div className="pb-24 min-h-dvh bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-br from-red-600 to-emerald-700 text-white px-5 pt-12 pb-5 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setActiveView('home')} className="bg-white/20 rounded-xl p-2" aria-label="Wróć">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">🎄 Menu wigilijne</h1>
            <p className="text-xs text-white/80">Potrawy, zakupy i plan przygotowań</p>
          </div>
        </div>
        <div className="bg-white/15 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/80">Liczba osób</p>
            <div className="flex items-center gap-3 mt-1">
              <button onClick={() => setGuests(state.guests - 1)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center" aria-label="Mniej osób"><Minus size={16} /></button>
              <span className="text-2xl font-bold w-8 text-center">{state.guests}</span>
              <button onClick={() => setGuests(state.guests + 1)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center" aria-label="Więcej osób"><Plus size={16} /></button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{wigiliaCount}<span className="text-base font-normal text-white/70">/12</span></p>
            <p className="text-xs text-white/80">potraw wigilijnych</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="flex gap-1.5 bg-gray-200 rounded-2xl p-1 mb-4">
          {tabBtn('dishes', 'Potrawy', UtensilsCrossed)}
          {tabBtn('shop', `Zakupy (${shopping.length})`, ShoppingCart)}
          {tabBtn('plan', 'Plan', CalendarClock)}
        </div>

        {tab === 'dishes' && (
          <>
            <div className="flex gap-2 mb-4">
              <button onClick={classic} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold text-sm active:scale-95 transition-all">
                ✨ Klasyczne 12 potraw
              </button>
              {state.selected.length > 0 && (
                <button
                  onClick={() => { if (window.confirm('Wyczyścić wybrane potrawy i odhaczone zakupy?')) setState((s) => ({ ...s, selected: [], checked: [] })); }}
                  className="px-4 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold"
                >
                  Wyczyść
                </button>
              )}
            </div>
            {sections.map((sec) => (
              <div key={sec.title} className="mb-4">
                <h3 className="font-semibold text-gray-700 text-sm mb-2">{sec.title}</h3>
                <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
                  {sec.items.map((r) => {
                    const on = state.selected.includes(r.id);
                    return (
                      <div key={r.id} className="flex items-center">
                        <button onClick={() => toggle(r.id)} className="flex-1 flex items-center gap-3 px-3 py-3 text-left min-w-0">
                          <span className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center border-2 ${on ? 'bg-red-600 border-red-600 text-white' : 'border-gray-300'}`}>
                            {on && <Check size={14} />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-gray-800 truncate">{r.name}</span>
                            <span className="block text-[11px] text-gray-400">⏱ {r.time} · {Math.round(r.totalCalories / r.servings)} kcal/porcja</span>
                          </span>
                        </button>
                        <button onClick={() => openRecipe(r)} className="px-3 py-3 text-gray-300 hover:text-gray-500" aria-label={`Przepis: ${r.name}`}>
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'shop' && (
          selected.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <p className="text-4xl mb-2">🛒</p>
              <p className="text-gray-600 font-semibold">Najpierw wybierz potrawy</p>
              <button onClick={() => setTab('dishes')} className="mt-3 text-sm text-red-600 font-semibold">Przejdź do potraw</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">Kupione: <b className="text-gray-800">{checkedCount}/{shopping.length}</b> · na {state.guests} os.</p>
                <button onClick={shareList} className="flex items-center gap-1.5 text-sm text-red-600 font-semibold">
                  <Share2 size={15} /> Udostępnij
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
                {shopping.map((it) => {
                  const on = state.checked.includes(it.key);
                  return (
                    <button key={it.key} onClick={() => toggleItem(it.key)} className="w-full flex items-start gap-3 px-3 py-3 text-left">
                      <span className={`mt-0.5 w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center border-2 ${on ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300'}`}>
                        {on && <Check size={14} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`flex justify-between gap-2 text-sm ${on ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          <span className="font-medium">{it.name}</span>
                          <span className="font-semibold whitespace-nowrap">{it.label}</span>
                        </span>
                        {it.recipes.length > 0 && <span className="block text-[11px] text-gray-400 truncate">{it.recipes.join(', ')}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 text-center">
                Ilości przeliczone z przepisów na {state.guests} os. i zaokrąglone w górę.
              </p>
            </>
          )
        )}

        {tab === 'plan' && (
          selected.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <p className="text-4xl mb-2">🗓️</p>
              <p className="text-gray-600 font-semibold">Wybierz potrawy, a ułożę plan przygotowań</p>
            </div>
          ) : (
            <div className="space-y-3">
              {STAGES.map((st) => {
                const items = selected.filter((r) => stageFor(r) === st.id);
                if (!items.length) return null;
                return (
                  <div key={st.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="font-bold text-gray-800">{st.title}</h3>
                      <span className="text-xs font-semibold text-red-600">{st.when}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{st.hint}</p>
                    {items.map((r) => (
                      <button key={r.id} onClick={() => openRecipe(r)} className="w-full flex items-center justify-between py-1.5 text-left">
                        <span className="text-sm text-gray-700">• {r.name}</span>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap ml-2">⏱ {r.time}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
