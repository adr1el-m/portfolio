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

export interface AchievementData {
  title: string;
  images: string[];
  webpImages: string[];
  organizer: string;
  date: string;
  location: string;
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
  modules: {
    [key: string]: any;
  };
  lazy?: {
    [key: string]: any;
  };
  legacy?: Record<string, Function>;
  utils?: Record<string, Function>;
}

declare global {
  interface Window {
    Portfolio: Portfolio;
    CONFIG?: PortfolioConfig;
    openAchievementModal?: (element: HTMLElement) => void;
    openProjectModal?: (element: HTMLElement) => void;
    toggleFAQ?: (element: HTMLElement) => void;
  }
}

export {}
