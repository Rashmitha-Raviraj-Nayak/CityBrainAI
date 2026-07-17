"use client";

import { memo, type ReactNode } from 'react';
import { AlertCircle, BadgeAlert, BadgeCheck, Circle, Sparkles } from 'lucide-react';

export const StatusBadge = memo(function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const normalized = status.toLowerCase();
  let tone = 'bg-slate-500/15 text-slate-200 border-slate-500/25';
  if (normalized.includes('complete') || normalized.includes('online') || normalized.includes('ready')) tone = 'bg-emerald-500/15 text-emerald-200 border-emerald-500/25';
  if (normalized.includes('processing') || normalized.includes('pending')) tone = 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  if (normalized.includes('failed') || normalized.includes('offline') || normalized.includes('critical')) tone = 'bg-rose-500/15 text-rose-200 border-rose-500/25';
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${tone} ${className}`}>{normalized.includes('ready') || normalized.includes('online') ? <BadgeCheck className="h-3.5 w-3.5" /> : normalized.includes('processing') || normalized.includes('pending') ? <AlertCircle className="h-3.5 w-3.5" /> : normalized.includes('failed') || normalized.includes('offline') ? <BadgeAlert className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />} {status}</span>;
});

export const RiskBadge = memo(function RiskBadge({ level }: { level: string }) {
  const normalized = level.toLowerCase();
  let tone = 'bg-slate-500/15 text-slate-200 border-slate-500/25';
  if (normalized.includes('critical') || normalized.includes('high')) tone = 'bg-rose-500/15 text-rose-200 border-rose-500/25';
  if (normalized.includes('medium') || normalized.includes('elevated')) tone = 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  if (normalized.includes('low') || normalized.includes('stable')) tone = 'bg-emerald-500/15 text-emerald-200 border-emerald-500/25';
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${tone}`}>{level}</span>;
});

export function SectionHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">{eyebrow}</p> : null}
        <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ReportSection({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-sm shadow-black/10 ${className}`}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function MetricCard({ title, value, detail, accent = 'cyan' }: { title: string; value: string | number; detail?: string; accent?: 'cyan' | 'emerald' | 'amber' | 'rose' }) {
  const accentClasses = {
    cyan: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200',
    emerald: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    amber: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
    rose: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
  };
  return (
    <div className="flex min-h-[148px] flex-col justify-between rounded-[24px] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-cyan-400/30">
      <div className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${accentClasses[accent]}`}>
        {title}
      </div>
      <div>
        <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
        {detail ? <p className="mt-2 text-sm text-slate-400">{detail}</p> : null}
      </div>
    </div>
  );
}

export function AgentCard({ name, status, latency, confidence, className = '' }: { name: string; status: string; latency?: string; confidence?: string; className?: string }) {
  return (
    <div className={`flex min-h-[140px] flex-col justify-between rounded-[22px] border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/10 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{name}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">{latency ?? 'Live'}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Confidence</span>
          <span className="font-semibold text-white">{confidence ?? '--'}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950/60">
          <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${Math.max(10, Number(confidence?.replace('%', '')) || 0)}%` }} />
        </div>
      </div>
    </div>
  );
}

export function ConfidenceMeter({ value, label }: { value: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/80 p-4">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>{label ?? 'Confidence'}</span>
        <span className="font-semibold text-white">{percent}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900">
        <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function TimelineItem({ title, status, confidence, duration, department, reason, detail, onToggle, open }: { title: string; status: string; confidence: string; duration: string; department: string; reason: string; detail: string; onToggle?: () => void; open?: boolean }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-slate-950/80 p-4 shadow-sm shadow-black/10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-400">{reason}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <StatusBadge status={status} />
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{confidence}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{duration}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Department</p>
          <p className="mt-2 font-semibold text-white">{department}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reasoning summary</p>
          <p className="mt-2 font-semibold text-white">{detail}</p>
        </div>
      </div>
      {onToggle ? (
        <div className="mt-4">
          <button type="button" onClick={onToggle} className="text-sm font-semibold text-cyan-200 transition hover:text-cyan-100">
            {open ? 'Hide details' : 'Show details'}
          </button>
          {open ? <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">{detail}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ExportMenu({ onJson, onPdf, onCsv, onPng }: { onJson?: () => void; onPdf?: () => void; onCsv?: () => void; onPng?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onJson ? <button type="button" onClick={onJson} className="btn-primary"><Sparkles className="h-4 w-4" /> JSON</button> : null}
      {onPdf ? <button type="button" onClick={onPdf} className="btn-secondary">PDF</button> : null}
      {onCsv ? <button type="button" onClick={onCsv} className="btn-secondary">CSV</button> : null}
      {onPng ? <button type="button" onClick={onPng} className="btn-secondary">PNG</button> : null}
    </div>
  );
}

export function NotificationBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-100">
      {count}
    </span>
  );
}
