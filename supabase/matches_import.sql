-- ==============================================================================
-- Stream Matches & Games Import Script (Generated from matches_template.csv)
-- Matches: 3 | Individual Games: 8
-- Run this script in your Supabase SQL Editor.
-- ==============================================================================

-- Optional: Clear existing stream matches and games before importing new batch
TRUNCATE TABLE public.match_games, public.streamed_matches CASCADE;

-- 1. Insert Stream Matches
INSERT INTO public.streamed_matches (
  id,
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
  ('4f65f212-7e91-4e57-ba61-0f65593764d4', '1000001', 'Swiss Round 1', 'masters', 1, 'Dylan Kasturi', 'US', 'charizard-ex-pidgeot', 'James Kowalski', 'US', 'gardevoir-ex', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 930, 3500, 'Dylan Kasturi', '2-1', TRUE),
  ('b8e9d52a-264d-4fb6-9f82-89ebae316ba0', '1000001', 'Top 8', 'masters', 2, 'Kenji O.', 'US', 'miraidon-ex', 'Caleb F.', 'US', 'raging-bolt-ex-ogerpon', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 6300, 9015, 'Kenji O.', '2-0', TRUE),
  ('34ba2b9a-c4c9-4acc-aa5e-a33bf06c3af2', '1000002', 'Finals', 'masters', 1, 'Andrew Hedrick', 'US', 'lugia-vstar-archeops', 'Jesse Parker', 'US', 'dragapult-ex', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 11700, 14700, 'Andrew Hedrick', '2-1', TRUE);

-- 2. Insert Game Timestamps (Game 1, Game 2, Game 3)
INSERT INTO public.match_games (
  match_id,
  game_number,
  start_seconds
)
VALUES
  ('4f65f212-7e91-4e57-ba61-0f65593764d4', 1, 960),
  ('4f65f212-7e91-4e57-ba61-0f65593764d4', 2, 1935),
  ('4f65f212-7e91-4e57-ba61-0f65593764d4', 3, 2760),
  ('b8e9d52a-264d-4fb6-9f82-89ebae316ba0', 1, 6370),
  ('b8e9d52a-264d-4fb6-9f82-89ebae316ba0', 2, 7725),
  ('34ba2b9a-c4c9-4acc-aa5e-a33bf06c3af2', 1, 11790),
  ('34ba2b9a-c4c9-4acc-aa5e-a33bf06c3af2', 2, 12900),
  ('34ba2b9a-c4c9-4acc-aa5e-a33bf06c3af2', 3, 13880);

