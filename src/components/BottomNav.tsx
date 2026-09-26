import React from 'react';
import { Home, Search, Flame, Dumbbell, CalendarDays, BookOpen } from 'lucide-react';
import { useAppStore, ActiveView } from '../store/useAppStore';

const navItems: { view: ActiveView; icon: React.ElementType; label: string }[] = [
  { view: 'home',       icon: Home,         label: 'Główna'  },
  { view: 'search',     icon: Search,       label: 'Przepisy' },
  { view: 'my-recipes', icon: BookOpen,     label: 'Moje'    },
  { view: 'calories',   icon: Flame,        label: 'Kalorie' },
  { view: 'meal-plan',  icon: CalendarDays, label: 'Plan'    },
  { view: 'fitness',    icon: Dumbbell,     label: 'Fitness' },
];

export default function BottomNav() {
  const { activeView, setActiveView } = useAppStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[var(--sa-bottom)] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map(({ view, icon: Icon, label }) => {
          const isActive = activeView === view || (activeView === 'recipe-detail' && view === 'search');
          return (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`flex flex-col items-center py-1.5 px-1 min-w-0 flex-1 transition-all duration-200 ${
                isActive
                  ? 'text-orange-500'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
              }`}
            >
              <Icon
                size={20}
                className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
              />
              <span className="text-[9px] mt-0.5 font-medium">{label}</span>
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-orange-500 rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
