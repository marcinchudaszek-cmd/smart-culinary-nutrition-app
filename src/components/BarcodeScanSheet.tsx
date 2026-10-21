import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { X, ScanLine, Loader, Package, CameraOff, History, Barcode } from 'lucide-react';
import { type ProductInfo, fetchProduct, loadHistory, saveToHistory } from '../lib/openFoodFacts';
import { useAppStore } from '../store/useAppStore';
import toast from 'react-hot-toast';
import { useBackHandler } from '../lib/backButton';

/**
 * Uproszczony skaner kodów: skanuje, pobiera produkt i ODDAJE go przez onPick.
 * Nie dodaje niczego sam do dziennika — dzięki temu można go użyć np. do
 * wybierania składników w kreatorze posiłku.
 */
export default function BarcodeScanSheet({
  onPick,
  onClose,
}: {
  onPick: (product: ProductInfo) => void;
  onClose: () => void;
}) {
  const { addMyProduct, myProducts } = useAppStore();
  const [scanning, setScanning] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [manual, setManual] = useState({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [history] = useState<ProductInfo[]>(() => loadHistory());

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const stopScanner = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  const close = () => { stopScanner(); onClose(); };
  useBackHandler(true, close);
  const pick = (p: ProductInfo) => { stopScanner(); onPick(p); };

  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
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
        // Najpierw własna baza — zapamiętany kod działa od razu.
        const mine = myProducts.find((p) => p.barcode === barcode);
        if (mine) {
          const info: ProductInfo = { barcode, name: mine.name, brand: '', calories: mine.calories,
            protein: mine.protein, carbs: mine.carbs, fat: mine.fat };
          saveToHistory(info);
          setFetching(false);
          toast.success(`Twój produkt: ${mine.name}`);
          onPick(info);
          return;
        }
        try {
          const info = await fetchProduct(barcode);
          saveToHistory(info);
          toast.success(`Znaleziono: ${info.name}`);
          onPick(info);
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          if (msg === 'NOT_FOUND') setNotFound(barcode);
          else toast.error('Błąd pobierania danych — sprawdź połączenie');
        } finally {
          setFetching(false);
        }
      } else if (err && (err as Error).name !== 'NotFoundException') {
        console.warn('Scanner error:', err);
      }
    }).catch((e: unknown) => {
      setCameraError('Brak dostępu do kamery: ' + (e instanceof Error ? e.message : String(e)));
      setScanning(false);
    });

    return () => { done = true; controlsRef.current?.stop(); };
  }, [scanning]);

  const saveManual = () => {
    if (!manual.name.trim() || manual.calories <= 0) {
      toast.error('Podaj nazwę i kalorie (na 100 g)');
      return;
    }
    const info: ProductInfo = {
      barcode: notFound || `manual-${Date.now()}`,
      name: manual.name.trim(),
      brand: '',
      calories: Math.round(manual.calories),
      protein: manual.protein || 0,
      carbs: manual.carbs || 0,
      fat: manual.fat || 0,
    };
    addMyProduct({
      name: info.name, calories: info.calories, protein: info.protein,
      carbs: info.carbs, fat: info.fat, unit: '100g',
      barcode: notFound || undefined,
    });
    saveToHistory(info);
    toast.success('Produkt zapisany w Twojej bazie 💾');
    pick(info);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end pb-[var(--sa-bottom)]">
      <div className="bg-white w-full max-h-[92vh] rounded-t-3xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Barcode size={18} className="text-purple-500" />
            Skanuj składnik
          </h2>
          <button onClick={close} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 pb-8 space-y-4">
          {/* Podgląd kamery */}
          {scanning && (
            <div className="relative rounded-3xl overflow-hidden bg-black">
              <video ref={videoRef} className="w-full h-64 object-cover" autoPlay muted playsInline />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-32 border-2 border-purple-400 rounded-2xl">
                  <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-purple-400 opacity-70 animate-pulse" />
                </div>
              </div>
              <p className="absolute bottom-3 left-0 right-0 text-center text-white text-sm">
                Skieruj kamerę na kod EAN…
              </p>
            </div>
          )}

          {fetching && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader className="animate-spin text-purple-500" size={32} />
              <p className="text-gray-500 text-sm">Pobieram dane produktu…</p>
            </div>
          )}

          {cameraError && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 text-xs rounded-xl p-3">
              <CameraOff size={14} className="flex-shrink-0 mt-0.5" />
              {cameraError}
            </div>
          )}

          {/* Produkt nieznaleziony → ręczne dane */}
          {notFound && !fetching && (
            <div className="bg-white rounded-2xl p-4 border-2 border-amber-200">
              <p className="font-bold text-gray-700 text-sm mb-0.5">Nie ma tego produktu w bazie</p>
              <p className="text-xs text-gray-400 mb-3">Kod: {notFound} — podaj dane, zapamiętamy je</p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={manual.name}
                  onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
                  placeholder="Nazwa produktu"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['Kalorie /100g *', 'calories'],
                    ['Białko /100g', 'protein'],
                    ['Węgle /100g', 'carbs'],
                    ['Tłuszcz /100g', 'fat'],
                  ] as const).map(([label, key]) => (
                    <label key={key} className="text-xs text-gray-500 font-medium">
                      {label}
                      <input
                        type="number"
                        value={manual[key] || ''}
                        onChange={(e) => setManual((m) => ({ ...m, [key]: Number(e.target.value) }))}
                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setNotFound(null); setScanning(true); }}
                  className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all"
                >
                  Skanuj ponownie
                </button>
                <button
                  onClick={saveManual}
                  className="flex-1 bg-purple-500 text-white py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all"
                >
                  Dodaj składnik
                </button>
              </div>
            </div>
          )}

          {/* Ponowne uruchomienie skanera */}
          {!scanning && !fetching && !notFound && (
            <button
              onClick={() => { setCameraError(null); setScanning(true); }}
              className="w-full bg-purple-500 text-white py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <ScanLine size={18} /> Skanuj kod EAN
            </button>
          )}

          {/* Ostatnio skanowane — szybki wybór bez skanowania */}
          {!fetching && history.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                <History size={12} className="text-purple-400" /> Ostatnio skanowane
              </p>
              <div className="space-y-1.5">
                {history.map((item) => (
                  <button
                    key={item.barcode}
                    onClick={() => pick(item)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-purple-50 transition-all text-left"
                  >
                    {item.image ? (
                      <img src={item.image} alt="" className="w-9 h-9 rounded-lg object-contain bg-white flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Package size={16} className="text-purple-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{item.name}</p>
                      {item.brand && <p className="text-xs text-gray-400 truncate">{item.brand}</p>}
                    </div>
                    <span className="text-xs font-bold text-purple-500 flex-shrink-0">{item.calories} kcal/100g</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
