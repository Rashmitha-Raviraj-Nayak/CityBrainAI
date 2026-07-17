"use client";

import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { AgentWorkflowTimeline } from '@/components/agent-workflow';
import { CheckCircle2, Eye, ScanSearch, BrainCircuit, ShieldCheck, ArrowRight } from 'lucide-react';
import { getIncidentDecisionSupport, subscribeToIncidents, type IncidentRecord } from '@/services/incident-service';

const fallbackTraces = [
  { agent: 'Observation', detail: 'The report describes standing water and blocked drainage near a busy market corridor.', confidence: '0.91' },
  { agent: 'Evidence', detail: 'The signal includes a visual reference and a location context that supports a high-risk condition.', confidence: '0.87' },
  { agent: 'Model confidence', detail: 'The model identified a strong infrastructure-related signal with clear urgency drivers.', confidence: '0.82' },
  { agent: 'Reasoning', detail: 'The workflow prioritizes public works response because the impact is immediate and likely to spread.', confidence: '0.79' },
  { agent: 'Recommendation', detail: 'Dispatch inspectors and prepare traffic mitigation while the issue is still contained.', confidence: '0.84' },
  { agent: 'Expected outcome', detail: 'The response should reduce disruption, improve safety, and lower recurrence risk.', confidence: '0.88' },
];

export default function ExplainabilityPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToIncidents((nextIncidents) => {
      setIncidents(nextIncidents);
    });

    return () => unsubscribe();
  }, []);

  const featuredIncident = incidents[0] ?? null;
  const support = useMemo(() => (featuredIncident ? getIncidentDecisionSupport(featuredIncident) : null), [featuredIncident]);

  const traces = useMemo(() => {
    if (!support) {
      return fallbackTraces;
    }

    const reasoning = support.reasoning?.length ? support.reasoning : [{ title: 'Routing rationale', detail: support.riskExplanation ?? 'The workflow assessed severity, evidence quality, and public impact before routing.', confidence: support.confidence ?? 0.82 }];

    return [
      { agent: 'Signal intake', detail: `${featuredIncident?.title ?? 'Latest incident'} was captured with contextual location and evidence metadata.`, confidence: '0.92' },
      ...reasoning.slice(0, 4).map((step) => ({
        agent: step.title,
        detail: step.detail,
        confidence: step.confidence.toFixed(2),
      })),
      { agent: 'Routing decision', detail: `Recommended department: ${support.department ?? 'Operations'} with ${support.riskLevel ?? 'monitor'} risk posture.`, confidence: (support.confidence ? support.confidence.toFixed(2) : '0.84') },
      { agent: 'Action plan', detail: support.recommendation ?? 'Dispatch the recommended team and monitor for escalation.', confidence: '0.88' },
    ];
  }, [featuredIncident, support]);

  const exportReport = () => {
    if (!featuredIncident) return;
    const created = (featuredIncident.createdAt && typeof featuredIncident.createdAt === 'string') ? featuredIncident.createdAt : new Date().toISOString();
    const report = {
      incident_id: featuredIncident.id,
      title: featuredIncident.title,
      description: featuredIncident.description,
      location: featuredIncident.location,
      timestamp: created,
      ai_findings: support || {},
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-${featuredIncident.id || 'report'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardShell>
      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Explainability</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Transparent reasoning for every recommendation</h2>
          <div className="mt-4 flex items-center justify-between">
            <AgentWorkflowTimeline stage="complete" confidence={0.91} />
            <div className="ml-4 flex-shrink-0">
              <button type="button" onClick={exportReport} className="btn-accent">Export JSON</button>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {traces.map((trace, index) => (
              <div key={trace.agent} className="rounded-[24px] border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    {index === 0 ? <Eye className="h-4 w-4 text-cyan-200" /> : index === 1 ? <ScanSearch className="h-4 w-4 text-cyan-200" /> : index === 2 ? <BrainCircuit className="h-4 w-4 text-cyan-200" /> : index === 3 ? <ShieldCheck className="h-4 w-4 text-cyan-200" /> : <CheckCircle2 className="h-4 w-4 text-cyan-200" />}
                    <p className="font-semibold">{trace.agent}</p>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">{trace.confidence}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-300">{trace.detail}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Execution flow</p>
          <div className="mt-4 flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Confidence-ready</div>
          <div className="mt-6 space-y-4">
            {[
              ['Signal intake', 'Completed'],
              ['Evidence review', support ? 'Completed' : 'Ready'],
              ['Routing decision', support ? 'Completed' : 'Ready'],
              ['Recommended action', support ? 'Prepared' : 'Ready'],
              ['Field response', 'Ready'],
            ].map(([step, state], index) => (
              <div key={step} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <span>{step}</span>
                <div className="flex items-center gap-2 text-emerald-300">
                  <span>{state}</span>
                  {index < 4 ? <ArrowRight className="h-4 w-4" /> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
