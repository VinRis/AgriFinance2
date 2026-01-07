'use client';
import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Download, Upload, Lightbulb, Cloud, LogIn, AlertTriangle } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AgriTransaction, AppSettings, FarmTask } from '@/lib/types';
import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { differenceInDays, parseISO } from 'date-fns';

type AppState = {
  transactions: AgriTransaction[];
  settings: AppSettings;
  tasks: FarmTask[];
}

const farmTips = [
    "Regularly check your livestock for signs of illness to ensure a healthy herd.",
    "Crop rotation can improve soil health and reduce pest and disease problems.",
    "Proper water management is crucial. Ensure clean water is always available for your animals.",
    "Keep detailed records of breeding, births, and health treatments for better farm management.",
    "A balanced diet is key to the productivity of your livestock. Consult a nutritionist for the best feed formula.",
    "Diversifying your farm with different types of crops or livestock can reduce financial risk.",
    "Utilize manure as a natural fertilizer to enrich your soil and reduce waste.",
    "Implement biosecurity measures to prevent the spread of diseases on your farm.",
    "Vaccination schedules are vital for preventing common diseases in your livestock.",
    "Provide adequate shelter to protect your animals from extreme weather conditions."
];

export default function LivestockSelectionPage() {
  const dairyImage = PlaceHolderImages.find((img) => img.id === 'dairy-selection');
  const poultryImage = PlaceHolderImages.find((img) => img.id === 'poultry-selection');

  const { transactions, settings, tasks, dispatch } = useAppContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [randomTip, setRandomTip] = useState('');
  const [lastBackupDate, setLastBackupDate] = useLocalStorage<string | null>('last-backup-date', null);
  const [showBackupReminder, setShowBackupReminder] = useState(false);


  useEffect(() => {
    // Select a random tip only on the client side to avoid hydration mismatch
    const randomIndex = Math.floor(Math.random() * farmTips.length);
    setRandomTip(farmTips[randomIndex]);

    if (lastBackupDate) {
      const daysSinceLastBackup = differenceInDays(new Date(), parseISO(lastBackupDate));
      if (daysSinceLastBackup > 7) {
        setShowBackupReminder(true);
      }
    } else {
      // If there's no backup date, show the reminder
      setShowBackupReminder(true);
    }

  }, [lastBackupDate]);

  const handleBackup = () => {
    const appState = { transactions, settings, tasks };
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const today = new Date().toISOString().split('T')[0];
    link.download = `agrifinance-backup-${today}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Backup Successful', description: 'Your data has been downloaded.' });
    setLastBackupDate(new Date().toISOString());
    setShowBackupReminder(false);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
            throw new Error("File content is not readable text.");
        }

        const parsedData = JSON.parse(text);

        // Migration logic for backwards compatibility
        const restoredState: Partial<AppState> = {
          transactions: parsedData.transactions || [],
          settings: parsedData.settings || {},
          tasks: parsedData.tasks || [], // If 'tasks' is missing, it defaults to an empty array.
        };

        // Basic validation after migration
        if (Array.isArray(restoredState.transactions) && restoredState.settings && Array.isArray(restoredState.tasks)) {
          dispatch({ type: 'SET_STATE', payload: restoredState });
          toast({ title: 'Restore Successful', description: 'Your data has been restored.' });
        } else {
          throw new Error('File is not a valid backup. It might be corrupted.');
        }
      } catch (error: any) {
        console.error("Restore failed:", error);
        toast({
          variant: 'destructive',
          title: 'Restore Failed',
          description: error.message || 'The selected file is not a valid backup.',
        });
      }
    };
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };


  const selectionOptions = [
    {
      type: 'Dairy',
      href: '/dashboard/dairy',
      image: dairyImage,
      description: 'Manage finances for your dairy cows and milk production.',
    },
    {
      type: 'Poultry',
      href: '/dashboard/poultry',
      image: poultryImage,
      description: 'Track expenses and income for your egg-laying flock.',
    },
  ];

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/50 p-4 sm:p-6">
      <div className="w-full max-w-4xl text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl">
          Welcome to Agri Finance
        </h1>
        <p className="mt-4 text-lg text-foreground/80 sm:text-xl">
          Your all-in-one solution for livestock financial management.
        </p>
        <p className="mt-8 font-headline text-2xl font-semibold text-foreground">
          Select your enterprise to begin
        </p>
      </div>
      <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
        {selectionOptions.map((option) => (
          <Link href={option.href} key={option.type}>
            <Card className="group transform-gpu overflow-hidden border-2 border-transparent transition-all duration-300 ease-in-out hover:border-primary hover:shadow-lg hover:scale-105">
               {/* Desktop View Card */}
              <CardContent className="relative hidden p-0 md:block">
                {option.image && (
                  <Image
                    src={option.image.imageUrl}
                    alt={option.image.description}
                    width={600}
                    height={400}
                    className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    data-ai-hint={option.image.imageHint}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 w-full p-6">
                  <h2 className="font-headline text-3xl font-bold text-white">{option.type}</h2>
                  <p className="mt-1 text-white/90">{option.description}</p>
                  <div className="mt-4 flex items-center text-accent">
                    <span className="font-semibold">Get Started</span>
                    <ArrowRight className="ml-2 h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </CardContent>

              {/* Mobile View Card */}
               <CardContent className="flex items-center gap-4 p-4 md:hidden">
                 {option.image && (
                    <Image
                      src={option.image.imageUrl}
                      alt={option.image.description}
                      width={100}
                      height={100}
                      className="h-20 w-20 rounded-lg object-cover"
                      data-ai-hint={option.image.imageHint}
                    />
                  )}
                  <div className="flex-1">
                      <h2 className="font-headline text-xl font-bold text-foreground">{option.type}</h2>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
               </CardContent>
            </Card>
          </Link>
        ))}
      </div>
       <div className="mt-8 grid w-full max-w-3xl gap-6">
         <Card>
           <CardContent className="flex flex-col gap-4 p-4">
              <div className="flex items-start gap-4 rounded-lg border p-4 bg-background/80">
                  <Lightbulb className="h-6 w-6 flex-shrink-0 text-primary" />
                  <div>
                      <h4 className="font-semibold">Farm Tip</h4>
                      <p className="text-sm text-foreground/90">
                        {randomTip ? randomTip : 'Loading a helpful tip...'}
                      </p>
                  </div>
              </div>
            
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border p-4 bg-background/80">
                {showBackupReminder && (
                  <div className="flex items-center gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20 p-3 text-yellow-700 dark:text-yellow-300 w-full">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <div className="text-sm font-medium">
                      <p>Remember to back up your data weekly to prevent any loss.</p>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-4 sm:flex-row">
                    <Button onClick={handleBackup}>
                        <Download className="mr-2 h-4 w-4" />
                        Backup Data
                    </Button>
                    <Button onClick={handleRestoreClick} variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Restore Data
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="application/json"
                        className="hidden"
                    />
                </div>
                 <Dialog>
                    <DialogTrigger asChild>
                        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                           <Button>
                               <LogIn className="mr-2 h-4 w-4" />
                               Login to Sync
                           </Button>
                           <p className="text-xs text-muted-foreground text-center mt-2">
                               Sync your data across multiple devices.
                           </p>
                        </div>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Coming Soon!</DialogTitle>
                            <DialogDescription>
                                We are working hard to bring you cloud synchronization. This feature will allow you to access your farm data from any device, anywhere. Stay tuned for updates!
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button>OK</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-12 text-center text-sm text-muted-foreground">
        Made with 🩷 by KPF
      </div>
    </main>
  );
}
