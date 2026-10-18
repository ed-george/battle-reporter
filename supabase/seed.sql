-- ==========================================
-- 1. Table Grants & Access Privileges
-- ==========================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.tournaments TO anon, authenticated;
GRANT SELECT ON public.deck_archetypes TO anon, authenticated;
GRANT SELECT ON public.streamed_matches TO anon, authenticated;
GRANT SELECT ON public.match_games TO anon, authenticated;
GRANT SELECT, INSERT ON public.submissions TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;

-- Allow public/anon to insert submissions (match tagging)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'Public insert submissions'
  ) THEN
    CREATE POLICY "Public insert submissions" ON public.submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

-- ==========================================
-- 2. Seed Deck Archetypes
-- ==========================================
INSERT INTO public.deck_archetypes (identifier, name, icons, priority)
VALUES
  ('charizard-ex', 'Charizard ex', '["charizard"]'::jsonb, 100),
  ('gardevoir-ex', 'Gardevoir ex', '["gardevoir"]'::jsonb, 95),
  ('dragapult-ex', 'Dragapult ex', '["dragapult"]'::jsonb, 90),
  ('raging-bolt-ogerpon', 'Raging Bolt / Ogerpon', '["raging-bolt","ogerpon-teal"]'::jsonb, 90),
  ('lugia-vstar', 'Lugia Archeops', '["lugia","archeops"]'::jsonb, 85),
  ('regidrago-vstar', 'Regidrago VSTAR', '["regidrago"]'::jsonb, 85),
  ('terapagos-ex', 'Terapagos ex / Dusknoir', '["terapagos-terastal","dusknoir"]'::jsonb, 80),
  ('miraidon-ex', 'Miraidon ex', '["miraidon"]'::jsonb, 80),
  ('gholdengo-ex', 'Gholdengo Palkia', '["gholdengo","palkia-origin"]'::jsonb, 75),
  ('roaring-moon', 'Roaring Moon', '["roaring-moon"]'::jsonb, 75),
  ('iron-thorns-ex', 'Iron Thorns ex', '["iron-thorns"]'::jsonb, 70),
  ('snorlax-stall', 'Snorlax Stall', '["snorlax"]'::jsonb, 70),
  ('mew-vmax', 'Mew VMAX', '["mew"]'::jsonb, 65)
ON CONFLICT (identifier) DO UPDATE SET
  name = EXCLUDED.name,
  icons = EXCLUDED.icons,
  priority = EXCLUDED.priority;

