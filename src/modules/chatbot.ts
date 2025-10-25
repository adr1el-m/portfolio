import type { ChatMessage } from '@/types';
import { logger } from '@/config';
import { KB } from '@/data/knowledge-base';

type ProjectItem = (typeof KB.projects)[number];
type AchievementItem = (typeof KB.achievements)[number];

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

  private conversationSummary: string = '';
  private summaryEveryTurns = 10;
  private lastUserMessage: string | null = null;
  private detailedMode: boolean = false;

  // --- Smart helpers for matching and detail preference ---
  private normalize(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s\-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private prefersDetailed(userMessage: string): boolean {
    return /(detail|deep|explain|elaborate|comprehensive|thorough|more info|tell me more|smart)/i.test(userMessage);
  }

  private findProject(userMessage: string) {
    const m = this.normalize(userMessage);
    let bestScore = -Infinity;
    let bestProject: ProjectItem | null = null;
    KB.projects.forEach((p) => {
      const t = this.normalize(p.title);
      let score = 0;
      if (m.includes(t)) score += 3;
      t.split(' ').forEach((tok) => { if (tok && m.includes(tok)) score += 1; });
      if (/ai|agent|ml/.test(m) && /ai|agent|ml/i.test(p.description + ' ' + p.technologies)) score += 2;
      if (score > bestScore) { bestScore = score; bestProject = p; }
    });
    if (bestScore >= 2 && bestProject) return bestProject;
    return null;
  }

  private findAchievement(userMessage: string) {
    const m = this.normalize(userMessage);
    let bestScore = -Infinity;
    let bestAchievement: AchievementItem | null = null;
    KB.achievements.forEach((a) => {
      const t = this.normalize(a.title + ' ' + (a.projectTitle || ''));
      let score = 0;
      if (m.includes(t)) score += 3;
      t.split(' ').forEach((tok) => { if (tok && m.includes(tok)) score += 1; });
      if (score > bestScore) { bestScore = score; bestAchievement = a; }
    });
    if (bestScore >= 2 && bestAchievement) return bestAchievement;
    return null;
  }

  private buildProjectDetailsHTML(p: ProjectItem): string {
    const links: string[] = [];
    if (p.liveUrl) links.push(`Live: <a href="${p.liveUrl}" target="_blank" rel="noopener noreferrer">${p.liveUrl}</a>`);
    if (p.githubUrl) links.push(`GitHub: <a href="${p.githubUrl}" target="_blank" rel="noopener noreferrer">repo</a>`);
    if (p.videoUrl) links.push(`Demo: <a href="${p.videoUrl}" target="_blank" rel="noopener noreferrer">video</a>`);
    if (p.codedexUrl) links.push(`Codedex: <a href="${p.codedexUrl}" target="_blank" rel="noopener noreferrer">profile</a>`);

    return [
      `<strong>${p.title}</strong> — ${p.category}`,
      `${p.description}`,
      `<em>Stack:</em> ${p.technologies}`,
      links.length ? links.join(' | ') : 'No external links available',
    ].join('<br>');
  }

  private buildSkillsHTML(): string {
    const s = KB.skills;
    return [
      `<strong>Core Skills</strong>: ${s.core.join(', ')}`,
      `<strong>Technologies</strong>: ${s.technologies.join(', ')}`,
    ].join('<br>');
  }

  private buildAchievementsHTML(a?: AchievementItem): string {
    if (a) {
      const links: string[] = [];
      if (a.githubUrl) links.push(`GitHub: <a href="${a.githubUrl}" target="_blank" rel="noopener noreferrer">repo</a>`);
      if (a.linkedinUrl) links.push(`Post: <a href="${a.linkedinUrl}" target="_blank" rel="noopener noreferrer">LinkedIn</a>`);
      return [
        `<strong>${a.title}</strong> — ${a.location} (${a.date})`,
        `${a.description || 'Achievement details available on the honors section.'}`,
        links.length ? links.join(' | ') : 'Links: n/a',
      ].join('<br>');
    }
    const top = KB.achievements.slice(0, 3)
      .map((ach) => `${ach.title} — ${ach.location}`)
      .join('; ');
    return `Top achievements: ${top}. Explore About → Honors & Awards for more.`;
  }

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

  private detectIntent(userMessage: string): 'FAQ' | 'PROJECTS' | 'PROJECT_DETAILS' | 'CONTACT' | 'SKILLS' | 'EDUCATION' | 'ACHIEVEMENTS' | 'ACHIEVEMENT_DETAILS' | 'RESUME' | 'ORGANIZATIONS' | 'GENERAL' {
    const m = userMessage.toLowerCase();
    if (/(faq|question|how|what|why)/.test(m)) return 'FAQ';
    if (/(resume|cv)/.test(m)) return 'RESUME';
    if (/(org|organization|community|club)/.test(m)) return 'ORGANIZATIONS';
    if (/(project|portfolio|work)/.test(m)) {
      // If a specific project seems referenced, route to detail
      const p = this.findProject(userMessage);
      return p ? 'PROJECT_DETAILS' : 'PROJECTS';
    }
    if (/(contact|email|reach|message)/.test(m)) return 'CONTACT';
    if (/(skill|tech|technology|stack)/.test(m)) return 'SKILLS';
    if (/(education|school|university|study)/.test(m)) return 'EDUCATION';
    if (/(award|achievement|hackathon|win)/.test(m)) {
      const a = this.findAchievement(userMessage);
      return a ? 'ACHIEVEMENT_DETAILS' : 'ACHIEVEMENTS';
    }
    return 'GENERAL';
  }

  private getSuggestions(intent: ReturnType<typeof this.detectIntent>): string[] {
    const last = this.lastUserMessage || '';
    const p = this.findProject(last);
    const a = this.findAchievement(last);
    if (intent === 'PROJECT_DETAILS' && p) {
      const proj = p as ProjectItem;
      const sugg = ['Open Projects section', 'Show tech stack', 'Any live demo?'];
      if (proj.githubUrl) sugg.unshift('Open GitHub repo');
      if (proj.liveUrl) sugg.unshift('Open live site');
      return sugg;
    }
    if (intent === 'ACHIEVEMENT_DETAILS' && a) {
      return ['Show awards timeline', 'Any related project?', 'Open honors section'];
    }
    switch (intent) {
      case 'PROJECTS':
        return ['Show recent projects', 'Which project used AI?', 'Link to Projects section'];
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
      case 'RESUME':
        return ['Open resume', 'Share contact info', 'List skills'];
      case 'ORGANIZATIONS':
        return ['Show organizations', 'Any leadership roles?', 'Related achievements?'];
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
    if (tone === 'concise') return `${text}`;
    if (tone === 'playful') return `${text} 🎉`;
    return `${text}${this.conversationSummary ? `<br><em>Based on our chat:</em> ${this.conversationSummary}` : ''}`;
  }


  private routeIntent(intent: ReturnType<typeof this.detectIntent>, message: string): string {
    switch (intent) {
      case 'PROJECT_DETAILS': {
        const p = this.findProject(message);
        if (p) return this.buildProjectDetailsHTML(p);
        // Fallback
        const top = KB.projects.slice(0, 3)
          .map((p) => `${p.title} — ${p.technologies.split(';')[0]}`)
          .join('; ');
        return `Highlighted projects: ${top}. See Projects section for details and links.`;
      }
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
      case 'RESUME': {
        const c = KB.contact;
        return `Resume: <a href="${c.resumeUrl}" target="_blank" rel="noopener noreferrer">MAGALONA-CV.pdf</a>. For a quick glance, ask "skills" or "projects".`;
      }
      case 'SKILLS': {
        return this.buildSkillsHTML();
      }
      case 'EDUCATION': {
        const e = KB.education
          .map((ed) => `${ed.school}${ed.program ? ` — ${ed.program}` : ''}${ed.period ? ` (${ed.period})` : ''}`)
          .join('; ');
        return `Education: ${e}.`;
      }
      case 'ACHIEVEMENT_DETAILS': {
        const a = this.findAchievement(message);
        return this.buildAchievementsHTML(a || undefined);
      }
      case 'ACHIEVEMENTS': {
        return this.buildAchievementsHTML();
      }
      case 'ORGANIZATIONS': {
        return `Organizations: ${KB.organizations.join('; ')}.`;
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

    this.detailedMode = this.prefersDetailed(userMessage) || this.detailedMode;
    const intent = this.detectIntent(userMessage);
    const botResponse = this.routeIntent(intent, userMessage);
    this.addMessage(this.formatResponse(botResponse, this.detailedMode ? 'detailed' : 'concise'), 'bot');
  }
}
