/**
 * Performance Monitoring Module
 * Tracks Core Web Vitals, performance metrics, and reports to analytics
 */

import { onCLS, onLCP, onFCP, onTTFB, onINP, Metric } from 'web-vitals';
import { logger } from '../config';

interface PerformanceReport {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

interface PerformanceBudget {
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay (deprecated, replaced by INP)
  CLS: number; // Cumulative Layout Shift
  FCP: number; // First Contentful Paint
  TTFB: number; // Time to First Byte
  INP: number; // Interaction to Next Paint
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceReport> = new Map();
  private budgetViolations: string[] = [];

  // Performance budgets based on Google's Core Web Vitals thresholds
  private readonly performanceBudget: PerformanceBudget = {
    LCP: 2500, // Good: < 2.5s, Poor: > 4s
    FID: 100,  // Good: < 100ms, Poor: > 300ms (legacy)
    CLS: 0.1,  // Good: < 0.1, Poor: > 0.25
    FCP: 1800, // Good: < 1.8s, Poor: > 3s
    TTFB: 800, // Good: < 800ms, Poor: > 1800ms
    INP: 200,  // Good: < 200ms, Poor: > 500ms
  };

  private constructor() {
    this.initializeWebVitals();
    this.trackResourceTiming();
    this.trackNavigationTiming();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize Core Web Vitals tracking
   */
  private initializeWebVitals(): void {
    // Largest Contentful Paint (LCP)
    onLCP(this.handleMetric.bind(this), { reportAllChanges: false });

    // Cumulative Layout Shift (CLS)
    onCLS(this.handleMetric.bind(this), { reportAllChanges: false });

    // First Contentful Paint (FCP)
    onFCP(this.handleMetric.bind(this), { reportAllChanges: false });

    // Time to First Byte (TTFB)
    onTTFB(this.handleMetric.bind(this), { reportAllChanges: false });

    // Interaction to Next Paint (INP) - New metric replacing FID
    onINP(this.handleMetric.bind(this), { reportAllChanges: false });

    logger.info('✅ Core Web Vitals monitoring initialized');
  }

  /**
   * Handle and process Web Vitals metrics
   */
  private handleMetric(metric: Metric): void {
    const { name, value, delta, id, navigationType } = metric;
    const rating = this.getRating(name, value);

    const report: PerformanceReport = {
      metric: name,
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      rating,
      delta: Math.round(delta),
      id,
      navigationType: navigationType as string,
    };

    this.metrics.set(name, report);

    // Check against performance budget
    this.checkBudget(name, value);

    // Log metric
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
    logger.info(`${emoji} ${name}: ${this.formatValue(name, value)} (${rating})`);

    // Send to analytics (if available)
    this.sendToAnalytics(report);

    // Display in console for development
    if (import.meta.env.DEV) {
      console.table({
        Metric: name,
        Value: this.formatValue(name, value),
        Rating: rating,
        Budget: this.formatValue(name, this.performanceBudget[name as keyof PerformanceBudget]),
        Status: rating === 'good' ? '✅ Pass' : '❌ Fail',
      });
    }
  }

  /**
   * Get rating for a metric based on Core Web Vitals thresholds
   */
  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
      INP: { good: 200, poor: 500 },
    };

    const threshold = thresholds[name];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Format metric value for display
   */
  private formatValue(name: string, value: number): string {
    if (name === 'CLS') {
      return value.toFixed(3);
    }
    return `${Math.round(value)}ms`;
  }

  /**
   * Check if metric violates performance budget
   */
  private checkBudget(name: string, value: number): void {
    const budget = this.performanceBudget[name as keyof PerformanceBudget];
    if (budget && value > budget) {
      const violation = `${name} exceeds budget: ${this.formatValue(name, value)} > ${this.formatValue(name, budget)}`;
      this.budgetViolations.push(violation);
      logger.warn(`⚠️ Budget violation: ${violation}`);
    }
  }

