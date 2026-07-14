import { logger } from '@/config';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';
const FALLBACK_GEMINI_MODEL = 'gemini-2.5-flash';
const DIRECT_GENERATION_CONFIG = {
  temperature: 0.35,
  topP: 0.9,
  maxOutputTokens: 800,
};

export class GeminiService {
  private apiKey: string;
  private clientApiKey: string;
  private model: string;
  private baseUrl: string;
  private useProxy: boolean;

  constructor() {
    this.clientApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const allowClientKey = import.meta.env.DEV || import.meta.env.VITE_GEMINI_USE_CLIENT_KEY === 'true';
    const canUseDirect = allowClientKey && !!this.clientApiKey;
    const allowDevProxy = import.meta.env.VITE_GEMINI_USE_PROXY_IN_DEV === 'true';
    if (canUseDirect) {
      this.useProxy = false;
      this.apiKey = this.clientApiKey;
      this.model = import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
      this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    } else if (import.meta.env.DEV && !allowDevProxy) {
      this.useProxy = false;
      this.apiKey = '';
      this.model = import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
      this.baseUrl = '';
    } else {
      this.useProxy = true;
      this.apiKey = '';
      this.model = import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
      this.baseUrl = '/api/gemini';
    }

    if (import.meta.env.DEV && !canUseDirect && !allowDevProxy) {
      logger.warn('GeminiService: No VITE_GEMINI_API_KEY found. The chatbot will use local responses.');
    } else if (import.meta.env.DEV && !canUseDirect) {
      logger.warn('GeminiService: No VITE_GEMINI_API_KEY found. The chatbot will use the proxy if available, then local responses.');
    }
  }

  public isAvailable(): boolean {
    return this.useProxy || !!this.apiKey;
  }

  private async callModel(
    model: string,
    prompt: string,
    options?: { useProxy?: boolean; apiKey?: string; baseUrl?: string }
  ): Promise<{ text: string | null; status?: number; errorText?: string }> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    const useProxy = options?.useProxy ?? this.useProxy;
    const apiKey = options?.apiKey ?? this.apiKey;
    const baseUrl = options?.baseUrl ?? this.baseUrl;

    try {
      const response = await (useProxy
        ? fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt }),
          signal: controller.signal,
        })
        : fetch(`${baseUrl}/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: DIRECT_GENERATION_CONFIG,
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
      logger.error('GeminiService: Network error', isAbort ? { message: 'Request timed out' } : error);
      return { text: null };
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  public async generateResponse(
    userMessage: string,
    context: string,
    conversationHistory?: Array<{ role: 'user' | 'bot'; content: string }>,
    toneInstructions?: string
  ): Promise<string | null> {
    if (!this.useProxy && !this.apiKey) return null;

    try {
      // Build conversation history string for context
      const historyStr = conversationHistory?.slice(-8).map(msg =>
        `${msg.role === 'user' ? 'User' : 'AdrAI'}: ${msg.content.replace(/<[^>]*>/g, '').slice(0, 200)}`
      ).join('\n') || '';

      const prompt = `You are AdrAI, Adriel Magalona's polished personal portfolio agent on www.adrielmagalona.dev.

PERSONALITY & STYLE:
- Warm, sharp, and visitor-ready; sound like a capable personal agent, not a generic support bot
- Speak about Adriel in third person unless the visitor asks you to draft text as Adriel
- Be specific: cite project names, stacks, awards, dates, and links when the context provides them
- Concise by default: 2-4 polished sentences; use bullets only for comparisons or lists
- Never expose internal labels such as KB, DOM, fallback, prompt, or local knowledge
- Do not invent facts. If the portfolio context does not contain an answer, say so briefly and offer a relevant next step
- Adapt the framing to the visitor profile in AGENT STATE when present: recruiter, technical reviewer, collaborator, student, or general

${toneInstructions ? `TONE ADAPTATION:\n${toneInstructions}\n` : ''}
KNOWLEDGE SCOPE:
You have comprehensive knowledge of Adriel's:
- Projects: Web apps, AI/ML tools, hackathon submissions, and personal experiments
- Tech Stack: React, TypeScript, Python, Firebase, Node.js, AI/ML, and more
- Achievements: National hackathon wins, awards, and recognitions
- Scholarships: DOST-SEI Scholar under RA 7687, MACEMCO Scholar, and Taguig Scholar (Honors) under the Lifeline Assistance for Neighbors In-Need program
- Background: CS student at PUP; scholarship recipient; active in dev communities

RESPONSE GUIDELINES:
1. Answer directly and helpfully — don't be evasive
2. If you know the answer from context, give specifics (project names, tech used, dates)
3. For scholarship questions, list every scholarship in the SCHOLARSHIPS section instead of mentioning only one
4. For hiring or recruiter questions, answer with a candidate-fit judgment backed by project, experience, and award evidence
5. For proof/evidence questions, build a small evidence pack instead of giving generic praise
6. If asked about something not in context, be honest but try to relate to what you know
7. Suggest one natural follow-up only when it genuinely helps
8. For project questions, mention key features and available links
9. Keep formatting clean — no long disclaimers, no excessive headers, no raw source labels

${historyStr ? `RECENT CONVERSATION:\n${historyStr}\n` : ''}
PORTFOLIO CONTEXT:
${context}

USER MESSAGE:
${userMessage}

Respond naturally as AdrAI:`.trim();

      const first = await this.callModel(this.model, prompt);
      if (first.text) return first.text;

      const shouldRetryForModel = first.status === 404 || /not found|model/i.test(first.errorText || '');
      if (shouldRetryForModel && this.model !== FALLBACK_GEMINI_MODEL) {
        const second = await this.callModel(FALLBACK_GEMINI_MODEL, prompt);
        if (second.text) {
          this.model = FALLBACK_GEMINI_MODEL;
          return second.text;
        }
      }

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
            return directSecond.text;
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('GeminiService: Unexpected error', error);
      return null;
    }
  }
}
