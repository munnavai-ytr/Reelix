// 22+ Google Fonts Catalog (Latin & Bangla / Bengali)

export interface FontDefinition {
  id: string;
  family: string;
  name: string;
  category: 'sans-serif' | 'serif' | 'display' | 'bangla' | 'mono';
  googleFontName: string;
  weights: string[];
  sampleText: string;
}

export const BUILT_IN_FONTS: Record<string, FontDefinition> = {
  // --- English / Latin Display & Sans ---
  inter: {
    id: 'inter',
    family: 'Inter, sans-serif',
    name: 'Inter',
    category: 'sans-serif',
    googleFontName: 'Inter:wght@400;700;900',
    weights: ['400', '700', '900'],
    sampleText: 'Viral Vertical Shorts'
  },
  'plus-jakarta-sans': {
    id: 'plus-jakarta-sans',
    family: '"Plus Jakarta Sans", sans-serif',
    name: 'Plus Jakarta Sans',
    category: 'sans-serif',
    googleFontName: 'Plus+Jakarta+Sans:wght@500;700;800',
    weights: ['500', '700', '800'],
    sampleText: 'Modern Tech Aesthetic'
  },
  outfit: {
    id: 'outfit',
    family: 'Outfit, sans-serif',
    name: 'Outfit',
    category: 'sans-serif',
    googleFontName: 'Outfit:wght@600;800;900',
    weights: ['600', '800', '900'],
    sampleText: 'High Energy Reels'
  },
  oswald: {
    id: 'oswald',
    family: 'Oswald, sans-serif',
    name: 'Oswald Condensed',
    category: 'display',
    googleFontName: 'Oswald:wght@600;700',
    weights: ['600', '700'],
    sampleText: 'IMPACT HEADLINE'
  },
  'bricolage-grotesque': {
    id: 'bricolage-grotesque',
    family: '"Bricolage Grotesque", sans-serif',
    name: 'Bricolage Grotesque',
    category: 'display',
    googleFontName: 'Bricolage+Grotesque:wght@700;800',
    weights: ['700', '800'],
    sampleText: 'Character & Punch'
  },
  'playfair-display': {
    id: 'playfair-display',
    family: '"Playfair Display", serif',
    name: 'Playfair Display',
    category: 'serif',
    googleFontName: 'Playfair+Display:ital,wght@0,700;1,700',
    weights: ['700', '900'],
    sampleText: 'Luxury & Wisdom'
  },
  cinzel: {
    id: 'cinzel',
    family: 'Cinzel, serif',
    name: 'Cinzel Classical',
    category: 'serif',
    googleFontName: 'Cinzel:wght@700;900',
    weights: ['700', '900'],
    sampleText: 'ANCIENT MYSTERY'
  },
  urbanist: {
    id: 'urbanist',
    family: 'Urbanist, sans-serif',
    name: 'Urbanist Geometric',
    category: 'sans-serif',
    googleFontName: 'Urbanist:wght@700;900',
    weights: ['700', '900'],
    sampleText: 'Futuristic Vision'
  },
  manrope: {
    id: 'manrope',
    family: 'Manrope, sans-serif',
    name: 'Manrope',
    category: 'sans-serif',
    googleFontName: 'Manrope:wght@600;800',
    weights: ['600', '800'],
    sampleText: 'Clean Corporate Hook'
  },
  'dm-sans': {
    id: 'dm-sans',
    family: '"DM Sans", sans-serif',
    name: 'DM Sans',
    category: 'sans-serif',
    googleFontName: 'DM+Sans:wght@700;900',
    weights: ['700', '900'],
    sampleText: 'Startup High Growth'
  },
  'archivo-black': {
    id: 'archivo-black',
    family: '"Archivo Black", sans-serif',
    name: 'Archivo Black',
    category: 'display',
    googleFontName: 'Archivo+Black',
    weights: ['900'],
    sampleText: 'SUPER SLAM'
  },
  anton: {
    id: 'anton',
    family: 'Anton, sans-serif',
    name: 'Anton Heavy',
    category: 'display',
    googleFontName: 'Anton',
    weights: ['900'],
    sampleText: 'STOP SCROLLING'
  },
  'space-grotesk': {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    family: '"Space Grotesk", sans-serif',
    category: 'display',
    googleFontName: 'Space+Grotesk:wght@700',
    weights: ['700'],
    sampleText: 'CYBER TECHNOLOGY'
  },
  syne: {
    id: 'syne',
    name: 'Syne Avant-Garde',
    family: 'Syne, sans-serif',
    category: 'display',
    googleFontName: 'Syne:wght@800',
    weights: ['800'],
    sampleText: 'Artistic Vanguard'
  },
  righteous: {
    id: 'righteous',
    name: 'Righteous Retro',
    family: 'Righteous, sans-serif',
    category: 'display',
    googleFontName: 'Righteous',
    weights: ['400'],
    sampleText: '80s Synthwave Wave'
  },

  // --- Bangla / Bengali Fonts ---
  'noto-sans-bengali': {
    id: 'noto-sans-bengali',
    name: 'Noto Sans Bengali',
    family: '"Noto Sans Bengali", sans-serif',
    category: 'bangla',
    googleFontName: 'Noto+Sans+Bengali:wght@600;800',
    weights: ['600', '800'],
    sampleText: 'ভাইরাল ভিডিও তৈরি করুন'
  },
  'hind-siliguri': {
    id: 'hind-siliguri',
    name: 'Hind Siliguri',
    family: '"Hind Siliguri", sans-serif',
    category: 'bangla',
    googleFontName: 'Hind+Siliguri:wght@600;700',
    weights: ['600', '700'],
    sampleText: 'সহজেই বাংলা শর্টস বানান'
  },
  'tiro-bangla': {
    id: 'tiro-bangla',
    name: 'Tiro Bangla Classical',
    family: '"Tiro Bangla", serif',
    category: 'bangla',
    googleFontName: 'Tiro+Bangla',
    weights: ['400'],
    sampleText: 'ঐতিহাসিক ও জ্ঞানগর্ভ গল্প'
  },
  galada: {
    id: 'galada',
    name: 'Galada Cursive Bangla',
    family: 'Galada, cursive',
    category: 'bangla',
    googleFontName: 'Galada',
    weights: ['400'],
    sampleText: 'সুন্দর বাংলা ক্যালিগ্রাফি'
  },
  mina: {
    id: 'mina',
    name: 'Mina Clean Bangla',
    family: 'Mina, sans-serif',
    category: 'bangla',
    googleFontName: 'Mina:wght@700',
    weights: ['700'],
    sampleText: 'আধুনিক বাংলা ক্যাপশন'
  },
  atma: {
    id: 'atma',
    name: 'Atma Playful Bangla',
    family: 'Atma, display',
    category: 'bangla',
    googleFontName: 'Atma:wght@700',
    weights: ['700'],
    sampleText: 'মজার মজার তথ্য ও কৌতুক'
  },
  shrikhand: {
    id: 'shrikhand',
    name: 'Shrikhand Bold Headline',
    family: 'Shrikhand, cursive',
    category: 'display',
    googleFontName: 'Shrikhand',
    weights: ['400'],
    sampleText: 'HIGH IMPACT BURST'
  }
};
