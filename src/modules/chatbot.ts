import type { ChatMessage } from '@/types';
import { logger } from '@/config';
import { KB } from '@/data/knowledge-base';

/**
 * Chatbot Manager Module
 * Handles the chatbot functionality.
 */
export class ChatbotManager {
  private messages: ChatMessage[] = [];
  private chatbox: HTMLElement | null;
  private chatbotBtn: HTMLElement | null;
  private closeBtn: HTMLElement | null;
  private messagesContainer: HTMLElement | null;
  private inputField: HTMLInputElement | null;
  private sendButton: HTMLElement | null;
  private persona = {
    name: 'AdrAI',
    identity: "I'm AdrAI, Adriel's helpful, professional portfolio assistant.",
    tone: 'friendly, concise, and pragmatic',
    guardrails: [
      'No medical, legal, or financial advice beyond portfolio context',
      'No personal data handling beyond public info',
      'Avoid offensive, unsafe, or disallowed content',
    ],
  };
  private conversationSummary: string = '';
  private summaryEveryTurns = 10;
  private lastUserMessage: string | null = null;

  constructor() {
    this.chatbox = document.querySelector('.chatbox');
    this.chatbotBtn = document.querySelector('.chatbot-btn');
    this.closeBtn = document.querySelector('.close-btn');
    this.messagesContainer = document.querySelector('.chatbox-messages');
    this.inputField = document.querySelector('.chatbox-input input') as HTMLInputElement;
    this.sendButton = document.querySelector('.chatbox-input button');

    this.initializeEventListeners();
    this.displayWelcomeMessage();
    logger.log('ChatbotManager initialized');
  }

  private initializeEventListeners(): void {
    if (this.chatbotBtn && this.chatbox) {
      this.chatbotBtn.addEventListener('click', () => this.toggleChatbox());
    }
    if (this.closeBtn && this.chatbox) {
      this.closeBtn.addEventListener('click', () => this.toggleChatbox());
    }
    if (this.sendButton) {
      this.sendButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }
    // Prevent default form submission
    const form = document.querySelector('.chatbox-input');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }
    if (this.inputField) {
      this.inputField.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
  }

  private toggleChatbox(): void {
    if (this.chatbox) {
      this.chatbox.classList.toggle('active');
    }
  }

  private displayWelcomeMessage(): void {
    const welcomeMessage = "👋 Hi! I'm AdrAI, Adriel's AI assistant. I can help you learn more about his skills, projects, and experience. What would you like to know?";
    this.addMessage(welcomeMessage, 'bot');
  }

  private sendMessage(): void {
    if (!this.inputField || !this.inputField.value.trim()) return;

    const userMessage = this.inputField.value.trim();
    this.lastUserMessage = userMessage;
    this.addMessage(userMessage, 'user');
    this.inputField.value = '';

    // Show typing indicator
    this.showTypingIndicator();

    // Simulate bot response with a delay
    setTimeout(() => {
      this.hideTypingIndicator();
      this.handleMessage(userMessage);
    }, 1000 + Math.random() * 1000);
  }

  private showTypingIndicator(): void {
    if (!this.messagesContainer) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    this.messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
  }

