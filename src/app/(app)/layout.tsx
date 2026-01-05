'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { NavLinks } from '@/components/layout/nav-links';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RecordForm } from './records/[livestockType]/record-form';
import { TaskForm } from './tasks/task-form';
import { LivestockType } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isFormOpen, setFormOpen] = useState(false);
  const segments = pathname.split('/');
  const [lastSelectedType] = useLocalStorage<string>('last-livestock-type', 'dairy');
  
  const pathLivestockType = segments.includes('dairy') ? 'dairy' : segments.includes('poultry') ? 'poultry' : null;
  const livestockType = (pathLivestockType || lastSelectedType) as LivestockType;

  const handleFabClick = () => {
    setFormOpen(true);
  };

  const isRecordsPage = pathname.includes('/records');
  const isTasksPage = pathname.includes('/tasks');
  const isReportsPage = pathname.includes('/reports');

  const renderForm = () => {
    if (isTasksPage) {
        return <TaskForm isOpen={isFormOpen} onClose={() => setFormOpen(false)} />
    }
    if (isRecordsPage) {
        return <RecordForm livestockType={livestockType} isOpen={isFormOpen} onClose={() => setFormOpen(false)} />
    }
    return null;
  }
  
  // Reports page now wraps its own content in <main>, so we exclude it from the default main wrapper here.
  if (isReportsPage) {
    return (
       <div className="flex min-h-screen w-full flex-col bg-muted/40">
          <Header />
          <div className="flex flex-col sm:gap-4 flex-grow">
            {children}
          </div>
          <NavLinks />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Header />
      <div className="flex flex-col sm:gap-4 flex-grow">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3 mb-20">
          {children}
        </main>
      </div>
      <NavLinks />
      {(isRecordsPage || isTasksPage) && (
         <>
            <Button
              onClick={handleFabClick}
              className="fixed bottom-20 right-6 h-16 w-16 rounded-full shadow-lg z-20 no-print"
              size="icon"
            >
              <Plus className="h-8 w-8" />
              <span className="sr-only">Add New</span>
            </Button>
            {renderForm()}
         </>
      )}
    </div>
  );
}
