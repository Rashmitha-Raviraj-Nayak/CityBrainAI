"use client";

import React from 'react';
import { BarChart3, Activity, Circle, Cpu } from 'lucide-react';

export function AIHealth({ confidence, agents, queueCount }: { confidence: number; agents: Array<{ name: string; status: string; latency?: string; confidence?: string }>; queueCount: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(confidence * 100)));
  return (
    <div className="card glass p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">AI Health</p>
          <h4 className="mt-1 text-lg font-semibold text-white">Model health & activity</h4>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">Confidence</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-cyan-200 font-semibold">{pct}%</div>
            <div className="text-sm text-slate-300">Queue: <span className="font-medium text-white">{queueCount}</span></div>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {agents.map((a) => (
          <div key={a.name} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 p-3">
            <div>
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-200" />
                <div className="font-medium text-white">{a.name}</div>
              </div>
              <div className="text-xs text-slate-300">{a.status} • {a.latency ?? '—'}</div>
            </div>
            <div className="text-sm text-slate-200">{a.confidence ?? '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
