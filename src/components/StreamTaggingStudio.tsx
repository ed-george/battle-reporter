'use client';

import React, { useState } from 'react';
import { Tournament, DeckArchetype } from '@/types/database';
import { POPULAR_ARCHETYPES } from '@/lib/limitless';
import { CheckCircle2, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { submitMatchAction } from '@/app/actions/moderation';

interface StreamTaggingStudioProps {
  tournaments: Tournament[];
  archetypes: DeckArchetype[];
  initialTournamentId?: string;
}

export function StreamTaggingStudio({
  tournaments,
  archetypes = POPULAR_ARCHETYPES,
  initialTournamentId,
}: StreamTaggingStudioProps) {
  const sortedArchetypes = React.useMemo(() => {
    return [...archetypes].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [archetypes]);

  const [tournamentId, setTournamentId] = useState(initialTournamentId || tournaments[0]?.id || '');
  const [roundName, setRoundName] = useState('Swiss Round 1');
  const [division, setDivision] = useState<'masters' | 'seniors' | 'juniors'>('masters');
  const [tableNumber, setTableNumber] = useState<string>('');

  // Players & Decks
  const [player1Name, setPlayer1Name] = useState('');
  const [player1Country, setPlayer1Country] = useState('US');
  const [player1Archetype, setPlayer1Archetype] = useState(
    sortedArchetypes[0]?.identifier || archetypes[0]?.identifier || 'charizard-ex'
  );

  const [player2Name, setPlayer2Name] = useState('');
  const [player2Country, setPlayer2Country] = useState('UK');
  const [player2Archetype, setPlayer2Archetype] = useState(
    sortedArchetypes[1]?.identifier || archetypes[1]?.identifier || 'gardevoir-ex'
  );

  // Video & Timestamps
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [matchStart, setMatchStart] = useState('00:00:00');
  const [game1Start, setGame1Start] = useState('');
  const [game2Start, setGame2Start] = useState('');
  const [game3Start, setGame3Start] = useState('');

  // Result
  const [winnerName, setWinnerName] = useState('');
  const [matchScore, setMatchScore] = useState('2-1');

  // State
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive video ID directly from YouTube URL
  const videoIdMatch = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  const videoId = videoIdMatch ? videoIdMatch[1] : '';

  // Convert HH:MM:SS or MM:SS to seconds
  const parseSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number(timeStr) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tournamentId) {
      setError('Please select a tournament.');
      return;
    }
    if (!player1Name.trim() || !player2Name.trim()) {
      setError('Please enter both Player 1 and Player 2 names.');
      return;
    }
    if (!videoId) {
      setError('Please provide a valid YouTube video URL or ID.');
      return;
    }

    // Prepare submission
    const startSecs = parseSeconds(matchStart);
    const games = [];
    if (game1Start) {
      games.push({ game_number: 1, start_seconds: parseSeconds(game1Start) });
    }
    if (game2Start) {
      games.push({ game_number: 2, start_seconds: parseSeconds(game2Start) });
    }
    if (game3Start) {
      games.push({ game_number: 3, start_seconds: parseSeconds(game3Start) });
    }

    const payload = {
      tournament_id: tournamentId,
      round_name: roundName,
      division,
      table_number: tableNumber ? parseInt(tableNumber, 10) : null,
      player1_name: player1Name,
      player1_country: player1Country,
      player1_deck_archetype: player1Archetype,
      player2_name: player2Name,
      player2_country: player2Country,
      player2_deck_archetype: player2Archetype,
      youtube_url: youtubeUrl,
      youtube_video_id: videoId,
      match_start_seconds: startSecs,
      winner_player_name: winnerName || null,
      match_score: matchScore || null,
      games,
    };

    setIsSubmitting(true);
    try {
      await submitMatchAction(payload);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit match. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Match Submitted for Review!</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Thank you for contributing to the archive! Your match timestamp submission for{' '}
          <strong>{player1Name} vs {player2Name}</strong> has been submitted to the moderation queue.
        </p>
        <div className="pt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setPlayer1Name('');
              setPlayer2Name('');
              setYoutubeUrl('');
            }}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Tag Another Match
          </button>
          <a
            href="/matches"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Go to Matches Explorer
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Assisted Tagging Studio</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Tag a Stream Match
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Add YouTube broadcast timestamps to archive a tournament match with game accuracy.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Tournament & Round */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            1. Event & Round Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tournament</label>
              <select
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Round / Stage</label>
              <input
                type="text"
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                placeholder="e.g. Swiss Round 5, Top 8, Finals"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Division</label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value as 'masters')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
              >
                <option value="masters">Masters Division</option>
                <option value="seniors">Seniors Division</option>
                <option value="juniors">Juniors Division</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Feature Table Number (Optional)</label>
              <input
                type="number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. 3001"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Players & Decks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            2. Matchup & Archetypes
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Player 1 */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-black uppercase text-red-600 dark:text-red-400 block">Player 1</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={player1Name}
                    onChange={(e) => setPlayer1Name(e.target.value)}
                    placeholder="e.g. Tord Reklev"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Country</label>
                  <input
                    type="text"
                    value={player1Country}
                    onChange={(e) => setPlayer1Country(e.target.value.toUpperCase())}
                    placeholder="US"
                    maxLength={3}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Deck Archetype</label>
                <select
                  value={player1Archetype}
                  onChange={(e) => setPlayer1Archetype(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
                >
                  {sortedArchetypes.map((a) => (
                    <option key={a.identifier} value={a.identifier}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Player 2 */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-black uppercase text-red-600 dark:text-red-400 block">Player 2</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={player2Name}
                    onChange={(e) => setPlayer2Name(e.target.value)}
                    placeholder="e.g. Vance Kelley"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Country</label>
                  <input
                    type="text"
                    value={player2Country}
                    onChange={(e) => setPlayer2Country(e.target.value.toUpperCase())}
                    placeholder="UK"
                    maxLength={3}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Deck Archetype</label>
                <select
                  value={player2Archetype}
                  onChange={(e) => setPlayer2Archetype(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
                >
                  {sortedArchetypes.map((a) => (
                    <option key={a.identifier} value={a.identifier}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: YouTube Broadcast Video & Timestamps */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            3. YouTube Broadcast Video & Timestamps
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">YouTube Stream URL or Video ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=F08674E6tO8"
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-mono font-medium"
                />
              </div>
            </div>

            {/* Live Video Scrubber Preview */}
            {videoId && (
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner border border-slate-300 dark:border-slate-700">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                  title="YouTube Preview"
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              </div>
            )}

            {/* Timestamps Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Match Start (HH:MM:SS)</label>
                <input
                  type="text"
                  value={matchStart}
                  onChange={(e) => setMatchStart(e.target.value)}
                  placeholder="01:23:45"
                  className="w-full px-3 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Game 1 Start</label>
                <input
                  type="text"
                  value={game1Start}
                  onChange={(e) => setGame1Start(e.target.value)}
                  placeholder="01:25:10"
                  className="w-full px-3 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Game 2 Start</label>
                <input
                  type="text"
                  value={game2Start}
                  onChange={(e) => setGame2Start(e.target.value)}
                  placeholder="01:42:00"
                  className="w-full px-3 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Game 3 Start (Optional)</label>
                <input
                  type="text"
                  value={game3Start}
                  onChange={(e) => setGame3Start(e.target.value)}
                  placeholder="01:58:30"
                  className="w-full px-3 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Result & Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            4. Match Outcome (Protected by Spoiler Shield)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Match Winner</label>
              <select
                value={winnerName}
                onChange={(e) => setWinnerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
              >
                <option value="">Unrevealed / Tie</option>
                {player1Name && <option value={player1Name}>{player1Name} (Player 1)</option>}
                {player2Name && <option value={player2Name}>{player2Name} (Player 2)</option>}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Match Score</label>
              <input
                type="text"
                value={matchScore}
                onChange={(e) => setMatchScore(e.target.value)}
                placeholder="2-1, 2-0, 1-1"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting for Review...</span>
              </>
            ) : (
              <span>Submit Match for Moderation</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
