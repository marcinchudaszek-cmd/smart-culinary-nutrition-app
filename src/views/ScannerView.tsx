import { useState, useRef, useCallback } from 'react';
import { Camera as CameraIcon, Upload, X, RefreshCw, BookmarkPlus, Flame, ChefHat, Loader, Settings, Barcode } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useAppStore, activeAI } from '../store/useAppStore';
import { callAI, parseAiJson, type AiProvider } from '../lib/aiProvider';
import toast from 'react-hot-toast';
import ChefAI from '../components/ChefAI';
import BarcodeScanner from '../components/BarcodeScanner';
import { todayISO } from '../lib/date';

type ScannerTab = 'scan' | 'barcode' | 'chef';

interface DetectedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionWeight: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  confidence: number;
  description: string;
  emoji: string;
}

async function analyzeFood(
  provider: AiProvider,
  apiKey: string,
  model: string,
  imageDataUrl: string,
): Promise<DetectedFood> {
  const prompt = `Zidentyfikuj potrawę na tym zdjęciu. Oceń wizualnie ile gramów jedzenia widać na talerzu/zdjęciu (porcja).
Odpowiedz WYŁĄCZNIE obiektem JSON w dokładnie tym formacie (bez żadnego dodatkowego tekstu):
{
  "name": "polska nazwa potrawy",
  "calories": liczba całkowita (kcal na 100g),
  "protein": liczba (g na 100g),
  "carbs": liczba (g na 100g),
  "fat": liczba (g na 100g),
  "portionWeight": liczba całkowita (szacowana waga porcji widocznej na zdjęciu w gramach),
  "totalCalories": liczba całkowita (kalorie dla całej widocznej porcji),
  "totalProtein": liczba (białko dla całej porcji w g),
  "totalCarbs": liczba (węglowodany dla całej porcji w g),
  "totalFat": liczba (tłuszcze dla całej porcji w g),
  "confidence": liczba 0-100 (pewność rozpoznania),
  "description": "krótki opis po polsku (1 zdanie)",
  "emoji": "pasujące emoji"
}
Jeśli na zdjęciu nie ma jedzenia, zwróć: {"error": "brak jedzenia na zdjęciu"}`;

  const text = await callAI(provider, apiKey, model, { text: prompt, imageDataUrl });
  const parsed = parseAiJson<DetectedFood & { error?: string }>(text);
  if (parsed.error) throw new Error(parsed.error);
  return parsed as DetectedFood;
}

function withTotals(f: Omit<DetectedFood, 'totalCalories' | 'totalProtein' | 'totalCarbs' | 'totalFat'>): DetectedFood {
  const m = f.portionWeight / 100;
  return {
    ...f,
    totalCalories: Math.round(f.calories * m),
    totalProtein: Math.round(f.protein * m * 10) / 10,
    totalCarbs: Math.round(f.carbs * m * 10) / 10,
    totalFat: Math.round(f.fat * m * 10) / 10,
  };
}

const FALLBACK_DB: DetectedFood[] = [
  withTotals({ name: 'Pizza Margherita', calories: 266, protein: 11, carbs: 33, fat: 10, portionWeight: 300, confidence: 92, description: 'Klasyczna pizza z sosem pomidorowym i mozzarellą', emoji: '🍕' }),
  withTotals({ name: 'Spaghetti Bolognese', calories: 195, protein: 12, carbs: 24, fat: 6, portionWeight: 350, confidence: 88, description: 'Makaron z sosem mięsnym i warzywami', emoji: '🍝' }),
  withTotals({ name: 'Sałatka z kurczakiem', calories: 150, protein: 18, carbs: 8, fat: 5, portionWeight: 250, confidence: 85, description: 'Świeże warzywa z grillowanym kurczakiem', emoji: '🥗' }),
  withTotals({ name: 'Hamburger', calories: 354, protein: 17, carbs: 29, fat: 17, portionWeight: 200, confidence: 95, description: 'Wołowy burger z warzywami w bułce', emoji: '🍔' }),
  withTotals({ name: 'Zupa pomidorowa', calories: 74, protein: 2, carbs: 14, fat: 2, portionWeight: 400, confidence: 87, description: 'Kremowa zupa z pomidorów', emoji: '🍲' }),
  withTotals({ name: 'Naleśniki', calories: 196, protein: 5, carbs: 28, fat: 7, portionWeight: 200, confidence: 90, description: 'Cienkie naleśniki z nadzieniem', emoji: '🥞' }),
  withTotals({ name: 'Pierogi ruskie', calories: 250, protein: 8, carbs: 38, fat: 8, portionWeight: 300, confidence: 89, description: 'Polskie pierogi z nadzieniem ziemniaczano-serowym', emoji: '🥟' }),
  withTotals({ name: 'Kotlet schabowy', calories: 290, protein: 25, carbs: 12, fat: 15, portionWeight: 250, confidence: 86, description: 'Panierowany kotlet wieprzowy', emoji: '🥩' }),
  withTotals({ name: 'Bigos', calories: 120, protein: 7, carbs: 6, fat: 7, portionWeight: 350, confidence: 84, description: 'Tradycyjny polski bigos z kapusty i mięsa', emoji: '🍛' }),
  withTotals({ name: 'Jajecznica', calories: 185, protein: 13, carbs: 1, fat: 15, portionWeight: 150, confidence: 91, description: 'Smażona jajecznica na maśle', emoji: '🍳' }),
];

