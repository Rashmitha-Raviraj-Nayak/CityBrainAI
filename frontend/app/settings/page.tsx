"use client";

import { useEffect, useState } from 'react';
import { Globe2, MoonStar, Settings2, SunMedium } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';

const STORAGE_KEY = 'citybrain-settings';

export default function SettingsPage() {
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');
  const [savedMessage, setSavedMessage] = useState('Preferences are stored locally for this demo session.');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        setTheme((parsed.theme as string) || 'dark');
        setLanguage((parsed.language as string) || 'en');
      }
    } catch {
      // ignore localStorage parsing errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, language }));
    document.documentElement.setAttribute('data-theme', theme);
    setSavedMessage('Preferences updated and saved locally.');
  }, [language, theme]);

  return (
    <DashboardShell>
      <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 shadow-glow backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Settings</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Personalize the operations experience</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
            <Settings2 className="h-4 w-4" />
            Persistent preferences
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-300">{savedMessage}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            <div className="flex items-center gap-2 text-sm text-cyan-200"><MoonStar className="h-4 w-4" />Theme</div>
            <select value={theme} onChange={(event) => setTheme(event.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            <div className="flex items-center gap-2 text-sm text-cyan-200"><Globe2 className="h-4 w-4" />Language</div>
            <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white">
              <option value="en">English</option>
            </select>
          </label>
        </div>
      </section>
    </DashboardShell>
  );
}
