import type { ChatMessage, ProjectData, AchievementData } from '@/types';
import { logger } from '@/config';
import { KB } from '@/data/knowledge-base';
import { AIService } from './ai-service';
import { findHonorRecord, findProjectRecord, getHonorRecords, getProjectRecords } from './portfolio-data';
import { openPortfolioSearch } from './portfolio-actions';

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
  | 'GENERAL';

type VisitorProfile = 'recruiter' | 'technical' | 'collaborator' | 'student' | 'general';
type PortfolioContext = {
  type: 'page' | 'project' | 'honor' | 'search';
  title: string;
  detail?: string;
};

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
  section?: 'projects' | 'about' | 'contact' | 'skills' | 'education';
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
  kind: 'profile' | 'resume' | 'experience' | 'project' | 'achievement' | 'skill' | 'contact' | 'education';
  title: string;
  text?: string;
  tags?: string[];
  url?: string;
  citation: Citation;
  data?: unknown;
  facts?: ProjectFacts;
};
type AchievementSnippet = {
  title: string;
  description?: string;
  date?: string;
  location?: string;
  organizer?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  blogUrl?: string;
};
type ProjectSummary = {
  title: string;
  category: string;
  description?: string;
  technologies?: string;
  githubUrl?: string;
  liveUrl?: string;
  videoUrl?: string;
  codedexUrl?: string;
};
type StoredAgentMemory = {
  conversationSummary?: string;
  conversationContext?: Partial<{
    lastIntent: IntentType | null;
    lastProjectTitle: string | null;
    lastAchievementTitle: string | null;
    lastTechnology: string | null;
    lastTopic: string | null;
    lastRetrievedTitles: string[];
    visitorProfile: VisitorProfile;
  }>;
  topicSummaries?: Partial<{ projects: string; skills: string; achievements: string }>;
  updatedAt?: string;
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
  private readonly memoryKey = 'adrAI:memory:v1';
  private lastUserMessage: string | null = null;
  private currentPortfolioContext: PortfolioContext | null = null;
  private lastContextNudgeKey = '';
  private detailedMode: boolean = false;
  private userPrefs: { detailedMode: boolean } = { detailedMode: false };
  private aiService: AIService;
  private isResponding: boolean = false;
  private conversationContext: {
    lastIntent: IntentType | null;
    lastProjectTitle: string | null;
    lastAchievementTitle: string | null;
    lastTechnology: string | null;
    lastTopic: string | null;
    lastRetrievedTitles: string[];
    visitorProfile: VisitorProfile;
  } = {
    lastIntent: null,
    lastProjectTitle: null,
    lastAchievementTitle: null,
    lastTechnology: null,
    lastTopic: null,
    lastRetrievedTitles: [],
    visitorProfile: 'general',
  };

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
    return text
      .toLowerCase()
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private sanitizeUrl(url: string): string {
    const value = url.trim();
    if (!value) return '#';
    if (value.startsWith('/') || value.startsWith('#')) return this.escapeHtml(value);
    try {
      const parsed = new URL(value, window.location.origin);
      if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        return this.escapeHtml(parsed.href);
      }
    } catch {
      return '#';
    }
    return '#';
  }

  private projectRecords(): ProjectItem[] {
    return getProjectRecords();
  }

  private honorRecords(): AchievementItem[] {
    return getHonorRecords();
  }

  private cleanText(value: string | undefined, limit = 260): string {
    if (!value) return '';
    let text = value;
    try {
      const template = document.createElement('template');
      const spaced = value
        .replace(/&#10;/g, '\n')
        .replace(/<(br|\/p|\/div|\/li|\/tr|\/td|\/th|\/h[1-6]|\/strong|\/table|\/thead|\/tbody|\/ul|\/ol)\b[^>]*>/gi, ' ');
      template.innerHTML = spaced;
      text = template.content.textContent || value;
    } catch {
      text = value.replace(/<[^>]*>/g, ' ');
    }
    const cleaned = text.replace(/\s+/g, ' ').trim();
    return cleaned.length > limit ? `${cleaned.slice(0, limit).trim()}...` : cleaned;
  }

  private sourceLabel(citation: Citation): string {
    const cleaned = citation.label
      .replace(/^KB\s*›\s*/i, '')
      .replace(/^DOM\s*›\s*/i, '')
      .replace(/^Section\s*›\s*/i, '')
      .replace(/^Projects\s*›\s*Card\s*›\s*/i, 'Projects: ')
      .replace(/^About\s*›\s*Achievement Card\s*›\s*/i, 'Achievements: ')
      .replace(/^Scholarships\s*›\s*/i, 'Scholarships: ')
      .replace(/^Achievements\s*›\s*/i, 'Achievements: ')
      .replace(/^Projects\s*›\s*/i, 'Projects: ')
      .replace(/^Contact\s*›\s*/i, 'Contact: ')
      .replace(/^Resume\s*›\s*/i, 'Resume: ')
      .replace(/^Education\s*›\s*/i, 'Education: ');

    if (cleaned && cleaned !== citation.label) return cleaned;
    if (citation.section) {
      return citation.section.charAt(0).toUpperCase() + citation.section.slice(1);
    }
    return cleaned;
  }

  // Tokenize for fuzzy matching
  private tokenize(text: string): string[] {
    return this.normalize(text).split(' ').filter(Boolean);
  }

  private contentTokens(text: string): string[] {
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'he', 'his', 'i', 'in', 'is',
      'it', 'me', 'of', 'on', 'or', 'our', 'show', 'tell', 'that', 'the', 'this', 'to', 'what',
      'who', 'why', 'with', 'you', 'your',
    ]);
    return this.tokenize(text).filter((token) => token.length > 2 && !stopWords.has(token));
  }

  private keywordOverlapScore(query: string, haystack: string): number {
    const queryTokens = new Set(this.contentTokens(query));
    if (!queryTokens.size) return 0;
    const hayTokens = new Set(this.contentTokens(haystack));
    let overlap = 0;
    queryTokens.forEach((token) => {
      if (hayTokens.has(token)) overlap += 1;
    });
    return overlap / queryTokens.size;
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

  private findProjectByTitle(title: string | null): ProjectItem | null {
    if (!title) return null;
    const normTitle = this.normalize(title);
    return this.projectRecords().find((p) => this.normalize(p.title) === normTitle) || null;
  }

  private findAchievementByTitle(title: string | null): AchievementItem | null {
    if (!title) return null;
    const normTitle = this.normalize(title);
    return this.honorRecords().find((a) => this.normalize(a.title) === normTitle) || null;
  }

  private isFollowUpMessage(userMessage: string): boolean {
    const m = this.normalize(userMessage);
    if (!this.conversationContext.lastIntent) return false;
    if (/^(and|also|then|next|okay|ok|sure|right)\b/.test(m)) return true;
    if (/\b(it|its|that|this|that one|this one|same project|same one|more details|expand|elaborate|tell me more|what else)\b/.test(m)) return true;
    if (m.length <= 24 && /(more|details|explain|show|open|link|demo|stack)/.test(m)) return true;
    return false;
  }

  private handleControlCommand(userMessage: string): string | null {
    const m = this.normalize(userMessage);
    if (/^(\/)?(mode )?detailed( mode)?( on)?$/.test(m) || /^(be )?more detailed$/.test(m)) {
      this.detailedMode = true;
      this.userPrefs.detailedMode = true;
      this.savePreferences();
      return 'Detailed mode is now <strong>ON</strong>. I will provide deeper breakdowns, context, and links.';
    }
    if (/^(\/)?(mode )?(concise|brief|short)( mode)?( on)?$/.test(m) || /^detailed mode off$/.test(m)) {
      this.detailedMode = false;
      this.userPrefs.detailedMode = false;
      this.savePreferences();
      return 'Concise mode is now <strong>ON</strong>. I will keep answers short and direct.';
    }
    if (/^(\/)?help$/.test(m) || /what can you do|capabilities|how can you help/.test(m)) {
      return [
        '<strong>AdrAI capabilities</strong>',
        '1) Candidate fit: why hire Adriel, strongest proof, resume-backed highlights',
        '2) Project intelligence: summaries, stack, links, comparisons, and related awards',
        '3) Achievement deep-dives: context, date, organizer, and related project',
        '4) Navigation actions: open projects, open honors, open resume, search site',
        '5) Contact & profile: email, LinkedIn, GitHub, scholarships, education, and skill highlights',
        'Tip: use <code>/detailed</code> for richer answers or <code>/concise</code> for short replies',
      ].join('<br>');
    }
    if (/^(\/)?(ai|model|provider)(s)?\s*(status|check|diagnostics?)$/.test(m) || /^what ai/.test(m)) {
      return this.buildAIStatusHTML();
    }
    if (/^(\/)?(memory|context)\s*(status|check)?$/.test(m)) {
      return this.buildMemoryStatusHTML();
    }
    if (/^(\/)?(clear|reset|forget)\s+(memory|context|me)$/.test(m)) {
      this.resetMemory();
      return 'AdrAI memory cleared for this browser.';
    }
    return null;
  }

  private buildAIStatusHTML(): string {
    const statuses = this.aiService.getProviderStatuses();
    const rows = statuses.map((provider, index) => {
      const state = provider.configured ? 'ready' : 'not configured';
      const mode = provider.mode === 'server-proxy' ? 'server proxy' : provider.mode;
      return `${index + 1}. <strong>${this.escapeHtml(provider.name)}</strong> — ${this.escapeHtml(state)} · ${this.escapeHtml(mode)} · model: <code>${this.escapeHtml(provider.model)}</code> · timeout: ${provider.timeoutMs / 1000}s`;
    });
    rows.push(`${statuses.length + 1}. <strong>Local portfolio knowledge</strong> — always available if every AI provider fails`);
    const last = this.aiService.lastProvider
      ? `<br><br>Last AI response came from <strong>${this.escapeHtml(this.aiService.lastProvider)}</strong>.`
      : '';
    return `<strong>AdrAI provider chain</strong><br>${rows.join('<br>')}${last}<br><br>No API keys are displayed here.`;
  }

  private buildMemoryStatusHTML(): string {
    const active = [
      this.conversationContext.visitorProfile !== 'general' ? `visitor profile: ${this.conversationContext.visitorProfile}` : '',
      this.conversationContext.lastTopic ? `active topic: ${this.conversationContext.lastTopic}` : '',
      this.conversationContext.lastProjectTitle ? `last project: ${this.conversationContext.lastProjectTitle}` : '',
      this.conversationContext.lastAchievementTitle ? `last honor: ${this.conversationContext.lastAchievementTitle}` : '',
      this.conversationSummary ? this.conversationSummary : '',
    ].filter(Boolean);

    return [
      '<strong>AdrAI memory</strong>',
      active.length ? active.map((item) => `• ${this.escapeHtml(item)}`).join('<br>') : 'No saved topic memory yet.',
      '<br>Memory is local to this browser and only used to make follow-up answers more coherent.',
      'Use <code>clear memory</code> to reset it.',
    ].join('<br>');
  }

  private resetMemory(): void {
    this.conversationSummary = '';
    this.topicSummaries = { projects: '', skills: '', achievements: '' };
    this.conversationContext = {
      lastIntent: null,
      lastProjectTitle: null,
      lastAchievementTitle: null,
      lastTechnology: null,
      lastTopic: null,
      lastRetrievedTitles: [],
      visitorProfile: 'general',
    };
    try {
      localStorage.removeItem(this.memoryKey);
    } catch { /* ignore */ }
  }

  private buildSmallTalkResponse(userMessage: string): string | null {
    const m = this.normalize(userMessage);

    if (/^(hi|hello|hey|yo|sup|good morning|good afternoon|good evening)( there| adrai| bot| assistant)?$/.test(m)) {
      return [
        'Hey, I’m AdrAI.',
        'Ask me about Adriel’s projects, skills, awards, resume, education, or contact links.',
        'Good starter questions: “best AI project” or “compare WorkSight and LingapLink.”',
      ].join('<br>');
    }

    if (/^(thanks|thank you|ty|appreciate it|nice)$/.test(m)) {
      return 'You’re welcome. I can keep going with projects, skills, awards, resume, or contact links.';
    }

    if (/^(how are you|how are you doing|are you working|you good)$/.test(m)) {
      return 'I’m good and ready. Ask me anything about Adriel’s portfolio and I’ll keep it focused.';
    }

    if (/^(who are you|what are you|introduce yourself)$/.test(m)) {
      return 'I’m AdrAI, Adriel’s portfolio guide. I help visitors find project details, tech stacks, achievements, resume links, and contact info quickly.';
    }

    return null;
  }

  private buildProfileResponse(userMessage: string): string | null {
    const m = this.normalize(userMessage);
    const mentionsAdriel = /\badriel( magalona)?\b/.test(m);
    const asksIdentity = /\b(who|about|bio|profile|background|intro|introduce|tell me|describe)\b/.test(m);
    if (!mentionsAdriel || !asksIdentity) return null;

    const primaryEducation = KB.education[0];
    const education = primaryEducation
      ? `${primaryEducation.program || 'Computer Science'} student at ${primaryEducation.school}${primaryEducation.period ? ` (${primaryEducation.period})` : ''}`
      : 'computer science student';
    const core = KB.skills.core.slice(0, 3).join(', ');
    const scholarships = KB.scholarships
      .map((scholarship) => scholarship.title.replace(/\s+under\s+RA\s+7687$/i, ''))
      .join(', ');
    return [
      `<strong>${this.escapeHtml(KB.profile.name)}</strong> is a ${this.escapeHtml(KB.profile.title)} from Taguig City, Philippines.`,
      `He is a ${this.escapeHtml(education)}.`,
      `Core strengths: ${this.escapeHtml(core)}.`,
      `<strong>Resume-backed highlights</strong>: scholarships include ${this.escapeHtml(scholarships)}; Workflow Architect Intern at Eskwelabs; Senior Front-end Web Developer at PUP Manila Microsoft Student Community; builder of ODRS, WorkSight, LingapLink, Kita-Kita, and civic/healthcare AI products.`,
      '<strong>Competition profile</strong>: National Champion at Technovation Summit 2025, Champion at START-a-TON, Excalicode Knight Category winner, and 2nd Runner-Up at Springboard Hack-it.',
      'Ask me for his best projects, awards, resume, or contact links.',
    ].filter(Boolean).join('<br>');
  }

  private isScholarshipQuery(userMessage: string): boolean {
    const m = this.normalize(userMessage);
    return /(?:\bscholarships?\b|\bscholar\b|\bfinancial aid\b|\bgrants?\b|\bdost[-\s]sei\b|\bra 7687\b|\bmacemco\b|\btaguig scholar\b|\blani\b|\blifeline assistance\b)/.test(m);
  }

  private shouldUseStructuredScholarshipAnswer(userMessage: string): boolean {
    if (!this.isScholarshipQuery(userMessage)) return false;
    const m = this.normalize(userMessage);
    return !/\b(why|how|compare|reflect|impact|mean|means|significance|significant)\b/.test(m);
  }

  private isCompleteScholarshipAnswer(text: string): boolean {
    const m = this.normalize(text);
    return ['dost', 'macemco', 'taguig'].every((marker) => m.includes(marker));
  }

  private inferVisitorProfile(userMessage: string): VisitorProfile {
    const m = this.normalize(userMessage);
    if (/\b(hire|hiring|recruit|recruiter|candidate|role|position|intern|internship|job|qualified|fit)\b/.test(m)) {
      return 'recruiter';
    }
    if (/\b(architecture|code|stack|api|database|frontend|backend|implementation|technical|scalable|security|performance)\b/.test(m)) {
      return 'technical';
    }
    if (/\b(collaborate|partnership|startup|team|founder|client|work with|build with)\b/.test(m)) {
      return 'collaborator';
    }
    if (/\b(student|scholarship|school|college|education|learn|study|course|major)\b/.test(m)) {
      return 'student';
    }
    return 'general';
  }

  private visitorProfileInstruction(): string {
    switch (this.conversationContext.visitorProfile) {
      case 'recruiter':
        return 'Visitor appears to be evaluating Adriel as a candidate. Emphasize concrete proof, scope, impact, ownership, and resume links.';
      case 'technical':
        return 'Visitor appears technical. Emphasize architecture, stack, implementation choices, tradeoffs, and project evidence.';
      case 'collaborator':
        return 'Visitor appears collaboration-oriented. Emphasize product thinking, teamwork, communication, and ways to contact Adriel.';
      case 'student':
        return 'Visitor appears education-oriented. Emphasize learning path, scholarships, competitions, and academic background.';
      default:
        return 'Visitor profile is general. Keep answers clear, grounded, and easy to explore.';
    }
  }

  private retrieveRelevantItems(query: string, kinds?: Array<IndexedItem['kind']>, limit = 5): IndexedItem[] {
    const q = this.normalize(query);
    if (!q) return [];
    const isFollowUp = this.isFollowUpMessage(query);
    const intentHints = this.normalize(`${query} ${this.conversationContext.lastTopic || ''}`);

    const scored = this.unifiedIndex
      .filter((item) => !kinds || kinds.includes(item.kind))
      .map((item) => {
        const searchable = [item.title, item.text, ...(item.tags || [])].filter(Boolean).join(' ');
        const titleScore = this.fuzzyScore(item.title || '', q) * 3.2;
        const textScore = this.fuzzyScore(item.text || '', q) * 1.5;
        const tagScore = (item.tags || []).reduce((acc, t) => acc + this.fuzzyScore(t, q), 0) * 0.85;
        const keywordScore = this.keywordOverlapScore(query, searchable) * 3.2;
        const kindBoost =
          /\b(hire|qualified|candidate|resume|experience|intern|role|work)\b/.test(intentHints) && ['profile', 'resume', 'experience', 'project', 'achievement'].includes(item.kind) ? 0.9 :
          /\b(ai|machine learning|agent|llama|gemini|automation)\b/.test(intentHints) && ['project', 'achievement', 'skill'].includes(item.kind) ? 0.8 :
          /\b(scholarship|education|school|college|study)\b/.test(intentHints) && item.kind === 'education' ? 0.8 :
          0;
        const lexicalScore = titleScore + textScore + tagScore + keywordScore + kindBoost;
        const contextBoost =
          isFollowUp && this.conversationContext.lastProjectTitle && this.normalize(item.title) === this.normalize(this.conversationContext.lastProjectTitle) ? 1.2 :
          isFollowUp && this.conversationContext.lastAchievementTitle && this.normalize(item.title) === this.normalize(this.conversationContext.lastAchievementTitle) ? 1.2 :
          isFollowUp && this.conversationContext.lastRetrievedTitles.some((title) => this.normalize(item.title) === this.normalize(title)) ? 0.75 :
          0;
        return { item, score: lexicalScore + contextBoost, lexicalScore };
      })
      .filter((x) => x.score >= 0.9 && (x.lexicalScore >= 0.25 || isFollowUp))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.item);

    this.conversationContext.lastRetrievedTitles = scored.map((item) => item.title).slice(0, 5);
    return scored;
  }

  private buildRetrievedContextSnippet(query: string): string {
    const top = this.retrieveRelevantItems(query, undefined, 10);
    if (!top.length) return '';
    return top
      .map((item, index) => {
        const text = this.cleanText(item.text, 240);
        const tags = item.tags?.slice(0, 5).join(', ');
        return `- [S${index + 1}] [${item.kind}] ${item.title}${text ? `: ${text}` : ''}${tags ? ` | tags: ${tags}` : ''}${item.url ? ` | link: ${item.url}` : ''} | source: ${this.sourceLabel(item.citation)}`;
      })
      .join('\n');
  }

  private getCitationsForQuery(query: string, intent?: IntentType, limit = 4): Citation[] {
    const cites = this.retrieveRelevantItems(query, undefined, limit)
      .map((item) => item.citation);

    const sectionByIntent: Partial<Record<IntentType, string>> = {
      PROJECTS: 'sec-projects',
      PROJECT_DETAILS: 'sec-projects',
      SKILLS: 'sec-skills',
      DATABASE: 'sec-skills',
      ACHIEVEMENTS: 'sec-achievements',
      ACHIEVEMENT_DETAILS: 'sec-achievements',
      CONTACT: 'sec-contact',
      RESUME: 'sec-contact',
      EDUCATION: 'sec-education',
    };
    const sectionId = intent ? sectionByIntent[intent] : undefined;
    const sectionCitation = sectionId
      ? this.unifiedIndex.find((item) => item.id === sectionId)?.citation
      : undefined;
    if (sectionCitation) cites.push(sectionCitation);

    return cites;
  }

  private isOpportunityQuery(userMessage: string): boolean {
    const m = this.normalize(userMessage);
    return /\b(hire|recruit|candidate|qualified|fit|role|position|intern|internship|job|why should|work with|collaborate)\b/.test(m);
  }

  private isProofQuery(userMessage: string): boolean {
    const m = this.normalize(userMessage);
    return /\b(proof|evidence|prove|convince|strongest|impressive|standout|why is he good|what makes him good|ai skill|technical depth|best work)\b/.test(m);
  }

  private buildOpportunityHTML(): string {
    const allProjects = this.getAllProjectSummaries();
    const topProjects = ['WorkSight', 'LingapLink', 'Kita-Kita', 'Online Document Request System']
      .map((title) => allProjects.find((project) => this.normalize(project.title).includes(this.normalize(title))))
      .filter(Boolean) as ProjectSummary[];
    const projectProof = topProjects.slice(0, 3)
      .map((project) => `• <strong>${this.escapeHtml(project.title)}</strong>: ${this.escapeHtml(this.cleanText(project.description, 160))}`)
      .join('<br>');
    const priorityAchievements = [
      'Technovation Summit',
      'START-a-TON',
      'BPI DataWave',
      'Hack-it',
      'Data Structures',
    ]
      .map((title) => this.honorRecords().find((achievement) => this.normalize(achievement.title).includes(this.normalize(title))))
      .filter(Boolean) as AchievementItem[];
    const achievementProof = priorityAchievements.slice(0, 4)
      .map((achievement) => `• ${this.escapeHtml(achievement.title)}${achievement.date ? ` (${this.escapeHtml(achievement.date)})` : ''}`)
      .join('<br>');
    const experience = KB.experience
      .map((item) => `• <strong>${this.escapeHtml(item.role)}</strong>, ${this.escapeHtml(item.company)} (${this.escapeHtml(item.period)})`)
      .join('<br>');
    return [
      '<strong>Why Adriel is a strong candidate</strong>',
      `${this.escapeHtml(KB.resume.headline)} He is strongest where full-stack execution, AI-assisted product thinking, and competition pressure meet.`,
      `<strong>Proof from experience</strong><br>${experience}`,
      `<strong>Project evidence</strong><br>${projectProof}`,
      `<strong>Signal from awards</strong><br>${achievementProof}`,
      `Resume: <a href="${this.sanitizeUrl(KB.contact.resumeUrl)}" target="_blank" rel="noopener noreferrer">resume.pdf</a>`,
    ].filter(Boolean).join('<br><br>');
  }

  private buildProofPackHTML(userMessage: string): string {
    const m = this.normalize(userMessage);
    const wantsAI = /\b(ai|machine learning|agent|agentic|llama|gemini|automation)\b/.test(m);
    const allProjects = this.getAllProjectSummaries();
    const projectPool = allProjects
      .map((project) => ({ project, score: wantsAI ? this.aiProjectScore(project) : this.keywordOverlapScore(userMessage, `${project.title} ${project.description || ''} ${project.technologies || ''}`) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ project }) => project);
    const preferredAiProjects = wantsAI
      ? ['WorkSight', 'LingapLink', 'Kita']
        .map((title) => allProjects.find((project) => this.normalize(project.title).includes(this.normalize(title))))
        .filter(Boolean) as ProjectSummary[]
      : [];
    const projectCandidates = wantsAI
      ? [...preferredAiProjects, ...projectPool.filter((project) => this.aiProjectScore(project) >= 3)]
      : projectPool;
    const seenProjectKeys = new Set<string>();
    const strongProjects = projectCandidates
      .filter((project) => {
        const key = /\bkita\b/.test(this.normalize(project.title)) ? 'kita-kita' : this.normalize(project.title);
        if (seenProjectKeys.has(key)) return false;
        seenProjectKeys.add(key);
        return true;
      })
      .slice(0, 3);

    const achievementPool = this.honorRecords()
      .map((achievement) => {
        const hay = `${achievement.title} ${achievement.description || ''} ${achievement.projectTitle || ''} ${achievement.organizer || ''}`;
        const aiRelevant = /\b(ai-powered|data and ai|agentic|agent|triage|analytics|fintech|healthcare|workplace|hack-it|technovation|start-a-ton|bpi)\b/i.test(hay);
        const aiBoost = wantsAI && aiRelevant ? 2 : 0;
        const winBoost = /\b(champion|runner|placed|won|hackathon|competition)\b/i.test(hay) ? 1.2 : 0;
        const score = this.keywordOverlapScore(userMessage, hay) + aiBoost + winBoost;
        return { achievement, score: wantsAI && !aiRelevant ? 0 : score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ achievement }) => achievement);

    const seenAchievementTitles = new Set<string>();
    const strongAchievements = achievementPool
      .filter((achievement) => {
        const key = this.normalize(achievement.title);
        if (seenAchievementTitles.has(key)) return false;
        seenAchievementTitles.add(key);
        return true;
      })
      .slice(0, 3);

    const resume = this.retrieveRelevantItems(userMessage, ['resume', 'experience', 'skill'], 3);
    const projectLines = strongProjects
      .map((project) => `• <strong>${this.escapeHtml(project.title)}</strong>: ${this.escapeHtml(this.cleanText(project.description, 150))}`)
      .join('<br>');
    const achievementLines = strongAchievements
      .map((achievement) => `• <strong>${this.escapeHtml(achievement.title)}</strong>: ${this.escapeHtml(this.cleanText(achievement.description, 130))}`)
      .join('<br>');
    const resumeLines = resume.length
      ? `<strong>Resume-backed signal</strong><br>${resume.map((item) => `• ${this.escapeHtml(this.cleanText(item.text, 150))}`).join('<br>')}`
      : '';
    return [
      '<strong>Best evidence from the portfolio</strong>',
      projectLines ? `<strong>Build proof</strong><br>${projectLines}` : '',
      achievementLines ? `<strong>Competitive proof</strong><br>${achievementLines}` : '',
      resumeLines,
    ].filter(Boolean).join('<br><br>');
  }

  private buildSmartGeneralResponse(userMessage: string): string {
    if (this.isOpportunityQuery(userMessage)) {
      return this.buildOpportunityHTML();
    }
    if (this.isProofQuery(userMessage)) {
      return this.buildProofPackHTML(userMessage);
    }

    const matches = this.retrieveRelevantItems(userMessage, undefined, 5);
    if (!matches.length) {
      return [
        '<strong>I can answer from Adriel’s portfolio, but I need a sharper target.</strong>',
        'Try asking about his strongest AI project, why he is hireable, scholarships, resume highlights, project stack, awards, or contact links.',
      ].join('<br>');
    }

    const body = matches
      .map((m) => {
        const shortText = this.cleanText(m.text, 170);
        const links = m.url ? ` <a href="${this.sanitizeUrl(m.url)}" target="_blank" rel="noopener noreferrer">Open</a>` : '';
        return `<strong>${this.escapeHtml(m.title)}</strong>${shortText ? ` — ${this.escapeHtml(shortText)}` : ''}${links}`;
      })
      .join('<br>');

    const citations = matches.map((m) => m.citation);
    return `<strong>Here’s what matches best.</strong><br>${body}${this.buildCitationsHTML(citations)}`;
  }

  private updateConversationContext(userMessage: string, intent: IntentType, entities: ExtractedEntities): void {
    this.conversationContext.lastIntent = intent;
    this.conversationContext.lastTopic = intent.toLowerCase().replace(/_/g, ' ');

    const visitorProfile = this.inferVisitorProfile(userMessage);
    if (visitorProfile !== 'general') {
      this.conversationContext.visitorProfile = visitorProfile;
    }

    const project = this.findProject(userMessage)
      || this.findProjectByTitle(entities.projects[0] || null)
      || (this.isFollowUpMessage(userMessage) ? this.findProjectByTitle(this.conversationContext.lastProjectTitle) : null);
    if (project) {
      this.conversationContext.lastProjectTitle = project.title;
      this.conversationContext.lastTopic = project.title;
    }

    const achievement = this.findAchievement(userMessage)
      || this.findAchievementByTitle(entities.achievements[0] || null)
      || (this.isFollowUpMessage(userMessage) ? this.findAchievementByTitle(this.conversationContext.lastAchievementTitle) : null);
    if (achievement) {
      this.conversationContext.lastAchievementTitle = achievement.title;
      this.conversationContext.lastTopic = achievement.title;
    }

    const explicitTech = entities.technologies[0]
      || KB.skills.technologies.find((t) => this.normalize(userMessage).includes(this.normalize(t)))
      || null;
    if (explicitTech) {
      this.conversationContext.lastTechnology = explicitTech;
      this.conversationContext.lastTopic = explicitTech;
    }

    this.saveMemory();
  }

  private findProject(userMessage: string): ProjectItem | null {
    const msg = userMessage;
    const mNorm = this.normalize(msg);
    const mTokens = this.tokenize(msg);
    let bestScore = -Infinity;
    let bestProject: ProjectItem | null = null;

    const aiCue = /(ai|agent|ml|machine learning|openai|langchain)/i.test(msg);

    this.projectRecords().forEach((p) => {
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

    // Follow-up resolution: map "it/that project" to previously discussed project
    if (this.isFollowUpMessage(userMessage)) {
      const fromContext = this.findProjectByTitle(this.conversationContext.lastProjectTitle);
      if (fromContext) return fromContext;
    }

    // If user mentions a technology from recent context, return the most relevant project using it
    const techHint = this.conversationContext.lastTechnology;
    if (techHint && /(project|build|built|using|with|stack|tech)/i.test(userMessage)) {
      const found = this.projectRecords().find((p) => this.normalize(p.technologies || '').includes(this.normalize(techHint)));
      if (found) return found;
    }

    return null;
  }

  private findAchievement(userMessage: string): AchievementItem | null {
    const msg = userMessage;
    const mTokens = this.tokenize(msg);
    let bestScore = -Infinity;
    let bestAchievement: AchievementItem | null = null;

    this.honorRecords().forEach((a) => {
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
    if (this.isFollowUpMessage(userMessage)) {
      const fromContext = this.findAchievementByTitle(this.conversationContext.lastAchievementTitle);
      if (fromContext) return fromContext;
    }
    return null;
  }

  // Build unified index from KB + DOM + Search
  private buildUnifiedIndex(): void {
    const index: IndexedItem[] = [];

    index.push({
      id: 'kb-profile-summary',
      kind: 'profile',
      title: KB.profile.name,
      text: `${KB.profile.title}. ${KB.profile.summary}`,
      tags: ['profile', 'about', 'bio', 'candidate', 'developer', 'ai builder', KB.profile.title],
      citation: { label: 'KB › Profile', section: 'about', origin: 'KB' },
      data: KB.profile,
    });

    index.push({
      id: 'kb-resume-headline',
      kind: 'resume',
      title: 'Resume Headline',
      text: `${KB.resume.headline} Location: ${KB.resume.location}`,
      tags: ['resume', 'cv', 'candidate', 'qualifications', 'background', 'hire'],
      url: KB.contact.resumeUrl,
      citation: { label: 'KB › Resume › Headline', section: 'contact', origin: 'KB', href: KB.contact.resumeUrl },
      data: KB.resume,
    });

    KB.resume.highlights.forEach((highlight, i) => {
      index.push({
        id: `kb-resume-highlight-${i}`,
        kind: 'resume',
        title: `Resume Highlight ${i + 1}`,
        text: highlight,
        tags: ['resume', 'proof', 'highlight', 'qualification', 'evidence'],
        url: KB.contact.resumeUrl,
        citation: { label: `KB › Resume › Highlight ${i + 1}`, section: 'contact', origin: 'KB', href: KB.contact.resumeUrl },
      });
    });

    KB.resume.organizations.forEach((organization, i) => {
      index.push({
        id: `kb-organization-${i}`,
        kind: 'experience',
        title: `Organization ${i + 1}`,
        text: organization,
        tags: ['organization', 'leadership', 'community', 'experience'],
        citation: { label: `KB › Resume › Organization ${i + 1}`, section: 'about', origin: 'KB' },
      });
    });

    KB.experience.forEach((experience, i) => {
      index.push({
        id: `kb-exp-${i}`,
        kind: 'experience',
        title: `${experience.role} at ${experience.company}`,
        text: `${experience.role} at ${experience.company} (${experience.period}). ${experience.summary || ''}`,
        tags: ['experience', 'work', 'internship', 'professional', experience.company, experience.role],
        citation: { label: `KB › Experience › ${experience.company}`, section: 'about', origin: 'KB' },
        data: experience,
      });
    });

    // Canonical project records
    this.projectRecords().forEach((p, i) => {
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
        tags: this.cleanText(p.technologies || '', 500).split(/[;,•]/).map(t => t.trim()).filter(Boolean),
        url: p.githubUrl || p.liveUrl || p.codedexUrl || undefined,
        citation: { label: `KB › Projects › ${p.title}`, section: 'projects', origin: 'KB' },
        data: p,
        facts,
      });
    });

    // Canonical honor records
    this.honorRecords().forEach((a, i) => {
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

    // KB scholarships
    KB.scholarships.forEach((scholarship, i) => {
      index.push({
        id: `kb-scholarship-${i}`,
        kind: 'education',
        title: scholarship.title,
        text: [
          scholarship.provider,
          scholarship.program,
          scholarship.period,
          scholarship.notes,
        ].filter(Boolean).join(' — '),
        tags: [
          'scholarship',
          'scholar',
          scholarship.provider,
          scholarship.program,
          scholarship.period,
        ].filter(Boolean) as string[],
        citation: { label: `KB › Scholarships › ${scholarship.title}`, section: 'education', origin: 'KB' },
        data: scholarship,
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
        tags: this.cleanText(p.technologies || '', 500).split(/[;,•]/).map(t => t.trim()).filter(Boolean),
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
    this.getAchievementsFromDOM().forEach((achievement, i) => {
      index.push({
        id: `dom-ach-${i}`,
        kind: 'achievement',
        title: achievement.title,
        text: achievement.description,
        tags: [achievement.organizer, achievement.location, achievement.date].filter(Boolean) as string[],
        url: achievement.githubUrl || achievement.linkedinUrl || achievement.blogUrl,
        citation: { label: `About › Achievement Card › ${achievement.title}`, section: 'about', origin: 'DOM', selector: '.achievement-card' },
        data: achievement,
      });
    });

    // Search-like results (sections only, for broad citation)
    // We approximate by adding high-level section anchors
    index.push({ id: 'sec-projects', kind: 'project', title: 'Projects Section', citation: { label: 'Section › Projects', section: 'projects', origin: 'Search' } });
    index.push({ id: 'sec-skills', kind: 'skill', title: 'Skills Section', citation: { label: 'Section › Skills', section: 'skills', origin: 'Search' } });
    index.push({ id: 'sec-achievements', kind: 'achievement', title: 'Achievements Section', citation: { label: 'Section › Achievements', section: 'about', origin: 'Search' } });
    index.push({ id: 'sec-contact', kind: 'contact', title: 'Contact Section', citation: { label: 'Section › Contact', section: 'contact', origin: 'Search' } });
    index.push({ id: 'sec-education', kind: 'education', title: 'Education Section', citation: { label: 'Section › Education', section: 'education', origin: 'Search' } });

    this.unifiedIndex = index;
  }

  // Normalize structured facts from base project data and modal content
  private normalizeProjectFacts(input: { title: string; technologies?: string; githubUrl?: string; liveUrl?: string; codedexUrl?: string; videoUrl?: string; }): ProjectFacts {
    const tech = this.cleanText(input.technologies || '', 600)
      .split(/[;,•]/)
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
    const unique = cites.filter((cite, index, all) =>
      all.findIndex((candidate) => candidate.label === cite.label && candidate.href === cite.href) === index
    );
    const items = unique.slice(0, 4).map(c => {
      const label = this.escapeHtml(this.sourceLabel(c));
      const href = c.href ? `<a href="${this.sanitizeUrl(c.href)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
      return `<li>${href}</li>`;
    }).join('');
    return `<details class="sources"><summary>Portfolio sources</summary><ul>${items}</ul></details>`;
  }

  private buildProjectDetailsHTML(p: ProjectItem): string {
    const links: string[] = [];
    if (p.liveUrl) links.push(`<a href="${this.sanitizeUrl(p.liveUrl)}" target="_blank" rel="noopener noreferrer">Live site</a>`);
    if (p.githubUrl) links.push(`<a href="${this.sanitizeUrl(p.githubUrl)}" target="_blank" rel="noopener noreferrer">Repository</a>`);
    if (p.videoUrl) links.push(`<a href="${this.sanitizeUrl(p.videoUrl)}" target="_blank" rel="noopener noreferrer">Demo video</a>`);
    if (p.codedexUrl) links.push(`<a href="${this.sanitizeUrl(p.codedexUrl)}" target="_blank" rel="noopener noreferrer">Codedex profile</a>`);

    // Pull normalized facts from unified index for highlights and additional links
    const facts = this.unifiedIndex
      .filter((it) => it.kind === 'project' && this.normalize(it.title) === this.normalize(p.title))
      .map((it) => it.facts)
      .filter(Boolean)
      .sort((a, b) => {
        const aLinkCount = Object.values(a?.links || {}).filter(Boolean).length;
        const bLinkCount = Object.values(b?.links || {}).filter(Boolean).length;
        return bLinkCount - aLinkCount;
      })[0];
    const highlights = facts?.highlights?.length
      ? `<br><em>Highlights:</em> ${facts.highlights.slice(0, 3).map((highlight) => this.escapeHtml(this.cleanText(highlight, 120))).join('; ')}`
      : '';
    const factLinks: string[] = [];
    if (facts?.links?.live && !links.some(l => l.includes('Live site'))) factLinks.push(`<a href="${this.sanitizeUrl(facts.links.live)}" target="_blank" rel="noopener noreferrer">Live site</a>`);
    if (facts?.links?.github && !links.some(l => l.includes('Repository'))) factLinks.push(`<a href="${this.sanitizeUrl(facts.links.github)}" target="_blank" rel="noopener noreferrer">Repository</a>`);
    if (facts?.links?.video && !links.some(l => l.includes('Demo video'))) factLinks.push(`<a href="${this.sanitizeUrl(facts.links.video)}" target="_blank" rel="noopener noreferrer">Demo video</a>`);
    if (facts?.links?.codedex && !links.some(l => l.includes('Codedex profile'))) factLinks.push(`<a href="${this.sanitizeUrl(facts.links.codedex)}" target="_blank" rel="noopener noreferrer">Codedex profile</a>`);
    const allLinks = [...links, ...factLinks];

    return [
      `<strong>${this.escapeHtml(p.title)}</strong> — ${this.escapeHtml(p.category)}`,
      this.escapeHtml(this.cleanText(p.description, 280)),
      `<em>Stack:</em> ${this.escapeHtml(this.cleanText(p.technologies, 220))}`,
      allLinks.length ? allLinks.join('<br>') : 'No external links are listed for this project yet.',
      highlights,
    ].filter(Boolean).join('<br>');
  }

  private buildSkillsHTML(): string {
    const s = KB.skills;
    return [
      `<strong>Core strengths</strong>: ${s.core.map((skill) => this.escapeHtml(skill)).join(', ')}`,
      `<strong>Main stack</strong>: ${s.technologies.map((tech) => this.escapeHtml(tech)).join(', ')}`,
    ].join('<br>');
  }

  private buildResumeSummaryHTML(): string {
    const highlights = KB.resume.highlights.slice(0, 5)
      .map((highlight) => `• ${this.escapeHtml(this.cleanText(highlight, 190))}`)
      .join('<br>');
    const certifications = KB.resume.certifications.slice(0, 2)
      .map((certification) => `• ${this.escapeHtml(certification)}`)
      .join('<br>');

    return [
      `<strong>Resume summary</strong>: ${this.escapeHtml(KB.resume.headline)}`,
      highlights,
      certifications ? `<strong>Certifications</strong>:<br>${certifications}` : '',
      `Resume PDF: <a href="${this.sanitizeUrl(KB.contact.resumeUrl)}" target="_blank" rel="noopener noreferrer">resume.pdf</a>`,
    ].filter(Boolean).join('<br>');
  }

  private buildScholarshipsHTML(): string {
    const items = KB.scholarships
      .map((scholarship) => {
        const title = this.escapeHtml(scholarship.title);
        const period = this.escapeHtml(scholarship.period);
        const provider = this.escapeHtml(scholarship.provider);
        const program = scholarship.program ? ` — ${this.escapeHtml(scholarship.program)}` : '';
        const notes = this.escapeHtml(scholarship.notes);
        return `• <strong>${title}</strong> (${period})<br><span>${provider}${program}. ${notes}</span>`;
      })
      .join('<br>');
    const cites = this.unifiedIndex
      .filter((item) => item.id.startsWith('kb-scholarship-') || item.id === 'sec-education')
      .map((item) => item.citation);
    return `<strong>Adriel’s scholarships</strong><br>${items}${this.buildCitationsHTML(cites)}`;
  }

  private buildScholarshipImpactHTML(): string {
    return [
      '<strong>Why the scholarships matter</strong>',
      'They show that Adriel’s academic work is backed by multiple forms of external recognition, not just self-description.',
      '• <strong>DOST-SEI RA 7687</strong> signals national STEM potential and supports his BS Computer Science path.',
      '• <strong>MACEMCO Scholar</strong> adds community-backed educational support.',
      '• <strong>Taguig Scholar (Honors)</strong> shows honors-based local recognition through the LANI program beginning in 2026.',
      'Together, they strengthen the portfolio’s education story: consistent academic promise, civic support, and technical direction.',
    ].join('<br>');
  }

  private buildAchievementsHTML(a?: AchievementItem): string {
    if (a) {
      const links: string[] = [];
      if (a.githubUrl) links.push(`<a href="${this.sanitizeUrl(a.githubUrl)}" target="_blank" rel="noopener noreferrer">Repository</a>`);
      if (a.linkedinUrl) links.push(`<a href="${this.sanitizeUrl(a.linkedinUrl)}" target="_blank" rel="noopener noreferrer">LinkedIn post</a>`);
      return [
        `<strong>${this.escapeHtml(a.title)}</strong> — ${this.escapeHtml(a.location)} (${this.escapeHtml(a.date)})`,
        this.escapeHtml(this.cleanText(a.description || 'Achievement details are available in the honors section.', 260)),
        links.length ? links.join('<br>') : 'The honors section has the best visual context for this one.',
      ].join('<br>');
    }
    const top = this.honorRecords().slice(0, 3)
      .map((ach) => `${this.escapeHtml(ach.title)} — ${this.escapeHtml(ach.location)}`)
      .join('; ');
    return `Top highlights: ${top}. Open the honors section for the timeline and photos.`;
  }

  private buildAchievementSnippetHTML(a: AchievementSnippet): string {
    const links: string[] = [];
    if (a.githubUrl) links.push(`<a href="${this.sanitizeUrl(a.githubUrl)}" target="_blank" rel="noopener noreferrer">Repository</a>`);
    if (a.linkedinUrl) links.push(`<a href="${this.sanitizeUrl(a.linkedinUrl)}" target="_blank" rel="noopener noreferrer">LinkedIn post</a>`);
    if (a.blogUrl) links.push(`<a href="${this.sanitizeUrl(a.blogUrl)}" target="_blank" rel="noopener noreferrer">Article</a>`);
    const meta = [a.location, a.date].filter(Boolean).map((part) => this.escapeHtml(part || '')).join(' · ');
    return [
      `<strong>${this.escapeHtml(a.title)}</strong>${meta ? ` — ${meta}` : ''}`,
      a.description ? this.escapeHtml(this.cleanText(a.description, 260)) : 'This achievement appears in the honors timeline.',
      links.length ? links.join('<br>') : 'Open the honors section for the full timeline context.',
    ].join('<br>');
  }

  private findIndexedAchievement(userMessage: string): IndexedItem | null {
    const msgTokens = this.tokenize(userMessage);
    let bestScore = -Infinity;
    let bestItem: IndexedItem | null = null;

    this.unifiedIndex.filter((item) => item.kind === 'achievement').forEach((item) => {
      const titleScore = this.jaccard(msgTokens, this.tokenize(item.title)) * 4;
      const textScore = this.jaccard(msgTokens, this.tokenize(item.text || '')) * 1.5;
      const tagScore = (item.tags || []).reduce((acc, tag) => acc + this.jaccard(msgTokens, this.tokenize(tag)), 0);
      const score = titleScore + textScore + tagScore + this.fuzzyScore(item.title, userMessage);
      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    });

    if (bestItem && bestScore >= 1.8) return bestItem;
    return null;
  }

  constructor() {
    this.chatbox = document.querySelector('.chatbox');
    this.chatbotBtn = document.querySelector('.chatbot-btn');
    this.closeBtn = document.querySelector('.close-btn');
    this.messagesContainer = document.querySelector('.chatbox-messages');
    this.inputField = document.querySelector('.chatbox-input input') as HTMLInputElement;
    this.sendButton = document.querySelector('.chatbox-input button');

    this.aiService = new AIService();

    // Initialize ARIA state
    if (this.chatbotBtn) this.chatbotBtn.setAttribute('aria-expanded', 'false');
    if (this.chatbox) {
      const isActive = this.chatbox.classList.contains('active');
      this.chatbox.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      if (!isActive) this.chatbox.setAttribute('inert', '');
    }

    this.loadPreferences();
    this.loadMemory();
    this.detailedMode = this.userPrefs.detailedMode;
    // Build unified retrieval index once UI is ready
    this.buildUnifiedIndex();
    this.initializeEventListeners();
    this.initializeContextListeners();
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

  private initializeContextListeners(): void {
    window.addEventListener('portfolio:context', (event) => {
      const detail = (event as CustomEvent<PortfolioContext>).detail;
      if (detail?.type && detail.title) {
        this.setCurrentContext(detail);
      }
    });

    window.addEventListener('portfolio:open-project', (event) => {
      const title = (event as CustomEvent<{ title?: string }>).detail?.title;
      if (title) this.setCurrentContext({ type: 'project', title });
    });

    window.addEventListener('portfolio:open-honor', (event) => {
      const title = (event as CustomEvent<{ title?: string }>).detail?.title;
      if (title) this.setCurrentContext({ type: 'honor', title });
    });

    window.addEventListener('portfolio:ask-adrai', (event) => {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt?.trim();
      this.openChatbox();
      if (prompt && this.inputField) {
        this.inputField.value = prompt;
        this.sendMessage();
      } else {
        this.renderContextualPromptNudge();
      }
    });
  }

  private setCurrentContext(context: PortfolioContext): void {
    this.currentPortfolioContext = context;
    if (context.type === 'project') {
      this.conversationContext.lastProjectTitle = context.title;
      this.conversationContext.lastTopic = context.title;
    }
    if (context.type === 'honor') {
      this.conversationContext.lastAchievementTitle = context.title;
      this.conversationContext.lastTopic = context.title;
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

  public openChatbox(): void {
    if (!this.chatbox?.classList.contains('active')) {
      this.toggleChatbox();
    }
    this.renderContextualPromptNudge();
  }

  private displayWelcomeMessage(): void {
    const welcomeMessage = "Hi, I'm AdrAI, Adriel's portfolio agent. I can explain why Adriel is hireable, compare projects, surface proof of AI skill, summarize awards, or open resume/contact links. Try: \"Why hire Adriel?\" or \"Show proof of AI skill.\"";
    this.addMessage(welcomeMessage, 'bot', this.getContextualPromptSuggestions());
  }

  private getActivePortfolioContext(): PortfolioContext {
    if (this.currentPortfolioContext) return this.currentPortfolioContext;
    const activePage = document.querySelector<HTMLElement>('article[data-page].active')?.dataset.page || 'about';
    const labels: Record<string, string> = {
      about: 'About',
      background: 'Background',
      projects: 'Projects',
      gear: 'Gear',
    };
    return {
      type: 'page',
      title: labels[activePage] || 'Portfolio',
    };
  }

  private renderContextualPromptNudge(): void {
    if (!this.messagesContainer) return;
    const context = this.getActivePortfolioContext();
    const key = `${context.type}:${context.title}:${context.detail || ''}`;
    if (this.lastContextNudgeKey === key) return;
    this.lastContextNudgeKey = key;

    const label = this.escapeHtml(context.title);
    const message = context.type === 'project'
      ? `You're viewing <strong>${label}</strong>. I can explain its stack, impact, related honors, or why it matters.`
      : context.type === 'honor'
      ? `You're viewing <strong>${label}</strong>. I can unpack the event, result, linked project, or career signal.`
      : context.type === 'search'
      ? `You're searching for <strong>${label}</strong>. I can help narrow the result or compare related items.`
      : `You're on the <strong>${label}</strong> section. I can summarize what matters here or open the next useful item.`;

    this.addMessage(message, 'bot', this.getContextualPromptSuggestions(context));
  }

  private getContextualPromptSuggestions(context = this.getActivePortfolioContext()): string[] {
    if (context.type === 'project') {
      return [
        `Show ${context.title} details`,
        `Open ${context.title} project`,
        'Any related project?',
        'Open resume',
      ];
    }

    if (context.type === 'honor') {
      return [
        `Open ${context.title} honor`,
        'Any related project?',
        'Why is this impressive?',
        'Show awards timeline',
      ];
    }

    if (context.title.toLowerCase().includes('background')) {
      return ['Filter scholarships', 'Filter experience', 'Where do you study?', 'Open resume'];
    }

    if (context.title.toLowerCase().includes('projects')) {
      return ['Best AI project', 'Compare WorkSight and LingapLink', 'Search site for Firebase', 'Open resume'];
    }

    if (context.title.toLowerCase().includes('gear')) {
      return ['How is the site built?', 'Show tech stack', 'Open Projects section', 'Share contact info'];
    }

    return ['Why hire Adriel?', 'Show proof of AI skill', 'Search site for AI', 'Share contact info'];
  }

  private sendMessage(): void {
    if (!this.inputField || !this.inputField.value.trim() || this.isResponding) return;

    const userMessage = this.inputField.value.trim();
    this.lastUserMessage = userMessage;
    this.addMessage(userMessage, 'user');
    window.dispatchEvent(new CustomEvent('portfolio:analytics', {
      detail: { type: 'chatbot-question', label: userMessage },
    }));
    this.inputField.value = '';

    void this.handleMessage(userMessage);
  }

  private setInputPending(isPending: boolean): void {
    this.isResponding = isPending;
    if (this.inputField) {
      this.inputField.disabled = isPending;
      this.inputField.setAttribute('aria-busy', String(isPending));
    }
    if (this.sendButton instanceof HTMLButtonElement) {
      this.sendButton.disabled = isPending;
    } else if (this.sendButton) {
      this.sendButton.setAttribute('aria-disabled', String(isPending));
    }
  }

  private showTypingIndicator(): void {
    if (!this.messagesContainer) return;
    if (document.getElementById('typing-indicator')) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.setAttribute('aria-label', 'AdrAI is thinking');
    typingDiv.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    this.messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
  }

  private hideTypingIndicator(): void {
    document.querySelectorAll('#typing-indicator').forEach((typingIndicator) => typingIndicator.remove());
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  public addMessage(text: string, sender: 'user' | 'bot', suggestions?: string[]): void {
    const message: ChatMessage = {
      role: sender,
      content: text,
      timestamp: new Date(),
    };
    this.messages.push(message);
    this.displayMessage(text, sender, suggestions);
    this.maybeSummarize();
  }

  private displayMessage(text: string, sender: 'user' | 'bot', suggestions?: string[]): void {
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

      const intent = this.detectIntent(this.lastUserMessage || '');
      const actionsToShow = suggestions?.length ? suggestions : this.getSuggestions(intent);
      actionsToShow.slice(0, 4).forEach((sugg) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        if (this.isToolSuggestion(sugg)) btn.className = 'bot-action-tool';
        btn.textContent = sugg;
        btn.setAttribute('aria-label', `Suggestion: ${sugg}`);
        btn.addEventListener('click', () => this.handleSuggestionClick(sugg));
        actions.appendChild(btn);
      });

      this.messagesContainer.appendChild(actions);
    }

    this.scrollToBottom();
  }

  private isToolSuggestion(text: string): boolean {
    const normalized = this.normalize(text);
    return /\b(open|view|filter|github|demo|site|resume|contact|related project|projects section|honors section|awards timeline)\b/.test(normalized);
  }

  private resolveToolProject(text = ''): ProjectItem | null {
    return findProjectRecord(text)
      || findProjectRecord(this.conversationContext.lastProjectTitle)
      || this.findProject(text || this.lastUserMessage || '')
      || this.findProjectByTitle(this.conversationContext.lastProjectTitle);
  }

  private resolveToolAchievement(text = ''): AchievementItem | null {
    return findHonorRecord(text)
      || findHonorRecord(this.conversationContext.lastAchievementTitle)
      || this.findAchievement(text || this.lastUserMessage || '')
      || this.findAchievementByTitle(this.conversationContext.lastAchievementTitle);
  }

  private handleSuggestionClick(text: string): void {
    if (!text) return;
    // Actionable suggestions
    const t = text.toLowerCase();
    const normalizedSuggestion = this.normalize(text);

    if (t.includes('open linked project') || t.includes('any related project')) {
      const explicitProject = text.includes(':') ? text.split(':').pop()?.trim() : '';
      const achievement = this.resolveToolAchievement(text);
      const title = explicitProject || achievement?.projectTitle || null;
      const project = this.resolveToolProject(title || '');
      if (project) {
        this.openProjectAction(project.title);
        return;
      }
      this.addMessage('I could not find a linked project for this honor yet.', 'bot');
      return;
    }

    if ((t.includes('open github') || (t.startsWith('open') && t.includes('github'))) && !t.includes('list')) {
      const project = this.resolveToolProject(text);
      if (project?.githubUrl) {
        try { window.open(project.githubUrl, '_blank', 'noopener,noreferrer'); } catch { /* ignore */ }
        this.addMessage(`Opening GitHub repo for ${this.escapeHtml(project.title)}...`, 'bot');
        return;
      }
      this.addMessage('I couldn’t find a matching project with a GitHub link.', 'bot');
      return;
    }

    if (t.includes('open live site') || (t.startsWith('open') && t.includes('site'))) {
      const project = this.resolveToolProject(text);
      if (project?.liveUrl) {
        try { window.open(project.liveUrl, '_blank', 'noopener,noreferrer'); } catch { /* ignore */ }
        this.addMessage(`Opening live site for ${this.escapeHtml(project.title)}...`, 'bot');
        return;
      }
      this.addMessage('I couldn’t find a matching project with a live site.', 'bot');
      return;
    }

    if (t.includes('any live demo') || t.includes('open demo') || (t.startsWith('open') && t.includes('demo'))) {
      const project = this.resolveToolProject(text);
      const url = project ? (project.videoUrl || project.liveUrl) : undefined;
      if (project && url) {
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch { void 0; }
        this.addMessage(`Opening demo for ${this.escapeHtml(project.title)}...`, 'bot');
        return;
      }
      this.addMessage('No demo or live link matched your request.', 'bot');
      return;
    }

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
        this.openResumePreview(url);
        this.addMessage('Opening resume preview…', 'bot');
        return;
      }
    }
    if (t.includes('open contact') || t.includes('share contact info')) {
      this.addMessage('Opening contact options…', 'bot');
      this.navigateToSection('contact');
      return;
    }
    if (t.includes('filter scholarships')) {
      this.addMessage('Filtering the background timeline to scholarships…', 'bot');
      this.navigateToSection('background');
      setTimeout(() => window.dispatchEvent(new CustomEvent('portfolio:timeline-filter', { detail: { filter: 'scholarship' } })), 120);
      return;
    }
    if (t.includes('filter education')) {
      this.addMessage('Filtering the background timeline to education…', 'bot');
      this.navigateToSection('background');
      setTimeout(() => window.dispatchEvent(new CustomEvent('portfolio:timeline-filter', { detail: { filter: 'education' } })), 120);
      return;
    }
    if (t.includes('filter experience')) {
      this.addMessage('Filtering the background timeline to experience…', 'bot');
      this.navigateToSection('background');
      setTimeout(() => window.dispatchEvent(new CustomEvent('portfolio:timeline-filter', { detail: { filter: 'experience' } })), 120);
      return;
    }

    const projectBySuggestion = findProjectRecord(text)
      || this.projectRecords().find((project) => normalizedSuggestion.includes(this.normalize(project.title)));
    if (projectBySuggestion && (t.includes('open') || t.includes('view'))) {
      this.openProjectAction(projectBySuggestion.title);
      return;
    }

    const achievementBySuggestion = findHonorRecord(text)
      || this.honorRecords().find((achievement) => normalizedSuggestion.includes(this.normalize(achievement.title)));
    if (achievementBySuggestion && (t.includes('open') || t.includes('view'))) {
      this.openHonorAction(achievementBySuggestion.title);
      return;
    }
    if (t.includes('list github repos')) {
      const repos = this.projectRecords()
        .filter(pr => pr.githubUrl)
        .slice(0, 8)
        .map(pr => `<a href="${this.sanitizeUrl(pr.githubUrl || '')}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(pr.title)}</a>`);
      const html = repos.length ? `<strong>GitHub Repos</strong><br>${repos.join('<br>')}` : 'No GitHub repositories listed.';
      this.addMessage(html, 'bot');
      return;
    }
    if (t.includes('why do these matter') && this.conversationContext.lastIntent === 'EDUCATION') {
      this.addMessage(this.buildScholarshipImpactHTML(), 'bot', ['Show education background', 'Open resume', 'Top achievements']);
      return;
    }
    if (t.includes('search portfolio')) {
      this.addMessage('Opening portfolio search…', 'bot');
      this.openSearchOverlay('');
      return;
    }

    if (t.startsWith('search ') || t.includes('search site')) {
      const qMatch = text.replace(/^(search\s+site\s+for\s+|search\s+)/i, '').trim();
      const q = qMatch || (this.lastUserMessage || '').trim();
      if (q) {
        this.addMessage(`Searching site for "${this.escapeHtml(q)}"...`, 'bot');
        this.openSearchOverlay(q);
        return;
      }
    }

    // Fallback: treat as user input and send
    if (this.inputField) this.inputField.value = text;
    this.sendMessage();
  }

  private navigateToSection(section: 'about' | 'background' | 'projects' | 'contact'): void {
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

  private openProjectAction(title: string): void {
    this.navigateToSection('projects');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('portfolio:open-project', { detail: { title } }));
    }, 160);
    this.addMessage(`Opening project details for <strong>${this.escapeHtml(title)}</strong>...`, 'bot');
  }

  private openHonorAction(title: string): void {
    this.navigateToSection('about');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('portfolio:open-honor', { detail: { title } }));
    }, 160);
    this.addMessage(`Opening honor details for <strong>${this.escapeHtml(title)}</strong>...`, 'bot');
  }

  private openResumePreview(url = KB.contact.resumeUrl): void {
    window.dispatchEvent(new CustomEvent('portfolio:open-resume-preview', {
      detail: { url },
    }));
  }

  private tryHandleDirectAction(userMessage: string): boolean {
    const normalized = this.normalize(userMessage);
    if (!/\b(open|show|view|go to|filter)\b/.test(normalized)) return false;

    if (/\b(open|show|view)\b.*\b(contact|email)\b/.test(normalized)) {
      this.navigateToSection('contact');
      this.addMessage('Opening contact options...', 'bot');
      return true;
    }

    if (/\b(open|show|view)\b.*\b(resume|cv)\b/.test(normalized)) {
      this.openResumePreview();
      this.addMessage('Opening resume preview...', 'bot');
      return true;
    }

    const timelineMatch = normalized.match(/\b(filter|show|view)\b.*\b(education|experience|scholarships?|background)\b/);
    if (timelineMatch) {
      const rawFilter = timelineMatch[2] || 'all';
      const filter = rawFilter.startsWith('scholarship') ? 'scholarship'
        : rawFilter === 'education' ? 'education'
          : rawFilter === 'experience' ? 'experience'
            : 'all';
      this.navigateToSection('background');
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('portfolio:timeline-filter', { detail: { filter } }));
      }, 120);
      this.addMessage(`Filtering background to <strong>${this.escapeHtml(filter === 'all' ? 'all timeline items' : filter)}</strong>...`, 'bot');
      return true;
    }

    const projectTitle = this.findActionProjectTitle(userMessage);
    if (projectTitle && /\b(project|demo|site|modal|details)\b/.test(normalized)) {
      this.openProjectAction(projectTitle);
      return true;
    }

    const achievementTitle = this.findActionAchievementTitle(userMessage);
    if (achievementTitle && /\b(honor|award|achievement|hackathon|quiz|competition|details|modal)\b/.test(normalized)) {
      this.openHonorAction(achievementTitle);
      return true;
    }

    return false;
  }

  private findActionProjectTitle(userMessage: string): string | null {
    const normalized = this.normalize(userMessage);
    const command = normalized.replace(/\b(open|show|view|project|details|modal|site|demo)\b/g, '').trim();
    const candidates = this.getAllProjectSummaries();
    const scored = candidates
      .map((project) => {
        const title = this.normalize(project.title);
        let score = 0;
        if (normalized.includes(title)) score += 5;
        if (command.length > 2 && title.includes(command)) score += 4;
        score += this.fuzzyScore(project.title, userMessage);
        return { title: project.title, score };
      })
      .filter((item) => item.score >= 2.2)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.title || this.findProject(userMessage)?.title || null;
  }

  private findActionAchievementTitle(userMessage: string): string | null {
    const normalized = this.normalize(userMessage);
    const command = normalized.replace(/\b(open|show|view|honor|award|achievement|details|modal)\b/g, '').trim();
    const candidates = [
      ...this.honorRecords().map((item) => ({ title: item.title })),
      ...this.getAchievementsFromDOM().map((item) => ({ title: item.title })),
    ];
    const scored = candidates
      .map((achievement) => {
        const title = this.normalize(achievement.title);
        let score = 0;
        if (normalized.includes(title)) score += 5;
        if (command.length > 2 && title.includes(command)) score += 4;
        score += this.fuzzyScore(achievement.title, userMessage);
        return { title: achievement.title, score };
      })
      .filter((item) => item.score >= 2.2)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.title || this.findAchievement(userMessage)?.title || null;
  }

  private openSearchOverlay(query: string): void {
    openPortfolioSearch(query);
  }
  // === New: DOM-driven Projects extraction and listing ===
  private getProjectsFromDOM(): ProjectSummary[] {
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

  private getAllProjectSummaries(): ProjectSummary[] {
    const byTitle = new Map<string, ProjectSummary>();
    const add = (project: ProjectSummary) => {
      const key = this.normalize(project.title);
      if (!key) return;
      const existing = byTitle.get(key);
      byTitle.set(key, {
        ...existing,
        ...project,
        description: project.description || existing?.description,
        technologies: project.technologies || existing?.technologies,
        githubUrl: project.githubUrl || existing?.githubUrl,
        liveUrl: project.liveUrl || existing?.liveUrl,
        videoUrl: project.videoUrl || existing?.videoUrl,
        codedexUrl: project.codedexUrl || existing?.codedexUrl,
      });
    };

    this.projectRecords().forEach(add);
    this.getProjectsFromDOM().forEach(add);
    return Array.from(byTitle.values());
  }

  private findProjectMatches(userMessage: string, limit = 4): ProjectSummary[] {
    const msg = this.normalize(userMessage);
    const msgTokens = this.tokenize(userMessage);
    return this.getAllProjectSummaries()
      .map((project) => {
        const title = this.normalize(project.title);
        const titleScore = this.jaccard(msgTokens, this.tokenize(project.title)) * 5;
        const exactTitle = title && msg.includes(title) ? 4 : 0;
        const fuzzyTitle = this.fuzzyScore(project.title, userMessage) * 2;
        const alias = title.replace(/\s+/g, '');
        const compactMsg = msg.replace(/\s+/g, '');
        const compactHit = alias.length > 4 && compactMsg.includes(alias) ? 2 : 0;
        return { project, score: titleScore + exactTitle + fuzzyTitle + compactHit };
      })
      .filter(({ score }) => score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ project }) => project);
  }

  private isProjectComparisonQuery(message: string): boolean {
    const m = this.normalize(message);
    if (!/\b(compare|comparison|versus|vs|difference|different|between)\b/.test(m)) return false;
    return this.findProjectMatches(message, 3).length >= 2;
  }

  private buildProjectComparisonHTML(message: string): string | null {
    if (!this.isProjectComparisonQuery(message)) return null;
    const projects = this.findProjectMatches(message, 3).slice(0, 2);
    if (projects.length < 2) return null;

    const sections = projects.map((project) => {
      const links: string[] = [];
      if (project.liveUrl) links.push(`<a href="${this.sanitizeUrl(project.liveUrl)}" target="_blank" rel="noopener noreferrer">Live</a>`);
      if (project.githubUrl) links.push(`<a href="${this.sanitizeUrl(project.githubUrl)}" target="_blank" rel="noopener noreferrer">GitHub</a>`);
      if (project.videoUrl) links.push(`<a href="${this.sanitizeUrl(project.videoUrl)}" target="_blank" rel="noopener noreferrer">Demo</a>`);
      return [
        `<strong>${this.escapeHtml(project.title)}</strong> — ${this.escapeHtml(project.category)}`,
        this.escapeHtml(this.cleanText(project.description, 220)),
        project.technologies ? `<em>Stack:</em> ${this.escapeHtml(this.cleanText(project.technologies, 180))}` : '',
        links.length ? links.join(' | ') : '',
      ].filter(Boolean).join('<br>');
    }).join('<br><br>');

    const [first, second] = projects;
    const summary = `${this.escapeHtml(first.title)} is stronger for ${this.escapeHtml(this.projectFocusLabel(first))}, while ${this.escapeHtml(second.title)} is stronger for ${this.escapeHtml(this.projectFocusLabel(second))}.`;
    const cites = projects
      .map((project) => this.unifiedIndex.find((item) => item.kind === 'project' && this.normalize(item.title) === this.normalize(project.title))?.citation)
      .filter(Boolean) as Citation[];
    const sec = this.unifiedIndex.find((it) => it.id === 'sec-projects')?.citation;
    if (sec) cites.push(sec);
    return `<strong>Quick comparison</strong><br>${sections}<br><br>${summary}${this.buildCitationsHTML(cites)}`;
  }

  private projectFocusLabel(project: ProjectSummary): string {
    const hay = this.normalize(`${project.title} ${project.category} ${project.description || ''} ${this.cleanText(project.technologies, 500)}`);
    if (/\bhealth|patient|triage|booking|provider|medical\b/.test(hay)) return 'healthcare workflow and AI triage';
    if (/\bburnout|well-being|wellbeing|employee|workplace|behavioral\b/.test(hay)) return 'workplace well-being analytics';
    if (/\bfinancial|banking|finance|account|loan|spending|investment|co-pilot\b/.test(hay)) return 'financial decision support';
    if (/\bbarangay|governance|public service|accountability\b/.test(hay)) return 'civic service navigation';
    if (/\bcarbon|sustainability|eco|environment\b/.test(hay)) return 'sustainability tracking';
    return `${project.category.toLowerCase()} delivery`;
  }

  private isBestAIProjectQuery(message: string): boolean {
    const m = this.normalize(message);
    return /\b(ai|ml|machine learning|agentic|gemini|llama)\b/.test(m)
      && /\b(best|strongest|most impressive|showcase|recommend|which|top)\b/.test(m);
  }

  private aiProjectScore(project: ProjectSummary): number {
    const hay = this.normalize(`${project.title} ${project.category} ${project.description || ''} ${this.cleanText(project.technologies, 600)}`);
    let score = 0;
    if (/\bworksight\b/.test(hay)) score += 4;
    if (/\blingaplink\b/.test(hay)) score += 4;
    if (/\bkita\b/.test(hay)) score += 3;
    if (/\b(ai|ml|machine learning)\b/.test(hay)) score += 3;
    if (/\bagentic|agent\b/.test(hay)) score += 3;
    if (/\bllama|gemini|generative ai\b/.test(hay)) score += 2;
    if (/\bpredictive|automation|triage|co-pilot|analytics\b/.test(hay)) score += 1;
    if (/\bai ml\b/.test(hay)) score += 2;
    return score;
  }

  private buildBestAIProjectHTML(): string {
    const ranked = this.getAllProjectSummaries()
      .map((project) => ({ project, score: this.aiProjectScore(project) }))
      .filter(({ score }) => score >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ project }) => project);

    if (!ranked.length) {
      return 'The portfolio has AI-related work, but I could not identify a single strongest AI project from the current project data.';
    }

    const [best, ...also] = ranked;
    const alsoText = also.length
      ? `<br><br><em>Also strong:</em> ${also.map((project) => this.escapeHtml(project.title)).join(', ')}.`
      : '';
    const cites = ranked
      .map((project) => this.unifiedIndex.find((item) => item.kind === 'project' && this.normalize(item.title) === this.normalize(project.title))?.citation)
      .filter(Boolean) as Citation[];
    const sec = this.unifiedIndex.find((it) => it.id === 'sec-projects')?.citation;
    if (sec) cites.push(sec);

    return [
      `<strong>${this.escapeHtml(best.title)}</strong> is the strongest AI showcase.`,
      this.escapeHtml(this.cleanText(best.description, 240)),
      best.technologies ? `<em>Stack:</em> ${this.escapeHtml(this.cleanText(best.technologies, 220))}` : '',
      alsoText,
      this.buildCitationsHTML(cites),
    ].filter(Boolean).join('<br>');
  }

  private getAchievementsFromDOM(): AchievementSnippet[] {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.achievement-card, .achievement-item .achievement-card'));
    return cards.map((el) => ({
      title: el.querySelector('.card-title, .h4.card-title')?.textContent?.trim() || 'Achievement',
      description: el.getAttribute('data-description') || el.querySelector('.card-subtitle')?.textContent?.trim() || undefined,
      date: el.getAttribute('data-date') || el.querySelector('.card-date')?.textContent?.trim() || undefined,
      location: el.getAttribute('data-location') || el.querySelector('.card-location')?.textContent?.trim() || undefined,
      organizer: el.getAttribute('data-organizer') || undefined,
      githubUrl: el.getAttribute('data-github') || undefined,
      linkedinUrl: el.getAttribute('data-linkedin') || undefined,
      blogUrl: el.getAttribute('data-blog') || undefined,
    }));
  }

  private buildProjectsListHTML(projects: ProjectSummary[]): string {
    if (!projects.length) {
      // Fallback to canonical projects
      const all = this.projectRecords().slice(0, 8)
        .map((p) => `<strong>${this.escapeHtml(p.title)}</strong> — ${this.escapeHtml(p.category)}`)
        .join('<br>');
      return `Projects overview:<br>${all}`;
    }

    const visible = projects.slice(0, 7);
    const header = `<strong>Project highlights</strong> — showing ${visible.length} of ${projects.length}`;
    const body = visible.map((p) => {
      const links: string[] = [];
      if (p.liveUrl) links.push(`<a href="${this.sanitizeUrl(p.liveUrl)}" target="_blank" rel="noopener noreferrer">Live</a>`);
      if (p.githubUrl) links.push(`<a href="${this.sanitizeUrl(p.githubUrl)}" target="_blank" rel="noopener noreferrer">GitHub</a>`);
      if (p.videoUrl) links.push(`<a href="${this.sanitizeUrl(p.videoUrl)}" target="_blank" rel="noopener noreferrer">Demo</a>`);
      const linkStr = links.length ? ` — ${links.join(' | ')}` : '';
      const tech = p.technologies ? `<br><em>Stack:</em> ${this.escapeHtml(this.cleanText(p.technologies, 160))}` : '';
      const desc = p.description ? `<br>${this.escapeHtml(this.cleanText(p.description, 170))}` : '';
      return `<strong>${this.escapeHtml(p.title)}</strong> — ${this.escapeHtml(p.category)}${linkStr}${tech}${desc}`;
    }).join('<br><br>');

    return `${header}<br>${body}${projects.length > visible.length ? '<br><br>Ask for a specific project, or open the Projects section for the full gallery.' : ''}`;
  }
  // === End new ===

  // Multi-intent: entity extraction from DOM and KB
  private extractEntities(userMessage: string): ExtractedEntities {
    const msg = this.normalize(userMessage);
    const msgTokens = this.tokenize(userMessage);

    // Collect candidate names from canonical records and DOM
    const projectCandidates = new Set<string>();
    this.projectRecords().forEach(p => projectCandidates.add(this.normalize(p.title)));
    this.getProjectsFromDOM().forEach(p => projectCandidates.add(this.normalize(p.title)));

    const achievementCandidates = new Set<string>();
    this.honorRecords().forEach(a => {
      achievementCandidates.add(this.normalize(a.title));
      if (a.organizer) achievementCandidates.add(this.normalize(a.organizer));
    });
    this.getAchievementsFromDOM().forEach(a => {
      achievementCandidates.add(this.normalize(a.title));
      if (a.organizer) achievementCandidates.add(this.normalize(a.organizer));
    });

    const techCandidates = new Set<string>();
    KB.skills.technologies.forEach(t => techCandidates.add(this.normalize(t)));
    // Also gather tech from projects in DOM and KB
    this.getProjectsFromDOM().forEach(p => {
      this.cleanText(p.technologies || '', 500).split(/[,;•]/).forEach(tok => {
        const n = this.normalize(tok);
        if (n) techCandidates.add(n);
      });
    });
    this.projectRecords().forEach(p => {
      this.cleanText(p.technologies || '', 500).split(/[,;•]/).forEach(tok => {
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
  private scoreIntents(userMessage: string, entities: ExtractedEntities): Array<{ intent: IntentType, score: number }> {
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
      FAQ: 0,
      GENERAL: 0,
    };

    const bump = (intent: keyof typeof weights, n = 1) => { weights[intent] += n; };

    // Keyword signals
    if (/(\bproject(s)?\b|portfolio|work|show project|list project)/.test(m)) bump('PROJECTS', 2);
    if (/(\bcontact\b|email|reach|message)/.test(m)) bump('CONTACT', 2);
    if (/(\bskill(s)?\b|tech|technology|stack|language|framework|tools)/.test(m)) bump('SKILLS', 2);
    if (/(\bdatabase(s)?\b|sql|mysql|firebase|firestore)/.test(m)) bump('DATABASE', 2);
    if (/(\beducation\b|school|university|study|major|graduate|scholarships?|\bscholar\b|financial aid|grants?|dost[-\s]sei|macemco|taguig scholar|lani)/.test(m)) bump('EDUCATION', 2);
    if (/(\baward(s)?\b|achievement(s)?\b|hackathon|win|won|prize|finalist|honorable mention)/.test(m)) bump('ACHIEVEMENTS', 2);
    if (/(\bresume\b|cv)/.test(m)) bump('RESUME', 2);
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
  private chooseTopIntent(intents: Array<{ intent: IntentType, score: number }>, entities: ExtractedEntities, userMessage = ''): IntentType {
    const top = intents[0];
    const second = intents[1];
    const threshold = 1; // minimum credible signal

    if (!top || top.score < threshold) return 'GENERAL';

    const m = this.normalize(userMessage);
    const isAchievementQuestion = /\b(award|awards|achievement|achievements|hackathon|win|won|prize|finalist|recognition|honor|honours|placed|place)\b/.test(m);
    const projectDetailsScore = intents.find((x) => x.intent === 'PROJECT_DETAILS')?.score || 0;
    const achievementDetailsScore = intents.find((x) => x.intent === 'ACHIEVEMENT_DETAILS')?.score || 0;

    if (entities.projects.length && projectDetailsScore >= threshold && !isAchievementQuestion) {
      if (top.intent === 'ACHIEVEMENT_DETAILS' || top.intent === 'ACHIEVEMENTS' || achievementDetailsScore <= projectDetailsScore + 1) {
        return 'PROJECT_DETAILS';
      }
    }

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

  private buildMultiIntentResponse(userMessage: string, intents: Array<{ intent: IntentType, score: number }>): string | null {
    const lower = userMessage.toLowerCase();
    const isCompound = /\b(and|also|plus|as well as|along with|&|, then|, and)\b/.test(lower);
    if (!isCompound) return null;

    const candidates = intents
      .filter((x) => x.score >= 2 && !['GENERAL'].includes(x.intent))
      .map((x) => x.intent)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .slice(0, 2);

    if (candidates.length < 2) return null;

    const labelMap: Record<IntentType, string> = {
      FAQ: 'FAQ',
      PROJECTS: 'Projects',
      PROJECT_DETAILS: 'Project Details',
      CONTACT: 'Contact',
      SKILLS: 'Skills',
      DATABASE: 'Databases',
      EDUCATION: 'Education',
      ACHIEVEMENTS: 'Achievements',
      ACHIEVEMENT_DETAILS: 'Achievement Details',
      RESUME: 'Resume',
      GENERAL: 'General',
    };

    const sections = candidates
      .map((intent) => `<strong>${labelMap[intent]}</strong><br>${this.routeIntent(intent, userMessage)}`)
      .join('<br><br>');

    return sections;
  }

  private detectIntent(userMessage: string): IntentType {
    const m = userMessage.toLowerCase();
    if (this.isFollowUpMessage(userMessage) && this.conversationContext.lastIntent) {
      return this.conversationContext.lastIntent;
    }
    // Prioritize specific intents first, and use word boundaries to avoid substring collisions (e.g., 'how' in 'show')
    if (/(project|projects|portfolio|work)\b/.test(m)) {
      const p = this.findProject(userMessage);
      return p ? 'PROJECT_DETAILS' : 'PROJECTS';
    }
    if (/(contact|email|reach|message)\b/.test(m)) return 'CONTACT';
    if (/(skill|skills|tech|technology|stack)\b/.test(m)) return 'SKILLS';
    if (/(database|databases|sql|mysql|firebase|firestore)\b/.test(m)) return 'DATABASE';
    if (/(education|school|university|study|scholarships?|\bscholar\b|financial aid|grants?|dost[-\s]sei|macemco|taguig scholar|lani)\b/.test(m)) return 'EDUCATION';
    if (/(award|awards|achievement|achievements|hackathon|win)\b/.test(m)) {
      const a = this.findAchievement(userMessage);
      return a ? 'ACHIEVEMENT_DETAILS' : 'ACHIEVEMENTS';
    }
    if (/(resume|cv)\b/.test(m)) return 'RESUME';
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
        return ['List scholarships', 'Where do you study?', 'What’s your major?', 'Graduation year?'];
      case 'ACHIEVEMENTS':
        return ['Top hackathon wins', 'Details on Technovation 2025', 'Show awards timeline'];
      case 'FAQ':
        return ['What can you do?', 'How is the site built?', 'Is there a resume?', 'Open Projects section'];
      case 'RESUME':
        return ['Open resume', 'Share contact info', 'List skills'];
      default:
        if (p) {
          const proj = p as ProjectItem;
          const base = ['Share contact info', 'List skills', 'Open Projects section'];
          if (proj.githubUrl) base.unshift(`Open ${proj.title} GitHub`);
          if (proj.liveUrl) base.unshift(`Open ${proj.title} site`);
          base.unshift(`Show ${proj.title} details`);
          return base;
        }
        return ['Best AI project', 'Compare WorkSight and LingapLink', 'Share contact info', 'List skills'];
    }
  }

  private buildTurnSuggestions(userMessage: string, intent: IntentType, responseText = ''): string[] {
    const normalizedResponse = this.normalize(responseText);
    const project = this.findProject(userMessage)
      || findProjectRecord(responseText)
      || this.findProjectByTitle(this.conversationContext.lastProjectTitle);
    const achievement = this.findAchievement(userMessage)
      || findHonorRecord(responseText)
      || this.findAchievementByTitle(this.conversationContext.lastAchievementTitle);

    if (this.isScholarshipQuery(userMessage)) {
      return ['Why do these matter?', 'Show education background', 'Open resume', 'Top achievements'];
    }

    if (this.isOpportunityQuery(userMessage)) {
      return ['Open resume', 'Show strongest projects', 'Share contact info', 'Show proof of AI skill'];
    }

    if (this.isProofQuery(userMessage)) {
      return ['Best AI project', 'Compare WorkSight and LingapLink', 'Open Projects section', 'Open resume'];
    }

    if (project) {
      const suggestions = [`Open ${project.title} project`, 'Show tech stack', 'Open Projects section'];
      if (project.githubUrl) suggestions.unshift(`Open ${project.title} GitHub`);
      if (project.liveUrl || project.videoUrl) suggestions.unshift(`Open ${project.title} demo`);
      return suggestions.slice(0, 4);
    }

    if (achievement) {
      const suggestions = [`Open ${achievement.title} honor`, 'Show awards timeline', 'Why is this impressive?', 'Open honors section'];
      if (achievement.projectTitle) suggestions.unshift(`Open linked project: ${achievement.projectTitle}`);
      return suggestions.slice(0, 4);
    }

    if (intent === 'SKILLS' || /\bskill|stack|technology|frontend|backend|database\b/.test(normalizedResponse)) {
      return ['Show proof of AI skill', 'Show projects using Firebase', 'Compare WorkSight and LingapLink', 'Open Projects section'];
    }

    if (intent === 'ACHIEVEMENTS') {
      return ['Top hackathon wins', 'Details on Technovation 2025', 'Show proof of AI skill', 'Open honors section'];
    }

    if (intent === 'CONTACT') {
      return ['Open resume', 'How to connect on LinkedIn?', 'Share GitHub link', 'Why hire Adriel?'];
    }

    if (intent === 'RESUME') {
      return ['Why hire Adriel?', 'Show strongest projects', 'Share contact info', 'List skills'];
    }

    if (this.conversationContext.visitorProfile === 'recruiter') {
      return ['Open resume', 'Show strongest projects', 'Share contact info', 'Show proof of AI skill'];
    }

    return ['Why hire Adriel?', 'Best AI project', 'Show proof of AI skill', 'Share contact info'];
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

  // Sentiment analysis: detect user emotion/tone to adapt response style
  private detectSentiment(userMessage: string): 'curious' | 'frustrated' | 'professional' | 'casual' | 'excited' {
    const m = userMessage.toLowerCase();

    // Frustrated: negative words, frustration indicators
    if (/(frustrated|annoying|useless|doesn't work|broken|hate|worst|terrible|ugh|sigh|:\(|😤|😡)/.test(m)) {
      return 'frustrated';
    }

    // Excited: enthusiasm markers
    if (/(wow|amazing|awesome|love|great|excellent|perfect|best|😍|🎉|❤️|!!|cool|brilliant)/.test(m)) {
      return 'excited';
    }

    // Professional: formal language, business terms
    if (/(regarding|inquire|professional|collaborate|opportunity|position|hiring|recruit|resume|cv|experience|qualifications)/.test(m)) {
      return 'professional';
    }

    // Curious: questions and exploration
    if (/(\?|how|what|why|tell me|show me|explain|describe|curious|wondering|interested in)/.test(m)) {
      return 'curious';
    }

    // Default: casual
    return 'casual';
  }

  // Get tone instructions for Gemini based on sentiment
  private getToneInstructions(sentiment: 'curious' | 'frustrated' | 'professional' | 'casual' | 'excited'): string {
    switch (sentiment) {
      case 'frustrated':
        return 'The user seems frustrated. Be extra patient, empathetic, and direct. Acknowledge their frustration briefly and provide clear, actionable information without being overly apologetic.';
      case 'excited':
        return 'The user is enthusiastic! Match their energy with excitement and enthusiasm. Be warm and encouraging. Use positive language.';
      case 'professional':
        return 'The user is being professional. Be formal, concise, and business-appropriate. Focus on qualifications, experience, and concrete achievements. Avoid casual language or emojis.';
      case 'curious':
        return 'The user is curious and exploratory. Be helpful and informative. Provide details and suggest related topics they might find interesting.';
      default:
        return 'The user is casual. Be friendly and conversational while staying helpful.';
    }
  }

  // Convert markdown formatting to HTML for proper display in chat
  private markdownToHtml(text: string): string {
    const escaped = this.escapeHtml(text);
    return escaped
      // Convert markdown links [text](url) to clickable <a> tags
      .replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, (_match, label: string, url: string) =>
        `<a href="${this.sanitizeUrl(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
      )
      // Convert bare URLs to clickable links (http/https)
      .replace(/(?<![">])(https?:\/\/[^\s<]+)/g, (url: string) =>
        `<a href="${this.sanitizeUrl(url)}" target="_blank" rel="noopener noreferrer">${url}</a>`
      )
      // Convert **bold** to <strong>
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Convert *italic* to <em>
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Convert `code` to <code>
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Convert markdown bullet lists: * item or - item at start of line
      .replace(/^[*-]\s+(.+)$/gm, '• $1')
      // Convert numbered lists: 1. item
      .replace(/^\d+\.\s+(.+)$/gm, '→ $1')
      // Convert double newlines to <br><br>
      .replace(/\n\n/g, '<br><br>')
      // Convert single newlines to <br>
      .replace(/\n/g, '<br>')
      // Clean up any remaining stray asterisks at word boundaries
      .replace(/(\s)\*(\S)/g, '$1$2')
      .replace(/(\S)\*(\s)/g, '$1$2');
  }

  private formatResponse(text: string, tone: 'concise' | 'detailed' | 'playful' = 'concise', source: 'markdown' | 'html' = 'markdown'): string {
    const htmlText = source === 'html' ? text : this.markdownToHtml(text);
    if (tone === 'concise') return htmlText;
    if (tone === 'playful') return `${htmlText} 🎉`;
    return `${htmlText}${this.conversationSummary ? `<br><em>Based on our chat:</em> ${this.conversationSummary}` : ''}`;
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
        const top = this.projectRecords().slice(0, 3)
          .map((p) => `${this.escapeHtml(p.title)} — ${this.escapeHtml(this.cleanText(p.technologies.split(';')[0], 100))}`)
          .join('; ');
        const cites: Citation[] = [];
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-projects')?.citation;
        if (sec) cites.push(sec);
        return `Highlighted projects: ${top}. See Projects section for details and links.${this.buildCitationsHTML(cites)}`;
      }
      case 'PROJECTS': {
        const fromDom = this.getProjectsFromDOM();
        if (this.isBestAIProjectQuery(message)) {
          return this.buildBestAIProjectHTML();
        }
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
          return `Email: <a href="mailto:${this.escapeHtml(c.email)}">${this.escapeHtml(c.email)}</a>${this.buildCitationsHTML(cites)}`;
        }
        if (/\bgithub\b|\bgit\b/.test(m)) {
          const cites: Citation[] = [];
          const ghCite = this.unifiedIndex.find((it) => it.id === 'kb-contact-github')?.citation;
          if (ghCite) cites.push(ghCite);
          const sec = this.unifiedIndex.find((it) => it.id === 'sec-contact')?.citation;
          if (sec) cites.push(sec);
          return `GitHub: <a href="${this.sanitizeUrl(c.github)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(c.github)}</a>${this.buildCitationsHTML(cites)}`;
        }
        if (/\blinked?in\b/.test(m)) {
          const cites: Citation[] = [];
          const liCite = this.unifiedIndex.find((it) => it.id === 'kb-contact-linkedin')?.citation;
          if (liCite) cites.push(liCite);
          const sec = this.unifiedIndex.find((it) => it.id === 'sec-contact')?.citation;
          if (sec) cites.push(sec);
          return `LinkedIn: <a href="${this.sanitizeUrl(c.linkedin)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(c.linkedin)}</a>${this.buildCitationsHTML(cites)}`;
        }
        if (/\bresume\b|\bcv\b/.test(m)) {
          const cites: Citation[] = [];
          const cvCite = this.unifiedIndex.find((it) => it.id === 'kb-contact-resume')?.citation;
          if (cvCite) cites.push(cvCite);
          const sec = this.unifiedIndex.find((it) => it.id === 'sec-contact')?.citation;
          if (sec) cites.push(sec);
          return `${this.buildResumeSummaryHTML()}${this.buildCitationsHTML(cites)}`;
        }
        // Otherwise, show a compact contact card without trailing periods
        const body = [
          `Email: <a href="mailto:${this.escapeHtml(c.email)}">${this.escapeHtml(c.email)}</a>`,
          `GitHub: <a href="${this.sanitizeUrl(c.github)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(c.github)}</a>`,
          `LinkedIn: <a href="${this.sanitizeUrl(c.linkedin)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(c.linkedin)}</a>`,
          `Resume: <a href="${this.sanitizeUrl(c.resumeUrl)}" target="_blank" rel="noopener noreferrer">resume.pdf</a>`,
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
        const cites: Citation[] = [];
        const cvCite = this.unifiedIndex.find((it) => it.id === 'kb-contact-resume')?.citation;
        if (cvCite) cites.push(cvCite);
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-contact')?.citation;
        if (sec) cites.push(sec);
        return `${this.buildResumeSummaryHTML()}${this.buildCitationsHTML(cites)}`;
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
        return `Adriel has used ${dbs.map((db) => this.escapeHtml(db)).join(', ')} across web apps for auth, records, dashboards, and analytics workflows.${this.buildCitationsHTML(cites)}`;
      }
      case 'EDUCATION': {
        if (this.isScholarshipQuery(message)) {
          return this.buildScholarshipsHTML();
        }
        const e = KB.education
          .map((ed) => `${this.escapeHtml(ed.school)}${ed.program ? ` — ${this.escapeHtml(ed.program)}` : ''}${ed.period ? ` (${this.escapeHtml(ed.period)})` : ''}`)
          .join('; ');
        const cites: Citation[] = [];
        const sec = this.unifiedIndex.find((it) => it.id === 'sec-education')?.citation;
        if (sec) cites.push(sec);
        cites.push(...this.unifiedIndex.filter((it) => it.kind === 'education').map(it => it.citation));
        return `Education: ${e}.${this.buildCitationsHTML(cites)}`;
      }
      case 'ACHIEVEMENT_DETAILS': {
        const a = this.findAchievement(message);
        const indexedAchievement = a ? null : this.findIndexedAchievement(message);
        const body = a
          ? this.buildAchievementsHTML(a)
          : indexedAchievement?.data
            ? this.buildAchievementSnippetHTML(indexedAchievement.data as AchievementSnippet)
            : this.buildAchievementsHTML();
        const cites: Citation[] = [];
        if (a) {
          cites.push(...this.unifiedIndex.filter((it) => it.kind === 'achievement' && this.normalize(it.title) === this.normalize(a.title)).map(it => it.citation));
        } else if (indexedAchievement) {
          cites.push(indexedAchievement.citation);
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
      case 'FAQ': {
        const m = message.toLowerCase();
        if (/how.*built|how.*site|stack|tech|technology/.test(m)) {
          return [
            'This site runs a TypeScript SPA with modular managers for navigation, loading, images, performance, and accessibility.',
            'It uses Vite tooling, intersection observers for lazy loading, and optimized picture-based media.',
            'Sections are navigable client-side with route syncing, and there is a site-wide search overlay triggered through query search.',
          ].join(' ');
        }
        return `I can help you navigate sections, share highlights, and surface links (e.g., resume, projects, achievements). Ask me anything about the portfolio!`;
      }
      default: {
        return `${this.escapeHtml(KB.profile.title)}. ${this.escapeHtml(KB.profile.summary)} Learn more via Projects, Skills, and Achievements — or ask for specifics.`;
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
        const topTech = Array.from(techCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
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
      this.saveMemory();
    }
  }

  private buildContext(): string {
    const profile = `Name: ${KB.profile.name}
Title: ${KB.profile.title}
Summary: ${KB.profile.summary}
Nationality: ${KB.profile.nationality || 'Filipino'}`;

    const skills = `Core Skills: ${KB.skills.core.join(', ')}
Technologies: ${KB.skills.technologies.join(', ')}`;

    const resume = `Headline: ${KB.resume.headline}
Location: ${KB.resume.location}
Resume Highlights:
${KB.resume.highlights.map((item) => `- ${item}`).join('\n')}
Certifications:
${KB.resume.certifications.map((item) => `- ${item}`).join('\n')}
Organizations:
${KB.resume.organizations.map((item) => `- ${item}`).join('\n')}`;

    const experience = KB.experience.map(e =>
      `- ${e.role} at ${e.company} (${e.period}): ${e.summary || 'Professional experience'}`
    ).join('\n');

    const education = KB.education.map(e =>
      `- ${e.school}${e.program ? ` — ${e.program}` : ''}${e.period ? ` (${e.period})` : ''}${e.notes ? `. ${e.notes}` : ''}`
    ).join('\n');

    const scholarships = KB.scholarships.map(s =>
      `- ${s.title} (${s.period}): ${s.provider}${s.program ? ` — ${s.program}` : ''}. ${s.notes}`
    ).join('\n');

    const domProjects = this.getProjectsFromDOM();
    const projectSource = domProjects.length ? domProjects : this.projectRecords();
    const projects = projectSource.slice(0, 16).map(p =>
      `- ${p.title} (${p.category}): ${this.cleanText(p.description, 170) || 'Project details available'}. Tech: ${this.cleanText(p.technologies, 140) || 'Various'}. ${p.githubUrl ? `GitHub: ${p.githubUrl}` : ''}${p.liveUrl ? ` Live: ${p.liveUrl}` : ''}${p.videoUrl ? ` Demo: ${p.videoUrl}` : ''}`
    ).join('\n');

    const domAchievements = this.getAchievementsFromDOM();
    const achievementSource: AchievementSnippet[] = [
      ...this.honorRecords().map((achievement) => ({
        title: achievement.title,
        description: achievement.description,
        date: achievement.date,
        location: achievement.location,
        organizer: achievement.organizer,
        githubUrl: achievement.githubUrl,
        linkedinUrl: achievement.linkedinUrl,
        blogUrl: achievement.blogUrl,
      })),
      ...domAchievements,
    ];
    const seenAchievements = new Set<string>();
    const achievements = achievementSource
      .filter((a) => {
        const key = this.normalize(a.title);
        if (!key || seenAchievements.has(key)) return false;
        seenAchievements.add(key);
        return true;
      })
      .slice(0, 14)
      .map(a =>
        `- ${a.title}: ${this.cleanText(a.description, 130) || a.organizer || 'Achievement'}${a.location || a.date ? ` (${[a.location, a.date].filter(Boolean).join(', ')})` : ''}`
      ).join('\n');

    const contact = `Email: ${KB.contact.email}
GitHub: ${KB.contact.github}
LinkedIn: ${KB.contact.linkedin}
Resume: ${KB.contact.resumeUrl}`;

    const activePortfolioContext = this.getActivePortfolioContext();
    const agentState = `Visitor Profile: ${this.conversationContext.visitorProfile}
Active Topic: ${this.conversationContext.lastTopic || 'none'}
Last Project: ${this.conversationContext.lastProjectTitle || 'none'}
Last Achievement: ${this.conversationContext.lastAchievementTitle || 'none'}
Last Technology: ${this.conversationContext.lastTechnology || 'none'}
Current Portfolio Context: ${activePortfolioContext.type} — ${activePortfolioContext.title}${activePortfolioContext.detail ? ` (${activePortfolioContext.detail})` : ''}
Instruction: ${this.visitorProfileInstruction()}`;

    const localMemory = [
      this.conversationSummary,
      this.topicSummaries.projects,
      this.topicSummaries.skills,
      this.topicSummaries.achievements,
    ].filter(Boolean).join('\n');

    // Include topic summaries if available for conversation context
    const topicContext = [
      this.topicSummaries.projects,
      this.topicSummaries.skills,
      this.topicSummaries.achievements
    ].filter(Boolean).join('\n');

    return [
      '=== AGENT STATE ===', agentState,
      '=== PROFILE ===', profile,
      '\n=== RESUME FACTS ===', resume,
      '\n=== SKILLS ===', skills,
      '\n=== EXPERIENCE ===', experience || 'Currently focused on studies and hackathons',
      '\n=== EDUCATION ===', education,
      '\n=== SCHOLARSHIPS ===', scholarships,
      '\n=== PROJECTS (Highlights) ===', projects,
      '\n=== ACHIEVEMENTS ===', achievements,
      '\n=== CONTACT ===', contact,
      localMemory ? `\n=== LOCAL FOLLOW-UP MEMORY ===\n${localMemory}` : '',
      topicContext ? `\n=== CURRENT DISCUSSION ===\n${topicContext}` : ''
    ].join('\n');
  }

  private async handleMessage(userMessage: string): Promise<void> {
    const controlResponse = this.handleControlCommand(userMessage);
    if (controlResponse) {
      this.addMessage(this.formatResponse(controlResponse, this.detailedMode ? 'detailed' : 'concise', 'html'), 'bot');
      return;
    }

    const guard = this.applyGuardrails(userMessage);
    if (guard) {
      this.addMessage(this.formatResponse(guard, 'concise'), 'bot');
      return;
    }

    if (this.tryHandleDirectAction(userMessage)) {
      return;
    }

    const smallTalkResponse = this.buildSmallTalkResponse(userMessage);
    if (smallTalkResponse) {
      this.addMessage(this.formatResponse(smallTalkResponse, 'concise', 'html'), 'bot');
      return;
    }

    const profileResponse = this.buildProfileResponse(userMessage);
    if (profileResponse) {
      this.addMessage(this.formatResponse(profileResponse, 'concise', 'html'), 'bot');
      return;
    }

    const scholarshipResponse = this.isScholarshipQuery(userMessage)
      ? this.buildScholarshipsHTML()
      : null;
    const scholarshipImpactResponse = scholarshipResponse && !this.shouldUseStructuredScholarshipAnswer(userMessage)
      ? this.buildScholarshipImpactHTML()
      : null;
    const opportunityResponse = this.isOpportunityQuery(userMessage)
      ? this.buildOpportunityHTML()
      : null;
    const proofResponse = this.isProofQuery(userMessage)
      ? this.buildProofPackHTML(userMessage)
      : null;
    const projectComparisonResponse = this.buildProjectComparisonHTML(userMessage);
    const structuredResponse = scholarshipResponse && this.shouldUseStructuredScholarshipAnswer(userMessage)
      ? scholarshipResponse
      : scholarshipImpactResponse || opportunityResponse || proofResponse || projectComparisonResponse;

    // Detect intents/entities early so both Gemini and local fallback can reuse them
    const { intents, entities } = this.detectIntents(userMessage);
    const scoredIntent = this.chooseTopIntent(intents, entities, userMessage);
    const intent = scholarshipResponse
      ? 'EDUCATION'
      : this.isFollowUpMessage(userMessage) && this.conversationContext.lastIntent
      ? this.conversationContext.lastIntent
      : scoredIntent;

    if (structuredResponse || (scholarshipResponse && !this.aiService.isAvailable())) {
      const response = structuredResponse || scholarshipResponse || '';
      this.addMessage(
        this.formatResponse(response, this.detailedMode ? 'detailed' : 'concise', 'html'),
        'bot',
        this.buildTurnSuggestions(userMessage, intent, response)
      );
      this.updateConversationContext(userMessage, intent, entities);
      return;
    }

    // Try Gemini first with conversation history for context
    let aiResponse: string | null = null;
    let aiResponseIsHtml = false;
    if (this.aiService.isAvailable()) {
      this.setInputPending(true);
      this.showTypingIndicator();
      try {
        const retrieved = this.buildRetrievedContextSnippet(userMessage);
        const context = [
          this.buildContext(),
          retrieved ? `\n=== RETRIEVED MATCHES FOR CURRENT QUERY ===\n${retrieved}` : ''
        ].join('');
        // Pass recent conversation history for multi-turn awareness
        const recentHistory = this.messages.slice(-10).map(m => ({
          role: m.role as 'user' | 'bot',
          content: m.content
        }));
        // Detect user sentiment and get tone instructions for adaptive responses
        const sentiment = this.detectSentiment(userMessage);
        const toneInstructions = this.getToneInstructions(sentiment);
        aiResponse = await this.aiService.generateResponse(userMessage, context, recentHistory, toneInstructions);
        if (!aiResponse) {
          logger.warn('All AI providers returned null, falling back to local KB.');
        } else {
          logger.log(`Response served by: ${this.aiService.lastProvider}`);
        }
      } catch (err) {
        logger.error('AI service fallback due to error:', err);
      } finally {
        this.hideTypingIndicator();
        this.setInputPending(false);
        try { this.inputField?.focus({ preventScroll: true }); } catch { void 0; }
      }
    }

    if (aiResponse) {
      if (scholarshipResponse && !this.isCompleteScholarshipAnswer(aiResponse)) {
        aiResponse = scholarshipResponse;
        aiResponseIsHtml = true;
      }
      const citations = this.getCitationsForQuery(userMessage, intent);
      const formattedResponse = this.formatResponse(
        aiResponse,
        this.detailedMode ? 'detailed' : 'concise',
        aiResponseIsHtml ? 'html' : 'markdown'
      );
      this.addMessage(
        `${formattedResponse}${this.buildCitationsHTML(citations)}`,
        'bot',
        this.buildTurnSuggestions(userMessage, intent, aiResponse)
      );
      this.updateConversationContext(userMessage, intent, entities);
      return;
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
    const multiIntentResponse = this.buildMultiIntentResponse(userMessage, intents);
    const botResponse = scholarshipResponse
      || projectComparisonResponse
      || multiIntentResponse
      || (intent === 'GENERAL' ? this.buildSmartGeneralResponse(userMessage) : this.routeIntent(intent, userMessage));
    this.addMessage(
      this.formatResponse(botResponse, this.detailedMode ? 'detailed' : 'concise', 'html'),
      'bot',
      this.buildTurnSuggestions(userMessage, intent, botResponse)
    );
    this.updateConversationContext(userMessage, intent, entities);
  }

  // Dev-only proxy check. Credentials remain server-side in every environment.
  private async checkGeminiConnectivity(): Promise<string> {
    if (!import.meta.env.DEV) return 'AdrAI diagnostics are disabled outside development.';
    if (import.meta.env.VITE_AI_PROXY_IN_DEV !== 'true') {
      return 'AdrAI uses the server proxy in production. Enable VITE_AI_PROXY_IN_DEV only when a local API runtime is available.';
    }
    const response = await this.aiService.generateResponse('Reply with exactly: proxy ready.', 'Development connectivity check.');
    return response ? 'AdrAI server proxy responded successfully.' : 'AdrAI server proxy did not respond; local portfolio answers remain available.';
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

  private loadMemory(): void {
    try {
      const raw = localStorage.getItem(this.memoryKey);
      if (!raw) return;
      const memory = JSON.parse(raw) as StoredAgentMemory;
      if (typeof memory.conversationSummary === 'string') {
        this.conversationSummary = memory.conversationSummary;
      }
      if (memory.topicSummaries) {
        this.topicSummaries = {
          ...this.topicSummaries,
          ...memory.topicSummaries,
        };
      }
      if (memory.conversationContext) {
        this.conversationContext = {
          ...this.conversationContext,
          ...memory.conversationContext,
          lastRetrievedTitles: Array.isArray(memory.conversationContext.lastRetrievedTitles)
            ? memory.conversationContext.lastRetrievedTitles.slice(0, 5)
            : [],
        };
      }
    } catch { /* ignore */ }
  }

  private saveMemory(): void {
    try {
      const memory: StoredAgentMemory = {
        conversationSummary: this.conversationSummary,
        conversationContext: this.conversationContext,
        topicSummaries: this.topicSummaries,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(this.memoryKey, JSON.stringify(memory));
    } catch { /* ignore */ }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem('adrAI:prefs', JSON.stringify(this.userPrefs));
    } catch { /* ignore */ }
  }
}
