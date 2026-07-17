"use client";

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, BrainCircuit, ShieldCheck, Users } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuth } from '@/contexts/auth-context';
import { getIncidentStats, subscribeToIncidents, type IncidentRecord } from '@/services/incident-service';

export default function AdminDashboardPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribe = subscribeToIncidents((nextIncidents) => {
      setIncidents(nextIncidents);
    });

    return () => unsubscribe();
  }, []);

  const stats = getIncidentStats(incidents);
  if (user?.role !== 'administrator') {
    return (
      <DashboardShell>
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Access restricted</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Administrator access is required for this workspace.</h2>
          <p className="mt-3 text-sm text-slate-300">Please sign in with an authorized admin account to open citywide monitoring tools.</p>
        </section>
      </DashboardShell>
    );
  }

  const cards = [
    ['Total incidents', String(stats.total)],
    ['Resolved', String(stats.reviewed)],
    ['Pending review', String(stats.pending)],
    ['Critical', String(stats.escalated)],
  ];

  return (
    <DashboardShell>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-[24px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur transition hover:-translate-y-1">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Pending review queue</p>
            <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200"><Activity className="h-4 w-4" />Live</div>
          </div>
          <div className="mt-4 space-y-3">
            {incidents.length ? incidents.slice(0, 3).map((incident) => (
              <div key={incident.id} className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <span>{incident.title}</span>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">{incident.status}</span>
                </div>
                <p className="mt-2 text-slate-400">{incident.location} • {incident.category}</p>
              </div>
            )) : <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">No incidents have been submitted yet.</div>}
          </div>
        </section>
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Agent status</p>
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300"><ShieldCheck className="h-4 w-4" />Healthy</div>
          </div>
          <div className="mt-4 space-y-3">
            {['Supervisor', 'Vision', 'Understanding', 'Prediction', 'Decision', 'Validation'].map((agent) => (
              <div key={agent} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  {agent === 'Supervisor' ? <BrainCircuit className="h-4 w-4 text-cyan-200" /> : agent === 'Validation' ? <ShieldCheck className="h-4 w-4 text-cyan-200" /> : <Users className="h-4 w-4 text-cyan-200" />}
                  <span>{agent}</span>
                </div>
                <span className="text-emerald-300">Healthy</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
