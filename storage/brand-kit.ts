// Reelix Brand Kit & Watermark Settings

export interface BrandKitSettings {
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkLogoDataUrl?: string;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkOpacity: number;
  primaryColor: string;
  defaultFontFamily: string;
}

const STORAGE_KEY = 'reelix_brand_kit_v1';

const DEFAULT_BRAND_KIT: BrandKitSettings = {
  watermarkEnabled: false,
  watermarkText: 'Reelix AI',
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 0.85,
  primaryColor: '#8B5CF6',
  defaultFontFamily: 'Inter, sans-serif',
};

export class BrandKitService {
  static getSettings(): BrandKitSettings {
    if (typeof window === 'undefined') return DEFAULT_BRAND_KIT;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRAND_KIT;
    try {
      return { ...DEFAULT_BRAND_KIT, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_BRAND_KIT;
    }
  }

  static saveSettings(settings: BrandKitSettings): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
}
