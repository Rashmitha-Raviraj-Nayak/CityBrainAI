"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { ConfidenceMeter, SectionHeader, TimelineItem } from '@/components/ui-primitives';
import { getIncidentDecisionSupport, subscribeToIncidents, type IncidentRecord } from '@/services/incident-service';
import { ArrowRight, CheckCircle2, Copy, Download, Eye, FileText, Printer, ScanSearch, ShieldCheck, Sparkles } from 'lucide-react';

const defaultTimeline = [
  {
    title: 'Citizen Report',
    status: 'Completed',
    confidence: '95%',
    processingTime: '1.2s',
    department: 'Public Safety',
    recommendedAction: 'Capture and route signal',
    reason: 'Initial incident information was validated and normalized for the AI pipeline.',
    detail: 'The report is now waiting for vision extraction and evidence enrichment.',
  },
  {
    title: 'Vision Agent',
    status: 'Completed',
    confidence: '93%',
    processingTime: '1.1s',
    department: 'Infrastructure',
    recommendedAction: 'Confirm visual evidence',
    reason: 'Detected flooding and debris near the reported location.',
    detail: 'Image and metadata were analyzed to identify key risk features.',
  },
  {
    title: 'Understanding Agent',
    status: 'Processing',
    confidence: '92%',
    processingTime: '1.3s',
    department: 'Intelligence',
    recommendedAction: 'Classify incident context',
    reason: 'Contextual inference is assigning the event to a drainage failure scenario.',
    detail: 'Risk, location, and population impact are being assessed in parallel.',
  },
  {
    title: 'Prediction Agent',
    status: 'Ready',
    confidence: '90%',
    processingTime: 'Pending',
    department: 'Risk',
    recommendedAction: 'Estimate escalation likelihood',
    reason: 'Predictive models are preparing recommendations for the next step.',
    detail: 'Expected incident trajectory is being simulated. This stage is ready for the next update.',
  },
  {
    title: 'Decision Agent',
    status: 'Ready',
    confidence: '88%',
    processingTime: 'Pending',
    department: 'Operations',
    recommendedAction: 'Select response path',
    reason: 'The decision layer will schedule the recommended response based on risk and capacity.',
    detail: 'The final route selection is being assembled for supervisor approval.',
  },
  {
    title: 'Supervisor Agent',
    status: 'Ready',
    confidence: '89%',
    processingTime: 'Pending',
    department: 'Command',
    recommendedAction: 'Review and finalize recommendation',
    reason: 'Supervisor scoring is optimizing for safety, speed, and resource allocation.',
    detail: 'Awaiting final approval before issuing the action plan.',
  },
  {
    title: 'Final Recommendation',
    status: 'Ready',
    confidence: '91%',
    processingTime: 'Pending',
    department: 'Command',
    recommendedAction: 'Deliver action plan',
    reason: 'All agents are aligned, and the final plan is queued for execution.',
    detail: 'The summary report will be shared with responders once the supervisor confirms.',
  },
];

