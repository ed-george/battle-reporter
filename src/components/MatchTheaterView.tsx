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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
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
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 border border-slate-200 bg-white px-2.5 py-1 rounded-lg"
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
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {spoilersHidden ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
            <span>{spoilersHidden ? 'Spoilers: Hidden' : 'Spoilers: Visible'}</span>
          </button>
        </div>
      </div>

      {/* Match Matchup Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-red-600">
              {match.round_name} • {match.division.toUpperCase()}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {match.player1_name} vs {match.player2_name}
            </h1>
          </div>

          {match.table_number && (
            <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start">
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
                ? 'bg-green-50/50 border-green-300 ring-2 ring-green-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/player/${encodeURIComponent(match.player1_name)}`}
                  className="text-base sm:text-lg font-bold text-slate-900 hover:text-red-600 transition-colors truncate block"
                >
                  {match.player1_name} {match.player1_country && `[${match.player1_country}]`}
                </Link>
                <div className="mt-1">
                  <ArchetypeBadge identifier={match.player1_deck_archetype} size="md" />
                </div>
              </div>
              {isP1Winner && (
                <div className="flex items-center gap-1 text-xs font-black text-green-700 bg-green-100 px-2.5 py-1 rounded-full shrink-0">
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
                ? 'bg-green-50/50 border-green-300 ring-2 ring-green-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/player/${encodeURIComponent(match.player2_name)}`}
                  className="text-base sm:text-lg font-bold text-slate-900 hover:text-red-600 transition-colors truncate block"
                >
                  {match.player2_name} {match.player2_country && `[${match.player2_country}]`}
                </Link>
                <div className="mt-1">
                  <ArchetypeBadge identifier={match.player2_deck_archetype} size="md" />
                </div>
              </div>
              {isP2Winner && (
                <div className="flex items-center gap-1 text-xs font-black text-green-700 bg-green-100 px-2.5 py-1 rounded-full shrink-0">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Winner</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spoiler Notice / Reveal Area */}
        {!revealed ? (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900">
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
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-700 bg-slate-100 rounded-xl py-2">
              <span>Final Match Score:</span>
              <span className="font-extrabold text-red-600 font-mono text-base">{match.match_score}</span>
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
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">
              Jump To:
            </span>

            {/* Match Start Button */}
            <button
              type="button"
              onClick={() => handleSeek(match.match_start_seconds)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedGameNumber === null && activeTimestamp === match.match_start_seconds
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Game {game.game_number}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-400 pr-1">
            Official stream broadcast provided by The Pokémon Company
          </div>
        </div>
      </div>

      {/* Deck Archetypes & Limitless TCG Links */}
      <section className="space-y-4 pt-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Deck Archetypes & Limitless TCG</h2>
          <p className="text-xs text-slate-500">View complete decklists, card lists, and meta statistics directly on Limitless TCG</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Player 1 Deck Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {match.player1_name}&apos;s Archetype
              </span>
              <div className="flex items-center gap-2">
                <ArchetypeBadge identifier={match.player1_deck_archetype} size="lg" />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <a
                href={getLimitlessDeckUrl(match.player1_deck_archetype)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                <span>View Deck on Limitless</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>
              <a
                href={getLimitlessPlayerUrl(match.player1_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <span>Limitless Player Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Player 2 Deck Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {match.player2_name}&apos;s Archetype
              </span>
              <div className="flex items-center gap-2">
                <ArchetypeBadge identifier={match.player2_deck_archetype} size="lg" />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <a
                href={getLimitlessDeckUrl(match.player2_deck_archetype)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                <span>View Deck on Limitless</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>
              <a
                href={getLimitlessPlayerUrl(match.player2_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <span>Limitless Player Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Related Stream Matches */}
      {relatedMatches.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-slate-200">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            More Matches from {match.tournament?.name}
          </h2>
          <div className="space-y-3">
            {relatedMatches.map((rel) => (
              <div
                key={rel.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex items-center justify-between text-xs transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-red-600">{rel.round_name}</span>
                  <span className="font-semibold text-slate-900">{rel.player1_name}</span>
                  <span className="text-slate-400">vs</span>
                  <span className="font-semibold text-slate-900">{rel.player2_name}</span>
                </div>
                <Link
                  href={`/match/${rel.id}`}
                  className="font-bold text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1"
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
