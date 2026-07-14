import { DashboardShell } from '@/components/dashboard-shell';

const traces = [
  { agent: 'Supervisor', detail: 'Planned dispatch sequence and allowed downstream agents.', confidence: '0.91' },
  { agent: 'Vision', detail: 'Identified water pooling, blocked drain, and road obstruction.', confidence: '0.87' },
  { agent: 'Understanding', detail: 'Matched the report to flood-related infrastructure damage.', confidence: '0.82' },
  { agent: 'Prediction', detail: 'Elevated urgency due to traffic impact and expected spread.', confidence: '0.79' },
  { agent: 'Decision', detail: 'Recommended public works escalation with rapid field response.', confidence: '0.84' },
  { agent: 'Validation', detail: 'Approved with confidence and no manual review required.', confidence: '0.88' },
];

export default function ExplainabilityPage() {
  return (
    <DashboardShell>
      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Explainability</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Agent reasoning and execution trace</h2>
          <div className="mt-6 space-y-4">
            {traces.map((trace) => (
              <div key={trace.agent} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">{trace.agent}</p>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">{trace.confidence}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-300">{trace.detail}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Execution flow</p>
          <div className="mt-6 space-y-4">
            {['Supervisor', 'Vision', 'Understanding', 'Prediction', 'Decision', 'Validation'].map((step) => (
              <div key={step} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <span>{step}</span>
                <span className="text-emerald-300">Completed</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
