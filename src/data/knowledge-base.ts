import type { ProjectData, AchievementData } from '@/types';

export interface KnowledgeBase {
  profile: {
    name: string;
    title: string;
    summary: string;
    nationality?: string;
  };
  contact: {
    email: string;
    github: string;
    linkedin: string;
    website: string;
    resumeUrl: string;
  };
  education: Array<{
    school: string;
    program?: string;
    period?: string;
    notes?: string;
  }>;
  experience: Array<{
    role: string;
    company: string;
    period: string;
    summary?: string;
  }>;
  skills: {
    core: string[];
    technologies: string[];
  };
  projects: ProjectData[];
  achievements: AchievementData[];
  organizations: string[];
}

export const KB: KnowledgeBase = {
  profile: {
    name: 'Adriel Magalona',
    title: 'Full-stack Developer & AI Engineer',
    summary:
      'Full-stack Developer and AI/ML Engineer specializing in web development, machine learning, and creative technology solutions. Passionate about performance, accessibility, and building delightful user experiences.',
    nationality: 'Filipino',
  },
  contact: {
    email: 'dagsmagalona@gmail.com',
    github: 'https://github.com/adr1el-m',
    linkedin: 'https://linkedin.com/in/adrielmagalona',
    website: 'https://adriel.dev',
    resumeUrl: '/files/MAGALONA-CV.pdf',
  },
  education: [
    {
      school: 'Polytechnic University of the Philippines (PUP)',
      program: 'BS Computer Science',
      period: '2024–2028',
      notes: 'Active in developer communities and hackathons',
    },
    {
      school: 'University of Makati',
      program: 'TVL Programming (Senior High)',
      period: '—2024',
      notes: 'Built ODRS and PHP/MySQL systems during coursework',
    },
  ],
  experience: [
    {
      role: 'Workflow Architect',
      company: 'Eskwelabs',
      period: '2024 — Present',
      summary:
        'Automating pitch‑deck creation and investor outreach for funding; designing cross‑team workflows with Google technologies and n8n to streamline processes, improve reliability, and document standards.',
    },
  ],
  skills: {
    core: ['Web Development', 'Database Management', 'AI Integration'],
    technologies: [
      'TypeScript',
      'JavaScript',
      'React',
      'Vite',
      'Node.js',
      'Express.js',
      'Python',
      'Java',
      'PHP',
      'Firebase',
      'Chart.js',
      'Llama 3',
    ],
  },
  projects: [
    {
      title: 'FinanceWise',
      category: 'Web App',
      images: [],
      webpImages: [],
      description:
        'Comprehensive financial advisory platform with calculators, budgets, dashboards, and AI tips. Built for clarity, usability, and practical decision support.',
      technologies:
        'Frontend: HTML, CSS, JavaScript, React, Vite; Backend: Node/Express; Data: Firebase Firestore; Charts: Chart.js; AI: Google Generative AI',
      githubUrl: undefined,
      liveUrl: undefined,
      videoUrl: undefined,
      codedexUrl: undefined,
    },
    {
      title: 'Kita‑Kita (Agentic)',
      category: 'AI Banking Platform',
      images: [],
      webpImages: [],
      description:
        'AI‑powered banking and financial management platform for expense tracking, forecasting, and intelligent agent support.',
      technologies:
        'HTML, CSS, JavaScript, AI agent orchestration, charts, backend services',
    },
    {
      title: 'RGBC ATM Transaction System',
      category: 'Desktop App',
      images: [],
      webpImages: [],
      description:
        'Java Swing application simulating ATM functionalities: authentication, transactions, and admin management. Focus on error handling and modular design.',
      technologies: 'Java, Swing',
    },
    {
      title: 'Loan Management System (PHP/MySQL)',
      category: 'Web App',
      images: [],
      webpImages: [],
      description:
        'Grade 12 project simulating loan application workflows including user authentication, loan calculation, and confirmation.',
      technologies: 'PHP, MySQL, HTML, CSS, JavaScript',
    },
    {
      title: 'Online Document Request System (ODRS)',
      category: 'Web App',
      images: ['/images/ODRS.png'],
      webpImages: [],
      description:
        'Web platform for Grade 12 students at University of Makati to request and manage school documents with tracking and admin control.',
      technologies: 'HTML, CSS, JavaScript, PHP, MySQL',
    },
  ],
  achievements: [
    {
      title: 'Technovation Summit 2025 Start‑up Hackathon',
      images: [
        '/images/honors/technovation/1.jpeg',
        '/images/honors/technovation/2.jpeg',
        '/images/honors/technovation/3.jpeg',
      ],
      webpImages: [
        '/images/honors/technovation/1.jpeg',
        '/images/honors/technovation/2.jpeg',
        '/images/honors/technovation/3.jpeg',
      ],
      organizer:
        'National Technovation Summit organized by START (DOST) — National Champion',
      date: 'August 31, 2025',
      location: 'Marco Polo Plaza Hotel, Cebu',
      teammates: [
        { name: 'Juanito Ramos II' },
        { name: 'Maxxinne Fernan' },
      ],
      githubUrl: 'https://github.com/adr1el-m/technovation-2025',
      description:
        'LingapLink — AI‑powered healthcare platform streamlining triage, booking, communication, and record management to improve efficiency and access.',
      projectTitle: 'LingapLink',
      linkedinUrl:
        'https://www.linkedin.com/posts/adr1el_nationaltechnovationsummit-activity-7369257090281791488-SXY8',
    },
    {
      title: 'BPI DataWave Hackathon 2025',
      images: [],
      webpImages: [],
      organizer: 'BPI — Workplace Productivity & Future of Work (Team 4Sight) — 3rd Place',
      date: 'October 1, 2025',
      location: 'AIM Conference Center, Makati City',
      teammates: [],
      githubUrl: 'https://github.com/adr1el-m/worksight',
      description:
        'Workplace productivity solution leveraging data insights and automation. Earned 3rd place among strong competitors.',
      projectTitle: 'WorkSight',
    },
    {
      title: 'De La Salle University HackerCup 2025',
      images: [],
      webpImages: [],
      organizer:
        "DLSU HackerCup — Theme: 'Convenience: Hacking Everyday Hassles for Better Communities' — 9th Place",
      date: 'August 15–16, 2025',
      location: 'Gokongwei Hall, De La Salle University',
      description:
        'DokQ — smart appointment system with patient portal and provider dashboard to reduce queues and improve healthcare workflow.',
      projectTitle: 'DokQ',
    },
    {
      title: 'Spark Rush 2025 — GDGC PUP',
      images: [],
      webpImages: [],
      organizer:
        'Google Developer Groups on Campus — Polytechnic University of the Philippines — Second Runner‑Up',
      date: 'May 17, 2025',
      location: 'Polytechnic University of the Philippines — Manila',
      description:
        'Station‑based competition highlighting teamwork, problem solving, and endurance.',
    },
    {
      title: "Data Structures & Algorithms — Knight Category Winner (PUP)",
      images: [],
      webpImages: [],
      organizer: "The Programmers' Guild — Polytechnic University of the Philippines",
      date: '2025',
      location: 'Polytechnic University of the Philippines',
      description:
        'Competition focused on DSA fundamentals and practical coding challenges.',
    },
    {
      title: 'Gawad Pagkilala Taong 2024 — National Competition (3rd Place)',
      images: [],
      webpImages: [],
      organizer: "Entrepreneurship Educators' Association — Polytechnic University of the Philippines",
      date: 'November 21, 2024',
      location: 'Bulwagang Balagtas NALLRC, Polytechnic University of the Philippines — Manila',
      description:
        'Recognition for excellence in national entrepreneurship competition.',
    },
  ],
  organizations: [
    'Google Developer Student Clubs — PUP',
    'AWS Cloud Club — PUP',
    'Microsoft Student Community — PUP Manila',
    "The Programmers' Guild — PUP",
    'Junior Blockchain Education Consortium of the Philippines — PUP Manila',
  ],
};