-- ==========================================
-- 3. Seed Tournaments
-- ==========================================
INSERT INTO public.tournaments (id, name, season, start_date, end_date, rk9_link, decklists_count, total_players, status)
VALUES
  ('1000001', '2027 Baltimore Pokémon TCG Regional Championships', '2027 Season', '2026-09-18', '2026-09-20', 'BA001-nEN1xl5ZJLGtFk', 3713, 3122, 'finished'),
  ('1000002', '2026 Pokémon TCG World Championship', '2026 Season', '2026-08-28', '2026-08-30', 'WCS01wI9lfI55wHtvrdy', 1562, 797, 'finished'),
  ('1000003', '2026 North America Pokémon TCG International Championships', '2026 Season', '2026-06-12', '2026-06-14', 'NA01wMo4vxttnwEyqclr', 4522, 3752, 'finished'),
  ('1000004', '2026 Turin Pokémon TCG Special Championships', '2026 Season', '2026-06-06', '2026-06-07', 'TU01w1D52rjGebrE8szS', 2382, 2033, 'finished'),
  ('1000005', '2026 Indianapolis Pokémon TCG Regional Championships', '2026 Season', '2026-05-29', '2026-05-31', 'IN01wT0IVRulcJxVUEZ0', 2425, 1974, 'finished'),
  ('1000006', '2026 Melbourne Pokémon TCG Regional Championships', '2026 Season', '2026-05-23', '2026-05-24', 'MB01wmlUs2CVS0PCE3d9', 1163, 959, 'finished'),
  ('1000007', '2026 Campinas Pokémon TCG Regional Championships', '2026 Season', '2026-05-16', '2026-05-17', 'CA01wQsCrDh1mbLzRAcv', 1992, 1725, 'finished'),
  ('1000008', '2026 Utrecht Pokémon TCG Regional Championships', '2026 Season', '2026-05-16', '2026-05-17', 'UT01wfduzfUrh9rXVkAx', 2505, 2150, 'finished'),
  ('1000009', '2026 Los Angeles Pokémon TCG Regional Championships', '2026 Season', '2026-05-08', '2026-05-10', 'LS01wQe8A4VHbkNmRSRG', 2274, 1849, 'finished'),
  ('1000010', '2026 Prague Pokémon TCG Regional Championships', '2026 Season', '2026-04-25', '2026-04-26', 'PR01w1kJAMjLB09Ftxyj', 1719, 1370, 'finished'),
  ('1000011', '2026 Querétaro Pokémon TCG Regional Championships', '2026 Season', '2026-04-04', '2026-04-05', 'QT01w3mp1uQMDP3jCkOe', 1608, 1446, 'finished'),
  ('1000012', '2026 Orlando Pokémon TCG Regional Championships', '2026 Season', '2026-04-03', '2026-04-05', 'OR01wtIo4gvZNU3UircG', 3251, 2745, 'finished'),
  ('1000013', '2026 Seville Pokémon TCG Special Championships', '2026 Season', '2026-03-28', '2026-03-29', 'SV01wTkt9yQGVSt6nlcu', 1512, 1337, 'finished'),
  ('1000014', '2026 Houston Pokémon TCG Regional Championships', '2026 Season', '2026-03-20', '2026-03-22', 'HO01w20W3tGb1aAsLzwS', 3127, 2635, 'finished'),
  ('1000015', '2026 Curitiba Pokémon TCG Regional Championships', '2026 Season', '2026-03-14', '2026-03-15', 'CU01wDygvn34WEPNJ3ou', 1667, 1449, 'finished'),
  ('1000016', '2026 Seattle Pokémon TCG Regional Championships', '2026 Season', '', '', 'SE01gUuRn8bJqbH9Wnt1', 2712, 2231, 'finished'),
  ('1000017', '2026 Europe Pokémon TCG International Championships', '2026 Season', '2026-02-13', '2026-02-15', 'EU01mU0Z1galE2FATDYs', 4900, 4010, 'finished'),
  ('1000018', '2026 Santiago Pokémon TCG Regional Championships', '2026 Season', '2026-02-07', '2026-02-08', 'ST01bmgM9jIqCvBYdzy3', 1870, 1670, 'finished'),
  ('1000019', '2026 Sydney Pokémon TCG Regional Championships', '2026 Season', '2026-02-07', '2026-02-08', 'SY01X6aiblBgAp8tfhjx', 844, 699, 'finished'),
  ('1000020', '2026 Mérida Pokémon TCG Regional Championships', '2026 Season', '2026-01-24', '2026-01-25', 'ME01wMEKNaLIfrdxmnhb', 1848, 1690, 'finished'),
  ('2024-worlds', '2024 Pokémon TCG World Championship', '2024 Season', '2024-08-16', '2024-08-18', 'WCS012024', 1420, 780, 'finished')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  season = EXCLUDED.season,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  rk9_link = EXCLUDED.rk9_link,
  decklists_count = EXCLUDED.decklists_count,
  total_players = EXCLUDED.total_players,
  status = EXCLUDED.status;

