// Centralized White-Label Brand Configuration for Reelix
// Edit this file to instantly rebrand the entire application for buyers
import React from 'react';

export interface BrandLogoProps {
  className?: string;
  size?: number;
}

export function BrandLogo({ className = 'w-6 h-6', size }: BrandLogoProps) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="Reelix Logo"
    >
      <defs>
        <linearGradient id="reelix-brand-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      {/* Outer rounded phone / vertical canvas frame */}
      <rect x="8" y="4" width="32" height="40" rx="8" stroke="url(#reelix-brand-grad)" strokeWidth="3" fill="#12121C" />
      {/* Film reel cutouts */}
      <circle cx="14" cy="10" r="2" fill="#8B5CF6" />
      <circle cx="14" cy="18" r="2" fill="#8B5CF6" />
      <circle cx="14" cy="26" r="2" fill="#8B5CF6" />
      <circle cx="14" cy="34" r="2" fill="#8B5CF6" />
      <circle cx="34" cy="10" r="2" fill="#22D3EE" />
      <circle cx="34" cy="18" r="2" fill="#22D3EE" />
      <circle cx="34" cy="26" r="2" fill="#22D3EE" />
      <circle cx="34" cy="34" r="2" fill="#22D3EE" />
      {/* Center play / timeline spark */}
      <path
        d="M22 17L30 24L22 31V17Z"
        fill="url(#reelix-brand-grad)"
      />
    </svg>
  );
}

export const BRAND = {
  appName: 'Reelix',
  tagline: 'AI Vertical Shorts Studio',
  edition: 'Pro Studio 2026',
  version: '1.0.0',
  buildDate: '2026.03',
  supportEmail: 'support@reelix.app',
  website: 'https://reelix.app',
  canonicalResolution: '1080×1920',
  aspectRatio: '9:16',
  maxDurationSec: 180,
  primaryColor: '#8B5CF6',
  secondaryColor: '#22D3EE',
  logo: BrandLogo,
} as const;
