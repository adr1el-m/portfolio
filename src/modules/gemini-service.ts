import { logger } from '@/config';

export class GeminiService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private useProxy: boolean;

  constructor() {
    this.useProxy = Boolean(import.meta.env.PROD) &&
      typeof window !== 'undefined' &&
      !/^(localhost|127\.0\.0\.1)/.test(window.location.hostname);
    this.apiKey = this.useProxy ? '' : (import.meta.env.VITE_GEMINI_API_KEY || '');
    this.model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
    this.baseUrl = this.useProxy ? '/api/gemini' : 'https://generativelanguage.googleapis.com/v1beta/models';

    if (!this.useProxy && !this.apiKey) {
      logger.warn('GeminiService: No API key found. Chatbot will use local responses only.');
    }
  }

  private async callModel(model: string, prompt: string): Promise<{ text: string | null; status?: number; errorText?: string }> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await (this.useProxy
        ? fetch(this.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt }),
          signal: controller.signal,
        })
        : fetch(`${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`, {
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
          }),
          signal: controller.signal,
        }));

      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        const snippet = raw.length > 500 ? raw.slice(0, 500) + '…' : raw;
        logger.error('Gemini API Error:', { status: response.status, model, body: snippet });
        return { text: null, status: response.status, errorText: raw };
      }

      const data = await response.json().catch(() => null);
      const parts = (this.useProxy
        ? (data?.text != null ? [{ text: data?.text }] : undefined)
        : (data?.candidates?.[0]?.content?.parts)) as Array<{ text?: unknown }> | undefined;
      const text = Array.isArray(parts)
        ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('')
        : null;

      return { text: text && text.trim() ? text : null };
    } catch (error) {
      const isAbort = (error as { name?: unknown } | null)?.name === 'AbortError';
      logger.error('GeminiService: Network error', isAbort ? { message: 'Request timed out' } : error);
      return { text: null };
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  public async generateResponse(userMessage: string, context: string): Promise<string | null> {
    if (!this.useProxy && !this.apiKey) return null;

    try {
      const prompt = `
You are adrAI, a friendly and professional AI assistant for Adriel's portfolio website. 
Your goal is to help visitors learn about Adriel's projects, skills, and achievements.

CONTEXT FROM PORTFOLIO:
${context}

USER MESSAGE:
${userMessage}

INSTRUCTIONS:
- Answer the user's question based on the provided context.
- If the context answers the question, summarize it engagingly.
- If the context doesn't have the answer, use your general knowledge to answer politely or ask for clarification, but always try to relate it back to Adriel if possible.
- Keep responses concise (under 3 sentences) unless the user asks for details.
- Be enthusiastic but professional.
- Do not mention that you are provided with context text. Just answer naturally.
      `.trim();

      const first = await this.callModel(this.model, prompt);
      if (first.text) return first.text;

      const fallbackModel = 'gemini-2.5-flash';
      const shouldRetryForModel = first.status === 404 || /not found|model/i.test(first.errorText || '');
      if (shouldRetryForModel && this.model !== fallbackModel) {
        const second = await this.callModel(fallbackModel, prompt);
        if (second.text) {
          this.model = fallbackModel;
          return second.text;
        }
      }

      return null;
    } catch (error) {
      logger.error('GeminiService: Unexpected error', error);
      return null;
    }
  }
}
