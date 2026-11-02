import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Manrope, JetBrains_Mono, Hind_Siliguri } from 'next/font/google';
import './globals.css';
import { BRAND } from '@/ui/brand';

const fontHeading = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const fontSans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const fontBengali = Hind_Siliguri({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bengali',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${BRAND.appName} — ${BRAND.tagline}`,
  description: 'AI-powered one-click vertical Shorts (1080x1920) video creator and editor with real-time canvas preview, Whisper transcription, Gemini Director engine, and WebCodecs MP4 export.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/pwa-192x192.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: `${BRAND.appName} — ${BRAND.tagline}`,
    description: 'AI-powered one-click vertical Shorts (1080x1920) video creator and editor with real-time canvas preview, Whisper transcription, Gemini Director engine, and WebCodecs MP4 export.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.appName} — ${BRAND.tagline}`,
    description: 'AI-powered one-click vertical Shorts (1080x1920) video creator and editor with real-time canvas preview, Whisper transcription, Gemini Director engine, and WebCodecs MP4 export.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0A0A10',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${fontHeading.variable} ${fontSans.variable} ${fontMono.variable} ${fontBengali.variable} font-sans antialiased bg-[#0A0A10] text-[#EDEDF7] min-h-[100dvh] selection:bg-violet-500/30 selection:text-white`}
        suppressHydrationWarning
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(){});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
