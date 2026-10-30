// Haptic feedback utility supporting Capacitor Haptics and navigator.vibrate

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') {
  if (typeof window === 'undefined') return;

  try {
    // Check for Capacitor Haptics plugin
    const capacitor = (window as unknown as { Capacitor?: { Plugins?: { Haptics?: { impact: (opts: { style: string }) => Promise<void>; notification: (opts: { type: string }) => Promise<void> } } } })?.Capacitor;
    
    if (capacitor?.Plugins?.Haptics) {
      if (type === 'success' || type === 'warning' || type === 'error') {
        const notifType = type === 'success' ? 'SUCCESS' : type === 'warning' ? 'WARNING' : 'ERROR';
        capacitor.Plugins.Haptics.notification({ type: notifType }).catch(() => {});
      } else {
        const style = type === 'heavy' ? 'HEAVY' : type === 'medium' ? 'MEDIUM' : 'LIGHT';
        capacitor.Plugins.Haptics.impact({ style }).catch(() => {});
      }
      return;
    }

    // Fallback to HTML5 vibration API
    if ('vibrate' in navigator) {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(25);
          break;
        case 'heavy':
          navigator.vibrate(45);
          break;
        case 'success':
          navigator.vibrate([15, 60, 20]);
          break;
        case 'warning':
          navigator.vibrate([30, 50, 30]);
          break;
        case 'error':
          navigator.vibrate([40, 60, 40, 60, 40]);
          break;
      }
    }
  } catch {
    // Ignore haptic failures silently
  }
}

export const HapticsService = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
  selection: () => triggerHaptic('light'),
};
