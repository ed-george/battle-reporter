import { Check, X, Shield, ExternalLink, Video } from 'lucide-react';

export const metadata = {
  title: 'Moderation Queue — Battle Reporter',
  description: 'Review and approve community stream match timestamp submissions.',
};

export default async function ModerationQueuePage() {

  // Mock sample pending submissions for preview
  const pendingSubmissions = [
    {
      id: 'sub-001',
      tournament_name: '2026 Europe Pokémon TCG International Championships',
      round_name: 'Swiss Round 7',
      player1_name: 'Alberto Conti',
      player1_deck: 'charizard-ex',
      player2_name: 'Kyle Warner',
      player2_deck: 'gardevoir-ex',
      youtube_url: 'https://www.youtube.com/watch?v=F08674E6tO8',
      match_start: '03:42:10',
      submitted_at: '10 minutes ago',
      submitted_by: 'TrainerAlex',
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-2">
            <Shield className="w-3.5 h-3.5 text-amber-700" />
            <span>Moderator Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Submissions Moderation Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review community submitted stream match timestamps before publishing them to the public archive.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {pendingSubmissions.length > 0 ? (
          pendingSubmissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-black text-red-600 uppercase tracking-wider">
                    {sub.tournament_name} • {sub.round_name}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    {sub.player1_name} ({sub.player1_deck}) vs {sub.player2_name} ({sub.player2_deck})
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>Submitted by <strong>@{sub.submitted_by}</strong></span>
                    <span>•</span>
                    <span>{sub.submitted_at}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Video className="w-4 h-4 text-slate-400" />
                  <span>Start Timestamp: <strong>{sub.match_start}</strong></span>
                </div>
                <a
                  href={sub.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600 font-semibold"
                >
                  <span>Preview Video</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-xs text-slate-500">
            No pending submissions in the moderation queue!
          </div>
        )}
      </div>
    </div>
  );
}
