import type { ProjectProof } from '@/types';

/**
 * Evidence-oriented details that supplement the DOM-authored project cards.
 * Keep claims concise and traceable to a project repository, demo, or honor.
 */
const profiles: Record<string, ProjectProof> = {
  'online document request system': {
    role: 'Full-stack implementation', team: 'Academic project', timeframe: 'Grade 12 school workflow',
    constraints: 'Replace manual request coordination with a trackable student-and-staff flow.',
    outcome: 'Delivered authentication, request tracking, status updates, and admin controls.',
    architecture: 'PHP application · MySQL data layer · browser-based admin and student workflows',
    evidence: [{ label: 'Source repository', href: 'https://github.com/adr1el-m/Online-Document-Request-System' }],
    caseStudyUrl: '/case-studies/odrs',
  },
  worksight: {
    role: 'Product narrative, workflow design, and competition pitch', team: '4Sight · hackathon team', timeframe: 'BPI DataWave 2025',
    constraints: 'Make burnout risk legible from behavioral and organizational signals without reducing people to a single metric.',
    outcome: '3rd place in BPI DataWave 2025, Future of Work category.',
    architecture: 'Next.js App Router · TypeScript · Supabase/PostgreSQL · analytics workflows',
    evidence: [{ label: 'Live product', href: 'https://worksight.vercel.app/' }, { label: 'Documentation', href: 'https://worksightdocs.vercel.app/' }, { label: 'Source repository', href: 'https://github.com/4sightorg/worksight' }],
    caseStudyUrl: '/case-studies/worksight',
  },
  genesync: {
    role: 'Group 5 contributor', team: 'Group 5 · presentation project', timeframe: 'Academic bioinformatics project',
    constraints: 'Make global sequence alignment explainable while preserving the Needleman–Wunsch workflow.',
    outcome: 'Interactive sequence validation, scoring, traceback, identity analysis, and hotspot visualization.',
    architecture: 'SwiftUI client · dynamic-programming alignment engine · FASTA-aware input handling',
    evidence: [{ label: 'Demo video', href: 'https://www.youtube.com/watch?v=tuJthrRh8Ik' }, { label: 'Source repository', href: 'https://github.com/adr1el-m/gene-sync' }],
    caseStudyUrl: '/case-studies/genesync',
  },
  dokq: {
    role: 'Team contributor', team: '4Sight · DLSU HackerCup team', timeframe: 'DLSU HackerCup 2025',
    constraints: 'Reduce clinic queue friction for both patients and providers.',
    outcome: 'Patient and provider workflows for booking, queue visibility, and operational coordination.',
    architecture: 'React/Vite · TypeScript · Node/Express · Firebase services',
    evidence: [{ label: 'Live product', href: 'https://dokq.vercel.app/' }, { label: 'Source repository', href: 'https://github.com/4sightorg/dokq' }],
    caseStudyUrl: '/case-studies/dokq',
  },
  lingaplink: {
    role: 'AI triage implementation, platform unification, and live demo pitch', team: 'Carmen The ParaSight · NCR representative', timeframe: 'Technovation Summit 2025',
    constraints: 'Connect triage, booking, communication, and records in a usable healthcare workflow.',
    outcome: 'National Champion at Technovation Summit 2025.',
    architecture: 'React/TypeScript · Express services · Firebase · AI-assisted triage workflows',
    evidence: [{ label: 'Source repository', href: 'https://github.com/adr1el-m/carmen-the-parasight' }],
    caseStudyUrl: '/case-studies/lingaplink',
  },
  'kita kita agentic': {
    role: 'Team contributor', team: 'Deansanitzy · hackathon team', timeframe: 'Agentic AI Hackathon 2025',
    constraints: 'Turn personal-finance data into understandable, actionable guidance.',
    outcome: 'Top 5 at the Agentic AI Hackathon 2025.',
    architecture: 'Web client · Node/Express · Firebase · charts · agent-assisted financial workflows',
    evidence: [{ label: 'Source repository', href: 'https://github.com/adr1el-m/team-Deansanitzy-2025' }],
  },
  barangaynav: {
    role: 'Team contributor', team: 'Sparkfest project team', timeframe: 'Sparkfest 2025',
    constraints: 'Make service requirements, costs, and timelines easier for residents to understand.',
    outcome: 'Civic-service navigation concept with transparent, guided request flows.',
    architecture: 'Angular · TypeScript · Gemini-guided assistance · responsive web UI',
    evidence: [{ label: 'Source repository', href: 'https://github.com/adr1el-m/sparkfest' }],
  },
};

function key(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function getProjectProof(title: string): ProjectProof | undefined {
  return profiles[key(title)];
}
