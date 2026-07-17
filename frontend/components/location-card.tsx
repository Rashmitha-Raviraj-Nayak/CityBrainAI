"use client";

import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, MapPin, RefreshCw } from 'lucide-react';

type LocationState = {
  latitude: number;
  longitude: number;
  address: string;
  placeName: string;
  city: string;
  state: string;
  country: string;
  accuracy: number;
  timestamp: string;
};

const CACHE_KEY = 'citybrain-location-cache';
const CACHE_TTL_MS = 30_000;

function readCachedLocation() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { location: LocationState; cachedAt: number };
    const age = Date.now() - (parsed.cachedAt ?? 0);
    return age <= CACHE_TTL_MS ? parsed.location : null;
  } catch {
    return null;
  }
}

function writeCachedLocation(location: LocationState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CACHE_KEY, JSON.stringify({ location, cachedAt: Date.now() }));
}

export function LocationCard({ compact = false }: { compact?: boolean }) {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [message, setMessage] = useState<string>('Enable GPS to resolve your live city location.');
  const [copied, setCopied] = useState(false);

  const loadLocation = async (forceRefresh = false) => {
    const cached = forceRefresh ? null : readCachedLocation();
    if (cached) {
      setLocation(cached);
      setStatus('ready');
      setMessage('Using your latest cached city position.');
      return;
    }

    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('Geolocation is unavailable in this browser.');
      return;
    }

    setStatus('loading');
    setMessage('Requesting your current position…');

    try {
      const position = await new Promise<{ coords: { latitude: number; longitude: number; accuracy: number }; timestamp: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20_000,
          maximumAge: 0,
        });
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Reverse geocoding failed.');
      }

      const data = await response.json();
      const address = data.address ?? {};
      const parts = [data.name, address.road, address.suburb, address.city, address.county, address.state, address.country].filter(Boolean);
      const resolvedAddress = parts.join(', ').trim() || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      const nextLocation: LocationState = {
        latitude,
        longitude,
        address: resolvedAddress,
        placeName: data.display_name?.split(',')[0] || resolvedAddress,
        city: address.city || address.town || address.village || '',
        state: address.state || '',
        country: address.country || '',
        accuracy: position.coords.accuracy ?? 0,
        timestamp: new Date(position.timestamp).toLocaleString(),
      };

      writeCachedLocation(nextLocation);
      setLocation(nextLocation);
      setStatus('ready');
      setMessage('Resolved from OpenStreetMap reverse geocoding.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to resolve your location.';
      setStatus('error');
      setMessage(message.includes('denied') ? 'Location permission was denied. Please enable GPS access.' : message);
    }
  };

  useEffect(() => {
    void loadLocation();
  }, []);

  const copyAddress = async () => {
    if (!location?.address) {
      return;
    }

    try {
      await navigator.clipboard.writeText(location.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const mapsUrl = useMemo(() => (location ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}` : null), [location]);

  return (
    <section className={`rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-slate-100 ${compact ? 'space-y-3' : 'space-y-4'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Current location</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{location?.placeName || 'Live city position'}</h3>
        </div>
        <button type="button" onClick={() => void loadLocation(true)} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800">
          <span className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </span>
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 text-cyan-200" />
          <div>
            <p className="font-medium text-white">{location?.address || 'Waiting for GPS resolution…'}</p>
            <p className="mt-1 text-xs text-slate-400">{message}</p>
          </div>
        </div>
      </div>

      {location ? (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Accuracy</p>
            <p className="mt-1 font-semibold text-white">{Math.round(location.accuracy)} m</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Timestamp</p>
            <p className="mt-1 font-semibold text-white">{location.timestamp}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copyAddress} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800">
          <span className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy address'}
          </span>
        </button>
        {mapsUrl ? (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800">
            <span className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Open in Google Maps
            </span>
          </a>
        ) : null}
      </div>
    </section>
  );
}
