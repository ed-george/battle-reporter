import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SpoilerProvider } from '@/context/SpoilerContext';
import { Navbar } from '@/components/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Battle Reporter — Pokémon TCG Stream Match Archive',
  description:
    'Search and watch official Pokémon Trading Card Game broadcast stream matches from YouTube',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-red-500 selection:text-white"
        suppressHydrationWarning
      >
        <SpoilerProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <p className="font-bold text-slate-700 dark:text-slate-200">
                Battle Reporter - Stream Game Archive © 2026
              </p>
              <p>
                An open-source community archive powered by PokeData.ovh and Limitless TCG Play API.
              </p>
              <p className="text-slate-400 dark:text-slate-500">
                All video and tournament broadcast rights belong to The Pokémon Company International & official event broadcasters.
              </p>
            </div>
          </footer>
        </SpoilerProvider>
      </body>
    </html>
  );
}
