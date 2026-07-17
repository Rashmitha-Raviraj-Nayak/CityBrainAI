"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

const isBrowser = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';
import { AlertCircle, Camera, CheckCircle2, Copy, ExternalLink, LoaderCircle, MapPin, Mic, RefreshCw, Sparkles, UploadCloud, Video } from 'lucide-react';
import { runRuntime, type RuntimeRequest } from '@/lib/api';
import { createIncident, uploadIncidentMedia, validateIncidentMedia, type IncidentMediaKind, type UploadProgress } from '@/services/incident-service';
import { useAuth } from '@/contexts/auth-context';
import { AgentWorkflowTimeline } from '@/components/agent-workflow';

const defaultValues: RuntimeRequest = {
  title: 'Blocked storm drain causing localized flooding',
  description: 'Heavy rain has overwhelmed a drainage inlet and water is pooling near the intersection.',
  category: 'infrastructure',
  location: 'Downtown District',
  source: 'citizen_report',
  severity_hint: 7,
  metadata: {
    channel: 'web',
    priority: 'high',
  },
};

type SubmissionStage = 'idle' | 'uploading' | 'analyzing' | 'persisting' | 'complete';
type ToastState = { kind: 'success' | 'error'; message: string } | null;
type EvidenceKind = IncidentMediaKind | 'none';

type ResolvedLocation = {
  latitude: number;
  longitude: number;
  placeName: string;
  address: string;
  street: string;
  area: string;
  city: string;
  district: string;
  state: string;
  country: string;
  postalCode: string;
  accuracy: number;
  timestamp: string;
  label: string;
};

type GeolocationLike = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestamp: number;
};

type GeolocationErrorLike = {
  message?: string;
};

const DEFAULT_LOCATION_LABEL = 'Mangalore Institute of Technology & Engineering, Moodabidri, Dakshina Kannada, Karnataka, India';