-- ==========================================
-- 4. Seed Streamed Matches & Games
-- ==========================================
INSERT INTO public.streamed_matches (
  id, tournament_id, round_name, division, table_number,
  player1_name, player1_country, player1_deck_archetype, player1_decklist,
  player2_name, player2_country, player2_deck_archetype, player2_decklist,
  youtube_url, youtube_video_id, match_start_seconds, match_end_seconds,
  winner_player_name, match_score, is_published, created_at
) VALUES
  (
    'a0000000-0000-0000-0000-000000000001', '1000017', 'Finals', 'masters', 3001,
    'Edwyn Mesman', 'NL', 'miraidon-ex', '["2 MEG 86","2 MEG 104","1 SSP 76","1 TWM 141","1 MEP 7","1 SFA 38","1 SFA 39","3 PRE 44","1 MEG 88","2 PAR 16","4 PAF 235","4 ASC 183","3 ASC 192","2 PAF 237","7 CRZ 158"]'::jsonb,
    'Drew Stephenson', 'UK', 'lugia-vstar', '["2 MEG 75","2 MEP 4","1 SFA 38","1 MEG 94","4 PAR 252","4 SSP 97","1 BLK 161","4 ASC 183","4 PAF 235","7 CRE 233"]'::jsonb,
    'https://www.youtube.com/watch?v=F08674E6tO8', 'F08674E6tO8', 21740, 25100,
    'Edwyn Mesman', '2-1', true, '2026-02-15T18:00:00Z'
  ),
  (
    'a0000000-0000-0000-0000-000000000002', '1000017', 'Top 4', 'masters', 3001,
    'Liam Halliburton', 'US', 'charizard-ex', '["4 JTG 97","4 JTG 175","2 JTG 26","2 JTG 27","1 JTG 116","1 PRE 4","1 TWM 95","1 SFA 38","4 ASC 192","7 CRZ 158"]'::jsonb,
    'Drew Stephenson', 'UK', 'lugia-vstar', '["2 MEG 75","2 MEP 4","1 SFA 38","1 MEG 94","4 PAR 252","4 SSP 97","1 BLK 161","4 ASC 183","4 PAF 235","7 CRE 233"]'::jsonb,
    'https://www.youtube.com/watch?v=F08674E6tO8', 'F08674E6tO8', 17200, 20450,
    'Drew Stephenson', '2-1', true, '2026-02-15T15:30:00Z'
  ),
  (
    'a0000000-0000-0000-0000-000000000003', '1000017', 'Swiss Round 10', 'masters', 3048,
    'Tord Reklev', 'NO', 'gardevoir-ex', '["2 MEG 88","1 SSP 239","1 MEP 7","2 TWM 112","2 MEG 180","1 SFA 92","3 SFA 72","3 ASC 192","4 PAF 235","6 CRZ 158"]'::jsonb,
    'Makani Tran', 'US', 'raging-bolt-ogerpon', '["3 MEG 58","2 MEG 59","2 PAF 29","3 TWM 95","1 MEW 151","1 JTG 56","1 PRE 42","4 ASC 192","4 PAF 237","8 CRE 232"]'::jsonb,
    'https://www.youtube.com/watch?v=F08674E6tO8', 'F08674E6tO8', 9200, 12100,
    'Makani Tran', '2-0', true, '2026-02-14T14:00:00Z'
  ),
  (
    'a0000000-0000-0000-0000-000000000004', '1000002', 'Finals', 'masters', 1,
    'Andrew Hedrick', 'US', 'charizard-ex', '["3 OBF 125","1 MEW 151","2 PAF 235","4 ASC 183","6 CRZ 153"]'::jsonb,
    'Jesse Parker', 'US', 'dragapult-ex', '["3 TWM 130","1 PRE 72","3 TWM 129","4 ASC 192","5 CRZ 153"]'::jsonb,
    'https://www.youtube.com/watch?v=n-W6e-mK_j0', 'n-W6e-mK_j0', 15400, 18600,
    'Andrew Hedrick', '2-0', true, '2026-08-30T17:00:00Z'
  ),
  (
    'a0000000-0000-0000-0000-000000000005', '2024-worlds', 'Finals', 'masters', 1,
    'Vance Kelley', 'US', 'mew-vmax', '["4 FST 113","3 FST 114","4 FST 255","4 CRZ 158"]'::jsonb,
    'Tord Reklev', 'NO', 'gardevoir-ex', '["2 SVI 86","2 SVI 245","4 SVI 192","8 CRZ 158"]'::jsonb,
    'https://www.youtube.com/watch?v=F08674E6tO8', 'F08674E6tO8', 23000, 26500,
    'Vance Kelley', '2-1', true, '2024-08-18T19:00:00Z'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.match_games (id, match_id, game_number, start_seconds, winner_player_name)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 21980, 'Drew Stephenson'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 2, 23140, 'Edwyn Mesman'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 3, 24200, 'Edwyn Mesman'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 1, 17450, 'Liam Halliburton'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 2, 18560, 'Drew Stephenson'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 3, 19600, 'Drew Stephenson'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 1, 9400, 'Makani Tran'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 2, 10800, 'Makani Tran'),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000004', 1, 15650, 'Andrew Hedrick'),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000004', 2, 17100, 'Andrew Hedrick'),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000005', 1, 23200, 'Vance Kelley'),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000005', 2, 24450, 'Tord Reklev'),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000005', 3, 25500, 'Vance Kelley')
ON CONFLICT (id) DO NOTHING;
