'use client';
import { useEffect, useState } from 'react';
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
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      return;
    }

    // Show the browser's native installation prompt
    installPromptEvent.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPromptEvent.userChoice;
    
    // We can only use the prompt once.
    setInstallPromptEvent(null);

    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
    } else {
      console.log('User dismissed the A2HS prompt');
    }
  };

  // Render the install button only if the event has been captured
  if (!installPromptEvent) {
    return null;
  }

  return (
    <Button
        onClick={handleInstallClick}
        className="fixed bottom-24 right-6 h-12 rounded-full shadow-lg z-30 no-print"
        size="lg"
    >
        <Download className="mr-2 h-4 w-4" />
        Install App
    </Button>
  );
}
