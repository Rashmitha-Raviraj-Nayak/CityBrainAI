"use client";

import React from 'react';
import { Activity } from 'lucide-react';

export const AIHealth = React.memo(function AIHealth({ confidence, queueCount }: { confidence: number; agents: Array<{ name: string; status: string; latency?: string; confidence?: string }>; queueCount: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(confidence * 100)));

  return (
    <div className="card glass p-4 sm:p-5">
      <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-slate-950/75 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200">AI Health</p>
            <h4 className="mt-2 text-lg font-semibold text-white sm:text-xl">Model health & activity</h4>
            <p className="mt-2 text-sm leading-6 text-slate-400">Overall system readiness, confidence, and queue pressure for the complete CityBrain AI runtime.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200">
            <Activity className="h-4 w-4 text-cyan-200" />
            Queue <span className="text-white">{queueCount}</span>
          </div>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200">System status</p>
              <h5 className="mt-2 text-lg font-semibold text-white">Overall AI runtime online</h5>
              <p className="mt-2 text-sm leading-6 text-slate-400">The complete CityBrain AI system is operational and ready for live incidents.</p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Online
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
              <span className="truncate">Overall AI Confidence</span>
              <span className="shrink-0 font-semibold text-white">{pct}%</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-950/60">
              <div className="h-2.5 rounded-full bg-cyan-500 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
