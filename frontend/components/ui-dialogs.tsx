"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CircleHelp, Info, MessageSquareText, Search, Settings2, Sparkles, SunMedium, X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function ModalDialog({ open, title, description, children, onClose }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: any) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-black/50" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200">{title}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{description ?? title}</h3>
          </div>
          <button type="button" className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10" onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sections = useMemo(() => [
    { title: 'Theme', detail: 'Dark by default', icon: SunMedium },
    { title: 'Appearance', detail: 'Glass surfaces and softer contrast', icon: Sparkles },
    { title: 'Notifications', detail: 'Live alerts and system updates', icon: MessageSquareText },
    { title: 'Language', detail: 'English (US)', icon: BookOpen },
    { title: 'AI Preferences', detail: 'Confidence thresholds and routing', icon: Sparkles },
    { title: 'About System', detail: 'Platform overview', icon: Info },
  ], []);

  return (
    <ModalDialog open={open} title="Settings" description="Configure your command-center experience" onClose={onClose}>
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-2 text-cyan-200">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">{section.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{section.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ModalDialog>
  );
}

export function HelpCenterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const helpItems = useMemo(() => [
    { title: 'Getting Started', detail: 'Learn how to navigate the command center.' },
    { title: 'Upload Incident', detail: 'Capture and route a new civic report.' },
    { title: 'AI Workflow', detail: 'Understand the reasoning pipeline.' },
    { title: 'Keyboard Shortcuts', detail: 'Navigate faster with quick keys.' },
    { title: 'FAQ', detail: 'Common operational questions.' },
    { title: 'Contact Support', detail: 'Reach the operations desk.' },
  ], []);

  return (
    <ModalDialog open={open} title="Help Center" description="Support and guidance for the console" onClose={onClose}>
      <div className="mb-4 flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/5 px-3 py-2">
        <Search className="h-4 w-4 text-cyan-200" />
        <input className="w-full border-none bg-transparent text-sm text-slate-200 outline-none" placeholder="Search help articles" aria-label="Search help articles" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {helpItems.map((item) => (
          <div key={item.title} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-2 text-cyan-200">
                <CircleHelp className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ModalDialog>
  );
}

export function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const facts = useMemo(() => [
    { label: 'Product', value: 'CityBrain AI' },
    { label: 'Version', value: '1.0' },
    { label: 'Model', value: 'Gemini 2.5 Flash' },
    { label: 'Frontend', value: 'Next.js' },
    { label: 'Backend', value: 'FastAPI' },
    { label: 'Architecture', value: 'Multi-Agent' },
    { label: 'Build Date', value: '2026-07-17' },
    { label: 'Repository', value: 'GitHub' },
    { label: 'License', value: 'MIT' },
    { label: 'Copyright', value: '© CityBrain AI' },
  ], []);

  return (
    <ModalDialog open={open} title="About" description="Platform overview and system details" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{fact.label}</p>
            <p className="mt-2 font-semibold text-white">{fact.value}</p>
          </div>
        ))}
      </div>
    </ModalDialog>
  );
}

export function LogoutConfirmModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <ModalDialog open={open} title="Logout" description="End the current demo session" onClose={onClose}>
      <div className="rounded-[22px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
        This will clear the current demo session and return you to the demo login experience.
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" onClick={onConfirm}>Logout</button>
      </div>
    </ModalDialog>
  );
}
