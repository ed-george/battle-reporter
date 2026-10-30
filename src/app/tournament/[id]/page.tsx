import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTournamentById, getStreamedMatches } from '@/lib/data-repository';
import { MatchCard } from '@/components/MatchCard';
import { Calendar, Users, ExternalLink, Video, PlusCircle, ArrowLeft } from 'lucide-react';
import { TAG_MATCH_URL } from '@/config';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const tournament = await getTournamentById(id);

  if (!tournament) {
    return { title: 'Tournament Not Found - Battle Reporter' };
  }

  return {
    title: `${tournament.name} - Battle Reporter`,
    description: `Browse all broadcast stream matches from ${tournament.name}.`,
  };
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const tournament = await getTournamentById(id);

  if (!tournament) {
    notFound();
  }

  const matches = await getStreamedMatches({ tournamentId: tournament.id });

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tournaments</span>
        </Link>
      </div>

      {/* Tournament Hero Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            {tournament.season && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {tournament.season}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {tournament.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {tournament.rk9_link && (
              <a
                href={
                  tournament.rk9_link.startsWith('http')
                    ? tournament.rk9_link
                    : `https://rk9.gg/tournament/${tournament.rk9_link}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>RK9 Tournament</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <a
              href={TAG_MATCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tag Match</span>
            </a>
          </div>
        </div>

        {/* Tournament Metadata grid */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Dates</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>{tournament.start_date || 'TBD'} to {tournament.end_date || 'TBD'}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Masters Players</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
              <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>{tournament.total_players ? new Intl.NumberFormat('en-US').format(tournament.total_players) : '—'}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Stream Archive</span>
            <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
              <Video className="w-3.5 h-3.5 shrink-0" />
              <span>{matches.length} Featured Matches</span>
            </div>
          </div>
        </div>
      </div>

      {/* Streamed Matches List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Streamed Matches</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Official broadcast matches archived for this event</p>
          </div>
        </div>

        {matches.length > 0 ? (
          <div className="space-y-3">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Stream Matches Tagged Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Be the first to tag matches that were broadcast on an official stream from this tournament!
            </p>
            <div className="pt-2">
              <a
                href={TAG_MATCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tag Stream Match</span>
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
