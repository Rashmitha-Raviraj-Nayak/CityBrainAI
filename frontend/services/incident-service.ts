import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from '@/firebase/config';

export type IncidentStatus = 'draft' | 'submitted' | 'pending' | 'reviewed' | 'escalated' | 'resolved';

export interface IncidentRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  severity_hint: number;
  source: string;
  status: IncidentStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  department?: string;
  confidence?: number;
  recommendation?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  locationDetails?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface IncidentDecisionSupport {
  department?: string;
  riskLevel?: string;
  recommendation?: string;
  confidence?: number;
  executiveSummary?: string;
  riskExplanation?: string;
  summary?: string;
  actionPlan?: string[];
  resources?: string[];
  timeline?: string;
  reasoning?: Array<{ title: string; detail: string; confidence: number }>;
  validationScore?: number;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export type IncidentMediaKind = 'image' | 'video' | 'audio';

const LOCAL_STORAGE_KEY = 'citybrain-incidents';
const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function validateIncidentMedia(file: File, kind: IncidentMediaKind = 'image') {
  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    audio: ['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'],
  } satisfies Record<IncidentMediaKind, string[]>;

  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return `File exceeds the ${MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.`;
  }

  if (!allowedTypes[kind].includes(file.type)) {
    return `Unsupported ${kind} format. Please upload an approved ${kind} file.`;
  }

  return null;
}

function readLocalIncidents(): IncidentRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawValue = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as IncidentRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalIncidents(items: IncidentRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
}

function getIncidentsCollection() {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  return collection(db, 'incidents');
}

export async function createIncident(input: Omit<IncidentRecord, 'id'>) {
  if (!isFirebaseConfigured || !db) {
    const nextItems = [
      ...readLocalIncidents(),
      {
        ...input,
        id: `local-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: input.status || 'submitted',
      },
    ];
    writeLocalIncidents(nextItems);
    return { id: nextItems[nextItems.length - 1].id };
  }

  const incidentsCollection = getIncidentsCollection();
  if (!incidentsCollection) {
    return { id: `local-${Date.now()}` };
  }
  const payload = {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: input.status || 'submitted',
  };

  const docRef = await addDoc(incidentsCollection, payload);
  return { id: docRef.id };
}

export async function getIncidents() {
  if (!isFirebaseConfigured || !db) {
    return readLocalIncidents();
  }

  const incidentsCollection = getIncidentsCollection();
  if (!incidentsCollection) {
    return readLocalIncidents();
  }

  const q = query(incidentsCollection, orderBy('createdAt', 'desc'), limit(25));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as IncidentRecord;
    return { ...data, id: docSnapshot.id };
  });
}

export async function getIncident(id: string) {
  if (!isFirebaseConfigured || !db) {
    return readLocalIncidents().find((incident) => incident.id === id) ?? null;
  }

  const snapshot = await getDoc(doc(db, 'incidents', id));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as IncidentRecord;
  return { ...data, id: snapshot.id };
}

export async function updateIncident(id: string, updates: Partial<IncidentRecord>) {
  if (!isFirebaseConfigured || !db) {
    const nextItems = readLocalIncidents().map((incident) => (incident.id === id ? { ...incident, ...updates, updatedAt: new Date().toISOString() } : incident));
    writeLocalIncidents(nextItems);
    return;
  }

  await updateDoc(doc(db, 'incidents', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export function getIncidentStats(incidents: IncidentRecord[]) {
  const pending = incidents.filter((incident) => incident.status === 'pending').length;
  const escalated = incidents.filter((incident) => incident.status === 'escalated').length;
  const reviewed = incidents.filter((incident) => incident.status === 'reviewed').length;
  const averageSeverity = incidents.length
    ? Math.round(incidents.reduce((sum, incident) => sum + (incident.severity_hint ?? 0), 0) / incidents.length)
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

export function getIncidentDecisionSupport(incident: IncidentRecord): IncidentDecisionSupport {
  const metadata = (incident.metadata ?? {}) as Record<string, unknown>;
  const reasoning = Array.isArray(metadata.reasoning)
    ? metadata.reasoning
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map((item) => ({
          title: typeof item.title === 'string' ? item.title : 'Reasoning step',
          detail: typeof item.detail === 'string' ? item.detail : 'The workflow assessed risk and routing confidence.',
          confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
        }))
    : [];

  return {
    department: typeof metadata.department === 'string' ? metadata.department : typeof incident.department === 'string' ? incident.department : 'Operations',
    riskLevel: typeof metadata.riskLevel === 'string' ? metadata.riskLevel : 'monitor',
    recommendation: typeof metadata.recommendation === 'string' ? metadata.recommendation : typeof incident.recommendation === 'string' ? incident.recommendation : 'Assess escalation path',
    confidence: typeof metadata.confidence === 'number' ? metadata.confidence : typeof incident.confidence === 'number' ? incident.confidence : undefined,
    executiveSummary: typeof metadata.executiveSummary === 'string' ? metadata.executiveSummary : undefined,
    riskExplanation: typeof metadata.riskExplanation === 'string' ? metadata.riskExplanation : undefined,
    summary: typeof metadata.summary === 'string' ? metadata.summary : undefined,
    actionPlan: Array.isArray(metadata.actionPlan) ? metadata.actionPlan.filter((item): item is string => typeof item === 'string') : [],
    resources: Array.isArray(metadata.resources) ? metadata.resources.filter((item): item is string => typeof item === 'string') : [],
    timeline: typeof metadata.timeline === 'string' ? metadata.timeline : undefined,
    reasoning,
    validationScore: typeof metadata.validationScore === 'number' ? metadata.validationScore : undefined,
  };
}

export function subscribeToIncidents(callback: (items: IncidentRecord[]) => void) {
  if (!isFirebaseConfigured || !db) {
    callback(readLocalIncidents());
    return () => undefined;
  }

  const incidentsCollection = getIncidentsCollection();
  if (!incidentsCollection) {
    callback(readLocalIncidents());
    return () => undefined;
  }

  const q = query(incidentsCollection, orderBy('createdAt', 'desc'), limit(25));
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() as IncidentRecord;
        return { ...data, id: docSnapshot.id };
      }),
    );
  });
}

export function uploadIncidentImage(file: File, onProgress: (progress: UploadProgress) => void) {
  return uploadIncidentMedia(file, onProgress, 'image');
}

export function uploadIncidentMedia(file: File, onProgress: (progress: UploadProgress) => void, kind: IncidentMediaKind = 'image') {
  const validationError = validateIncidentMedia(file, kind);
  if (validationError) {
    return Promise.reject(new Error(validationError));
  }

  if (!isFirebaseConfigured || !storage) {
    onProgress({ bytesTransferred: file.size, totalBytes: file.size, percentage: 100 });
    return Promise.resolve({ downloadUrl: URL.createObjectURL(file), path: `local/${kind}/${file.name}` });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const storageRef = ref(storage, `incidents/${kind}/${Date.now()}-${safeName}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise<{ downloadUrl: string; path: string }>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percentage = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress({ bytesTransferred: snapshot.bytesTransferred, totalBytes: snapshot.totalBytes, percentage });
      },
      reject,
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ downloadUrl, path: uploadTask.snapshot.ref.fullPath });
      },
    );
  });
}
