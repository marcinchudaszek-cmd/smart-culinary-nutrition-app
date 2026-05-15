import { Toaster } from 'react-hot-toast';
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

export default function App() {
  const { activeView } = useAppStore();

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView />;
      case 'search':
        return <SearchView />;
      case 'my-recipes':
        return <MyRecipesView />;
      case 'add-recipe':
        return <AddRecipeView />;
      case 'calories':
        return <CaloriesView />;
      case 'scanner':
        return <ScannerView />;
      case 'recipe-detail':
        return <RecipeDetailView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen relative bg-gray-50 overflow-hidden">
      <div className="overflow-y-auto h-screen">
        {renderView()}
      </div>
      {activeView !== 'add-recipe' && activeView !== 'settings' && <BottomNav />}
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
