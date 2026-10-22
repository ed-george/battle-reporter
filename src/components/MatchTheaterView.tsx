'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Play, Trophy, ExternalLink, ArrowLeft, Clock } from 'lucide-react';
import { StreamedMatch } from '@/types/database';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { ArchetypeBadge } from '@/components/ArchetypeBadge';
import { getLimitlessPlayerUrl } from '@/lib/limitless';
import { useSpoilers } from '@/context/SpoilerContext';
import { isMatchTie, playerNameToSlug } from '@/lib/matches';

function formatTimestamp(totalSeconds?: number | null): string {
  if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds) || totalSeconds < 0) {
    return '0:00';
  }
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface MatchTheaterViewProps {
  match: StreamedMatch;
  relatedMatches?: StreamedMatch[];
}

export function MatchTheaterView({ match, relatedMatches = [] }: MatchTheaterViewProps) {
  const { isMatchRevealed, revealMatch } = useSpoilers();
  const revealed = isMatchRevealed(match.id);

  // Active timestamp in seconds for seeking the YouTube player
  const [activeTimestamp, setActiveTimestamp] = useState<number>(match.match_start_seconds || 0);
  const [selectedGameNumber, setSelectedGameNumber] = useState<number | null>(null);

  const games = match.games || [];

  const isTie = revealed && isMatchTie(match.winner_player_name, match.match_score);
  const isP1Winner = revealed && !isTie && match.winner_player_name === match.player1_name;
  const isP2Winner = revealed && !isTie && match.winner_player_name === match.player2_name;

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
                : isTie
                ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/player/${playerNameToSlug(match.player1_name)}`}
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
              {isTie && (
                <div className="flex items-center gap-1 text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-full shrink-0">
                  <span>Tie</span>
                </div>
              )}

               <a
                href={getLimitlessPlayerUrl(match.player1_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                <span>Limitless Player Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </a>
            </div>
          </div>

          {/* Player 2 Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isP2Winner
                ? 'bg-green-50/50 dark:bg-green-950/30 border-green-300 dark:border-green-700 ring-2 ring-green-500/20'
                : isTie
                ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/player/${playerNameToSlug(match.player2_name)}`}
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
              {isTie && (
                <div className="flex items-center gap-1 text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-full shrink-0">
                  <span>Tie</span>
                </div>
              )}

            <a
                href={getLimitlessPlayerUrl(match.player2_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                <span>Limitless Player Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </a>

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
        ) : isTie ? (
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl py-2.5 px-4 shadow-2xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 font-black text-xs uppercase tracking-wide">
              Match Result: Ended in a Tie / Draw
            </span>
            {match.match_score && (
              <span className="font-extrabold font-mono text-base text-amber-900 dark:text-amber-200">
                ({match.match_score})
              </span>
            )}
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedGameNumber === null && activeTimestamp === match.match_start_seconds
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Match Intro</span>
              <span className="text-[11px] font-mono opacity-80">({formatTimestamp(match.match_start_seconds)})</span>
            </button>

            {/* Games Buttons */}
            {games.map((game) => {
              const isCurrent = selectedGameNumber === game.game_number;
              return (
                <button
                  key={game.id || game.game_number}
                  type="button"
                  onClick={() => handleSeek(game.start_seconds, game.game_number)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Game {game.game_number}</span>
                  <span className="text-[11px] font-mono opacity-80">({formatTimestamp(game.start_seconds)})</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500 pr-1">
            Official stream broadcast provided by The Pokémon Company
          </div>
        </div>
      </div>

      {/* Dedicated Game Start Timestamps Card */}
      {games.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Game Start Timestamps</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Jump directly to the start of individual games in the broadcast
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {games.length} {games.length === 1 ? 'Game Recorded' : 'Games Recorded'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {games.map((game) => {
              const isCurrent = selectedGameNumber === game.game_number;
              return (
                <button
                  key={game.id || game.game_number}
                  type="button"
                  onClick={() => handleSeek(game.start_seconds, game.game_number)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 ring-2 ring-red-500/20'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white">
                      <Play className={`w-3.5 h-3.5 fill-current ${isCurrent ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Game {game.game_number}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Broadcast Start Time
                    </span>
                  </div>

                  <span className="font-mono text-sm font-extrabold px-3 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 shadow-2xs">
                    {formatTimestamp(game.start_seconds)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

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
