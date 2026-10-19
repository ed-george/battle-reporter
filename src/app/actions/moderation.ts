'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkIsAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface PendingSubmissionRecord {
  id: string;
  match_data: {
    tournament_id: string;
    round_name: string;
    division?: 'masters' | 'seniors' | 'juniors';
    table_number?: number | null;
    player1_name: string;
    player1_country?: string | null;
    player1_deck_archetype: string;
    player1_decklist?: string[] | null;
    player2_name: string;
    player2_country?: string | null;
    player2_deck_archetype: string;
    player2_decklist?: string[] | null;
    youtube_url: string;
    youtube_video_id: string;
    match_start_seconds: number;
    match_end_seconds?: number | null;
    winner_player_name?: string | null;
    match_score?: string | null;
    games?: {
      game_number: number;
      start_seconds: number;
      winner_player_name?: string | null;
    }[];
  };
  submitted_by?: string | null;
  status: string;
  created_at: string;
  tournament?: {
    name: string;
  } | null;
}

/**
 * Public/Community Action: Submit a match timestamp for review
 */
export async function submitMatchAction(matchData: PendingSubmissionRecord['match_data']) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  // Get current user if signed in (optional for anonymous submitters)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('submissions')
    .insert({
      match_data: matchData,
      submitted_by: user?.id || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating match submission:', error);
    throw new Error(`Failed to submit match: ${error.message}`);
  }

  return { success: true, submissionId: data.id };
}

/**
 * Admin Action: Fetch all pending submissions
 */
export async function getPendingSubmissionsAction(): Promise<PendingSubmissionRecord[]> {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required.');
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }

  // Fetch tournament names for display
  const tournamentIds = Array.from(new Set((data || []).map((s) => s.match_data?.tournament_id).filter(Boolean)));
  const tournamentMap = new Map<string, string>();

  if (tournamentIds.length > 0) {
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('id, name')
      .in('id', tournamentIds);

    tournaments?.forEach((t) => tournamentMap.set(t.id, t.name));
  }

  return (data || []).map((sub) => ({
    ...sub,
    tournament: sub.match_data?.tournament_id
      ? { name: tournamentMap.get(sub.match_data.tournament_id) || sub.match_data.tournament_id }
      : null,
  })) as PendingSubmissionRecord[];
}

/**
 * Admin Action: Approve a match submission and publish to live archive
 */
export async function approveSubmissionAction(submissionId: string) {
  const { user, isAdmin } = await checkIsAdmin();
  if (!isAdmin || !user) {
    throw new Error('Unauthorized: Admin access required.');
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized.');

  // 1. Fetch submission record
  const { data: submission, error: fetchErr } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (fetchErr || !submission) {
    throw new Error('Submission not found.');
  }

  const m = submission.match_data;

  // 2. Insert into streamed_matches
  const { data: matchRecord, error: matchErr } = await supabase
    .from('streamed_matches')
    .insert({
      tournament_id: m.tournament_id,
      round_name: m.round_name,
      division: m.division || 'masters',
      table_number: m.table_number || null,
      player1_name: m.player1_name,
      player1_country: m.player1_country || null,
      player1_deck_archetype: m.player1_deck_archetype,
      player1_decklist: m.player1_decklist || [],
      player2_name: m.player2_name,
      player2_country: m.player2_country || null,
      player2_deck_archetype: m.player2_deck_archetype,
      player2_decklist: m.player2_decklist || [],
      youtube_url: m.youtube_url,
      youtube_video_id: m.youtube_video_id,
      match_start_seconds: m.match_start_seconds,
      match_end_seconds: m.match_end_seconds || null,
      winner_player_name: m.winner_player_name || null,
      match_score: m.match_score || null,
      is_published: true,
      submitted_by: submission.submitted_by || null,
    })
    .select()
    .single();

  if (matchErr || !matchRecord) {
    console.error('Error publishing match to archive:', matchErr);
    throw new Error(`Failed to publish match: ${matchErr?.message}`);
  }

  // 3. Insert individual games if present
  if (Array.isArray(m.games) && m.games.length > 0) {
    const gamesPayload = m.games.map((g: { game_number: number; start_seconds: number; winner_player_name?: string | null }) => ({
      match_id: matchRecord.id,
      game_number: g.game_number,
      start_seconds: g.start_seconds,
      winner_player_name: g.winner_player_name || null,
    }));

    const { error: gamesErr } = await supabase.from('match_games').insert(gamesPayload);
    if (gamesErr) {
      console.warn('Warning: Could not insert games timestamps:', gamesErr);
    }
  }

  // 4. Update submission status to approved
  const { error: updateErr } = await supabase
    .from('submissions')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', submissionId);

  if (updateErr) {
    console.warn('Warning: Could not update submission status:', updateErr);
  }

  // 5. Revalidate cache
  revalidatePath('/matches');
  revalidatePath('/players');
  revalidatePath('/');
  revalidatePath(`/tournament/${m.tournament_id}`);
  revalidatePath('/admin/moderation');

  return { success: true, matchId: matchRecord.id };
}

/**
 * Admin Action: Reject a submission with optional review notes
 */
export async function rejectSubmissionAction(submissionId: string, reviewNotes?: string) {
  const { user, isAdmin } = await checkIsAdmin();
  if (!isAdmin || !user) {
    throw new Error('Unauthorized: Admin access required.');
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { error } = await supabase
    .from('submissions')
    .update({
      status: 'rejected',
      review_notes: reviewNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', submissionId);

  if (error) {
    throw new Error(`Failed to reject submission: ${error.message}`);
  }

  revalidatePath('/admin/moderation');
  return { success: true };
}
