// Reelix Creator Streak & XP Gamification Engine

export interface GamificationState {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  unlockedThemes: string[];
  activeTheme: string;
  stats: {
    totalVideosExported: number;
    totalTemplatesUsed: number;
    totalAiCreations: number;
  };
}

const STORAGE_KEY = 'reelix_gamification_v1';

export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: 'Novice Creator', unlockTheme: 'capcut-dark' },
  { level: 2, xp: 100, title: 'Clip Master', unlockTheme: 'cyber-neon' },
  { level: 3, xp: 250, title: 'Beat Cutter', unlockTheme: 'midnight-gold' },
  { level: 4, xp: 500, title: 'VFX Wizard', unlockTheme: 'emerald-matrix' },
  { level: 5, xp: 850, title: 'Shorts Pro', unlockTheme: 'amethyst-noir' },
  { level: 6, xp: 1300, title: 'Viral Director', unlockTheme: 'sunset-crimson' },
  { level: 7, xp: 1900, title: 'Algorithm Hacker' },
  { level: 8, xp: 2700, title: 'Studio Sensei' },
  { level: 9, xp: 3800, title: 'Studio Titan' },
  { level: 10, xp: 5000, title: 'Reelix Legend' },
];

export const THEMES = [
  { id: 'capcut-dark', name: 'CapCut Dark', primary: 'from-violet-500 to-cyan-400', border: 'border-violet-500/30', minLevel: 1 },
  { id: 'cyber-neon', name: 'Cyber Neon', primary: 'from-cyan-400 to-fuchsia-500', border: 'border-cyan-500/30', minLevel: 2 },
  { id: 'midnight-gold', name: 'Midnight Gold', primary: 'from-amber-400 to-yellow-600', border: 'border-amber-500/30', minLevel: 3 },
  { id: 'emerald-matrix', name: 'Emerald Studio', primary: 'from-emerald-400 to-teal-500', border: 'border-emerald-500/30', minLevel: 4 },
  { id: 'amethyst-noir', name: 'Amethyst Noir', primary: 'from-purple-500 to-pink-600', border: 'border-purple-500/30', minLevel: 5 },
  { id: 'sunset-crimson', name: 'Sunset Crimson', primary: 'from-rose-500 to-orange-500', border: 'border-rose-500/30', minLevel: 6 },
];

export class GamificationService {
  static getState(): GamificationState {
    if (typeof window === 'undefined') {
      return this.defaultState();
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = this.defaultState();
      this.saveState(initial);
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return this.defaultState();
    }
  }

  private static defaultState(): GamificationState {
    const today = new Date().toISOString().slice(0, 10);
    return {
      xp: 0,
      level: 1,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: today,
      unlockedThemes: ['capcut-dark'],
      activeTheme: 'capcut-dark',
      stats: {
        totalVideosExported: 0,
        totalTemplatesUsed: 0,
        totalAiCreations: 0,
      },
    };
  }

  static saveState(state: GamificationState): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  static checkDailyStreak(): { streakMaintained: boolean; newStreak: number } {
    const state = this.getState();
    const today = new Date().toISOString().slice(0, 10);

    if (state.lastActiveDate === today) {
      return { streakMaintained: true, newStreak: state.currentStreak };
    }

    const last = new Date(state.lastActiveDate);
    const curr = new Date(today);
    const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 1) {
      state.currentStreak += 1;
      if (state.currentStreak > state.longestStreak) {
        state.longestStreak = state.currentStreak;
      }
      this.addXp(15); // Daily login streak bonus
    } else if (diffDays > 1) {
      state.currentStreak = 1;
    }

    state.lastActiveDate = today;
    this.saveState(state);
    return { streakMaintained: true, newStreak: state.currentStreak };
  }

  static addXp(amount: number): { newXp: number; leveledUp: boolean; newLevel: number } {
    const state = this.getState();
    const oldLevel = state.level;
    state.xp += amount;

    // Recalculate level
    let currentLvl = 1;
    for (const t of LEVEL_THRESHOLDS) {
      if (state.xp >= t.xp) {
        currentLvl = t.level;
        if (t.unlockTheme && !state.unlockedThemes.includes(t.unlockTheme)) {
          state.unlockedThemes.push(t.unlockTheme);
        }
      }
    }
    state.level = currentLvl;
    this.saveState(state);

    return {
      newXp: state.xp,
      leveledUp: currentLvl > oldLevel,
      newLevel: currentLvl,
    };
  }

  static recordAction(action: 'export_video' | 'use_template' | 'create_ai_item'): void {
    const state = this.getState();
    if (action === 'export_video') {
      state.stats.totalVideosExported += 1;
      this.addXp(50);
    } else if (action === 'use_template') {
      state.stats.totalTemplatesUsed += 1;
      this.addXp(20);
    } else if (action === 'create_ai_item') {
      state.stats.totalAiCreations += 1;
      this.addXp(30);
    }
    this.saveState(state);
  }

  static setActiveTheme(themeId: string): boolean {
    const state = this.getState();
    if (state.unlockedThemes.includes(themeId)) {
      state.activeTheme = themeId;
      this.saveState(state);
      return true;
    }
    return false;
  }
}
