// Reelix Edit Style Presets
// Built from the existing Registry. Selecting a preset fills instruction chips, caption style, pacing, and music mood.
// The user's own description always has priority.

export interface EditStylePreset {
  id: string;
  name: string;
  nameBn: string;
  badge: string;
  description: string;
  descriptionBn: string;
  niche: string;
  pacing: string;
  captionStyle: string;
  musicMood: 'hype' | 'upbeat' | 'lofi' | 'dramatic';
  chips: string[];
  suggestedPrompt: string;
}

export const EDIT_STYLE_PRESETS: EditStylePreset[] = [
  {
    id: 'viral-hype',
    name: 'Viral Hype',
    nameBn: 'ভাইরাল হাইপ',
    badge: 'TikTok / Shorts',
    description: 'High energy, fast zoom punch-ins on keywords, bold karaoke highlights, and explosive pacing.',
    descriptionBn: 'উচ্চ এনার্জি, কি-ওয়ার্ডে দ্রুত জুম পাঞ্চ, বোল্ড কারাওকে ক্যাপশন ও দ্রুত কাট।',
    niche: 'Viral / Entertainment',
    pacing: 'Viral High Energy',
    captionStyle: 'karaoke-word-highlight',
    musicMood: 'hype',
    chips: ['Fast cuts', 'Zoom punches', 'SFX whoosh', 'Word highlights', 'Punchy pacing'],
    suggestedPrompt: 'Match fast cuts strictly to spoken beats, punch in 1.15x scale on emphasis words, bold karaoke yellow highlights, dynamic cut whooshes.',
  },
  {
    id: 'calm-cinematic',
    name: 'Calm Cinematic',
    nameBn: 'শান্ত সিনেমাটিক',
    badge: 'Atmospheric',
    description: 'Slow graceful pans, soft filmic glow, clean centered typography, and ambient lofi soundtrack.',
    descriptionBn: 'ধীরগতির প্যান, সফ্ট সিনেমাটিক গ্লো, মার্জিত ক্যাপশন এবং অ্যাম্বিয়েন্ট ব্যাকগ্রাউন্ড।',
    niche: 'Storytelling / Philosophy',
    pacing: 'Calm Narrative',
    captionStyle: 'cinematic-glow',
    musicMood: 'lofi',
    chips: ['Slow smooth cuts', 'Filmic glow', 'Subtle pan', 'Ambient mood', 'Minimal text'],
    suggestedPrompt: 'Cinematic pacing with smooth dissolves, soft glow on key visuals, subtle camera drift, elegant modern captions.',
  },
  {
    id: 'clean-explainer',
    name: 'Clean Explainer',
    nameBn: 'সহজ এক্সপ্লেইনার',
    badge: 'Educational',
    description: 'Structured clarity, boxed text callouts, rhythmically timed b-roll, and upbeat background music.',
    descriptionBn: 'স্পষ্ট ও গোছানো উপস্থাপনা, বক্সড টেক্সট কলআউট, সামঞ্জস্যপূর্ণ বি-রোল ও আপবিট মিউজিক।',
    niche: 'Tech / AI / Business',
    pacing: 'Balanced Informative',
    captionStyle: 'box-highlight',
    musicMood: 'upbeat',
    chips: ['Clear sectioning', 'Box highlights', 'B-roll matching', 'Upbeat track', 'Clean typography'],
    suggestedPrompt: 'Structured educational edit with high readability, boxed highlighted keywords, crisp cuts matching topic changes.',
  },
  {
    id: 'news-flash',
    name: 'News Flash',
    nameBn: 'নিউজ ফ্ল্যাশ',
    badge: 'Breaking News',
    description: 'Urgent headline hooks, lower-third style framing, dramatic pauses, and driving soundtrack.',
    descriptionBn: 'জরুরি হেডলাইন হুক, নাটকীয় পজ, নিচ দিয়ে ক্যাপশন এবং উত্তেজনাপূর্ণ মিউজিক।',
    niche: 'News / Current Events',
    pacing: 'Urgent Dramatic',
    captionStyle: 'neon-pulse',
    musicMood: 'dramatic',
    chips: ['Breaking hook', 'Urgent cuts', 'Dramatic riser', 'Bold headline', 'Lower third'],
    suggestedPrompt: 'High-urgency breaking news feel: immediate 2s attention hook, rapid scene switches, dramatic impact audio at revelations.',
  },
];
