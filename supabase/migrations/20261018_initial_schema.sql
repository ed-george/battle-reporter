-- Initial Schema for Pokémon TCG Stream Match Archive

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tournaments Table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id TEXT PRIMARY KEY, -- PokeData ID (e.g. 1000017)
    name TEXT NOT NULL,
    season TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location TEXT,
    region TEXT,
    rk9_link TEXT,
    decklists_count INTEGER DEFAULT 0,
    total_players INTEGER DEFAULT 0,
    status TEXT DEFAULT 'finished',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Deck Archetypes Table
CREATE TABLE IF NOT EXISTS public.deck_archetypes (
    identifier TEXT PRIMARY KEY, -- e.g. "charizard-ex-pidgeot"
    name TEXT NOT NULL,
    icons JSONB DEFAULT '[]'::jsonb,
    priority INTEGER DEFAULT 10,
    cards JSONB DEFAULT '[]'::jsonb,
    variants JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Streamed Matches Table
CREATE TABLE IF NOT EXISTS public.streamed_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id TEXT REFERENCES public.tournaments(id) ON DELETE CASCADE,
    round_name TEXT NOT NULL,
    division TEXT NOT NULL DEFAULT 'masters',
    table_number INTEGER,
    
    player1_name TEXT NOT NULL,
    player1_country TEXT,
    player1_deck_archetype TEXT,
    player1_decklist JSONB,
    
    player2_name TEXT NOT NULL,
    player2_country TEXT,
    player2_deck_archetype TEXT,
    player2_decklist JSONB,
    
    youtube_url TEXT NOT NULL,
    youtube_video_id TEXT NOT NULL,
    match_start_seconds INTEGER NOT NULL,
    match_end_seconds INTEGER,
    
    winner_player_name TEXT,
    match_score TEXT,
    
    is_published BOOLEAN DEFAULT TRUE,
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Match Games (per-game timestamps)
CREATE TABLE IF NOT EXISTS public.match_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES public.streamed_matches(id) ON DELETE CASCADE,
    game_number INTEGER NOT NULL, -- 1, 2, 3
    start_seconds INTEGER NOT NULL,
    winner_player_name TEXT
);

-- 6. Submissions Moderation Queue
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_data JSONB NOT NULL,
    submitted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    review_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 7. Indexes for Fast Filtering & Search
CREATE INDEX IF NOT EXISTS idx_streamed_matches_tournament ON public.streamed_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_streamed_matches_player1 ON public.streamed_matches(player1_name);
CREATE INDEX IF NOT EXISTS idx_streamed_matches_player2 ON public.streamed_matches(player2_name);
CREATE INDEX IF NOT EXISTS idx_streamed_matches_archetype1 ON public.streamed_matches(player1_deck_archetype);
CREATE INDEX IF NOT EXISTS idx_streamed_matches_archetype2 ON public.streamed_matches(player2_deck_archetype);
CREATE INDEX IF NOT EXISTS idx_match_games_match_id ON public.match_games(match_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);

-- 8. Row Level Security (RLS)
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streamed_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Public can read all tournaments, archetypes, published matches, and games
CREATE POLICY "Public read tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Public read archetypes" ON public.deck_archetypes FOR SELECT USING (true);
CREATE POLICY "Public read published matches" ON public.streamed_matches FOR SELECT USING (is_published = true);
CREATE POLICY "Public read match games" ON public.match_games FOR SELECT USING (true);

-- Authenticated users can insert submissions
CREATE POLICY "Authenticated users submit" ON public.submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Users read own submissions" ON public.submissions FOR SELECT TO authenticated USING (auth.uid() = submitted_by);
