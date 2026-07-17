"use client";

import { memo, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui-primitives';
import { getHealthStatus } from '@/lib/api';
import { getIncidentStats, subscribeToIncidents, type IncidentRecord } from '@/services/incident-service';

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
      <div className="h-3 w-24 rounded-full bg-white/10" />
      <div className="mt-4 h-8 w-32 rounded-full bg-white/10" />
      <div className="mt-4 h-3 w-full rounded-full bg-white/10" />
      <div className="mt-2 h-3 w-3/4 rounded-full bg-white/10" />
    </div>
  );
}

export const RuntimeSummary = memo(function RuntimeSummary() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToIncidents((nextIncidents) => {
      setIncidents(nextIncidents);
    });

    setHealthLoading(true);
    getHealthStatus()
      .then((nextHealth) => setHealth(nextHealth))
      .catch(() => setHealth({ status: 'Offline' }))
      .finally(() => setHealthLoading(false));

    return () => unsubscribe();
  }, []);

  const stats = getIncidentStats(incidents);

  if (healthLoading) {
    return (
      <aside className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </aside>
    );
  }

  if (!health) {
    return null;
  }

  try {
    return (
      <aside className="space-y-4">
        <section className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Backend status</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{health.status}</h3>
            </div>
            <StatusBadge status={health.status} />
          </div>
          <p className="mt-3 text-sm text-slate-300">The API is currently serving the runtime and health endpoints.</p>
        </section>
        <section className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Live incident snapshot</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <span>Tracked incidents</span>
                <span className="font-semibold text-white">{stats.total}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <span>Pending review</span>
                <span className="font-semibold text-amber-300">{stats.pending}</span>
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Workflow layers</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            {['Supervisor agent', 'Vision agent', 'Understanding agent', 'Prediction agent', 'Decision agent'].map((layer) => (
              <li key={layer} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span>{layer}</span>
                <span className="text-cyan-200">Ready</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    );
  } catch {
    return (
      <aside className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6 text-sm text-rose-200 shadow-glow backdrop-blur">
        Backend connection unavailable. Start the FastAPI service on port 8000 to enable live runtime requests.
      </aside>
    );
  }
});
