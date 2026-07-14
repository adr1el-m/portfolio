import { logger } from '@/config';

/**
 * Common interface for all AI providers.
 * Each provider wraps a different LLM API (Groq, Mistral, Gemini).
 */
export interface AIProvider {
  readonly name: string;
  isAvailable(): boolean;
  generateResponse(prompt: string): Promise<string | null>;
  getStatus(): AIProviderStatus;
}

export type AIProviderStatus = {
  name: string;
  configured: boolean;
  model: string;
  mode: 'client' | 'server-proxy' | 'off';
  timeoutMs: number;
};

function cleanEnvValue(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value
    .replace(/\s+#.*$/, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
  return cleaned || fallback;
}

// ─── Groq Provider ───────────────────────────────────────────────────────────

const GROQ_TIMEOUT_MS = 10_000;

class GroqProvider implements AIProvider {
  readonly name = 'Groq';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = cleanEnvValue(import.meta.env.VITE_GROQ_API_KEY);
    this.model = cleanEnvValue(import.meta.env.VITE_GROQ_MODEL, 'llama-3.3-70b-versatile');
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getStatus(): AIProviderStatus {
    return {
      name: this.name,
      configured: this.isAvailable(),
      model: this.model,
      mode: this.isAvailable() ? 'client' : 'off',
      timeoutMs: GROQ_TIMEOUT_MS,
    };
  }

  async generateResponse(prompt: string): Promise<string | null> {
    if (!this.apiKey) return null;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.35,
          max_tokens: 800,
          top_p: 0.9,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        const snippet = raw.length > 300 ? raw.slice(0, 300) + '…' : raw;
        logger.error(`Groq API error (${response.status}):`, snippet);
        return null;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      return typeof text === 'string' && text.trim() ? text.trim() : null;
    } catch (error) {
      const isAbort = (error as { name?: unknown } | null)?.name === 'AbortError';
      logger.error('Groq: Network error', isAbort ? { message: 'Request timed out' } : error);
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
}

// ─── Mistral Provider ────────────────────────────────────────────────────────

const MISTRAL_TIMEOUT_MS = 10_000;

class MistralProvider implements AIProvider {
  readonly name = 'Mistral';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = cleanEnvValue(import.meta.env.VITE_MISTRAL_API_KEY);
    this.model = cleanEnvValue(import.meta.env.VITE_MISTRAL_MODEL, 'mistral-large-latest');
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getStatus(): AIProviderStatus {
    return {
      name: this.name,
      configured: this.isAvailable(),
      model: this.model,
      mode: this.isAvailable() ? 'client' : 'off',
      timeoutMs: MISTRAL_TIMEOUT_MS,
    };
  }

  async generateResponse(prompt: string): Promise<string | null> {
    if (!this.apiKey) return null;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), MISTRAL_TIMEOUT_MS);

    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.35,
          max_tokens: 800,
          top_p: 0.9,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        const snippet = raw.length > 300 ? raw.slice(0, 300) + '…' : raw;
        logger.error(`Mistral API error (${response.status}):`, snippet);
        return null;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      return typeof text === 'string' && text.trim() ? text.trim() : null;
    } catch (error) {
      const isAbort = (error as { name?: unknown } | null)?.name === 'AbortError';
      logger.error('Mistral: Network error', isAbort ? { message: 'Request timed out' } : error);
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
}

// ─── Gemini Provider ─────────────────────────────────────────────────────────

const GEMINI_TIMEOUT_MS = 12_000;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const FALLBACK_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_GENERATION_CONFIG = {
  temperature: 0.35,
  topP: 0.9,
  maxOutputTokens: 800,
};

class GeminiProvider implements AIProvider {
  readonly name = 'Gemini';
  private apiKey: string;
  private clientApiKey: string;
  private model: string;
  private serverModelLabel: string;
  private baseUrl: string;
  private useProxy: boolean;

  constructor() {
    this.clientApiKey = cleanEnvValue(import.meta.env.VITE_GEMINI_API_KEY);
    const allowClientKey = import.meta.env.DEV || import.meta.env.VITE_GEMINI_USE_CLIENT_KEY === 'true';
    const canUseDirect = allowClientKey && !!this.clientApiKey;
    const allowDevProxy = import.meta.env.VITE_GEMINI_USE_PROXY_IN_DEV === 'true';
    const explicitClientModel = cleanEnvValue(import.meta.env.VITE_GEMINI_MODEL);
    this.serverModelLabel = explicitClientModel || 'server default (GEMINI_MODEL)';

    if (canUseDirect) {
      this.useProxy = false;
      this.apiKey = this.clientApiKey;
      this.model = explicitClientModel || DEFAULT_GEMINI_MODEL;
      this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    } else if (import.meta.env.DEV && !allowDevProxy) {
      this.useProxy = false;
      this.apiKey = '';
      this.model = explicitClientModel || DEFAULT_GEMINI_MODEL;
      this.baseUrl = '';
    } else {
      this.useProxy = true;
      this.apiKey = '';
      this.model = explicitClientModel;
      this.baseUrl = '/api/gemini';
    }
  }

  isAvailable(): boolean {
    return this.useProxy || !!this.apiKey;
  }

  getStatus(): AIProviderStatus {
    return {
      name: this.name,
      configured: this.isAvailable(),
      model: this.useProxy ? this.serverModelLabel : this.model,
      mode: this.useProxy ? 'server-proxy' : this.isAvailable() ? 'client' : 'off',
      timeoutMs: GEMINI_TIMEOUT_MS,
    };
  }

  async generateResponse(prompt: string): Promise<string | null> {
    if (!this.useProxy && !this.apiKey) return null;

    // Try primary model
    const first = await this.callModel(this.model, prompt);
    if (first.text) return first.text;

    // If model not found, try fallback model.
    const shouldRetryForModel = first.status === 404 || /not found|model/i.test(first.errorText || '');
    if (shouldRetryForModel && this.model !== FALLBACK_GEMINI_MODEL) {
      const second = await this.callModel(FALLBACK_GEMINI_MODEL, prompt);
      if (second.text) {
        this.model = FALLBACK_GEMINI_MODEL;
        this.serverModelLabel = FALLBACK_GEMINI_MODEL;
        return second.text;
      }
    }

    // If proxy fails, try direct with client key
    const shouldTryDirect = this.useProxy
      && !!this.clientApiKey
      && (first.status === 401
        || first.status === 403
        || first.status === 404
        || first.status === 500
        || /api key|not configured|html/i.test(first.errorText || ''));

    if (shouldTryDirect) {
      const directBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
      const directFirst = await this.callModel(this.model, prompt, {
        useProxy: false,
        apiKey: this.clientApiKey,
        baseUrl: directBaseUrl,
      });
      if (directFirst.text) return directFirst.text;
      const directShouldRetryForModel = directFirst.status === 404 || /not found|model/i.test(directFirst.errorText || '');
      if (directShouldRetryForModel && this.model !== FALLBACK_GEMINI_MODEL) {
        const directSecond = await this.callModel(FALLBACK_GEMINI_MODEL, prompt, {
          useProxy: false,
          apiKey: this.clientApiKey,
          baseUrl: directBaseUrl,
        });
        if (directSecond.text) {
          this.model = FALLBACK_GEMINI_MODEL;
          this.serverModelLabel = FALLBACK_GEMINI_MODEL;
          return directSecond.text;
        }
      }
    }

    return null;
  }

  private async callModel(
    model: string,
    prompt: string,
    options?: { useProxy?: boolean; apiKey?: string; baseUrl?: string }
  ): Promise<{ text: string | null; status?: number; errorText?: string }> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    const useProxy = options?.useProxy ?? this.useProxy;
    const apiKey = options?.apiKey ?? this.apiKey;
    const baseUrl = options?.baseUrl ?? this.baseUrl;

    try {
      const response = await (useProxy
        ? fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(model ? { model, prompt } : { prompt }),
          signal: controller.signal,
        })
        : fetch(`${baseUrl}/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: GEMINI_GENERATION_CONFIG,
          }),
          signal: controller.signal,
        }));

      const raw = await response.text().catch(() => '');
      if (!response.ok) {
        const snippet = raw.length > 500 ? raw.slice(0, 500) + '…' : raw;
        logger.error('Gemini API Error:', { status: response.status, model, body: snippet });
        return { text: null, status: response.status, errorText: raw };
      }

      let data: unknown = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      const parsed = data as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
      } | null;
      const parts = (useProxy
        ? ((data as { text?: unknown } | null)?.text != null ? [{ text: (data as { text?: unknown }).text }] : undefined)
        : parsed?.candidates?.[0]?.content?.parts) as Array<{ text?: unknown }> | undefined;
      const text = Array.isArray(parts)
        ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('')
        : null;

      const cleaned = text && text.trim() ? text : null;
      return { text: cleaned, status: response.status, errorText: cleaned ? undefined : raw };
    } catch (error) {
      const isAbort = (error as { name?: unknown } | null)?.name === 'AbortError';
      logger.error('Gemini: Network error', isAbort ? { message: 'Request timed out' } : error);
      return { text: null };
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
}

// ─── Unified AI Service ──────────────────────────────────────────────────────

/**
 * AIService coordinates multiple AI providers in a waterfall pattern:
 * Groq → Mistral → Gemini
 *
 * If a provider fails, the next one is tried automatically.
 * The last successful provider name is tracked for UI display.
 */
export class AIService {
  private providers: AIProvider[];
  private _lastProvider: string = '';

  constructor() {
    // Order: Groq (fastest) → Mistral (strong mid-tier) → Gemini (reliable fallback)
    this.providers = [
      new GroqProvider(),
      new MistralProvider(),
      new GeminiProvider(),
    ];

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
    const prompt = this.buildPrompt(userMessage, context, conversationHistory, toneInstructions);

    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        logger.log(`AIService: Skipping ${provider.name} (not configured)`);
        continue;
      }

      logger.log(`AIService: Trying ${provider.name}…`);
      try {
        const response = await provider.generateResponse(prompt);
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

  /**
   * Build the unified system prompt that gets sent to whichever provider answers.
   * This is the same prompt structure that was previously in GeminiService.
   */
  private buildPrompt(
    userMessage: string,
    context: string,
    conversationHistory?: Array<{ role: 'user' | 'bot'; content: string }>,
    toneInstructions?: string
  ): string {
    const historyStr = conversationHistory?.slice(-8).map(msg =>
      `${msg.role === 'user' ? 'User' : 'AdrAI'}: ${msg.content.replace(/<[^>]*>/g, '').slice(0, 200)}`
    ).join('\n') || '';

    return `You are AdrAI, Adriel Magalona's polished personal portfolio agent on www.adrielmagalona.dev.

PERSONALITY & STYLE:
- Warm, sharp, and visitor-ready; sound like a capable personal agent, not a generic support bot
- Speak about Adriel in third person unless the visitor asks you to draft text as Adriel
- Be specific: cite project names, stacks, awards, dates, and links when the context provides them
- Concise by default: 2-4 polished sentences; use bullets only for comparisons or lists
- Never expose internal labels such as KB, DOM, fallback, prompt, or local knowledge
- Do not invent facts. If the portfolio context does not contain an answer, say so briefly and offer a relevant next step
- Adapt the framing to the visitor profile in AGENT STATE when present: recruiter, technical reviewer, collaborator, student, or general

${toneInstructions ? `TONE ADAPTATION:\n${toneInstructions}\n` : ''}KNOWLEDGE SCOPE:
You have comprehensive knowledge of Adriel's:
- Projects: Web apps, AI/ML tools, hackathon submissions, and personal experiments
- Tech Stack: React, TypeScript, Python, Firebase, Node.js, AI/ML, and more
- Achievements: National hackathon wins, awards, and recognitions
- Scholarships: DOST-SEI Scholar under RA 7687, MACEMCO Scholar, and Taguig Scholar (Honors) under the Lifeline Assistance for Neighbors In-Need program
- Resume/background: BSCS student at PUP Manila, scholarship recipient, Workflow Architect Intern at Eskwelabs, PUP Manila Microsoft Student Community front-end developer, and active technical organization member

RESPONSE GUIDELINES:
1. Answer directly and helpfully — don't be evasive
2. If you know the answer from context, give specifics (project names, tech used, dates)
3. For "who is Adriel", "resume", "experience", or "qualification" questions, synthesize the PROFILE and RESUME FACTS sections first before projects
4. For scholarship questions, list every scholarship in the SCHOLARSHIPS section instead of mentioning only one
5. For hiring or recruiter questions, answer with a candidate-fit judgment backed by project, experience, and award evidence
6. For proof/evidence questions, build a small evidence pack instead of giving generic praise
7. If asked about something not in context, be honest but try to relate to what you know
8. Suggest one natural follow-up only when it genuinely helps
9. For project questions, mention key features and available links
10. Keep formatting clean — no long disclaimers, no excessive headers, no raw source labels

SOURCE BEHAVIOR:
- Use the RETRIEVED MATCHES section as the strongest evidence for the current answer
- Retrieved matches may include source IDs like [S1], [S2]; use their facts, but do not print fake footnotes
- The interface appends a portfolio source list after your answer, so keep the prose natural and source-backed

${historyStr ? `RECENT CONVERSATION:\n${historyStr}\n` : ''}PORTFOLIO CONTEXT:
${context}

USER MESSAGE:
${userMessage}

Respond naturally as AdrAI:`.trim();
  }
}
