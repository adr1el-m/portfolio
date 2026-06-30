export type Teammate = {
  name: string;
  role: string;
};

export type Award = {
  title: string;
  badge: string;
  subtitle: string;
  date: string;
  location: string;
  organizer: string;
  description: string;
  teammates?: Teammate[];
  images: string[];
  links?: Array<{
    label: string;
    href: string;
  }>;
};

export const awardsByYear: Record<string, Award[]> = {
  "2026": [
    {
      title: "Hour of Code Challenge",
      badge: "Award Winner",
      subtitle: "Won Samsung Galaxy A07",
      date: "January 15, 2026",
      location: "Online",
      organizer: "Limitless Lab",
      description:
        "Selected as one of the winners and awarded a Samsung Galaxy A07 after completing the AI challenge activities.",
      images: [
        "/images/honors/2026/hour_of_code/1.avif",
        "/images/honors/2026/hour_of_code/2.avif",
      ],
    },
    {
      title: "Agora Voice AI Hackathon",
      badge: "Participant",
      subtitle: "Team MAF",
      date: "March 17, 2026",
      location: "AWS Office, Arthaland Century Pacific Towers",
      organizer: "Agora Voice AI Hackathon",
      description: "Participated as Team MAF in the Agora Voice AI Hackathon.",
      teammates: [
        { name: "Elizar Inso", role: "Team Member" },
        { name: "Hanzlei Jamison", role: "Team Member" },
        { name: "Jude Vincent Puti", role: "Team Member" },
      ],
      images: [
        "/images/honors/2026/agora/1.avif",
        "/images/honors/2026/agora/2.avif",
        "/images/honors/2026/agora/3.avif",
      ],
    },
    {
      title: "Apple Swift Student Challenge",
      badge: "Participant",
      subtitle: "Online Submission",
      date: "March 28, 2026",
      location: "Online",
      organizer: "Apple",
      description: "Participated in the Apple Swift Student Challenge.",
      images: [],
    },
    {
      title: "START-a-TON: Data & AI Innovation Challenge",
      badge: "Champion",
      subtitle: "STAR-LINK - Data & AI Innovation Challenge",
      date: "April 18, 2026",
      location: "Online",
      organizer:
        "Scholars Transforming Advancement and Research for Technology - DOST with DOST-SEI Science Teacher Academy for the Regions",
      description:
        "Won champion in START-a-TON, a nationwide two-week Data & AI innovation challenge for DOST techno-scholars. The team built STAR-LINK, a platform layer for the e-STAR.ph ecosystem that connects educators, organizes action research, surfaces regional insights, and supports collaboration across 18 regions of the Philippines.",
      teammates: [
        { name: "Gem Christian Lazo", role: "Team Member" },
        { name: "Marti Kier Trance", role: "Team Member" },
        { name: "Janel Rose Trongcoso", role: "Team Member" },
        { name: "Christine Rio", role: "Team Member" },
      ],
      images: [],
      links: [
        { label: "Live Demo", href: "https://lnkd.in/gMUq75nZ" },
        { label: "GitHub", href: "https://lnkd.in/g4e7JHPT" },
      ],
    },
    {
      title: "CodeKada 2026",
      badge: "Participant",
      subtitle: "The Online Hackathon Participation",
      date: "May 3-9, 2026",
      location: "Online (Discord)",
      organizer: "CodeKada",
      description:
        "Participated in CodeKada 2026: The Online Hackathon, held via Discord from May 3-9, 2026.",
      teammates: [
        { name: "Jero", role: "Team Member" },
        { name: "Jordan", role: "Team Member" },
        { name: "Don", role: "Team Member" },
      ],
      images: ["/images/honors/2026/codekada/Adriel M. Magalona.avif"],
    },
    {
      title: "The Innovation Lab 2026: The Mindful Harvest",
      badge: "Participant",
      subtitle: "Program Participant",
      date: "February 2026",
      location: "University of the Philippines Los Baños",
      organizer: "The Innovation Lab 2026: The Mindful Harvest",
      description: "Participated in The Innovation Lab 2026: The Mindful Harvest in February 2026.",
      teammates: [
        { name: "Kiel Ethan Lanzanas", role: "Team Member" },
        { name: "Ellah Benerado", role: "Team Member" },
        { name: "John Carlo Santos", role: "Team Member" },
      ],
      images: [],
    },
    {
      title: "SIKAPTala",
      badge: "2nd Place",
      subtitle: "CS and IT Quiz Bee",
      date: "2026",
      location: "De La Salle University - Dasmariñas",
      organizer: "SIKAPTala",
      description: "Placed 2nd in SIKAPTala at De La Salle University - Dasmariñas.",
      images: [],
    },
    {
      title: "SIKAPTala 2026 Hackathon",
      badge: "Participant",
      subtitle: "Hackathon Participant",
      date: "2026",
      location: "De La Salle University - Dasmariñas",
      organizer: "SIKAPTala",
      description:
        "Participated in the SIKAPTala 2026 Hackathon at De La Salle University - Dasmariñas.",
      images: [],
    },
  ],
  "2025": [
    {
      title: "HACK THE FLOOD: Digital Rights Hackathon",
      badge: "Participant",
      subtitle: "SubaybayPH",
      date: "December 6, 2025",
      location: "UP Diliman",
      organizer: "Computer Professionals' Union",
      description:
        "Built SubaybayPH to map flood control initiatives with ground reports and public accountability data.",
      teammates: [
        { name: "Kiel Ethan Lanzanas", role: "Team Member" },
        { name: "Ellah Benerado", role: "Team Member" },
      ],
      images: [
        "/images/honors/2025/hack_the_flood/1.avif",
        "/images/honors/2025/hack_the_flood/2.avif",
      ],
    },
    {
      title: "Philippine Junior Data Science Challenge 2025",
      badge: "Participant",
      subtitle: "National Data Science Competition",
      date: "2025",
      location: "Philippines",
      organizer: "UP Data Science Society (UP DSS)",
      description:
        "Joined a nationwide challenge focused on solving real-world problems using data analytics.",
      teammates: [
        { name: "Ellah Benerado", role: "Team Member" },
        { name: "Kiel Ethan Lanzanas", role: "Team Member" },
        { name: "John Carlo Santos", role: "Team Member" },
        { name: "Philip Ma", role: "Team Member" },
      ],
      images: ["/images/honors/2025/pjdsc/1.avif"],
    },
    {
      title: "Codebility Portfolio Contest 2025",
      badge: "2nd Place",
      subtitle: "Internship Offer + PHP 800 Award",
      date: "October 2025",
      location: "Online",
      organizer: "Codebility - Portfolio Contest 2025",
      description: "Secured 2nd place and received an internship offer with a cash award.",
      images: ["/images/honors/2025/codebiity/codebility.avif"],
    },
    {
      title: "BPI DataWave Hackathon 2025",
      badge: "3rd Place",
      subtitle: "Team 4Sight - WorkSight - PHP 20,000",
      date: "October 1, 2025",
      location: "AIM Conference Center, Makati City",
      organizer: "BPI DataWave Hackathon 2025",
      description:
        "Our team 4Sight placed Top 3 with WorkSight, an AI-powered burnout risk intelligence platform.",
      teammates: [
        { name: "Kiel Ethan Lanzanas", role: "Team Member" },
        { name: "Ellah Benerado", role: "Team Member" },
        { name: "John Carlo Santos", role: "Team Member" },
      ],
      images: [
        "/images/honors/2025/bpi_datawave/1.avif",
        "/images/honors/2025/bpi_datawave/2.avif",
        "/images/honors/2025/bpi_datawave/3.avif",
        "/images/honors/2025/bpi_datawave/4.avif",
      ],
    },
    {
      title: "Technovation Summit 2025 Start-up Hackathon",
      badge: "Champion",
      subtitle: "National Champion - Team Carmen The ParaSight - LingapLink",
      date: "August 31, 2025",
      location: "Marco Polo Plaza Hotel, Cebu",
      organizer: "Technovation Summit",
      description:
        "Won as national champion with LingapLink, an AI-powered healthcare system, and received PHP 30,000.",
      teammates: [
        { name: "Juanito Ramos II", role: "Team Member" },
        { name: "Maxxinne Fernandez", role: "Team Member" },
        { name: "Threshia Saut", role: "Team Member" },
        { name: "Franchezca Natividad Banayad", role: "Team Member" },
      ],
      images: [
        "/images/honors/2025/technovation_summit/1.avif",
        "/images/honors/2025/technovation_summit/2.avif",
        "/images/honors/2025/technovation_summit/3.avif",
      ],
    },
    {
      title: "De La Salle University Hackercup",
      badge: "9th Place",
      subtitle: "Team 4Sight - DokQ Healthcare System",
      date: "August 15-16, 2025",
      location: "Gokongwei Hall, De La Salle University",
      organizer: "DLSU HackerCup 2025",
      description:
        "Placed 9th out of 24 teams with DokQ, a smart appointment and patient profile platform.",
      teammates: [
        { name: "Ellah Benerado", role: "Team Member" },
        { name: "Kiel Ethan Lanzanas", role: "Team Member" },
        { name: "John Carlo Santos", role: "Team Member" },
      ],
      images: [
        "/images/honors/2025/dlsu_hackercup/1.avif",
        "/images/honors/2025/dlsu_hackercup/2.avif",
        "/images/honors/2025/dlsu_hackercup/3.avif",
        "/images/honors/2025/dlsu_hackercup/4.avif",
      ],
    },
    {
      title: "Agentic AI Hackathon 2025",
      badge: "Top 5",
      subtitle: "Team Deansanitzy - Kita-Kita Financial Platform",
      date: "June 28, 2025",
      location: "White Cloak Technologies, Inc.",
      organizer: "Gen AI Philippines",
      description:
        "Placed Top 5 out of 33 teams by building Kita-Kita, an AI-powered financial management platform.",
      teammates: [
        { name: "James Rafael Mendiola", role: "Team Member" },
        { name: "Jude Vincent Puti", role: "Team Member" },
      ],
      images: [
        "/images/honors/2025/agentic_ai/1.avif",
        "/images/honors/2025/agentic_ai/2.avif",
        "/images/honors/2025/agentic_ai/3.avif",
        "/images/honors/2025/agentic_ai/4.avif",
      ],
    },
    {
      title: "Spark Rush 2025",
      badge: "2nd Runner-Up",
      subtitle: "Station-Based Competition - Team Eba't Adan",
      date: "May 17, 2025",
      location: "Polytechnic University of the Philippines - Manila",
      organizer: "Google Developer Groups on Campus",
      description:
        "Earned 2nd runner-up in a station-based challenge focused on teamwork, strategy, and endurance.",
      teammates: [
        { name: "Alvic Decipolo", role: "Team Member" },
        { name: "Russ David", role: "Team Member" },
        { name: "Rheinz Owen Alpon", role: "Team Member" },
        { name: "Vinzed Diala", role: "Team Member" },
      ],
      images: [
        "/images/honors/2025/spark_rush/1.avif",
        "/images/honors/2025/spark_rush/2.avif",
        "/images/honors/2025/spark_rush/3.avif",
      ],
    },
    {
      title: "Hack-it: The New Era of Banking Hackathon",
      badge: "2nd Runner-Up",
      subtitle: "Team Loan Wolves - AI Fintech Solution",
      date: "April 4-5, 2025",
      location: "work.able, Bridgetowne, Quezon City",
      organizer: "Springboard Labs",
      description:
        "Won 2nd runner-up and built Kita-Kita, an AI-powered app for budgeting and investment planning.",
      teammates: [
        { name: "Dean James Salvacion", role: "Team Member" },
        { name: "Jude Vincent Puti", role: "Team Member" },
        { name: "Mc Henry Sarcia", role: "Team Member" },
      ],
      images: [
        "/images/honors/2025/hack-It/1.avif",
        "/images/honors/2025/hack-It/2.avif",
        "/images/honors/2025/hack-It/3.avif",
      ],
    },
    {
      title: "Sparkfest 2025",
      badge: "Participant",
      subtitle: "BarangayNav",
      date: "2025",
      location: "Google Developer Groups on Campus - Polytechnic University of the Philippines",
      organizer: "Google Developer Groups on Campus",
      description:
        "Joined a one-week SDG-focused hackathon and developed BarangayNav with a cross-school team.",
      teammates: [
        { name: "Paul Arthur M. Marayan", role: "Team Member (PUP)" },
        { name: "Clark Johnson Ebora", role: "Team Member (UST)" },
        { name: "Carl Jayvin T. Lee", role: "Team Member (PUP)" },
      ],
      images: [],
    },
    {
      title: "Green Pioneers Hackathon",
      badge: "Participant",
      subtitle: "Green Pulse",
      date: "2025",
      location: "Online",
      organizer: "YPStem",
      description:
        "Participated in a global environmental hackathon focused on building impactful sustainability solutions.",
      images: [],
    },
  ],
  "2024": [
    {
      title: "Excalicode - Data Structures & Algorithms Competition",
      badge: "1st Place",
      subtitle: "Knight Category Winner",
      date: "September 9, 2024",
      location: "Polytechnic University of the Philippines - Manila",
      organizer:
        "The Programmers' Guild at Polytechnic University of the Philippines",
      description:
        "Won the Knight Category in a Data Structures and Algorithms competition organized by The Programmers' Guild.",
      images: [
        "/images/honors/2024/excalicode/1.avif",
        "/images/honors/2024/excalicode/2.avif",
      ],
    },
    {
      title: "Entrepreneurship Educators Association Hackathon",
      badge: "3rd Place",
      subtitle: "Team Piyutech - EcoSiklo Project",
      date: "September 14, 2024",
      location: "Miriam College, Quezon City",
      organizer: "Entrepreneurship Educators Association",
      description:
        "Our team Piyutech placed 3rd out of 6 teams by developing EcoSiklo, a circular economy solution that transforms fabric scraps into essential pet products.",
      links: [
        {
          label: "LinkedIn Post",
          href: "https://www.linkedin.com/posts/adr1el_after-a-month-of-intense-preparation-and-activity-7242927278001639426-AT2U?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAFCMwAABUwVcMwAFxdORbMcULlqBOAyuSpU",
        },
      ],
      teammates: [
        { name: "Mc Henry Sarcia", role: "Team Member" },
        { name: "Sean Russell Villeza", role: "Team Member" },
        { name: "Jermaine Falcutila", role: "Team Member" },
        { name: "Kenchie Baylon", role: "Team Member" },
      ],
      images: [
        "/images/honors/2024/eneda/1.avif",
        "/images/honors/2024/eneda/2.avif",
        "/images/honors/2024/eneda/3.avif",
        "/images/honors/2024/eneda/4.avif",
        "/images/honors/2024/eneda/5.avif",
        "/images/honors/2024/eneda/6.avif",
      ],
    },
    {
      title: "Gawad Pagkilala 2024",
      badge: "Awardee",
      subtitle: "Recognition Award",
      date: "November 21, 2024",
      location: "Bulwagang Balagtas NALLRC, Polytechnic University of the Philippines - Manila",
      organizer: "Gawad Pagkilala Taong 2024",
      description:
        "Recognized for securing 3rd place in the Entrepreneurship Educators' Association National Competition.",
      links: [
        {
          label: "LinkedIn Post",
          href: "https://www.linkedin.com/posts/adr1el_gawadpagkilala2024-activity-7266006537779691521-bKxn?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAFCMwAABUwVcMwAFxdORbMcULlqBOAyuSpU",
        },
      ],
      images: ["/images/honors/2024/gawad_pagkilala/1.avif"],
    },
  ],
};
