import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useAppStore } from '../store/useAppStore';
import toast from 'react-hot-toast';
import { Flame, RotateCcw, X, Package, Loader, ScanLine, CameraOff, History, Trash2, Barcode } from 'lucide-react';
import { todayISO } from '../lib/date';
import { useBackHandler } from '../lib/backButton';
import { type ProductInfo, fetchProduct, loadHistory, saveToHistory, clearHistory } from '../lib/openFoodFacts';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '🌅 Śniadanie', lunch: '☀️ Obiad',
  dinner: '🌙 Kolacja',     snack: '🍎 Przekąska',
};

// Sensownie dobiera domyślny posiłek na podstawie aktualnej godziny
function defaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

// Pobieranie produktu i historia skanów są współdzielone z kreatorem posiłku.

export default function BarcodeScanner({ onClose }: { onClose?: () => void } = {}) {
  const { addFoodEntry, addMyProduct, myProducts } = useAppStore();

  const [scanning, setScanning] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(100);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [history, setHistory] = useState<ProductInfo[]>(() => loadHistory());
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [manual, setManual] = useState({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const stopScanner = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
    setScanning(false);
  };

  useBackHandler(!!onClose, () => { stopScanner(); onClose?.(); });

  const startScanner = async () => {
    setError(null);
    setProduct(null);
    setCameraError(null);
    setScanning(true);
  };

  useEffect(() => {
    if (!scanning || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let done = false;

    reader.decodeFromVideoDevice(undefined, videoRef.current, async (result, err, controls) => {
      controlsRef.current = controls;
      if (done) return;
      if (result) {
        done = true;
        controls.stop();
        setScanning(false);
        const barcode = result.getText();
        setFetching(true);
        // Najpierw własna baza — produkt zapisany ręcznie ma być od razu znaleziony.
        const mine = myProducts.find((p) => p.barcode === barcode);
        if (mine) {
          const info: ProductInfo = {
            barcode, name: mine.name, brand: '', calories: mine.calories,
            protein: mine.protein, carbs: mine.carbs, fat: mine.fat,
          };
          setProduct(info);
          saveToHistory(info);
          setHistory(loadHistory());
          setFetching(false);
          toast.success(`Twój produkt: ${mine.name}`);
          return;
        }
        try {
          const info = await fetchProduct(barcode);
          setProduct(info);
          saveToHistory(info);
          setHistory(loadHistory());
          toast.success(`Znaleziono: ${info.name}`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          if (msg === 'NOT_FOUND') {
            setNotFoundBarcode(barcode);
            setManual({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
          } else {
            setError('Błąd pobierania danych — sprawdź połączenie');
          }
        } finally {
          setFetching(false);
        }
      } else if (err && (err as Error).name !== 'NotFoundException') {
        // NotFoundException = no barcode yet, normal during scanning
        console.warn('Scanner error:', err);
      }
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      setCameraError('Brak dostępu do kamery: ' + msg);
      setScanning(false);
    });

    return () => {
      done = true;
      controlsRef.current?.stop();
    };
  }, [scanning]);

  const reset = () => {
    stopScanner();
    setProduct(null);
    setError(null);
    setCameraError(null);
    setAmount(100);
    setNotFoundBarcode(null);
  };

  // „Nie znaleziono" → użytkownik wpisuje dane ręcznie; zapisujemy pod tym kodem,
  // żeby kolejny skan tego produktu od razu go znalazł.
  const saveManual = () => {
    if (!manual.name.trim() || manual.calories <= 0) {
      toast.error('Podaj nazwę i kalorie (na 100 g)');
      return;
    }
    const info: ProductInfo = {
      barcode: notFoundBarcode || `manual-${Date.now()}`,
      name: manual.name.trim(),
      brand: '',
      calories: Math.round(manual.calories),
      protein: manual.protein || 0,
      carbs: manual.carbs || 0,
      fat: manual.fat || 0,
    };
    // Trwały zapis do własnej bazy — razem z kodem kreskowym.
    addMyProduct({
      name: info.name,
      calories: info.calories,
      protein: info.protein,
      carbs: info.carbs,
      fat: info.fat,
      unit: '100g',
      barcode: notFoundBarcode || undefined,
    });
    saveToHistory(info);
    setHistory(loadHistory());
    setProduct(info);
    setNotFoundBarcode(null);
    setAmount(100);
    toast.success('Produkt zapisany w Twojej bazie 💾');
  };

  const addToCalories = () => {
    if (!product) return;
    const m = amount / 100;
    const today = todayISO();
    addFoodEntry({
      id: `entry-${Date.now()}`,
      name: product.name,
      calories: Math.round(product.calories * m),
      protein: Math.round(product.protein * m * 10) / 10,
      carbs: Math.round(product.carbs * m * 10) / 10,
      fat: Math.round(product.fat * m * 10) / 10,
      amount,
      unit: 'g',
      date: today,
      mealType,
    });
    toast.success(`Dodano: ${product.name} (${Math.round((product.calories * amount) / 100)} kcal) — ${MEAL_LABELS[mealType]}`);
    reset();
  };

  const content = (
    <div className="space-y-4">

      {/* Quick meal-type picker — widoczny zanim coś zeskanujemy */}
      {!scanning && !fetching && !product && !notFoundBarcode && (
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-xs text-gray-500 font-medium mb-2">Skanuję dla posiłku:</p>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.entries(MEAL_LABELS) as [MealType, string][]).map(([type, label]) => {
              const [emoji, ...rest] = label.split(' ');
              return (
                <button
                  key={type}
                  onClick={() => setMealType(type)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-[11px] font-medium transition-all border-2 ${
                    mealType === type ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-500'
                  }`}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  {rest.join(' ')}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Live scanner view */}
      {scanning && (
        <div className="relative rounded-3xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full h-72 object-cover"
            autoPlay
            muted
            playsInline
          />
          {/* Scanning frame overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-36 border-2 border-orange-400 rounded-2xl relative">
              <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-orange-400 rounded-tl-xl" />
              <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-orange-400 rounded-tr-xl" />
              <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-orange-400 rounded-bl-xl" />
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-orange-400 rounded-br-xl" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-orange-400 opacity-70 animate-pulse" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex items-center justify-between">
            <p className="text-white text-sm">Skieruj kamerę na kod EAN...</p>
            <button
              onClick={stopScanner}
              className="bg-white/20 backdrop-blur text-white rounded-full p-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Nie znaleziono w bazie → ręczne dodanie */}
      {notFoundBarcode && !scanning && !fetching && !product && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-amber-200">
          <div className="text-center mb-3">
            <div className="text-4xl mb-1">🔍</div>
            <h2 className="font-bold text-gray-700 text-base">Nie ma tego produktu w bazie</h2>
            <p className="text-gray-400 text-xs mt-0.5">Kod: {notFoundBarcode} — dodaj dane ręcznie, zapamiętamy je</p>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              value={manual.name}
              onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
              placeholder="Nazwa produktu (np. Sałatka z tuńczyka)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-gray-500 font-medium">Kalorie /100g *
                <input type="number" value={manual.calories || ''} onChange={(e) => setManual((m) => ({ ...m, calories: Number(e.target.value) }))}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
              </label>
              <label className="text-xs text-gray-500 font-medium">Białko /100g
                <input type="number" value={manual.protein || ''} onChange={(e) => setManual((m) => ({ ...m, protein: Number(e.target.value) }))}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
              </label>
              <label className="text-xs text-gray-500 font-medium">Węgle /100g
                <input type="number" value={manual.carbs || ''} onChange={(e) => setManual((m) => ({ ...m, carbs: Number(e.target.value) }))}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
              </label>
              <label className="text-xs text-gray-500 font-medium">Tłuszcz /100g
                <input type="number" value={manual.fat || ''} onChange={(e) => setManual((m) => ({ ...m, fat: Number(e.target.value) }))}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={reset} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all">
              Skanuj inny
            </button>
            <button onClick={saveManual} className="flex-1 bg-purple-500 text-white py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all">
              Zapisz produkt
            </button>
          </div>
        </div>
      )}

      {/* Idle / start */}
      {!scanning && !fetching && !product && !notFoundBarcode && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-8 text-center border-2 border-dashed border-purple-200">
          <div className="text-6xl mb-3">📦</div>
          <h2 className="font-bold text-gray-700 text-lg mb-1">Skaner kodów kreskowych</h2>
          <p className="text-gray-400 text-sm mb-4">
            Nakieruj kamerę na kod EAN — skaner automatycznie go odczyta
          </p>
          {cameraError && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs rounded-xl p-3 mb-4 text-left">
              <CameraOff size={14} className="flex-shrink-0" />
              {cameraError}
            </div>
          )}
          {error && (
            <p className="text-red-500 text-sm mb-3">❌ {error}</p>
          )}
          <button
            onClick={startScanner}
            className="bg-purple-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-purple-200 active:scale-95 transition-all flex items-center gap-2 mx-auto"
          >
            <ScanLine size={20} /> Skanuj kod EAN
          </button>
        </div>
      )}

      {/* Fetching product data */}
      {fetching && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader className="animate-spin text-purple-500" size={36} />
          <p className="text-gray-500 text-sm">Pobieram dane produktu...</p>
        </div>
      )}

      {/* Scan history */}
      {!scanning && !fetching && !product && !notFoundBarcode && history.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-700 text-sm flex items-center gap-2">
              <History size={15} className="text-purple-400" /> Ostatnio skanowane
            </p>
            <button
              onClick={() => { clearHistory(); setHistory([]); }}
              className="text-gray-300 hover:text-red-400 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.barcode} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-contain bg-gray-50 flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-purple-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{item.name}</p>
                  {item.brand && <p className="text-xs text-gray-400">{item.brand}</p>}
                </div>
                <div className="text-right flex-shrink-0 mr-2">
                  <p className="text-sm font-bold text-purple-500">{item.calories}</p>
                  <p className="text-xs text-gray-300">kcal/100g</p>
                </div>
                <button
                  onClick={() => { setProduct(item); setAmount(100); }}
                  className="bg-purple-500 text-white rounded-xl px-3 py-1.5 text-xs font-semibold active:scale-95 transition-all flex-shrink-0"
                >
                  Dodaj
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product result */}
      {product && !fetching && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-purple-200">
          <div className="flex items-start gap-3 mb-4">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-16 h-16 rounded-xl object-contain bg-gray-50 flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Package size={28} className="text-purple-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 text-base leading-tight">{product.name}</h3>
              {product.brand && <p className="text-xs text-gray-400 mt-0.5">{product.brand}</p>}
              <p className="text-xs text-gray-300 mt-0.5">#{product.barcode}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-1">
            {[
              { val: product.calories, unit: 'kcal', color: 'orange' },
              { val: `${product.protein}g`, unit: 'Białko', color: 'blue' },
              { val: `${product.carbs}g`, unit: 'Węgl.', color: 'yellow' },
              { val: `${product.fat}g`, unit: 'Tłuszcze', color: 'red' },
            ].map(({ val, unit, color }) => (
              <div key={unit} className={`bg-${color}-50 rounded-xl p-2 text-center`}>
                <p className={`text-sm font-bold text-${color}-500`}>{val}</p>
                <p className="text-xs text-gray-400">{unit}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-gray-300 mb-4">wartości na 100g</p>

          <div className="mb-4">
            <label className="text-xs text-gray-500 font-medium mb-1 block">Ile gramów?</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-purple-400"
            />
            <p className="text-center text-purple-500 font-bold mt-1">
              = {Math.round((product.calories * amount) / 100)} kcal
            </p>
          </div>

          {/* Meal type */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 font-medium mb-2">Dodaj do posiłku:</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(MEAL_LABELS) as [MealType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setMealType(type)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                    mealType === type ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <RotateCcw size={16} /> Skanuj inny
            </button>
            <button
              onClick={addToCalories}
              className="flex-1 bg-purple-500 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Flame size={16} /> Dodaj kalorie
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Użyte jako samodzielny modal (np. z poziomu dziennika kalorii) — owijamy w nakładkę z nagłówkiem.
  if (onClose) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-end pb-[var(--sa-bottom)]">
        <div className="bg-white w-full max-h-[92vh] rounded-t-3xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Barcode size={18} className="text-purple-500" />
              Skanuj kod kreskowy
            </h2>
            <button onClick={() => { stopScanner(); onClose(); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 px-5 py-4">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
}
