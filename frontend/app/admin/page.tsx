import { DashboardShell } from '@/components/dashboard-shell';

const cards = [
  ['Total incidents', '124'],
  ['Resolved', '87'],
  ['Pending review', '14'],
  ['Critical', '6'],
];

export default function AdminDashboardPage() {
  return (
    <DashboardShell>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-[24px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Pending review queue</p>
          <div className="mt-4 space-y-3">
            {['Flooding near Market Street', 'Blocked sewer inlet', 'Traffic signal outage'].map((item) => (
              <div key={item} className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">{item}</div>
            ))}
          </div>
        </section>
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Agent status</p>
          <div className="mt-4 space-y-3">
            {['Supervisor', 'Vision', 'Understanding', 'Prediction', 'Decision', 'Validation'].map((agent) => (
              <div key={agent} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <span>{agent}</span>
                <span className="text-emerald-300">Healthy</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
