import type { ChatMessage, ProjectData, AchievementData } from '@/types';
import { logger } from '@/config';
import { KB } from '@/data/knowledge-base';
import { Search } from '@/modules/search';
import { GeminiService } from './gemini-service';

// Use explicit data interfaces to avoid accidental 'never' inference
type ProjectItem = ProjectData;
type AchievementItem = AchievementData;

// Shared intent and entity types to avoid using `this` in type positions
type IntentType =
  | 'FAQ'
  | 'PROJECTS'
  | 'PROJECT_DETAILS'
  | 'CONTACT'
  | 'SKILLS'
  | 'DATABASE'
  | 'EDUCATION'
  | 'ACHIEVEMENTS'
  | 'ACHIEVEMENT_DETAILS'
  | 'RESUME'
  | 'ORGANIZATIONS'
  | 'GENERAL';

type ExtractedEntities = {
  projects: string[];
  achievements: string[];
  technologies: string[];
};

// Unified retrieval types
type SourceOrigin = 'KB' | 'DOM' | 'Search';
type Citation = {
  label: string;
  href?: string;
  section?: 'projects' | 'about' | 'contact' | 'skills' | 'organizations' | 'education';
  selector?: string;
  origin: SourceOrigin;
};
type ProjectFacts = {
  tech: string[];
  links: { github?: string; live?: string; codedex?: string; video?: string };
  highlights: string[];
};
type IndexedItem = {
  id: string;
  kind: 'project' | 'achievement' | 'skill' | 'contact' | 'education' | 'organization';
  title: string;
  text?: string;
  tags?: string[];
  url?: string;
  citation: Citation;
  data?: unknown;
  facts?: ProjectFacts;
};

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
  private summaryEveryTurns = 6;
  private lastUserMessage: string | null = null;
  private detailedMode: boolean = false;
  private userPrefs: { detailedMode: boolean } = { detailedMode: false };
  private geminiService: GeminiService;
  
  // Add focus management state
  private previouslyFocusedElement: HTMLElement | null = null;
  private focusTrapHandler?: (e: KeyboardEvent) => void;

  // Unified index and topic summaries
  private unifiedIndex: IndexedItem[] = [];
  private topicSummaries: { projects: string; skills: string; achievements: string } = {
    projects: '',
    skills: '',
    achievements: '',
  };
  
  // --- Smart helpers for matching and detail preference ---
  private normalize(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Tokenize for fuzzy matching
  private tokenize(text: string): string[] {
    return this.normalize(text).split(' ').filter(Boolean);
  }

  // Jaccard similarity between token sets
  private jaccard(aTokens: string[], bTokens: string[]): number {
    if (!aTokens.length || !bTokens.length) return 0;
    const a = new Set(aTokens);
    const b = new Set(bTokens);
    let intersect = 0;
    a.forEach((tok) => { if (b.has(tok)) intersect++; });
    const union = new Set([...aTokens, ...bTokens]).size;
    return union ? intersect / union : 0;
  }

  // Composite fuzzy score combining inclusion and Jaccard similarity
  private fuzzyScore(haystack: string, needle: string): number {
    const h = this.normalize(haystack);
    const n = this.normalize(needle);
    const inc = h.includes(n) ? 0.6 : 0;
    const jac = this.jaccard(this.tokenize(haystack), this.tokenize(needle));
    return inc + jac; // range roughly 0..1.6
  }

  private prefersDetailed(userMessage: string): boolean {
    return /(detail|deep|explain|elaborate|comprehensive|thorough|more info|tell me more|smart)/i.test(userMessage);
  }

  private findProject(userMessage: string): ProjectItem | null {
    const msg = userMessage;
    const mNorm = this.normalize(msg);
    const mTokens = this.tokenize(msg);
    let bestScore = -Infinity;
    let bestProject: ProjectItem | null = null;

    const aiCue = /(ai|agent|ml|machine learning|openai|langchain)/i.test(msg);

    KB.projects.forEach((p) => {
      const titleNorm = this.normalize(p.title);
      const titleTokens = this.tokenize(p.title);
      const techTokens = this.tokenize(p.technologies || '');
      const descTokens = this.tokenize(p.description || '');

      // Base similarity on title
      let score = this.jaccard(mTokens, titleTokens) * 5;

      score += this.fuzzyScore(p.title, msg) * 2;

      // Exact inclusion gets a strong boost
      if (mNorm.includes(titleNorm)) score += 3;

      // Partial token overlaps against technologies and description
      const techJac = this.jaccard(mTokens, techTokens);
      const descJac = this.jaccard(mTokens, descTokens);
      score += techJac * 2 + descJac * 1.5;

      // Cues for AI/ML agents
      if (aiCue && /(ai|agent|ml|machine learning)/i.test((p.description || '') + ' ' + (p.technologies || ''))) score += 2.5;

      if (score > bestScore) { bestScore = score; bestProject = p; }
    });

    // Threshold tuned to avoid random picks
    if (bestProject && bestScore >= 2) return bestProject;
    return null;
  }

  private findAchievement(userMessage: string): AchievementItem | null {
    const msg = userMessage;
    const mTokens = this.tokenize(msg);
    let bestScore = -Infinity;
    let bestAchievement: AchievementItem | null = null;

    KB.achievements.forEach((a) => {
      const titleTokens = this.tokenize(a.title);
      const projTokens = this.tokenize(a.projectTitle || '');
      const descTokens = this.tokenize(a.description || '');
      let score = this.jaccard(mTokens, titleTokens) * 4 + this.jaccard(mTokens, projTokens) * 2 + this.jaccard(mTokens, descTokens) * 1.5;
      // Exact match boost
      const tNorm = this.normalize(a.title + ' ' + (a.projectTitle || ''));
      if (this.normalize(msg).includes(tNorm)) score += 2.5;
      if (score > bestScore) { bestScore = score; bestAchievement = a; }
    });
    if (bestAchievement && bestScore >= 2) return bestAchievement;
    return null;
  }

  // Build unified index from KB + DOM + Search
  private buildUnifiedIndex(): void {
    const index: IndexedItem[] = [];

    // KB projects
    KB.projects.forEach((p, i) => {
      const facts = this.normalizeProjectFacts({
        title: p.title,
        technologies: p.technologies,
        githubUrl: p.githubUrl,
        liveUrl: p.liveUrl,
        codedexUrl: p.codedexUrl,
        videoUrl: p.videoUrl,
      });
      index.push({
        id: `kb-project-${i}`,
        kind: 'project',
        title: p.title,
        text: p.description,
        tags: (p.technologies || '').split(/[;,]/).map(t => t.trim()).filter(Boolean),
        url: p.githubUrl || p.liveUrl || p.codedexUrl || undefined,
        citation: { label: `KB › Projects › ${p.title}`, section: 'projects', origin: 'KB' },
        data: p,
        facts,
      });
    });

    // KB achievements
    KB.achievements.forEach((a, i) => {
      index.push({
        id: `kb-ach-${i}`,
        kind: 'achievement',
        title: a.title,
        text: a.description,
        tags: [a.organizer, a.location].filter(Boolean),
        url: a.githubUrl || a.linkedinUrl || a.blogUrl || undefined,
        citation: { label: `KB › Achievements › ${a.title}`, section: 'about', origin: 'KB' },
        data: a,
      });
    });

    // KB skills
    KB.skills.technologies.forEach((t, i) => {
      index.push({
        id: `kb-skill-${i}`,
        kind: 'skill',
        title: t,
        citation: { label: 'KB › Skills', section: 'skills', origin: 'KB' },
      });
    });

    // KB contact
    index.push({
      id: 'kb-contact-email',
      kind: 'contact',
      title: 'Email',
      url: `mailto:${KB.contact.email}`,
      citation: { label: 'KB › Contact › Email', section: 'contact', origin: 'KB', href: `mailto:${KB.contact.email}` },
    });
    index.push({
      id: 'kb-contact-github',
      kind: 'contact',
      title: 'GitHub',
      url: KB.contact.github,
      citation: { label: 'KB › Contact › GitHub', section: 'contact', origin: 'KB', href: KB.contact.github },
    });
    index.push({
      id: 'kb-contact-linkedin',
      kind: 'contact',
      title: 'LinkedIn',
      url: KB.contact.linkedin,
      citation: { label: 'KB › Contact › LinkedIn', section: 'contact', origin: 'KB', href: KB.contact.linkedin },
    });
    index.push({
      id: 'kb-contact-resume',
      kind: 'contact',
      title: 'Resume',
      url: KB.contact.resumeUrl,
      citation: { label: 'KB › Contact › Resume', section: 'contact', origin: 'KB', href: KB.contact.resumeUrl },
    });

    // KB education
    KB.education.forEach((e, i) => {
      index.push({
        id: `kb-edu-${i}`,
        kind: 'education',
        title: e.school,
        text: [e.program, e.period].filter(Boolean).join(' — '),
        citation: { label: `KB › Education › ${e.school}`, section: 'education', origin: 'KB' },
        data: e,
      });
    });

    // KB organizations
    KB.organizations.forEach((org, i) => {
      index.push({
        id: `kb-org-${i}`,
        kind: 'organization',
        title: org,
        citation: { label: 'KB › Organizations', section: 'organizations', origin: 'KB' },
      });
    });

    // DOM projects
    const domProjects = this.getProjectsFromDOM();
    domProjects.forEach((p, i) => {
      index.push({
        id: `dom-project-${i}`,
        kind: 'project',
        title: p.title,
        text: p.description,
        tags: (p.technologies || '').split(/[;,]/).map(t => t.trim()).filter(Boolean),
        url: p.githubUrl || p.liveUrl || p.videoUrl,
        citation: { label: `Projects › Card › ${p.title}`, section: 'projects', origin: 'DOM', selector: `.project-item .project-title:contains(${p.title})` },
        data: p,
        facts: this.normalizeProjectFacts({
          title: p.title,
          technologies: p.technologies,
          githubUrl: p.githubUrl,
          liveUrl: p.liveUrl,
          codedexUrl: undefined,
          videoUrl: p.videoUrl,
        }),
      });
    });

    // DOM achievements cards
    Array.from(document.querySelectorAll<HTMLElement>('.achievement-card, .achievement-item .achievement-card')).forEach((el, i) => {
      const title = el.querySelector('.card-title, .h4.card-title')?.textContent?.trim() || 'Achievement';
      const desc = el.querySelector('.card-subtitle')?.textContent?.trim() || undefined;
      index.push({
        id: `dom-ach-${i}`,
        kind: 'achievement',
        title,
        text: desc,
        citation: { label: `About › Achievement Card › ${title}`, section: 'about', origin: 'DOM', selector: '.achievement-card' },
      });
    });

    // Search-like results (sections only, for broad citation)
    // We approximate by adding high-level section anchors
    index.push({ id: 'sec-projects', kind: 'project', title: 'Projects Section', citation: { label: 'Section › Projects', section: 'projects', origin: 'Search' } });
    index.push({ id: 'sec-skills', kind: 'skill', title: 'Skills Section', citation: { label: 'Section › Skills', section: 'skills', origin: 'Search' } });
    index.push({ id: 'sec-achievements', kind: 'achievement', title: 'Achievements Section', citation: { label: 'Section › Achievements', section: 'about', origin: 'Search' } });
    index.push({ id: 'sec-contact', kind: 'contact', title: 'Contact Section', citation: { label: 'Section › Contact', section: 'contact', origin: 'Search' } });
    index.push({ id: 'sec-education', kind: 'education', title: 'Education Section', citation: { label: 'Section › Education', section: 'education', origin: 'Search' } });
    index.push({ id: 'sec-organizations', kind: 'organization', title: 'Organizations Section', citation: { label: 'Section › Organizations', section: 'organizations', origin: 'Search' } });

    this.unifiedIndex = index;
  }

  // Normalize structured facts from base project data and modal content
  private normalizeProjectFacts(input: { title: string; technologies?: string; githubUrl?: string; liveUrl?: string; codedexUrl?: string; videoUrl?: string; }): ProjectFacts {
    const tech = (input.technologies || '')
      .split(/[;,]/)
      .map(t => t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '').trim())
      .filter(Boolean);
    const links = { github: input.githubUrl, live: input.liveUrl, codedex: input.codedexUrl, video: input.videoUrl };
    const highlights = this.extractHighlightsFromModal(input.title);
    return { tech, links, highlights };
  }

  private extractHighlightsFromModal(title: string): string[] {
    const modalBody = document.querySelector('.project-info-description');
    if (!modalBody) return [];
    const text = modalBody.innerHTML.toLowerCase();
    if (!text || !text.includes(title.toLowerCase())) {
      // If content doesn't correspond to the requested title, skip
      return [];
    }
    const highlights: string[] = [];
    const sections = Array.from(modalBody.querySelectorAll('h4, h5')) as HTMLElement[];
    let inHighlights = false;
    sections.forEach((h) => {
      const ht = h.textContent?.toLowerCase() || '';
      inHighlights = /highlights|features/.test(ht) ? true : (/tech\s*stack/.test(ht) ? false : inHighlights);
      if (inHighlights) {
        const nextUl = h.nextElementSibling as HTMLElement | null;
        if (nextUl && nextUl.tagName.toLowerCase() === 'ul') {
          Array.from(nextUl.querySelectorAll('li')).forEach(li => {
            const t = li.textContent?.trim();
            if (t) highlights.push(t);
          });
        }
      }
    });
    return highlights;
  }

  private buildCitationsHTML(cites: Citation[]): string {
    if (!cites.length) return '';
    const items = cites.map(c => {
      const label = c.label || (c.section ? `Section › ${c.section}` : 'Source');
      const href = c.href ? `<a href="${c.href}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
      return `<li>${href} <span style="color:var(--light-gray-70)">(${c.origin})</span></li>`;
    }).join('');
    return `<div class="sources"><small>Sources</small><ul>${items}</ul></div>`;
  }

  private buildProjectDetailsHTML(p: ProjectItem): string {
    const links: string[] = [];
    if (p.liveUrl) links.push(`Live: <a href="${p.liveUrl}" target="_blank" rel="noopener noreferrer">${p.liveUrl}</a>`);
    if (p.githubUrl) links.push(`GitHub: <a href="${p.githubUrl}" target="_blank" rel="noopener noreferrer">repo</a>`);
    if (p.videoUrl) links.push(`Demo: <a href="${p.videoUrl}" target="_blank" rel="noopener noreferrer">video</a>`);
    if (p.codedexUrl) links.push(`Codedex: <a href="${p.codedexUrl}" target="_blank" rel="noopener noreferrer">profile</a>`);

    // Pull normalized facts from unified index for highlights and additional links
    const facts = this.unifiedIndex.find((it) => it.kind === 'project' && this.normalize(it.title) === this.normalize(p.title))?.facts;
    const highlights = facts?.highlights?.length ? `<br><em>Highlights:</em> ${facts.highlights.join('; ')}` : '';
    const factLinks: string[] = [];
    if (facts?.links?.live && !links.some(l => l.includes('Live:'))) factLinks.push(`Live: <a href="${facts.links.live}" target="_blank" rel="noopener noreferrer">${facts.links.live}</a>`);
    if (facts?.links?.github && !links.some(l => l.includes('GitHub:'))) factLinks.push(`GitHub: <a href="${facts.links.github}" target="_blank" rel="noopener noreferrer">repo</a>`);
    if (facts?.links?.video && !links.some(l => l.includes('Demo:'))) factLinks.push(`Demo: <a href="${facts.links.video}" target="_blank" rel="noopener noreferrer">video</a>`);
    if (facts?.links?.codedex && !links.some(l => l.includes('Codedex:'))) factLinks.push(`Codedex: <a href="${facts.links.codedex}" target="_blank" rel="noopener noreferrer">profile</a>`);
    const allLinks = [...links, ...factLinks];

    return [
      `<strong>${p.title}</strong> — ${p.category}`,
      `${p.description}`,
      `<em>Stack:</em> ${p.technologies}`,
      allLinks.length ? allLinks.join(' | ') : 'No external links available',
      highlights,
    ].filter(Boolean).join('<br>');
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

    this.geminiService = new GeminiService();

    // Initialize ARIA state
    if (this.chatbotBtn) this.chatbotBtn.setAttribute('aria-expanded', 'false');
    if (this.chatbox) {
      const isActive = this.chatbox.classList.contains('active');
      this.chatbox.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      if (!isActive) this.chatbox.setAttribute('inert', '');
    }

    this.loadPreferences();
    this.detailedMode = this.userPrefs.detailedMode;
    // Build unified retrieval index once UI is ready
    this.buildUnifiedIndex();
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
    if (!this.chatbox) return;

    const isOpen = this.chatbox.classList.contains('active');

    if (!isOpen) {
      // Open dialog
      this.previouslyFocusedElement = document.activeElement as HTMLElement;
      this.chatbox.classList.add('active');
      this.chatbox.setAttribute('aria-hidden', 'false');
      this.chatbox.removeAttribute('inert');
      if (this.chatbotBtn) this.chatbotBtn.setAttribute('aria-expanded', 'true');

      // Focus the first interactive element inside the dialog
      const focusTarget = this.inputField || this.closeBtn || this.chatbox;
      try { (focusTarget as HTMLElement)?.focus({ preventScroll: true }); } catch { /* ignore */ }

      // Trap focus within the dialog and handle Escape
      this.focusTrapHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.toggleChatbox();
          return;
        }
        if (e.key !== 'Tab') return;
        const focusables = Array.from(this.chatbox!.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        )).filter(el => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      };
      this.chatbox.addEventListener('keydown', this.focusTrapHandler);
    } else {
      // Close dialog
      this.chatbox.classList.remove('active');
      this.chatbox.setAttribute('aria-hidden', 'true');
      this.chatbox.setAttribute('inert', '');
      if (this.chatbotBtn) this.chatbotBtn.setAttribute('aria-expanded', 'false');

      // Remove focus trap
      if (this.focusTrapHandler) {
        this.chatbox.removeEventListener('keydown', this.focusTrapHandler);
        this.focusTrapHandler = undefined;
      }

      // Restore focus to the trigger or previous element
      const restoreTarget = this.chatbotBtn ?? this.previouslyFocusedElement;
      try { restoreTarget?.focus({ preventScroll: true }); } catch { void 0; }
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
    // Render bot messages as HTML (we control the markup builders)
    if (sender === 'bot') {
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
    // Actionable suggestions
    const t = text.toLowerCase();
    if (t.includes('open projects')) {
      this.addMessage('Navigating to Projects…', 'bot');
      this.navigateToSection('projects');
      return;
    }
    if (t.includes('open honors') || t.includes('show awards timeline')) {
      this.addMessage('Opening Achievements in About…', 'bot');
      this.navigateToSection('about');
      // Try to scroll to achievements area if present
      setTimeout(() => {
        const anchor = document.getElementById('achievements') || document.querySelector('.achievements, .achievement-card') as HTMLElement | null;
        anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return;
    }
    if (t.includes('open resume')) {
      const url = KB.contact.resumeUrl;
      if (url) {
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch { /* ignore */ }
        this.addMessage('Opening resume…', 'bot');
        return;
      }
    }
    if (t.includes('open github repo')) {
      const p = this.findProject(this.lastUserMessage || '');
      if (p && p.githubUrl) {
        try { window.open(p.githubUrl, '_blank', 'noopener,noreferrer'); } catch { /* ignore */ }
        this.addMessage(`Opening GitHub repo for ${p.title}…`, 'bot');
        return;
      } else {
        this.addMessage('I couldn’t find a matching project with a GitHub link.', 'bot');
        return;
      }
    }
    if (t.includes('open live site')) {
      const p = this.findProject(this.lastUserMessage || '');
      if (p && p.liveUrl) {
        try { window.open(p.liveUrl, '_blank', 'noopener,noreferrer'); } catch { /* ignore */ }
        this.addMessage(`Opening live site for ${p.title}…`, 'bot');
        return;
      } else {
        this.addMessage('I couldn’t find a matching project with a live site.', 'bot');
        return;
      }
    }
    if (t.includes('any live demo')) {
      const p = this.findProject(this.lastUserMessage || '');
      const url = p ? (p.videoUrl || p.liveUrl) : undefined;
      if (url) {
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch { void 0; }
        this.addMessage(`Opening demo for ${p ? p.title : 'project'}…`, 'bot');
        return;
      } else {
        this.addMessage('No demo or live link matched your request.', 'bot');
        return;
      }
    }
    if (t.includes('list github repos')) {
      const repos = KB.projects.filter(pr => pr.githubUrl).map(pr => `<a href="${pr.githubUrl}" target="_blank" rel="noopener noreferrer">${pr.title}</a>`);
      const html = repos.length ? `<strong>GitHub Repos</strong><br>${repos.join('<br>')}` : 'No GitHub repositories listed.';
      this.addMessage(html, 'bot');
      return;
    }
    if (t.startsWith('search ') || t.includes('search site')) {
      const qMatch = text.replace(/^(search\s+site\s+for\s+|search\s+)/i, '').trim();
      const q = qMatch || (this.lastUserMessage || '').trim();
      if (q) {
        this.addMessage(`Searching site for “${q}”…`, 'bot');
        this.openSearchOverlay(q);
        return;
      }
    }

    // Fallback: treat as user input and send
    if (this.inputField) this.inputField.value = text;
    this.sendMessage();
  }

  private navigateToSection(section: 'about' | 'background' | 'projects' | 'organizations' | 'contact'): void {
    const label = section === 'contact' ? 'about' : section;
    const btns = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-link]'));
    const targetBtn = btns.find((b) => (b.textContent || '').trim().toLowerCase() === label);
    if (targetBtn) { targetBtn.click(); return; }
    // Fallback: toggle articles directly
    document.querySelectorAll<HTMLElement>('[data-page]').forEach((a) => a.classList.remove('active'));
    const art = document.querySelector<HTMLElement>(`[data-page="${label}"]`);
    art?.classList.add('active');
    if (section === 'contact') {
      setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  }

  private openSearchOverlay(query: string): void {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('q', query);
      window.history.replaceState({}, '', url.toString());
    } catch { /* ignore */ }
    // Instantiate overlay (module guards and builds overlay if ?q exists)
    try { new Search(); } catch { /* ignore */ }
  }
  // === New: DOM-driven Projects extraction and listing ===
  private getProjectsFromDOM(): Array<{
    title: string;
    category: string;
    description?: string;
    technologies?: string;
    githubUrl?: string;
    liveUrl?: string;
    videoUrl?: string;
  }> {
    const items = Array.from(document.querySelectorAll('article.projects ul.project-list li.project-item')) as HTMLElement[];
    return items.map((el) => {
      const title = el.querySelector('.project-title')?.textContent?.trim() || 'Untitled Project';
      return {
        title,
        category: el.getAttribute('data-category') || 'Project',
        description: el.getAttribute('data-description') || undefined,
        technologies: el.getAttribute('data-technologies') || undefined,
        githubUrl: el.getAttribute('data-github') || undefined,
        liveUrl: el.getAttribute('data-live') || undefined,
        videoUrl: el.getAttribute('data-video') || undefined,
      };
    });
  }

  private buildProjectsListHTML(projects: ReturnType<typeof this.getProjectsFromDOM>): string {
    if (!projects.length) {
      // Fallback to KB projects (all)
      const all = KB.projects
        .map((p) => `<strong>${p.title}</strong> — ${p.category}`)
        .join('<br>');
      return `Projects overview:<br>${all}`;
    }

    const header = `<strong>Projects (${projects.length})</strong> — from the Projects section`;
    const body = projects.map((p) => {
      const links: string[] = [];
      if (p.liveUrl) links.push(`<a href="${p.liveUrl}" target="_blank" rel="noopener noreferrer">Live</a>`);
      if (p.githubUrl) links.push(`<a href="${p.githubUrl}" target="_blank" rel="noopener noreferrer">GitHub</a>`);
      if (p.videoUrl) links.push(`<a href="${p.videoUrl}" target="_blank" rel="noopener noreferrer">Demo</a>`);
      const linkStr = links.length ? ` — ${links.join(' | ')}` : '';
      const tech = p.technologies ? `<br><em>Stack:</em> ${p.technologies}` : '';
      const desc = p.description ? `<br>${p.description}` : '';
      return `<strong>${p.title}</strong> — ${p.category}${linkStr}${tech}${desc}`;
    }).join('<br><br>');

    return `${header}<br>${body}`;
  }
  // === End new ===

  // Multi-intent: entity extraction from DOM and KB
  private extractEntities(userMessage: string): ExtractedEntities {
    const msg = this.normalize(userMessage);
    const msgTokens = this.tokenize(userMessage);

    // Collect candidate names from KB and DOM
    const projectCandidates = new Set<string>();
    KB.projects.forEach(p => projectCandidates.add(this.normalize(p.title)));
    this.getProjectsFromDOM().forEach(p => projectCandidates.add(this.normalize(p.title)));

    const achievementCandidates = new Set<string>();
    KB.achievements.forEach(a => {
      achievementCandidates.add(this.normalize(a.title));
      if (a.projectTitle) achievementCandidates.add(this.normalize(a.projectTitle));
      if (a.organizer) achievementCandidates.add(this.normalize(a.organizer));
    });

    const techCandidates = new Set<string>();
    KB.skills.technologies.forEach(t => techCandidates.add(this.normalize(t)));
    // Also gather tech from projects in DOM and KB
    this.getProjectsFromDOM().forEach(p => {
      (p.technologies || '').split(/[,;]/).forEach(tok => {
        const n = this.normalize(tok);
        if (n) techCandidates.add(n);
      });
    });
    KB.projects.forEach(p => {
      (p.technologies || '').split(/[,;]/).forEach(tok => {
        const n = this.normalize(tok);
        if (n) techCandidates.add(n);
      });
    });

    // Match by fuzzy similarity with a lenient threshold, fallback to inclusion
    const projects = Array.from(projectCandidates).filter(name => {
      if (!name) return false;
      const score = this.jaccard(msgTokens, this.tokenize(name));
      return score >= 0.4 || msg.includes(name);
    });
    const achievements = Array.from(achievementCandidates).filter(name => {
      if (!name) return false;
      const score = this.jaccard(msgTokens, this.tokenize(name));
      return score >= 0.4 || msg.includes(name);
    });
    const technologies = Array.from(techCandidates).filter(name => {
      if (!name) return false;
      const score = this.jaccard(msgTokens, this.tokenize(name));
      return score >= 0.35 || msg.includes(name);
    });

    return { projects, achievements, technologies };
  }

  // Multi-intent: score intents with keyword weights and entity boosts
  private scoreIntents(userMessage: string, entities: ExtractedEntities): Array<{ intent: IntentType, score: number }>{
    const m = this.normalize(userMessage);

    const hasProjectEntity = entities.projects.length > 0;
    const hasAchievementEntity = entities.achievements.length > 0;
    const hasDbTech = entities.technologies.some(t => /(mysql|firebase|firestore)/.test(t));

    const weights: Record<IntentType, number> = {
      PROJECT_DETAILS: 0,
      PROJECTS: 0,
      CONTACT: 0,
      SKILLS: 0,
      DATABASE: 0,
      EDUCATION: 0,
      ACHIEVEMENT_DETAILS: 0,
      ACHIEVEMENTS: 0,
      RESUME: 0,
      ORGANIZATIONS: 0,
      FAQ: 0,
      GENERAL: 0,
    };

    const bump = (intent: keyof typeof weights, n = 1) => { weights[intent] += n; };

    // Keyword signals
    if (/(\bproject(s)?\b|portfolio|work|show project|list project)/.test(m)) bump('PROJECTS', 2);
    if (/(\bcontact\b|email|reach|message)/.test(m)) bump('CONTACT', 2);
    if (/(\bskill(s)?\b|tech|technology|stack|language|framework|tools)/.test(m)) bump('SKILLS', 2);
    if (/(\bdatabase(s)?\b|sql|mysql|firebase|firestore)/.test(m)) bump('DATABASE', 2);
    if (/(\beducation\b|school|university|study|major|graduate)/.test(m)) bump('EDUCATION', 2);
    if (/(\baward(s)?\b|achievement(s)?\b|hackathon|win|won|prize|finalist|honorable mention)/.test(m)) bump('ACHIEVEMENTS', 2);
    if (/(\bresume\b|cv)/.test(m)) bump('RESUME', 2);
    if (/(\borg(anization)?s?\b|community|club)/.test(m)) bump('ORGANIZATIONS', 1);
    if (/(\bfaq\b|how is|what is|why is|explain)/.test(m)) bump('FAQ', 1);

    // Additional contact cues (social profiles and explicit link requests)
    if (/(github|git|linked?in|resume|\bcv\b|mailto|\blink\b)/.test(m)) bump('CONTACT', 2);
    // Code/demo cues tilt toward specific project details and listings
    if (/(repo|source|code|github|live|demo|site)/.test(m)) bump('PROJECT_DETAILS', 1);
    if (/(search|find|look up)/.test(m)) bump('PROJECTS', 1);

    // Entity boosts and specificity
    if (hasProjectEntity) { bump('PROJECT_DETAILS', 4); bump('PROJECTS', 1); }
    if (hasAchievementEntity) { bump('ACHIEVEMENT_DETAILS', 4); bump('ACHIEVEMENTS', 1); }
    if (hasDbTech) { bump('DATABASE', 2); bump('SKILLS', 1); }

    // Action phrases can tip to details
    if (/(open|details|more about|tell me about|show me)/.test(m) && hasProjectEntity) bump('PROJECT_DETAILS', 2);
    if (/(open|details|more about|tell me about|show me)/.test(m) && hasAchievementEntity) bump('ACHIEVEMENT_DETAILS', 2);

    // Convert to array
    const intents = Object.entries(weights)
      .map(([intent, score]) => ({ intent: intent as IntentType, score }))
      .sort((a, b) => b.score - a.score);

    return intents;
  }

  // Choose top intent with thresholds and tie-breakers
  private chooseTopIntent(intents: Array<{ intent: IntentType, score: number }>, entities: ExtractedEntities): IntentType {
    const top = intents[0];
    const second = intents[1];
    const threshold = 1; // minimum credible signal

    if (!top || top.score < threshold) return 'GENERAL';

    // Tie-breakers if close scores
    const close = second && (top.score - second.score) <= 1;
    if (close) {
      // Prefer specific over generic when entities present
      if (entities.projects.length && (top.intent === 'PROJECTS' || second.intent === 'PROJECT_DETAILS')) return 'PROJECT_DETAILS';
      if (entities.achievements.length && (top.intent === 'ACHIEVEMENTS' || second.intent === 'ACHIEVEMENT_DETAILS')) return 'ACHIEVEMENT_DETAILS';
      // Prefer DATABASE over SKILLS if db tokens found
      if (entities.technologies.some(t => /(mysql|firebase|firestore)/.test(t))) {
        if (top.intent === 'SKILLS' && second?.intent === 'DATABASE') return 'DATABASE';
        if (second?.intent === 'SKILLS' && top.intent === 'DATABASE') return 'DATABASE';
      }
    }

    return top.intent;
  }

  // Multi-intent detection entry point
  private detectIntents(userMessage: string): { intents: Array<{ intent: IntentType, score: number }>, entities: ExtractedEntities } {
    const entities = this.extractEntities(userMessage);
    const intents = this.scoreIntents(userMessage, entities);
    return { intents, entities };
  }

  private detectIntent(userMessage: string): IntentType {
    const m = userMessage.toLowerCase();
    // Prioritize specific intents first, and use word boundaries to avoid substring collisions (e.g., 'how' in 'show')
    if (/(project|projects|portfolio|work)\b/.test(m)) {
      const p = this.findProject(userMessage);
      return p ? 'PROJECT_DETAILS' : 'PROJECTS';
    }
    if (/(contact|email|reach|message)\b/.test(m)) return 'CONTACT';
    if (/(skill|skills|tech|technology|stack)\b/.test(m)) return 'SKILLS';
    if (/(database|databases|sql|mysql|firebase|firestore)\b/.test(m)) return 'DATABASE';
    if (/(education|school|university|study)\b/.test(m)) return 'EDUCATION';
    if (/(award|awards|achievement|achievements|hackathon|win)\b/.test(m)) {
      const a = this.findAchievement(userMessage);
      return a ? 'ACHIEVEMENT_DETAILS' : 'ACHIEVEMENTS';
    }
    if (/(resume|cv)\b/.test(m)) return 'RESUME';
    if (/(org|organization|organizations|community|club)\b/.test(m)) return 'ORGANIZATIONS';
    if (/\b(faq|question|how is|what is|why is|explain)\b/.test(m)) return 'FAQ';
    return 'GENERAL';
  }

  private getSuggestions(intent: IntentType): string[] {
    const last = this.lastUserMessage || '';
    const p = this.findProject(last);
    const a = this.findAchievement(last);
    const msgTokens = this.tokenize(last);
    const techHit = KB.skills.technologies.find(t => {
      const score = this.jaccard(msgTokens, this.tokenize(t));
      return score >= 0.5 || this.normalize(last).includes(this.normalize(t));
    });
    if (intent === 'PROJECT_DETAILS' && p) {
      const proj = p as ProjectItem;
      const sugg = ['Open Projects section', 'Show tech stack', 'Any live demo?', 'Show highlights'];
      if (proj.githubUrl) sugg.unshift('Open GitHub repo');
      if (proj.liveUrl) sugg.unshift('Open live site');
      return sugg;
    }
    if (intent === 'ACHIEVEMENT_DETAILS' && a) {
      return ['Show awards timeline', 'Any related project?', 'Open honors section'];
    }
    switch (intent) {
      case 'PROJECTS':
        return [
          'Open Projects section',
          techHit ? `Show projects using ${techHit}` : 'Show AI/ML projects',
          'List GitHub repos',
          'Search site for AI'
        ];
      case 'CONTACT':
        return ['What is your email?', 'How to connect on LinkedIn?', 'Share GitHub link', 'Open resume'];
      case 'SKILLS':
        return ['List core skills', 'Favorite tech stack?', 'Any databases used?'];
      case 'DATABASE':
        return ['What databases are you familiar with?', 'Show projects using Firebase', 'Show projects using MySQL'];
      case 'EDUCATION':
        return ['Where do you study?', 'What’s your major?', 'Graduation year?'];
      case 'ACHIEVEMENTS':
        return ['Top hackathon wins', 'Details on Technovation 2025', 'Show awards timeline'];
      case 'FAQ':
        return ['What can you do?', 'How is the site built?', 'Is there a resume?', 'Open Projects section'];
      case 'RESUME':
        return ['Open resume', 'Share contact info', 'List skills'];
      case 'ORGANIZATIONS':
        return ['Show organizations', 'Any leadership roles?', 'Related achievements?'];
      default:
        if (p) {
          const proj = p as ProjectItem;
          const base = ['Share contact info', 'List skills', 'Open Projects section'];
          if (proj.githubUrl) base.unshift(`Open ${proj.title} GitHub`);
          if (proj.liveUrl) base.unshift(`Open ${proj.title} site`);
          base.unshift(`Show ${proj.title} details`);
          return base;
        }
        return ['Show projects', 'Share contact info', 'List skills', 'Search site for portfolio'];
    }
  }

  private applyGuardrails(userMessage: string): string | null {
    const m = userMessage.toLowerCase();
    // Very lightweight guardrails
    // Handle frustration/profanity politely and redirect to actionable help
    if (/(\bfuck(ing)?\b|\bshit\b|\bdumb\b|\bstupid\b|\bidiot\b|\buseless\b)/.test(m)) {
      return "I get you're frustrated. Tell me exactly what you need — projects, skills, resume, or a specific item — and I’ll give a precise, helpful answer.";
    }
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


  private routeIntent(intent: IntentType, message: string): string {
    switch (intent) {
      case 'PROJECT_DETAILS': {
        const p = this.findProject(message);
        if (p) {
          const body = this.buildProjectDetailsHTML(p);
          const cites: Citation[] = this.unifiedIndex.filter((it) => it.kind === 'project' && this.normalize(it.title) === this.normalize(p.title)).map(it => it.citation);
          // Always include Projects section as a general source
          const sec = this.unifiedIndex.find((it) => it.id === 'sec-projects')?.citation;
          if (sec) cites.push(sec);
          const foot = this.topicSummaries.projects ? `<br><small>${this.topicSummaries.projects}</small>` : '';
          return `${body}${foot}${this.buildCitationsHTML(cites)}`;
        }
        // Fallback
        const top = KB.projects.slice(0, 3)
          .map((p) => `${p.title} — ${p.technologies.split(';')[0]}`)
          .join('; ');
        const cites: Citation[] = [];
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-projects')?.citation;
        if (sec) cites.push(sec);
        return `Highlighted projects: ${top}. See Projects section for details and links.${this.buildCitationsHTML(cites)}`;
      }
      case 'PROJECTS': {
        const fromDom = this.getProjectsFromDOM();
        // If user asked for AI/ML, filter accordingly
        const m = message.toLowerCase();
        const filtered = /ai|ml|machine learning|agent/.test(m)
          ? fromDom.filter(p => /ai|ml|agent|machine learning/i.test((p.description || '') + ' ' + (p.technologies || '') + ' ' + p.category + ' ' + p.title))
          : fromDom;
        const body = this.buildProjectsListHTML(filtered);
        const cites: Citation[] = [];
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-projects')?.citation;
        if (sec) cites.push(sec);
        // Cite up to first 3 project cards
        filtered.slice(0, 3).forEach((p) => {
          const match = this.unifiedIndex.find((it) => it.kind === 'project' && this.normalize(it.title) === this.normalize(p.title));
          if (match) cites.push(match.citation);
        });
        const foot = this.topicSummaries.projects ? `<br><small>${this.topicSummaries.projects}</small>` : '';
        return `${body}${foot}${this.buildCitationsHTML(cites)}`;
      }
      case 'CONTACT': {
        const c = KB.contact;
        const m = message.toLowerCase();
        // If the user asked for a specific contact field, return only that
        if (/\bemail\b/.test(m)) {
          const cites: Citation[] = [];
          const emailCite = this.unifiedIndex.find((it) => it.id === 'kb-contact-email')?.citation;
          if (emailCite) cites.push(emailCite);
          const sec = this.unifiedIndex.find((it) => it.id === 'sec-contact')?.citation;
          if (sec) cites.push(sec);
          return `Email: <a href="mailto:${c.email}">${c.email}</a>${this.buildCitationsHTML(cites)}`;
        }
        if (/\bgithub\b|\bgit\b/.test(m)) {
          const cites: Citation[] = [];
          const ghCite = this.unifiedIndex.find((it) => it.id === 'kb-contact-github')?.citation;
          if (ghCite) cites.push(ghCite);
          const sec = this.unifiedIndex.find((it) => it.id === 'sec-contact')?.citation;
          if (sec) cites.push(sec);
          return `GitHub: <a href="${c.github}" target="_blank" rel="noopener noreferrer">${c.github}</a>${this.buildCitationsHTML(cites)}`;
        }
        if (/\blinked?in\b/.test(m)) {
          const cites: Citation[] = [];
          const liCite = this.unifiedIndex.find((it) => it.id === 'kb-contact-linkedin')?.citation;
          if (liCite) cites.push(liCite);
          const sec = this.unifiedIndex.find((it) => it.id === 'sec-contact')?.citation;
          if (sec) cites.push(sec);
          return `LinkedIn: <a href="${c.linkedin}" target="_blank" rel="noopener noreferrer">${c.linkedin}</a>${this.buildCitationsHTML(cites)}`;
        }
        if (/\bresume\b|\bcv\b/.test(m)) {
          const cites: Citation[] = [];
          const cvCite = this.unifiedIndex.find((it) => it.id === 'kb-contact-resume')?.citation;
          if (cvCite) cites.push(cvCite);
          const sec = this.unifiedIndex.find((it) => it.id === 'sec-contact')?.citation;
          if (sec) cites.push(sec);
          return `Resume: <a href="${c.resumeUrl}" target="_blank" rel="noopener noreferrer">MAGALONA-CV.pdf</a>${this.buildCitationsHTML(cites)}`;
        }
        // Otherwise, show a compact contact card without trailing periods
        const body = [
          `Email: <a href="mailto:${c.email}">${c.email}</a>`,
          `GitHub: <a href="${c.github}" target="_blank" rel="noopener noreferrer">${c.github}</a>`,
          `LinkedIn: <a href="${c.linkedin}" target="_blank" rel="noopener noreferrer">${c.linkedin}</a>`,
          `Resume: <a href="${c.resumeUrl}" target="_blank" rel="noopener noreferrer">MAGALONA-CV.pdf</a>`,
        ].join('<br>');
        const cites: Citation[] = [];
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-contact')?.citation;
        if (sec) cites.push(sec);
        const kbContact = ['kb-contact-email', 'kb-contact-github', 'kb-contact-linkedin', 'kb-contact-resume']
          .map(id => this.unifiedIndex.find((it) => it.id === id)?.citation)
          .filter(Boolean) as Citation[];
        cites.push(...kbContact);
        return `${body}${this.buildCitationsHTML(cites)}`;
      }
      case 'RESUME': {
        const c = KB.contact;
        const cites: Citation[] = [];
        const cvCite = this.unifiedIndex.find((it) => it.id === 'kb-contact-resume')?.citation;
        if (cvCite) cites.push(cvCite);
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-contact')?.citation;
        if (sec) cites.push(sec);
        return `Resume: <a href="${c.resumeUrl}" target="_blank" rel="noopener noreferrer">MAGALONA-CV.pdf</a>. For a quick glance, ask "skills" or "projects".${this.buildCitationsHTML(cites)}`;
      }
      case 'SKILLS': {
        const body = this.buildSkillsHTML();
        const cites: Citation[] = [];
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-skills')?.citation;
        if (sec) cites.push(sec);
        const foot = this.topicSummaries.skills ? `<br><small>${this.topicSummaries.skills}</small>` : '';
        return `${body}${foot}${this.buildCitationsHTML(cites)}`;
      }
      case 'DATABASE': {
        const dbs = KB.skills.technologies.filter(t => /mysql|firebase|firestore/i.test(t));
        const cites: Citation[] = [];
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-skills')?.citation;
        if (sec) cites.push(sec);
        return `I have experience with ${dbs.join(', ')}. I've used them in various projects for data storage and management.${this.buildCitationsHTML(cites)}`;
      }
      case 'EDUCATION': {
        const e = KB.education
          .map((ed) => `${ed.school}${ed.program ? ` — ${ed.program}` : ''}${ed.period ? ` (${ed.period})` : ''}`)
          .join('; ');
        const cites: Citation[] = [];
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-education')?.citation;
        if (sec) cites.push(sec);
        cites.push(...this.unifiedIndex.filter((it) => it.kind === 'education').map(it => it.citation));
        return `Education: ${e}.${this.buildCitationsHTML(cites)}`;
      }
      case 'ACHIEVEMENT_DETAILS': {
        const a = this.findAchievement(message);
        const body = this.buildAchievementsHTML(a || undefined);
        const cites: Citation[] = [];
        if (a) {
          cites.push(...this.unifiedIndex.filter((it) => it.kind === 'achievement' && this.normalize(it.title) === this.normalize(a.title)).map(it => it.citation));
        }
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-achievements')?.citation;
        if (sec) cites.push(sec);
        const foot = this.topicSummaries.achievements ? `<br><small>${this.topicSummaries.achievements}</small>` : '';
        return `${body}${foot}${this.buildCitationsHTML(cites)}`;
      }
      case 'ACHIEVEMENTS': {
        const body = this.buildAchievementsHTML();
        const cites: Citation[] = [];
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-achievements')?.citation;
        if (sec) cites.push(sec);
        cites.push(...this.unifiedIndex
          .filter((it) => it.kind === 'achievement' && it.citation.origin !== 'Search')
          .slice(0, 3)
          .map(it => it.citation)
        );
        const foot = this.topicSummaries.achievements ? `<br><small>${this.topicSummaries.achievements}</small>` : '';
        return `${body}${foot}${this.buildCitationsHTML(cites)}`;
      }
      case 'ORGANIZATIONS': {
        const cites: Citation[] = [];
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-organizations')?.citation;
        if (sec) cites.push(sec);
        cites.push(...this.unifiedIndex.filter((it) => it.kind === 'organization').map(it => it.citation));
        return `Organizations: ${KB.organizations.join('; ')}.${this.buildCitationsHTML(cites)}`;
      }
      case 'FAQ': {
        const m = message.toLowerCase();
        if (/how.*built|how.*site|stack|tech|technology/.test(m)) {
          return this.formatResponse(
            [
              'This site runs a TypeScript SPA with modular managers for navigation, loading, images, performance, and accessibility.',
              'It uses Vite tooling, intersection observers for lazy loading, and optimized `<picture>` elements for images.',
              'Sections are navigable client-side with route syncing, and there’s a site-wide search overlay triggered via `?q=`.',
            ].join(' '),
            this.detailedMode ? 'detailed' : 'concise'
          );
        }
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

      // Topic-aware summaries: extract recent entities and synthesize concise notes
      const recentTexts = lastFew.map(m => (typeof m.content === 'string' ? m.content : '')).join(' \n ').toLowerCase();

      // Projects summary
      const mentionedProjects = new Set<string>();
      this.unifiedIndex.filter(it => it.kind === 'project').forEach(it => {
        if (recentTexts.includes(this.normalize(it.title))) mentionedProjects.add(it.title);
      });
      if (mentionedProjects.size) {
        // Aggregate top technologies from facts
        const techCounts = new Map<string, number>();
        mentionedProjects.forEach(title => {
          const facts = this.unifiedIndex.find(it => it.kind === 'project' && this.normalize(it.title) === this.normalize(title))?.facts;
          (facts?.tech || []).forEach(t => techCounts.set(t, (techCounts.get(t) || 0) + 1));
        });
        const topTech = Array.from(techCounts.entries()).sort((a,b) => b[1]-a[1]).slice(0,3).map(([t]) => t);
        this.topicSummaries.projects = `Discussed ${mentionedProjects.size} project(s): ${Array.from(mentionedProjects).join(', ')}${topTech.length ? ` — common stack: ${topTech.join(', ')}` : ''}`;
      } else {
        this.topicSummaries.projects = '';
      }

      // Skills summary
      const mentionedSkills = KB.skills.technologies.filter(t => recentTexts.includes(t.toLowerCase()));
      this.topicSummaries.skills = mentionedSkills.length ? `Skills in focus: ${mentionedSkills.join(', ')}` : '';

      // Achievements summary
      const mentionedAchievements = new Set<string>();
      this.unifiedIndex.filter(it => it.kind === 'achievement').forEach(it => {
        if (recentTexts.includes(this.normalize(it.title))) mentionedAchievements.add(it.title);
      });
      this.topicSummaries.achievements = mentionedAchievements.size ? `Achievements mentioned: ${Array.from(mentionedAchievements).join(', ')}` : '';

      // Trim older messages to keep memory tight
      if (this.messages.length > 50) {
        this.messages = this.messages.slice(-30);
        // Also prune DOM nodes to avoid buildup during stress
        if (this.messagesContainer && this.messagesContainer.children.length > 150) {
          const removeCount = this.messagesContainer.children.length - 150;
          for (let i = 0; i < removeCount; i++) {
            const first = this.messagesContainer.firstChild;
            if (first) this.messagesContainer.removeChild(first);
          }
        }
      }

      // Persist preferences on summarize
      this.savePreferences();
    }
  }

  private buildContext(): string {
    const profile = `Name: ${KB.profile.name}\nTitle: ${KB.profile.title}\nSummary: ${KB.profile.summary}`;
    const skills = `Skills: ${KB.skills.core.join(', ')}\nTech Stack: ${KB.skills.technologies.join(', ')}`;
    
    const projects = KB.projects.map(p => 
      `- ${p.title} (${p.category}): ${p.description}. Tech: ${p.technologies}. Links: ${[p.liveUrl, p.githubUrl, p.videoUrl].filter(Boolean).join(', ')}`
    ).join('\n');
    
    const achievements = KB.achievements.map(a => 
      `- ${a.title}: ${a.description} (${a.location}, ${a.date})`
    ).join('\n');
    
    const contact = `Email: ${KB.contact.email}\nGitHub: ${KB.contact.github}\nLinkedIn: ${KB.contact.linkedin}`;
    
    return [profile, skills, "Projects:", projects, "Achievements:", achievements, "Contact:", contact].join('\n\n');
  }

  private async handleMessage(userMessage: string): Promise<void> {
    const guard = this.applyGuardrails(userMessage);
    if (guard) {
      this.addMessage(this.formatResponse(guard, 'concise'), 'bot');
      return;
    }

    // Try Gemini first
    try {
      this.showTypingIndicator();
      const context = this.buildContext();
      const aiResponse = await this.geminiService.generateResponse(userMessage, context);
      this.hideTypingIndicator();
      
      if (aiResponse) {
        this.addMessage(this.formatResponse(aiResponse, this.detailedMode ? 'detailed' : 'concise'), 'bot');
        return;
      } else {
        logger.warn('Gemini returned null response, falling back to local KB.');
      }
    } catch (err) {
      logger.error('Gemini fallback due to error:', err);
      this.hideTypingIndicator();
    }

    // Dev-only Gemini connectivity check trigger
    try {
      const m = userMessage.toLowerCase();
      const wantsGeminiCheck = /(gemini).*(test|status|check)|\btest\b.*\bgemini\b/.test(m);
      if (wantsGeminiCheck) {
        this.addMessage('Checking Gemini connectivity…', 'bot');
        (async () => {
          const result = await this.checkGeminiConnectivity();
          this.addMessage(this.formatResponse(result, 'concise'), 'bot');
        })();
        return;
      }
    } catch { /* ignore */ }

    this.detailedMode = this.prefersDetailed(userMessage) || this.detailedMode;
    this.userPrefs.detailedMode = this.detailedMode;
    // Multi-intent scoring
    const { intents, entities } = this.detectIntents(userMessage);
    const intent = this.chooseTopIntent(intents, entities);
    const botResponse = this.routeIntent(intent, userMessage);
    this.addMessage(this.formatResponse(botResponse, this.detailedMode ? 'detailed' : 'concise'), 'bot');
  }

  // Dev-only connectivity test for Gemini API; returns a short status message
  private async checkGeminiConnectivity(): Promise<string> {
    try {
      const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
      const model = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || 'gemini-2.5-flash';
      if (!key) {
        return 'Gemini key not configured (VITE_GEMINI_API_KEY missing).';
      }
      if (!import.meta.env.DEV) {
        return 'Gemini connectivity check is disabled outside development.';
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${key}`;
      const body = {
        contents: [
          {
            role: 'user',
            parts: [{ text: 'ping' }],
          },
        ],
        generationConfig: { maxOutputTokens: 8 },
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        const snippet = text.length > 180 ? text.slice(0, 180) + '…' : text;
        return `Gemini check failed (${res.status}): ${snippet}`;
      }
      const data = await res.json();
      const sample = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'no-text';
      const preview = sample.length > 160 ? sample.slice(0, 160) + '…' : sample;
      return `Gemini responded OK with model “${model}”. Sample: ${preview}`;
    } catch (e: unknown) {
      const err = e as { message?: unknown } | null;
      return `Gemini check error: ${err?.message || String(e)}`;
    }
  }

  private loadPreferences(): void {
    try {
      const raw = localStorage.getItem('adrAI:prefs');
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.detailedMode === 'boolean') this.userPrefs.detailedMode = p.detailedMode;
      }
    } catch { /* ignore */ }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem('adrAI:prefs', JSON.stringify(this.userPrefs));
    } catch { /* ignore */ }
  }
}
