-- ==============================================================================
-- Migration: Ensure Admin Permissions and RLS Policies for Publishing Matches
-- Run this in your Supabase SQL Editor if you encounter permission errors when
-- approving submissions or publishing stream matches.
-- ==============================================================================

-- 1. Ensure Table Privileges for PostgREST
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.tournaments TO anon, authenticated;
GRANT SELECT ON public.deck_archetypes TO anon, authenticated;
GRANT SELECT ON public.streamed_matches TO anon, authenticated;
GRANT SELECT ON public.match_games TO anon, authenticated;
GRANT SELECT, INSERT ON public.submissions TO anon, authenticated;

-- Full table management privileges for authenticated users (admins/moderators)
GRANT ALL ON public.submissions TO authenticated;
GRANT ALL ON public.streamed_matches TO authenticated;
GRANT ALL ON public.match_games TO authenticated;
GRANT ALL ON public.tournaments TO authenticated;
GRANT ALL ON public.deck_archetypes TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;

-- 2. Ensure RLS is active on all core tables
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streamed_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 3. Idempotently configure Submissions policies
DROP POLICY IF EXISTS "Public insert submissions" ON public.submissions;
CREATE POLICY "Public insert submissions" ON public.submissions FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users read own submissions" ON public.submissions;
CREATE POLICY "Users read own submissions" ON public.submissions FOR SELECT TO authenticated USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Admins manage submissions" ON public.submissions;
CREATE POLICY "Admins manage submissions" ON public.submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Idempotently configure Streamed Matches policies
DROP POLICY IF EXISTS "Public read published matches" ON public.streamed_matches;
CREATE POLICY "Public read published matches" ON public.streamed_matches FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Admins manage streamed matches" ON public.streamed_matches;
CREATE POLICY "Admins manage streamed matches" ON public.streamed_matches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Idempotently configure Match Games policies
DROP POLICY IF EXISTS "Public read match games" ON public.match_games;
CREATE POLICY "Public read match games" ON public.match_games FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage match games" ON public.match_games;
CREATE POLICY "Admins manage match games" ON public.match_games FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Ensure tournament date columns are nullable in case of unannounced tournaments
ALTER TABLE public.tournaments ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE public.tournaments ALTER COLUMN end_date DROP NOT NULL;
