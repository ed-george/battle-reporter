'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search,
  Eye,
  EyeOff,
  Video,
  Trophy,
  Layers,
  PlusCircle,
  User,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import { useSpoilers } from '@/context/SpoilerContext';
import { TAG_MATCH_URL } from '@/config';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { spoilersHidden, toggleSpoilers } = useSpoilers();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Automatically close mobile menu on route change during render
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Close mobile menu if window is resized to desktop (>= 768px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/matches?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { href: '/', label: 'Tournaments', icon: Trophy, external: false },
    { href: '/matches', label: 'Stream Matches', icon: Video, external: false },
    { href: '/players', label: 'Players', icon: User, external: false },
    { href: '/archetypes', label: 'Archetypes', icon: Layers, external: false },
    { href: TAG_MATCH_URL, label: 'Tag a Match', icon: PlusCircle, external: true },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo */}
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-sm group-hover:bg-red-700 transition-colors">
              <span className="font-black text-sm tracking-wider">BR</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                Battle Reporter
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase -mt-1">
                PTCG Stream Archive
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Desktop Navigation">
            {navLinks.map((link) => {
              const Icon = link.icon;
              if (link.external) {
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>{link.label}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </a>
                );
              }

              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Universal Search Bar (Desktop / Tablet) */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex flex-1 max-w-xs relative" role="search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player, deck, tournament..."
              aria-label="Search matches, players, decks, tournaments"
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" aria-hidden="true" />
          </form>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2">
            {/* Spoiler Shield Button (Desktop / Tablet) */}
            <button
              type="button"
              onClick={toggleSpoilers}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                spoilersHidden
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Toggle match winners and scores visibility"
              aria-pressed={spoilersHidden}
            >
              {spoilersHidden ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Spoilers: Hidden</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Spoilers: Shown</span>
                </>
              )}
            </button>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 min-w-[44px] min-h-[44px] transition-colors"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-controls="mobile-navigation"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer / Dropdown Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pt-3 pb-6 space-y-4 shadow-lg transition-all"
        >
          {/* Mobile Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full" role="search">
            <label htmlFor="mobile-search-input" className="sr-only">
              Search player, deck, tournament
            </label>
            <input
              id="mobile-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player, deck, tournament..."
              className="w-full h-11 pl-10 pr-4 rounded-xl text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" aria-hidden="true" />
          </form>

          {/* Primary Navigation Links */}
          <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
            {navLinks.map((link) => {
              const Icon = link.icon;
              if (link.external) {
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 min-h-[44px] rounded-xl text-sm font-semibold transition-all text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 active:bg-slate-200 dark:active:bg-slate-700"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      <span>{link.label}</span>
                    </span>
                    <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  </a>
                );
              }

              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 active:bg-slate-200 dark:active:bg-slate-700'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Spoilers Visibility Toggle Button */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={toggleSpoilers}
              className={`w-full flex items-center justify-between px-3.5 min-h-[44px] rounded-xl text-sm font-semibold border transition-all ${
                spoilersHidden
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Toggle match winners and scores visibility"
              aria-pressed={spoilersHidden}
            >
              <span className="flex items-center gap-3">
                {spoilersHidden ? (
                  <EyeOff className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                ) : (
                  <Eye className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                )}
                <span>Match Spoilers</span>
              </span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  spoilersHidden
                    ? 'bg-amber-200/80 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {spoilersHidden ? 'Hidden' : 'Shown'}
              </span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
