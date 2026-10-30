-- ==============================================================================
-- Migration: Remove In-App Admin & Submissions Functionality
-- Date: October 29, 2026
-- 
-- Summary:
-- 1. Safely archives existing submissions to a backup table and drops public.submissions.
-- 2. Removes permissive "Admins manage..." RLS policies.
-- 3. Revokes all INSERT/UPDATE/DELETE permissions from client-facing roles (anon, authenticated).
-- 4. Ensures strict read-only access for web visitors (all writes occur via service_role CLI).
-- 5. Strengthens tournament foreign key on streamed_matches to ON DELETE RESTRICT.
-- ==============================================================================

-- 1. Backup existing submissions if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'submissions') THEN
    CREATE TABLE IF NOT EXISTS public.submissions_backup_archive AS 
      SELECT * FROM public.submissions;
  END IF;
END $$;

-- 2. Drop submissions table and its associated indexes and policies
DROP POLICY IF EXISTS "Public insert submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users read own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Authenticated users submit" ON public.submissions;
DROP POLICY IF EXISTS "Admins manage submissions" ON public.submissions;
DROP TABLE IF EXISTS public.submissions CASCADE;

-- 3. Remove open/insecure admin RLS policies from streamed_matches and match_games
DROP POLICY IF EXISTS "Admins manage streamed matches" ON public.streamed_matches;
DROP POLICY IF EXISTS "Admins manage match games" ON public.match_games;

-- 4. Re-assert strict read-only RLS policies for public visitors
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streamed_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published matches" ON public.streamed_matches;
CREATE POLICY "Public read published matches" 
  ON public.streamed_matches 
  FOR SELECT 
  USING (is_published = true);

DROP POLICY IF EXISTS "Public read match games" ON public.match_games;
CREATE POLICY "Public read match games" 
  ON public.match_games 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Public read tournaments" ON public.tournaments;
CREATE POLICY "Public read tournaments" 
  ON public.tournaments 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Public read archetypes" ON public.deck_archetypes;
CREATE POLICY "Public read archetypes" 
  ON public.deck_archetypes 
  FOR SELECT 
  USING (true);

-- 5. Revoke write permissions from PostgREST roles (anon and authenticated)
-- Only Supabase service_role / direct DB admin can write data
REVOKE ALL ON TABLE public.tournaments FROM anon, authenticated;
REVOKE ALL ON TABLE public.deck_archetypes FROM anon, authenticated;
REVOKE ALL ON TABLE public.streamed_matches FROM anon, authenticated;
REVOKE ALL ON TABLE public.match_games FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.tournaments TO anon, authenticated;
GRANT SELECT ON public.deck_archetypes TO anon, authenticated;
GRANT SELECT ON public.streamed_matches TO anon, authenticated;
GRANT SELECT ON public.match_games TO anon, authenticated;

-- Ensure default privileges only grant SELECT for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;

-- 6. Harden tournament foreign key constraint against accidental cascading wipes
ALTER TABLE public.streamed_matches
  DROP CONSTRAINT IF EXISTS streamed_matches_tournament_id_fkey,
  ADD CONSTRAINT streamed_matches_tournament_id_fkey
    FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE RESTRICT;
