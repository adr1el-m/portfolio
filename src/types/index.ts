/**
 * Global type definitions for the portfolio
 */

export interface PortfolioConfig {
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  MAX_RETRIES: number;
  RETRY_DELAY: number;
}

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export interface Teammate {
  name: string;
  role?: string;
}

export interface AchievementData {
  title: string;
  images: string[];
  webpImages: string[];
  organizer: string;
  date: string;
  location: string;
  teammates?: Teammate[];
  githubUrl?: string;
  description?: string;
  projectTitle?: string;
  linkedinUrl?: string;
  blogUrl?: string;
  facebookUrl?: string;
}

export interface ProjectData {
  title: string;
  category: string;
  images: string[];
  webpImages: string[];
  description: string;
  technologies: string;
  videoUrl?: string;
  githubUrl?: string;
  liveUrl?: string;
  codedexUrl?: string;
}

export interface Portfolio {
  core?: {
    version: string;
    initialized: boolean;
    auditMode?: boolean;
    prefersReducedMotion?: boolean;
  };
  modules: {
    [key: string]: unknown;
  };
  lazy?: {
    [key: string]: unknown;
  };
  legacy?: Record<string, (...args: unknown[]) => unknown>;
  utils?: Record<string, (...args: unknown[]) => unknown>;
}

declare global {
  interface Window {
    Portfolio: Portfolio;
    CONFIG?: PortfolioConfig;
    VanillaTilt?: { init: (elements: NodeListOf<Element> | Element[], options?: Record<string, unknown>) => void };
    va?: (event: string, data: unknown) => void;
    __techStackResizeBound?: boolean;
  }
}

export {}
