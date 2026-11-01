import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bengali',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Reelix - AI Vertical Shorts Studio',
  description: 'AI-powered one-click vertical Shorts (1080x1920) video creator and editor with real-time canvas preview, Whisper transcription, Gemini Director engine, and WebCodecs MP4 export.',
  openGraph: {
    title: 'Reelix - AI Vertical Shorts Studio',
    description: 'AI-powered one-click vertical Shorts (1080x1920) video creator and editor with real-time canvas preview, Whisper transcription, Gemini Director engine, and WebCodecs MP4 export.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reelix - AI Vertical Shorts Studio',
    description: 'AI-powered one-click vertical Shorts (1080x1920) video creator and editor with real-time canvas preview, Whisper transcription, Gemini Director engine, and WebCodecs MP4 export.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B0B0F',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${notoSansBengali.variable} font-sans antialiased bg-[#0B0B0F] text-slate-100 min-h-screen selection:bg-violet-500/30 selection:text-white`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
