import { create } from 'zustand';

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

export type ActiveView =
  | 'home'
  | 'search'
  | 'my-recipes'
  | 'add-recipe'
  | 'calories'
  | 'scanner'
  | 'recipe-detail'
  | 'settings';

interface AppState {
  activeView: ActiveView;
  selectedRecipe: Recipe | null;
  myRecipes: Recipe[];
  foodDiary: FoodEntry[];
  dailyGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  geminiApiKey: string;
  setActiveView: (view: ActiveView) => void;
  setSelectedRecipe: (recipe: Recipe | null) => void;
  addMyRecipe: (recipe: Recipe) => void;
  removeMyRecipe: (id: string) => void;
  addFoodEntry: (entry: FoodEntry) => void;
  removeFoodEntry: (id: string) => void;
  setDailyGoal: (goal: number) => void;
  setProteinGoal: (goal: number) => void;
  setCarbsGoal: (goal: number) => void;
  setFatGoal: (goal: number) => void;
  setGeminiApiKey: (key: string) => void;
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
    ],
    totalCalories: 1495,
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
    thumbnail: 'https://www.themealdb.com/images/media/meals/wvpvsu1468232990.jpg',
    ingredients: [
      { name: 'Pomidory', amount: '1kg', calories: 180 },
      { name: 'Śmietana', amount: '200ml', calories: 340 },
      { name: 'Kurczak', amount: '500g', calories: 825 },
      { name: 'Makaron', amount: '200g', calories: 312 },
    ],
    totalCalories: 1657,
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
    ],
    totalCalories: 2554,
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
    ],
    totalCalories: 2243,
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
    ],
    totalCalories: 1508,
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
    ],
    totalCalories: 1241,
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
    ],
    totalCalories: 2016,
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
    ],
    totalCalories: 1688,
    servings: 4,
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

export const useAppStore = create<AppState>((set) => ({
  activeView: 'home',
  selectedRecipe: null,
  myRecipes: loadFromStorage('myRecipes', SAMPLE_RECIPES),
  foodDiary: loadFromStorage('foodDiary', []),
  dailyGoal: loadFromStorage('dailyGoal', 2000),
  proteinGoal: loadFromStorage('proteinGoal', 60),
  carbsGoal: loadFromStorage('carbsGoal', 250),
  fatGoal: loadFromStorage('fatGoal', 65),
  geminiApiKey: loadFromStorage('geminiApiKey', ''),

  setActiveView: (view) => set({ activeView: view }),
  setSelectedRecipe: (recipe) => set({ selectedRecipe: recipe }),

  addMyRecipe: (recipe) =>
    set((state) => {
      const updated = [...state.myRecipes, recipe];
      localStorage.setItem('myRecipes', JSON.stringify(updated));
      return { myRecipes: updated };
    }),

  removeMyRecipe: (id) =>
    set((state) => {
      const updated = state.myRecipes.filter((r) => r.id !== id);
      localStorage.setItem('myRecipes', JSON.stringify(updated));
      return { myRecipes: updated };
    }),

  addFoodEntry: (entry) =>
    set((state) => {
      const updated = [...state.foodDiary, entry];
      localStorage.setItem('foodDiary', JSON.stringify(updated));
      return { foodDiary: updated };
    }),

  removeFoodEntry: (id) =>
    set((state) => {
      const updated = state.foodDiary.filter((e) => e.id !== id);
      localStorage.setItem('foodDiary', JSON.stringify(updated));
      return { foodDiary: updated };
    }),

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
}));
