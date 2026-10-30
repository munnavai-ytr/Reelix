// WebCrypto PIN Security Utility for Reelix Admin Lock

const PIN_STORAGE_KEY = 'reelix_admin_pin_hash';
const PIN_SALT_KEY = 'reelix_admin_pin_salt';
const PIN_ENABLED_KEY = 'reelix_admin_pin_enabled';

async function sha256(str: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const PinService = {
  isPinSet(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(PIN_STORAGE_KEY) && localStorage.getItem(PIN_ENABLED_KEY) === 'true';
  },

  isPinConfigured(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(PIN_STORAGE_KEY);
  },

  async setPin(pin: string): Promise<boolean> {
    if (!pin || pin.length < 4) {
      throw new Error('PIN must be at least 4 digits');
    }
    const salt = crypto.getRandomValues(new Uint8Array(16)).join('');
    const hash = await sha256(pin + salt);
    localStorage.setItem(PIN_STORAGE_KEY, hash);
    localStorage.setItem(PIN_SALT_KEY, salt);
    localStorage.setItem(PIN_ENABLED_KEY, 'true');
    return true;
  },

  async verifyPin(pin: string): Promise<boolean> {
    const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
    const salt = localStorage.getItem(PIN_SALT_KEY);
    if (!storedHash || !salt) return false;
    const computedHash = await sha256(pin + salt);
    return computedHash === storedHash;
  },

  togglePinEnabled(enabled: boolean): void {
    localStorage.setItem(PIN_ENABLED_KEY, enabled ? 'true' : 'false');
  },

  removePin(): void {
    localStorage.removeItem(PIN_STORAGE_KEY);
    localStorage.removeItem(PIN_SALT_KEY);
    localStorage.removeItem(PIN_ENABLED_KEY);
  }
};
