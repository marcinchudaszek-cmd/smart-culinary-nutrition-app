// Wspólna obsługa kodów kreskowych (OpenFoodFacts) — używana przez skaner
// w liczniku kalorii i przez kreator posiłku.

export interface ProductInfo {
  barcode: string;
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
}

const HISTORY_KEY = 'barcodeScanHistory';
const MAX_HISTORY = 8;

export function loadHistory(): ProductInfo[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveToHistory(product: ProductInfo) {
  const existing = loadHistory().filter((p) => p.barcode !== product.barcode);
  const updated = [product, ...existing].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// Rzuca Error('NOT_FOUND'), gdy produktu nie ma w bazie — wywołujący pokazuje
// wtedy formularz ręcznego dodania.
export async function fetchProduct(barcode: string): Promise<ProductInfo> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  if (!res.ok) throw new Error('Błąd sieci');
  const data = await res.json();
  if (data.status !== 1) throw new Error('NOT_FOUND');

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
