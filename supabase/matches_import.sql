-- ==============================================================================
-- Stream Matches Import Script (Generated from Matches - matches.csv)
-- Rows converted: 8
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
  ('1000075', 'Swiss Round 3', 'masters', NULL, 'Drew Stephenson', 'UK', 'alakazam', 'Konsta Kallama', 'FI', 'dragapault', 'https://www.youtube.com/watch?v=kc2byiqDYYY', 'kc2byiqDYYY', 2795, 4721, 'Konsta Kallama', '2-1', TRUE),
  ('1000075', 'Swiss Round 4', 'masters', NULL, 'Alex Schemanske', 'US', 'festival-lead', 'Christoam Grosu', 'IT', 'dragapault', 'https://www.youtube.com/watch?v=kc2byiqDYYY', 'kc2byiqDYYY', 5348, 8185, 'Alex Schemanske', '2-1', TRUE),
  ('1000075', 'Swiss Round 5', 'masters', NULL, 'Rune Heiremans', 'BE', 'bronzong-tef', 'Max Roberts', 'UK', 'dragapault', 'https://www.youtube.com/watch?v=kc2byiqDYYY', 'kc2byiqDYYY', 9663, 13020, 'Max Roberts', '2-1', TRUE),
  ('1000075', 'Swiss Round 6', 'masters', NULL, 'Brent Tonisson', 'AU', 'dragapault', 'Sander Wojcik', 'NL', 'n-zoroark', 'https://www.youtube.com/watch?v=kc2byiqDYYY', 'kc2byiqDYYY', 14748, 18465, NULL, NULL, TRUE),
  ('1000075', 'Swiss Round 7', 'masters', NULL, 'Vincenzo Seva', 'IT', 'mega-sharpedo-ex', 'John Bioux', 'FR', 'dragapult-blaziken', 'https://www.youtube.com/watch?v=kc2byiqDYYY', 'kc2byiqDYYY', 19756, 22886, 'Vincenzo Seva', '2-1', TRUE),
  ('1000075', 'Swiss Round 8', 'masters', NULL, 'Juho Kallama', 'FI', 'rocket-mewtwo-ex', 'Tomás Malaca', 'PT', 'slowking-scr', 'https://www.youtube.com/watch?v=kc2byiqDYYY', 'kc2byiqDYYY', 24552, 26868, 'Tomás Malaca', '2-0', TRUE),
  ('1000075', 'Swiss Round 8', 'masters', NULL, 'Nicklas Rosu', 'SE', 'festival-lead', 'Yasin Balela', 'UK', 'mega-manectric-ex-meg', 'https://www.youtube.com/watch?v=kc2byiqDYYY', 'kc2byiqDYYY', 27518, 28795, 'Yasin Balela', '2-0', TRUE),
  ('1000075', 'Swiss Round 9', 'masters', NULL, 'Tord Reklev', 'NO', 'dragapault', 'Daniel Magda', 'CZ', 'dragapault', 'https://www.youtube.com/watch?v=kc2byiqDYYY', 'kc2byiqDYYY', 30285, 33250, 'Daniel Magda', '2-0', TRUE);

