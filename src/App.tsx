import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Camera } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAppStore, recipeBackTarget, type ActiveView } from './store/useAppStore';
import { closeTopOverlay } from './lib/backButton';
import { resyncRemindersOnStart } from './lib/notifications';
import BottomNav from './components/BottomNav';
import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import MyRecipesView from './views/MyRecipesView';
import AddRecipeView from './views/AddRecipeView';
import CaloriesView from './views/CaloriesView';
import RecipeDetailView from './views/RecipeDetailView';
import SettingsView from './views/SettingsView';
import ProgressView from './views/ProgressView';
import MealPlanView from './views/MealPlanView';
import DietChatView from './views/DietChatView';
import FitnessView from './views/FitnessView';
import OnboardingView from './views/OnboardingView';
import PhotoCalorieScanner from './components/PhotoCalorieScanner';

// Dokąd prowadzi systemowe „wstecz" z danego ekranu (null = wyjście z aplikacji).
function backTarget(): ActiveView | null {
  const s = useAppStore.getState();
  if (!s.onboardingDone) return null;
  switch (s.activeView) {
    case 'home':          return null;
    case 'recipe-detail': return recipeBackTarget(s.previousView);
    case 'add-recipe':    return s.selectedRecipe ? 'recipe-detail' : 'my-recipes';
    default:              return 'home';
  }
}

export default function App() {
  const { activeView, darkMode, onboardingDone } = useAppStore();
  const [showGlobalScanner, setShowGlobalScanner] = useState(false);

  // Przycisk „wstecz" Androida: najpierw zamyka otwarte okno, potem cofa ekran,
  // a dopiero na ekranie głównym wychodzi z aplikacji (wcześniej zawsze wychodził).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapApp.addListener('backButton', () => {
      if (closeTopOverlay()) return;
      const target = backTarget();
      if (target) useAppStore.getState().setActiveView(target);
      else void CapApp.exitApp();
    });
    void resyncRemindersOnStart();
    return () => { void sub.then((h) => h.remove()); };
  }, []);

  // Tło dokumentu pod widokiem (np. przy przewijaniu poza krawędź) zgodne z motywem.
  useEffect(() => {
    document.documentElement.style.background = darkMode ? '#111827' : '#f9fafb';
  }, [darkMode]);

  const renderView = () => {
    switch (activeView) {
      case 'home':         return <HomeView />;
      case 'search':       return <SearchView />;
      case 'my-recipes':   return <MyRecipesView />;
      case 'add-recipe':   return <AddRecipeView />;
      case 'calories':     return <CaloriesView />;
      case 'recipe-detail':return <RecipeDetailView />;
      case 'settings':     return <SettingsView />;
      case 'progress':     return <ProgressView />;
      case 'meal-plan':    return <MealPlanView />;
      case 'diet-chat':    return <DietChatView />;
      case 'fitness':      return <FitnessView />;
      default:             return <HomeView />;
    }
  };

  if (!onboardingDone) {
    return (
      <div className={`max-w-lg mx-auto min-h-dvh relative overflow-hidden${darkMode ? ' dark' : ''}`}>
        <OnboardingView />
      </div>
    );
  }

  return (
    <div className={`max-w-lg mx-auto min-h-dvh relative overflow-hidden bg-gray-50 dark:bg-gray-900${darkMode ? ' dark' : ''}`}>
      <div className="overflow-y-auto h-dvh pb-[var(--sa-bottom)]">
        {/* key forces remount on view change → triggers .view-enter animation */}
        <div key={activeView} className="view-enter">
          {renderView()}
        </div>
      </div>
      {activeView !== 'add-recipe' && activeView !== 'settings' && activeView !== 'diet-chat' && (
        <>
          <BottomNav />
          {/* Global floating camera / scanner button */}
          <button
            onClick={() => setShowGlobalScanner(true)}
            className="fixed bottom-[calc(68px+var(--sa-bottom))] right-4 z-50 w-13 h-13 bg-orange-500 hover:bg-orange-600 active:scale-90 text-white rounded-full shadow-lg shadow-orange-500/40 flex items-center justify-center transition-all duration-200"
            style={{ width: 52, height: 52 }}
            title="Skanuj posiłek"
          >
            <Camera size={22} />
          </button>
        </>
      )}

      {showGlobalScanner && (
        <PhotoCalorieScanner onClose={() => setShowGlobalScanner(false)} />
      )}

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: { primary: '#f97316', secondary: '#fff' },
          },
        }}
      />
    </div>
  );
}
