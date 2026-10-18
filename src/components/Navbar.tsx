'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Eye, EyeOff, Video, Trophy, Layers, PlusCircle, User } from 'lucide-react';
import { useSpoilers } from '@/context/SpoilerContext';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { spoilersHidden, toggleSpoilers } = useSpoilers();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/matches?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { href: '/', label: 'Tournaments', icon: Trophy },
    { href: '/matches', label: 'Stream Matches', icon: Video },
    { href: '/players', label: 'Players', icon: User },
    { href: '/archetypes', label: 'Archetypes', icon: Layers },
    { href: '/submit', label: 'Tag a Match', icon: PlusCircle },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
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
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
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
                >
                  <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Universal Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex flex-1 max-w-xs relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player, deck, tournament..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          </form>

          {/* Spoiler Shield Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSpoilers}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                spoilersHidden
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Toggle match winners and scores visibility"
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
          </div>

        </div>
      </div>
    </header>
  );
}
