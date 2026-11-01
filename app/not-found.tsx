import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-black mb-2">404</h1>
      <p className="text-slate-400 text-sm mb-6">Page not found</p>
      <Link href="/" className="px-5 py-2.5 rounded-xl brand-gradient text-white text-xs font-bold">
        Return Home
      </Link>
    </div>
  );
}
