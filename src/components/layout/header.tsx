'use client';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/contexts/app-context';
import { Bird, Milk, SettingsIcon } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function Header() {
    const pathname = usePathname();
    const { settings } = useAppContext();
    const [lastSelectedType] = useLocalStorage<string>('last-livestock-type', 'dairy');
    const segments = pathname.split('/');
    let livestockType = segments.includes('dairy') ? 'dairy' : segments.includes('poultry') ? 'poultry' : null;
    
    if (pathname.includes('/settings')) {
        livestockType = lastSelectedType;
    }

    let title = '';
    if(pathname.includes('dashboard')) title = 'Dashboard';
    else if(pathname.includes('records')) title = 'Records';
    else if(pathname.includes('reports')) title = 'Reports';
    else if(pathname.includes('settings')) title = 'Settings';


    if (!livestockType && !pathname.includes('settings')) return null;

    const EnterpriseIcon = livestockType === 'dairy' ? Milk : livestockType === 'poultry' ? Bird : SettingsIcon;
    const enterpriseName = livestockType === 'dairy' ? 'Dairy' : livestockType === 'poultry' ? 'Poultry' : 'General';

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 no-print">
            <div className="flex items-center gap-2">
                <EnterpriseIcon className="h-6 w-6 text-primary" />
                <h1 className="text-lg font-semibold md:text-xl">
                    {settings.farmName} {pathname.includes('settings') ? '' : `- ${enterpriseName}`}
                </h1>
            </div>
            {title && <div className="hidden md:block ml-auto text-lg font-semibold">{title}</div>}
      </header>
    );
}
