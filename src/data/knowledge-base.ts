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
      githubUrl: 'https://github.com/adr1el-m/finance-and-ai',
      liveUrl: undefined,
      videoUrl: '/images/projects/financeWise/fw.mp4',
      codedexUrl: undefined,
    },
    {
      title: 'Green Pulse',
      category: 'Web App',
      images: [],
      webpImages: [],
      description:
        'GreenPulse is an interactive web application designed to promote sustainability through carbon footprint tracking, AI-powered eco-tips, and personalized progress monitoring.',
      technologies:
        'React, Vite, Tailwind CSS, Chart.js, Google Generative AI',
      githubUrl: 'https://github.com/adr1el-m/green-pulse',
      videoUrl: '/images/projects/greenPulse/GP-opt.mp4',
    },
    {
      title: 'Kita‑Kita (Agentic)',
      category: 'AI Banking Platform',
      images: [],
      webpImages: [],
      description:
        'Kita-Kita is an AI-powered financial co-pilot that combines intelligent agents, unified account management, and predictive analytics to help Filipinos achieve financial wellness.',
      technologies:
        'HTML, CSS, JavaScript, AI agent orchestration, charts, backend services',
      videoUrl: '/images/projects/agentic/Deansanitzy.mp4',
      githubUrl: 'https://github.com/adr1el-m/team-Deansanitzy-2025',
    },
    {
      title: 'WorkSight',
      category: 'Web App',
      images: [],
      webpImages: [],
      description:
        'WorkSight is an AI-powered well-being analytics platform that uses behavioral data and psychological science to predict and prevent employee burnout.',
      technologies:
        'Next.js, Supabase, TypeScript, Tailwind CSS, AI/ML',
      githubUrl: 'https://github.com/4sightorg/worksight',
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
      images: [
        '/images/projects/loan/1.png',
        '/images/projects/loan/2.png',
        '/images/projects/loan/3.png',
        '/images/projects/loan/4.png',
      ],
      webpImages: [
        '/images/projects/loan/1-400.webp',
        '/images/projects/loan/2-400.webp',
        '/images/projects/loan/3-400.webp',
        '/images/projects/loan/4-400.webp',
      ],
      description:
        'Web-based Loan Management System simulating real-world lending workflows, including user authentication, loan calculation, and confirmation.',
      technologies: 'PHP, MySQL, HTML, CSS, JavaScript',
      githubUrl: 'https://github.com/adr1el-m/PHP-Loan-System',
    },
    {
      title: 'Online Document Request System (ODRS)',
      category: 'Web App',
      images: [
        '/images/projects/ODRS/1.jpeg',
        '/images/projects/ODRS/2.jpeg',
        '/images/projects/ODRS/3.jpeg',
        '/images/projects/ODRS/4.jpeg',
        '/images/projects/ODRS/5.jpeg',
        '/images/projects/ODRS/6.jpeg',
      ],
      webpImages: [
        '/images/projects/ODRS/1-400.webp',
        '/images/projects/ODRS/2-400.webp',
        '/images/projects/ODRS/3-400.webp',
        '/images/projects/ODRS/4-400.webp',
        '/images/projects/ODRS/5-400.webp',
        '/images/projects/ODRS/6-400.webp',
      ],
      description:
        'Web platform for Grade 12 students at University of Makati to request and manage school documents with tracking and admin control.',
      technologies: 'HTML, CSS, JavaScript, PHP, MySQL',
      githubUrl: 'https://github.com/adr1el-m/Online-Document-Request-System',
    },
    {
      title: 'Four Fundamental Spaces Finder',
      category: 'Linear Algebra Tool',
      images: [
        '/images/projects/fourFundamentalSpacesFinder/LandingPage.png',
        '/images/projects/fourFundamentalSpacesFinder/Computation-mac.jpeg',
        '/images/projects/fourFundamentalSpacesFinder/GeometricVisualization-mac.jpeg',
        '/images/projects/fourFundamentalSpacesFinder/GeometricVisualization.png',
      ],
      webpImages: [],
      description:
        'A comprehensive Linear Algebra tool designed to calculate and visualize the four fundamental subspaces of a matrix: Column Space, Row Space, Null Space, and Left Null Space. This application provides step-by-step Row Reduced Echelon Form (RREF) calculations, LaTeX support for equations, and interactive 2D/3D geometric visualizations.',
      technologies: 'Next.js, Swift, SwiftUI, LaTeX, MathJax',
      githubUrl:
        'https://github.com/adr1el-m/Four-Fundamental-Spaces-Finder?tab=readme-ov-file',
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
        'National Technovation Summit organized by START (DOST) — National Champion — ₱30,000',
      date: 'August 31, 2025',
      location: 'Marco Polo Plaza Hotel, Cebu',
      teammates: [
        { name: 'Juanito Ramos II' },
        { name: 'Maxxinne Fernan' },
      ],
      githubUrl: 'https://github.com/adr1el-m/technovation-2025',
      description:
        'LingapLink — AI‑powered healthcare platform streamlining triage, booking, communication, and record management to improve efficiency and access. Won ₱30,000.',
      projectTitle: 'LingapLink',
      linkedinUrl:
        'https://www.linkedin.com/posts/adr1el_nationaltechnovationsummit-activity-7369257090281791488-SXY8',
    },
    {
      title: 'BPI DataWave Hackathon 2025',
      images: [],
      webpImages: [],
      organizer: 'BPI — Workplace Productivity & Future of Work (Team 4Sight) — 3rd Place — ₱20,000',
      date: 'October 1, 2025',
      location: 'AIM Conference Center, Makati City',
      teammates: [],
      githubUrl: 'https://github.com/adr1el-m/worksight',
      description:
        'WorkSight is an AI-powered well-being analytics platform that uses behavioral data and psychological science to predict and prevent employee burnout. Won ₱20,000.',
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
    {
      title: 'Codebility Portfolio Contest 2025 — 2nd Place',
      images: ['/images/honors/codebility/portfolio-contest-2025.jpg'],
      webpImages: ['/images/honors/codebility/portfolio-contest-2025-400.webp'],
      organizer: 'Codebility — Portfolio Contest 2025',
      date: 'October 2025',
      location: 'Online',
      description:
        'Secured 2nd place; received an internship offer and a ₱800 award.',
      projectTitle: 'Portfolio Contest 2025',
      linkedinUrl: 'https://www.linkedin.com/posts/adr1el_this-comes-a-bit-late-but-its-a-milestone-activity-7419437733170896897-nULW?utm_source=share&utm_medium=member_desktop&rcm=ACoAAFCMwAABUwVcMwAFxdORbMcULlqBOAyuSpU',
      facebookUrl: 'https://www.facebook.com/share/p/19mEFhhtCv/',
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