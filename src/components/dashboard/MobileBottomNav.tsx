import { Wallet, BarChart3, CalendarClock, Calculator, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  savingsEnabled?: boolean;
}

const allTabs = [
  { id: 'transactions', label: 'Trans', icon: Wallet },
  { id: 'recurring', label: 'Repeat', icon: CalendarClock },
  { id: 'savings', label: 'Savings', icon: PiggyBank },
  { id: 'analytics', label: 'Stats', icon: BarChart3 },
  { id: 'calculations', label: 'Tax', icon: Calculator },
];

export function MobileBottomNav({ activeTab, onTabChange, savingsEnabled = false }: MobileBottomNavProps) {
  const tabs = useMemo(
    () => allTabs.filter(tab => tab.id !== 'savings' || savingsEnabled),
    [savingsEnabled]
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5 mb-1', isActive && 'scale-110')} />
              <span className={cn(
                'text-[10px] font-medium',
                isActive && 'font-semibold'
              )}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
