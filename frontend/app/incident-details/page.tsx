"use client";

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { getLatestIncident, subscribeToIncidents, type IncidentRecord } from '@/services/incident-service';

const timeline = [
  { step: 'Citizen report submitted', detail: 'Text and location captured' },
  { step: 'Supervisor planned workflow', detail: 'Vision and understanding selected' },
  { step: 'Prediction completed', detail: 'Risk score and urgency evaluated' },
  { step: 'Decision routed', detail: 'Department and SLA assigned' },
  { step: 'Validation reviewed', detail: 'Decision approved or escalated' },
];

export default function IncidentDetailsPage() {
  const [incident, setIncident] = useState<IncidentRecord | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToIncidents((nextIncidents) => {
      setIncident(getLatestIncident(nextIncidents));
    });

    return () => unsubscribe();
  }, []);

  return (
    <DashboardShell>
      <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Incident details</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">{incident?.title ?? 'No incident yet'}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ['Severity', incident ? `${incident.severity_hint}/10` : '—'],
              ['Confidence', incident?.confidence ? `${Math.round(incident.confidence * 100)}%` : '—'],
              ['Department', incident?.department ?? 'Pending'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
            <p className="font-semibold text-white">Explainability summary</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {incident
                ? `${incident.category} incident captured at ${incident.location}. The workflow recommended ${incident.recommendation ?? 'review'} with ${incident.confidence ? Math.round(incident.confidence * 100) : 0}% confidence.`
                : 'Submit an incident to generate a live explainability summary and decision trace.'}
            </p>
          </div>
        </section>
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Timeline</p>
          <div className="mt-6 space-y-4">
            {timeline.map((item) => (
              <div key={item.step} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">{item.step}</p>
                <p className="mt-2 text-sm text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