export default function ExplainabilityPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [openStep, setOpenStep] = useState<number | null>(0);

  useEffect(() => {
    const unsubscribe = subscribeToIncidents((nextIncidents) => {
      setIncidents(nextIncidents);
    });

    return () => unsubscribe();
  }, []);

  const featuredIncident = incidents[0] ?? null;
  const support = useMemo(() => (featuredIncident ? getIncidentDecisionSupport(featuredIncident) : null), [featuredIncident]);

  const timeline = useMemo(() => {
    if (!support) return defaultTimeline;

    return [
      {
        title: 'Citizen Report',
        status: 'Completed',
        confidence: '98%',
        processingTime: '1.0s',
        department: 'Community',
        recommendedAction: 'Capture and route the initial report',
        reason: 'The incident was classified and prepared for AI processing.',
        detail: featuredIncident?.description || 'No description available.',
      },
      {
        title: 'Vision Agent',
        status: 'Completed',
        confidence: `${Math.round((support.confidence ?? 0.88) * 100)}%`,
        processingTime: '1.2s',
        department: support.department ?? 'Analysis',
        recommendedAction: 'Extract visual evidence and confirm risk',
        reason: support.riskExplanation ?? 'Visual context is being used to validate urgency.',
        detail: support.summary || 'Model reasoning summary not available.',
      },
      {
        title: 'Understanding Agent',
        status: 'Processing',
        confidence: `${Math.round((support.confidence ?? 0.88) * 100)}%`,
        processingTime: '1.4s',
        department: support.department ?? 'Intelligence',
        recommendedAction: 'Classify the incident context',
        reason: `Priority is assigned for ${support.department ?? 'operations'}.`,
        detail: 'The agent is mapping incident features to the city response taxonomy.',
      },
      {
        title: 'Prediction Agent',
        status: support.confidence && support.confidence > 0.9 ? 'Completed' : 'Ready',
        confidence: `${Math.round((support.confidence ?? 0.88) * 100)}%`,
        processingTime: support.confidence && support.confidence > 0.9 ? '1.0s' : 'Pending',
        department: support.department ?? 'Risk',
        recommendedAction: 'Forecast incident trajectory',
        reason: 'Probability modeling is estimating escalation risk.',
        detail: support.riskExplanation || 'Prediction details are not yet available.',
      },
      {
        title: 'Decision Agent',
        status: support.recommendation ? 'Completed' : 'Ready',
        confidence: `${Math.round((support.confidence ?? 0.88) * 100)}%`,
        processingTime: support.recommendation ? '0.9s' : 'Pending',
        department: support.department ?? 'Command',
        recommendedAction: support.recommendation || 'Prepare response recommendations',
        reason: support.recommendation ? 'A priority action plan has been selected.' : 'Awaiting final scoring.',
        detail: support.recommendation || 'No recommendation generated yet.',
      },
      {
        title: 'Supervisor Agent',
        status: support.recommendation ? 'Ready' : 'Ready',
        confidence: `${Math.round((support.confidence ?? 0.88) * 100)}%`,
        processingTime: 'Pending',
        department: 'Executive',
        recommendedAction: 'Review and finalize',
        reason: 'Supervisor review is the final check before execution.',
        detail: support.summary || 'Awaiting supervisor assessment.',
      },
      {
        title: 'Final Recommendation',
        status: support.recommendation ? 'Ready' : 'Ready',
        confidence: `${Math.round((support.confidence ?? 0.88) * 100)}%`,
        processingTime: 'Pending',
        department: support.department ?? 'Command',
        recommendedAction: support.recommendation || 'Publish the final action plan',
        reason: 'Final recommendation is being assembled.',
        detail: support.recommendation || 'No final recommendation yet.',
      },
    ];
  }, [featuredIncident, support]);

  const reportPayload = useMemo(() => {
    return {
      id: featuredIncident?.id ?? 'latest',
      title: featuredIncident?.title ?? 'Incident report',
      location: featuredIncident?.location ?? 'Unknown',
      department: support?.department ?? 'Operations',
      riskLevel: support?.riskLevel ?? 'Moderate',
      confidence: support?.confidence ? `${Math.round(support.confidence * 100)}%` : 'Unknown',
      summary: support?.summary ?? 'Awaiting AI explanation.',
    };
  }, [featuredIncident, support]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `explainability-report-${reportPayload.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [reportPayload]);

  const copyReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(reportPayload, null, 2));
      window.alert('Report copied to clipboard.');
    } catch {
      window.alert('Unable to copy report.');
    }
  }, [reportPayload]);

  const exportPdf = useCallback(() => {
    window.print();
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <SectionHeader
            eyebrow="Explainability pipeline"
            title="Google-style AI pipeline visibility"
            subtitle="Review every stage of the AI workflow with status badges, confidence metrics, processing time, and human-readable reasoning for city operations."
            action={
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={exportJson} className="btn-primary">
                  <Download className="h-4 w-4" /> Export JSON
                </button>
                <button type="button" onClick={exportPdf} className="btn-secondary">
                  <Printer className="h-4 w-4" /> Export PDF
                </button>
                <button type="button" onClick={copyReport} className="btn-secondary">
                  <Copy className="h-4 w-4" /> Copy Report
                </button>
              </div>
            }
          />
        </section>

        <section className="grid gap-8 xl:grid-cols-[0.75fr_0.25fr]">
          <div className="space-y-6 rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Workflow overview</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Vertical explainability timeline</h2>
                </div>
                <div className="badge badge-info">Pipeline view</div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                <div className="grid gap-3">
                  {timeline.map((step, index) => (
                    <TimelineItem
                      key={step.title}
                      title={step.title}
                      status={step.status}
                      confidence={step.confidence}
                      duration={step.processingTime}
                      department={step.department}
                      reason={step.reason}
                      detail={step.detail}
                      open={openStep === index}
                      onToggle={() => setOpenStep(openStep === index ? null : index)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6 rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Incident snapshot</p>
              <h3 className="mt-3 text-xl font-semibold text-white">{featuredIncident?.title ?? 'Latest incident summary'}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{featuredIncident?.description ?? 'No incident description available yet. Subscribe to the feed to populate the latest explainability signal.'}</p>
            </div>
            <ConfidenceMeter value={support?.confidence ?? 0.12} label="AI Confidence" />
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold text-white">Department</span>
                <span>{support?.department ?? 'N/A'}</span>
              </div>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold text-white">Risk level</span>
                <span>{support?.riskLevel ?? 'Moderate'}</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Workflow state</p>
                  <p className="mt-2 text-sm text-white">{support?.recommendation ? 'Decision pending supervisor review' : 'Awaiting next update'}</p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </DashboardShell>
  );
}
