export type IncidentRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  severity_hint: number;
  source: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'escalated';
  department?: string;
  confidence?: number;
  recommendation?: string;
};

const STORAGE_KEY = 'citybrain-incidents';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function loadIncidents(): IncidentRecord[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as IncidentRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIncident(record: IncidentRecord) {
  if (!isBrowser()) {
    return;
  }

  const next = [record, ...loadIncidents()].slice(0, 12);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function persistRuntimeOutcome(
  input: {
    title: string;
    description: string;
    category: string;
    location: string;
    source?: string;
    severity_hint?: number;
  },
  response: {
    decision: {
      department: string;
      confidence: number;
      recommended_action: string;
      risk_level: string;
    };
  },
) {
  const record: IncidentRecord = {
    id: `${Date.now()}`,
    title: input.title || 'Untitled report',
    description: input.description || 'No additional context provided.',
    category: input.category || 'unknown',
    location: input.location || 'Unknown location',
    severity_hint: input.severity_hint ?? 0,
    source: input.source || 'web',
    createdAt: new Date().toISOString(),
    status: response.decision.risk_level === 'critical' ? 'escalated' : 'pending',
    department: response.decision.department,
    confidence: response.decision.confidence,
    recommendation: response.decision.recommended_action,
  };

  saveIncident(record);
  return record;
}

export function getIncidentStats(incidents: IncidentRecord[]) {
  const pending = incidents.filter((incident) => incident.status === 'pending').length;
  const escalated = incidents.filter((incident) => incident.status === 'escalated').length;
  const reviewed = incidents.filter((incident) => incident.status === 'reviewed').length;
  const averageSeverity = incidents.length
    ? Math.round(incidents.reduce((sum, incident) => sum + incident.severity_hint, 0) / incidents.length)
    : 0;

  return {
    pending,
    escalated,
    reviewed,
    averageSeverity,
    total: incidents.length,
  };
}

export function getLatestIncident(incidents: IncidentRecord[]) {
  return incidents[0] ?? null;
}