export default function ScannerView() {
  const store = useAppStore();
  const { setSelectedRecipe, setActiveView, addFoodEntry, aiProvider } = store;
  const { apiKey: activeKey, model: activeModel, label: providerLabel } = activeAI(store);
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<ScannerTab>('scan');
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<DetectedFood | null>(null);
  const [alternatives, setAlternatives] = useState<DetectedFood[]>([]);
  const [scanComplete, setScanComplete] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const applyImage = useCallback((dataUrl: string) => {
    setImage(dataUrl);
    setMimeType('image/jpeg');
    setDetected(null);
    setScanComplete(false);
    setAlternatives([]);
    setUsingFallback(false);
  }, []);

  const openCamera = useCallback(async () => {
    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.DataUrl,
        quality: 85,
      });
      if (photo.dataUrl) applyImage(photo.dataUrl);
    } catch {
      // user cancelled
    }
  }, [applyImage]);

  const openGallery = useCallback(async () => {
    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Photos,
        resultType: CameraResultType.DataUrl,
        quality: 85,
      });
      if (photo.dataUrl) applyImage(photo.dataUrl);
    } catch {
      fileRef.current?.click();
    }
  }, [applyImage]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyImage(reader.result as string);
    reader.readAsDataURL(file);
  }, [applyImage]);

  const runFallback = () => {
    const shuffled = [...FALLBACK_DB].sort(() => Math.random() - 0.5);
    setDetected(shuffled[0]);
    setAlternatives(shuffled.slice(1, 4));
    setScanComplete(true);
    toast(`Demo: ${shuffled[0].name} ${shuffled[0].emoji}`);
  };

  const scan = useCallback(async () => {
    if (!image) return;
    setScanning(true);
    setDetected(null);
    setScanComplete(false);

    if (activeKey) {
      try {
        const result = await analyzeFood(aiProvider, activeKey, activeModel, image);
        setDetected(result);
        setAlternatives([]);
        setUsingFallback(false);
        setScanComplete(true);
        toast.success(`Rozpoznano: ${result.name}! ${result.emoji}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Błąd AI';
        toast.error(`Błąd AI: ${msg}`);
        setUsingFallback(true);
        runFallback();
      } finally {
        setScanning(false);
      }
    } else {
      setTimeout(() => {
        setUsingFallback(true);
        runFallback();
        setScanning(false);
      }, 2000);
    }
  }, [image, mimeType, activeKey]);

  const reset = () => {
    setImage(null);
    setDetected(null);
    setScanComplete(false);
    setAlternatives([]);
    setUsingFallback(false);
  };

  const saveAsRecipe = (food: DetectedFood) => {
    setSelectedRecipe({
      id: `scan-${Date.now()}`,
      name: food.name,
      category: 'Zeskanowane',
      area: 'Polska',
      instructions: food.description,
      thumbnail: image || '',
      photo: image || undefined,
      ingredients: [{ name: food.name, amount: `1 porcja (${food.portionWeight}g)`, calories: food.totalCalories }],
      totalCalories: food.totalCalories,
      servings: 1,
      isCustom: true,
    });
    setActiveView('recipe-detail');
  };

  const addToCalories = (food: DetectedFood) => {
    const today = todayISO();
    addFoodEntry({
      id: `entry-${Date.now()}`,
      name: food.name,
      calories: food.totalCalories,
      protein: food.totalProtein,
      carbs: food.totalCarbs,
      fat: food.totalFat,
      amount: food.portionWeight,
      unit: 'g',
      date: today,
      mealType: 'snack',
    });
    toast.success(`Dodano ${food.name} (${food.portionWeight}g) do dziennika!`);
  };

  const tabs: { id: ScannerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'scan', label: 'Potrawa', icon: <CameraIcon size={13} /> },
    { id: 'barcode', label: 'Kod EAN', icon: <Barcode size={13} /> },
    { id: 'chef', label: 'Szef AI', icon: <span>👨‍🍳</span> },
  ];

  return (
    <div className="pb-20 min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-0.5">
              <CameraIcon size={22} className="text-orange-500" />
              AI Kuchnia
            </h1>
            <p className="text-xs text-gray-400">
              {activeKey ? `🟢 ${providerLabel} • ${activeModel}` : '⚪ Demo — dodaj klucz API w Ustawieniach'}
            </p>
          </div>
          {!activeKey && (
            <button
              onClick={() => setActiveView('settings')}
              className="flex items-center gap-1.5 bg-orange-50 text-orange-500 text-xs font-semibold px-3 py-2 rounded-xl"
            >
              <Settings size={14} />
              Aktywuj AI
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-gray-100 rounded-2xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id ? 'bg-white shadow text-gray-800' : 'text-gray-500'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">

        {/* ── Chef AI tab ── */}
        {activeTab === 'chef' && <ChefAI />}

        {/* ── Barcode tab ── */}
        {activeTab === 'barcode' && <BarcodeScanner />}

        {/* ── Scan tab ── */}
        {activeTab === 'scan' && (
          <>
            {!image ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl p-8 text-center border-2 border-dashed border-orange-200">
                  <div className="text-6xl mb-3">{activeKey ? '🧠' : '🤖'}</div>
                  <h2 className="font-bold text-gray-700 text-lg mb-1">Rozpoznaj potrawę</h2>
                  <p className="text-gray-400 text-sm mb-6">
                    {activeKey
                      ? `${providerLabel} AI przeanalizuje zdjęcie i rozpozna danie z kaloriami`
                      : 'Zrób zdjęcie lub wybierz z galerii — AI rozpozna danie i poda kalorie'}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={openCamera}
                      className="flex items-center gap-2 bg-orange-500 text-white px-5 py-3 rounded-2xl font-semibold shadow-lg shadow-orange-200 active:scale-95 transition-all"
                    >
                      <CameraIcon size={18} /> Aparat
                    </button>
                    <button
                      onClick={openGallery}
                      className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-3 rounded-2xl font-semibold shadow-sm active:scale-95 transition-all"
                    >
                      <Upload size={18} /> Galeria
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { emoji: '📸', title: 'Zrób zdjęcie', desc: 'Lub wybierz z galerii' },
                    { emoji: '🔍', title: 'AI analizuje', desc: 'Gemini rozpoznaje' },
                    { emoji: '📊', title: 'Wyniki', desc: 'Kalorie i wartości' },
                  ].map((card) => (
                    <div key={card.title} className="bg-white rounded-2xl p-3 text-center shadow-sm">
                      <p className="text-2xl mb-1">{card.emoji}</p>
                      <p className="font-semibold text-gray-700 text-xs">{card.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{card.desc}</p>
                    </div>
                  ))}
                </div>

                {!activeKey && (
                  <div className="bg-blue-50 rounded-2xl p-4">
                    <p className="font-semibold text-blue-700 text-sm mb-1">💡 Aktywuj prawdziwe AI</p>
                    <p className="text-blue-500 text-xs mb-3">
                      Dodaj darmowy klucz API Google Gemini, aby skaner naprawdę rozpoznawał potrawy ze zdjęcia.
                    </p>
                    <button
                      onClick={() => setActiveView('settings')}
                      className="bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all"
                    >
                      Przejdź do Ustawień →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-3xl overflow-hidden shadow-lg">
                  <img src={image} alt="Skanowane" className="w-full h-64 object-cover" />
                  <button
                    onClick={reset}
                    className="absolute top-3 right-3 bg-black/50 text-white rounded-full p-2"
                  >
                    <X size={18} />
                  </button>
                  {scanning && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="w-24 h-24 border-4 border-orange-400 rounded-full animate-ping absolute" />
                        <div className="w-24 h-24 border-4 border-white rounded-full flex items-center justify-center">
                          <Loader size={32} className="text-white animate-spin" />
                        </div>
                      </div>
                      <p className="text-white font-semibold mt-4 text-sm animate-pulse">
                        {activeKey ? `${providerLabel} analizuje...` : 'Analizuję zdjęcie...'}
                      </p>
                    </div>
                  )}
                </div>

                {!scanning && !scanComplete && (
                  <button
                    onClick={scan}
                    className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    🔍 Skanuj potrawę
                  </button>
                )}

                {scanComplete && detected && (
                  <div className="space-y-3">
                    {usingFallback && !activeKey && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 text-xs text-yellow-700">
                        ⚠️ Tryb demo — dodaj klucz API w Ustawieniach dla prawdziwego AI
                      </div>
                    )}

                    <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-orange-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-2xl">{detected.emoji}</span>
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                              {detected.confidence}% pewność
                            </span>
                            {activeKey && !usingFallback && (
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                                Gemini AI
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-gray-800">{detected.name}</h3>
                          <p className="text-gray-400 text-xs mt-1">{detected.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-3xl font-bold text-orange-500">{detected.totalCalories}</p>
                          <p className="text-xs text-gray-400">kcal (porcja)</p>
                          <p className="text-xs text-gray-300 mt-0.5">{detected.calories} kcal/100g</p>
                        </div>
                      </div>

                      <div className="bg-orange-50 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
                        <span className="text-xs text-orange-600 font-medium">📐 Szacowana porcja</span>
                        <span className="text-sm font-bold text-orange-600">{detected.portionWeight} g</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-blue-50 rounded-xl p-2 text-center">
                          <p className="text-base font-bold text-blue-600">{detected.totalProtein}g</p>
                          <p className="text-xs text-gray-400">Białko</p>
                        </div>
                        <div className="bg-yellow-50 rounded-xl p-2 text-center">
                          <p className="text-base font-bold text-yellow-600">{detected.totalCarbs}g</p>
                          <p className="text-xs text-gray-400">Węgl.</p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-2 text-center">
                          <p className="text-base font-bold text-red-500">{detected.totalFat}g</p>
                          <p className="text-xs text-gray-400">Tłuszcze</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => saveAsRecipe(detected)}
                          className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <BookmarkPlus size={16} /> Zapisz przepis
                        </button>
                        <button
                          onClick={() => addToCalories(detected)}
                          className="flex-1 bg-green-500 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <Flame size={16} /> Dodaj kalorie
                        </button>
                      </div>
                    </div>

                    {alternatives.length > 0 && (
                      <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-1.5">
                          <ChefHat size={16} className="text-orange-400" />
                          Może to być też:
                        </h4>
                        <div className="space-y-2">
                          {alternatives.map((food) => (
                            <button
                              key={food.name}
                              onClick={() => {
                                setDetected(food);
                                setAlternatives(alternatives.filter((a) => a.name !== food.name).concat(detected!));
                                toast(`Wybrano: ${food.name} ${food.emoji}`);
                              }}
                              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-orange-50 transition-all text-left"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{food.emoji}</span>
                                <div>
                                  <p className="font-medium text-gray-700 text-sm">{food.name}</p>
                                  <p className="text-xs text-gray-400">{food.confidence}% pewność</p>
                                </div>
                              </div>
                              <span className="text-orange-500 font-bold text-sm">{food.totalCalories} kcal</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={reset}
                      className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-2xl font-medium text-sm hover:bg-gray-200 active:scale-95 transition-all"
                    >
                      <RefreshCw size={16} /> Skanuj inne zdjęcie
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
    </div>
  );
}
