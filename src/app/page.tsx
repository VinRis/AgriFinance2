'use client';
import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Download, Upload, Lightbulb } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AgriTransaction, AppSettings } from '@/lib/types';
import React, { useRef, useState, useEffect } from 'react';

type AppState = {
  transactions: AgriTransaction[];
  settings: AppSettings;
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

  const { transactions, settings, dispatch } = useAppContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [randomTip, setRandomTip] = useState('');

  useEffect(() => {
    // Select a random tip only on the client side to avoid hydration mismatch
    const randomIndex = Math.floor(Math.random() * farmTips.length);
    setRandomTip(farmTips[randomIndex]);
  }, []);


  const handleBackup = () => {
    const appState = { transactions, settings };
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agrifinance-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Backup Successful', description: 'Your data has been downloaded.' });
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

        const restoredState = JSON.parse(text) as AppState;

        // Basic validation
        if (restoredState.transactions && Array.isArray(restoredState.transactions) && restoredState.settings) {
          dispatch({ type: 'SET_STATE', payload: restoredState });
          toast({ title: 'Restore Successful', description: 'Your data has been restored.' });
        } else {
          throw new Error('Invalid backup file structure.');
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
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-4 sm:p-8">
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
      <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-8 md:grid-cols-2">
        {selectionOptions.map((option) => (
          <Link href={option.href} key={option.type}>
            <Card className="group transform-gpu overflow-hidden border-2 border-transparent transition-all duration-300 ease-in-out hover:border-primary hover:shadow-2xl hover:scale-105">
              <CardContent className="relative p-0">
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
            </Card>
          </Link>
        ))}
      </div>
       <div className="mt-12 grid w-full max-w-2xl gap-8">
        <Card>
            <CardHeader className="flex-row items-center gap-4 space-y-0 pb-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              <CardTitle>Farm Tip</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90">
                {randomTip ? `Did you know? ${randomTip}` : 'Loading a helpful tip...'}
              </p>
            </CardContent>
        </Card>
        <Card>
           <CardHeader>
              <CardTitle>Manage Your Data</CardTitle>
            </CardHeader>
          <CardContent className="flex flex-col gap-4">
             <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button onClick={handleBackup}>
                    <Download className="mr-2" />
                    Backup Data
                  </Button>
                  <Button onClick={handleRestoreClick} variant="outline">
                    <Upload className="mr-2" />
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
            </div>
            <p className="text-xs text-muted-foreground text-center">
                Keep a backup of your data at least once a week to avoid loss of data in case of changing or losing your phone.
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-12 text-center text-sm text-muted-foreground">
        Made with 🩷 by KPF
      </div>
    </main>
  );
}
