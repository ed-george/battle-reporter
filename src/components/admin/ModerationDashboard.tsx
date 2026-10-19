'use client';

import React, { useState } from 'react';
import {
  PendingSubmissionRecord,
  approveSubmissionAction,
  updateSubmissionDataAction,
  rejectSubmissionAction,
} from '@/app/actions/moderation';
import { Tournament, DeckArchetype } from '@/types/database';
import { POPULAR_ARCHETYPES } from '@/lib/limitless';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Check,
  X,
  ExternalLink,
  Video,
  LogOut,
  Loader2,
  Sparkles,
  AlertCircle,
  Pencil,
  Save,
  RotateCcw,
  Trophy,
  Users,
  Layers,
  Calendar,
} from 'lucide-react';

interface ModerationDashboardProps {
  userEmail: string;
  initialSubmissions: PendingSubmissionRecord[];
  tournaments?: Tournament[];
  archetypes?: DeckArchetype[];
}

export function ModerationDashboard({
  userEmail,
  initialSubmissions,
  tournaments = [],
  archetypes = POPULAR_ARCHETYPES,
}: ModerationDashboardProps) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<PendingSubmissionRecord[]>(initialSubmissions);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PendingSubmissionRecord['match_data'] | null>(null);
  const [editTimeStrings, setEditTimeStrings] = useState<{
    matchStart: string;
    game1Start: string;
    game2Start: string;
    game3Start: string;
  }>({
    matchStart: '00:00:00',
    game1Start: '',
    game2Start: '',
    game3Start: '',
  });

  // Sort archetypes alphabetically
  const sortedArchetypes = React.useMemo(() => {
    return [...archetypes].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [archetypes]);

  // Format seconds to HH:MM:SS or MM:SS
  const formatSeconds = (totalSecs: number) => {
    if (isNaN(totalSecs) || totalSecs === null || totalSecs === undefined) return '00:00';
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = Math.floor(totalSecs % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Parse time string (HH:MM:SS or MM:SS or raw seconds) to number of seconds
  const parseSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(':').map(Number);
    if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
    return Number(timeStr) || 0;
  };

  // Start editing a submission
  const startEditing = (sub: PendingSubmissionRecord) => {
    setEditingId(sub.id);
    const m = JSON.parse(JSON.stringify(sub.match_data));
    setEditForm(m);

    // Extract game timestamps
    const g1 = m.games?.find((g: { game_number: number }) => g.game_number === 1)?.start_seconds;
    const g2 = m.games?.find((g: { game_number: number }) => g.game_number === 2)?.start_seconds;
    const g3 = m.games?.find((g: { game_number: number }) => g.game_number === 3)?.start_seconds;

    setEditTimeStrings({
      matchStart: formatSeconds(m.match_start_seconds || 0),
      game1Start: g1 !== undefined ? formatSeconds(g1) : '',
      game2Start: g2 !== undefined ? formatSeconds(g2) : '',
      game3Start: g3 !== undefined ? formatSeconds(g3) : '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  // Assemble current editForm with parsed timestamps
  const getCompiledEditPayload = (): PendingSubmissionRecord['match_data'] | null => {
    if (!editForm) return null;

    const startSecs = parseSeconds(editTimeStrings.matchStart);
    const games = [];
    if (editTimeStrings.game1Start.trim()) {
      games.push({ game_number: 1, start_seconds: parseSeconds(editTimeStrings.game1Start) });
    }
    if (editTimeStrings.game2Start.trim()) {
      games.push({ game_number: 2, start_seconds: parseSeconds(editTimeStrings.game2Start) });
    }
    if (editTimeStrings.game3Start.trim()) {
      games.push({ game_number: 3, start_seconds: parseSeconds(editTimeStrings.game3Start) });
    }

    // Extract videoId from URL if changed
    const videoIdMatch = editForm.youtube_url?.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    const videoId = videoIdMatch ? videoIdMatch[1] : editForm.youtube_video_id || '';

    return {
      ...editForm,
      youtube_video_id: videoId,
      match_start_seconds: startSecs,
      games,
    };
  };

  // Save changes to pending submission without publishing yet
  const handleSaveEditsOnly = async (submissionId: string) => {
    const payload = getCompiledEditPayload();
    if (!payload) return;

    setProcessingId(submissionId);
    setMessage(null);
    try {
      await updateSubmissionDataAction(submissionId, payload);
      // Update local submissions state
      setSubmissions((prev) =>
        prev.map((s) => {
          if (s.id === submissionId) {
            const tourneyName =
              tournaments.find((t) => t.id === payload.tournament_id)?.name ||
              payload.tournament_id;
            return {
              ...s,
              match_data: payload,
              tournament: { name: tourneyName },
            };
          }
          return s;
        })
      );
      cancelEditing();
      setMessage({ text: 'Submission details updated successfully.', type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update submission.';
      setMessage({ text: msg, type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  // Approve & Publish (either original or with active edits)
  const handleApprove = async (submissionId: string, customData?: PendingSubmissionRecord['match_data']) => {
    setProcessingId(submissionId);
    setMessage(null);
    try {
      const payloadToPublish = customData || (editingId === submissionId ? getCompiledEditPayload() || undefined : undefined);
      await approveSubmissionAction(submissionId, payloadToPublish);
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      if (editingId === submissionId) {
        cancelEditing();
      }
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
      if (editingId === submissionId) {
        cancelEditing();
      }
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
            Review, edit, and approve community-submitted stream match timestamps before publishing them live.
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

      {/* Alert notification message */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <Sparkles className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Queue items */}
      <div className="space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>
            Pending Submissions: <strong>{submissions.length}</strong>
          </span>
          {submissions.length > 0 && (
            <span className="text-[11px]">Click &quot;Edit Details&quot; on any card to adjust inaccurate names or timestamps</span>
          )}
        </div>

        {submissions.length > 0 ? (
          submissions.map((sub) => {
            const m = sub.match_data;
            const isProcessing = processingId === sub.id;
            const isEditing = editingId === sub.id;

            // Render Inline Editor for this submission
            if (isEditing && editForm) {
              return (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-slate-900 border-2 border-red-500/50 dark:border-red-500/40 rounded-2xl p-6 shadow-md space-y-6"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400">
                        <Pencil className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Edit Match Submission Values
                        </h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Fix any errors in tournament, players, archetypes, or timestamps before publishing.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={isProcessing}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                      title="Cancel Edit"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Edit Form Body */}
                  <div className="space-y-5 text-xs">
                    {/* Section 1: Tournament & Event Info */}
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-red-500" />
                        <span>Tournament & Round Info</span>
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Tournament
                          </label>
                          <select
                            value={editForm.tournament_id}
                            onChange={(e) => setEditForm({ ...editForm, tournament_id: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                          >
                            {tournaments.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                            {/* If current tournament_id isn't in tournaments list, keep it visible */}
                            {editForm.tournament_id &&
                              !tournaments.some((t) => t.id === editForm.tournament_id) && (
                                <option value={editForm.tournament_id}>{editForm.tournament_id}</option>
                              )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Division
                          </label>
                          <select
                            value={editForm.division || 'masters'}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                division: e.target.value as 'masters' | 'seniors' | 'juniors',
                              })
                            }
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                          >
                            <option value="masters">Masters</option>
                            <option value="seniors">Seniors</option>
                            <option value="juniors">Juniors</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Round Name
                          </label>
                          <input
                            type="text"
                            value={editForm.round_name}
                            onChange={(e) => setEditForm({ ...editForm, round_name: e.target.value })}
                            placeholder="Swiss Round 1"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Table Number (Optional)
                          </label>
                          <input
                            type="number"
                            value={editForm.table_number || ''}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                table_number: e.target.value ? parseInt(e.target.value, 10) : null,
                              })
                            }
                            placeholder="e.g. 1"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Players & Archetypes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Player 1 */}
                      <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                        <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                          <Users className="w-3.5 h-3.5" />
                          <span>Player 1</span>
                        </span>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={editForm.player1_name}
                              onChange={(e) => setEditForm({ ...editForm, player1_name: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Country
                            </label>
                            <input
                              type="text"
                              maxLength={3}
                              value={editForm.player1_country || ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, player1_country: e.target.value.toUpperCase() })
                              }
                              placeholder="US"
                              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium uppercase font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-red-500" />
                            <span>Deck Archetype</span>
                          </label>
                          <select
                            value={editForm.player1_deck_archetype}
                            onChange={(e) => setEditForm({ ...editForm, player1_deck_archetype: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                          >
                            {sortedArchetypes.map((a) => (
                              <option key={a.identifier} value={a.identifier}>
                                {a.name}
                              </option>
                            ))}
                            {editForm.player1_deck_archetype &&
                              !sortedArchetypes.some((a) => a.identifier === editForm.player1_deck_archetype) && (
                                <option value={editForm.player1_deck_archetype}>
                                  {editForm.player1_deck_archetype}
                                </option>
                              )}
                          </select>
                        </div>
                      </div>

                      {/* Player 2 */}
                      <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                        <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                          <Users className="w-3.5 h-3.5" />
                          <span>Player 2</span>
                        </span>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={editForm.player2_name}
                              onChange={(e) => setEditForm({ ...editForm, player2_name: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Country
                            </label>
                            <input
                              type="text"
                              maxLength={3}
                              value={editForm.player2_country || ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, player2_country: e.target.value.toUpperCase() })
                              }
                              placeholder="UK"
                              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium uppercase font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-red-500" />
                            <span>Deck Archetype</span>
                          </label>
                          <select
                            value={editForm.player2_deck_archetype}
                            onChange={(e) => setEditForm({ ...editForm, player2_deck_archetype: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                          >
                            {sortedArchetypes.map((a) => (
                              <option key={a.identifier} value={a.identifier}>
                                {a.name}
                              </option>
                            ))}
                            {editForm.player2_deck_archetype &&
                              !sortedArchetypes.some((a) => a.identifier === editForm.player2_deck_archetype) && (
                                <option value={editForm.player2_deck_archetype}>
                                  {editForm.player2_deck_archetype}
                                </option>
                              )}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: YouTube & Timestamps */}
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-red-500" />
                        <span>YouTube Stream & Game Timestamps</span>
                      </span>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          YouTube Video URL or Video ID
                        </label>
                        <input
                          type="text"
                          value={editForm.youtube_url}
                          onChange={(e) => setEditForm({ ...editForm, youtube_url: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-[11px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Match Start (HH:MM:SS)
                          </label>
                          <input
                            type="text"
                            value={editTimeStrings.matchStart}
                            onChange={(e) =>
                              setEditTimeStrings({ ...editTimeStrings, matchStart: e.target.value })
                            }
                            placeholder="01:23:45"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Game 1 Start
                          </label>
                          <input
                            type="text"
                            value={editTimeStrings.game1Start}
                            onChange={(e) =>
                              setEditTimeStrings({ ...editTimeStrings, game1Start: e.target.value })
                            }
                            placeholder="01:25:00"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Game 2 Start
                          </label>
                          <input
                            type="text"
                            value={editTimeStrings.game2Start}
                            onChange={(e) =>
                              setEditTimeStrings({ ...editTimeStrings, game2Start: e.target.value })
                            }
                            placeholder="01:45:00"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Game 3 Start (if played)
                          </label>
                          <input
                            type="text"
                            value={editTimeStrings.game3Start}
                            onChange={(e) =>
                              setEditTimeStrings({ ...editTimeStrings, game3Start: e.target.value })
                            }
                            placeholder="02:05:00"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Result & Score */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          <span>Winner (Optional)</span>
                        </label>
                        <select
                          value={editForm.winner_player_name || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, winner_player_name: e.target.value || null })
                          }
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                        >
                          <option value="">Undecided / No Spoiler</option>
                          {editForm.player1_name && (
                            <option value={editForm.player1_name}>{editForm.player1_name} (Player 1)</option>
                          )}
                          {editForm.player2_name && (
                            <option value={editForm.player2_name}>{editForm.player2_name} (Player 2)</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Match Score (e.g. 2-0, 2-1)
                        </label>
                        <input
                          type="text"
                          value={editForm.match_score || ''}
                          onChange={(e) => setEditForm({ ...editForm, match_score: e.target.value || null })}
                          placeholder="2-1"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Edit Form Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={cancelEditing}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleSaveEditsOnly(sub.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>Save Changes (Keep Pending)</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApprove(sub.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Approve & Publish Changes</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // Normal Card View (when not editing)
            return (
              <div
                key={sub.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wider block">
                      {sub.tournament?.name || m.tournament_id} • {m.round_name}{' '}
                      {m.table_number ? `(Table ${m.table_number})` : ''}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {m.player1_name} ({m.player1_deck_archetype}) vs {m.player2_name} ({m.player2_deck_archetype})
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      <span>Submitted: {new Date(sub.created_at).toLocaleDateString()}</span>
                      {m.match_score && (
                        <>
                          <span>•</span>
                          <span>
                            Score: <strong>{m.match_score}</strong>
                          </span>
                        </>
                      )}
                      {m.winner_player_name && (
                        <>
                          <span>•</span>
                          <span>
                            Winner: <strong>{m.winner_player_name}</strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => startEditing(sub)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit Details</span>
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApprove(sub.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Approve & Publish</span>
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleReject(sub.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
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
                      <span>
                        Start: <strong>{formatSeconds(m.match_start_seconds)}</strong>
                      </span>
                    </div>

                    {Array.isArray(m.games) && m.games.length > 0 && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                        <span>Games tagged:</span>
                        {m.games.map((g) => (
                          <span
                            key={g.game_number}
                            className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono"
                          >
                            G{g.game_number}: {formatSeconds(g.start_seconds)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <a
                    href={`${m.youtube_url}${m.youtube_url.includes('?') ? '&' : '?'}t=${m.match_start_seconds || 0}s`}
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
