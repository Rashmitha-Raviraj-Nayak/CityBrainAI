"use client";

import { useMemo, useState } from 'react';
import { AlertTriangle, MapPin, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '@/components/ui-primitives';
import type { IncidentRecord } from '@/services/incident-service';

type MarkerTone = {
  dot: string;
  ring: string;
  label: string;
};

function getMarkerTone(severity: number, status: string): MarkerTone {
  if (status === 'escalated' || severity >= 8) {
    return { dot: 'bg-rose-500', ring: 'border-rose-400/50', label: 'Critical' };
  }

  if (severity >= 6) {
    return { dot: 'bg-orange-400', ring: 'border-orange-400/40', label: 'Elevated' };
  }

  if (severity >= 4) {
    return { dot: 'bg-amber-400', ring: 'border-amber-400/40', label: 'Watch' };
  }

  return { dot: 'bg-emerald-400', ring: 'border-emerald-400/40', label: 'Stable' };
}

export function CommandCenterMap({ incidents }: { incidents: IncidentRecord[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const markers = useMemo(() => {
    return incidents.slice(0, 6).map((incident, index) => {
      const severity = incident.severity_hint ?? 4;
      const tone = getMarkerTone(severity, incident.status);
      const x = 18 + (index % 3) * 26 + (index % 2 === 0 ? 6 : 0);
      const y = 20 + Math.floor(index / 3) * 28 + (index % 2 === 0 ? 4 : 0);
      return {
        incident,
        x,
        y,
        tone,
      };
    });
  }, [incidents]);

  const selectedIncident = useMemo(() => {
    return markers.find((marker) => marker.incident.id === selectedId)?.incident ?? markers[0]?.incident ?? null;
  }, [markers, selectedId]);

  return (
    <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Live city map</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Incident hotspots in motion</h3>
        </div>
        <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">
          {incidents.length ? `${incidents.length} active signals` : 'No live signals'}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.92))] p-4">
          <div className="absolute inset-0 opacity-60">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <rect x="8" y="8" width="84" height="84" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" />
              <path d="M18 24 L38 14 L60 25 L76 18 L82 34 L72 46 L54 44 L38 58 L22 50 Z" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" />
              <path d="M22 68 L42 62 L58 70 L76 60" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" fill="none" />
              <path d="M42 24 L42 60" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" fill="none" />
              <path d="M60 24 L60 76" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          {markers.map(({ incident, x, y, tone }) => (
            <button
              key={incident.id}
              type="button"
              onClick={() => setSelectedId(incident.id)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border ${tone.ring} p-2 transition hover:scale-110`}
              style={{ left: `${x}%`, top: `${y}%` }}
              aria-label={`View ${incident.title}`}
            >
              <span className={`block h-3.5 w-3.5 rounded-full ${tone.dot}`} />
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {selectedIncident ? (
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Focused incident</p>
                  <h4 className="mt-2 text-lg font-semibold text-white">{selectedIncident.title}</h4>
                </div>
                <StatusBadge status={selectedIncident.status} />
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{selectedIncident.description}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Prediction</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedIncident.recommendation ?? 'Assess escalation path'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recommended action</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedIncident.department ?? 'Operations'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1">
                  <span className="mr-1 text-cyan-200">•</span> {selectedIncident.category}
                </span>
                <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1">
                  <span className="mr-1 text-emerald-300">•</span> {selectedIncident.confidence ? `${Math.round(selectedIncident.confidence * 100)}% confidence` : 'Live confidence'}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
              Select a hotspot to inspect the live recommendation and status.
            </div>
          )}

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Agent decisions
            </div>
            <div className="mt-3 space-y-2">
              {incidents.slice(0, 3).map((incident) => (
                <div key={incident.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
                  <div>
                    <p className="font-semibold text-white">{incident.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{incident.location}</p>
                  </div>
                  <div className="flex items-center gap-1 text-cyan-200">
                    <AlertTriangle className="h-4 w-4" />
                    {incident.severity_hint ?? 5}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