  /**
   * Track resource timing (JS, CSS, images, etc.)
   */
  private trackResourceTiming(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource');
      const resourceStats = {
        total: resources.length,
        scripts: 0,
        stylesheets: 0,
        images: 0,
        fonts: 0,
        totalSize: 0,
      };

      resources.forEach((resource: any) => {
        const type = resource.initiatorType;
        if (type === 'script') resourceStats.scripts++;
        if (type === 'css' || type === 'link') resourceStats.stylesheets++;
        if (type === 'img') resourceStats.images++;
        if (type === 'font') resourceStats.fonts++;
        resourceStats.totalSize += resource.transferSize || 0;
      });

      logger.info('📊 Resource Stats:', resourceStats);

      // Warn if too many resources
      if (resourceStats.scripts > 10) {
        logger.warn(`⚠️ High script count: ${resourceStats.scripts} (optimize bundle)`);
      }
      if (resourceStats.images > 20) {
        logger.warn(`⚠️ High image count: ${resourceStats.images} (consider lazy loading)`);
      }
    });
  }

  /**
   * Track navigation timing
   */
  private trackNavigationTiming(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const timings = {
          'DNS Lookup': Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
          'TCP Connection': Math.round(navigation.connectEnd - navigation.connectStart),
          'Request Time': Math.round(navigation.responseStart - navigation.requestStart),
          'Response Time': Math.round(navigation.responseEnd - navigation.responseStart),
          'DOM Processing': Math.round(navigation.domContentLoadedEventEnd - navigation.responseEnd),
          'Page Load': Math.round(navigation.loadEventEnd - navigation.fetchStart),
        };

        logger.info('⏱️ Navigation Timing:', timings);
      }
    });
  }

  /**
   * Send metrics to analytics
   */
  private sendToAnalytics(report: PerformanceReport): void {
    // Send to Vercel Analytics (automatically collected)
    // You can also send custom events if needed
    if (typeof window !== 'undefined' && (window as any).va) {
      (window as any).va('event', {
        name: 'web_vital',
        data: {
          metric: report.metric,
          value: report.value,
          rating: report.rating,
        },
      });
    }
  }

  /**
   * Get all collected metrics
   */
  public getMetrics(): Map<string, PerformanceReport> {
    return this.metrics;
  }

  /**
   * Get performance score (0-100)
   */
  public getPerformanceScore(): number {
    if (this.metrics.size === 0) return 0;

    let score = 0;
    let count = 0;

    this.metrics.forEach((report) => {
      count++;
      if (report.rating === 'good') score += 100;
      else if (report.rating === 'needs-improvement') score += 50;
      else score += 0;
    });

    return Math.round(score / count);
  }

  /**
   * Get budget violations
   */
  public getBudgetViolations(): string[] {
    return this.budgetViolations;
  }

  /**
   * Generate performance report
   */
  public generateReport(): void {
    logger.log('📊 Performance Report');
    logger.log('Overall Score:', this.getPerformanceScore() + '/100');
    logger.log('\n--- Core Web Vitals ---');
    this.metrics.forEach((report, name) => {
      logger.log(`${name}: ${report.value} (${report.rating})`);
    });
    if (this.budgetViolations.length > 0) {
      logger.log('\n--- Budget Violations ---');
      this.budgetViolations.forEach((violation) => logger.log(`❌ ${violation}`));
    } else {
      logger.log('\n✅ All metrics within budget!');
    }
  }

  /**
   * Display performance badge in the console
   */
  public displayPerformanceBadge(): void {
    const score = this.getPerformanceScore();
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
    const color = score >= 90 ? '#00C853' : score >= 80 ? '#64DD17' : score >= 70 ? '#FFD600' : score >= 60 ? '#FF6D00' : '#DD2C00';

    logger.log(
      `%c 🚀 Performance Score: ${score}/100 (Grade: ${grade}) `,
      `background: ${color}; color: white; font-weight: bold; padding: 8px 16px; border-radius: 4px; font-size: var(--type-sm);`
    );
  }
}
