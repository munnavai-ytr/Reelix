// 32+ Real Built-in SVG Stickers and Graphic Shapes

export interface StickerDefinition {
  id: string;
  name: string;
  category: 'social' | 'badge' | 'shapes' | 'arrows' | 'icons' | 'emojis';
  tags: string[];
  svg: string; // Valid raw SVG markup
  defaultWidth: number;
  defaultHeight: number;
}

export const BUILT_IN_STICKERS: Record<string, StickerDefinition> = {
  // 1. YouTube Subscribe Pill
  'subscribe-pill': {
    id: 'subscribe-pill',
    name: 'Subscribe Button',
    category: 'social',
    tags: ['youtube', 'subscribe', 'callout'],
    defaultWidth: 260,
    defaultHeight: 70,
    svg: `<svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="260" height="70" rx="35" fill="#EF4444"/>
      <path d="M42 25L58 35L42 45V25Z" fill="white"/>
      <text x="75" y="43" fill="white" font-family="Inter, sans-serif" font-weight="900" font-size="22" letter-spacing="1">SUBSCRIBE</text>
    </svg>`
  },

  // 2. Bell Notification
  'bell-alert': {
    id: 'bell-alert',
    name: 'Bell Notification',
    category: 'social',
    tags: ['bell', 'alert', 'notify'],
    defaultWidth: 100,
    defaultHeight: 100,
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 15C36 15 30 28 30 46V60L20 70H80L70 60V46C70 28 64 15 50 15Z" fill="#FBBF24" stroke="#D97706" stroke-width="4"/>
      <path d="M42 75C42 79.4 45.6 83 50 83C54.4 83 58 79.4 58 75" stroke="#D97706" stroke-width="5" stroke-linecap="round"/>
      <circle cx="72" cy="28" r="8" fill="#EF4444"/>
    </svg>`
  },

  // 3. Viral Fire Flame
  'viral-fire': {
    id: 'viral-fire',
    name: 'Viral Flame',
    category: 'icons',
    tags: ['fire', 'hot', 'viral'],
    defaultWidth: 100,
    defaultHeight: 110,
    svg: `<svg viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 5C50 5 68 28 68 50C68 56 65 62 62 66C62 50 52 40 52 40C52 40 50 65 38 72C35 68 34 62 34 56C25 66 22 78 26 90C31 104 46 110 58 108C75 106 86 92 86 75C86 45 68 25 50 5Z" fill="url(#fireGrad)"/>
      <defs>
        <linearGradient id="fireGrad" x1="50" y1="5" x2="50" y2="108" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FBBF24"/>
          <stop offset="0.5" stop-color="#F97316"/>
          <stop offset="1" stop-color="#DC2626"/>
        </linearGradient>
      </defs>
    </svg>`
  },

  // 4. Heart Like
  'heart-like': {
    id: 'heart-like',
    name: 'Neon Heart Like',
    category: 'social',
    tags: ['heart', 'love', 'like'],
    defaultWidth: 100,
    defaultHeight: 90,
    svg: `<svg viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 82L44 76.5C18 53 0 37 0 24C0 10.5 10.5 0 24 0C32.5 0 42 5 50 14C58 5 67.5 0 76 0C89.5 0 100 10.5 100 24C100 37 82 53 56 76.5L50 82Z" fill="#EC4899" stroke="#DB2777" stroke-width="4"/>
    </svg>`
  },

  // 5. Verified Check Badge
  'verified-badge': {
    id: 'verified-badge',
    name: 'Verified Badge',
    category: 'badge',
    tags: ['verified', 'check', 'blue'],
    defaultWidth: 90,
    defaultHeight: 90,
    svg: `<svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M45 0L54 9L67 8L71 20L82 25L81 38L89 47L83 58L86 71L74 74L68 85L55 83L45 90L35 83L22 85L16 74L4 71L7 58L1 47L9 38L8 25L19 20L23 8L36 9L45 0Z" fill="#0EA5E9"/>
      <path d="M28 46L40 58L64 34" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  },

  // 6. Trending Arrow Up
  'trending-up': {
    id: 'trending-up',
    name: 'Trending Green Arrow',
    category: 'arrows',
    tags: ['trend', 'growth', 'stocks'],
    defaultWidth: 120,
    defaultHeight: 80,
    svg: `<svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 65L45 30L70 55L110 15" stroke="#10B981" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M75 15H110V50" stroke="#10B981" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  },

  // 7. Warning Alert Triangle
  'warning-alert': {
    id: 'warning-alert',
    name: 'Hazard Warning',
    category: 'icons',
    tags: ['warning', 'alert', 'danger'],
    defaultWidth: 100,
    defaultHeight: 90,
    svg: `<svg viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 5L95 85H5L50 5Z" fill="#FBBF24" stroke="#000000" stroke-width="6" stroke-linejoin="round"/>
      <path d="M50 35V55" stroke="#000000" stroke-width="8" stroke-linecap="round"/>
      <circle cx="50" cy="70" r="4.5" fill="#000000"/>
    </svg>`
  },

  // 8. Question Mark Bubble
  'question-bubble': {
    id: 'question-bubble',
    name: 'Question Mark Tag',
    category: 'icons',
    tags: ['question', 'mystery', 'curious'],
    defaultWidth: 90,
    defaultHeight: 90,
    svg: `<svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="45" cy="45" r="42" fill="#8B5CF6" stroke="white" stroke-width="4"/>
      <text x="45" y="62" fill="white" font-family="Inter, sans-serif" font-weight="900" font-size="54" text-anchor="middle">?</text>
    </svg>`
  },

  // 9. 100 Points Score
  '100-percent': {
    id: '100-percent',
    name: '100 Percent Score',
    category: 'badge',
    tags: ['100', 'score', 'perfect'],
    defaultWidth: 120,
    defaultHeight: 70,
    svg: `<svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="60" y="50" fill="#EF4444" font-family="Impact, sans-serif" font-size="56" font-weight="900" text-anchor="middle" letter-spacing="-2">100</text>
      <path d="M15 62H105" stroke="#EF4444" stroke-width="6" stroke-linecap="round"/>
      <path d="M15 68H105" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/>
    </svg>`
  },

  // 10. Soundwave Bars
  'soundwave-bars': {
    id: 'soundwave-bars',
    name: 'Soundwave Audio Bars',
    category: 'icons',
    tags: ['audio', 'music', 'soundwave'],
    defaultWidth: 140,
    defaultHeight: 60,
    svg: `<svg viewBox="0 0 140 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="8" height="20" rx="4" fill="#06B6D4"/>
      <rect x="26" y="10" width="8" height="40" rx="4" fill="#06B6D4"/>
      <rect x="42" y="5" width="8" height="50" rx="4" fill="#8B5CF6"/>
      <rect x="58" y="15" width="8" height="30" rx="4" fill="#8B5CF6"/>
      <rect x="74" y="0" width="8" height="60" rx="4" fill="#A855F7"/>
      <rect x="90" y="12" width="8" height="36" rx="4" fill="#8B5CF6"/>
      <rect x="106" y="22" width="8" height="16" rx="4" fill="#06B6D4"/>
      <rect x="122" y="18" width="8" height="24" rx="4" fill="#06B6D4"/>
    </svg>`
  },

  // 11. Countdown Timer Ring
  'countdown-ring': {
    id: 'countdown-ring',
    name: 'Countdown 3s Ring',
    category: 'badge',
    tags: ['countdown', 'timer', 'clock'],
    defaultWidth: 100,
    defaultHeight: 100,
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.2)" stroke-width="8"/>
      <circle cx="50" cy="50" r="42" stroke="#EF4444" stroke-width="8" stroke-dasharray="264" stroke-dashoffset="66" stroke-linecap="round"/>
      <text x="50" y="62" fill="white" font-family="Inter, sans-serif" font-weight="900" font-size="38" text-anchor="middle">3</text>
    </svg>`
  },

  // 12. Lightning Bolt
  'lightning-bolt': {
    id: 'lightning-bolt',
    name: 'Electric Lightning Bolt',
    category: 'icons',
    tags: ['electric', 'bolt', 'power'],
    defaultWidth: 70,
    defaultHeight: 110,
    svg: `<svg viewBox="0 0 70 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M42 0L0 65H32L24 110L70 42H36L42 0Z" fill="#FBBF24" stroke="#D97706" stroke-width="3"/>
    </svg>`
  },

  // 13. Money Dollar Bag
  'money-bag': {
    id: 'money-bag',
    name: 'Wealth Money Bag',
    category: 'icons',
    tags: ['money', 'wealth', 'rich'],
    defaultWidth: 90,
    defaultHeight: 100,
    svg: `<svg viewBox="0 0 90 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M45 20C32 20 28 28 28 35C15 42 10 65 10 78C10 92 24 98 45 98C66 98 80 92 80 78C80 65 75 42 62 35C62 28 58 20 45 20Z" fill="#10B981" stroke="#047857" stroke-width="4"/>
      <path d="M28 35H62" stroke="#FBBF24" stroke-width="6" stroke-linecap="round"/>
      <text x="45" y="74" fill="white" font-family="Inter, sans-serif" font-weight="900" font-size="36" text-anchor="middle">$</text>
    </svg>`
  },

  // 14. Target Bullseye Reticle
  'target-reticle': {
    id: 'target-reticle',
    name: 'Target Focus Reticle',
    category: 'icons',
    tags: ['target', 'focus', 'sniper'],
    defaultWidth: 100,
    defaultHeight: 100,
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="42" stroke="#EF4444" stroke-width="6"/>
      <circle cx="50" cy="50" r="24" stroke="#EF4444" stroke-width="4"/>
      <circle cx="50" cy="50" r="6" fill="#EF4444"/>
      <path d="M50 0V20M50 80V100M0 50H20M80 50H100" stroke="#EF4444" stroke-width="5" stroke-linecap="round"/>
    </svg>`
  },

  // 15. Tap Finger Pointer
  'tap-finger': {
    id: 'tap-finger',
    name: 'Tap Finger Touch',
    category: 'arrows',
    tags: ['tap', 'finger', 'touch'],
    defaultWidth: 90,
    defaultHeight: 100,
    svg: `<svg viewBox="0 0 90 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="45" cy="20" r="14" stroke="#38BDF8" stroke-width="3" stroke-dasharray="4 4"/>
      <path d="M45 25V55L55 58L70 65V88H32L24 68L36 60V25C36 20 45 20 45 25Z" fill="#FFFFFF" stroke="#000000" stroke-width="4" stroke-linejoin="round"/>
    </svg>`
  },

  // 16. Swipe Up Arrow
  'swipe-up': {
    id: 'swipe-up',
    name: 'Swipe Up Chevrons',
    category: 'arrows',
    tags: ['swipe', 'up', 'instagram'],
    defaultWidth: 80,
    defaultHeight: 90,
    svg: `<svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 45L40 20L65 45" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 65L40 40L65 65" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
    </svg>`
  },

  // 17. Gold Trophy Award
  'trophy-award': {
    id: 'trophy-award',
    name: 'Winner Gold Trophy',
    category: 'badge',
    tags: ['trophy', 'winner', 'award'],
    defaultWidth: 90,
    defaultHeight: 100,
    svg: `<svg viewBox="0 0 90 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 15H68V45C68 58 58 68 45 68C32 68 22 58 22 45V15Z" fill="#FBBF24" stroke="#D97706" stroke-width="4"/>
      <path d="M22 25H10C10 40 22 42 22 42" stroke="#D97706" stroke-width="4" stroke-linecap="round"/>
      <path d="M68 25H80C80 40 68 42 68 42" stroke="#D97706" stroke-width="4" stroke-linecap="round"/>
      <path d="M45 68V82M30 85H60" stroke="#D97706" stroke-width="6" stroke-linecap="round"/>
    </svg>`
  },

  // 18. Neon Musical Eighth Notes
  'music-notes': {
    id: 'music-notes',
    name: 'Neon Musical Notes',
    category: 'icons',
    tags: ['music', 'notes', 'sound'],
    defaultWidth: 90,
    defaultHeight: 90,
    svg: `<svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 65C30 72 24 76 18 76C11 76 6 71 6 65C6 58 12 54 18 54C22 54 26 56 28 58V20L75 10V52C75 58 69 63 62 63C56 63 50 58 50 52C50 45 56 41 62 41C66 41 71 43 73 45V18L30 28V65Z" fill="#8B5CF6" stroke="#C084FC" stroke-width="3"/>
    </svg>`
  },

  // 19. Comic Quote Mark
  'quotation-mark': {
    id: 'quotation-mark',
    name: 'Bold Quotation Marks',
    category: 'shapes',
    tags: ['quote', 'statement', 'speech'],
    defaultWidth: 90,
    defaultHeight: 80,
    svg: `<svg viewBox="0 0 90 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 40C12 24 22 10 38 4L42 12C32 16 26 24 26 34H42V74H12V40ZM56 40C56 24 66 10 82 4L86 12C76 16 70 24 70 34H86V74H56V40Z" fill="#FBBF24"/>
    </svg>`
  },

  // 20. Discount Sale Tag
  'sale-tag': {
    id: 'sale-tag',
    name: 'Hot Sale Tag',
    category: 'badge',
    tags: ['sale', 'discount', 'deal'],
    defaultWidth: 110,
    defaultHeight: 65,
    svg: `<svg viewBox="0 0 110 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 32.5L25 5H95C103 5 110 12 110 20V45C110 53 103 60 95 60H25L0 32.5Z" fill="#EF4444"/>
      <circle cx="28" cy="32.5" r="5" fill="white"/>
      <text x="65" y="42" fill="white" font-family="Inter, sans-serif" font-weight="900" font-size="24" text-anchor="middle">SALE</text>
    </svg>`
  },

  // 21. Clean Rounded Rectangle
  'shape-rect': {
    id: 'shape-rect',
    name: 'Rounded Rectangle',
    category: 'shapes',
    tags: ['rect', 'card', 'box'],
    defaultWidth: 200,
    defaultHeight: 120,
    svg: `<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="120" rx="20" fill="#141420" stroke="#8B5CF6" stroke-width="4"/>
    </svg>`
  },

  // 22. Starburst Seal
  'star-burst': {
    id: 'star-burst',
    name: '12-Point Starburst',
    category: 'shapes',
    tags: ['star', 'seal', 'burst'],
    defaultWidth: 100,
    defaultHeight: 100,
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 0L62 25L90 15L82 42L100 60L75 70L78 98L50 85L22 98L25 70L0 60L18 42L10 15L38 25L50 0Z" fill="#FBBF24"/>
    </svg>`
  },

  // 23. Hexagon Shield
  'hexagon-shield': {
    id: 'hexagon-shield',
    name: 'Hexagon Cyber Shield',
    category: 'shapes',
    tags: ['shield', 'hexagon', 'cyber'],
    defaultWidth: 100,
    defaultHeight: 110,
    svg: `<svg viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 5L95 30V80L50 105L5 80V30L50 5Z" fill="rgba(14,165,233,0.2)" stroke="#0EA5E9" stroke-width="5"/>
    </svg>`
  },

  // 24. Diamond Marker
  'diamond-marker': {
    id: 'diamond-marker',
    name: 'Neon Diamond',
    category: 'shapes',
    tags: ['diamond', 'rhombus'],
    defaultWidth: 90,
    defaultHeight: 90,
    svg: `<svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="45" y="5" width="55" height="55" transform="rotate(45 45 5)" fill="#A855F7" stroke="white" stroke-width="4"/>
    </svg>`
  },

  // 25. Search Magnifying Glass
  'search-glass': {
    id: 'search-glass',
    name: 'Search Magnifier',
    category: 'icons',
    tags: ['search', 'inspect', 'find'],
    defaultWidth: 90,
    defaultHeight: 90,
    svg: `<svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="38" cy="38" r="26" stroke="#38BDF8" stroke-width="8"/>
      <path d="M58 58L82 82" stroke="#38BDF8" stroke-width="10" stroke-linecap="round"/>
    </svg>`
  },

  // 26. Eye Reveal
  'eye-reveal': {
    id: 'eye-reveal',
    name: 'Eye Look Icon',
    category: 'icons',
    tags: ['eye', 'watch', 'look'],
    defaultWidth: 100,
    defaultHeight: 70,
    svg: `<svg viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 35C15 10 35 0 50 0C65 0 85 10 100 35C85 60 65 70 50 70C35 70 15 60 0 35Z" fill="white" stroke="#000" stroke-width="4"/>
      <circle cx="50" cy="35" r="18" fill="#8B5CF6"/>
      <circle cx="50" cy="35" r="8" fill="#0B0B0F"/>
    </svg>`
  },

  // 27. Hashtag Symbol
  'hashtag-symbol': {
    id: 'hashtag-symbol',
    name: 'Neon Hashtag',
    category: 'social',
    tags: ['hashtag', 'tag', 'trending'],
    defaultWidth: 80,
    defaultHeight: 80,
    svg: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M25 10L15 70M65 10L55 70M5 28H75M5 52H75" stroke="#EC4899" stroke-width="8" stroke-linecap="round"/>
    </svg>`
  },

  // 28. Curved Arrow Pointer
  'curved-arrow': {
    id: 'curved-arrow',
    name: 'Curved Doodle Arrow',
    category: 'arrows',
    tags: ['arrow', 'pointer', 'doodle'],
    defaultWidth: 100,
    defaultHeight: 80,
    svg: `<svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 65C30 15 70 15 85 45" stroke="#FBBF24" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M70 48L85 45L88 30" stroke="#FBBF24" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  },

  // 29. Circle Stamp
  'circle-stamp': {
    id: 'circle-stamp',
    name: 'Top Secret Stamp',
    category: 'badge',
    tags: ['stamp', 'secret', 'classified'],
    defaultWidth: 110,
    defaultHeight: 110,
    svg: `<svg viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="55" cy="55" r="48" stroke="#EF4444" stroke-width="6" stroke-dasharray="10 6"/>
      <text x="55" y="62" fill="#EF4444" font-family="Inter, sans-serif" font-weight="900" font-size="16" text-anchor="middle" letter-spacing="2">TOP SECRET</text>
    </svg>`
  },

  // 30. Glowing Play Button
  'play-button-glow': {
    id: 'play-button-glow',
    name: 'Glowing Play Badge',
    category: 'social',
    tags: ['play', 'video', 'watch'],
    defaultWidth: 90,
    defaultHeight: 90,
    svg: `<svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="45" cy="45" r="40" fill="url(#playGrad)" stroke="white" stroke-width="3"/>
      <path d="M36 28L62 45L36 62V28Z" fill="white"/>
      <defs>
        <linearGradient id="playGrad" x1="0" y1="0" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop stop-color="#8B5CF6"/>
          <stop offset="1" stop-color="#06B6D4"/>
        </linearGradient>
      </defs>
    </svg>`
  },

  // 31. Red Record Dot
  'rec-dot': {
    id: 'rec-dot',
    name: 'REC Recording Indicator',
    category: 'badge',
    tags: ['rec', 'camera', 'live'],
    defaultWidth: 110,
    defaultHeight: 45,
    svg: `<svg viewBox="0 0 110 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="110" height="45" rx="12" fill="rgba(0,0,0,0.7)"/>
      <circle cx="22" cy="22.5" r="8" fill="#EF4444"/>
      <text x="42" y="30" fill="white" font-family="Inter, sans-serif" font-weight="900" font-size="18">REC</text>
    </svg>`
  },

  // 32. 5-Star Rating
  'five-stars': {
    id: 'five-stars',
    name: '5 Star Gold Review',
    category: 'badge',
    tags: ['stars', 'rating', 'review'],
    defaultWidth: 160,
    defaultHeight: 35,
    svg: `<svg viewBox="0 0 160 35" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g fill="#FBBF24">
        <polygon points="16,2 21,12 32,13 24,21 26,32 16,26 6,32 8,21 0,13 11,12"/>
        <polygon points="48,2 53,12 64,13 56,21 58,32 48,26 38,32 40,21 32,13 43,12"/>
        <polygon points="80,2 85,12 96,13 88,21 90,32 80,26 70,32 72,21 64,13 75,12"/>
        <polygon points="112,2 117,12 128,13 120,21 122,32 112,26 102,32 104,21 96,13 107,12"/>
        <polygon points="144,2 149,12 160,13 152,21 154,32 144,26 134,32 136,21 128,13 139,12"/>
      </g>
    </svg>`
  }
};
