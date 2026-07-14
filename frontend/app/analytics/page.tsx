import { DashboardShell } from '@/components/dashboard-shell';

const metrics = [
  { label: 'Resolution rate', value: '87%' },
  { label: 'Avg. triage time', value: '4.2 min' },
  { label: 'Critical alerts', value: '6' },
  { label: 'Validation score', value: '0.94' },
];

export default function AnalyticsPage() {
  return (
    <DashboardShell>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-[24px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
          </div>
        ))}
      </div>
      <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Operational trend</p>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          The platform is showing stronger throughput and improved routing confidence as more incidents complete the full agent workflow.
        </p>
      </section>
    </DashboardShell>
  );
}