  private hideTypingIndicator(): void {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  public addMessage(text: string, sender: 'user' | 'bot'): void {
    const message: ChatMessage = {
      role: sender,
      content: text,
      timestamp: new Date(),
    };
    this.messages.push(message);
    this.displayMessage(text, sender);
    this.maybeSummarize();
  }

  private displayMessage(text: string, sender: 'user' | 'bot'): void {
    if (!this.messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'user' ? 'user-message' : 'bot-message'}`;
    if (sender === 'bot' && /<a\b|<br\/?>(?:\s*|)|<strong>|<em>/.test(text)) {
      messageDiv.innerHTML = text;
    } else {
      messageDiv.textContent = text;
    }
    this.messagesContainer.appendChild(messageDiv);

    // After bot responses, render action row (suggestions)
    if (sender === 'bot') {
      const actions = document.createElement('div');
      actions.className = 'bot-actions';
      actions.style.display = 'flex';
      actions.style.flexWrap = 'wrap';
      actions.style.gap = '6px';
      actions.style.margin = '4px 0 8px 0';

      const intent = this.detectIntent(this.lastUserMessage || '');
      const suggestions = this.getSuggestions(intent);
      suggestions.forEach((sugg) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = sugg;
        btn.setAttribute('aria-label', `Suggestion: ${sugg}`);
        btn.style.padding = '6px 10px';
        btn.style.borderRadius = '12px';
        btn.style.border = '1px solid rgba(255,215,0,0.3)';
        btn.style.background = '#242424';
        btn.style.color = '#fff';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => this.handleSuggestionClick(sugg));
        actions.appendChild(btn);
      });

      this.messagesContainer.appendChild(actions);
    }

    this.scrollToBottom();
  }

  private handleSuggestionClick(text: string): void {
    if (!text) return;
    if (this.inputField) this.inputField.value = text;
    this.sendMessage();
  }

  private detectIntent(userMessage: string): 'FAQ' | 'PROJECTS' | 'CONTACT' | 'SKILLS' | 'EDUCATION' | 'ACHIEVEMENTS' | 'GENERAL' {
    const m = userMessage.toLowerCase();
    if (/(faq|question|how|what|why)/.test(m)) return 'FAQ';
    if (/(project|portfolio|work)/.test(m)) return 'PROJECTS';
    if (/(contact|email|reach|message)/.test(m)) return 'CONTACT';
    if (/(skill|tech|technology|stack)/.test(m)) return 'SKILLS';
    if (/(education|school|university|study)/.test(m)) return 'EDUCATION';
    if (/(award|achievement|hackathon|win)/.test(m)) return 'ACHIEVEMENTS';
    return 'GENERAL';
  }

  private getSuggestions(intent: ReturnType<typeof this.detectIntent>): string[] {
    switch (intent) {
      case 'PROJECTS':
        return ['Show recent projects', 'Link to Projects section', 'Which project used AI?'];
      case 'CONTACT':
        return ['What is your email?', 'How to connect on LinkedIn?', 'Share GitHub link'];
      case 'SKILLS':
        return ['List core skills', 'Favorite tech stack?', 'Any databases used?'];
      case 'EDUCATION':
        return ['Where do you study?', 'What’s your major?', 'Graduation year?'];
      case 'ACHIEVEMENTS':
        return ['Top hackathon wins', 'Details on Technovation 2025', 'Show awards timeline'];
      case 'FAQ':
        return ['What can you do?', 'How is the site built?', 'Is there a resume?'];
      default:
        return ['Show projects', 'Share contact info', 'List skills'];
    }
  }

  private applyGuardrails(userMessage: string): string | null {
    const m = userMessage.toLowerCase();
    // Very lightweight guardrails
    if (/(medical|diagnose|prescription|legal advice|lawsuit|attorney|dangerous|harm)/.test(m)) {
      return "I can’t help with medical, legal, or unsafe topics. I’m here to discuss Adriel’s portfolio, projects, skills, and experience.";
    }
    if (/(password|credit card|ssn|social security|pii)/.test(m)) {
      return "For privacy and safety, I can’t process or request sensitive personal data. I can provide public profile and contact information.";
    }
    return null;
  }

  private formatResponse(text: string, tone: 'concise'|'detailed'|'playful' = 'concise'): string {
    const prefix = `${this.persona.identity}`;
    if (tone === 'concise') return `${text}`;
    if (tone === 'playful') return `${text} 🎉`;
    // detailed
    return `${text}${this.conversationSummary ? `\n\nBased on our chat: ${this.conversationSummary}` : ''}`;
  }


  private routeIntent(intent: ReturnType<typeof this.detectIntent>, message: string): string {
    switch (intent) {
      case 'PROJECTS': {
        const top = KB.projects.slice(0, 3)
          .map((p) => `${p.title} — ${p.technologies.split(';')[0]}`)
          .join('; ');
        return `Highlighted projects: ${top}. See Projects section for details and links.`;
      }
      case 'CONTACT': {
        const c = KB.contact;
        return [
          `Email: <a href="mailto:${c.email}">${c.email}</a>.`,
          `GitHub: <a href="${c.github}" target="_blank" rel="noopener noreferrer">${c.github}</a>.`,
          `LinkedIn: <a href="${c.linkedin}" target="_blank" rel="noopener noreferrer">${c.linkedin}</a>.`,
          `Resume: <a href="${c.resumeUrl}" target="_blank" rel="noopener noreferrer">MAGALONA-CV.pdf</a>.`,
        ].join('<br>');
      }
      case 'SKILLS': {
        const s = KB.skills;
        return `Core: ${s.core.join(', ')}. Technologies: ${s.technologies.join(', ')}.`;
      }
      case 'EDUCATION': {
        const e = KB.education
          .map((ed) => `${ed.school}${ed.program ? ` — ${ed.program}` : ''}${ed.period ? ` (${ed.period})` : ''}`)
          .join('; ');
        return `Education: ${e}.`;
      }
      case 'ACHIEVEMENTS': {
        const a = KB.achievements.slice(0, 3)
          .map((ach) => `${ach.title} — ${ach.location}`)
          .join('; ');
        return `Top achievements: ${a}. Explore About → Honors & Awards for more.`;
      }
      case 'FAQ': {
        return `I can help you navigate sections, share highlights, and surface links (e.g., resume, projects, achievements). Ask me anything about the portfolio!`;
      }
      default: {
        return `${KB.profile.title}. ${KB.profile.summary} Learn more via Projects, Skills, and Achievements — or ask for specifics.`;
      }
    }
  }

  private maybeSummarize(): void {
    // Summarize every N turns to keep a compact context
    if (this.messages.length % this.summaryEveryTurns === 0) {
      const lastFew = this.messages.slice(-this.summaryEveryTurns);
      const topics = lastFew
        .filter((m) => m.role === 'user')
        .map((m) => m.content.toLowerCase())
        .map((c) => {
          if (/(project|portfolio|work)/.test(c)) return 'projects';
          if (/(contact|email|reach)/.test(c)) return 'contact';
          if (/(skill|tech|technology)/.test(c)) return 'skills';
          if (/(education|school|university)/.test(c)) return 'education';
          if (/(award|achievement|hackathon)/.test(c)) return 'achievements';
          return 'general';
        });
      const counts = topics.reduce<Record<string, number>>((acc, t) => {
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});
      const summary = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `${t}(${n})`)
        .join(', ');
      this.conversationSummary = summary ? `Topics discussed: ${summary}` : '';

      // Trim older messages to keep memory tight
      if (this.messages.length > 50) {
        this.messages = this.messages.slice(-30);
      }
    }
  }

  private handleMessage(userMessage: string): void {
    const guard = this.applyGuardrails(userMessage);
    if (guard) {
      this.addMessage(this.formatResponse(guard, 'concise'), 'bot');
      return;
    }

    const intent = this.detectIntent(userMessage);
    const botResponse = this.routeIntent(intent, userMessage);
    this.addMessage(this.formatResponse(botResponse, 'concise'), 'bot');
  }
}
