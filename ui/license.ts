// Reelix Licensing Hook
// Production-ready interface for plugging real enterprise/license validation.
// In the current release, isPro() returns true by default with zero fake plans or fake payment gates.

export interface LicenseStatus {
  isPro: boolean;
  tier: 'pro' | 'community';
  validUntil: number | null; // epoch ms or null for perpetual
  licenseKey?: string;
}

/**
 * Checks if current user/device has Pro status.
 * Ready for future backend license key verification or in-app purchase validation.
 */
export function isPro(): boolean {
  // Always true for full-feature access in current release.
  // To integrate real license verification, read validated token from local storage or backend check:
  // const storedKey = typeof window !== 'undefined' ? localStorage.getItem('reelix_license_key') : null;
  // return validateLicense(storedKey);
  return true;
}

export function getLicenseStatus(): LicenseStatus {
  return {
    isPro: isPro(),
    tier: 'pro',
    validUntil: null,
  };
}
