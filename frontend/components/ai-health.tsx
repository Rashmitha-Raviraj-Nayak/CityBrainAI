"use client";

import React from 'react';
import { Activity, Cpu, TimerReset } from 'lucide-react';

function statusClass(status: string) {
  if (status.toLowerCase().includes('online')) return 'bg-emerald-400/20 text-emerald-200';
  if (status.toLowerCase().includes('idle')) return 'bg-slate-500/15 text-slate-200';
  if (status.toLowerCase().includes('offline')) return 'bg-rose-400/15 text-rose-200';
  return 'bg-amber-400/15 text-amber-200';
}

export const AIHealth = React.memo(function AIHealth({ confidence, agents, queueCount }: { confidence: number; agents: Array<{ name: string; status: string; latency?: string; confidence?: string }>; queueCount: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(confidence * 100)));

  return (
    <div className="card glass p-4 sm:p-5">
      <div className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-slate-950/75 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200">AI Health</p>
            <h4 className="mt-2 text-lg font-semibold text-white sm:text-xl">Model health & agility</h4>
            <p className="mt-2 text-sm leading-6 text-slate-400">Operational readiness, confidence, and queue pressure across the inference stack.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200">
            <Activity className="h-4 w-4 text-cyan-200" />
            Queue <span className="text-white">{queueCount}</span>
          </div>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200">AI Health</p>
              <h5 className="mt-2 text-xl font-semibold text-white">System healthy</h5>
              <p className="mt-2 text-sm leading-6 text-slate-400">All runtime agents are online and ready for incident response.</p>
            </div>
            <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200">
              ● Online
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {agents.map((a) => (
              <div key={a.name} className="flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{a.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{a.latency ?? '—'} latency</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Ready</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
          <div className="flex items-center justify-between gap-4">
            <span className="truncate">Overall AI Confidence</span>
            <span className="shrink-0 font-semibold text-white">{pct}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-950/60">
            <div className="h-2.5 rounded-full bg-cyan-500 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
});
