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
}

export interface ProjectData {
  title: string;
  category: string;
  images: string[];
  webpImages: string[];
  description: string;
  technologies: string;
  githubUrl?: string;
  liveUrl?: string;
}

export interface Portfolio {
  core?: {
    version: string;
    initialized: boolean;
  };
  modules: Record<string, unknown>;
  lazy?: Record<string, unknown>;
  legacy?: Record<string, (...args: unknown[]) => unknown>;
  utils?: Record<string, (...args: unknown[]) => unknown>;
}

declare global {
  interface Window {
    Portfolio: Portfolio;
    CONFIG?: PortfolioConfig;
  }
}

// BeforeInstallPromptEvent interface for PWA install prompt
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// VanillaTilt options interface
export interface VanillaTiltOptions {
  max?: number;
  speed?: number;
  glare?: boolean;
  'max-glare'?: number;
  scale?: number;
  reverse?: boolean;
}

// VanillaTilt library interface
export interface VanillaTilt {
  init(elements: NodeListOf<Element> | Element[] | Element, options?: VanillaTiltOptions): void;
  destroy(): void;
}

// Extend Window interface with custom properties
declare global {
  interface Window {
    VanillaTilt?: VanillaTilt;
  }
  
  interface Navigator {
    standalone?: boolean;
  }
}

export {}
