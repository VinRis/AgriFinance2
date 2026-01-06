'use client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

// Define the event type, as it's not a standard part of the Window object in TS
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPWA() {
  const { toast } = useToast();
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPromptEvent(event as BeforeInstallPromptEvent);

      // Show the toast notification
      toast({
        title: 'Install AgriFinance Pro',
        description: 'Add the app to your home screen for easy access.',
        duration: 10000, // Keep it open a bit longer
        action: (
          <Button onClick={handleInstallClick}>
            <Download className="mr-2 h-4 w-4" />
            Install
          </Button>
        ),
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      return;
    }

    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
    } else {
      console.log('User dismissed the A2HS prompt');
    }
    // We can only use the prompt once.
    setInstallPromptEvent(null);
  };

  return null; // This component doesn't render anything itself
}
