// Freesound & Jamendo API integration for real sound effects and background music
import { UnifiedHttpClient } from '@/ai/http';
import { ApiKeysService } from '@/storage/keys';

export interface SoundSearchResult {
  id: string;
  name: string;
  category: 'sfx' | 'music';
  duration: number;
  previewUrl: string;
  tags: string[];
  author: string;
  license: string;
  source: 'freesound' | 'jamendo';
}

export class SoundApisService {
  /**
   * Search Freesound API for SFX
   */
  static async searchFreesound(query: string, cc0Only: boolean = true): Promise<SoundSearchResult[]> {
    const keys = ApiKeysService.getKeys();
    if (!keys.freesound) {
      throw new Error('Freesound API key is not configured in Settings.');
    }

    let url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&token=${keys.freesound}&fields=id,name,tags,description,previews,duration,license,username&page_size=15`;
    if (cc0Only) {
      url += `&filter=license:"Creative Commons 0"`;
    }

    const res = await UnifiedHttpClient.get(url);
    if (!res.ok) {
      throw new Error(`Freesound API returned ${res.status}: ${res.statusText}`);
    }

    const data: any = await res.json();
    const results: SoundSearchResult[] = [];

    if (data && data.results && Array.isArray(data.results)) {
      for (const item of data.results) {
        const previewUrl = item.previews?.['preview-hq-mp3'] || item.previews?.['preview-lq-mp3'];
        if (previewUrl) {
          results.push({
            id: `freesound_${item.id}`,
            name: item.name,
            category: 'sfx',
            duration: Math.round((item.duration || 1) * 10) / 10,
            previewUrl,
            tags: item.tags || [],
            author: item.username || 'Freesound Creator',
            license: item.license ? item.license.split('/').slice(-2, -1)[0] || 'CC' : 'CC0',
            source: 'freesound',
          });
        }
      }
    }

    return results;
  }

  /**
   * Search Jamendo API for background music
   */
  static async searchJamendo(query: string, tag?: string): Promise<SoundSearchResult[]> {
    const keys = ApiKeysService.getKeys();
    if (!keys.jamendo) {
      throw new Error('Jamendo Client ID is not configured in Settings.');
    }

    let url = `https://api.jamendo.com/v3.0/tracks/?client_id=${keys.jamendo}&format=jsonpretty&limit=15&audioformat=mp32`;
    if (query) {
      url += `&namesearch=${encodeURIComponent(query)}`;
    }
    if (tag) {
      url += `&tags=${encodeURIComponent(tag)}`;
    }

    const res = await UnifiedHttpClient.get(url);
    if (!res.ok) {
      throw new Error(`Jamendo API returned ${res.status}: ${res.statusText}`);
    }

    const data: any = await res.json();
    const results: SoundSearchResult[] = [];

    if (data.results && Array.isArray(data.results)) {
      for (const track of data.results) {
        if (track.audio) {
          results.push({
            id: `jamendo_${track.id}`,
            name: track.name,
            category: 'music',
            duration: track.duration || 120,
            previewUrl: track.audio,
            tags: (track.musicinfo?.tags?.genres || []).concat(track.musicinfo?.tags?.vartags || []),
            author: track.artist_name || 'Jamendo Artist',
            license: track.license_ccurl ? 'Creative Commons' : 'Jamendo Free',
            source: 'jamendo',
          });
        }
      }
    }

    return results;
  }
}
