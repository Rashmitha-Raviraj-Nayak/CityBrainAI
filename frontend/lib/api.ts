export type RuntimeRequest = {
  title: string;
  description: string;
  category: string;
  location: string;
  source?: string;
  severity_hint?: number;
  metadata?: Record<string, unknown>;
};

export type RuntimeResponse = {
  workflow_id: string;
  decision: {
    workflow_id: string;
    signal_title: string;
    risk_level: string;
    risk_score: number;
    department: string;
    recommended_action: string;
    explanation: string;
    confidence: number;
    officer_brief: string;
    agent_results: Array<Record<string, unknown>>;
    workflow_status?: {
      selected_agents: string[];
      successful_agents: string[];
      failed_agents: string[];
      confidence: number;
    };
  };
  explanation: {
    summary: string;
    rationale: Array<{
      title: string;
      detail: string;
      confidence: number;
    }>;
    evidence: string[];
    confidence: number;
  };
  validation: {
    is_valid: boolean;
    issues: Array<{
      field: string;
      message: string;
    }>;
    score: number;
    data_limitations: string[];
  };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

export async function runRuntime(input: RuntimeRequest): Promise<RuntimeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/run`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Runtime request failed');
  }

  return response.json();
}

export async function getHealthStatus() {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error('Backend health check failed');
  }

  return response.json();
}
