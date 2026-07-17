export type GeminiCapability = 'vision' | 'understanding' | 'reasoning' | 'decision' | 'summarization';

export interface GeminiRequestContext {
  title: string;
  description: string;
  category: string;
  location: string;
  severityHint?: number;
  confidence?: number;
  department?: string;
}

export interface GeminiResponse {
  capability: GeminiCapability;
  summary: string;
  confidence: number;
  durationMs: number;
  status: 'ready' | 'mock' | 'error';
}

export interface GeminiServiceAdapter {
  analyzeVision(context: GeminiRequestContext): Promise<GeminiResponse>;
  analyzeText(context: GeminiRequestContext): Promise<GeminiResponse>;
  performStructuredReasoning(context: GeminiRequestContext): Promise<GeminiResponse>;
  supportDecision(context: GeminiRequestContext): Promise<GeminiResponse>;
  summarize(context: GeminiRequestContext): Promise<GeminiResponse>;
}

const createMockResponse = (capability: GeminiCapability, context: GeminiRequestContext): GeminiResponse => ({
  capability,
  summary: `${capability} output synthesized for ${context.title || 'the incident'} using the existing multi-agent workflow.`,
  confidence: Math.min(0.98, 0.78 + (context.severityHint ?? 4) / 20),
  durationMs: 420 + capability.length * 60,
  status: 'mock',
});

export class GeminiService implements GeminiServiceAdapter {
  async analyzeVision(context: GeminiRequestContext) {
    return createMockResponse('vision', context);
  }

  async analyzeText(context: GeminiRequestContext) {
    return createMockResponse('understanding', context);
  }

  async performStructuredReasoning(context: GeminiRequestContext) {
    return createMockResponse('reasoning', context);
  }

  async supportDecision(context: GeminiRequestContext) {
    return createMockResponse('decision', context);
  }

  async summarize(context: GeminiRequestContext) {
    return createMockResponse('summarization', context);
  }
}

export const geminiService = new GeminiService();
