import { DashboardShell } from '@/components/dashboard-shell';

export default function IncidentIntelligencePage() {
  return (
    <DashboardShell>
      <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 shadow-glow backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Incident intelligence</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Evidence-rich operational context</h2>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-300">
          This workspace is designed to surface the same decision evidence from the backend runtime in
          a premium command-center format for operators and supervisors.
        </p>
      </section>
    </DashboardShell>
  );
}
