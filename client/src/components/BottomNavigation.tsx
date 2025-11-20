import { Home, Clock, Book, Settings } from "lucide-react";

interface BottomNavigationProps {
  activeTab: 'home' | 'history' | 'instructions' | 'settings';
  onTabChange: (tab: 'home' | 'history' | 'instructions' | 'settings') => void;
  unreadCount?: number;
}

export default function BottomNavigation({ activeTab, onTabChange, unreadCount = 0 }: BottomNavigationProps) {
  const tabs = [
    { id: 'home' as const, label: "Главная", icon: Home },
    { id: 'history' as const, label: "История", icon: Clock },
    { id: 'instructions' as const, label: "Инструкции", icon: Book },
    { id: 'settings' as const, label: "Настройки", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#FFFFFF] border-t border-border shadow-soft z-50">
      <div className="max-w-md mx-auto">
        <div className="grid grid-cols-4 h-20 safe-area-inset-bottom">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`
                  flex flex-col items-center justify-center gap-1 h-full cursor-pointer
                  transition-colors relative
                  ${isActive 
                    ? 'text-[#0B3D4A]' 
                    : 'text-[#9AA0A8] hover:text-[#0B3D4A]'
                  }
                `}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className={`text-xs ${isActive ? 'font-semibold' : 'font-normal'}`}>
                  {label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 w-8 h-1 bg-[#4AB7A5] rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
