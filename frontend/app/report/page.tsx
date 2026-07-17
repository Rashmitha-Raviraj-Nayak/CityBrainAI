"use client";

import { DashboardShell } from '@/components/dashboard-shell';
import { IncidentForm } from '@/components/incident-form';

export default function ReportIncidentPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Report incident</p>
              <h2 className="text-2xl font-semibold text-white">Capture the signal and let the workflow triage it.</h2>
            </div>
            <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
              Multi-modal intake
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Upload evidence, add a voice note, tag the location, and send the report through the same runtime pipeline used on the dashboard.
          </p>
        </section>
        <IncidentForm />
      </div>
    </DashboardShell>
  );
}
