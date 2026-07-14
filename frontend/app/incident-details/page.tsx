import { DashboardShell } from '@/components/dashboard-shell';

const timeline = [
  { step: 'Citizen report submitted', detail: 'Text and location captured' },
  { step: 'Supervisor planned workflow', detail: 'Vision and understanding selected' },
  { step: 'Prediction completed', detail: 'Risk score and urgency evaluated' },
  { step: 'Decision routed', detail: 'Department and SLA assigned' },
  { step: 'Validation reviewed', detail: 'Decision approved or escalated' },
];

export default function IncidentDetailsPage() {
  return (
    <DashboardShell>
      <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Incident details</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Storm drain flooding near Downtown</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ['Severity', 'High'],
              ['Confidence', '0.84'],
              ['Department', 'Public Works'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
            <p className="font-semibold text-white">Explainability summary</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">Vision identified standing water and blocked drainage; understanding confirmed urgency; prediction elevated the risk due to peak traffic and possible infrastructure damage; decision routed to Public Works with rapid response.</p>
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
