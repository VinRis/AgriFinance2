'use client';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/contexts/app-context';
import { Bird, Milk, SettingsIcon, CalendarDays } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { format } from 'date-fns';

export function Header() {
    const pathname = usePathname();
    const { settings, isHydrated } = useAppContext();
    const [lastSelectedType] = useLocalStorage<string>('last-livestock-type', 'dairy');
    const segments = pathname.split('/');
    let livestockType: string | null = segments.includes('dairy') ? 'dairy' : segments.includes('poultry') ? 'poultry' : null;
    
    if (pathname.includes('/settings') || pathname.includes('/tasks')) {
        livestockType = lastSelectedType;
    }

    let title = '';
    if(pathname.includes('dashboard')) title = 'Dashboard';
    else if(pathname.includes('records')) title = 'Records';
    else if(pathname.includes('reports')) title = 'Reports';
    else if(pathname.includes('settings')) title = 'Settings';
    else if(pathname.includes('tasks')) title = 'Schedule';


    if (!livestockType && !pathname.includes('settings') && !pathname.includes('tasks')) return null;

    const getIcon = () => {
      if (pathname.includes('/tasks')) return CalendarDays;
      if (pathname.includes('/settings')) return SettingsIcon;
      if (livestockType === 'dairy') return Milk;
      if (livestockType === 'poultry') return Bird;
      return SettingsIcon;
    }

    const EnterpriseIcon = getIcon();

    const getEnterpriseName = () => {
        if(pathname.includes('/tasks')) return null;
        if(pathname.includes('/settings')) return null;
        return livestockType === 'dairy' ? 'Dairy' : 'Poultry';
    }
    const enterpriseName = getEnterpriseName();

    const renderTitle = () => {
      if (pathname.includes('/tasks')) {
        return <h1 className="text-xl font-bold md:text-2xl">{format(new Date(), 'MMMM yyyy')}</h1>;
      }
      return (
        <h1 className="text-lg font-semibold md:text-xl">
          {isHydrated ? settings.farmName : '...'} {enterpriseName && `- ${enterpriseName}`}
        </h1>
      );
    }
    
    const renderHeaderContent = () => {
       if (pathname.includes('/tasks')) {
         return (
             <div className="flex w-full items-center justify-between">
                {renderTitle()}
                <div className="flex items-center gap-2">
                    {/* Add Filter and Calendar icons here if needed */}
                </div>
            </div>
         )
       }
       return (
           <>
              <div className="flex items-center gap-2">
                  <EnterpriseIcon className="h-6 w-6 text-primary" />
                  {renderTitle()}
              </div>
              {title && <div className="hidden md:block ml-auto text-lg font-semibold">{title}</div>}
           </>
       )
    }

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 md:px-6 no-print">
          {renderHeaderContent()}
      </header>
    );
}
