"use client";

import { useCallback, useMemo } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { IncidentForm } from '@/components/incident-form';
import { MetricCard, ReportSection, SectionHeader } from '@/components/ui-primitives';
import { Download, FileText, Printer, Save } from 'lucide-react';

const reportOverview = {
  summary: 'A high-risk drainage event was reported in the downtown corridor after heavy rain caused localized flooding and traffic disruption.',
  executive: 'AI assessment recommends deploying public works and traffic management to reduce safety risk and prevent escalation.',
  department: 'Public Works',
  priority: 'High',
  risk: 'Elevated',
  area: 'Downtown District',
  timeline: 'Report → AI intake → analysis → recommendation',
  findings: 'Strong visual evidence of standing water, blocked drainage, and near-critical infrastructure.',
};

export default function ReportIncidentPage() {
  const exportJson = useCallback(() => {
    const report = {
      summary: reportOverview.summary,
      executive: reportOverview.executive,
      department: reportOverview.department,
      priority: reportOverview.priority,
      risk: reportOverview.risk,
      area: reportOverview.area,
      timeline: reportOverview.timeline,
      findings: reportOverview.findings,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'incident-report-summary.json';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const exportPdf = useCallback(() => {
    window.print();
  }, []);

  const printReport = useCallback(() => {
    window.print();
  }, []);

  const metaCards = useMemo(
    () => [
      { label: 'Department', value: reportOverview.department },
      { label: 'Priority', value: reportOverview.priority },
      { label: 'Risk Level', value: reportOverview.risk },
      { label: 'Affected Area', value: reportOverview.area },
      { label: 'Timeline', value: reportOverview.timeline },
      { label: 'Validation Score', value: '0.91' },
    ],
    [],
  );

  return (
    <DashboardShell>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <SectionHeader
            eyebrow="Incident report"
            title="Premium AI incident summary"
            subtitle="Build an executive-grade incident report with structured findings, recommendations, resource planning, and validation scoring for operations leadership."
            action={
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={exportJson} className="btn-primary">
                  <Download className="h-4 w-4" /> Export JSON
                </button>
                <button type="button" onClick={exportPdf} className="btn-secondary">
                  <Printer className="h-4 w-4" /> Export PDF
                </button>
                <button type="button" onClick={printReport} className="btn-secondary">
                  <FileText className="h-4 w-4" /> Print
                </button>
              </div>
            }
          />
        </section>

        <div className="grid gap-8 xl:grid-cols-[0.9fr_0.65fr]">
          <section className="space-y-6 rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
            <ReportSection title="Incident Summary">
              <h2 className="text-2xl font-semibold text-white">{reportOverview.summary}</h2>
            </ReportSection>
            <div className="grid gap-4 lg:grid-cols-2">
              <ReportSection title="Executive Summary">
                <p className="text-sm leading-7 text-slate-300">{reportOverview.executive}</p>
              </ReportSection>
              <ReportSection title="AI Findings">
                <p className="text-sm leading-7 text-slate-300">{reportOverview.findings}</p>
              </ReportSection>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <ReportSection title="Recommendations">
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• Dispatch public works and traffic management teams.</li>
                  <li>• Monitor the affected area and activate flood mitigation protocols.</li>
                  <li>• Notify neighboring districts of potential runoff risks.</li>
                </ul>
              </ReportSection>
              <ReportSection title="Resource Allocation">
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• 2 inspection crews</li>
                  <li>• 1 traffic control unit</li>
                  <li>• 1 rapid response liaison</li>
                </ul>
              </ReportSection>
            </div>
            <ReportSection title="Action Plan">
              <p className="text-sm leading-7 text-slate-300">
                Coordinate field response, secure the affected corridor, and validate drainage clearance before reclassifying the incident to stable status.
              </p>
            </ReportSection>
          </section>

          <aside className="space-y-6 rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Department</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{reportOverview.department}</h3>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="grid gap-3">
                {metaCards.map((item) => (
                  <MetricCard key={item.label} title={item.label} value={item.value} detail="Executive view" accent="cyan" />
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Supervisor Decision</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">Supervisor review will confirm the recommended action and approve the validation score for incident resolution.</p>
            </div>
          </aside>
        </div>

        <IncidentForm />
      </div>
    </DashboardShell>
  );
}
