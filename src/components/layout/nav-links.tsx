'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookCopy, FileText, LayoutDashboard, Settings, Home } from 'lucide-react';
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
      label: 'Records',
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
    if (href.includes('records')) return pathname.includes('records');
    if (href.includes('reports')) return pathname.includes('reports');
    if (href.includes('settings')) return pathname.includes('settings');
    return pathname === href;
  };
  
  return (
    <>
      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background p-2 no-print">
        <div className="mx-auto grid max-w-2xl grid-cols-5 items-center justify-items-center gap-2">
            <Link
                href="/"
                className='flex flex-col items-center justify-center text-muted-foreground'
            >
                <Home className="h-6 w-6" />
                <span className="text-xs">Home</span>
            </Link>
          {navItems.map((item) => (
            <Link
              href={item.href}
              key={item.label}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground',
                isNavItemActive(item.href) ? 'text-primary' : ''
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
