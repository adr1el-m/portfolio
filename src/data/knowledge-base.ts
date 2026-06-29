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
  scholarships: Array<{
    title: string;
    provider: string;
    program?: string;
    period: string;
    notes: string;
  }>;
  experience: Array<{
    role: string;
    company: string;
    period: string;
    summary?: string;
  }>;
  resume: {
    headline: string;
    location: string;
    highlights: string[];
    certifications: string[];
    organizations: string[];
  };
  skills: {
    core: string[];
    technologies: string[];
  };
  projects: ProjectData[];
  achievements: AchievementData[];
}

export const KB: KnowledgeBase = {
  profile: {
    name: 'Adriel Magalona',
    title: 'Computer Science Student, Full-stack Developer & AI Builder',
    summary:
      'Adriel is a BS Computer Science student at the Polytechnic University of the Philippines, a DOST-SEI undergraduate scholar, and a hands-on builder focused on full-stack web apps, AI-assisted products, civic technology, healthcare tools, and competition-grade prototypes.',
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
  scholarships: [
    {
      title: 'DOST-SEI Scholar under RA 7687',
      provider: 'Department of Science and Technology - Science Education Institute',
      program: 'Republic Act 7687 Science and Technology Scholarship',
      period: '2024–present',
      notes:
        'Merit-based undergraduate scholarship supporting his BS Computer Science studies and recognizing academic potential in science and technology.',
    },
    {
      title: 'MACEMCO Scholar',
      provider: 'Makati City Employees Multi-Purpose Cooperative',
      period: '2024–present',
      notes:
        'Community-based scholarship supporting educational advancement and academic excellence.',
    },
    {
      title: 'Taguig Scholar (Honors)',
      provider: 'City Government of Taguig',
      program: 'Lifeline Assistance for Neighbors In-Need',
      period: '2026–present',
      notes:
        'Honors-based educational assistance under Taguig City’s LANI scholarship program.',
    },
  ],
  experience: [
    {
      role: 'Workflow Architect',
      company: 'Eskwelabs',
      period: 'October 2025 — December 2025',
      summary:
        'Assisted in designing and optimizing cross-team workflows and automations, collaborating with stakeholders to improve process reliability and document operational standards.',
    },
    {
      role: 'Senior Front-end Web Developer',
      company: 'PUP Manila Microsoft Student Community',
      period: 'October 2024 — Present',
      summary:
        'Leads front-end web development initiatives and collaborates on responsive, organization-facing web experiences.',
    },
  ],
  resume: {
    headline:
      'BS Computer Science student at PUP Manila, DOST-SEI undergraduate scholar, full-stack developer, AI builder, and hackathon lead from Taguig City.',
    location: 'Taguig City, Metro Manila, Philippines',
    highlights: [
      'Technical stack includes C, C++, Python, HTML, CSS, Java, JavaScript, PHP, React, Bootstrap, Tailwind CSS, Axios, Express, CORS, MySQL, Firebase, Git, GitHub, XAMPP, npm, Vercel, Vite, ESLint, dotenv, and Multer.',
      'Built the Online Document Request System for the University of Makati with AJAX-powered status updates, uploads, sessions, approvals, and admin workflows.',
      'Placed 2nd Runner-Up at Springboard Philippines Hack-it: The New Era of Banking AI Hackathon with Kita-Kita, an AI-powered personal finance app.',
      'Won Excalicode Knight Category in Data Structures and Algorithms at PUP with over 30 participants.',
      'Placed 3rd in an Entrepreneurship Educators Association national competition with EcoSiklo after a month-long bootcamp.',
      'Won National Champion at the Technovation Summit 2025 Start-up Hackathon with LingapLink, representing NCR among 12 regional teams nationwide.',
    ],
    certifications: [
      'Java Object Oriented Programming Basics Workshop with Microsoft Learn Integration — PUP Manila Microsoft Student Community',
      'Introduction to Microsoft Copilot — PUP Manila Microsoft Student Community',
    ],
    organizations: [
      'PUP Manila Microsoft Student Community — Senior Front-end Web Developer and Web Development Team Member',
      'Cisco NetConnect PUP Manila — Programming Department Cadet Member',
      'Google Developer Groups on Campus PUP — Cybersecurity Team Cadet',
      'Junior Blockchain Education Consortium of the Philippines PUP Manila — Member',
      'Information and Communications Technology Society, Higher School ng UMak — Layout Committee leadership',
    ],
  },
  skills: {
    core: ['Full-stack Web Development', 'AI Integration', 'Database-backed Systems', 'Hackathon Product Strategy'],
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
        "Purpose: Help users evaluate spending, investments, and loan decisions through a guided financial interface.\nBuild: Responsive web app using HTML, CSS, JavaScript, and visual effects to present advisory content and decision support.\nOutcome: Demonstrates financial UX, interactive presentation, and accessible information design for personal finance topics.",
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
        "Purpose: Encourage sustainable habits through carbon footprint awareness and personalized eco-guidance.\nBuild: React, Vite, Tailwind CSS, Chart.js, and Gemini-powered tips for tracking emissions, visualizing progress, and recommending actions.\nOutcome: Turns environmental awareness into a measurable, interactive workflow for everyday users.",
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
        "Purpose: Help Filipinos manage money through an AI financial co-pilot.\nBuild: Agent-driven platform with unified account management, expense intelligence, forecasting, charts, Firebase data storage, and Llama 3 assistance.\nOutcome: Demonstrates how agentic AI can turn financial data into practical recommendations and user-friendly planning workflows.",
      technologies:
        'HTML, CSS, JavaScript, AI agent orchestration, charts, backend services',
      videoUrl: '/images/projects/agentic/Deansanitzy.mp4',
      githubUrl: 'https://github.com/adr1el-m/team-Deansanitzy-2025',
    },
    {
      title: 'GeneSync',
      category: 'Mobile Bioinformatics App',
      images: ['/images/projects/genesync/GeneSyncDemo.gif'],
      webpImages: [],
      description:
        "Purpose: Optimize global pairwise biological sequence alignment using the Needleman-Wunsch dynamic programming algorithm.\nTeam: Group 5 presentation project.\nBuild: Validates DNA, RNA, and protein sequences, cleans FASTA-style input, fills the scoring matrix, performs traceback, calculates percentage identity, evaluates significance through sequence shuffling, maps gap or mismatch hotspots, and packages the result for playback and reporting.\nOutcome: Demonstrates why Needleman-Wunsch guarantees an optimal global alignment while turning matrix filling, traceback, and biological similarity analysis into an observable learning workflow.",
      technologies:
        'Swift, SwiftUI, Needleman-Wunsch, Bioinformatics, FASTA, Dynamic Programming, Monte Carlo Testing, iOS 17',
      githubUrl: 'https://github.com/adr1el-m/genesync',
      liveUrl: 'https://www.youtube.com/watch?v=tuJthrRh8Ik',
    },
    {
      title: 'WorkSight',
      category: 'Web App',
      images: [],
      webpImages: [],
      description:
        "Purpose: Help organizations identify and prevent employee burnout before it becomes a crisis.\nBuild: Next.js, Supabase, TypeScript, and analytics workflows that combine behavioral signals with psychological science.\nOutcome: Won 3rd place at BPI DataWave 2025 by presenting a practical future-of-work platform for leaders and teams.",
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
        "Purpose: Model ATM and basic banking operations through a Java desktop simulation.\nBuild: Java Swing application with login attempts, balance inquiry, deposits, withdrawals, fund transfers, admin account management, and validation rules.\nOutcome: Demonstrates object-oriented design, GUI event handling, and secure transaction flow in a controlled banking scenario.",
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
        "Purpose: Manage loan records and borrower workflows through a web-based PHP system.\nBuild: PHP, MySQL, Bootstrap, and CRUD interfaces for loan applications, payment tracking, and administrative monitoring.\nOutcome: Provides a practical school project for database-backed financial record management and admin operations.",
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
        "Purpose: Digitize document requests for Grade 12 students at the University of Makati Higher School.\nBuild: PHP and MySQL system with authentication, request tracking, status updates, and admin controls.\nOutcome: Reduced manual coordination by giving students and staff a clearer workflow for submitting, processing, and monitoring school documents.",
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
        "Purpose: Make linear algebra subspaces easier to compute, inspect, and understand.\nBuild: Next.js and Swift/SwiftUI experience with RREF steps, LaTeX rendering, and 2D/3D visualizations for column, row, null, and left-null spaces.\nOutcome: Turns abstract matrix concepts into an interactive study and visualization tool.",
      technologies: 'Next.js, Swift, SwiftUI, LaTeX, MathJax',
      githubUrl:
        'https://github.com/adr1el-m/Four-Fundamental-Spaces-Finder?tab=readme-ov-file',
    },
  ],
  achievements: [
    {
      title: 'SIKAPTala 2026 Quiz Bee',
      images: [
        '/images/honors/2026/sikaptala/quizbee/quiz-bee-photo.avif',
        '/images/honors/2026/sikaptala/quizbee/quiz-bee-certificate-1.avif',
        '/images/honors/2026/sikaptala/quizbee/quiz-bee-certificate-2.avif',
      ],
      webpImages: [],
      organizer: 'SIKAPTala',
      date: 'May 13, 2026',
      location: 'De La Salle University - Dasmarinas',
      description:
        "Recognition: Placed 2nd in the SIKAPTala 2026 CS and IT Quiz Bee at De La Salle University - Dasmarinas.\nScope: Competed against 67 college students from across the Philippines in computer science and information technology topics.\nContribution: Applied self-study in algorithms, data structures, and CS fundamentals to perform competitively on a national academic stage.",
    },
{
      title: 'CodeKada 2026',
      images: ['/images/honors/2026/codekada/Adriel M. Magalona.avif'],
      webpImages: ['/images/honors/2026/codekada/Adriel M. Magalona.avif'],
      organizer: 'CodeKada',
      date: 'May 3–9, 2026',
      location: 'Online (Discord)',
      teammates: [
        { name: 'Rolan Jero Pinton', role: 'University of Makati' },
        { name: 'Jordan Faciol', role: 'Working' },
        { name: 'Angelo Florentino', role: 'Working' }
      ],
      description:
        "Participation: Joined CodeKada 2026, an online hackathon conducted through Discord.\nScope: Collaborated with a distributed team across a week-long build period.\nContribution: Practiced remote teamwork, rapid implementation, and concise technical communication under competition constraints.",
    },
{
      title: 'START-a-TON: Data & AI Innovation Challenge',
      images: [
        '/images/honors/2026/Start-a-Ton/geminated.avif',
        '/images/honors/2026/Start-a-Ton/winners-champion.avif',
        '/images/honors/2026/Start-a-Ton/winners-special-award.avif',
      ],
      webpImages: [],
      organizer:
        'Scholars Transforming Advancement and Research for Technology - DOST with DOST-SEI Science Teacher Academy for the Regions',
      date: 'April 18, 2026',
      location: 'Philippines',
      teammates: [
        { name: 'Gem Christian Lazo', role: 'Tarlac State University' },
        { name: 'Marti Kier Trance', role: 'Polytechnic University of the Philippines - Maragondon' },
        { name: 'Janel Rose Trongcoso', role: 'De La Salle University - Dasmarinas' },
        { name: 'Christine Rio', role: 'Polytechnic University of the Philippines - Manila' },
      ],
      description:
        "Recognition: Won Champion at START-a-TON, a nationwide two-week Data and AI innovation challenge for DOST techno-scholars.\nScope: Built STAR-LINK, a platform layer for e-STAR.ph that connects educators, organizes action research, and surfaces regional teaching insights.\nContribution: Helped shape the product concept, AI-assisted knowledge synthesis, collaboration features, and presentation narrative for a scalable education technology solution.",
      githubUrl: 'https://lnkd.in/g4e7JHPT',
      blogUrl: 'https://lnkd.in/gMUq75nZ',
    },
{
      title: 'The Innovation Labs',
      images: ['/images/honors/2026/The Innovation Labs/innovation-labs.avif'],
      webpImages: [],
      organizer: 'The Innovation Labs',
      date: 'February 2026',
      location: 'Online',
      teammates: [
        { name: 'Kiel Ethan Lanzanas', role: 'Technological University of the Philippines' },
        { name: 'Ellah Benerado', role: 'Adamson University' },
        { name: 'John Carlo Santos', role: 'Bulacan State University' },
      ],
      description:
        "Participation: Joined The Innovation Labs with a collaborative student team.\nScope: Developed and evaluated an early-stage innovation concept through a structured program.\nContribution: Practiced product framing, team coordination, and concise pitch communication.",
    },
{
      title: 'SIKAPTala 2026 Hackathon',
      images: ['/images/honors/2026/sikaptala/Hackathon/hackathon-certificate.avif'],
      webpImages: [],
      organizer: 'SIKAPTala',
      date: '2026',
      location: 'De La Salle University - Dasmarinas',
      teammates: [
        { name: 'Eliazar Inso', role: 'Polytechnic University of the Philippines - Manila' },
        { name: 'Jude Vincent Puti', role: 'Polytechnic University of the Philippines - Manila' },
        { name: 'Mark Elijah Sevilla', role: 'Polytechnic University of the Philippines - Manila' },
      ],
      description:
        "Participation: Joined the SIKAPTala 2026 Hackathon at De La Salle University - Dasmarinas.\nScope: Worked within a competitive university hackathon environment focused on fast ideation and implementation.\nContribution: Strengthened rapid product planning, technical collaboration, and pitch-readiness under time pressure.",
    },
{
      title: 'BPI DataWave Hackathon 2025',
      images: [],
      webpImages: [],
      organizer: 'BPI — Workplace Productivity & Future of Work (Team 4Sight) — 3rd Place — ₱20,000',
      date: 'October 1, 2025',
      location: 'AIM Conference Center, Makati City',
      teammates: [
        { name: 'Kiel Ethan Lanzanas', role: 'Technological University of the Philippines' },
        { name: 'Ellah Benerado', role: 'Adamson University' },
        { name: 'John Carlo Santos', role: 'Bulacan State University' },
      ],
      githubUrl: 'https://github.com/adr1el-m/worksight',
      description:
        "Recognition: Placed 3rd in the Workplace Productivity and Future of Work category at BPI DataWave Hackathon 2025.\nScope: Built WorkSight, an AI-powered well-being analytics platform for identifying burnout risk through behavioral and organizational signals.\nContribution: Helped develop the product narrative, system workflow, and competition pitch for a workplace analytics solution.",
      projectTitle: 'WorkSight',
    },
{
      title: 'Codebility Portfolio Contest 2025 — 2nd Place',
      images: ['/images/honors/codebility/portfolio-contest-2025.jpg'],
      webpImages: ['/images/honors/codebility/portfolio-contest-2025-400.webp'],
      organizer: 'Codebility — Portfolio Contest 2025',
      date: 'October 2025',
      location: 'Online',
      description:
        "Recognition: Placed 2nd in the Codebility Portfolio Contest 2025, receiving an internship offer and cash award.\nScope: Submitted a portfolio evaluated on presentation, technical clarity, and professional readiness.\nContribution: Demonstrated the ability to communicate projects, experience, and technical growth through a polished personal site.",
      projectTitle: 'Portfolio Contest 2025',
      linkedinUrl: 'https://www.linkedin.com/posts/adr1el_this-comes-a-bit-late-but-its-a-milestone-activity-7419437733170896897-nULW?utm_source=share&utm_medium=member_desktop&rcm=ACoAAFCMwAABUwVcMwAFxdORbMcULlqBOAyuSpU',
      facebookUrl: 'https://www.facebook.com/share/p/19mEFhhtCv/',
    },
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
        { name: 'Juanito Ramos II', role: 'Rizal Technological University - Bonifacio Campus' },
        { name: 'Maxxinne Fernandez', role: 'Rizal Technological University - Bonifacio Campus' },
        { name: 'Threshia Saut', role: 'Rizal Technological University - Bonifacio Campus' },
        { name: 'Franchezca Natividad Banayad', role: 'Pamantasang Lungsod ng Maynila' },
      ],
      githubUrl: 'https://github.com/adr1el-m/technovation-2025',
      description:
        "Recognition: Won National Champion at the Technovation Summit 2025 Start-up Hackathon.\nScope: Built LingapLink, an AI-powered healthcare platform for triage, booking, communication, and record management.\nContribution: Helped shape the healthcare workflow, technical implementation, and pitch strategy for a competition-winning product.",
      projectTitle: 'LingapLink',
      linkedinUrl:
        'https://www.linkedin.com/posts/adr1el_nationaltechnovationsummit-activity-7369257090281791488-SXY8',
    },
{
      title: 'De La Salle University HackerCup 2025',
      images: [],
      webpImages: [],
      organizer:
        "DLSU HackerCup — Theme: 'Convenience: Hacking Everyday Hassles for Better Communities' — 9th Place",
      date: 'August 15–16, 2025',
      location: 'Gokongwei Hall, De La Salle University',
      teammates: [
        { name: 'Ellah Benerado', role: 'Adamson University' },
        { name: 'Kiel Ethan Lanzanas', role: 'Technological University of the Philippines' },
        { name: 'John Carlo Santos', role: 'Bulacan State University' },
      ],
      description:
        "Participation: Competed in the De La Salle University Hackercup with Team 4Sight.\nScope: Built DokQ, a healthcare queueing and appointment system designed to reduce friction in clinic workflows.\nContribution: Helped translate everyday healthcare waiting problems into a practical patient-and-provider platform.",
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
      teammates: [
        { name: 'Alvic Decipolo', role: 'Polytechnic University of the Philippines - Manila' },
        { name: 'Russell Khyle David (Russ David)', role: 'Polytechnic University of the Philippines - Manila' },
        { name: 'Rheinz Owen Alpon', role: 'Polytechnic University of the Philippines - Manila' },
        { name: 'Vinzed Diala', role: 'Polytechnic University of the Philippines - Manila' },
      ],
      description:
        "Recognition: Earned Second Runner-Up at Spark Rush 2025 by GDG on Campus PUP.\nScope: Completed a station-based competition requiring teamwork, problem solving, and endurance across multiple challenge formats.\nContribution: Demonstrated adaptability, communication, and composure in a fast-paced technical event.",
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
      teammates: [
        { name: 'Mc Henry Sarcia', role: 'Polytechnic University of the Philippines - Manila' },
        { name: 'Sean Russell Villeza', role: 'Polytechnic University of the Philippines - Manila' },
        { name: 'Jermaine Falcutila', role: 'Polytechnic University of the Philippines - Manila' },
        { name: 'Kenchie Baylon', role: 'Polytechnic University of the Philippines - Manila' },
      ],
      description:
        "Recognition: Received Gawad Pagkilala recognition at Polytechnic University of the Philippines for national competition achievement.\nScope: Honored for placing 3rd in an Entrepreneurship Educators' Association national competition.\nContribution: Marked an early milestone in applying technical creativity, entrepreneurship, and team-based execution.",
    },
  ],
};
