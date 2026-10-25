import { useCallback, useState } from 'react';
import { Camera, Upload, X, Loader, Receipt, Check } from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import toast from 'react-hot-toast';
import { useAppStore, activeAI } from '../store/useAppStore';
import { usePantryStore } from '../store/usePantryStore';
import { callAI, parseAiJson } from '../lib/aiProvider';
import { resizeDataUrl } from '../lib/resizeImage';
import { useBackHandler } from '../lib/backButton';
import { toLocalISO } from '../lib/date';
import {
  CATEGORIES, addDays, asCategory, estimateShelfDays, type PantryCategory,
} from '../lib/pantry';

const RECEIPT_PROMPT = `Odczytujesz polskie paragony ze sklepów spożywczych (Biedronka, Lidl, Dino, Żabka, Kaufland, Auchan, Carrefour, Netto, Stokrotka, Lewiatan i inne). Na zdjęciu jest paragon papierowy albo zrzut e-paragonu z aplikacji sklepu.
Rozszyfruj skrócone nazwy pozycji na zwykłe nazwy produktów spożywczych po polsku.
Zasady:
- Pomiń wszystko, co nie jest jedzeniem ani piciem: torby, chemię, kosmetyki, kaucje, a także linie z rabatem, opustem, sumą, PTU i płatnością.
- Rabat albo opust przypisany do pozycji odejmij od jej ceny.
- name: krótka, zwyczajna nazwa z wielkiej litery, bez marki i gramatury, np. "MLEKO UHT 3,2% 1L" → "Mleko UHT 3,2%", "SER GOUDA PLAST.150G" → "Ser gouda w plastrach", "KAJZERKA 60G" → "Kajzerka".
- quantity: ilość albo gramatura, jeśli widać (np. "1 l", "150 g", "2 szt", "0,546 kg"), inaczej "".
- price: kwota zapłacona za całą pozycję w zł jako liczba, albo null.
- category: jedna z: nabial, mieso, ryby, wedliny, warzywa, owoce, pieczywo, jaja, mrozonki, suche, konserwy, napoje, slodycze, przyprawy, gotowe, inne.
- Kilka sztuk tego samego produktu w jednej linii to jedna pozycja z ilością.
- Czego nie da się odczytać, pomiń zamiast zgadywać.
Odpowiedz WYŁĄCZNIE obiektem JSON, bez dodatkowego tekstu:
{"shop":"nazwa sklepu albo pusty tekst","items":[{"raw":"tekst z paragonu","name":"...","quantity":"...","price":3.49,"category":"nabial"}]}
Jeśli na zdjęciu nie ma paragonu, zwróć {"shop":"","items":[],"error":"To nie wygląda na paragon"}.`;

interface AiReceipt {
  shop?: string;
  error?: string;
  items?: Array<{ raw?: string; name?: string; quantity?: string; price?: number | string | null; category?: string }>;
}

interface Row {
  key: number;
  include: boolean;
  raw: string;
  name: string;
  quantity: string;
  price: string;
  category: PantryCategory;
  expiresAt: string;
  /** Data wpisana ręcznie — wtedy zmiana nazwy/kategorii jej nie nadpisuje. */
  manualDate: boolean;
}

const estimate = (name: string, category: PantryCategory) =>
  addDays(toLocalISO(), estimateShelfDays(name, category));

function toPrice(v: unknown): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : '';
}

