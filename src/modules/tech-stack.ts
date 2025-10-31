/**
 * Tech Stack Module
 * Renders a slick, interactive tech stack with category filters,
 * search, and subtle hover/shine animations.
 */
type Category = 'Languages' | 'Frontend' | 'Backend' | 'Database' | 'Mobile' | 'AI & IoT' | 'Tools';

interface TechItem {
  name: string;
  category: Category;
  icon: string; // emoji fallback to keep CSP clean
  description?: string;
  iconName?: string; // optional ion-icon name
}

import { createBrandLogo, createBrandImage } from './brand-logos';

export class TechStack {
  private items: TechItem[] = [];
  private grid: HTMLElement | null = null;
  private chips: NodeListOf<HTMLButtonElement> | null = null;
  private searchInput: HTMLInputElement | null = null;
  private activeCategories: Set<Category> = new Set();
  private showAll = false;
  private toggleBtn: HTMLButtonElement | null = null;
  private essentialNames: string[] = [
    'JavaScript', 'TypeScript', 'HTML', 'CSS',
    'React', 'Vite', 'Tailwind CSS',
    'Node.js', 'Express.js',
    'Git', 'GitHub', 'Firebase', 'MySQL'
  ];

  constructor() {
    this.bootstrap();
  }

  private bootstrap(): void {
    this.grid = document.getElementById('stack-grid');
    const section = document.querySelector('.tech-stack-section');
    if (!this.grid || !section) return; // abort silently if not on page

    this.items = this.getData();
    this.setupToggle();
    this.filter();
    this.bindEvents(section);
    this.observeReveal(section);
  }

  private getData(): TechItem[] {
    const data: TechItem[] = [
      // Languages
      { name: 'C', category: 'Languages', icon: '🧩' },
      { name: 'C++', category: 'Languages', icon: '💠' },
      { name: 'C#', category: 'Languages', icon: '🎯' },
      { name: 'Python', category: 'Languages', icon: '🐍' },
      { name: 'Java', category: 'Languages', icon: '☕️' },
      { name: 'JavaScript', category: 'Languages', icon: '🟨' },
      { name: 'TypeScript', category: 'Languages', icon: '🔷' },
      { name: 'PHP', category: 'Languages', icon: '🔵' },
      { name: 'HTML', category: 'Languages', icon: '📄' },
      { name: 'CSS', category: 'Languages', icon: '🎨' },
      { name: 'Swift', category: 'Languages', icon: '🦅' },

      // Frontend
      { name: 'React', category: 'Frontend', icon: '⚛️', iconName: 'logo-react', description: 'UI library for building components' },
      { name: 'Angular', category: 'Frontend', icon: '🅰️', iconName: 'logo-angular', description: 'Full-featured frontend framework' },
      { name: 'Next.js', category: 'Frontend', icon: '➡️', description: 'React framework for SSR/SSG' },
      { name: 'Three.js', category: 'Frontend', icon: '🔺', description: 'WebGL 3D rendering library' },
      { name: 'Vite', category: 'Frontend', icon: '⚡️' },
      { name: 'Tailwind CSS', category: 'Frontend', icon: '🌪️' },
      { name: 'Bootstrap', category: 'Frontend', icon: '🅱️' },
      { name: 'Chart.js', category: 'Frontend', icon: '📊' },
      { name: 'Recharts', category: 'Frontend', icon: '📈' },

      // Backend
      { name: 'Node.js', category: 'Backend', icon: '🟩', iconName: 'logo-nodejs', description: 'JavaScript runtime for backend' },
      { name: 'Express.js', category: 'Backend', icon: '🚏', description: 'Minimal web framework for Node' },

      // Database
      { name: 'MySQL', category: 'Database', icon: '🗄️' },
      { name: 'Firebase', category: 'Database', icon: '🔥' },
      { name: 'Firestore', category: 'Database', icon: '📚' },

      // Mobile
      { name: 'Flutter', category: 'Mobile', icon: '🪽' },
      { name: 'Expo Go', category: 'Mobile', icon: '📱' },

      // AI & IoT
      { name: 'Gemini', category: 'AI & IoT', icon: '🤖' },
      { name: 'Arduino', category: 'AI & IoT', icon: '🔧' },

      // Tools
      { name: 'Git', category: 'Tools', icon: '🔗' },
      { name: 'GitHub', category: 'Tools', icon: '🐙' },
      { name: 'ESLint', category: 'Tools', icon: '🧹' },
      { name: 'Prettier', category: 'Tools', icon: '✨' },
    ];
    return data;
  }

