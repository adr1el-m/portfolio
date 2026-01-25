import { logger } from '@/config';

export class GeminiService {
  private apiKey: string;
  private clientApiKey: string;
  private model: string;
  private baseUrl: string;
  private useProxy: boolean;

  constructor() {
    this.clientApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const canUseDirect = !!this.clientApiKey;
    if (import.meta.env.DEV || canUseDirect) {
      this.useProxy = false;
      this.apiKey = this.clientApiKey;
      this.model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
      this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    } else {
      this.useProxy = true;
      this.apiKey = '';
      this.model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
      this.baseUrl = '/api/gemini';
    }

    if (!this.useProxy && !this.apiKey) {
      logger.warn('GeminiService: No API key found. Chatbot will use local responses only.');
    }
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

      const prompt = `You are AdrAI, Adriel Magalona's personal AI assistant on his portfolio website (adriel.dev).

PERSONALITY & STYLE:
- Friendly, enthusiastic, and professional — like a knowledgeable colleague
- Proud of Adriel's accomplishments but humble and genuine
- Proactive in suggesting related topics or deeper dives
- Concise by default (1-3 sentences), thorough when explicitly asked
- Use occasional emojis sparingly to add warmth (1 max per response)
- Never be robotic or overly formal

${toneInstructions ? `TONE ADAPTATION:\n${toneInstructions}\n` : ''}
KNOWLEDGE SCOPE:
You have comprehensive knowledge of Adriel's:
- Projects: Web apps, AI/ML tools, hackathon submissions, and personal experiments
- Tech Stack: React, TypeScript, Python, Firebase, Node.js, AI/ML, and more
- Achievements: National hackathon wins, awards, and recognitions
- Background: CS student at PUP, DOST-SEI scholar, active in dev communities
- Organizations: GDSC, AWS Cloud Club, Microsoft Student Community, TPG

RESPONSE GUIDELINES:
1. Answer directly and helpfully — don't be evasive
2. If you know the answer from context, give specifics (project names, tech used, dates)
3. If asked about something not in context, be honest but try to relate to what you know
4. Suggest follow-ups naturally: "Want to know more about the tech stack?" 
5. For project questions, mention key features and available links
6. Keep formatting simple — avoid excessive bullet points or headers in short responses

${historyStr ? `RECENT CONVERSATION:\n${historyStr}\n` : ''}
PORTFOLIO CONTEXT:
${context}

USER MESSAGE:
${userMessage}

Respond naturally as AdrAI:`.trim();

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
        if (directShouldRetryForModel && this.model !== fallbackModel) {
          const directSecond = await this.callModel(fallbackModel, prompt, {
            useProxy: false,
            apiKey: this.clientApiKey,
            baseUrl: directBaseUrl,
          });
          if (directSecond.text) {
            this.model = fallbackModel;
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
