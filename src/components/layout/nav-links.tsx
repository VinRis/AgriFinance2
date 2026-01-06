'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookCopy, FileText, LayoutDashboard, Settings, Home, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useEffect } from 'react';

export function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();
  const segments = pathname.split('/');
  const [lastSelectedType, setLastSelectedType] = useLocalStorage<string>('last-livestock-type', 'dairy');
  
  const pathLivestockType = segments.includes('dairy') ? 'dairy' : segments.includes('poultry') ? 'poultry' : null;
  
  useEffect(() => {
    if (pathLivestockType) {
      setLastSelectedType(pathLivestockType);
    }
  }, [pathLivestockType, setLastSelectedType]);

  const livestockType = pathLivestockType || lastSelectedType;

  if (pathname === '/') return null;

  const navItems = [
    {
      href: `/dashboard/${livestockType}`,
      icon: LayoutDashboard,
      label: 'Dashboard',
    },
    {
      href: `/records/${livestockType}`,
      icon: BookCopy,
      label: 'Finances',
    },
    {
      href: `/tasks`,
      icon: CalendarDays,
      label: 'Schedule',
    },
    {
      href: `/reports/${livestockType}`,
      icon: FileText,
      label: 'Reports',
    },
    {
      href: `/settings`,
      icon: Settings,
      label: 'Settings',
    },
  ];

  const isNavItemActive = (href: string) => {
    if (href.includes('dashboard')) return pathname.includes('dashboard');
    if (href.includes('records')) return pathname.includes('records') || pathname.includes('reports');
    if (href.includes('tasks')) return pathname.includes('tasks');
    if (href.includes('settings')) return pathname.includes('settings');
    return pathname === href;
  };
  
  // Custom logic for finances to include records and reports
   const getFinanceHref = () => {
    const recordsPath = `/records/${livestockType}`;
    // If we are on reports, keep the nav link to reports, otherwise default to records
    return pathname.includes('/reports') ? `/reports/${livestockType}` : recordsPath;
   }
   
   const combinedNavItems = [
    {
      href: `/dashboard/${livestockType}`,
      icon: LayoutDashboard,
      label: 'Dashboard',
    },
     {
      href: `/tasks`,
      icon: CalendarDays,
      label: 'Schedule',
    },
    {
      href: getFinanceHref(),
      icon: BookCopy,
      label: 'Finances',
      isActive: pathname.includes('/records') || pathname.includes('/reports')
    },
    {
      href: `/settings`,
      icon: Settings,
      label: 'Settings',
    },
   ];
  
  return (
    <>
      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur-sm p-2 no-print">
        <div className="mx-auto grid max-w-2xl grid-cols-5 items-center justify-items-center gap-1">
            <Link
                href="/"
                className='flex flex-col items-center justify-center text-muted-foreground w-full gap-1 p-2'
            >
                <Home className="h-5 w-5" />
                <span className="text-xs">Home</span>
            </Link>
          {combinedNavItems.map((item) => (
            <Link
              href={item.href}
              key={item.label}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground w-full',
                 item.isActive || isNavItemActive(item.href) ? 'text-green-600 font-bold' : '',
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
