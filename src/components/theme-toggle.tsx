
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (!isMounted) {
    return <div className="h-8 w-8" />;
  }

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme} className="h-8 w-8 relative overflow-hidden">
        <Sun className={`h-[1.2rem] w-[1.2rem] transition-all duration-500 ${theme === 'dark' ? 'transform -rotate-90 scale-0' : 'transform rotate-0 scale-100'}`} />
        <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-500 ${theme === 'dark' ? 'transform rotate-0 scale-100' : 'transform rotate-90 scale-0'}`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
