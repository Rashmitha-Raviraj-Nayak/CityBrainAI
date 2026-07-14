import { DashboardShell } from '@/components/dashboard-shell';
import { IncidentForm } from '@/components/incident-form';
import { RuntimeSummary } from '@/components/runtime-summary';

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <section className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Operations surface</p>
                <h2 className="text-2xl font-semibold text-white">City incident command center</h2>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                Real-time intake
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              Submit a civic signal and let the existing runtime orchestrate the vision, planning,
              prediction, and decision layers through the backend contract.
            </p>
          </section>
          <IncidentForm />
        </div>
        <RuntimeSummary />
      </div>
    </DashboardShell>
  );
}
