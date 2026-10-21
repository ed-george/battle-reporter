'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Eye, Trophy } from 'lucide-react';
import { StreamedMatch } from '@/types/database';
import { ArchetypeBadge } from '@/components/ArchetypeBadge';
import { useSpoilers } from '@/context/SpoilerContext';
import { isMatchTie, playerNameToSlug } from '@/lib/matches';

interface MatchCardProps {
  match: StreamedMatch;
  displayTournament?: boolean;
}

export function MatchCard({ match, displayTournament = false }: MatchCardProps) {
  const { isMatchRevealed, revealMatch } = useSpoilers();
  const revealed = isMatchRevealed(match.id);

  const isTie = revealed && isMatchTie(match.winner_player_name, match.match_score);
  const isP1Winner = revealed && !isTie && match.winner_player_name === match.player1_name;
  const isP2Winner = revealed && !isTie && match.winner_player_name === match.player2_name;

  return (
    <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Tournament & Round Information */}
      <div className="flex items-center gap-3 shrink-0 md:w-56">
        <div className="flex flex-col gap-1 min-w-0">
          {displayTournament && (
            <Link
              href={`/tournament/${match.tournament_id}`}
              className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline inline-flex items-center gap-1 mb-2 max-w-full"
              title={match.tournament?.name || 'Unknown Tournament'}
            >
              {match.tournament?.name || 'Unknown Tournament'}
            </Link>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {match.round_name}
            </span>
          </div>
        </div>
      </div>

      {/* Players & Decks Matchup */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-2 my-1 md:my-0">
        <div className="w-full max-w-lg flex items-center justify-center">
          
          {/* Player 1 */}
          <div className="w-1/2 flex flex-col items-end text-right pr-3 min-w-0">
            <Link
              href={`/player/${playerNameToSlug(match.player1_name)}`}
              className={`text-sm sm:text-base font-bold truncate max-w-full hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1.5 ${
                isP1Winner ? 'text-green-700 dark:text-green-400 font-extrabold' : 'text-slate-900 dark:text-white'
              }`}
            >
              {isP1Winner && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0 inline" />}
              <span className="truncate">{match.player1_name}</span>
              {match.player1_country && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">[{match.player1_country}]</span>
              )}
            </Link>
            <div className="mt-1">
              <ArchetypeBadge identifier={match.player1_deck_archetype} size="sm" />
            </div>
          </div>

          {/* VS Divider & Score */}
          <div className="shrink-0 flex flex-col items-center justify-center px-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-400 dark:text-slate-500 select-none">
              VS
            </div>
            {(match.match_score || isTie) && (
              <div className="mt-1">
                {revealed ? (
                  isTie ? (
                    <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 px-1.5 py-0.5 rounded">
                      Tie{match.match_score ? ` ${match.match_score}` : ''}
                    </span>
                  ) : (
                    <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                      {match.match_score}
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      revealMatch(match.id);
                    }}
                    className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 underline cursor-pointer"
                    title="Click to reveal score"
                  >
                    score
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Player 2 */}
          <div className="w-1/2 flex flex-col items-start text-left pl-3 min-w-0">
            <Link
              href={`/player/${playerNameToSlug(match.player2_name)}`}
              className={`text-sm sm:text-base font-bold truncate max-w-full hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1.5 ${
                isP2Winner ? 'text-green-700 dark:text-green-400 font-extrabold' : 'text-slate-900 dark:text-white'
              }`}
            >
              <span className="truncate">{match.player2_name}</span>
              {match.player2_country && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">[{match.player2_country}]</span>
              )}
              {isP2Winner && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0 inline" />}
            </Link>
            <div className="mt-1">
              <ArchetypeBadge identifier={match.player2_deck_archetype} size="sm" />
            </div>
          </div>

        </div>
      </div>

      {/* Action Watch Button */}
      <div className="flex items-center justify-end shrink-0 md:w-36 gap-2">
        {!revealed && (
          <button
            type="button"
            onClick={() => revealMatch(match.id)}
            className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
            title="Reveal Winner"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        <Link
          href={`/match/${match.id}`}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs hover:shadow-sm transition-all group-hover:scale-[1.02]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Watch</span>
        </Link>
      </div>
    </div>
  );
}
