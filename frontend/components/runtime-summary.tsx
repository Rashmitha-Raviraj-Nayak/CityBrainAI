import { getHealthStatus } from '@/lib/api';

export async function RuntimeSummary() {
  try {
    const health = await getHealthStatus();

    return (
      <aside className="space-y-4">
        <section className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Backend status</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{health.status}</h3>
          <p className="mt-3 text-sm text-slate-300">The API is currently serving the runtime and health endpoints.</p>
        </section>
        <section className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Workflow layers</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            {['Supervisor agent', 'Vision agent', 'Understanding agent', 'Prediction agent', 'Decision agent'].map((layer) => (
              <li key={layer} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span>{layer}</span>
                <span className="text-cyan-200">Ready</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    );
  } catch {
    return (
      <aside className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6 text-sm text-rose-200 shadow-glow backdrop-blur">
        Backend connection unavailable. Start the FastAPI service on port 8000 to enable live runtime requests.
      </aside>
    );
  }
}
