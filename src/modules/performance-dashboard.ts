/**
 * Performance Dashboard Module
 * Visual display of performance metrics and Core Web Vitals
 */

import { PerformanceMonitor } from './performance-monitor';
import { logger } from '../config';

interface DashboardConfig {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  minimized?: boolean;
  showInProduction?: boolean;
}

export class PerformanceDashboard {
  private static instance: PerformanceDashboard;
  private monitor: PerformanceMonitor;
  private container: HTMLElement | null = null;
  private isMinimized: boolean = true;
  private config: DashboardConfig;

  private constructor(config: DashboardConfig = {}) {
    this.monitor = PerformanceMonitor.getInstance();
    this.config = {
      position: config.position || 'bottom-right',
      minimized: config.minimized !== false,
      showInProduction: config.showInProduction || false,
    };

    // Only show in development mode unless explicitly enabled
    if (!import.meta.env.DEV && !this.config.showInProduction) {
      return;
    }

    this.initialize();
  }

  public static getInstance(config?: DashboardConfig): PerformanceDashboard {
    if (!PerformanceDashboard.instance) {
      PerformanceDashboard.instance = new PerformanceDashboard(config);
    }
    return PerformanceDashboard.instance;
  }

  private initialize(): void {
    // Wait for page load to show accurate metrics
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.createDashboard();
        this.updateMetrics();
        this.bindMetricUpdates();
        logger.info('✅ Performance Dashboard initialized');
      }, 2000);
    });
  }

  private createDashboard(): void {
    this.container = document.createElement('div');
    this.container.id = 'performance-dashboard';
    this.container.className = `perf-dashboard ${this.config.position}`;
    
    if (this.isMinimized) {
      this.container.classList.add('minimized');
    }

    this.container.innerHTML = `
      <div class="perf-header" data-action="toggle">
        <span class="perf-title">⚡ Performance</span>
        <button class="perf-toggle" title="Toggle Dashboard">
          ${this.isMinimized ? '📊' : '−'}
        </button>
      </div>
      <div class="perf-content">
        <div class="perf-score">
          <div class="score-circle" data-score="0">
            <span class="score-value">0</span>
          </div>
          <div class="score-label">Performance Score</div>
        </div>
        <div class="perf-metrics" id="perf-metrics-list"></div>
        <div class="perf-actions">
          <button class="perf-btn" data-action="report">📋 Report</button>
          <button class="perf-btn" data-action="clear">🗑️ Clear</button>
        </div>
      </div>
    `;

    // Add styles
    this.injectStyles();

    // Add event listeners
    this.attachEventListeners();

    document.body.appendChild(this.container);
  }

  private bindMetricUpdates(): void {
    // Listen for live metric updates from PerformanceMonitor
    window.addEventListener('portfolio:web-vitals', () => {
      this.updateMetrics();
    });
  }

  private injectStyles(): void {
    if (document.getElementById('perf-dashboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'perf-dashboard-styles';
    style.textContent = `
      .perf-dashboard {
        position: fixed;
        z-index: 9999;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-width: 320px;
        max-width: 400px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .perf-dashboard.top-right { top: 20px; right: 20px; }
      .perf-dashboard.top-left { top: 20px; left: 20px; }
      .perf-dashboard.bottom-right { bottom: 20px; right: 20px; }
      .perf-dashboard.bottom-left { bottom: 20px; left: 20px; }

      .perf-dashboard.minimized {
        min-width: auto;
        max-width: 200px;
      }

      .perf-dashboard.minimized .perf-content {
        display: none;
      }

      .perf-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        cursor: pointer;
        user-select: none;
      }

      .perf-title {
        font-weight: 600;
        font-size: var(--type-sm);
        color: #fff;
      }

      .perf-toggle {
        background: none;
        border: none;
        font-size: var(--type-base);
        cursor: pointer;
        padding: 4px;
        transition: transform 0.2s;
      }

      .perf-toggle:hover {
        transform: scale(1.1);
      }

      .perf-content {
        padding: 16px;
      }

      .perf-score {
        text-align: center;
        margin-bottom: 20px;
      }

      .score-circle {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 12px;
        background: conic-gradient(
          from 0deg,
          #00c853 0%,
          #00c853 var(--score-percent, 0%),
          rgba(255, 255, 255, 0.1) var(--score-percent, 0%)
        );
        position: relative;
      }

      .score-circle::before {
        content: '';
        position: absolute;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.9);
      }

      .score-value {
        position: relative;
        z-index: 1;
        font-size: var(--type-3xl);
        font-weight: 700;
        color: #fff;
      }

      .score-label {
        font-size: var(--type-xs);
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
      }

      .perf-metrics {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
      }

      .metric-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        font-size: var(--type-xs);
      }

      .metric-name {
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
      }

      .metric-value {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #fff;
        font-weight: 600;
      }

      .metric-badge {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .metric-badge.good { background: #00c853; }
      .metric-badge.needs-improvement { background: #ff9800; }
      .metric-badge.poor { background: #f44336; }

      .perf-actions {
        display: flex;
        gap: 8px;
      }

      .perf-btn {
        flex: 1;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: #fff;
        font-size: var(--type-xs);
        cursor: pointer;
        transition: all 0.2s;
      }

      .perf-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }

      @media (max-width: 768px) {
        .perf-dashboard {
          bottom: 10px !important;
          right: 10px !important;
          min-width: 280px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    // Toggle dashboard
    const header = this.container.querySelector('[data-action="toggle"]');
    header?.addEventListener('click', () => this.toggleDashboard());

    // Report button
    const reportBtn = this.container.querySelector('[data-action="report"]');
    reportBtn?.addEventListener('click', () => this.showReport());

    // Clear button
    const clearBtn = this.container.querySelector('[data-action="clear"]');
    clearBtn?.addEventListener('click', () => this.clearMetrics());
  }

  private toggleDashboard(): void {
    this.isMinimized = !this.isMinimized;
    
    if (this.container) {
      this.container.classList.toggle('minimized');
      const toggleBtn = this.container.querySelector('.perf-toggle');
      if (toggleBtn) {
        toggleBtn.textContent = this.isMinimized ? '📊' : '−';
      }
    }
  }

  private updateMetrics(): void {
    if (!this.container) return;

    const metrics = this.monitor.getMetrics();
    const score = this.monitor.getPerformanceScore();

    // Update score circle
    const scoreCircle = this.container.querySelector('.score-circle') as HTMLElement;
    const scoreValue = this.container.querySelector('.score-value');
    
    if (scoreCircle && scoreValue) {
      scoreCircle.style.setProperty('--score-percent', `${score}%`);
      scoreValue.textContent = score.toString();

      // Update color based on score
      const color = score >= 90 ? '#00c853' : 
                    score >= 80 ? '#64dd17' : 
                    score >= 70 ? '#ffd600' : 
                    score >= 60 ? '#ff6d00' : '#f44336';
      scoreCircle.style.background = `conic-gradient(from 0deg, ${color} 0%, ${color} ${score}%, rgba(255,255,255,0.1) ${score}%)`;
    }

    // Update metrics list
    const metricsList = this.container.querySelector('#perf-metrics-list');
    if (metricsList && metrics.size > 0) {
      metricsList.innerHTML = Array.from(metrics.values())
        .map(metric => `
          <div class="metric-item">
            <span class="metric-name">${metric.metric}</span>
            <span class="metric-value">
              <span class="metric-badge ${metric.rating}"></span>
              ${this.formatMetricValue(metric.metric, metric.value)}
            </span>
          </div>
        `)
        .join('');
    }
  }

  private formatMetricValue(name: string, value: number): string {
    if (name === 'CLS') {
      return (value / 1000).toFixed(3);
    }
    return `${value}ms`;
  }

  private showReport(): void {
    this.monitor.generateReport();
  }

  private clearMetrics(): void {
    console.clear();
    logger.info('🗑️ Performance metrics cleared. Refresh to collect new data.');
  }

  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
