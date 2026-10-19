-- ==============================================================================
-- Stream Matches Import Script (Generated from matches_template.csv)
-- Rows converted: 3
-- Run this script in your Supabase SQL Editor.
-- ==============================================================================

INSERT INTO public.streamed_matches (
  tournament_id,
  round_name,
  division,
  table_number,
  player1_name,
  player1_country,
  player1_deck_archetype,
  player2_name,
  player2_country,
  player2_deck_archetype,
  youtube_url,
  youtube_video_id,
  match_start_seconds,
  match_end_seconds,
  winner_player_name,
  match_score,
  is_published
)
VALUES
  ('1000001', 'Swiss Round 1', 'masters', 1, 'Dylan Kasturi', 'US', 'charizard-ex-pidgeot', 'James Kowalski', 'US', 'gardevoir-ex', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 930, 3500, 'Dylan Kasturi', '2-1', TRUE),
  ('1000001', 'Top 8', 'masters', 2, 'Kenji O.', 'US', 'miraidon-ex', 'Caleb F.', 'US', 'raging-bolt-ex-ogerpon', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 6300, 9015, 'Kenji O.', '2-0', TRUE),
  ('1000002', 'Finals', 'masters', 1, 'Andrew Hedrick', 'US', 'lugia-vstar-archeops', 'Jesse Parker', 'US', 'dragapult-ex', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 11700, 14700, 'Andrew Hedrick', '2-1', TRUE);

