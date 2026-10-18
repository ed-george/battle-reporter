'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Eye, Trophy } from 'lucide-react';
import { StreamedMatch } from '@/types/database';
import { ArchetypeBadge } from '@/components/ArchetypeBadge';
import { useSpoilers } from '@/context/SpoilerContext';

interface MatchCardProps {
  match: StreamedMatch;
}

export function MatchCard({ match }: MatchCardProps) {
  const { isMatchRevealed, revealMatch } = useSpoilers();
  const revealed = isMatchRevealed(match.id);

  const isP1Winner = revealed && match.winner_player_name === match.player1_name;
  const isP2Winner = revealed && match.winner_player_name === match.player2_name;

  return (
    <div className="group bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Tournament & Round Information */}
      <div className="flex items-center gap-3 shrink-0 md:w-56">
        <div className="flex flex-col gap-1">
          <Link
            href={`/tournament/${match.tournament_id}`}
            className="text-xs font-bold uppercase tracking-wider text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1"
          >
            {match.tournament?.name || 'Tournament'}
          </Link>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
              {match.round_name}
            </span>
            {match.table_number && (
              <span className="text-[11px] text-slate-400">Table {match.table_number}</span>
            )}
          </div>
        </div>
      </div>

      {/* Players & Decks Matchup */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-2 my-1 md:my-0">
        <div className="w-full max-w-lg flex items-center justify-center">
          
          {/* Player 1 */}
          <div className="w-1/2 flex flex-col items-end text-right pr-3 min-w-0">
            <Link
              href={`/player/${encodeURIComponent(match.player1_name)}`}
              className={`text-sm sm:text-base font-bold truncate max-w-full hover:text-red-600 transition-colors flex items-center gap-1.5 ${
                isP1Winner ? 'text-green-700 font-extrabold' : 'text-slate-900'
              }`}
            >
              {isP1Winner && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0 inline" />}
              <span className="truncate">{match.player1_name}</span>
              {match.player1_country && (
                <span className="text-[10px] text-slate-400 font-normal">[{match.player1_country}]</span>
              )}
            </Link>
            <div className="mt-1">
              <ArchetypeBadge identifier={match.player1_deck_archetype} size="sm" />
            </div>
          </div>

          {/* VS Divider & Score */}
          <div className="shrink-0 flex flex-col items-center justify-center px-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-xs font-black text-slate-400 select-none">
              VS
            </div>
            {match.match_score && (
              <div className="mt-1">
                {revealed ? (
                  <span className="text-[11px] font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                    {match.match_score}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      revealMatch(match.id);
                    }}
                    className="text-[10px] text-slate-400 hover:text-amber-600 underline cursor-pointer"
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
              href={`/player/${encodeURIComponent(match.player2_name)}`}
              className={`text-sm sm:text-base font-bold truncate max-w-full hover:text-red-600 transition-colors flex items-center gap-1.5 ${
                isP2Winner ? 'text-green-700 font-extrabold' : 'text-slate-900'
              }`}
            >
              <span className="truncate">{match.player2_name}</span>
              {match.player2_country && (
                <span className="text-[10px] text-slate-400 font-normal">[{match.player2_country}]</span>
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
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs"
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
