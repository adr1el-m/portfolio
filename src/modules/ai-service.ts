import { logger } from '@/config';

/**
 * What the browser sends. The persona, rules and scope are owned by the
 * server (api/gemini.js), so the endpoint can't be used as a general proxy.
 */
export type AIRequest = {
  message: string;
  context: string;
  history: Array<{ role: 'user' | 'bot'; content: string }>;
  tone?: string;
};

/** Server-mediated provider interface. Provider credentials never reach the browser. */
export interface AIProvider {
  readonly name: string;
  isAvailable(): boolean;
  generateResponse(request: AIRequest): Promise<string | null>;
  getStatus(): AIProviderStatus;
}

export type AIProviderStatus = {
  name: string;
  configured: boolean;
  model: string;
  mode: 'client' | 'server-proxy' | 'off';
  timeoutMs: number;
};

const GEMINI_TIMEOUT_MS = 12_000;

class PortfolioAIProxy implements AIProvider {
  readonly name = 'AdrAI proxy';

  isAvailable(): boolean {
    return !import.meta.env.DEV || import.meta.env.VITE_AI_PROXY_IN_DEV === 'true';
  }

  getStatus(): AIProviderStatus {
    return {
      name: this.name,
      configured: this.isAvailable(),
      model: 'server-managed',
      mode: this.isAvailable() ? 'server-proxy' : 'off',
      timeoutMs: GEMINI_TIMEOUT_MS,
    };
  }

  async generateResponse(request: AIRequest): Promise<string | null> {
    if (!this.isAvailable()) return null;
    return this.callModel(request);
  }

  private async callModel(request: AIRequest): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const raw = await response.text().catch(() => '');
      if (!response.ok) {
        const snippet = raw.length > 500 ? raw.slice(0, 500) + '…' : raw;
        logger.error('AdrAI proxy error:', { status: response.status, body: snippet });
        return null;
      }

      let data: unknown = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      const text = (data as { text?: unknown } | null)?.text;
      return typeof text === 'string' && text.trim() ? text.trim() : null;
    } catch (error) {
      const isAbort = (error as { name?: unknown } | null)?.name === 'AbortError';
      logger.error('Gemini: Network error', isAbort ? { message: 'Request timed out' } : error);
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
}

// ─── Unified AI Service ──────────────────────────────────────────────────────

/**
 * AIService keeps model access behind the portfolio server endpoint. Local
 * portfolio answers remain available when the endpoint is unavailable.
 */
export class AIService {
  private providers: AIProvider[];
  private _lastProvider: string = '';

  constructor() {
    this.providers = [new PortfolioAIProxy()];

    const available = this.providers.filter(p => p.isAvailable()).map(p => p.name);
    if (available.length > 0) {
      logger.log(`AIService: ${available.length} provider(s) available: ${available.join(', ')}`);
    } else {
      logger.warn('AIService: No AI providers configured. Chatbot will use local responses only.');
    }
  }

  /** True if at least one provider has a valid API key / proxy configured */
  public isAvailable(): boolean {
    return this.providers.some(p => p.isAvailable());
  }

  /** The name of the provider that answered the last successful call */
  public get lastProvider(): string {
    return this._lastProvider;
  }

  /** Safe provider diagnostics for UI/debug display. Never includes API keys. */
  public getProviderStatuses(): AIProviderStatus[] {
    return this.providers.map((provider) => provider.getStatus());
  }

  /**
   * Generate a response by trying each available provider in order.
   * Returns the first successful response, or null if all providers fail.
   */
  public async generateResponse(
    userMessage: string,
    context: string,
    conversationHistory?: Array<{ role: 'user' | 'bot'; content: string }>,
    toneInstructions?: string
  ): Promise<string | null> {
    const request: AIRequest = {
      message: userMessage.slice(0, 800),
      context,
      history: (conversationHistory || []).slice(-8).map((msg) => ({
        role: msg.role,
        content: msg.content.replace(/<[^>]*>/g, '').slice(0, 300),
      })),
      tone: toneInstructions,
    };

    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        logger.log(`AIService: Skipping ${provider.name} (not configured)`);
        continue;
      }

      logger.log(`AIService: Trying ${provider.name}…`);
      try {
        const response = await provider.generateResponse(request);
        if (response) {
          this._lastProvider = provider.name;
          logger.log(`AIService: ✓ ${provider.name} responded successfully`);
          return response;
        }
        logger.warn(`AIService: ${provider.name} returned null, trying next…`);
      } catch (error) {
        logger.error(`AIService: ${provider.name} threw error, trying next…`, error);
      }
    }

    logger.warn('AIService: All providers failed');
    this._lastProvider = '';
    return null;
  }
}
