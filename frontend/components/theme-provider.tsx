"use client";

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'citybrain-settings';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light'|'dark'>('dark');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      const theme = parsed?.theme === 'light' ? 'light' : 'dark';
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
    } catch (e) {
      // ignore storage write errors (private mode, etc.)
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
    } catch (e) {
      // ignore parse errors
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}
