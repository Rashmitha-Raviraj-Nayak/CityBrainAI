"use client";

import { useCallback, useEffect, useState } from 'react';
import { Moon, SunMedium } from 'lucide-react';

const STORAGE_KEY = 'citybrain-settings';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light'|'dark'>('dark');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      const theme = parsed?.theme === 'light' ? 'light' : 'dark';
      setTheme(theme);
      document.documentElement.setAttribute('data-theme', theme);
    } catch {
      document.documentElement.setAttribute('data-theme', 'dark');
      setTheme('dark');
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme }));
    } catch {
      // ignore storage write errors
    }
  }, [theme]);

  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed?.theme === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleToggle = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/15 focus-visible:outline-none"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <SunMedium className="h-4 w-4 text-cyan-100" /> : <Moon className="h-4 w-4 text-slate-900" />}
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
