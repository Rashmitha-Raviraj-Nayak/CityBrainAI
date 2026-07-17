import { DashboardShell } from '@/components/dashboard-shell';
import { ExternalLink, MapPin, ShieldCheck } from 'lucide-react';

const incidents = [
  { label: 'Flooding', lat: 12.9141, lng: 74.8560, severity: 'high' },
  { label: 'Power outage', lat: 12.9205, lng: 74.8610, severity: 'medium' },
  { label: 'Traffic blockage', lat: 12.9050, lng: 74.8490, severity: 'critical' },
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
          <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 p-4">
            <div className="aspect-[16/10] rounded-[24px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_45%)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-200">Operational map layer</p>
                  <p className="mt-1 text-xl font-semibold text-white">OpenStreetMap + live incident markers</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300"><ShieldCheck className="h-4 w-4" />Live</div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {incidents.map((incident) => (
                  <div key={incident.label} className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300 transition hover:border-cyan-400/40">
                    <div className="flex items-center justify-between">
                      <span>{incident.label}</span>
                      <span className={`h-3 w-3 rounded-full ${severityColors[incident.severity]}`} />
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-400">{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Nearby services</p>
          <div className="mt-4 space-y-3">
            {['Hospitals', 'Police stations', 'Fire stations', 'Government offices', 'Flood zones'].map((service) => (
              <div key={service} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300 transition hover:border-cyan-400/40">
                <span>{service}</span>
                <ExternalLink className="h-4 w-4 text-cyan-200" />
              </div>
            ))}
          </div>
          <div className="mt-6">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Incident markers</p>
            <div className="mt-4 space-y-3">
              {incidents.map((incident) => (
                <div key={incident.label} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300 transition hover:border-cyan-400/40">
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
