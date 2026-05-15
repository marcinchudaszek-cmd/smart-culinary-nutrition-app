import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { useAppStore } from '../store/useAppStore';
import toast from 'react-hot-toast';
import { Flame, RotateCcw, X, Package, Loader } from 'lucide-react';

interface ProductInfo {
  barcode: string;
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
}

async function fetchProduct(barcode: string): Promise<ProductInfo> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
  );
  if (!res.ok) throw new Error('Błąd sieci');
  const data = await res.json();
  if (data.status !== 1) throw new Error('Produkt nie znaleziony w bazie OpenFoodFacts');

  const p = data.product;
  const n = p.nutriments || {};
  const name =
    (p.product_name_pl || p.product_name || p.abbreviated_product_name || '').trim() ||
    'Nieznany produkt';

  return {
    barcode,
    name,
    brand: (p.brands || '').split(',')[0].trim(),
    calories: Math.round(
      n['energy-kcal_100g'] ?? n['energy-kcal'] ?? (n.energy_100g ?? 0) / 4.184
    ),
    protein: Math.round((n.proteins_100g ?? 0) * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
    fat: Math.round((n.fat_100g ?? 0) * 10) / 10,
    image: p.image_small_url ?? p.image_url,
  };
}

export default function BarcodeScanner() {
  const { addFoodEntry } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(100);

  const stopScanner = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stopScanner(), []);

  const startScanner = async () => {
    setError(null);
    setProduct(null);
    setScanning(true);

    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        async (result) => {
          if (!result) return;
          const barcode = result.getText();
          controlsRef.current?.stop();
          controlsRef.current = null;
          setScanning(false);
          setLoading(true);
          try {
            const info = await fetchProduct(barcode);
            setProduct(info);
            toast.success(`Znaleziono: ${info.name}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd pobierania danych');
          } finally {
            setLoading(false);
          }
        }
      );
      controlsRef.current = controls;
    } catch {
      setScanning(false);
      setError('Brak dostępu do aparatu. Sprawdź uprawnienia aplikacji.');
    }
  };

  const addToCalories = () => {
    if (!product) return;
    const m = amount / 100;
    const today = new Date().toISOString().split('T')[0];
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
      mealType: 'snack',
    });
    toast.success(`Dodano ${product.name} (${amount}g) do dziennika! 🍽️`);
    setProduct(null);
    setAmount(100);
  };

  return (
    <div className="space-y-4">
      {!scanning && !product && !loading && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-8 text-center border-2 border-dashed border-purple-200">
          <div className="text-6xl mb-3">📦</div>
          <h2 className="font-bold text-gray-700 text-lg mb-1">Skaner kodów kreskowych</h2>
          <p className="text-gray-400 text-sm mb-6">
            Zeskanuj kod EAN produktu — automatycznie pobierze wartości odżywcze z bazy
            OpenFoodFacts
          </p>
          <button
            onClick={startScanner}
            className="bg-purple-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-purple-200 active:scale-95 transition-all"
          >
            📷 Uruchom skaner
          </button>
        </div>
      )}

      {scanning && (
        <div className="space-y-3">
          <div className="relative rounded-3xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} className="w-full h-full object-cover" />
            {/* aiming frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-28 relative">
                <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-400 rounded-tl-xl" />
                <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-400 rounded-tr-xl" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-400 rounded-bl-xl" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-400 rounded-br-xl" />
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-purple-400 opacity-60 animate-pulse" />
              </div>
            </div>
            <button
              onClick={stopScanner}
              className="absolute top-3 right-3 bg-black/50 text-white rounded-full p-2"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-center text-gray-500 text-sm animate-pulse">
            Skieruj aparat na kod kreskowy produktu...
          </p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader className="animate-spin text-purple-500" size={36} />
          <p className="text-gray-500 text-sm">Pobieranie danych produktu...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-red-600 text-sm font-medium mb-3">❌ {error}</p>
          <button
            onClick={startScanner}
            className="flex items-center gap-2 bg-red-500 text-white text-sm px-4 py-2 rounded-xl active:scale-95 transition-all"
          >
            <RotateCcw size={14} /> Spróbuj ponownie
          </button>
        </div>
      )}

      {product && !loading && (
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

          <div className="flex gap-2">
            <button
              onClick={() => {
                setProduct(null);
                startScanner();
              }}
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
}
