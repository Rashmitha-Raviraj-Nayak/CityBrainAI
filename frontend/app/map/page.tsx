import { DashboardShell } from '@/components/dashboard-shell';

const incidents = [
  { label: 'Flooding', lat: 37.7749, lng: -122.4194, severity: 'high' },
  { label: 'Power outage', lat: 37.781, lng: -122.41, severity: 'medium' },
  { label: 'Traffic blockage', lat: 37.77, lng: -122.43, severity: 'critical' },
];

const severityColors: Record<string, string> = {
  critical: 'bg-rose-500',
  high: 'bg-amber-500',
  medium: 'bg-cyan-500',
};

export default function MapPage() {
  return (
    <DashboardShell>
      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Interactive map</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Live monitoring and incident clustering</h2>
          <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
            <div className="flex h-[360px] items-center justify-center rounded-[24px] border border-dashed border-white/20 text-center text-sm text-slate-300">
              Map placeholder — the UI is ready for Google Maps integration and can gracefully fall back to a dashboard-style overlay when the Maps API is unavailable.
            </div>
          </div>
        </section>
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Nearby services</p>
          <div className="mt-4 space-y-3">
            {['Hospitals', 'Police stations', 'Fire stations', 'Government offices'].map((service) => (
              <div key={service} className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">{service}</div>
            ))}
          </div>
          <div className="mt-6">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Incident markers</p>
            <div className="mt-4 space-y-3">
              {incidents.map((incident) => (
                <div key={incident.label} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <span>{incident.label}</span>
                  <span className={`h-3 w-3 rounded-full ${severityColors[incident.severity]}`} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
