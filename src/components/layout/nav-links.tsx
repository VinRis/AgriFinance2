'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookCopy, FileText, LayoutDashboard, Milk, Settings, Bird } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

export function NavLinks() {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const livestockType = segments.includes('dairy') ? 'dairy' : segments.includes('poultry') ? 'poultry' : null;

  if (!livestockType) return null;

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

  const enterpriseIcon = livestockType === 'dairy' ? Milk : Bird;

  const isNavItemActive = (href: string) => {
    if (href.includes('dashboard')) return pathname.includes('dashboard');
    if (href.includes('records')) return pathname.includes('records');
    if (href.includes('reports')) return pathname.includes('reports');
    return pathname === href;
  };
  
  return (
    <>
      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background p-2 no-print">
        <div className="mx-auto grid max-w-2xl grid-cols-6 items-center justify-items-center gap-2">
            <Link
                href="/"
                className='flex flex-col items-center justify-center text-muted-foreground'
            >
                <enterpriseIcon className="h-6 w-6" />
                <span className="text-xs">{livestockType === 'dairy' ? 'Dairy' : 'Poultry'}</span>
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
           <div className='flex flex-col items-center justify-center'>
             <ThemeToggle />
             <span className="mt-1 text-xs font-medium">Theme</span>
           </div>
        </div>
      </div>
    </>
  );
}
