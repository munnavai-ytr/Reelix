// 22+ Real Built-in Viral Shorts Templates with Full Edit Plan Blueprints
import { EditPlan } from '../engine/types';

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  niche: string;
  category?: 'business' | 'entertainment' | 'education' | 'lifestyle' | 'viral';
  recommendedDuration: number; // in seconds
  captionStyle: string;
  bRollKeywords: string[];
  musicMood: 'dramatic' | 'upbeat' | 'lofi' | 'hype';
  tags?: string[];
  buildDraftPlan: (script: string, voiceUrl: string, duration: number) => Partial<EditPlan>;
}

export const BUILT_IN_TEMPLATES: Record<string, TemplateDefinition> = {
  // 1. Hook Problem Solution CTA
  'hook-problem-solution-cta': {
    id: 'hook-problem-solution-cta',
    name: 'Viral Hook → Problem → Solution',
    description: 'High-retention structure: Explosive 2-second hook, emotional friction, payoff, and clean CTA',
    niche: 'Tech / Business / Productivity',
    category: 'business',
    recommendedDuration: 45,
    captionStyle: 'karaoke-word-highlight',
    bRollKeywords: ['futuristic tech', 'stressed worker', 'breakthrough moment', 'glowing success'],
    musicMood: 'upbeat',
    tags: ['conversion', 'marketing', 'classic'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Visual Hook', type: 'hook' },
        { time: Math.min(3, duration * 0.15), label: 'Problem Agitation', type: 'highlight' },
        { time: duration * 0.55, label: 'The Breakthrough', type: 'beat' },
        { time: Math.max(0, duration - 4), label: 'Call to Action', type: 'cta' },
      ]
    })
  },

  // 2. Cinematic Storytime
  'viral-storytime': {
    id: 'viral-storytime',
    name: 'Cinematic Storytime',
    description: 'Deep narrative pacing with atmospheric film grain, slow zooms, and suspenseful chapter drops',
    niche: 'Storytelling / History / Mystery',
    category: 'entertainment',
    recommendedDuration: 60,
    captionStyle: 'typewriter',
    bRollKeywords: ['ancient map', 'dark atmospheric corridor', 'mysterious artifact', 'dramatic landscape'],
    musicMood: 'dramatic',
    tags: ['mystery', 'history', 'narrative'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'The Mystery Begins', type: 'hook' },
        { time: duration * 0.35, label: 'The Hidden Clue', type: 'highlight' },
        { time: duration * 0.7, label: 'The Shocking Truth', type: 'beat' },
      ]
    })
  },

  // 3. Rapid Fact Breakdown
  'fact-breakdown': {
    id: 'fact-breakdown',
    name: 'Rapid Fact Breakdown',
    description: '3 unbelievable facts revealed with whip-pans, number cards, and sound effect accents',
    niche: 'Science / Trivia / Did You Know',
    category: 'education',
    recommendedDuration: 40,
    captionStyle: 'box-highlight',
    bRollKeywords: ['cosmos galaxy', 'dna double helix', 'deep ocean creatures', 'macro photography'],
    musicMood: 'hype',
    tags: ['science', 'trivia', 'facts'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Fact #1 Hook', type: 'hook' },
        { time: duration * 0.33, label: 'Fact #2 Escalation', type: 'highlight' },
        { time: duration * 0.66, label: 'Fact #3 The Craziest One', type: 'beat' },
        { time: Math.max(0, duration - 3), label: 'Comment Prompt', type: 'cta' },
      ]
    })
  },

  // 4. Step-by-Step How-To
  'rapid-tutorial': {
    id: 'rapid-tutorial',
    name: 'Step-by-Step Rapid How-To',
    description: 'Crisp workflow demonstration with numbered callouts and focused screen crops',
    niche: 'Tutorials / AI Tools / Lifehacks',
    category: 'education',
    recommendedDuration: 50,
    captionStyle: 'outline',
    bRollKeywords: ['coding screen', 'smartphone app', 'designer drawing tablet', 'modern workstation'],
    musicMood: 'lofi',
    tags: ['tutorial', 'howto', 'tools'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'The Goal Hook', type: 'hook' },
        { time: duration * 0.2, label: 'Step 1: Setup', type: 'highlight' },
        { time: duration * 0.5, label: 'Step 2: Execution', type: 'highlight' },
        { time: duration * 0.8, label: 'Step 3: Result', type: 'beat' },
      ]
    })
  },

  // 5. Motivational Punch
  'motivational-punch': {
    id: 'motivational-punch',
    name: 'High-Impact Motivational Reel',
    description: 'Bold center word blasts, heavy contrast noir, camera shake, and anthemic climax',
    niche: 'Fitness / Mindset / Motivation',
    category: 'viral',
    recommendedDuration: 30,
    captionStyle: 'bold-center',
    bRollKeywords: ['athlete sprinting', 'heavy rain city lights', 'boxing ring focus', 'mountain summit sunrise'],
    musicMood: 'hype',
    tags: ['gym', 'grind', 'motivation'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Hard Truth Opening', type: 'hook' },
        { time: duration * 0.45, label: 'The Turning Point', type: 'beat' },
        { time: Math.max(0, duration - 5), label: 'Final Punchline', type: 'cta' },
      ]
    })
  },

  // 6. Breaking News Bulletin
  'news-bulletin': {
    id: 'news-bulletin',
    name: 'Breaking News Alert',
    description: 'Urgent red ticker, globe spin, high-authority tone, and factual sound bites',
    niche: 'News / Tech Updates / Geopolitics',
    category: 'business',
    recommendedDuration: 45,
    captionStyle: 'news-bar',
    bRollKeywords: ['broadcasting studio', 'press conference microphone', 'stock market ticker', 'satellite dish'],
    musicMood: 'dramatic',
    tags: ['news', 'breaking', 'urgent'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Breaking Alert Intro', type: 'hook' },
        { time: duration * 0.25, label: 'Key Details', type: 'highlight' },
        { time: duration * 0.75, label: 'Global Repercussions', type: 'beat' },
      ]
    })
  },

  // 7. Philosophical Quote Reel
  'quote-wisdom': {
    id: 'quote-wisdom',
    name: 'Philosophical Wisdom Quote',
    description: 'Stoic philosophy, Marcus Aurelius quotes, gentle ambient lo-fi, and misty forests',
    niche: 'Philosophy / Quotes / Books',
    category: 'lifestyle',
    recommendedDuration: 35,
    captionStyle: 'minimal-cinema',
    bRollKeywords: ['marble statue', 'misty mountain dawn', 'ocean waves crashing', 'old parchment book'],
    musicMood: 'lofi',
    tags: ['stoic', 'peace', 'mind'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'The Paradox', type: 'hook' },
        { time: duration * 0.5, label: 'The Core Quote', type: 'highlight' },
        { time: duration * 0.85, label: 'Actionable Reflection', type: 'cta' },
      ]
    })
  },

  // 8. Viral E-Commerce Product Showcase
  'product-showcase': {
    id: 'product-showcase',
    name: 'TikTok Shop Product Reveal',
    description: 'Dynamic problem demonstration, instant unboxing solve, and limited-time offer badge',
    niche: 'E-Commerce / Gadgets / Reviews',
    category: 'business',
    recommendedDuration: 40,
    captionStyle: 'box-highlight',
    bRollKeywords: ['clean marble product display', 'unboxing package hands', 'device in action', 'satisfied smile'],
    musicMood: 'upbeat',
    tags: ['tiktokshop', 'unboxing', 'ecommerce'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Why didn\'t I buy this sooner?', type: 'hook' },
        { time: duration * 0.3, label: 'Feature 1', type: 'highlight' },
        { time: duration * 0.6, label: 'Feature 2', type: 'highlight' },
        { time: Math.max(0, duration - 4), label: 'Tap link in bio', type: 'cta' },
      ]
    })
  },

  // 9. Podcast Hot Take Debate
  'podcast-hot-take': {
    id: 'podcast-hot-take',
    name: 'Podcast Hot Take Snippet',
    description: 'Polarizing statement with dual-shot zoom punch and dramatic audio pauses',
    niche: 'Podcasts / Interviews / Debate',
    category: 'entertainment',
    recommendedDuration: 55,
    captionStyle: 'karaoke-word-highlight',
    bRollKeywords: ['podcast microphone Shure SM7B', 'neon studio table', 'person reacting with shock', 'crowd cheering'],
    musicMood: 'hype',
    tags: ['podcast', 'interview', 'viral'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Hot Take Opening', type: 'hook' },
        { time: duration * 0.4, label: 'The Counter Argument', type: 'highlight' },
        { time: duration * 0.8, label: 'The Knockout Point', type: 'beat' },
      ]
    })
  },

  // 10. Reddit Thread Confession Reader
  'reddit-thread': {
    id: 'reddit-thread',
    name: 'Reddit Story Confession',
    description: 'Top Reddit post read with engaging kinetic background footage and chapter beats',
    niche: 'Reddit Stories / AskReddit / AITA',
    category: 'entertainment',
    recommendedDuration: 90,
    captionStyle: 'pop',
    bRollKeywords: ['subway surfer runner', 'satisfying kinetic soap cutting', 'minecraft parkour', 'minecraft jump'],
    musicMood: 'lofi',
    tags: ['reddit', 'story', 'satisfying'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Post Title Hook', type: 'hook' },
        { time: duration * 0.3, label: 'The Escalation', type: 'highlight' },
        { time: duration * 0.65, label: 'The Plot Twist', type: 'beat' },
        { time: Math.max(0, duration - 5), label: 'Part 2 in comments', type: 'cta' },
      ]
    })
  },

  // 11. Luxury Minimalist Aesthetic
  'luxury-aesthetic': {
    id: 'luxury-aesthetic',
    name: 'Old Money Luxury Minimal',
    description: 'Gold foil typography, slow buttery zooms, classical cello score, travertine textures',
    niche: 'Luxury / Fashion / Architecture',
    category: 'lifestyle',
    recommendedDuration: 30,
    captionStyle: 'gold-foil',
    bRollKeywords: ['luxury watch mechanics', 'supercar leather interior', 'monaco yacht coast', 'architectural villa'],
    musicMood: 'dramatic',
    tags: ['luxury', 'oldmoney', 'class'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Elegance Hook', type: 'hook' },
        { time: duration * 0.5, label: 'Heritage Craft', type: 'highlight' },
        { time: duration * 0.85, label: 'The Mark of Mastery', type: 'beat' },
      ]
    })
  },

  // 12. High Intensity HIIT Fitness Workout
  'fitness-blast': {
    id: 'fitness-blast',
    name: 'HIIT Workout Sprint',
    description: 'Fast energetic cuts, workout countdowns, heartbeat sound effects, phonk bass drops',
    niche: 'Fitness / Calisthenics / Crossfit',
    category: 'lifestyle',
    recommendedDuration: 45,
    captionStyle: 'bold-center',
    bRollKeywords: ['kettlebell swing', 'battle ropes gym', 'pullup bar back muscle', 'sweat dripping focus'],
    musicMood: 'hype',
    tags: ['workout', 'hiit', 'fit'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Exercise 1 Kickoff', type: 'hook' },
        { time: duration * 0.33, label: 'Exercise 2 Intensity', type: 'highlight' },
        { time: duration * 0.66, label: 'Final Burnout Set', type: 'beat' },
      ]
    })
  },

  // 13. Comedy Skit Setup & Punchline
  'comedy-skit': {
    id: 'comedy-skit',
    name: 'Comedy Skit Punchline',
    description: 'Relatable expectation vs reality with comedic pause and unexpected audio twist',
    niche: 'Comedy / Memes / Relatable',
    category: 'entertainment',
    recommendedDuration: 30,
    captionStyle: 'comic-bubble',
    bRollKeywords: ['person confident walking', 'record scratch freeze frame', 'funny face reaction', 'cat staring blankly'],
    musicMood: 'upbeat',
    tags: ['meme', 'funny', 'skit'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'The Expectation', type: 'hook' },
        { time: duration * 0.6, label: 'The Sudden Pause', type: 'highlight' },
        { time: duration * 0.75, label: 'The Punchline Drop', type: 'beat' },
      ]
    })
  },

  // 14. Before & After Transformation
  'before-after': {
    id: 'before-after',
    name: 'Before vs After Reveal',
    description: 'Dramatic transformation showcase with a split door or wipe transition reveal',
    niche: 'Renovation / Fitness / Design / Makeup',
    category: 'lifestyle',
    recommendedDuration: 30,
    captionStyle: 'box-highlight',
    bRollKeywords: ['messy room renovation', 'clean interior design modern', 'worn out vintage chair', 'restored polished wood'],
    musicMood: 'hype',
    tags: ['transformation', 'beforeafter', 'reveal'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'The Ugly Before', type: 'hook' },
        { time: duration * 0.45, label: 'The Process Flash', type: 'highlight' },
        { time: duration * 0.6, label: 'The Stunning After Reveal', type: 'beat' },
      ]
    })
  },

  // 15. Myth Busters Debunk
  'myth-busters': {
    id: 'myth-busters',
    name: 'Myth Busters: The Lie You Believe',
    description: 'Exposes a widespread common misconception with scientific facts and buzzer sound effects',
    niche: 'Science / Health / Psychology',
    category: 'education',
    recommendedDuration: 45,
    captionStyle: 'outline',
    bRollKeywords: ['caution tape barrier', 'scientific microscope slide', 'brain neuron scan', 'lightbulb eureka moment'],
    musicMood: 'dramatic',
    tags: ['myth', 'debunked', 'science'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'You were lied to', type: 'hook' },
        { time: duration * 0.3, label: 'Why everyone thinks this', type: 'highlight' },
        { time: duration * 0.6, label: 'What actually happens', type: 'beat' },
      ]
    })
  },

  // 16. Rapid Fire Interview Q&A
  'interview-qa': {
    id: 'interview-qa',
    name: 'Rapid-Fire Q&A Blitz',
    description: '5 punchy questions and instantaneous answers with buzzer SFX and quick cuts',
    niche: 'Creators / Founders / Influencers',
    category: 'entertainment',
    recommendedDuration: 40,
    captionStyle: 'typewriter',
    bRollKeywords: ['studio camera monitor', 'founder sitting in office', 'neon podcast background', 'smiling face close up'],
    musicMood: 'upbeat',
    tags: ['qanda', 'interview', 'blitz'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Question 1', type: 'hook' },
        { time: duration * 0.25, label: 'Question 2', type: 'highlight' },
        { time: duration * 0.5, label: 'Question 3', type: 'highlight' },
        { time: duration * 0.75, label: 'Question 4', type: 'beat' },
      ]
    })
  },

  // 17. High-Tech Unboxing ASMR
  'unboxing-hype': {
    id: 'unboxing-hype',
    name: 'Tech Unboxing Hype',
    description: 'Peeling plastic film ASMR, sharp macro close-ups, and sleek cyberpunk neon accents',
    niche: 'Tech / Apple / Gaming',
    category: 'business',
    recommendedDuration: 35,
    captionStyle: 'neon-glow',
    bRollKeywords: ['unboxing knife clean cut', 'peeling screen protector', 'gadget reflection black surface', 'cyberpunk keyboard rgb'],
    musicMood: 'hype',
    tags: ['asmr', 'tech', 'unboxing'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Package In Hand', type: 'hook' },
        { time: duration * 0.3, label: 'Peeling The Film', type: 'highlight' },
        { time: duration * 0.65, label: 'First Power On', type: 'beat' },
      ]
    })
  },

  // 18. Finance Wealth Rules
  'finance-wealth': {
    id: 'finance-wealth',
    name: 'The 3 Wealth Rules',
    description: 'Financial wisdom breakdown with compounding charts, currency stacks, and clear takeaways',
    niche: 'Finance / Investing / Crypto',
    category: 'business',
    recommendedDuration: 50,
    captionStyle: 'box-highlight',
    bRollKeywords: ['wall street stock chart green', 'gold bullion vault', 'counting bank notes', 'laptop trading desk'],
    musicMood: 'dramatic',
    tags: ['money', 'investing', 'wealth'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Rule #1 Never Lose', type: 'hook' },
        { time: duration * 0.35, label: 'Rule #2 Compounding', type: 'highlight' },
        { time: duration * 0.7, label: 'Rule #3 Asymmetric Upside', type: 'beat' },
      ]
    })
  },

  // 19. Kinetic Rap Lyric Flow
  'rap-lyric-flow': {
    id: 'rap-lyric-flow',
    name: 'Kinetic Rap Lyric Flow',
    description: 'Phrases popping on every 808 kick and hi-hat roll with camera shakes and color grades',
    niche: 'Music / Hip Hop / Phonk',
    category: 'viral',
    recommendedDuration: 30,
    captionStyle: 'bold-center',
    bRollKeywords: ['night city neon rain', 'fast car drifting smoke', 'retro boombox cassette', 'flashing concert lights'],
    musicMood: 'hype',
    tags: ['phonk', 'trap', 'lyrics'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Bass Drop Opening', type: 'hook' },
        { time: duration * 0.5, label: 'Fast Cadence Rhyme', type: 'beat' },
        { time: duration * 0.85, label: 'Outro Beat Fade', type: 'cta' },
      ]
    })
  },

  // 20. Cinematic Drone Travel Reel
  'travel-reel': {
    id: 'travel-reel',
    name: 'Cinematic Drone Travel Reel',
    description: 'Soaring aerial shots, lush coastal cliffs, warm sun flare leaks, and wanderlust quotes',
    niche: 'Travel / Adventure / Drone',
    category: 'lifestyle',
    recommendedDuration: 45,
    captionStyle: 'minimal-cinema',
    bRollKeywords: ['aerial drone tropical coast', 'turquoise ocean waves cliff', 'hiking mountain ridge sunset', 'ancient temples foggy jungle'],
    musicMood: 'lofi',
    tags: ['travel', 'drone', 'wanderlust'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Breathtaking Vista', type: 'hook' },
        { time: duration * 0.4, label: 'Hidden Secret Spot', type: 'highlight' },
        { time: duration * 0.8, label: 'Golden Hour Sunset', type: 'beat' },
      ]
    })
  },

  // 21. 10-Second Life Hack Reveal
  'life-hack': {
    id: 'life-hack',
    name: '10-Second Genius Lifehack',
    description: 'Immediate practical solve for everyday annoying friction with split-second demonstration',
    niche: 'Hacks / Productivity / DIY',
    category: 'education',
    recommendedDuration: 30,
    captionStyle: 'outline',
    bRollKeywords: ['frustrated person everyday problem', 'simple trick demonstration', 'effortless clean result', 'mindblown expression'],
    musicMood: 'upbeat',
    tags: ['lifehack', 'hack', 'diy'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Stop doing it the hard way', type: 'hook' },
        { time: duration * 0.35, label: 'Do this simple trick instead', type: 'highlight' },
        { time: duration * 0.8, label: 'Look at the time saved', type: 'beat' },
      ]
    })
  },

  // 22. Interactive Trivia Quiz Challenge
  'interactive-quiz': {
    id: 'interactive-quiz',
    name: 'Can You Guess This? 5s Quiz',
    description: 'Interactive countdown timer ticking with audio beat drops before the reveal',
    niche: 'Quiz / Trivia / Interactive',
    category: 'entertainment',
    recommendedDuration: 35,
    captionStyle: 'box-highlight',
    bRollKeywords: ['ticking clock second hand', 'interrogation spotlight room', 'curious person thinking', 'victory confetti celebrate'],
    musicMood: 'dramatic',
    tags: ['quiz', 'trivia', 'game'],
    buildDraftPlan: (_, __, duration) => ({
      duration,
      markers: [
        { time: 0, label: 'Question Hook: Only 5% get this right', type: 'hook' },
        { time: duration * 0.35, label: '3... 2... 1... Countdown', type: 'highlight' },
        { time: duration * 0.7, label: 'The Correct Answer', type: 'beat' },
      ]
    })
  }
};
