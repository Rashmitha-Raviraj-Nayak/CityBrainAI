import { DashboardShell } from '@/components/dashboard-shell';

const workflowSteps = [
  { name: 'Supervisor', detail: 'Orchestrates specialist agents and confidence thresholds.', status: 'Active' },
  { name: 'Vision', detail: 'Extracts image context and scene understanding.', status: 'Ready' },
  { name: 'Understanding', detail: 'Maps citizen input to operational intent.', status: 'Ready' },
  { name: 'Prediction', detail: 'Projects risk and exposure over time.', status: 'Ready' },
  { name: 'Decision', detail: 'Selects departments, priorities, and actions.', status: 'Ready' },
  { name: 'Officer Copilot', detail: 'Formats the operational brief and next steps.', status: 'Ready' },
];

export default function WorkflowPage() {
  return (
    <DashboardShell>
      <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 shadow-glow backdrop-blur">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">AI workflow</p>
            <h2 className="text-3xl font-semibold text-white">Multi-agent civic operations orchestration</h2>
          </div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
            Live execution path
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {workflowSteps.map((step) => (
            <article key={step.name} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{step.name}</h3>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">
                  {step.status}
                </span>
              </div>
              <p className="text-sm leading-7 text-slate-300">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
