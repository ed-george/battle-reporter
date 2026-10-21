'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Users, Video } from 'lucide-react';
import { Tournament } from '@/types/database';
import { formatDateRange } from '@/lib/matches';

interface TournamentCardProps {
  tournament: Tournament;
  streamMatchCount?: number;
}

export function TournamentCard({ tournament, streamMatchCount = 0 }: TournamentCardProps) {

  return (
    <Link
      href={`/tournament/${tournament.id}`}
      className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-500/50 rounded-xl p-5 shadow-xs hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {tournament.season && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {tournament.season}
              </span>
            )}
            {streamMatchCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                <Video className="w-3 h-3 text-red-600 dark:text-red-400" />
                {streamMatchCount} Stream {streamMatchCount === 1 ? 'Match' : 'Matches'}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                Archived
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2">
            {tournament.name}
          </h3>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 truncate">
          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="truncate">{formatDateRange(tournament.start_date, tournament.end_date)}</span>
        </div>
        <div className="flex items-center gap-1.5 truncate justify-end">
          <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          <span>{tournament.total_players ? new Intl.NumberFormat('en-US').format(tournament.total_players) : '—'} Players</span>
        </div>
        {tournament.location && (
          <div className="col-span-2 flex items-center gap-1.5 truncate text-slate-400 dark:text-slate-500">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{tournament.location}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
