'use client';
import { NavLinks } from '@/components/layout/nav-links';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 flex-grow">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3 mb-20">
          {children}
        </main>
      </div>
       <NavLinks />
    </div>
  );
}