export default function ReceiptScanner({ onClose }: { onClose: () => void }) {
  const store = useAppStore();
  const { setActiveView } = store;
  const { provider, apiKey, model } = activeAI(store);
  const addItems = usePantryStore((s) => s.addItems);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shop, setShop] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  useBackHandler(true, onClose);

  // Paragon jest wąski i długi, a drobny druk musi zostać czytelny dla AI —
  // dlatego dłuższy bok 2000 px zamiast domyślnych 1280.
  const applyImage = useCallback(async (dataUrl: string) => {
    setRows(null);
    setError(null);
    setImage(await resizeDataUrl(dataUrl, 2000, 0.85));
  }, []);

  const pick = useCallback(async (source: CameraSource) => {
    try {
      const photo = await CapCamera.getPhoto({ source, resultType: CameraResultType.DataUrl, quality: 90 });
      if (photo.dataUrl) await applyImage(photo.dataUrl);
    } catch { /* anulowano */ }
  }, [applyImage]);

  const analyze = async () => {
    if (!image || !apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await callAI(provider, apiKey, model, { text: RECEIPT_PROMPT, imageDataUrl: image });
      const data = parseAiJson<AiReceipt>(raw);
      const items = (data.items ?? []).filter((i) => (i.name ?? '').trim());
      if (!items.length) {
        setError(data.error || 'Nie udało się odczytać żadnego produktu. Zrób zdjęcie bliżej i przy lepszym świetle.');
        return;
      }
      setShop(data.shop ?? '');
      setRows(items.map((i, key) => {
        const name = (i.name ?? '').trim();
        const category = asCategory(i.category);
        return {
          key, include: true, raw: i.raw ?? '', name, quantity: i.quantity ?? '',
          price: toPrice(i.price), category, expiresAt: estimate(name, category), manualDate: false,
        };
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Błąd AI');
    } finally {
      setLoading(false);
    }
  };

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs?.map((r) => {
      if (r.key !== key) return r;
      const next = { ...r, ...patch };
      if (!next.manualDate && ('name' in patch || 'category' in patch)) {
        next.expiresAt = estimate(next.name, next.category);
      }
      return next;
    }) ?? null);

  const save = () => {
    const chosen = (rows ?? []).filter((r) => r.include && r.name.trim());
    if (!chosen.length) { toast.error('Zaznacz przynajmniej jeden produkt'); return; }
    addItems(chosen.map((r) => ({
      name: r.name, category: r.category, quantity: r.quantity,
      price: parseFloat(r.price.replace(',', '.')) || undefined,
      // Termin szacowany zostawiamy jako szacunek — liczy go store z tą samą regułą.
      expiresAt: r.manualDate ? r.expiresAt : undefined,
    })));
    toast.success(`Dodano do spiżarni: ${chosen.length}`);
    onClose();
  };

  const chosenCount = rows?.filter((r) => r.include).length ?? 0;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end pb-[var(--sa-bottom)]">
      <div className="bg-white w-full max-h-[92vh] rounded-t-3xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Receipt size={18} className="text-teal-600" /> Skanuj paragon
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {!apiKey ? (
            <div className="bg-blue-50 rounded-2xl p-5 text-center">
              <p className="text-4xl mb-3">🧠</p>
              <p className="font-semibold text-blue-700 mb-1">Wymagany klucz API</p>
              <p className="text-gray-500 text-sm mb-4">Odczyt paragonu potrzebuje AI. Produkty możesz też dodawać ręcznie.</p>
              <button
                onClick={() => { onClose(); setActiveView('settings'); }}
                className="bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-all"
              >
                Dodaj klucz API →
              </button>
            </div>
          ) : !image ? (
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-3xl p-8 text-center border-2 border-dashed border-teal-200">
              <div className="text-5xl mb-3">🧾</div>
              <h3 className="font-bold text-gray-700 text-base mb-1">Zrób zdjęcie paragonu</h3>
              <p className="text-gray-500 text-sm mb-5">Albo wybierz zrzut e-paragonu z aplikacji sklepu. AI rozpisze produkty i oszacuje terminy.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => pick(CameraSource.Camera)}
                  className="flex items-center gap-2 bg-teal-600 text-white px-5 py-3 rounded-2xl font-semibold shadow-lg active:scale-95 transition-all"
                >
                  <Camera size={18} /> Aparat
                </button>
                <button
                  onClick={() => pick(CameraSource.Photos)}
                  className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-3 rounded-2xl font-semibold shadow-sm active:scale-95 transition-all"
                >
                  <Upload size={18} /> Galeria
                </button>
              </div>
            </div>
          ) : !rows ? (
            <>
              <div className="relative rounded-3xl overflow-hidden shadow-lg bg-gray-100">
                <img src={image} alt="Paragon" className="w-full max-h-72 object-contain" />
                <button
                  onClick={() => { setImage(null); setError(null); }}
                  className="absolute top-3 right-3 bg-black/50 text-white rounded-full p-2"
                >
                  <X size={18} />
                </button>
              </div>
              {error && <div className="bg-red-50 text-red-700 text-sm rounded-2xl px-4 py-3">{error}</div>}
              <button
                onClick={analyze}
                disabled={loading}
                className="w-full bg-teal-600 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
              >
                {loading ? <><Loader size={18} className="animate-spin" /> Czytam paragon…</> : 'Odczytaj produkty'}
              </button>
            </>
          ) : (
            <>
              <div className="bg-amber-50 text-amber-800 text-xs rounded-2xl px-4 py-3">
                {shop ? <><strong>{shop}</strong> · </> : null}
                Sprawdź nazwy i odznacz to, czego nie chcesz w spiżarni. Terminy są szacowane z rodzaju produktu — jeśli znasz datę z opakowania, popraw ją.
              </div>
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.key} className={`rounded-2xl border p-3 transition-opacity ${r.include ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => update(r.key, { include: !r.include })}
                        className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center border ${r.include ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300 text-transparent'}`}
                        aria-label={r.include ? 'Odznacz' : 'Zaznacz'}
                      >
                        <Check size={14} />
                      </button>
                      <input
                        value={r.name}
                        onChange={(e) => update(r.key, { name: e.target.value })}
                        className="flex-1 min-w-0 font-semibold text-sm text-gray-800 bg-transparent border-b border-gray-200 focus:border-teal-500 outline-none py-1"
                      />
                      <input
                        value={r.price}
                        onChange={(e) => update(r.key, { price: e.target.value })}
                        inputMode="decimal"
                        placeholder="zł"
                        className="w-16 text-right text-sm text-gray-700 bg-transparent border-b border-gray-200 focus:border-teal-500 outline-none py-1"
                      />
                    </div>
                    {r.raw && <p className="text-[10px] text-gray-400 mt-1 ml-8 truncate">{r.raw}</p>}
                    <div className="flex items-center gap-2 mt-2 ml-8">
                      <select
                        value={r.category}
                        onChange={(e) => update(r.key, { category: e.target.value as PantryCategory })}
                        className="flex-1 min-w-0 text-xs bg-gray-100 text-gray-700 rounded-lg px-2 py-1.5 outline-none"
                      >
                        {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                      </select>
                      <input
                        type="date"
                        value={r.expiresAt}
                        onChange={(e) => e.target.value && update(r.key, { expiresAt: e.target.value, manualDate: true })}
                        className="text-xs bg-gray-100 text-gray-700 rounded-lg px-2 py-1.5 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {rows && (
          <div className="px-5 py-3 border-t border-gray-100 flex gap-3 flex-shrink-0">
            <button
              onClick={() => { setRows(null); setImage(null); }}
              className="px-4 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold"
            >
              Inne zdjęcie
            </button>
            <button
              onClick={save}
              disabled={!chosenCount}
              className="flex-1 bg-teal-600 text-white py-3 rounded-2xl font-bold disabled:opacity-50 active:scale-95 transition-all"
            >
              Dodaj {chosenCount} do spiżarni
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
