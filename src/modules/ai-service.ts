import { logger } from '@/config';

/** Server-mediated provider interface. Provider credentials never reach the browser. */
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

  async generateResponse(prompt: string): Promise<string | null> {
    if (!this.isAvailable()) return null;
    return this.callModel(prompt);
  }

  private async callModel(prompt: string): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
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
