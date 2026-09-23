import { create } from 'zustand';
import { toLocalISO } from '../lib/date';
import type { AiProvider } from '../lib/aiProvider';

export interface Ingredient {
  name: string;
  amount: string;
  calories: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  area: string;
  instructions: string;
  thumbnail: string;
  ingredients: Ingredient[];
  totalCalories: number;
  servings: number;
  isCustom?: boolean;
  tags?: string;
  youtubeUrl?: string;
  dateAdded?: string;
  photo?: string;
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amount: number;
  unit: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

// Trwała pamięć dodawanych produktów — niezależna od dziennika kalorii.
// Nie znika przy czyszczeniu starych wpisów, więc „Ostatnio dodane" pamięta
// produkty sprzed wielu tygodni.
export interface RecentProduct {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amount: number;
  unit: string;
  lastUsed: number;
  count: number;
}

/**
 * Własny produkt użytkownika — trwała baza (nie wypada jak historia skanów).
 * Zapamiętuje też kod kreskowy, więc kolejny skan tego samego produktu
 * znajduje go od razu, nawet gdy nie ma go w OpenFoodFacts.
 */
export interface UserProduct {
  id: string;
  name: string;
  calories: number;   // na 100 g / 100 ml / sztukę (wg `unit`)
  protein: number;
  carbs: number;
  fat: number;
  unit: string;       // '100g' | '100ml' | 'szt'
  barcode?: string;
  gramsPerPiece?: number;
  createdAt: number;
}

export type ActiveView =
  | 'home'
  | 'search'
  | 'my-recipes'
  | 'add-recipe'
  | 'calories'
  | 'scanner'
  | 'recipe-detail'
  | 'settings'
  | 'progress'
  | 'meal-plan'
  | 'diet-chat'
  | 'fitness';

export interface ActivityEntry {
  id: string;
  activityId: string;
  activityName: string;
  duration: number; // minutes
  caloriesBurned: number;
  date: string; // YYYY-MM-DD
}

export interface UserProfile {
  age: number;
  gender: 'male' | 'female' | '';
  height: number; // cm
  weight: number; // kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  weightGoal: 'lose' | 'maintain' | 'gain';
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface WaterEntry {
  date: string;
  amount: number; // ml for this event
}

export interface MealSlot {
  breakfast?: string; // recipe id
  lunch?: string;
  dinner?: string;
  snack?: string;
}

export type MealPlanMap = Record<string, MealSlot>;

// Posiłki wpisane jako tekst (np. z zaimportowanego planu diety PDF/tekst),
// równolegle do slotów opartych o ID przepisów.
export interface PlanTextMeal { name: string; kcal?: number }
export type MealPlanTextMap = Record<string, Partial<Record<keyof MealSlot, PlanTextMeal>>>;

interface AppState {
  activeView: ActiveView;
  previousView: ActiveView;
  selectedRecipe: Recipe | null;
  myRecipes: Recipe[];
  foodDiary: FoodEntry[];
  recentProducts: RecentProduct[];
  myProducts: UserProduct[];
  dailyGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  geminiApiKey: string;
  geminiModel: string;
  aiProvider: AiProvider;
  groqApiKey: string;
  groqModel: string;
  openrouterApiKey: string;
  openrouterModel: string;
  spoonacularApiKey: string;
  pendingSearchQuery: string;
  pendingSearchTab: 'local' | 'online' | '';
  // Health & Diet
  userProfile: UserProfile;
  waterGoal: number;
  waterLog: WaterEntry[];
  weightLog: WeightEntry[];
  targetWeight: number;
  mealPlan: MealPlanMap;
  mealPlanText: MealPlanTextMap;
  // Fitness
  activityLog: ActivityEntry[];
  // Favourites
  favoriteIds: string[];
  // UI settings
  darkMode: boolean;
  onboardingDone: boolean;
  // Actions
  setActiveView: (view: ActiveView) => void;
  setDarkMode: (dark: boolean) => void;
  setOnboardingDone: (done: boolean) => void;
  setPendingSearchQuery: (q: string, tab?: 'local' | 'online') => void;
  setSelectedRecipe: (recipe: Recipe | null) => void;
  addMyRecipe: (recipe: Recipe) => void;
  updateMyRecipe: (recipe: Recipe) => void;
  removeMyRecipe: (id: string) => void;
  addFoodEntry: (entry: FoodEntry) => void;
  addMyProduct: (p: Omit<UserProduct, 'id' | 'createdAt'>) => UserProduct;
  removeMyProduct: (id: string) => void;
  removeFoodEntry: (id: string) => void;
  removeOldFoodEntries: (daysOld: number) => number;
  setDailyGoal: (goal: number) => void;
  setProteinGoal: (goal: number) => void;
  setCarbsGoal: (goal: number) => void;
  setFatGoal: (goal: number) => void;
  setGeminiApiKey: (key: string) => void;
  setGeminiModel: (model: string) => void;
  setAiProvider: (p: AiProvider) => void;
  setOpenrouterApiKey: (key: string) => void;
  setOpenrouterModel: (model: string) => void;
  setGroqApiKey: (key: string) => void;
  setGroqModel: (model: string) => void;
  setSpoonacularApiKey: (key: string) => void;
  setUserProfile: (profile: UserProfile) => void;
  setWaterGoal: (ml: number) => void;
  addWaterEntry: (entry: WaterEntry) => void;
  clearWaterToday: (date: string) => void;
  addWeightEntry: (entry: WeightEntry) => void;
  removeWeightEntry: (date: string) => void;
  setTargetWeight: (w: number) => void;
  setMealSlot: (date: string, slot: keyof MealSlot, recipeId: string | undefined) => void;
  setMealTextSlot: (date: string, slot: keyof MealSlot, meal: PlanTextMeal | undefined) => void;
  toggleFavorite: (id: string) => void;
  addActivityEntry: (entry: ActivityEntry) => void;
  removeActivityEntry: (id: string) => void;
}

const SAMPLE_RECIPES: Recipe[] = [
  {
    id: 'custom-1',
    name: 'Bigos Staropolski',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Kapustę kiszoną przepłucz i posiekaj. Boczek podsmaż na złoto. Dodaj mięso wieprzowe pokrojone w kostkę i obsmażaj. Dodaj kapustę, grzyby namoczone i pokrojone, kiełbasę. Zalej wywarem. Dodaj przyprawy: liść laurowy, ziele angielskie, pieprz, majeranek. Gotuj pod przykryciem 2 godziny, mieszając co jakiś czas. Pod koniec dodaj czerwone wino.',
    thumbnail: 'https://www.themealdb.com/images/media/meals/tkxquw1628771028.jpg',
    ingredients: [
      { name: 'Kapusta kiszona', amount: '500g', calories: 50 },
      { name: 'Boczek', amount: '200g', calories: 600 },
      { name: 'Kiełbasa', amount: '300g', calories: 690 },
      { name: 'Grzyby suszone', amount: '30g', calories: 70 },
      { name: 'Czerwone wino', amount: '100ml', calories: 85 },
      { name: 'Wieprzowina', amount: '500 g', calories: 910 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2405,
    servings: 6,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-2',
    name: 'Zupa Pomidorowa',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Ugotuj wywar z kury. Przetuszuj pomidory i dodaj do wywaru. Dodaj śmietanę. Dopraw solą, pieprzem i cukrem. Podawaj z ryżem lub makaronem.',
    thumbnail: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
    ingredients: [
      { name: 'Pomidory', amount: '1kg', calories: 180 },
      { name: 'Śmietana', amount: '200ml', calories: 340 },
      { name: 'Kurczak', amount: '500g', calories: 825 },
      { name: 'Makaron', amount: '200g', calories: 312 },
      { name: 'Ryż', amount: '100 g', calories: 360 },
      { name: 'Cukier', amount: '2 łyżki', calories: 100 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2117,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-3',
    name: 'Rosół z Kurczaka',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Kurczaka zalej zimną wodą i zagotuj, odszumuj. Dodaj marchew, pietruszkę, seler, cebulę podpieczoną na ogniu. Gotuj na małym ogniu 2–3 godziny. Dopraw solą i pieprzem. Podawaj z makaronem i natką pietruszki.',
    thumbnail: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400',
    ingredients: [
      { name: 'Kurczak', amount: '1.2kg', calories: 1980 },
      { name: 'Marchew', amount: '3 szt', calories: 75 },
      { name: 'Pietruszka', amount: '2 szt', calories: 60 },
      { name: 'Seler', amount: '1/4 szt', calories: 40 },
      { name: 'Cebula', amount: '1 szt', calories: 40 },
      { name: 'Makaron nitki', amount: '200g', calories: 312 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2507,
    servings: 6,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-4',
    name: 'Pierogi Ruskie',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Zagnieć ciasto z mąki, jajka, wody i soli. Ziemniaki ugotuj i ugnieć. Cebulę zeszklij na maśle, wymieszaj z ziemniakami i twarogiem. Dopraw solą i pieprzem. Ciasto cienko rozwałkuj, wycinaj kółka, nakładaj farsz i lepi pierogi. Gotuj w osolonej wodzie 3–4 minuty po wypłynięciu. Podawaj z cebulką lub śmietaną.',
    thumbnail: 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400',
    ingredients: [
      { name: 'Mąka pszenna', amount: '400g', calories: 1360 },
      { name: 'Ziemniaki', amount: '600g', calories: 462 },
      { name: 'Twaróg', amount: '300g', calories: 294 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Masło', amount: '50g', calories: 358 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
      { name: 'Śmietana', amount: '200 ml', calories: 368 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 3078,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-5',
    name: 'Kotlet Schabowy',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Schab pokrój na plastry grubości 1,5 cm. Rozbij tłuczkiem. Dopraw solą i pieprzem. Obtocz kolejno w mące, roztrzepanym jajku i bułce tartej. Smaż na rozgrzanym oleju z obu stron na złoty kolor, ok. 4–5 minut z każdej strony. Podawaj z ziemniakami i surówką z kapusty.',
    thumbnail: 'https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=400',
    ingredients: [
      { name: 'Schab wieprzowy', amount: '600g', calories: 1080 },
      { name: 'Bułka tarta', amount: '100g', calories: 395 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
      { name: 'Mąka', amount: '50g', calories: 170 },
      { name: 'Olej', amount: '50ml', calories: 442 },
      { name: 'Ziemniaki', amount: '600 g', calories: 462 },
      { name: 'Kapusta', amount: '500 g', calories: 125 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2830,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-6',
    name: 'Żurek Staropolski',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Zakwas żytni przygotuj 5 dni wcześniej lub kup gotowy. Ugotuj wywar z włoszczyzny i kiełbasy. Do wywaru dodaj zakwas, czosnek i majeranek. Gotuj 10 minut. Dopraw solą i pieprzem. Podawaj z ugotowanymi jajkami i plastrami białej kiełbasy. Opcjonalnie podaj w chlebie.',
    thumbnail: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400',
    ingredients: [
      { name: 'Zakwas żytni', amount: '500ml', calories: 160 },
      { name: 'Biała kiełbasa', amount: '400g', calories: 880 },
      { name: 'Jajka', amount: '4 szt', calories: 312 },
      { name: 'Włoszczyzna', amount: '1 pęczek', calories: 80 },
      { name: 'Czosnek', amount: '4 ząbki', calories: 20 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1452,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-7',
    name: 'Gołąbki w Sosie Pomidorowym',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Liście kapusty obgotuj we wrzątku. Ryż ugotuj do połowy. Mięso mielone wymieszaj z ryżem, cebulą, solą i pieprzem. Nakładaj farsz na liście i zawijaj. Układaj w garnku ciasno. Zalej sosem pomidorowym rozrobionym z bulionem. Gotuj pod przykryciem 1,5 godziny.',
    thumbnail: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
    ingredients: [
      { name: 'Kapusta biała', amount: '1 główka', calories: 150 },
      { name: 'Mięso mielone mieszane', amount: '600g', calories: 1020 },
      { name: 'Ryż', amount: '150g', calories: 195 },
      { name: 'Passata pomidorowa', amount: '500ml', calories: 175 },
      { name: 'Cebula', amount: '1 szt', calories: 40 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1580,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-8',
    name: 'Placki Ziemniaczane',
    category: 'Przekąski',
    area: 'Polska',
    instructions:
      'Ziemniaki obierz i zetrzyj na tarce o drobnych oczkach. Odciśnij nadmiar wody. Dodaj jajko, mąkę, cebulę i sól. Wymieszaj. Na rozgrzanym oleju smaż porcje masy z obu stron na złoto-brązowy kolor. Podawaj ze śmietaną lub cukrem i dżemem.',
    thumbnail: 'https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=400',
    ingredients: [
      { name: 'Ziemniaki', amount: '1kg', calories: 770 },
      { name: 'Jajko', amount: '1 szt', calories: 78 },
      { name: 'Mąka pszenna', amount: '3 łyżki', calories: 90 },
      { name: 'Cebula', amount: '1 szt', calories: 40 },
      { name: 'Olej do smażenia', amount: '60ml', calories: 530 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
      { name: 'Cukier', amount: '2 łyżki', calories: 100 },
      { name: 'Śmietana', amount: '200 ml', calories: 368 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2132,
    servings: 3,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-9',
    name: 'Barszcz Czerwony z Uszkami',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Buraki obierz, zetrzyj lub pokrój. Ugotuj wywar warzywny z burakami, marchewką, pietruszką i cebulą. Przecedź. Dopraw cytryną, cukrem, solą i pieprzem. Na uszka: ciasto jak na pierogi. Farsz z grzybów i kapusty. Ugotuj uszka osobno. Podawaj barszcz z uszkami.',
    thumbnail: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=400',
    ingredients: [
      { name: 'Buraki czerwone', amount: '800g', calories: 344 },
      { name: 'Włoszczyzna', amount: '1 pęczek', calories: 80 },
      { name: 'Mąka na uszka', amount: '200g', calories: 680 },
      { name: 'Grzyby suszone', amount: '50g', calories: 117 },
      { name: 'Kapusta kwaszona', amount: '200g', calories: 20 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Marchew', amount: '2 szt', calories: 50 },
      { name: 'Cukier', amount: '2 łyżki', calories: 100 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1471,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-10',
    name: 'Naleśniki z Twarogiem',
    category: 'Desery',
    area: 'Polska',
    instructions:
      'Mąkę, jajka, mleko i szczyptę soli zmiksuj na gładkie ciasto. Odstaw na 15 minut. Smaż cienkie naleśniki na patelni. Twaróg wymieszaj z cukrem, cukrem waniliowym i żółtkami. Nakładaj farsz na naleśniki i zawijaj. Podawaj ze śmietaną lub świeżymi owocami.',
    thumbnail: 'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=400',
    ingredients: [
      { name: 'Mąka pszenna', amount: '250g', calories: 850 },
      { name: 'Mleko', amount: '500ml', calories: 250 },
      { name: 'Jajka', amount: '3 szt', calories: 234 },
      { name: 'Twaróg', amount: '500g', calories: 490 },
      { name: 'Cukier', amount: '4 łyżki', calories: 192 },
      { name: 'Śmietana', amount: '200 ml', calories: 368 },
    ],
    totalCalories: 2384,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-11',
    name: 'Szarlotka Babci',
    category: 'Desery',
    area: 'Polska',
    instructions:
      'Mąkę, masło, cukier puder i jajka zagnieć na kruche ciasto. Podziel na dwie części, schłodź w lodówce 30 min. Jabłka obierz, zetrzyj lub pokrój, dopraw cynamonem i cukrem. Ciasto rozwałkuj, wyłóż formę, nałóż jabłka. Przykryj drugą warstwą startego ciasta. Piecz 40–45 min w 180°C. Posyp cukrem pudrem.',
    thumbnail: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=400',
    ingredients: [
      { name: 'Mąka pszenna', amount: '400g', calories: 1360 },
      { name: 'Masło', amount: '200g', calories: 1434 },
      { name: 'Jabłka', amount: '1.5kg', calories: 780 },
      { name: 'Cukier', amount: '150g', calories: 600 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
    ],
    totalCalories: 4330,
    servings: 10,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-12',
    name: 'Kapuśniak z Żeberkami',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Żeberka ugotuj do miękkości, wyjmij i oddziel mięso od kości. Kapustę kiszoną przepłucz i posiekaj, gotuj w wywarze. Dodaj mięso, ziemniaki pokrojone w kostkę, cebulę i czosnek. Dodaj koncentrat pomidorowy, majeranek, liść laurowy i ziele angielskie. Gotuj do miękkości ziemniaków. Dopraw do smaku.',
    thumbnail: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
    ingredients: [
      { name: 'Żeberka wieprzowe', amount: '500g', calories: 1250 },
      { name: 'Kapusta kiszona', amount: '500g', calories: 50 },
      { name: 'Ziemniaki', amount: '400g', calories: 308 },
      { name: 'Koncentrat pomidorowy', amount: '2 łyżki', calories: 40 },
      { name: 'Cebula', amount: '1 szt', calories: 40 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1703,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-13',
    name: 'Flaczki Wołowe po Warszawsku',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Żołądki wołowe gotuj przez 3–4 godziny do miękkości. Wyjmij, ostudź i pokrój w paski. Ugotuj wywar z włoszczyzny. Zasmażkę z masła i mąki wymieszaj z wywarem. Dodaj flaki, majeranek, imbir, gałkę muszkatołową, ziele angielskie i liść laurowy. Gotuj razem 30 minut. Dopraw solą i pieprzem. Posyp tartym serem i podawaj z bułką.',
    thumbnail: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400',
    ingredients: [
      { name: 'Flaki wołowe (żołądki)', amount: '800g', calories: 640 },
      { name: 'Włoszczyzna', amount: '1 pęczek', calories: 80 },
      { name: 'Masło', amount: '50g', calories: 358 },
      { name: 'Mąka pszenna', amount: '3 łyżki', calories: 90 },
      { name: 'Ser żółty starty', amount: '50g', calories: 178 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1346,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-14',
    name: 'Zrazy Wołowe Zawijane',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Wołowinę pokrój w plastry i rozbij tłuczkiem. Posmaruj musztardą, posól i popieprz. Na każdym plastrze ułóż pasek boczku, ogórka kiszonego i kawałek cebuli. Zawiń ciasno i spnij wykałaczką. Obsmaż na oleju ze wszystkich stron. Przełóż do garnka, zalej wywarem i gotuj pod przykryciem ok. 1,5 godziny. Sos zagęść śmietaną i mąką.',
    thumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
    ingredients: [
      { name: 'Wołowina (zrazówka)', amount: '600g', calories: 1020 },
      { name: 'Boczek wędzony', amount: '100g', calories: 340 },
      { name: 'Ogórek kiszony', amount: '3 szt', calories: 30 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Śmietana 18%', amount: '150ml', calories: 276 },
      { name: 'Mąka pszenna', amount: '150 g', calories: 546 },
      { name: 'Olej', amount: '2 łyżki', calories: 240 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2532,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-15',
    name: 'Kaczka Pieczona z Jabłkami',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Kaczkę umyj, osusz i natrzyj solą, pieprzem, majerankiem i czosnkiem. Jabłka obierz i pokrój w ćwiartki, dopraw cynamonem i cukrem. Wypełnij kaczkę jabłkami i zaszpilkuj wykałaczkami. Piecz w 180°C przez 2–2,5 godziny, podlewając wytopioną jagodą. Ostatnie 20 minut piecz bez przykrycia dla chrupiącej skórki. Podawaj z modrą kapustą i kopytkami.',
    thumbnail: 'https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=400',
    ingredients: [
      { name: 'Kaczka (cała)', amount: '2kg', calories: 3800 },
      { name: 'Jabłka', amount: '4 szt', calories: 288 },
      { name: 'Majeranek', amount: '2 łyżki', calories: 20 },
      { name: 'Czosnek', amount: '4 ząbki', calories: 20 },
      { name: 'Cynamon', amount: '1 łyżeczka', calories: 6 },
      { name: 'Cukier', amount: '2 łyżki', calories: 100 },
      { name: 'Kapusta', amount: '500 g', calories: 125 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 4359,
    servings: 6,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-16',
    name: 'Krupnik Staropolski',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Ugotuj wywar z kości wieprzowych lub drobiowych z włoszczyzną. Odcedź. Kaszę pęczak przepłucz i gotuj osobno przez 20 minut. Dodaj kaszę do wywaru. Dodaj warzywa pokrojone w kostkę: marchew, pietruszkę, seler, ziemniaki. Gotuj 15 minut. Dopraw solą, pieprzem i lubczykiem. Na końcu dodaj natkę pietruszki. Podawaj gorący z pieczywem.',
    thumbnail: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400',
    ingredients: [
      { name: 'Kasza pęczak', amount: '150g', calories: 528 },
      { name: 'Kości wieprzowe', amount: '500g', calories: 400 },
      { name: 'Włoszczyzna', amount: '1 pęczek', calories: 80 },
      { name: 'Ziemniaki', amount: '300g', calories: 231 },
      { name: 'Lubczyk', amount: '1 łyżka', calories: 5 },
      { name: 'Marchew', amount: '2 szt', calories: 50 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1294,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-17',
    name: 'Gulasz Wieprzowy z Papryką',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Mięso pokrój w kostkę 3×3 cm. Obsmaż partiami na oleju na złoty kolor. Cebulę i czosnek zeszklij. Dodaj mięso, paprykę słodką i ostrą, koncentrat pomidorowy. Zalej wywarem lub wodą. Dusz pod przykryciem 1 godzinę. Papryki pokrój w paski i dodaj na ostatnie 15 minut. Dopraw solą i pieprzem. Podawaj z ziemniakami lub kaszą.',
    thumbnail: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400',
    ingredients: [
      { name: 'Łopatka wieprzowa', amount: '700g', calories: 1330 },
      { name: 'Papryka czerwona i żółta', amount: '3 szt', calories: 90 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Koncentrat pomidorowy', amount: '3 łyżki', calories: 60 },
      { name: 'Papryka słodka mielona', amount: '2 łyżki', calories: 30 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Ziemniaki', amount: '600 g', calories: 462 },
      { name: 'Kasza', amount: '150 g', calories: 520 },
      { name: 'Olej', amount: '2 łyżki', calories: 240 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2827,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-18',
    name: 'Kopytka z Serem',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Ziemniaki ugotuj, odcedź i dokładnie rozgnieć. Ostudź. Dodaj jajko, mąkę, sól i wymieszaj na jednolite ciasto. Ciasto podziel, uformuj wałki grubości 2 cm. Pokrój ukośnie na 3-centymetrowe kawałki. Gotuj we wrzącej osolonej wodzie 3 minuty po wypłynięciu. Odcedź. Smaż na maśle do zarumienienia. Podawaj z twarogiem i śmietaną lub okraszone słoninką.',
    thumbnail: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
    ingredients: [
      { name: 'Ziemniaki ugotowane', amount: '1kg', calories: 770 },
      { name: 'Mąka pszenna', amount: '250g', calories: 850 },
      { name: 'Jajko', amount: '2 szt', calories: 156 },
      { name: 'Masło', amount: '60g', calories: 430 },
      { name: 'Twaróg półtłusty', amount: '200g', calories: 196 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
      { name: 'Śmietana', amount: '200 ml', calories: 368 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2926,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-19',
    name: 'Zupa Ogórkowa',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Ugotuj wywar z kości lub udek kurczaka z włoszczyzną. Ogórki kiszone zetrzyj na tarce lub pokrój w kostkę. Podsmaż chwilę na maśle. Dodaj ogórki do wywaru razem z ziemniakami pokrojonymi w kostkę. Gotuj 15 minut. Dodaj śmietanę rozbitą z mąką — nie przerywając mieszania — i gotuj jeszcze 5 minut. Dopraw solą, pieprzem i koperkiem.',
    thumbnail: 'https://images.unsplash.com/photo-1606914501449-5a96b6ce24ca?w=400',
    ingredients: [
      { name: 'Ogórki kiszone', amount: '400g', calories: 40 },
      { name: 'Wywar drobiowy', amount: '1.5l', calories: 150 },
      { name: 'Ziemniaki', amount: '300g', calories: 231 },
      { name: 'Śmietana 18%', amount: '200ml', calories: 368 },
      { name: 'Koperek', amount: '1 pęczek', calories: 10 },
      { name: 'Mąka pszenna', amount: '150 g', calories: 546 },
      { name: 'Masło', amount: '30 g', calories: 215 },
      { name: 'Kurczak', amount: '600 g', calories: 990 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2550,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-20',
    name: 'Fasolka po Bretońsku',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Fasolę namocz na noc, ugotuj do miękkości. Boczek i kiełbasę pokrój i podsmaż. Cebulę zeszklij, dodaj przecier pomidorowy i koncentrat. Wszystko wymieszaj z fasolą. Dodaj majeranek, liść laurowy, ziele angielskie. Duś razem 20 minut. Dopraw do smaku. Podawaj z pieczywem — świetna na zimne dni.',
    thumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
    ingredients: [
      { name: 'Fasola biała', amount: '400g', calories: 1332 },
      { name: 'Boczek wędzony', amount: '150g', calories: 510 },
      { name: 'Kiełbasa', amount: '200g', calories: 560 },
      { name: 'Przecier pomidorowy', amount: '400g', calories: 116 },
      { name: 'Cebula', amount: '1 szt', calories: 40 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2558,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-21',
    name: 'Chłodnik Litewski',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Buraki ugotuj, ostudź i zetrzyj na tarce lub pokrój w kostkę. Kefir wymieszaj ze śmietaną. Dodaj starte buraki, pokrojony ogórek świeży, rzodkiewkę, szczypiorek i koperek. Dopraw solą, pieprzem, cukrem i sokiem z cytryny. Schłodź w lodówce minimum 2 godziny. Podawaj z połówką ugotowanego jajka na środku miski.',
    thumbnail: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=400',
    ingredients: [
      { name: 'Buraki ugotowane', amount: '500g', calories: 215 },
      { name: 'Kefir', amount: '500ml', calories: 260 },
      { name: 'Śmietana 18%', amount: '200ml', calories: 368 },
      { name: 'Ogórek świeży', amount: '1 szt', calories: 15 },
      { name: 'Jajka', amount: '4 szt', calories: 312 },
      { name: 'Cukier', amount: '2 łyżki', calories: 100 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1270,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-22',
    name: 'Makowiec Świąteczny',
    category: 'Desery',
    area: 'Polska',
    instructions:
      'Mak zalej wrzątkiem, odcedź i zmiel. Wymieszaj z miodem, rodzynkami, orzechami i skórką pomarańczową. Ciasto drożdżowe: mąkę, cukier, jajka, mleko i drożdże zagnieć z masłem. Odstaw do wyrośnięcia. Rozwałkuj na prostokąt, posmaruj masą makową i zwiń. Piecz w 180°C przez 40–45 minut. Polej lukrem cytrynowym i udekoruj.',
    thumbnail: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
    ingredients: [
      { name: 'Mak niebieski', amount: '500g', calories: 2650 },
      { name: 'Mąka pszenna', amount: '400g', calories: 1360 },
      { name: 'Miód', amount: '100g', calories: 304 },
      { name: 'Rodzynki i orzechy', amount: '150g', calories: 600 },
      { name: 'Masło', amount: '100g', calories: 717 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
      { name: 'Mleko', amount: '250 ml', calories: 125 },
      { name: 'Cukier', amount: '2 łyżki', calories: 100 },
      { name: 'Drożdże', amount: '25 g', calories: 25 },
    ],
    totalCalories: 6037,
    servings: 12,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-23',
    name: 'Piernik Staropolski',
    category: 'Desery',
    area: 'Polska',
    instructions:
      'Miód podgrzej z masłem i cukrem brązowym. Ostudź. Dodaj jajka i wymieszaj. Przesiej mąkę z sodą i przyprawą korzenną (cynamon, goździki, imbir, kardamon, pieprz, anyż). Wszystko zagnieć na gładkie ciasto. Odstaw na 3 dni w lodówce — dzięki temu smak się rozwinie. Piecz w 180°C przez 45–50 minut. Przekrój, przełóż powidłami śliwkowymi i polej czekoladową polewą.',
    thumbnail: 'https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?w=400',
    ingredients: [
      { name: 'Mąka pszenna', amount: '400g', calories: 1360 },
      { name: 'Miód', amount: '200g', calories: 608 },
      { name: 'Masło', amount: '100g', calories: 717 },
      { name: 'Powidła śliwkowe', amount: '200g', calories: 400 },
      { name: 'Przyprawa korzenna', amount: '3 łyżki', calories: 45 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
      { name: 'Cukier', amount: '2 łyżki', calories: 100 },
    ],
    totalCalories: 3386,
    servings: 10,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-24',
    name: 'Grochówka Wojskowa',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Groch żółty namocz przez noc. Ugotuj z boczkiem wędzonym i kością wieprzową do całkowitego rozpadnięcia się grochu. Cebulę podsmaż na smalcu. Dodaj marchew i selera pokrojone w kostkę. Wszystko wrzuć do zupy. Dopraw majerankiem, solą, pieprzem i czosnkiem. Gotuj jeszcze 20 minut. Podawaj z grzankami lub chlebem żytnim.',
    thumbnail: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400',
    ingredients: [
      { name: 'Groch żółty łuskany', amount: '400g', calories: 1368 },
      { name: 'Boczek wędzony', amount: '200g', calories: 680 },
      { name: 'Marchew', amount: '2 szt', calories: 82 },
      { name: 'Cebula', amount: '1 szt', calories: 40 },
      { name: 'Smalec', amount: '2 łyżki', calories: 180 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Wieprzowina', amount: '500 g', calories: 910 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 3275,
    servings: 6,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-25',
    name: 'Śledź w Śmietanie',
    category: 'Przekąski',
    area: 'Polska',
    instructions:
      'Śledzie moczące namocz przez 12 godzin w wodzie lub mleku, zmieniając kilkakrotnie. Oczyść z ości i pokrój w kawałki. Cebulę pokrój w piórka. Śmietanę wymieszaj z majonezem, cukrem i sokiem z cytryny. Wymieszaj śledzie z cebulą i sosem śmietanowym. Wstaw do lodówki na minimum 2 godziny. Podawaj z cebulką i jabłkiem pokrojonym w kostkę.',
    thumbnail: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
    ingredients: [
      { name: 'Filety śledziowe solone', amount: '500g', calories: 790 },
      { name: 'Śmietana 18%', amount: '200ml', calories: 368 },
      { name: 'Majonez', amount: '3 łyżki', calories: 300 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Jabłko', amount: '1 szt', calories: 72 },
      { name: 'Cukier', amount: '2 łyżki', calories: 100 },
      { name: 'Jabłka', amount: '3 szt', calories: 220 },
    ],
    totalCalories: 1930,
    servings: 6,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-26',
    name: 'Kluski Śląskie',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Ziemniaki ugotuj w mundurkach, obierz i przepuść przez praskę. Ostudź do temperatury pokojowej. Dodaj mąkę i jajko, zagnieć. Formuj kulki wielkości piłeczki pingpongowej i rób w środku charakterystyczne wgłębienie kciukiem. Gotuj w osolonej wodzie 4–5 minut po wypłynięciu. Podawaj z sosem pieczeniowym, duszoną kapustą lub polane masłem ze skwarkami.',
    thumbnail: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400',
    ingredients: [
      { name: 'Ziemniaki ugotowane', amount: '1kg', calories: 770 },
      { name: 'Mąka ziemniaczana', amount: '200g', calories: 714 },
      { name: 'Jajko', amount: '1 szt', calories: 78 },
      { name: 'Masło', amount: '50g', calories: 358 },
      { name: 'Boczek do okrasy', amount: '80g', calories: 272 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
      { name: 'Kapusta', amount: '500 g', calories: 125 },
    ],
    totalCalories: 2473,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  // ── Więcej zup ──────────────────────────────────────────────────────────
  {
    id: 'custom-27',
    name: 'Zupa Grzybowa Staropolska',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Grzyby suszone namocz przez noc w 1 litrze wody. Ugotuj w tej samej wodzie przez 30 minut. Wyjmij grzyby, posiekaj drobno, wywar odcedź przez sitko. Osobno ugotuj wywar z włoszczyzny. Połącz oba wywary. Dodaj posiekane grzyby. Zasmażkę z masła i mąki wmieszaj do zupy. Dopraw solą, pieprzem i majerankiem. Podawaj z łazankami lub kluseczkami lanymi.',
    thumbnail: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400',
    ingredients: [
      { name: 'Grzyby suszone', amount: '100g', calories: 284 },
      { name: 'Włoszczyzna', amount: '1 pęczek', calories: 80 },
      { name: 'Masło', amount: '40g', calories: 286 },
      { name: 'Mąka', amount: '2 łyżki', calories: 60 },
      { name: 'Łazanki', amount: '150g', calories: 196 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 906,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-28',
    name: 'Barszcz Biały Wielkanocny',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Ugotuj wywar z białej kiełbasy i szynki z włoszczyzną. Zakwas żytni wlej do wywaru — nie gotuj po dodaniu, tylko podgrzej. Dodaj czosnek, majeranek i tarty chrzan. Dopraw solą i pieprzem. Podawaj z plasterkami białej kiełbasy, jajkiem na twardo i szczypiorkiem. Tradycyjny wielkanocny przysmak, który musi być na świątecznym stole.',
    thumbnail: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400',
    ingredients: [
      { name: 'Biała kiełbasa', amount: '500g', calories: 1100 },
      { name: 'Zakwas żytni', amount: '500ml', calories: 160 },
      { name: 'Chrzan tarty', amount: '3 łyżki', calories: 30 },
      { name: 'Jajka', amount: '4 szt', calories: 312 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1617,
    servings: 6,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-29',
    name: 'Zupa Szczawiowa ze Śmietaną',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Ugotuj wywar z kury lub warzywny. Szczaw dokładnie umyj i pokrój w paski. Podsmaż chwilę na maśle. Wrzuć do wywaru i gotuj 5 minut. Śmietanę rozmieszaj z mąką i wlej do zupy ciągle mieszając. Dopraw solą i pieprzem. Podawaj koniecznie z jajkiem gotowanym na twardo — klasyka polskich stołów od pokoleń.',
    thumbnail: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=400',
    ingredients: [
      { name: 'Szczaw świeży', amount: '400g', calories: 80 },
      { name: 'Wywar drobiowy', amount: '1.5l', calories: 150 },
      { name: 'Śmietana 18%', amount: '200ml', calories: 368 },
      { name: 'Jajka', amount: '4 szt', calories: 312 },
      { name: 'Masło', amount: '30g', calories: 215 },
      { name: 'Mąka pszenna', amount: '150 g', calories: 546 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1671,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-30',
    name: 'Zupa Rybna po Polsku',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Ugotuj wywar z głów i ogonów rybnych z włoszczyzną, liściem laurowym i zielem angielskim. Odcedź. Filety z sandacza pokrój w kawałki. Marchew, pietruszkę i seler pokrój w kostkę i ugotuj w wywarze. Dodaj rybę i gotuj 8 minut. Wlej śmietanę, dodaj koperek. Dopraw solą, pieprzem i sokiem z cytryny. Podawaj z grzankami.',
    thumbnail: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400',
    ingredients: [
      { name: 'Filet z sandacza', amount: '600g', calories: 492 },
      { name: 'Włoszczyzna', amount: '1 pęczek', calories: 80 },
      { name: 'Śmietana 18%', amount: '150ml', calories: 276 },
      { name: 'Koperek', amount: '1 pęczek', calories: 10 },
      { name: 'Cytryna', amount: '1 szt', calories: 17 },
      { name: 'Marchew', amount: '2 szt', calories: 50 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 925,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  // ── Dania główne ────────────────────────────────────────────────────────
  {
    id: 'custom-31',
    name: 'Pieczeń Wieprzowa z Czosnkiem',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Karczek naszpikuj ząbkami czosnku robiąc głębokie nacięcia nożem. Natrzyj solą, pieprzem, majerankiem i oliwą. Wstaw do lodówki na całą noc. Obsmaż ze wszystkich stron na rozgrzanym oleju. Przełóż do naczynia żaroodpornego, podlej bulionem i piwem. Piecz pod przykryciem w 160°C przez 2,5 godziny. Sos przecedź i zagęść mąką.',
    thumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
    ingredients: [
      { name: 'Karczek wieprzowy', amount: '1.2kg', calories: 2400 },
      { name: 'Czosnek', amount: '1 główka', calories: 40 },
      { name: 'Piwo jasne', amount: '330ml', calories: 142 },
      { name: 'Majeranek', amount: '2 łyżki', calories: 20 },
      { name: 'Oliwa z oliwek', amount: '3 łyżki', calories: 360 },
      { name: 'Mąka pszenna', amount: '150 g', calories: 546 },
      { name: 'Olej', amount: '2 łyżki', calories: 240 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 3748,
    servings: 6,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-32',
    name: 'Ryba po Grecku',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Filety rybne obtocz w mące i usmaż na złoto. Marchew, pietruszkę, cebulę i seler zetrzyj na tarce i duś na oleju przez 15 minut. Dodaj przecier pomidorowy, liść laurowy, ziele angielskie, sól, pieprz i cukier. Gotuj sos 10 minut. Układaj warstwy w naczyniu: warzywa — ryba — warzywa. Schłodź, podawaj zimne — smaczniejsza następnego dnia.',
    thumbnail: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
    ingredients: [
      { name: 'Filet z dorsza', amount: '800g', calories: 656 },
      { name: 'Marchew', amount: '4 szt', calories: 164 },
      { name: 'Przecier pomidorowy', amount: '400g', calories: 116 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Pietruszka korzeń', amount: '2 szt', calories: 110 },
      { name: 'Olej', amount: '2 łyżki', calories: 240 },
      { name: 'Cukier', amount: '2 łyżki', calories: 100 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1466,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-33',
    name: 'Mielone Kotlety w Sosie Własnym',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Mięso mielone wymieszaj z namoczoną bułką, jajkiem, cebulą, solą i pieprzem. Formuj owalne kotlety, obtocz w bułce tartej. Usmaż na oleju z obu stron. Przełóż do garnka. Na tej samej patelni podsmaż cebulę, zalej wywarem, dodaj koncentrat. Wlej sos na kotlety i duś pod przykryciem 20 minut. Podawaj z ziemniakami i mizerią.',
    thumbnail: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400',
    ingredients: [
      { name: 'Mięso mielone mieszane', amount: '700g', calories: 1190 },
      { name: 'Bułka kajzerka', amount: '2 szt', calories: 270 },
      { name: 'Jajko', amount: '2 szt', calories: 156 },
      { name: 'Koncentrat pomidorowy', amount: '2 łyżki', calories: 40 },
      { name: 'Bułka tarta', amount: '80g', calories: 316 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Ziemniaki', amount: '600 g', calories: 462 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
      { name: 'Olej', amount: '2 łyżki', calories: 240 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2910,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-34',
    name: 'Pieczone Udka Kurczaka w Miodzie',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Przygotuj marynatę: miód, sos sojowy, czosnek przeciśnięty, oliwa, sól, pieprz, papryka słodka. Udka natnij nożem i natrzyj marynatą ze wszystkich stron. Wstaw do lodówki minimum 2 godziny lub na noc. Piecz w 200°C przez 45–50 minut obracając raz w połowie. Ostatnie 10 minut bez przykrycia dla chrupiącej skórki.',
    thumbnail: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400',
    ingredients: [
      { name: 'Udka kurczaka', amount: '6 szt', calories: 2580 },
      { name: 'Miód', amount: '3 łyżki', calories: 183 },
      { name: 'Sos sojowy', amount: '4 łyżki', calories: 40 },
      { name: 'Czosnek', amount: '5 ząbków', calories: 25 },
      { name: 'Papryka słodka', amount: '1 łyżka', calories: 15 },
      { name: 'Oliwa z oliwek', amount: '2 łyżki', calories: 240 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 3083,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-35',
    name: 'Gęś Świąteczna z Majerankiem',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Gęś umyj i osusz. Natrzyj obficie solą, pieprzem i majerankiem zewnątrz i w środku. Nadzień ćwiartkami jabłek z czosnkiem i rozmarynem. Piecz w 160°C przez 3–3,5 godziny podlewając regularnie wytopionym tłuszczem. Ostatnia godzina bez przykrycia dla chrupiącej skórki. Sos z szumowin z czerwonym winem i śliwkami — zredukuj do konsystencji sosu.',
    thumbnail: 'https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=400',
    ingredients: [
      { name: 'Gęś cała', amount: '3.5kg', calories: 7350 },
      { name: 'Jabłka', amount: '4 szt', calories: 288 },
      { name: 'Majeranek', amount: '3 łyżki', calories: 30 },
      { name: 'Czerwone wino', amount: '200ml', calories: 170 },
      { name: 'Śliwki suszone', amount: '100g', calories: 240 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 8093,
    servings: 8,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-36',
    name: 'Schab Pieczony w Ziołach',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Schab zwiąż sznurkiem by zachował kształt. Natrzyj solą, pieprzem, rozmarynem, tymiankiem i czosnkiem. Obsmaż na patelni ze wszystkich stron na złoty kolor. Przełóż do naczynia, obłóż marchewką, pietruszką i cebulą. Podlej wywarem i białym winem. Piecz w 180°C przez 60–70 minut. Sos przecedź przez sitko i podawaj osobno.',
    thumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
    ingredients: [
      { name: 'Schab wieprzowy bez kości', amount: '1kg', calories: 1820 },
      { name: 'Rozmaryn i tymianek', amount: '3 łyżki', calories: 20 },
      { name: 'Białe wino', amount: '150ml', calories: 120 },
      { name: 'Marchew', amount: '2 szt', calories: 82 },
      { name: 'Czosnek', amount: '4 ząbki', calories: 20 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2142,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  // ── Śniadania ───────────────────────────────────────────────────────────
  {
    id: 'custom-37',
    name: 'Jajecznica na Boczku ze Szczypiorkiem',
    category: 'Śniadania',
    area: 'Polska',
    instructions:
      'Boczek pokrój w kostkę i podsmaż na suchej patelni do chrupkości. Wylej na bok. Jajka wbij na tę samą patelnię, mieszaj powoli drewnianą łyżką tworząc kremową konsystencję. Zdejmij z ognia gdy jajka są jeszcze lekko wilgotne. Posól, posyp świeżo zmielonym pieprzem i posiekanym szczypiorkiem. Podawaj z chlebem na zakwasie.',
    thumbnail: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400',
    ingredients: [
      { name: 'Jajka', amount: '4 szt', calories: 312 },
      { name: 'Boczek wędzony', amount: '100g', calories: 340 },
      { name: 'Szczypiorek', amount: '1 pęczek', calories: 20 },
      { name: 'Masło', amount: '20g', calories: 143 },
      { name: 'Chleb żytni', amount: '2 kromki', calories: 122 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 937,
    servings: 2,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-38',
    name: 'Twarożek ze Szczypiorkiem i Rzodkiewką',
    category: 'Śniadania',
    area: 'Polska',
    instructions:
      'Twaróg rozgnieć widelcem i wymieszaj ze śmietaną do kremowej konsystencji. Rzodkiewki pokrój w plasterki. Szczypiorek posiekaj drobno. Ogórka pokrój w kostkę. Wszystko wymieszaj z twarożkiem. Dopraw solą, pieprzem i ewentualnie czosnkiem. Podawaj z pumperniklem lub pieczywem razowym.',
    thumbnail: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
    ingredients: [
      { name: 'Twaróg półtłusty', amount: '400g', calories: 392 },
      { name: 'Śmietana 18%', amount: '100ml', calories: 184 },
      { name: 'Rzodkiewki', amount: '1 pęczek', calories: 20 },
      { name: 'Szczypiorek', amount: '1 pęczek', calories: 20 },
      { name: 'Ogórek świeży', amount: '1 szt', calories: 15 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 646,
    servings: 3,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-39',
    name: 'Omlet z Pieczarkami i Serem',
    category: 'Śniadania',
    area: 'Polska',
    instructions:
      'Pieczarki pokrój i podsmaż na maśle z cebulą. Jajka rozbij, dodaj śmietanę, sól i pieprz — roztrzep widelcem. Na rozgrzaną patelnię z masłem wlej masę jajeczną. Gdy brzegi się zetną, na połowę omletu wyłóż pieczarki i starty ser. Złóż omlet na pół. Smaż jeszcze minutę. Posyp szczypiorkiem i podawaj natychmiast.',
    thumbnail: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=400',
    ingredients: [
      { name: 'Jajka', amount: '4 szt', calories: 312 },
      { name: 'Pieczarki', amount: '200g', calories: 44 },
      { name: 'Ser żółty', amount: '60g', calories: 214 },
      { name: 'Masło', amount: '30g', calories: 215 },
      { name: 'Śmietana 18%', amount: '2 łyżki', calories: 60 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 925,
    servings: 2,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-40',
    name: 'Owsianka z Jabłkiem i Cynamonem',
    category: 'Śniadania',
    area: 'Polska',
    instructions:
      'Mleko zagotuj z szczyptą soli. Wsyp płatki owsiane i gotuj mieszając przez 5 minut. Jabłko zetrzyj na tarce i dodaj do owsianki razem z cynamonem i miodem. Gotuj jeszcze 2 minuty. Wyłącz, przykryj i odstaw na 3 minuty. Podawaj posypaną orzechami włoskimi i rodzynkami.',
    thumbnail: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400',
    ingredients: [
      { name: 'Płatki owsiane', amount: '80g', calories: 311 },
      { name: 'Mleko 2%', amount: '250ml', calories: 125 },
      { name: 'Jabłko', amount: '1 szt', calories: 72 },
      { name: 'Miód', amount: '1 łyżka', calories: 64 },
      { name: 'Orzechy włoskie', amount: '30g', calories: 196 },
      { name: 'Rodzynki', amount: '50 g', calories: 150 },
      { name: 'Jabłka', amount: '3 szt', calories: 220 },
    ],
    totalCalories: 1138,
    servings: 1,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  // ── Sałatki ─────────────────────────────────────────────────────────────
  {
    id: 'custom-41',
    name: 'Sałatka Jarzynowa Świąteczna',
    category: 'Sałatki',
    area: 'Polska',
    instructions:
      'Ugotuj marchew, pietruszkę, seler, ziemniaki i jajka na twardo — każde osobno. Ostudź i pokrój w kostkę 1×1 cm. Groszek konserwowy i kukurydzę odcedź. Ogórki kiszone pokrój w kostkę. Wszystko wymieszaj. Dodaj majonez, łyżkę musztardy, sól i pieprz. Schłodź minimum 2 godziny. Udekoruj i posyp szczypiorkiem.',
    thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
    ingredients: [
      { name: 'Marchew, pietruszka, seler', amount: '500g', calories: 200 },
      { name: 'Ziemniaki ugotowane', amount: '400g', calories: 308 },
      { name: 'Jajka', amount: '4 szt', calories: 312 },
      { name: 'Majonez', amount: '200g', calories: 1360 },
      { name: 'Groszek i kukurydza', amount: '200g', calories: 170 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2350,
    servings: 8,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-42',
    name: 'Mizeria Ogórkowa ze Śmietaną',
    category: 'Sałatki',
    area: 'Polska',
    instructions:
      'Ogórki pokrój w bardzo cienkie plastry. Posól, wymieszaj i odstaw na 10 minut. Odciśnij nadmiar wody. Śmietanę wymieszaj z sokiem z cytryny, cukrem, solą i białym pieprzem. Zalej ogórki. Dodaj posiekany koperek i szczypiorek. Schłodź przed podaniem. Klasyczny dodatek do kotleta schabowego.',
    thumbnail: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
    ingredients: [
      { name: 'Ogórki szklarniowe', amount: '600g', calories: 90 },
      { name: 'Śmietana 18%', amount: '150ml', calories: 276 },
      { name: 'Koperek świeży', amount: '1 pęczek', calories: 10 },
      { name: 'Cukier', amount: '1 łyżeczka', calories: 20 },
      { name: 'Sok z cytryny', amount: '1 łyżka', calories: 4 },
      { name: 'Wieprzowina', amount: '500 g', calories: 910 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1310,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  // ── Przekąski ───────────────────────────────────────────────────────────
  {
    id: 'custom-43',
    name: 'Pasztet Drobiowy Domowy',
    category: 'Przekąski',
    area: 'Polska',
    instructions:
      'Udka kurczaka ugotuj z włoszczyzną do miękkości. Wątróbki oczyść i krótko podsmaż na maśle z cebulą. Grzyby namocz i ugotuj. Wszystkie składniki zemiel dwukrotnie przez maszynkę. Dodaj jajka, śmietanę, sól, pieprz, majeranek i gałkę muszkatołową. Wymieszaj. Przełóż do formy wyłożonej boczkiem. Piecz w 180°C przez 60 minut w kąpieli wodnej.',
    thumbnail: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400',
    ingredients: [
      { name: 'Udka kurczaka', amount: '600g', calories: 870 },
      { name: 'Wątróbka drobiowa', amount: '300g', calories: 357 },
      { name: 'Grzyby suszone', amount: '30g', calories: 85 },
      { name: 'Jajka', amount: '3 szt', calories: 234 },
      { name: 'Boczek wędzony', amount: '100g', calories: 340 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Masło', amount: '30 g', calories: 215 },
      { name: 'Śmietana', amount: '200 ml', calories: 368 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2549,
    servings: 8,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-44',
    name: 'Zapiekanka na Bagietce',
    category: 'Przekąski',
    area: 'Polska',
    instructions:
      'Bagietkę przekrój wzdłuż na pół. Posmaruj koncentratem pomidorowym. Pieczarki pokrój i podsmaż z cebulą na maśle. Ułóż na bagietce. Przykryj plastrem szynki i posyp obficie tartym serem. Dopraw oregano i czosnkiem granulowanym. Piecz w 200°C przez 12–15 minut aż ser się roztopi i zarumieni. Klasyczna polska street food.',
    thumbnail: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=400',
    ingredients: [
      { name: 'Bagietka', amount: '250g', calories: 685 },
      { name: 'Pieczarki', amount: '300g', calories: 66 },
      { name: 'Ser żółty', amount: '150g', calories: 534 },
      { name: 'Szynka', amount: '100g', calories: 145 },
      { name: 'Koncentrat pomidorowy', amount: '3 łyżki', calories: 60 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Masło', amount: '30 g', calories: 215 },
    ],
    totalCalories: 1800,
    servings: 3,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  // ── Desery ──────────────────────────────────────────────────────────────
  {
    id: 'custom-45',
    name: 'Sernik Klasyczny Warszawski',
    category: 'Desery',
    area: 'Polska',
    instructions:
      'Twaróg miel trzykrotnie lub użyj gotowego twarogu sernikowego. Utrzyj z cukrem i masłem na puszystą masę. Dodaj kolejno żółtka, mąkę ziemniaczaną, śmietanę i skórkę cytrynową. Na końcu wmieszaj delikatnie ubitą pianę z białek. Wylej do formy wyłożonej papierem. Piecz w 160°C przez 60–70 minut — nie otwieraj piekarnika! Ostudź w wyłączonym piekarniku z uchylonymi drzwiczkami.',
    thumbnail: 'https://images.unsplash.com/photo-1567171466295-4afa63d45416?w=400',
    ingredients: [
      { name: 'Twaróg trójmielony', amount: '1kg', calories: 980 },
      { name: 'Masło', amount: '200g', calories: 1434 },
      { name: 'Cukier', amount: '250g', calories: 968 },
      { name: 'Jajka', amount: '6 szt', calories: 468 },
      { name: 'Mąka ziemniaczana', amount: '4 łyżki', calories: 140 },
      { name: 'Śmietana', amount: '200 ml', calories: 368 },
    ],
    totalCalories: 4358,
    servings: 12,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-46',
    name: 'Racuchy z Jabłkami',
    category: 'Desery',
    area: 'Polska',
    instructions:
      'Drożdże rozczyń z ciepłym mlekiem, łyżeczką cukru i łyżką mąki. Odstaw na 15 minut. Mąkę wymieszaj z cukrem i solą. Dodaj zaczyn, jajka i mleko — wymieszaj na gładkie ciasto. Jabłka zetrzyj na tarce i wymieszaj z ciastem. Smaż na rozgrzanym oleju z obu stron na złoty kolor. Posyp cukrem pudrem i podawaj ze śmietaną.',
    thumbnail: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400',
    ingredients: [
      { name: 'Mąka pszenna', amount: '300g', calories: 1020 },
      { name: 'Jabłka', amount: '3 szt', calories: 216 },
      { name: 'Mleko', amount: '300ml', calories: 150 },
      { name: 'Jajka', amount: '3 szt', calories: 234 },
      { name: 'Olej do smażenia', amount: '80ml', calories: 707 },
      { name: 'Cukier', amount: '2 łyżki', calories: 100 },
      { name: 'Śmietana', amount: '200 ml', calories: 368 },
      { name: 'Drożdże', amount: '25 g', calories: 25 },
      { name: 'Szczypta soli', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2820,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-47',
    name: 'Drożdżówka z Kruszonką',
    category: 'Desery',
    area: 'Polska',
    instructions:
      'Ciasto: mąkę, cukier, masło, jajka, mleko i drożdże zagnieć i odstaw do wyrośnięcia na 1 godzinę. Kruszonka: mąka + cukier + zimne masło — utrzyj palcami na okruszki. Ciasto wyłóż na blachę lub podziel na bułeczki. Posyp kruszonką. Możesz dodać nadzienie twarogowe lub powidła. Piecz w 180°C przez 25–30 minut.',
    thumbnail: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    ingredients: [
      { name: 'Mąka pszenna', amount: '500g', calories: 1700 },
      { name: 'Masło', amount: '150g', calories: 1076 },
      { name: 'Cukier', amount: '100g', calories: 387 },
      { name: 'Mleko', amount: '200ml', calories: 100 },
      { name: 'Jajka', amount: '3 szt', calories: 234 },
      { name: 'Twaróg', amount: '250 g', calories: 245 },
      { name: 'Drożdże', amount: '25 g', calories: 25 },
    ],
    totalCalories: 3767,
    servings: 10,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  // ── Wegetariańskie ──────────────────────────────────────────────────────
  {
    id: 'custom-48',
    name: 'Kapusta z Grzybami Wigilijna',
    category: 'Wegetariańskie',
    area: 'Polska',
    instructions:
      'Grzyby suszone namocz przez noc i ugotuj. Pokrój drobno, wywar zachowaj. Kapustę kiszoną przepłucz, posiekaj i ugotuj do miękkości. Cebulę podsmaż na oleju. Dodaj kapustę, grzyby z wywarem, liść laurowy i ziele angielskie. Duś razem 30 minut. Dopraw solą i pieprzem. Smaczniejsza odgrzewana — przygotuj dzień wcześniej.',
    thumbnail: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=400',
    ingredients: [
      { name: 'Kapusta kiszona', amount: '1kg', calories: 100 },
      { name: 'Grzyby suszone', amount: '50g', calories: 142 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Olej rzepakowy', amount: '3 łyżki', calories: 360 },
      { name: 'Przyprawy', amount: '5 szt', calories: 5 },
    ],
    totalCalories: 687,
    servings: 6,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-49',
    name: 'Pierogi z Kapustą i Grzybami',
    category: 'Wegetariańskie',
    area: 'Polska',
    instructions:
      'Grzyby namocz i ugotuj, posiekaj. Kapustę kiszoną przepłucz, ugotuj i odciśnij, posiekaj. Cebulę podsmaż, dodaj kapustę i grzyby. Duś do wchłonięcia płynu. Dopraw. Zagnieć ciasto: mąka, woda, sól. Cienko rozwałkuj, wycinaj kółka. Nakładaj farsz i lepi. Gotuj we wrzątku 4 minuty po wypłynięciu. Okraś cebulką smażoną na złoto.',
    thumbnail: 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400',
    ingredients: [
      { name: 'Mąka pszenna', amount: '400g', calories: 1360 },
      { name: 'Kapusta kiszona', amount: '500g', calories: 50 },
      { name: 'Grzyby suszone', amount: '40g', calories: 114 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Masło do podania', amount: '50g', calories: 358 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1962,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  // ── Grillowane ──────────────────────────────────────────────────────────
  {
    id: 'custom-50',
    name: 'Karkówka z Grilla',
    category: 'Grillowane',
    area: 'Polska',
    instructions:
      'Karkówkę pokrój na plastry grubości 2 cm. Marynatę: olej, czosnek, papryka słodka i ostra, majeranek, kminek, sól, pieprz i odrobina piwa. Mięso obtocz w marynacie i wstaw do lodówki minimum 4 godziny. Grilluj na rozgrzanym ruszcie po 6–8 minut z każdej strony. Nie nakłuwaj widelcem. Podawaj z cebulą i musztardą.',
    thumbnail: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400',
    ingredients: [
      { name: 'Karkówka wieprzowa', amount: '1.2kg', calories: 2640 },
      { name: 'Czosnek', amount: '4 ząbki', calories: 20 },
      { name: 'Papryka słodka i ostra', amount: '2 łyżki', calories: 30 },
      { name: 'Piwo', amount: '100ml', calories: 43 },
      { name: 'Olej rzepakowy', amount: '50ml', calories: 442 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 3255,
    servings: 6,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-51',
    name: 'Kiełbasa z Grilla z Musztardą',
    category: 'Grillowane',
    area: 'Polska',
    instructions:
      'Kiełbasę natnij ukośnie co 2 cm — wejdzie smak i nie pęknie podczas grillowania. Natrzyj oliwą i grilluj na średnim ogniu ok. 5 minut z każdej strony aż będzie złocista i chrupiąca. Cebulę pokrój w krążki i grilluj obok. Podawaj z musztardą, chrzanem i świeżym pieczywem. Klasyka polskiego grilla.',
    thumbnail: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400',
    ingredients: [
      { name: 'Kiełbasa śląska', amount: '600g', calories: 1680 },
      { name: 'Cebula', amount: '3 szt', calories: 120 },
      { name: 'Musztarda', amount: '4 łyżki', calories: 60 },
      { name: 'Oliwa z oliwek', amount: '2 łyżki', calories: 240 },
      { name: 'Bułki', amount: '4 szt', calories: 560 },
    ],
    totalCalories: 2660,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  // ── Makarony ────────────────────────────────────────────────────────────
  {
    id: 'custom-52',
    name: 'Makaron z Mięsem Mielonym',
    category: 'Makarony',
    area: 'Polska',
    instructions:
      'Cebulę i czosnek podsmaż na oleju. Dodaj mięso mielone i smaż do zarumienienia, rozbijając grudki. Dodaj koncentrat pomidorowy, puszkę pomidorów, sól, pieprz, oregano i bazylię. Duś na małym ogniu 20 minut. Makaron ugotuj al dente. Wymieszaj z sosem. Posyp startym parmezanem i świeżą bazylią.',
    thumbnail: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400',
    ingredients: [
      { name: 'Makaron penne', amount: '400g', calories: 524 },
      { name: 'Mięso mielone wołowe', amount: '500g', calories: 1250 },
      { name: 'Pomidory z puszki', amount: '400g', calories: 80 },
      { name: 'Koncentrat pomidorowy', amount: '2 łyżki', calories: 40 },
      { name: 'Parmezan', amount: '50g', calories: 216 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Olej', amount: '2 łyżki', calories: 240 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2445,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  // ── Fit i Dieta ─────────────────────────────────────────────────────────
  {
    id: 'custom-53',
    name: 'Grillowana Pierś z Warzywami',
    category: 'Fit i Dieta',
    area: 'Polska',
    instructions:
      'Pierś z kurczaka rozbij tłuczkiem na równą grubość. Natrzyj oliwą, solą, pieprzem, papryką i czosnkiem. Grilluj na patelni grillowej po 4 minuty z każdej strony. Cukinia, papryka i brokuły pokrój i podduś z oliwą i czosnkiem. Podawaj kurczaka z warzywami i plasterkiem cytryny. Dużo białka, mało kalorii — idealne.',
    thumbnail: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400',
    ingredients: [
      { name: 'Pierś z kurczaka', amount: '600g', calories: 990 },
      { name: 'Cukinia', amount: '2 szt', calories: 34 },
      { name: 'Papryka', amount: '2 szt', calories: 62 },
      { name: 'Brokuły', amount: '300g', calories: 102 },
      { name: 'Oliwa z oliwek', amount: '2 łyżki', calories: 240 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1443,
    servings: 3,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-54',
    name: 'Sałatka z Tuńczykiem i Jajkiem',
    category: 'Fit i Dieta',
    area: 'Polska',
    instructions:
      'Jajka ugotuj na twardo i pokrój w ćwiartki. Tuńczyka odsącz. Pomidorki cherry przekrój na pół. Ogórek pokrój w plasterki. Kukurydzę odsącz. Wszystko ułóż na talerzu na sałacie. Polej dressingiem z oliwy, soku z cytryny i musztardy. Posyp pestkami dyni. Sycąca i zdrowa — świetna na lunch.',
    thumbnail: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
    ingredients: [
      { name: 'Tuńczyk w wodzie', amount: '200g', calories: 232 },
      { name: 'Jajka', amount: '3 szt', calories: 234 },
      { name: 'Sałata mieszana', amount: '150g', calories: 23 },
      { name: 'Pomidorki cherry', amount: '200g', calories: 36 },
      { name: 'Oliwa z oliwek', amount: '2 łyżki', calories: 240 },
    ],
    totalCalories: 765,
    servings: 2,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },

  // ── Śniadania ─────────────────────────────────────────────────────────────
  {
    id: 'custom-55',
    name: 'Owsianka z Bananem i Masłem Orzechowym',
    category: 'Śniadania',
    area: 'Polska',
    instructions:
      'Płatki owsiane zalej mlekiem i gotuj na małym ogniu 5–7 minut, mieszając. Gdy zgęstnieją, zdejmij z ognia. Przełóż do miski, na wierzch połóż pokrojonego banana i łyżkę masła orzechowego. Posyp cynamonem. Możesz dodać łyżkę miodu lub garść orzechów.',
    thumbnail: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400',
    ingredients: [
      { name: 'Płatki owsiane', amount: '60g', calories: 233 },
      { name: 'Mleko 2%', amount: '250ml', calories: 125 },
      { name: 'Banan', amount: '1 szt', calories: 105 },
      { name: 'Masło orzechowe', amount: '20g', calories: 118 },
      { name: 'Miód', amount: '2 łyżki', calories: 120 },
      { name: 'Orzechy', amount: '50 g', calories: 320 },
    ],
    totalCalories: 1021,
    servings: 1,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-56',
    name: 'Jajecznica na Boczku ze Szczypiorkiem',
    category: 'Śniadania',
    area: 'Polska',
    instructions:
      'Boczek pokrój w kostkę i wysmaż na patelni na chrupko. Jajka roztrzep widelcem z solą i pieprzem. Wlej na patelnię do boczku i smaż na małym ogniu, delikatnie mieszając, aż zetną się do pożądanej konsystencji. Posyp posiekanym szczypiorkiem. Podawaj z pieczywem.',
    thumbnail: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400',
    ingredients: [
      { name: 'Jajka', amount: '3 szt', calories: 234 },
      { name: 'Boczek wędzony', amount: '50g', calories: 170 },
      { name: 'Szczypiorek', amount: '10g', calories: 3 },
      { name: 'Chleb żytni', amount: '2 kromki', calories: 170 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 577,
    servings: 1,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-57',
    name: 'Kanapki z Pastą Jajeczną',
    category: 'Śniadania',
    area: 'Polska',
    instructions:
      'Jajka ugotuj na twardo (8–9 minut), ostudź i obierz. Rozgnieć widelcem. Dodaj majonez, posiekany szczypiorek, sól i pieprz. Wymieszaj na jednolitą pastę. Nałóż na kromki pieczywa. Udekoruj plasterkiem rzodkiewki lub ogórka.',
    thumbnail: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    ingredients: [
      { name: 'Jajka', amount: '4 szt', calories: 312 },
      { name: 'Majonez', amount: '2 łyżki', calories: 180 },
      { name: 'Chleb pszenny', amount: '4 kromki', calories: 380 },
      { name: 'Szczypiorek', amount: '15g', calories: 5 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 877,
    servings: 2,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-58',
    name: 'Omlet z Warzywami i Serem',
    category: 'Śniadania',
    area: 'Polska',
    instructions:
      'Jajka roztrzep z solą i pieprzem. Paprykę i cebulę pokrój w kostkę, podsmaż na maśle 3 minuty. Wlej jajka i smaż na małym ogniu pod przykryciem. Gdy wierzch będzie prawie ścięty, posyp startym serem, złóż omlet na pół i podgrzej jeszcze minutę.',
    thumbnail: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400',
    ingredients: [
      { name: 'Jajka', amount: '3 szt', calories: 234 },
      { name: 'Papryka czerwona', amount: '100g', calories: 31 },
      { name: 'Ser żółty', amount: '40g', calories: 142 },
      { name: 'Masło', amount: '10g', calories: 72 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 559,
    servings: 1,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },

  // ── Fit i Dieta ───────────────────────────────────────────────────────────
  {
    id: 'custom-59',
    name: 'Grillowany Kurczak z Warzywami',
    category: 'Fit i Dieta',
    area: 'Polska',
    instructions:
      'Pierś z kurczaka rozbij lekko tłuczkiem, natrzyj oliwą, czosnkiem, papryką słodką, solą i pieprzem. Odstaw na 20 minut. Grilluj po 5–6 minut z każdej strony. Cukinię i paprykę pokrój w plastry, skrop oliwą i grilluj 3–4 minuty. Podawaj z ćwiartką cytryny.',
    thumbnail: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400',
    ingredients: [
      { name: 'Pierś z kurczaka', amount: '250g', calories: 413 },
      { name: 'Cukinia', amount: '200g', calories: 34 },
      { name: 'Papryka czerwona', amount: '150g', calories: 47 },
      { name: 'Oliwa z oliwek', amount: '1 łyżka', calories: 120 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 629,
    servings: 2,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-60',
    name: 'Bowl z Komosą i Łososiem',
    category: 'Fit i Dieta',
    area: 'Świat',
    instructions:
      'Komosę ryżową ugotuj wg opisu na opakowaniu (ok. 15 minut). Łososia natrzyj solą i pieprzem, usmaż na patelni po 3–4 minuty z każdej strony. Awokado pokrój w plastry. W misce ułóż komosę, na niej łososia, awokado, pomidorki i rukolę. Skrop oliwą i sokiem z cytryny.',
    thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
    ingredients: [
      { name: 'Łosoś świeży', amount: '180g', calories: 374 },
      { name: 'Komosa ryżowa', amount: '60g suchej', calories: 221 },
      { name: 'Awokado', amount: '½ szt', calories: 120 },
      { name: 'Rukola', amount: '50g', calories: 13 },
      { name: 'Oliwa z oliwek', amount: '2 łyżki', calories: 240 },
      { name: 'Pomidory', amount: '400 g', calories: 72 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1040,
    servings: 1,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-61',
    name: 'Twarożek z Rzodkiewką i Szczypiorkiem',
    category: 'Fit i Dieta',
    area: 'Polska',
    instructions:
      'Twaróg rozgnieć widelcem. Dodaj jogurt naturalny i wymieszaj na gładką masę. Rzodkiewki pokrój w drobną kostkę, szczypiorek posiekaj. Wymieszaj z twarogiem, dopraw solą i pieprzem. Podawaj z pieczywem razowym. Lekka, wysokobiałkowa kolacja.',
    thumbnail: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
    ingredients: [
      { name: 'Twaróg półtłusty', amount: '200g', calories: 196 },
      { name: 'Jogurt naturalny', amount: '50g', calories: 31 },
      { name: 'Rzodkiewka', amount: '80g', calories: 13 },
      { name: 'Chleb razowy', amount: '2 kromki', calories: 170 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 410,
    servings: 2,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },

  // ── Makarony ──────────────────────────────────────────────────────────────
  {
    id: 'custom-62',
    name: 'Spaghetti Bolognese',
    category: 'Makarony',
    area: 'Włochy',
    instructions:
      'Cebulę i czosnek zeszklij na oliwie. Dodaj mięso mielone i smaż, rozdrabniając łyżką, aż się zarumieni. Wlej passatę, dodaj oregano, bazylię, sól i pieprz. Duś na małym ogniu 30 minut. Makaron ugotuj al dente. Podawaj sos na makaronie, posypany parmezanem.',
    thumbnail: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    ingredients: [
      { name: 'Makaron spaghetti', amount: '300g', calories: 1050 },
      { name: 'Mięso mielone wołowe', amount: '400g', calories: 1000 },
      { name: 'Passata pomidorowa', amount: '400g', calories: 140 },
      { name: 'Parmezan', amount: '50g', calories: 216 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Oliwa z oliwek', amount: '2 łyżki', calories: 240 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2741,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-63',
    name: 'Makaron Carbonara',
    category: 'Makarony',
    area: 'Włochy',
    instructions:
      'Boczek pokrój w kostkę i wysmaż na chrupko. Żółtka wymieszaj ze startym parmezanem i pieprzem. Makaron ugotuj al dente, odlej szklankę wody z gotowania. Gorący makaron wymieszaj z boczkiem, zdejmij z ognia i szybko wmieszaj masę jajeczną, dolewając wody, aż powstanie kremowy sos. Nie gotuj dalej — jajka mają się tylko ściąć.',
    thumbnail: 'https://images.unsplash.com/photo-1529563021893-cc83c992d75d?w=400',
    ingredients: [
      { name: 'Makaron spaghetti', amount: '300g', calories: 1050 },
      { name: 'Boczek wędzony', amount: '150g', calories: 510 },
      { name: 'Żółtka jaj', amount: '4 szt', calories: 220 },
      { name: 'Parmezan', amount: '60g', calories: 259 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2195,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-64',
    name: 'Makaron z Kurczakiem i Brokułami',
    category: 'Makarony',
    area: 'Polska',
    instructions:
      'Kurczaka pokrój w paski, dopraw i podsmaż na oliwie. Brokuły podziel na różyczki i ugotuj al dente (4 minuty). Makaron ugotuj. Na patelnię z kurczakiem dodaj śmietanę, czosnek i starty ser, chwilę podgrzej. Dodaj makaron i brokuły, wymieszaj. Dopraw pieprzem.',
    thumbnail: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400',
    ingredients: [
      { name: 'Makaron penne', amount: '300g', calories: 1050 },
      { name: 'Pierś z kurczaka', amount: '400g', calories: 660 },
      { name: 'Brokuły', amount: '300g', calories: 102 },
      { name: 'Śmietana 18%', amount: '200ml', calories: 368 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Oliwa z oliwek', amount: '2 łyżki', calories: 240 },
      { name: 'Ser żółty', amount: '100 g', calories: 356 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2791,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },

  // ── Sałatki ───────────────────────────────────────────────────────────────
  {
    id: 'custom-65',
    name: 'Sałatka Grecka',
    category: 'Sałatki',
    area: 'Grecja',
    instructions:
      'Pomidory pokrój w ćwiartki, ogórek w grube półplasterki, cebulę w piórka. Paprykę pokrój w paski. Wymieszaj w misce. Dodaj oliwki i pokrojoną w kostkę fetę. Skrop oliwą, posyp oregano, dopraw solą i pieprzem. Nie mieszaj zbyt mocno, żeby feta się nie rozpadła.',
    thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
    ingredients: [
      { name: 'Pomidory', amount: '400g', calories: 72 },
      { name: 'Ogórek', amount: '200g', calories: 30 },
      { name: 'Feta', amount: '150g', calories: 375 },
      { name: 'Oliwki czarne', amount: '80g', calories: 92 },
      { name: 'Oliwa z oliwek', amount: '2 łyżki', calories: 240 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 889,
    servings: 3,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-66',
    name: 'Sałatka Cezar z Kurczakiem',
    category: 'Sałatki',
    area: 'Świat',
    instructions:
      'Kurczaka dopraw i usmaż, pokrój w paski. Chleb pokrój w kostkę i podpiecz na grzanki z odrobiną oliwy i czosnkiem. Sałatę rzymską porwij na kawałki. Wymieszaj sos: majonez, parmezan, czosnek, sok z cytryny, odrobina musztardy. Połącz sałatę z sosem, ułóż kurczaka, grzanki i wiórki parmezanu.',
    thumbnail: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    ingredients: [
      { name: 'Pierś z kurczaka', amount: '300g', calories: 495 },
      { name: 'Sałata rzymska', amount: '200g', calories: 30 },
      { name: 'Grzanki', amount: '80g', calories: 300 },
      { name: 'Parmezan', amount: '40g', calories: 172 },
      { name: 'Majonez', amount: '3 łyżki', calories: 270 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Oliwa z oliwek', amount: '2 łyżki', calories: 240 },
    ],
    totalCalories: 1522,
    servings: 3,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },

  // ── Wegetariańskie ────────────────────────────────────────────────────────
  {
    id: 'custom-67',
    name: 'Curry z Ciecierzycą i Mlekiem Kokosowym',
    category: 'Wegetariańskie',
    area: 'Indie',
    instructions:
      'Cebulę i czosnek zeszklij na oleju. Dodaj imbir i przyprawy (curry, kurkuma, kmin) — praż 30 sekund. Wsyp odsączoną ciecierzycę i pokrojone pomidory. Wlej mleko kokosowe. Duś 20 minut na małym ogniu. Na koniec dodaj szpinak i mieszaj, aż zwiędnie. Podawaj z ryżem.',
    thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    ingredients: [
      { name: 'Ciecierzyca z puszki', amount: '400g', calories: 656 },
      { name: 'Mleko kokosowe', amount: '400ml', calories: 580 },
      { name: 'Pomidory z puszki', amount: '400g', calories: 80 },
      { name: 'Szpinak', amount: '150g', calories: 35 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Ryż', amount: '100 g', calories: 360 },
      { name: 'Olej', amount: '2 łyżki', calories: 240 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2046,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-68',
    name: 'Placki z Cukinii',
    category: 'Wegetariańskie',
    area: 'Polska',
    instructions:
      'Cukinię zetrzyj na tarce o grubych oczkach, posól i odstaw na 15 minut, potem mocno odciśnij. Dodaj jajka, mąkę, starty czosnek, sól i pieprz. Wymieszaj na gęste ciasto. Smaż placki na rozgrzanym oleju po 3 minuty z każdej strony na złoto. Podawaj z jogurtem i koperkiem.',
    thumbnail: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
    ingredients: [
      { name: 'Cukinia', amount: '600g', calories: 102 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
      { name: 'Mąka pszenna', amount: '120g', calories: 437 },
      { name: 'Olej', amount: '3 łyżki', calories: 360 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1070,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-69',
    name: 'Risotto z Pieczarkami',
    category: 'Wegetariańskie',
    area: 'Włochy',
    instructions:
      'Pieczarki pokrój w plastry i podsmaż na maśle, odstaw. Cebulę zeszklij, wsyp ryż arborio i praż minutę. Wlej wino, odparuj. Następnie dolewaj gorący bulion po jednej chochli, mieszając, aż ryż wchłonie płyn — ok. 18 minut. Pod koniec dodaj pieczarki, parmezan i masło. Wymieszaj do kremowej konsystencji.',
    thumbnail: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400',
    ingredients: [
      { name: 'Ryż arborio', amount: '300g', calories: 1080 },
      { name: 'Pieczarki', amount: '400g', calories: 88 },
      { name: 'Parmezan', amount: '60g', calories: 259 },
      { name: 'Masło', amount: '40g', calories: 287 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
    ],
    totalCalories: 1794,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },

  // ── Dania główne ──────────────────────────────────────────────────────────
  {
    id: 'custom-70',
    name: 'Kotlet Schabowy z Ziemniakami',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Schab pokrój na plastry i rozbij tłuczkiem. Dopraw solą i pieprzem. Panieruj kolejno w mące, roztrzepanym jajku i bułce tartej. Smaż na rozgrzanym oleju po 4 minuty z każdej strony na złoty kolor. Podawaj z ziemniakami z koperkiem i surówką z kapusty.',
    thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    ingredients: [
      { name: 'Schab wieprzowy', amount: '600g', calories: 1092 },
      { name: 'Bułka tarta', amount: '100g', calories: 395 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
      { name: 'Ziemniaki', amount: '800g', calories: 616 },
      { name: 'Olej', amount: '4 łyżki', calories: 480 },
      { name: 'Kapusta', amount: '500 g', calories: 125 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2864,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-71',
    name: 'Gulasz Wieprzowy z Papryką',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Mięso pokrój w kostkę i obsmaż partiami na złoto. Dodaj pokrojoną cebulę i smaż do zeszklenia. Wsyp paprykę słodką i wędzoną, wymieszaj. Dodaj pokrojoną paprykę i koncentrat. Zalej bulionem, dopraw. Duś pod przykryciem 1,5 godziny, aż mięso będzie miękkie. Podawaj z kaszą lub pieczywem.',
    thumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
    ingredients: [
      { name: 'Łopatka wieprzowa', amount: '800g', calories: 1520 },
      { name: 'Papryka czerwona', amount: '300g', calories: 93 },
      { name: 'Cebula', amount: '200g', calories: 80 },
      { name: 'Koncentrat pomidorowy', amount: '60g', calories: 49 },
      { name: 'Kasza', amount: '150 g', calories: 520 },
    ],
    totalCalories: 2262,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-72',
    name: 'Łosoś Pieczony z Cytryną',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Piekarnik nagrzej do 200°C. Filety z łososia ułóż na papierze do pieczenia. Skrop oliwą, posyp solą, pieprzem i koperkiem. Na wierzchu ułóż plasterki cytryny. Piecz 15–18 minut, aż mięso będzie się rozwarstwiać widelcem. Podawaj z ziemniakami i surówką.',
    thumbnail: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
    ingredients: [
      { name: 'Łosoś świeży', amount: '600g', calories: 1248 },
      { name: 'Cytryna', amount: '1 szt', calories: 17 },
      { name: 'Oliwa z oliwek', amount: '2 łyżki', calories: 240 },
      { name: 'Ziemniaki', amount: '600g', calories: 462 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1967,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-73',
    name: 'Zapiekanka Ziemniaczana z Mięsem',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Ziemniaki ugotuj i pokrój w plastry. Mięso mielone podsmaż z cebulą i czosnkiem, dopraw. W naczyniu żaroodpornym układaj warstwami: ziemniaki, mięso, znowu ziemniaki. Zalej śmietaną wymieszaną z jajkiem. Posyp startym serem. Piecz 35 minut w 190°C, aż wierzch się zarumieni.',
    thumbnail: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=400',
    ingredients: [
      { name: 'Ziemniaki', amount: '1 kg', calories: 770 },
      { name: 'Mięso mielone', amount: '500g', calories: 1200 },
      { name: 'Ser żółty', amount: '150g', calories: 534 },
      { name: 'Śmietana 18%', amount: '200ml', calories: 368 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Jajka', amount: '2 szt', calories: 156 },
    ],
    totalCalories: 3123,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-74',
    name: 'Pierś z Indyka w Sosie Śmietanowym',
    category: 'Dania główne',
    area: 'Polska',
    instructions:
      'Indyka pokrój w kostkę, dopraw solą i pieprzem, obsmaż na patelni. Dodaj pokrojoną cebulę i pieczarki, smaż 5 minut. Wlej śmietanę i bulion, dodaj czosnek i tymianek. Duś 15 minut, aż sos zgęstnieje. Podawaj z ryżem lub kaszą.',
    thumbnail: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400',
    ingredients: [
      { name: 'Pierś z indyka', amount: '600g', calories: 810 },
      { name: 'Pieczarki', amount: '250g', calories: 55 },
      { name: 'Śmietana 18%', amount: '250ml', calories: 460 },
      { name: 'Cebula', amount: '150g', calories: 60 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Ryż', amount: '100 g', calories: 360 },
      { name: 'Kasza', amount: '150 g', calories: 520 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 2280,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },

  // ── Zupy ──────────────────────────────────────────────────────────────────
  {
    id: 'custom-75',
    name: 'Krem z Dyni z Imbirem',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Dynię obierz i pokrój w kostkę. Cebulę i czosnek zeszklij na maśle, dodaj starty imbir. Wsyp dynię i marchew, zalej bulionem. Gotuj 20 minut, aż warzywa zmiękną. Zblenduj na gładki krem. Wlej śmietankę, dopraw solą, pieprzem i szczyptą gałki. Podawaj z pestkami dyni.',
    thumbnail: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400',
    ingredients: [
      { name: 'Dynia', amount: '800g', calories: 208 },
      { name: 'Marchew', amount: '200g', calories: 82 },
      { name: 'Śmietana 18%', amount: '150ml', calories: 276 },
      { name: 'Bulion warzywny', amount: '800ml', calories: 96 },
      { name: 'Cebula', amount: '2 szt', calories: 80 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Masło', amount: '30 g', calories: 215 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 972,
    servings: 4,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-76',
    name: 'Barszcz Czerwony Czysty',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Buraki obierz i zetrzyj lub pokrój w plastry. Zalej bulionem warzywnym, dodaj liść laurowy, ziele angielskie, czosnek i majeranek. Gotuj na małym ogniu 30 minut — nie doprowadzaj do wrzenia, żeby barszcz nie stracił koloru. Przecedź. Dopraw sokiem z cytryny, solą, pieprzem i szczyptą cukru.',
    thumbnail: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400',
    ingredients: [
      { name: 'Buraki', amount: '700g', calories: 301 },
      { name: 'Bulion warzywny', amount: '1,5 l', calories: 180 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Sok z cytryny', amount: '2 łyżki', calories: 8 },
      { name: 'Cukier', amount: '2 łyżki', calories: 100 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 604,
    servings: 6,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-77',
    name: 'Zupa Ogórkowa',
    category: 'Zupy',
    area: 'Polska',
    instructions:
      'Ugotuj wywar z włoszczyzny. Ziemniaki pokrój w kostkę i ugotuj w wywarze. Ogórki kiszone zetrzyj na tarce i dodaj do zupy razem z odrobiną soku z ogórków. Gotuj 10 minut. Zabiel śmietaną wymieszaną z odrobiną gorącej zupy. Dopraw pieprzem i koperkiem.',
    thumbnail: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
    ingredients: [
      { name: 'Ogórki kiszone', amount: '400g', calories: 48 },
      { name: 'Ziemniaki', amount: '500g', calories: 385 },
      { name: 'Śmietana 18%', amount: '200ml', calories: 368 },
      { name: 'Włoszczyzna', amount: '300g', calories: 105 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 906,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },

  // ── Grillowane ────────────────────────────────────────────────────────────
  {
    id: 'custom-78',
    name: 'Karkówka z Grilla w Marynacie',
    category: 'Grillowane',
    area: 'Polska',
    instructions:
      'Karkówkę pokrój na plastry ok. 1,5 cm. Przygotuj marynatę: olej, czosnek, papryka słodka, majeranek, musztarda, pieprz. Natrzyj mięso i odstaw do lodówki na minimum 4 godziny (najlepiej na noc). Grilluj po 5–7 minut z każdej strony na średnim żarze. Posól dopiero pod koniec.',
    thumbnail: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400',
    ingredients: [
      { name: 'Karkówka wieprzowa', amount: '1 kg', calories: 2700 },
      { name: 'Olej', amount: '3 łyżki', calories: 360 },
      { name: 'Musztarda', amount: '2 łyżki', calories: 30 },
      { name: 'Czosnek', amount: '4 ząbki', calories: 20 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 3110,
    servings: 6,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-79',
    name: 'Szaszłyki Drobiowe',
    category: 'Grillowane',
    area: 'Polska',
    instructions:
      'Kurczaka pokrój w kostkę 3 cm, zamarynuj w oliwie z czosnkiem, papryką i ziołami na 2 godziny. Paprykę i cebulę pokrój w kawałki. Nabijaj na patyki naprzemiennie: mięso, papryka, cebula. Grilluj 12–15 minut, obracając co kilka minut, aż kurczak będzie ścięty.',
    thumbnail: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400',
    ingredients: [
      { name: 'Pierś z kurczaka', amount: '700g', calories: 1155 },
      { name: 'Papryka', amount: '300g', calories: 93 },
      { name: 'Cebula', amount: '200g', calories: 80 },
      { name: 'Oliwa z oliwek', amount: '3 łyżki', calories: 360 },
      { name: 'Czosnek', amount: '3 ząbki', calories: 15 },
      { name: 'Przyprawy (sól, pieprz, zioła)', amount: 'do smaku', calories: 0 },
    ],
    totalCalories: 1703,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },

  // ── Desery i przekąski ────────────────────────────────────────────────────
  {
    id: 'custom-80',
    name: 'Sernik na Zimno z Owocami',
    category: 'Desery',
    area: 'Polska',
    instructions:
      'Ciastka zmiel i wymieszaj z roztopionym masłem. Wyłóż spodem tortownicy i schłodź. Serek homogenizowany utrzyj z cukrem pudrem i śmietaną kremówką. Żelatynę rozpuść w wodzie, ostudź i wmieszaj do masy. Wylej na spód, wyrównaj. Schłodź 4 godziny. Udekoruj owocami i galaretką.',
    thumbnail: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400',
    ingredients: [
      { name: 'Serek homogenizowany', amount: '750g', calories: 1065 },
      { name: 'Śmietana kremówka', amount: '400ml', calories: 1168 },
      { name: 'Ciastka', amount: '200g', calories: 920 },
      { name: 'Owoce', amount: '300g', calories: 150 },
      { name: 'Masło', amount: '30 g', calories: 215 },
      { name: 'Cukier', amount: '2 łyżki', calories: 100 },
    ],
    totalCalories: 3618,
    servings: 10,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-81',
    name: 'Naleśniki z Serem',
    category: 'Desery',
    area: 'Polska',
    instructions:
      'Wymieszaj mąkę, mleko, jajka i szczyptę soli na gładkie ciasto — odstaw na 20 minut. Smaż cienkie naleśniki na rozgrzanej patelni. Twaróg zmiel, wymieszaj z cukrem, żółtkiem i rodzynkami. Nałóż farsz na naleśnik, zawiń w kopertę. Podsmaż krótko na maśle. Podawaj ze śmietaną.',
    thumbnail: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400',
    ingredients: [
      { name: 'Mąka pszenna', amount: '250g', calories: 910 },
      { name: 'Mleko 2%', amount: '500ml', calories: 250 },
      { name: 'Jajka', amount: '3 szt', calories: 234 },
      { name: 'Twaróg', amount: '500g', calories: 490 },
      { name: 'Cukier', amount: '60g', calories: 232 },
      { name: 'Masło', amount: '30 g', calories: 215 },
      { name: 'Śmietana', amount: '200 ml', calories: 368 },
      { name: 'Rodzynki', amount: '50 g', calories: 150 },
    ],
    totalCalories: 2849,
    servings: 5,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: 'custom-82',
    name: 'Koktajl Bananowo-Truskawkowy',
    category: 'Przekąski',
    area: 'Polska',
    instructions:
      'Banana obierz i pokrój na kawałki. Truskawki umyj i usuń szypułki. Wrzuć do blendera razem z jogurtem i mlekiem. Zblenduj na gładko, ok. 30 sekund. Jeśli koktajl jest zbyt gęsty, dolej mleka. Możesz dosłodzić miodem. Podawaj od razu, schłodzony.',
    thumbnail: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=400',
    ingredients: [
      { name: 'Banan', amount: '1 szt', calories: 105 },
      { name: 'Truskawki', amount: '200g', calories: 64 },
      { name: 'Jogurt naturalny', amount: '150g', calories: 92 },
      { name: 'Mleko 2%', amount: '150ml', calories: 75 },
      { name: 'Miód', amount: '2 łyżki', calories: 120 },
    ],
    totalCalories: 456,
    servings: 2,
    isCustom: false,
    dateAdded: new Date().toISOString(),
  },
];

const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

// Każdy dostawca ma na stałe przypisany jeden, sprawdzony model z obsługą zdjęć.
// Nie ma już wyboru modelu w UI — dzięki temu nie da się utknąć na modelu tekstowym
// (skaner zdjęć nie działał) ani na wycofanym/płatnym modelu. Przy każdym starcie
// zapisany model jest wyrównywany do tej wartości, więc naprawia to też stare stany.
// Stabilny model GA. NIE używamy aliasu „*-latest" jako podstawowego — wskazuje on
// na wersje preview z zaostrzonymi limitami zapytań (stąd wcześniejsze błędy AI).
export const GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const GROQ_VISION_MODEL = 'qwen/qwen3.6-27b';
export const OPENROUTER_VISION_MODEL = 'google/gemma-4-31b-it:free';

const pinModel = (key: string, model: string): string => {
  if (loadFromStorage(key, '') !== model) localStorage.setItem(key, JSON.stringify(model));
  return model;
};
// Wczytuje trwałą pamięć produktów; jeśli jest pusta, jednorazowo zasila ją
// istniejącym dziennikiem (żeby dotychczasowi użytkownicy nie zaczynali od zera).
const loadRecentProducts = (): RecentProduct[] => {
  const stored = loadFromStorage<RecentProduct[]>('recentProducts', []);
  if (stored.length > 0) return stored;
  const diary = loadFromStorage<FoodEntry[]>('foodDiary', []);
  if (diary.length === 0) return [];
  const ts = (id: string) => { const m = id.match(/(\d{10,})/); return m ? Number(m[1]) : 0; };
  const sorted = [...diary].sort((a, b) => ts(b.id) - ts(a.id));
  const seen = new Set<string>();
  const seeded: RecentProduct[] = [];
  for (const e of sorted) {
    const key = e.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    seeded.push({
      name: e.name, calories: e.calories, protein: e.protein, carbs: e.carbs, fat: e.fat,
      amount: e.amount, unit: e.unit, lastUsed: ts(e.id) || Date.now(), count: 1,
    });
    if (seeded.length >= 200) break;
  }
  localStorage.setItem('recentProducts', JSON.stringify(seeded));
  return seeded;
};

const loadGeminiModel = () => pinModel('geminiModel', GEMINI_MODEL);
const loadGroqModel = () => pinModel('groqModel', GROQ_VISION_MODEL);
const loadOpenrouterModel = () => pinModel('openrouterModel', OPENROUTER_VISION_MODEL);

/**
 * Merge stored recipes with SAMPLE_RECIPES:
 * - keeps all user-created recipes (isCustom: true)
 * - replaces/adds every sample recipe by id (so new samples always appear)
 */
function mergeWithSamples(stored: Recipe[]): Recipe[] {
  const customRecipes = stored.filter(r => r.isCustom === true);
  const merged = [...SAMPLE_RECIPES, ...customRecipes];
  // persist merged list so next load is clean
  try { localStorage.setItem('myRecipes', JSON.stringify(merged)); } catch { /* ignore */ }
  return merged;
}

const _stored = loadFromStorage<Recipe[]>('myRecipes', []);
const _initialRecipes = _stored.length === 0
  ? SAMPLE_RECIPES
  : mergeWithSamples(_stored);

const DEFAULT_PROFILE: UserProfile = {
  age: 0, gender: '', height: 0, weight: 0,
  activityLevel: 'moderate', weightGoal: 'maintain',
};

export const useAppStore = create<AppState>((set, get) => ({
  activeView: 'home',
  previousView: 'home',
  selectedRecipe: null,
  myRecipes: _initialRecipes,
  foodDiary: loadFromStorage('foodDiary', []),
  recentProducts: loadRecentProducts(),
  myProducts: loadFromStorage<UserProduct[]>('myProducts', []),
  dailyGoal: loadFromStorage('dailyGoal', 2000),
  proteinGoal: loadFromStorage('proteinGoal', 60),
  carbsGoal: loadFromStorage('carbsGoal', 250),
  fatGoal: loadFromStorage('fatGoal', 65),
  geminiApiKey: loadFromStorage('geminiApiKey', ''),
  geminiModel: loadGeminiModel(),
  aiProvider: loadFromStorage('aiProvider', 'gemini'),
  groqApiKey: loadFromStorage('groqApiKey', ''),
  groqModel: loadGroqModel(),
  openrouterApiKey: loadFromStorage('openrouterApiKey', ''),
  openrouterModel: loadOpenrouterModel(),
  spoonacularApiKey: loadFromStorage('spoonacularApiKey', ''),
  pendingSearchQuery: '',
  pendingSearchTab: '',
  userProfile: loadFromStorage('userProfile', DEFAULT_PROFILE),
  waterGoal: loadFromStorage('waterGoal', 2000),
  waterLog: loadFromStorage('waterLog', []),
  weightLog: loadFromStorage('weightLog', []),
  targetWeight: loadFromStorage('targetWeight', 0),
  mealPlan: loadFromStorage('mealPlan', {}),
  mealPlanText: loadFromStorage('mealPlanText', {}),
  activityLog: loadFromStorage('activityLog', []),
  favoriteIds: loadFromStorage('favoriteIds', []),
  darkMode: loadFromStorage('darkMode', false),
  onboardingDone: loadFromStorage('onboardingDone', false),

  setActiveView: (view) =>
    set((state) =>
      view === state.activeView
        ? { activeView: view }
        : { activeView: view, previousView: state.activeView }
    ),
  setDarkMode: (dark) => {
    localStorage.setItem('darkMode', JSON.stringify(dark));
    set({ darkMode: dark });
  },
  setOnboardingDone: (done) => {
    localStorage.setItem('onboardingDone', JSON.stringify(done));
    set({ onboardingDone: done });
  },
  setPendingSearchQuery: (q, tab) => set({ pendingSearchQuery: q, pendingSearchTab: tab ?? '' }),
  setSelectedRecipe: (recipe) => set({ selectedRecipe: recipe }),

  addMyRecipe: (recipe) =>
    set((state) => {
      const updated = [...state.myRecipes, recipe];
      localStorage.setItem('myRecipes', JSON.stringify(updated));
      return { myRecipes: updated };
    }),

  updateMyRecipe: (recipe) =>
    set((state) => {
      const exists = state.myRecipes.some((r) => r.id === recipe.id);
      const updated = exists
        ? state.myRecipes.map((r) => (r.id === recipe.id ? recipe : r))
        : [...state.myRecipes, recipe];
      localStorage.setItem('myRecipes', JSON.stringify(updated));
      return { myRecipes: updated, selectedRecipe: recipe };
    }),

  removeMyRecipe: (id) =>
    set((state) => {
      const updated = state.myRecipes.filter((r) => r.id !== id);
      localStorage.setItem('myRecipes', JSON.stringify(updated));
      return { myRecipes: updated };
    }),

  // Zapisuje własny produkt na stałe. Jeśli podano kod kreskowy, a produkt
  // o tym kodzie już istnieje — aktualizuje go zamiast tworzyć duplikat.
  addMyProduct: (p) => {
    const state = get();
    const existing = p.barcode
      ? state.myProducts.find((x) => x.barcode && x.barcode === p.barcode)
      : state.myProducts.find((x) => x.name.trim().toLowerCase() === p.name.trim().toLowerCase());
    const saved: UserProduct = existing
      ? { ...existing, ...p }
      : { ...p, id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
    const updated = existing
      ? state.myProducts.map((x) => (x.id === existing.id ? saved : x))
      : [saved, ...state.myProducts].slice(0, 500);
    localStorage.setItem('myProducts', JSON.stringify(updated));
    set({ myProducts: updated });
    return saved;
  },

  removeMyProduct: (id) =>
    set((state) => {
      const updated = state.myProducts.filter((p) => p.id !== id);
      localStorage.setItem('myProducts', JSON.stringify(updated));
      return { myProducts: updated };
    }),

  addFoodEntry: (entry) =>
    set((state) => {
      const updated = [...state.foodDiary, entry];
      localStorage.setItem('foodDiary', JSON.stringify(updated));

      // Zapamiętaj produkt na stałe (dedup po nazwie, najnowszy na górze, limit 200).
      const key = entry.name.trim().toLowerCase();
      const prev = state.recentProducts.find((p) => p.name.trim().toLowerCase() === key);
      const rest = state.recentProducts.filter((p) => p.name.trim().toLowerCase() !== key);
      const recent: RecentProduct[] = [
        {
          name: entry.name,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          amount: entry.amount,
          unit: entry.unit,
          lastUsed: Date.now(),
          count: (prev?.count ?? 0) + 1,
        },
        ...rest,
      ].slice(0, 200);
      localStorage.setItem('recentProducts', JSON.stringify(recent));

      return { foodDiary: updated, recentProducts: recent };
    }),

  removeFoodEntry: (id) =>
    set((state) => {
      const updated = state.foodDiary.filter((e) => e.id !== id);
      localStorage.setItem('foodDiary', JSON.stringify(updated));
      return { foodDiary: updated };
    }),

  // Usuwa wpisy z dziennika starsze niż `daysOld` dni (licząc od dzisiaj). Zwraca liczbę usuniętych wpisów.
  removeOldFoodEntries: (daysOld) => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - daysOld);
    const cutoffStr = toLocalISO(cutoff);

    let removedCount = 0;
    set((state) => {
      const updated = state.foodDiary.filter((e) => {
        const keep = e.date >= cutoffStr;
        if (!keep) removedCount++;
        return keep;
      });
      localStorage.setItem('foodDiary', JSON.stringify(updated));
      return { foodDiary: updated };
    });
    return removedCount;
  },

  setDailyGoal: (goal) => {
    localStorage.setItem('dailyGoal', JSON.stringify(goal));
    set({ dailyGoal: goal });
  },

  setProteinGoal: (goal) => {
    localStorage.setItem('proteinGoal', JSON.stringify(goal));
    set({ proteinGoal: goal });
  },

  setCarbsGoal: (goal) => {
    localStorage.setItem('carbsGoal', JSON.stringify(goal));
    set({ carbsGoal: goal });
  },

  setFatGoal: (goal) => {
    localStorage.setItem('fatGoal', JSON.stringify(goal));
    set({ fatGoal: goal });
  },

  setGeminiApiKey: (key) => {
    localStorage.setItem('geminiApiKey', JSON.stringify(key));
    set({ geminiApiKey: key });
  },

  setGeminiModel: (model) => {
    localStorage.setItem('geminiModel', JSON.stringify(model));
    set({ geminiModel: model });
  },
  setAiProvider: (p) => {
    localStorage.setItem('aiProvider', JSON.stringify(p));
    set({ aiProvider: p });
  },
  setGroqApiKey: (key) => {
    localStorage.setItem('groqApiKey', JSON.stringify(key));
    set({ groqApiKey: key });
  },
  setGroqModel: (model) => {
    localStorage.setItem('groqModel', JSON.stringify(model));
    set({ groqModel: model });
  },
  setOpenrouterApiKey: (key) => {
    localStorage.setItem('openrouterApiKey', JSON.stringify(key));
    set({ openrouterApiKey: key });
  },
  setOpenrouterModel: (model) => {
    localStorage.setItem('openrouterModel', JSON.stringify(model));
    set({ openrouterModel: model });
  },
  setSpoonacularApiKey: (key) => {
    localStorage.setItem('spoonacularApiKey', JSON.stringify(key));
    set({ spoonacularApiKey: key });
  },

  setUserProfile: (profile) => {
    localStorage.setItem('userProfile', JSON.stringify(profile));
    set({ userProfile: profile });
  },
  setWaterGoal: (ml) => {
    localStorage.setItem('waterGoal', JSON.stringify(ml));
    set({ waterGoal: ml });
  },
  addWaterEntry: (entry) =>
    set((state) => {
      const updated = [...state.waterLog, entry];
      localStorage.setItem('waterLog', JSON.stringify(updated));
      return { waterLog: updated };
    }),
  clearWaterToday: (date) =>
    set((state) => {
      const updated = state.waterLog.filter((e) => e.date !== date);
      localStorage.setItem('waterLog', JSON.stringify(updated));
      return { waterLog: updated };
    }),
  addWeightEntry: (entry) =>
    set((state) => {
      const filtered = state.weightLog.filter((e) => e.date !== entry.date);
      const updated = [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem('weightLog', JSON.stringify(updated));
      return { weightLog: updated };
    }),
  removeWeightEntry: (date) =>
    set((state) => {
      const updated = state.weightLog.filter((e) => e.date !== date);
      localStorage.setItem('weightLog', JSON.stringify(updated));
      return { weightLog: updated };
    }),
  setTargetWeight: (w) => {
    localStorage.setItem('targetWeight', JSON.stringify(w));
    set({ targetWeight: w });
  },
  setMealSlot: (date, slot, recipeId) =>
    set((state) => {
      const day = { ...(state.mealPlan[date] ?? {}) };
      if (recipeId === undefined) delete day[slot];
      else day[slot] = recipeId;
      const updated = { ...state.mealPlan, [date]: day };
      localStorage.setItem('mealPlan', JSON.stringify(updated));
      return { mealPlan: updated };
    }),
  setMealTextSlot: (date, slot, meal) =>
    set((state) => {
      const day = { ...(state.mealPlanText[date] ?? {}) };
      if (meal === undefined) delete day[slot];
      else day[slot] = meal;
      const updated = { ...state.mealPlanText };
      if (Object.keys(day).length) updated[date] = day;
      else delete updated[date];
      localStorage.setItem('mealPlanText', JSON.stringify(updated));
      return { mealPlanText: updated };
    }),
  toggleFavorite: (id) =>
    set((state) => {
      const updated = state.favoriteIds.includes(id)
        ? state.favoriteIds.filter((f) => f !== id)
        : [...state.favoriteIds, id];
      localStorage.setItem('favoriteIds', JSON.stringify(updated));
      return { favoriteIds: updated };
    }),
  addActivityEntry: (entry) =>
    set((state) => {
      const updated = [...state.activityLog, entry];
      localStorage.setItem('activityLog', JSON.stringify(updated));
      return { activityLog: updated };
    }),
  removeActivityEntry: (id) =>
    set((state) => {
      const updated = state.activityLog.filter((e) => e.id !== id);
      localStorage.setItem('activityLog', JSON.stringify(updated));
      return { activityLog: updated };
    }),
}));

// Zwraca klucz i model aktywnego dostawcy AI. Dzięki temu widoki nie muszą
// powtarzać warunków dla każdego dostawcy (i nie trzeba ich poprawiać przy
// dodaniu kolejnego).
export function activeAI(s: {
  aiProvider: AiProvider;
  groqApiKey: string; groqModel: string;
  geminiApiKey: string; geminiModel: string;
  openrouterApiKey: string; openrouterModel: string;
}): { provider: AiProvider; apiKey: string; model: string; label: string } {
  if (s.aiProvider === 'gemini') {
    return { provider: 'gemini', apiKey: s.geminiApiKey, model: s.geminiModel, label: 'Gemini' };
  }
  if (s.aiProvider === 'openrouter') {
    return { provider: 'openrouter', apiKey: s.openrouterApiKey, model: s.openrouterModel, label: 'OpenRouter' };
  }
  return { provider: 'groq', apiKey: s.groqApiKey, model: s.groqModel, label: 'Groq' };
}
