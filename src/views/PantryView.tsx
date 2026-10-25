import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft, Receipt, Plus, Check, Trash2, X, Bell, BellOff, ChefHat, Clock, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore, type Recipe } from '../store/useAppStore';
import { usePantryStore, monthStats } from '../store/usePantryStore';
import { POLISH_RECIPES } from '../data/polishRecipes';
import ReceiptScanner from '../components/ReceiptScanner';
import ChefAI from '../components/ChefAI';
import { useBackHandler } from '../lib/backButton';
import { requestPermission } from '../lib/notifications';
import { onImgError } from '../lib/images';
import { toLocalISO } from '../lib/date';
import {
  CATEGORIES, addDays, categoryInfo, daysLeft, daysLeftLabel, estimateShelfDays, guessCategory,
  rankRescueRecipes, urgencyOf, type PantryCategory, type PantryItem, type RescueMatch, type Urgency,
} from '../lib/pantry';

const URGENCY_STYLE: Record<Urgency, string> = {
  expired: 'bg-red-100 text-red-700',
  today:   'bg-red-100 text-red-700',
  soon:    'bg-amber-100 text-amber-700',
  week:    'bg-yellow-50 text-yellow-700',
  ok:      'bg-green-50 text-green-700',
};

const zl = (v: number) => `${v.toFixed(2).replace('.', ',')} zł`;

interface CatalogRecipe {
  id: string;
  name: string;
  time?: string;
  thumbnail: string;
  ingredients: Recipe['ingredients'];
  source: Recipe;
}

// Katalog + własne przepisy w jednym kształcie (jak w „Moich” → Ulubione).
function useAllRecipes(): CatalogRecipe[] {
  const myRecipes = useAppStore((s) => s.myRecipes);
  return useMemo(() => {
    const myIds = new Set(myRecipes.map((r) => r.id));
    const catalog = POLISH_RECIPES.filter((r) => !myIds.has(r.id)).map((r) => ({
      id: r.id, name: r.name, time: r.time, thumbnail: r.thumbnail, ingredients: r.ingredients,
      source: {
        id: r.id, name: r.name, category: r.category, area: 'Polska', instructions: r.instructions,
        thumbnail: r.thumbnail, ingredients: r.ingredients, totalCalories: r.totalCalories,
        servings: r.servings, tags: r.time,
      } as Recipe,
    }));
    const mine = myRecipes.map((r) => ({
      id: r.id, name: r.name, time: r.tags, thumbnail: r.photo || r.thumbnail, ingredients: r.ingredients, source: r,
    }));
    return [...catalog, ...mine];
  }, [myRecipes]);
}