  private render(list: TechItem[]): void {
    if (!this.grid) return;
    this.grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    list.forEach(item => {
      const li = document.createElement('li');
      li.className = 'stack-item';
      li.dataset.category = item.category;

      // hover glow follow effect
      li.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = li.getBoundingClientRect();
        li.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        li.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      });

      const icon = document.createElement('div');
      icon.className = 'stack-icon';
      // Prefer inline brand logo, fallback to emoji
      const logo = createBrandLogo(item.name);
      const img = logo ? null : createBrandImage(item.name);
      if (logo) {
        icon.appendChild(logo);
      } else if (img) {
        icon.appendChild(img);
      } else {
        icon.textContent = item.icon;
      }

      const textWrap = document.createElement('div');
      const nameEl = document.createElement('div');
      nameEl.className = 'stack-name';
      nameEl.textContent = item.name;
      const catEl = document.createElement('div');
      catEl.className = 'stack-category';
      catEl.textContent = item.category;
      textWrap.appendChild(nameEl);
      textWrap.appendChild(catEl);

      if (item.description) {
        li.setAttribute('data-tooltip', item.description);
      }

      li.appendChild(icon);
      li.appendChild(textWrap);
      frag.appendChild(li);
    });
    this.grid.appendChild(frag);
  }

  private bindEvents(section: Element): void {
    this.chips = section.querySelectorAll<HTMLButtonElement>('.chip');
    this.searchInput = section.querySelector<HTMLInputElement>('.stack-search');

    this.chips.forEach(chip => {
      chip.addEventListener('click', () => this.toggleChip(chip));
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleChip(chip);
        }
      });
    });

    if (this.searchInput) {
      let t: number | null = null;
      this.searchInput.addEventListener('input', () => {
        if (t) window.clearTimeout(t);
        t = window.setTimeout(() => this.filter(), 120);
      });
    }
  }

  private toggleChip(chip: HTMLButtonElement): void {
    const key = (chip.dataset.chip || 'all');
    if (key === 'all') {
      // Reset to all
      this.activeCategories.clear();
      this.chips?.forEach(c => {
        if (c.dataset.chip === 'all') {
          c.classList.add('active'); c.setAttribute('aria-pressed', 'true');
        } else {
          c.classList.remove('active'); c.setAttribute('aria-pressed', 'false');
        }
      });
    } else {
      // Toggle category
      const cat = key as Category;
      if (this.activeCategories.has(cat)) {
        this.activeCategories.delete(cat);
        chip.classList.remove('active');
        chip.setAttribute('aria-pressed', 'false');
      } else {
        this.activeCategories.add(cat);
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');
      }
      // Deactivate 'All' when any specific filters are used
      const allChip = Array.from(this.chips || []).find(c => c.dataset.chip === 'all');
      if (allChip) {
        if (this.activeCategories.size > 0) {
          allChip.classList.remove('active'); allChip.setAttribute('aria-pressed', 'false');
        } else {
          allChip.classList.add('active'); allChip.setAttribute('aria-pressed', 'true');
        }
      }
    }
    this.filter();
  }

  private filter(): void {
    const q = (this.searchInput?.value || '').toLowerCase();
    const cats = this.activeCategories;
    const filtered = this.items.filter(i => {
      const matchesCat = cats.size === 0 ? true : cats.has(i.category);
      const hay = (i.name + ' ' + (i.description || '')).toLowerCase();
      const matchesQuery = q ? hay.includes(q) : true;
      return matchesCat && matchesQuery;
    });
    const final = (!this.showAll)
      ? this.sampleEssentials(filtered)
      : filtered;
    this.render(final);
    this.updateToggleButtonText(filtered.length);
  }

  private observeReveal(section: Element): void {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          section.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    io.observe(section);
  }

  private setupToggle(): void {
    // See All / Show fewer toggle — guard against duplicates across the document
    const existingToggles = document.querySelectorAll<HTMLButtonElement>('.stack-toggle');
    if (existingToggles.length > 1) {
      existingToggles.forEach((btn, i) => { if (i > 0) btn.remove(); });
    }
    const existing = existingToggles[0] || null;
    if (existing) {
      this.toggleBtn = existing;
    } else {
      this.toggleBtn = document.createElement('button');
      this.toggleBtn.className = 'stack-toggle';
      this.toggleBtn.type = 'button';
      this.toggleBtn.textContent = 'See all';
      this.toggleBtn.setAttribute('aria-expanded', 'false');
      // Insert after the grid
      this.grid?.insertAdjacentElement('afterend', this.toggleBtn);
    }
    // Bind click (overwrite any previous handler to avoid stacking)
    this.toggleBtn.onclick = () => {
      this.showAll = !this.showAll;
      this.toggleBtn?.setAttribute('aria-expanded', String(this.showAll));
      this.toggleBtn!.textContent = this.showAll ? 'Show fewer' : 'See all';
      this.filter();
    };
    // Re-evaluate on resize (bind once)
    const w = window as any;
    if (!w.__techStackResizeBound) {
      window.addEventListener('resize', () => this.filter());
      w.__techStackResizeBound = true;
    }
  }

  private updateToggleButtonText(total: number): void {
    if (!this.toggleBtn) return;
    // Hide toggle when there are 10 or fewer items
    if (total <= 10) {
      this.toggleBtn.style.display = 'none';
      return;
    } else {
      this.toggleBtn.style.display = '';
    }
    this.toggleBtn.textContent = this.showAll ? 'Show fewer' : `See all (${total})`;
  }


  private sampleEssentials(list: TechItem[]): TechItem[] {
    // Prefer essentials, fallback to provided list if filters exclude essentials
    const nameSet = new Set(this.essentialNames);
    const essentials = list.filter(i => nameSet.has(i.name));
    const pool = essentials.length ? essentials : list;
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(10, shuffled.length));
  }
}