'use client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPWA() {
  const { toast, dismiss } = useToast();
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later.
      const promptEvent = event as BeforeInstall_promptEvent;
      setInstallPromptEvent(promptEvent);

      // Show the toast prompt
      const { id } = toast({
        title: 'Install AgriFinance App',
        description: 'Add the app to your home screen for offline access and a better experience.',
        duration: 15000, // Give user some time to decide
        action: (
          <Button onClick={async () => {
              if (!promptEvent) return;
              // Show the install prompt
              promptEvent.prompt();
              // Wait for the user to respond to the prompt
              await promptEvent.userChoice;
              // We've used the prompt, so we can't use it again
              setInstallPromptEvent(null);
              // Dismiss the toast
              dismiss(id);
          }}>
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
  }, [toast, dismiss]);

  return null; 
}
