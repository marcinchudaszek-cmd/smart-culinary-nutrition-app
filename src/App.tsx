import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Camera } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import BottomNav from './components/BottomNav';
import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import MyRecipesView from './views/MyRecipesView';
import AddRecipeView from './views/AddRecipeView';
import CaloriesView from './views/CaloriesView';
import ScannerView from './views/ScannerView';
import RecipeDetailView from './views/RecipeDetailView';
import SettingsView from './views/SettingsView';
import ProgressView from './views/ProgressView';
import MealPlanView from './views/MealPlanView';
import DietChatView from './views/DietChatView';
import FitnessView from './views/FitnessView';
import OnboardingView from './views/OnboardingView';
import PhotoCalorieScanner from './components/PhotoCalorieScanner';

export default function App() {
  const { activeView, darkMode, onboardingDone } = useAppStore();
  const [showGlobalScanner, setShowGlobalScanner] = useState(false);

  const renderView = () => {
    switch (activeView) {
      case 'home':         return <HomeView />;
      case 'search':       return <SearchView />;
      case 'my-recipes':   return <MyRecipesView />;
      case 'add-recipe':   return <AddRecipeView />;
      case 'calories':     return <CaloriesView />;
      case 'scanner':      return <ScannerView />;
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
      <div className={`max-w-lg mx-auto min-h-screen relative overflow-hidden${darkMode ? ' dark' : ''}`}>
        <OnboardingView />
      </div>
    );
  }

  return (
    <div className={`max-w-lg mx-auto min-h-screen relative overflow-hidden bg-gray-50 dark:bg-gray-900${darkMode ? ' dark' : ''}`}>
      <div className="overflow-y-auto h-screen">
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
            className="fixed bottom-[68px] right-4 z-50 w-13 h-13 bg-orange-500 hover:bg-orange-600 active:scale-90 text-white rounded-full shadow-lg shadow-orange-500/40 flex items-center justify-center transition-all duration-200"
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