function buildFallbackLocation(latitude: number, longitude: number) {
  const nearMite = Math.abs(latitude - 13.0) < 0.4 && Math.abs(longitude - 74.9) < 0.4;
  return nearMite
    ? DEFAULT_LOCATION_LABEL
    : `Coordinates ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function buildFallbackPlaceName(latitude: number, longitude: number) {
  const nearMite = Math.abs(latitude - 13.0) < 0.4 && Math.abs(longitude - 74.9) < 0.4;
  return nearMite ? 'Mangalore Institute of Technology & Engineering' : `Coordinates ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export function IncidentForm() {
  const [form, setForm] = useState<RuntimeRequest>(defaultValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof runRuntime>> | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>('none');
  const [dragActive, setDragActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [gpsLocation, setGpsLocation] = useState<ResolvedLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [analysisStage, setAnalysisStage] = useState<SubmissionStage>('idle');
  const [toast, setToast] = useState<ToastState>(null);
  const { user } = useAuth();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const locationInFlightRef = useRef(false);
  const locationCacheRef = useRef<ResolvedLocation | null>(null);

  const canSubmit = useMemo(() => form.title.trim().length > 0 && form.description.trim().length > 0 && form.location.trim().length > 0, [form.description, form.location, form.title]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationMessage('This browser does not support GPS location capture.');
      return;
    }

    void requestLocation();
  }, []);

  const resetEvidence = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setEvidenceKind('none');
    setUploadProgress(null);
    setUploading(false);
    setIsRecording(false);
    setRecordingSeconds(0);
    setToast(null);
  };

  const selectEvidenceFile = (file: File, kind: EvidenceKind) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setEvidenceKind(kind);
    setPreviewUrl(objectUrl);
    setUploadProgress(null);
    setUploading(false);
    setToast(null);
  };

  const handleFileSelection = (file: File | undefined) => {
    if (!file) {
      return;
    }

    const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
    const validationError = validateIncidentMedia(file, kind);
    if (validationError) {
      setError(validationError);
      setToast({ kind: 'error', message: validationError });
      return;
    }

    selectEvidenceFile(file, kind);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    handleFileSelection(event.dataTransfer.files?.[0]);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.target.files?.[0]);
  };

  const startRecording = async () => {
    if (!isBrowser || !navigator.mediaDevices?.getUserMedia) {
      setError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const recordedFile = new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type });
        selectEvidenceFile(recordedFile, 'audio');
        stream.getTracks().forEach((track) => track.stop());
        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current);
        }
      };

      recorder.onerror = () => {
        setError('Recording stopped unexpectedly.');
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((value) => value + 1);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
    }
  };

  const requestLocation = async (forceRefresh = false) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      setLocationStatus('error');
      setLocationMessage('This browser does not support GPS location capture.');
      return;
    }

    if (!forceRefresh && locationCacheRef.current) {
      setGpsLocation(locationCacheRef.current);
      setLocationStatus('ready');
      setLocationMessage('Using the latest cached location.');
      setForm((current) => ({ ...current, location: locationCacheRef.current?.address || current.location }));
      return;
    }

    if (locationInFlightRef.current) {
      return;
    }

    setLocationStatus('loading');
    setLocationMessage('Requesting your current position…');
    locationInFlightRef.current = true;

    try {
      const position = await new Promise<GeolocationLike>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve as (position: GeolocationLike) => void, reject as (error: GeolocationErrorLike) => void, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const accuracy = position.coords.accuracy ?? 0;
      const timestamp = new Date(position.timestamp).toISOString();
      const fallbackLabel = buildFallbackLocation(latitude, longitude);
      const fallbackPlaceName = buildFallbackPlaceName(latitude, longitude);
      let resolvedAddress = fallbackLabel;
      let placeName = fallbackPlaceName;
      let street = '';
      let area = '';
      let city = '';
      let district = '';
      let state = '';
      let country = '';
      let postalCode = '';
      let geocodeMessage: string | null = null;

      if (!navigator.onLine) {
        geocodeMessage = 'You are offline, so the address could not be resolved. Showing the nearest known location for now.';
      } else {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: {
              'Accept-Language': 'en',
            },
          });

          if (response.ok) {
            const data = await response.json();
            const address = data.address ?? {};
            const osmDisplayName = data.display_name || fallbackLabel;

            placeName = data.name || osmDisplayName.split(',')[0] || fallbackPlaceName;
            resolvedAddress = osmDisplayName || fallbackLabel;
            street = address.road || address.house_number || '';
            area = address.neighbourhood || address.suburb || address.village || '';
            city = address.city || address.town || address.village || '';
            district = address.county || address.state_district || '';
            state = address.state || '';
            country = address.country || '';
            postalCode = address.postcode || '';
          } else {
            geocodeMessage = 'OpenStreetMap could not resolve the address right now. Showing the detected coordinates instead.';
          }
        } catch {
          geocodeMessage = 'OpenStreetMap could not resolve the address right now. Showing the detected coordinates instead.';
        }
      }

      const resolvedLocation: ResolvedLocation = {
        latitude,
        longitude,
        placeName,
        address: resolvedAddress,
        street,
        area,
        city,
        district,
        state,
        country,
        postalCode,
        accuracy,
        timestamp,
        label: resolvedAddress,
      };

      locationCacheRef.current = resolvedLocation;
      setGpsLocation(resolvedLocation);
      setLocationStatus('ready');
      setLocationMessage(geocodeMessage || 'Location captured successfully.');
      setForm((current) => ({ ...current, location: resolvedLocation.address }));
      setToast({ kind: 'success', message: `Location captured: ${resolvedLocation.address}` });
      setError(null);
    } catch (geoError) {
      const message = geoError instanceof Error ? geoError.message : 'Unable to acquire your location.';
      const fallbackMessage = message.includes('denied') ? 'Location access was denied. Please allow GPS access and try again.' : message.includes('timed out') ? 'Location request timed out. Please try again.' : 'Unable to acquire your location right now.';
      setError(fallbackMessage);
      setLocationStatus('error');
      setLocationMessage(fallbackMessage);
    } finally {
      locationInFlightRef.current = false;
    }
  };

  const copyLocationAddress = async () => {
    const address = gpsLocation?.address || form.location;
    if (!address) {
      return;
    }

    try {
      await navigator.clipboard.writeText(address);
      setToast({ kind: 'success', message: 'Address copied to clipboard.' });
    } catch {
      setToast({ kind: 'error', message: 'Unable to copy the address automatically.' });
    }
  };

  const openLocationInMaps = () => {
    if (!gpsLocation) {
      return;
    }

    const url = `https://www.google.com/maps?q=${gpsLocation.latitude},${gpsLocation.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openLocationInOpenStreetMap = () => {
    if (!gpsLocation) {
      return;
    }

    const url = `https://www.openstreetmap.org/?mlat=${gpsLocation.latitude}&mlon=${gpsLocation.longitude}&zoom=15`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const uploadSelectedEvidence = async () => {
    if (!selectedFile || evidenceKind === 'none') {
      return undefined;
    }

    setUploading(true);
    setUploadProgress(null);
    setError(null);
    try {
      const uploadResult = await uploadIncidentMedia(selectedFile, setUploadProgress, evidenceKind);
      setToast({ kind: 'success', message: 'Evidence uploaded successfully.' });
      return uploadResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Evidence upload failed.';
      setError(message);
      setToast({ kind: 'error', message });
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      setError('Please add a title, description, and location before submitting.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setResult(null);
    setAnalysisStage('uploading');
    setUploadProgress(null);

    try {
      const safeTitle = form.title.trim();
      const safeDescription = form.description.trim();
      const safeLocation = (gpsLocation?.address || form.location).trim();
      let evidenceUrl: string | undefined;
      let evidencePath: string | undefined;
      if (selectedFile && evidenceKind !== 'none') {
        const uploadResult = await uploadSelectedEvidence();
        evidenceUrl = uploadResult?.downloadUrl;
        evidencePath = uploadResult?.path;
      }

      setAnalysisStage('analyzing');
      const locationDetails = gpsLocation
        ? {
            latitude: gpsLocation.latitude,
            longitude: gpsLocation.longitude,
            placeName: gpsLocation.placeName,
            address: gpsLocation.address,
            city: gpsLocation.city,
            district: gpsLocation.district,
            state: gpsLocation.state,
            country: gpsLocation.country,
            postalCode: gpsLocation.postalCode,
            accuracy: gpsLocation.accuracy,
            timestamp: gpsLocation.timestamp,
          }
        : undefined;

      const metadata = {
        channel: 'web',
        priority: 'high',
        evidenceType: evidenceKind === 'none' ? 'none' : evidenceKind,
        evidenceUrl,
        evidencePath,
        evidenceFileName: selectedFile?.name,
        locationSource: gpsLocation ? 'gps' : 'manual',
        gps: gpsLocation ? { latitude: gpsLocation.latitude, longitude: gpsLocation.longitude } : undefined,
        locationDetails,
        ...(gpsLocation ? { latitude: gpsLocation.latitude, longitude: gpsLocation.longitude } : {}),
      };

      const response = await runRuntime({
        ...form,
        title: safeTitle,
        description: safeDescription,
        location: safeLocation,
        metadata: {
          ...form.metadata,
          ...metadata,
        },
      });

      const workflowStatus = response.decision.workflow_status;
      const decisionSupport = {
        department: response.decision.department,
        riskLevel: response.decision.risk_level,
        recommendation: response.decision.recommended_action,
        confidence: response.decision.confidence,
        executiveSummary: response.decision.officer_brief || response.explanation.summary,
        riskExplanation: response.decision.explanation || response.explanation.summary,
        summary: response.explanation.summary,
        actionPlan: [
          response.decision.recommended_action,
          response.validation.is_valid ? 'Track field deployment and monitor for escalation' : 'Escalate for manual review',
          response.explanation.summary,
        ],
        resources: [response.decision.department, response.validation.is_valid ? 'On-call field team' : 'Review desk'],
        timeline: response.decision.workflow_status?.successful_agents.length ? `${response.decision.workflow_status.successful_agents.length} agent checks in flight` : 'Assessment pending',
        validationScore: response.validation.score,
        reasoning: response.explanation.rationale.map((item) => ({
          title: item.title,
          detail: item.detail,
          confidence: item.confidence,
        })),
      };

      setAnalysisStage('persisting');
      await createIncident({
        title: safeTitle,
        description: safeDescription,
        category: form.category,
        location: safeLocation,
        severity_hint: form.severity_hint ?? 0,
        source: form.source || 'web',
        status: response.validation.is_valid ? 'submitted' : 'pending',
        department: response.decision.department,
        confidence: response.decision.confidence,
        recommendation: response.decision.recommended_action,
        imageUrl: evidenceUrl,
        latitude: gpsLocation?.latitude,
        longitude: gpsLocation?.longitude,
        locationDetails,
        createdBy: user?.uid,
        metadata: {
          ...metadata,
          workflowId: response.workflow_id,
          workflowStatus,
          ...decisionSupport,
        },
      });

      setResult(response);
      setSuccess('Incident submitted and routed for AI review.');
      setAnalysisStage('complete');
      setToast({ kind: 'success', message: 'Incident submitted and routed for AI review.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process incident');
      setAnalysisStage('idle');
      setToast({ kind: 'error', message: 'The report could not be processed. Please try again.' });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Citizen intake</p>
          <h2 className="text-2xl font-semibold text-white">Compose a high-confidence civic report</h2>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
          Live AI workflow
        </div>
      </div>

      {toast ? (
        <div className={`mb-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${toast.kind === 'success' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/20 bg-rose-500/10 text-rose-200'}`} role="status">
          {toast.kind === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Signal title</span>
            <input className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            <span>Category</span>
            <input className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          </label>
        </div>
        <label className="block space-y-2 text-sm text-slate-300">
          <span>Description</span>
          <textarea className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Location</span>
            <input className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            <span>Severity hint</span>
            <input type="number" min="0" max="10" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0" value={form.severity_hint} onChange={(event) => setForm({ ...form, severity_hint: Number(event.target.value) })} />
          </label>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div
            className={`rounded-[24px] border border-dashed p-4 transition ${dragActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Evidence upload</p>
                <p className="text-sm text-slate-400">Drag an image, video, or audio clip here.</p>
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800">
                Choose file
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleFileInputChange} />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-left text-sm text-slate-300">
                <Camera className="mb-2 h-4 w-4 text-cyan-200" />
                Image
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-left text-sm text-slate-300">
                <Video className="mb-2 h-4 w-4 text-cyan-200" />
                Video
              </button>
              <button type="button" onClick={startRecording} className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-left text-sm text-slate-300">
                <Mic className="mb-2 h-4 w-4 text-cyan-200" />
                Voice note
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Location context</p>
              <button type="button" onClick={() => void requestLocation()} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Use GPS
                </span>
              </button>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              {locationStatus === 'loading' ? 'Requesting location permission…' : locationStatus === 'ready' && gpsLocation ? gpsLocation.address : 'GPS tagging adds coordinates to the incident record.'}
            </div>
            {locationMessage ? <p className="text-xs text-slate-400">{locationMessage}</p> : null}
            {gpsLocation ? (
              <div className="space-y-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void requestLocation(true)} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                    <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4" />Refresh Location</span>
                  </button>
                  <button type="button" onClick={openLocationInMaps} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                    <span className="flex items-center gap-2"><ExternalLink className="h-4 w-4" />Open in Google Maps</span>
                  </button>
                  <button type="button" onClick={openLocationInOpenStreetMap} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                    <span className="flex items-center gap-2"><ExternalLink className="h-4 w-4" />OpenStreetMap</span>
                  </button>
                  <button type="button" onClick={() => void copyLocationAddress()} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                    <span className="flex items-center gap-2"><Copy className="h-4 w-4" />Copy Address</span>
                  </button>
                </div>
                <div className="space-y-2 text-sm text-slate-200">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Place Name</p>
                    <p className="font-medium text-white">{gpsLocation.placeName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Full Address</p>
                    <p>{gpsLocation.address}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Street</p>
                      <p>{gpsLocation.street || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Area</p>
                      <p>{gpsLocation.area || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Latitude</p>
                      <p>{gpsLocation.latitude.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Longitude</p>
                      <p>{gpsLocation.longitude.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Captured Time</p>
                      <p>{new Date(gpsLocation.timestamp).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">GPS Accuracy</p>
                      <p>{gpsLocation.accuracy.toFixed(0)} m</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">City</p>
                      <p>{gpsLocation.city || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">District</p>
                      <p>{gpsLocation.district || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">State</p>
                      <p>{gpsLocation.state || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Country</p>
                      <p>{gpsLocation.country || '—'}</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <iframe
                    title="Detected location on Google Maps"
                    src={`https://www.google.com/maps?q=${gpsLocation.latitude},${gpsLocation.longitude}&z=15&output=embed`}
                    className="h-56 w-full"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : null}
            {isRecording ? (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                <div className="flex items-center justify-between">
                  <span>Recording audio</span>
                  <span>{recordingSeconds}s</span>
                </div>
                <button type="button" onClick={stopRecording} className="mt-2 rounded-full bg-cyan-500 px-3 py-2 font-semibold text-slate-950">
                  Stop recording
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {selectedFile ? (
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Selected evidence</p>
                <p className="text-sm text-slate-400">{selectedFile.name}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void uploadSelectedEvidence()} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200" disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Retry upload'}
                </button>
                <button type="button" onClick={resetEvidence} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">Clear</button>
              </div>
            </div>
            {evidenceKind === 'image' ? <img src={previewUrl ?? undefined} alt="Selected evidence" loading="lazy" decoding="async" className="mt-4 h-56 w-full rounded-2xl object-cover" /> : evidenceKind === 'video' ? <video src={previewUrl ?? undefined} controls preload="metadata" className="mt-4 h-56 w-full rounded-2xl object-cover" /> : evidenceKind === 'audio' ? <audio src={previewUrl ?? undefined} controls preload="metadata" className="mt-4 w-full" /> : null}
          </div>
        ) : null}

        {uploading && uploadProgress ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            <div className="mb-2 flex items-center justify-between">
              <span>Uploading evidence</span>
              <span>{uploadProgress.percentage}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-950">
              <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${uploadProgress.percentage}%` }} />
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            <span>{analysisStage === 'uploading' ? 'Uploading evidence…' : analysisStage === 'analyzing' ? 'Running AI analysis…' : analysisStage === 'persisting' ? 'Saving incident…' : 'Preparing workflow…'}</span>
          </div>
        ) : null}

        <AgentWorkflowTimeline stage={loading ? (analysisStage === 'uploading' ? 'uploading' : analysisStage === 'analyzing' ? 'analyzing' : analysisStage === 'persisting' ? 'persisting' : 'complete') : result ? 'complete' : 'idle'} confidence={result?.decision.confidence} />

        <button type="submit" disabled={loading || uploading || !canSubmit} className="rounded-full bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70">
          {loading ? 'Processing…' : 'Submit report'}
        </button>
      </form>

      {error ? <p className="mt-4 flex items-center gap-2 text-sm text-rose-300"><AlertCircle className="h-4 w-4" />{error}</p> : null}
      {success ? <p className="mt-4 flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" />{success}</p> : null}

      {result ? (
        <div className="mt-6 rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-white">Decision summary</p>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200">{result.decision.risk_level}</span>
          </div>
          <p className="text-slate-300">{result.explanation.summary}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Department</p>
              <p className="mt-1 font-semibold text-white">{result.decision.department}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Recommended action</p>
              <p className="mt-1 font-semibold text-white">{result.decision.recommended_action}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Why this route</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-300">
              {result.explanation.rationale.slice(0, 3).map((item) => (
                <li key={item.title} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-white/10 px-3 py-1">Confidence {Math.round(result.decision.confidence * 100)}%</span>
            <span className="rounded-full border border-white/10 px-3 py-1">{result.validation.is_valid ? 'Approved' : 'Needs review'}</span>
            <span className="rounded-full border border-white/10 px-3 py-1">{result.decision.workflow_status?.successful_agents.length ?? 0} agents completed</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
