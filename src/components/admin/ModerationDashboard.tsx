'use client';

import React, { useState } from 'react';
import { PendingSubmissionRecord, approveSubmissionAction, rejectSubmissionAction } from '@/app/actions/moderation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Shield, Check, X, ExternalLink, Video, LogOut, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface ModerationDashboardProps {
  userEmail: string;
  initialSubmissions: PendingSubmissionRecord[];
}

export function ModerationDashboard({ userEmail, initialSubmissions }: ModerationDashboardProps) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<PendingSubmissionRecord[]>(initialSubmissions);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const formatSeconds = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleApprove = async (submissionId: string) => {
    setProcessingId(submissionId);
    setMessage(null);
    try {
      await approveSubmissionAction(submissionId);
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      setMessage({ text: 'Match approved and published to the live archive!', type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve submission.';
      setMessage({ text: msg, type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (submissionId: string) => {
    setProcessingId(submissionId);
    setMessage(null);
    try {
      await rejectSubmissionAction(submissionId, 'Rejected by moderator');
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      setMessage({ text: 'Submission rejected and archived.', type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject submission.';
      setMessage({ text: msg, type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header with admin profile & sign out */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-bold mb-2">
            <Shield className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span>Administrator Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Moderation Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review community submitted stream match timestamps before publishing them to the public archive.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">Signed in as</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{userEmail}</span>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            {isSigningOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Alert message */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <Sparkles className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Queue items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>
            Pending Submissions: <strong>{submissions.length}</strong>
          </span>
        </div>

        {submissions.length > 0 ? (
          submissions.map((sub) => {
            const m = sub.match_data;
            const isProcessing = processingId === sub.id;

            return (
              <div
                key={sub.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wider block">
                      {sub.tournament?.name || m.tournament_id} • {m.round_name} {m.table_number ? `(Table ${m.table_number})` : ''}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {m.player1_name} ({m.player1_deck_archetype}) vs {m.player2_name} ({m.player2_deck_archetype})
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      <span>Submitted: {new Date(sub.created_at).toLocaleDateString()}</span>
                      {m.match_score && (
                        <>
                          <span>•</span>
                          <span>Score: <strong>{m.match_score}</strong></span>
                        </>
                      )}
                      {m.winner_player_name && (
                        <>
                          <span>•</span>
                          <span>Winner: <strong>{m.winner_player_name}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApprove(sub.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Approve & Publish</span>
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleReject(sub.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                {/* Video Timestamp Bar */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-red-500" />
                      <span>Start: <strong>{formatSeconds(m.match_start_seconds)}</strong></span>
                    </div>

                    {Array.isArray(m.games) && m.games.length > 0 && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                        <span>Games tagged:</span>
                        {m.games.map((g) => (
                          <span key={g.game_number} className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                            G{g.game_number}: {formatSeconds(g.start_seconds)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <a
                    href={`${m.youtube_url}&t=${m.match_start_seconds}s`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-semibold"
                  >
                    <span>Preview on YouTube</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <Shield className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Pending Submissions</h3>
            <p>All community submissions have been reviewed and moderated!</p>
          </div>
        )}
      </div>
    </div>
  );
}
