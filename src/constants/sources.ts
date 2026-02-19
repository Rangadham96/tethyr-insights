export type SourceCategory =
  | "discussion"
  | "app_stores"
  | "reviews"
  | "social"
  | "forums"
  | "research"
  | "jobs"
  | "ecommerce";

export interface SourceEntry {
  display_name: string;
  category: SourceCategory;
  description: string;
}

export const SOURCE_REGISTRY: Record<string, SourceEntry> = {
  reddit: {
    display_name: "Reddit",
    category: "discussion",
    description: "Subreddit threads, comments, and discussions across thousands of communities.",
  },
  hackernews: {
    display_name: "Hacker News",
    category: "discussion",
    description: "Technical discussions and startup commentary from the YC community.",
  },
  indiehackers: {
    display_name: "Indie Hackers",
    category: "discussion",
    description: "Founder conversations, revenue reports, and product feedback.",
  },
  producthunt: {
    display_name: "Product Hunt",
    category: "discussion",
    description: "Product launches, comments, and maker discussions.",
  },
  quora: {
    display_name: "Quora",
    category: "discussion",
    description: "Question-and-answer threads across consumer and professional topics.",
  },
  alternativeto: {
    display_name: "AlternativeTo",
    category: "discussion",
    description: "Software comparisons and user-submitted alternatives with reviews.",
  },
  discord_public: {
    display_name: "Discord",
    category: "discussion",
    description: "Public Discord server conversations and community discussions.",
  },
  discourse_forums: {
    display_name: "Discourse Forums",
    category: "discussion",
    description: "Community forums powered by Discourse across various products.",
  },
  apple_app_store: {
    display_name: "Apple App Store",
    category: "app_stores",
    description: "iOS app reviews, ratings, and user feedback.",
  },
  google_play_store: {
    display_name: "Google Play",
    category: "app_stores",
    description: "Android app reviews, ratings, and user feedback.",
  },
  chrome_web_store: {
    display_name: "Chrome Web Store",
    category: "app_stores",
    description: "Browser extension reviews and user feedback.",
  },
  g2: {
    display_name: "G2",
    category: "reviews",
    description: "B2B software reviews with detailed pros, cons, and feature ratings.",
  },
  capterra: {
    display_name: "Capterra",
    category: "reviews",
    description: "Business software reviews with verified user feedback.",
  },
  trustpilot: {
    display_name: "Trustpilot",
    category: "reviews",
    description: "Consumer trust reviews across products and services.",
  },
  glassdoor: {
    display_name: "Glassdoor",
    category: "reviews",
    description: "Company reviews, salaries, and workplace feedback.",
  },
  bbb_complaints: {
    display_name: "BBB Complaints",
    category: "reviews",
    description: "Better Business Bureau complaints and resolution records.",
  },
  indie_review_sites: {
    display_name: "Indie Review Sites",
    category: "reviews",
    description: "Independent blog reviews and comparison articles.",
  },
  youtube_comments: {
    display_name: "YouTube Comments",
    category: "social",
    description: "Video comments on product reviews, tutorials, and discussions.",
  },
  twitter_x: {
    display_name: "X / Twitter",
    category: "social",
    description: "Tweets, threads, and public conversations.",
  },
  facebook_groups_public: {
    display_name: "Facebook Groups",
    category: "social",
    description: "Public group discussions and community posts.",
  },
  linkedin_comments: {
    display_name: "LinkedIn Comments",
    category: "social",
    description: "Professional commentary on industry posts and articles.",
  },
  tiktok_comments: {
    display_name: "TikTok",
    category: "social",
    description: "Video comments on product and lifestyle content.",
  },
  stackoverflow: {
    display_name: "Stack Overflow",
    category: "forums",
    description: "Developer Q&A on technical problems and tool comparisons.",
  },
  patient_communities: {
    display_name: "Patient Communities",
    category: "research",
    description: "Health forums like HealthUnlocked, PatientsLikeMe, and condition-specific boards.",
  },
  substack_comments: {
    display_name: "Substack",
    category: "research",
    description: "Newsletter comments and subscriber discussions.",
  },
  academic_papers: {
    display_name: "Academic Papers",
    category: "research",
    description: "Published research, abstracts, and citation data from PubMed and similar.",
  },
  podcast_transcripts: {
    display_name: "Podcast Transcripts",
    category: "research",
    description: "Transcribed podcast episodes discussing relevant topics.",
  },
  job_postings: {
    display_name: "Job Postings",
    category: "jobs",
    description: "Job listings indicating market demand and company priorities.",
  },
  amazon_reviews: {
    display_name: "Amazon Reviews",
    category: "ecommerce",
    description: "Product reviews and buyer feedback on Amazon.",
  },
};

export const SOURCE_CATEGORIES: Record<SourceCategory, string> = {
  discussion: "Discussion & Communities",
  app_stores: "App Stores",
  reviews: "Professional Reviews",
  social: "Social Platforms",
  forums: "Forums",
  research: "Academic & Research",
  jobs: "Market Intelligence",
  ecommerce: "E-commerce",
};

export function getSourcesByCategory(): Record<SourceCategory, Array<{ key: string } & SourceEntry>> {
  const result: Record<string, Array<{ key: string } & SourceEntry>> = {};
  for (const [key, entry] of Object.entries(SOURCE_REGISTRY)) {
    if (!result[entry.category]) result[entry.category] = [];
    result[entry.category].push({ key, ...entry });
  }
  return result as Record<SourceCategory, Array<{ key: string } & SourceEntry>>;
}