export default function PantryView() {
  const { setActiveView, setSelectedRecipe } = useAppStore();
  const { items, closeItem, reopenItem, reminder, setReminder } = usePantryStore();
  const recipes = useAllRecipes();
  const [tab, setTab] = useState<'items' | 'cook'>('items');
  const [quickOnly, setQuickOnly] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editing, setEditing] = useState<PantryItem | 'new' | null>(null);
  const [cooked, setCooked] = useState<RescueMatch<CatalogRecipe> | null>(null);
  const [chefIngredients, setChefIngredients] = useState<string[] | null>(null);

  const today = toLocalISO();
  const active = useMemo(
    () => items.filter((i) => i.status === 'active').sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)),
    [items],
  );
  const needsDecision = active.filter((i) => daysLeft(i.expiresAt, today) <= 0);
  const rest = active.filter((i) => daysLeft(i.expiresAt, today) > 0);
  const stats = useMemo(() => monthStats(items, today), [items, today]);

  const ranked = useMemo(() => {
    const all = rankRescueRecipes(recipes, active, today);
    return (quickOnly ? all.filter((m) => m.minutes <= 30) : all).slice(0, 20);
  }, [recipes, active, today, quickOnly]);

  const close = (item: PantryItem, status: 'eaten' | 'wasted') => {
    closeItem(item.id, status);
    toast(
      (t) => (
        <span className="flex items-center gap-3">
          {status === 'eaten' ? '✅ Zjedzone' : '🗑️ Wyrzucone'}: {item.name}
          <button
            onClick={() => { reopenItem(item.id); toast.dismiss(t.id); }}
            className="font-bold text-orange-300 underline"
          >
            Cofnij
          </button>
        </span>
      ),
      { duration: 4000 },
    );
  };

  const extend = (item: PantryItem) => {
    usePantryStore.getState().updateItem(item.id, { expiresAt: addDays(today, 2), estimated: true });
    toast.success(`${item.name}: jeszcze 2 dni`);
  };

  const toggleReminder = async () => {
    if (!reminder.enabled && !(await requestPermission())) {
      toast.error('Brak zgody na powiadomienia — włącz je w ustawieniach telefonu.');
      return;
    }
    setReminder({ ...reminder, enabled: !reminder.enabled });
    toast.success(reminder.enabled ? 'Przypomnienia wyłączone' : `Przypomnę o ${reminder.hour}:00, gdy coś się będzie kończyć`);
  };

  const openRecipe = (r: CatalogRecipe) => {
    setSelectedRecipe(r.source);
    setActiveView('recipe-detail');
  };

  const askChef = () => {
    if (!active.length) { toast.error('Spiżarnia jest pusta'); return; }
    setChefIngredients(active.slice(0, 15).map((i) => i.name));
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-dvh">
      {/* Nagłówek */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-500 text-white px-5 pt-12 pb-5 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveView('home')} className="bg-white/20 rounded-xl p-2" aria-label="Wróć">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-bold">🥬 Moja spiżarnia</h1>
          </div>
          <button
            onClick={toggleReminder}
            className="bg-white/20 rounded-xl p-2"
            aria-label={reminder.enabled ? 'Wyłącz przypomnienia' : 'Włącz przypomnienia'}
          >
            {reminder.enabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
        </div>

        {/* Licznik miesiąca */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/20 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">{stats.rescued}</p>
            <p className="text-[10px] text-white/80 leading-tight">uratowane przed zepsuciem</p>
          </div>
          <div className="bg-white/20 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">{stats.eaten}</p>
            <p className="text-[10px] text-white/80 leading-tight">zjedzone w tym miesiącu</p>
          </div>
          <div className="bg-white/20 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">{stats.wasted}</p>
            <p className="text-[10px] text-white/80 leading-tight">wyrzucone</p>
          </div>
        </div>
        {stats.pricedCount > 0 && (
          <p className="text-xs text-white/90 mt-2 text-center">
            Uratowane warte {zl(stats.rescuedValue)} · wyrzucone {zl(stats.wastedValue)}
            <span className="text-white/70"> (tylko produkty z ceną)</span>
          </p>
        )}
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Dodawanie */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowScanner(true)}
            className="bg-teal-600 text-white rounded-2xl py-3 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <Receipt size={18} /> Skanuj paragon
          </button>
          <button
            onClick={() => setEditing('new')}
            className="bg-white text-gray-700 border border-gray-200 rounded-2xl py-3 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <Plus size={18} /> Dodaj ręcznie
          </button>
        </div>

        {/* Zakładki */}
        <div className="flex gap-2 bg-gray-100 rounded-2xl p-1">
          {([['items', `Produkty (${active.length})`], ['cook', 'Co ugotować']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === id ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'items' ? (
          active.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {needsDecision.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                  <p className="font-bold text-red-700 text-sm mb-1">Wymaga decyzji ({needsDecision.length})</p>
                  <p className="text-xs text-gray-500 mb-2">Termin mija albo minął. Zjedzone, wyrzucone, czy wciąż dobre?</p>
                  <div className="space-y-2">
                    {needsDecision.map((i) => (
                      <ItemRow key={i.id} item={i} today={today} onEdit={() => setEditing(i)}
                        onEaten={() => close(i, 'eaten')} onWasted={() => close(i, 'wasted')} onExtend={() => extend(i)} />
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {rest.map((i) => (
                  <ItemRow key={i.id} item={i} today={today} onEdit={() => setEditing(i)}
                    onEaten={() => close(i, 'eaten')} onWasted={() => close(i, 'wasted')} />
                ))}
              </div>
              <p className="text-[11px] text-gray-400 text-center px-4">
                Terminy oznaczone „~” są szacowane z rodzaju produktu. Stuknij produkt, żeby wpisać datę z opakowania.
              </p>
            </>
          )
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuickOnly((q) => !q)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${quickOnly ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                <Clock size={13} /> Do 30 minut
              </button>
              <button
                onClick={askChef}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200"
              >
                <Sparkles size={13} /> Zapytaj Szefa AI
              </button>
            </div>
            {active.length === 0 ? (
              <EmptyState />
            ) : ranked.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                Żaden przepis z katalogu nie pasuje do tego, co masz{quickOnly ? ' w 30 minut' : ''}. Spróbuj Szefa AI.
              </p>
            ) : (
              <div className="space-y-3">
                {ranked.map((m) => (
                  <RescueCard key={m.recipe.id} match={m} today={today}
                    onOpen={() => openRecipe(m.recipe)} onCooked={() => setCooked(m)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showScanner && <ReceiptScanner onClose={() => setShowScanner(false)} />}
      {editing && <ItemSheet item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {cooked && <CookedSheet match={cooked} onClose={() => setCooked(null)} />}
      {chefIngredients && <ChefAI initialIngredients={chefIngredients} onClose={() => setChefIngredients(null)} />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
      <p className="text-5xl mb-3">🧺</p>
      <p className="font-bold text-gray-700 mb-1">Spiżarnia jest pusta</p>
      <p className="text-sm text-gray-500">
        Zeskanuj paragon po zakupach albo dodaj produkty ręcznie. Podpowiemy, co zjeść najpierw i co z tego ugotować.
      </p>
    </div>
  );
}

function ItemRow({ item, today, onEdit, onEaten, onWasted, onExtend }: {
  item: PantryItem; today: string; onEdit: () => void; onEaten: () => void; onWasted: () => void; onExtend?: () => void;
}) {
  const left = daysLeft(item.expiresAt, today);
  const cat = categoryInfo(item.category);
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3">
      <button onClick={onEdit} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <span className="text-2xl flex-shrink-0">{cat.emoji}</span>
        <span className="min-w-0">
          <span className="block font-semibold text-sm text-gray-800 line-clamp-2 break-words">
            {item.name}{item.quantity ? <span className="font-normal text-gray-500"> · {item.quantity}</span> : null}
          </span>
          <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${URGENCY_STYLE[urgencyOf(left)]}`}>
            {item.estimated ? '~' : ''}{daysLeftLabel(left)}
          </span>
        </span>
      </button>
      {onExtend && (
        <button onClick={onExtend} className="text-[11px] font-semibold text-gray-600 bg-gray-100 rounded-xl px-2 py-2" title="Wciąż dobre">
          +2 dni
        </button>
      )}
      <button onClick={onEaten} className="p-2 rounded-xl bg-green-50 text-green-600" aria-label="Zjedzone">
        <Check size={18} />
      </button>
      <button onClick={onWasted} className="p-2 rounded-xl bg-gray-100 text-gray-500" aria-label="Wyrzucone">
        <Trash2 size={18} />
      </button>
    </div>
  );
}

function RescueCard({ match, today, onOpen, onCooked }: {
  match: RescueMatch<CatalogRecipe>; today: string; onOpen: () => void; onCooked: () => void;
}) {
  const { recipe, used, missing } = match;
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button onClick={onOpen} className="flex gap-3 p-3 w-full text-left">
        <img src={recipe.thumbnail} alt="" onError={onImgError} loading="lazy" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-gray-800 leading-tight">{recipe.name}</p>
          {recipe.time && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Clock size={11} /> {recipe.time}</p>}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {used.map((p) => (
              <span key={p.id} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${URGENCY_STYLE[urgencyOf(daysLeft(p.expiresAt, today))]}`}>
                {p.name}
              </span>
            ))}
          </div>
          {missing.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">Dokup: {missing.join(', ')}</p>
          )}
        </div>
      </button>
      <div className="flex border-t border-gray-100">
        <button onClick={onOpen} className="flex-1 py-2.5 text-xs font-semibold text-gray-600 flex items-center justify-center gap-1.5">
          <ChefHat size={14} /> Przepis
        </button>
        <button onClick={onCooked} className="flex-1 py-2.5 text-xs font-semibold text-teal-700 bg-teal-50 flex items-center justify-center gap-1.5">
          <Check size={14} /> Ugotowane
        </button>
      </div>
    </div>
  );
}

function Sheet({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: ReactNode; footer: ReactNode;
}) {
  useBackHandler(true, onClose);
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end pb-[var(--sa-bottom)]">
      <div className="bg-white w-full max-h-[90vh] rounded-t-3xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">{children}</div>
        <div className="px-5 py-3 border-t border-gray-100 flex gap-3 flex-shrink-0">{footer}</div>
      </div>
    </div>
  );
}

const fieldCls = 'w-full text-sm text-gray-800 bg-gray-100 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-500';

function ItemSheet({ item, onClose }: { item: PantryItem | null; onClose: () => void }) {
  const { addItems, updateItem, removeItem } = usePantryStore();
  const today = toLocalISO();
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState<PantryCategory>(item?.category ?? 'inne');
  const [categoryTouched, setCategoryTouched] = useState(!!item);
  const [quantity, setQuantity] = useState(item?.quantity ?? '');
  const [price, setPrice] = useState(item?.price ? item.price.toFixed(2) : '');
  const [expiresAt, setExpiresAt] = useState(item?.expiresAt ?? '');
  // Istniejący produkt trzyma swoją datę (także przedłużoną „+2 dni”);
  // nowy dostaje szacunek z nazwy i rodzaju, dopóki ktoś nie wpisze daty.
  const [dateTouched, setDateTouched] = useState(!!item);
  const [fromPack, setFromPack] = useState(!!item && !item.estimated);

  // Dopóki użytkownik sam nie wybrał kategorii, zgadujemy ją z nazwy.
  const effCategory = categoryTouched ? category : guessCategory(name);
  const effDate = dateTouched ? expiresAt : addDays(today, estimateShelfDays(name, effCategory));

  const save = () => {
    if (!name.trim()) { toast.error('Wpisz nazwę produktu'); return; }
    const p = parseFloat(price.replace(',', '.'));
    if (item) {
      updateItem(item.id, {
        name: name.trim(), category: effCategory, quantity: quantity.trim(),
        price: p > 0 ? p : undefined, expiresAt: effDate, estimated: !fromPack,
      });
    } else {
      addItems([{ name, category: effCategory, quantity, price: p > 0 ? p : undefined, expiresAt: fromPack ? effDate : undefined }]);
      toast.success(`Dodano: ${name.trim()}`);
    }
    onClose();
  };

  return (
    <Sheet
      title={item ? 'Produkt' : 'Dodaj produkt'}
      onClose={onClose}
      footer={<>
        {item && (
          <button
            onClick={() => { removeItem(item.id); toast('Usunięto z listy (bez liczenia do statystyk)'); onClose(); }}
            className="px-4 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold"
          >
            Usuń
          </button>
        )}
        <button onClick={save} className="flex-1 bg-teal-600 text-white py-3 rounded-2xl font-bold active:scale-95 transition-all">
          Zapisz
        </button>
      </>}
    >
      <label className="block">
        <span className="text-xs font-semibold text-gray-500">Nazwa</span>
        <input autoFocus={!item} value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Śmietana 18%" className={fieldCls} />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-gray-500">Rodzaj</span>
        <select value={effCategory} onChange={(e) => { setCategory(e.target.value as PantryCategory); setCategoryTouched(true); }} className={fieldCls}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-gray-500">Ilość</span>
          <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="np. 200 ml" className={fieldCls} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500">Cena (zł)</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="opcjonalnie" className={fieldCls} />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-semibold text-gray-500">
          Termin {fromPack ? '(z opakowania)' : '(szacowany — możesz zmienić)'}
        </span>
        <input
          type="date"
          value={effDate}
          onChange={(e) => { if (e.target.value) { setExpiresAt(e.target.value); setDateTouched(true); setFromPack(true); } }}
          className={fieldCls}
        />
      </label>
    </Sheet>
  );
}

function CookedSheet({ match, onClose }: { match: RescueMatch<CatalogRecipe>; onClose: () => void }) {
  const closeItem = usePantryStore((s) => s.closeItem);
  // Domyślnie zaznaczamy wszystko, co przepis zużywa. Duże opakowania
  // (np. worek ziemniaków) użytkownik odznacza — zostają w spiżarni.
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(match.used.map((p) => p.id)));
  const toggle = (id: string) => setChosen((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const confirm = () => {
    chosen.forEach((id) => closeItem(id, 'eaten'));
    toast.success(chosen.size ? `Smacznego! Zdjęto ze spiżarni: ${chosen.size}` : 'Smacznego!');
    onClose();
  };
  return (
    <Sheet
      title={`Ugotowane: ${match.recipe.name}`}
      onClose={onClose}
      footer={<button onClick={confirm} className="flex-1 bg-teal-600 text-white py-3 rounded-2xl font-bold active:scale-95 transition-all">Gotowe</button>}
    >
      <p className="text-sm text-gray-500">Zaznaczone produkty znikną ze spiżarni jako zjedzone. Odznacz to, czego jeszcze zostało.</p>
      {match.used.map((p) => (
        <button key={p.id} onClick={() => toggle(p.id)} className="w-full flex items-center gap-3 bg-gray-50 rounded-2xl p-3 text-left">
          <span className={`w-6 h-6 rounded-lg flex items-center justify-center border ${chosen.has(p.id) ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300 text-transparent'}`}>
            <Check size={14} />
          </span>
          <span className="text-sm font-semibold text-gray-800">{p.name}</span>
          {p.quantity && <span className="text-xs text-gray-500">{p.quantity}</span>}
        </button>
      ))}
    </Sheet>
  );
}
