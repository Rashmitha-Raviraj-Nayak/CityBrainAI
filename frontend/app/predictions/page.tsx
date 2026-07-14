import { DashboardShell } from '@/components/dashboard-shell';

export default function PredictionsPage() {
  return (
    <DashboardShell>
      <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 shadow-glow backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Prediction center</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Risk forecasting and confidence scoring</h2>
      </section>
    </DashboardShell>
  );
}
