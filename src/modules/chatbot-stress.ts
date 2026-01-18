import type { ChatMessage } from '@/types';

type Manager = {
  addMessage: (text: string, sender: 'user' | 'bot') => void;
  messagesContainer: HTMLElement | null;
  messages: ChatMessage[];
};

function waitForChatbotInstance(maxMs = 5000): Promise<Manager | null> {
  return new Promise(resolve => {
    const start = Date.now();
    const tick = () => {
      const mgr = window.Portfolio?.lazy?.ChatbotManager as Manager | undefined;
      if (mgr && typeof mgr.addMessage === 'function') {
        resolve(mgr);
        return;
      }
      if (Date.now() - start > maxMs) {
        resolve(null);
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

function createOverlay(): HTMLElement {
  let el = document.getElementById('stress-report');
  if (!el) {
    el = document.createElement('div');
    el.id = 'stress-report';
    el.style.position = 'fixed';
    el.style.bottom = '12px';
    el.style.right = '12px';
    el.style.zIndex = '9999';
    el.style.background = 'rgba(20,20,20,0.9)';
    el.style.border = '1px solid rgba(255,215,0,0.35)';
    el.style.borderRadius = '10px';
    el.style.padding = '10px 12px';
    el.style.color = '#fff';
    el.style.fontSize = '12px';
    el.style.maxWidth = '360px';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
}

function randFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function makeLongText(base = 'Tell me more about projects'): string {
  const filler = ' ' + Array(200).fill('details about performance, accessibility, technologies').join(' ');
  return `${base}${filler}`.slice(0, 2000);
}

async function pumpMessages(mgr: Manager, overlay: HTMLElement): Promise<{ count: number; avgMs: number; maxMs: number; errors: string[] }>{
  const scenarios = [
    'List projects',
    'Show skills',
    'Share contact info',
    'Open resume',
    'Show achievements',
    'Tell me about organizations',
    'Education summary',
    'Project details: Portfolio Website',
    'Project details: Codedex',
    'Search site for portfolio',
    'What databases do you use?',
    'Can you provide legal advice?', // guardrail
    'What is your password?', // guardrail
    makeLongText(),
  ];

  const errors: string[] = [];
  const durations: number[] = [];

  const send = (text: string): number => {
    const t0 = performance.now();
    try {
      mgr.addMessage(text, 'user');
      // Provide last user message context for suggestions
      (mgr as unknown as { lastUserMessage?: string }).lastUserMessage = text;
      // Call private method via escape hatch; safe for dev/testing
      (mgr as unknown as { handleMessage?: (t: string) => void }).handleMessage?.(text);
    } catch (e: unknown) {
      const err = e as { message?: unknown };
      errors.push(String(err?.message ?? e));
    }
    const t1 = performance.now();
    return t1 - t0;
  };

  // Burst phase: rapid fire
  for (let i = 0; i < 30; i++) {
    const m = randFrom(scenarios);
    durations.push(send(m));
  }

  // Mixed phase with tiny delays
  for (let i = 0; i < 20; i++) {
    const m = randFrom(scenarios);
    durations.push(send(m));
    await new Promise(r => setTimeout(r, 10));
  }

  // Long message phase
  for (let i = 0; i < 5; i++) {
    durations.push(send(makeLongText('Deep dive: ')));
  }

  const count = durations.length;
  const avgMs = Math.round(durations.reduce((a, b) => a + b, 0) / Math.max(1, count));
  const maxMs = Math.round(Math.max(...durations));

  overlay.innerHTML = `
    <strong>Chatbot Stress Test</strong><br>
    Messages: ${count}<br>
    Avg time: ${avgMs} ms<br>
    Max time: ${maxMs} ms<br>
    Errors: ${errors.length}${errors.length ? '<br>'+errors.map(e=>`• ${e}`).join('<br>') : ''}
  `;

  return { count, avgMs, maxMs, errors };
}

export async function runChatbotStressTests(): Promise<void> {
  const mgr = await waitForChatbotInstance(7000);
  if (!mgr) {
    console.warn('[StressTest] ChatbotManager not available');
    return;
  }
  const overlay = createOverlay();
  overlay.textContent = 'Running chatbot stress tests…';
  const res = await pumpMessages(mgr, overlay);
  console.log('[StressTest] Results:', res);
}
