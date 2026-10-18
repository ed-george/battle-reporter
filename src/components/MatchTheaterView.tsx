'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Play, Trophy, Eye, EyeOff, ExternalLink, ArrowLeft } from 'lucide-react';
import { StreamedMatch } from '@/types/database';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { ArchetypeBadge } from '@/components/ArchetypeBadge';
import { getLimitlessDeckUrl, getLimitlessPlayerUrl } from '@/lib/limitless';
import { useSpoilers } from '@/context/SpoilerContext';

interface MatchTheaterViewProps {
  match: StreamedMatch;
  relatedMatches?: StreamedMatch[];
}

export function MatchTheaterView({ match, relatedMatches = [] }: MatchTheaterViewProps) {
  const { isMatchRevealed, revealMatch, spoilersHidden, toggleSpoilers } = useSpoilers();
  const revealed = isMatchRevealed(match.id);

  // Active timestamp in seconds for seeking the YouTube player
  const [activeTimestamp, setActiveTimestamp] = useState<number>(match.match_start_seconds || 0);
  const [selectedGameNumber, setSelectedGameNumber] = useState<number | null>(null);

  const games = match.games || [];
  // If spoilers are hidden and match was a 2-0, we don't want the absence of Game 3 to spoil Game 2!
  const hasGame3 = games.some((g) => g.game_number === 3);

  const isP1Winner = revealed && match.winner_player_name === match.player1_name;
  const isP2Winner = revealed && match.winner_player_name === match.player2_name;

  const handleSeek = (seconds: number, gameNum?: number) => {
    setActiveTimestamp(seconds);
    setSelectedGameNumber(gameNum ?? null);
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation & Tournament Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/tournament/${match.tournament_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {match.tournament?.name || 'Tournament'}</span>
        </Link>

        <div className="flex items-center gap-2">
          {match.tournament?.rk9_link && (
            <a
              href={`https://rk9.link/roster/${match.tournament.rk9_link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg transition-colors"
            >
              <span>RK9 Pairings</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <button
            type="button"
            onClick={toggleSpoilers}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
              spoilersHidden
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {spoilersHidden ? <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
            <span>{spoilersHidden ? 'Spoilers: Hidden' : 'Spoilers: Visible'}</span>
          </button>
        </div>
      </div>

      {/* Match Matchup Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
              {match.round_name} • {match.division.toUpperCase()}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {match.player1_name} vs {match.player2_name}
            </h1>
          </div>

          {match.table_number && (
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full self-start">
              Feature Table {match.table_number}
            </div>
          )}
        </div>

        {/* Players & Decks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Player 1 Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isP1Winner
                ? 'bg-green-50/50 dark:bg-green-950/30 border-green-300 dark:border-green-700 ring-2 ring-green-500/20'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/player/${encodeURIComponent(match.player1_name)}`}
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors truncate block"
                >
                  {match.player1_name} {match.player1_country && `[${match.player1_country}]`}
                </Link>
                <div className="mt-1">
                  <ArchetypeBadge identifier={match.player1_deck_archetype} size="md" />
                </div>
              </div>
              {isP1Winner && (
                <div className="flex items-center gap-1 text-xs font-black text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/60 px-2.5 py-1 rounded-full shrink-0">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Winner</span>
                </div>
              )}
            </div>
          </div>

          {/* Player 2 Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isP2Winner
                ? 'bg-green-50/50 dark:bg-green-950/30 border-green-300 dark:border-green-700 ring-2 ring-green-500/20'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/player/${encodeURIComponent(match.player2_name)}`}
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors truncate block"
                >
                  {match.player2_name} {match.player2_country && `[${match.player2_country}]`}
                </Link>
                <div className="mt-1">
                  <ArchetypeBadge identifier={match.player2_deck_archetype} size="md" />
                </div>
              </div>
              {isP2Winner && (
                <div className="flex items-center gap-1 text-xs font-black text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/60 px-2.5 py-1 rounded-full shrink-0">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Winner</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spoiler Notice / Reveal Area */}
        {!revealed ? (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-900 dark:text-amber-300">
            <span>Match winner and final scores are hidden to protect spoilers.</span>
            <button
              type="button"
              onClick={() => revealMatch(match.id)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
            >
              Reveal Result
            </button>
          </div>
        ) : (
          match.match_score && (
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl py-2">
              <span>Final Match Score:</span>
              <span className="font-extrabold text-red-600 dark:text-red-400 font-mono text-base">{match.match_score}</span>
            </div>
          )
        )}
      </div>

      {/* Cinema YouTube Player & Game Jump Bar */}
      <div className="space-y-4">
        <YouTubePlayer
          videoId={match.youtube_video_id}
          currentTimestamp={activeTimestamp}
        />

        {/* Game Timestamps Navigation Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider pl-1">
              Jump To:
            </span>

            {/* Match Start Button */}
            <button
              type="button"
              onClick={() => handleSeek(match.match_start_seconds)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedGameNumber === null && activeTimestamp === match.match_start_seconds
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Match Intro</span>
            </button>

            {/* Games Buttons */}
            {games.map((game) => {
              // If game 3 exists but spoilers are hidden and user hasn't revealed, hide game 3 button
              if (game.game_number === 3 && !revealed && !hasGame3) {
                return null;
              }

              const isCurrent = selectedGameNumber === game.game_number;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleSeek(game.start_seconds, game.game_number)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Game {game.game_number}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500 pr-1">
            Official stream broadcast provided by The Pokémon Company
          </div>
        </div>
      </div>

      {/* Deck Archetypes & Limitless TCG Links */}
      <section className="space-y-4 pt-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Deck Archetypes & Limitless TCG</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">View complete decklists, card lists, and meta statistics directly on Limitless TCG</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Player 1 Deck Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                {match.player1_name}&apos;s Archetype
              </span>
              <div className="flex items-center gap-2">
                <ArchetypeBadge identifier={match.player1_deck_archetype} size="lg" />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
              <a
                href={getLimitlessDeckUrl(match.player1_deck_archetype)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                <span>View Deck on Limitless</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </a>
              <a
                href={getLimitlessPlayerUrl(match.player1_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span>Limitless Player Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </a>
            </div>
          </div>

          {/* Player 2 Deck Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                {match.player2_name}&apos;s Archetype
              </span>
              <div className="flex items-center gap-2">
                <ArchetypeBadge identifier={match.player2_deck_archetype} size="lg" />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
              <a
                href={getLimitlessDeckUrl(match.player2_deck_archetype)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                <span>View Deck on Limitless</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </a>
              <a
                href={getLimitlessPlayerUrl(match.player2_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span>Limitless Player Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Related Stream Matches */}
      {relatedMatches.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            More Matches from {match.tournament?.name}
          </h2>
          <div className="space-y-3">
            {relatedMatches.map((rel) => (
              <div
                key={rel.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 flex items-center justify-between text-xs transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-red-600 dark:text-red-400">{rel.round_name}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{rel.player1_name}</span>
                  <span className="text-slate-400 dark:text-slate-500">vs</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{rel.player2_name}</span>
                </div>
                <Link
                  href={`/match/${rel.id}`}
                  className="font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline inline-flex items-center gap-1"
                >
                  <span>Watch</span>
                  <Play className="w-3 h-3 fill-current" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
