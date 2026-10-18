export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Tournament {
  id: string; // PokeData tournament ID, e.g. "1000017"
  name: string;
  season?: string;
  start_date: string;
  end_date: string;
  location?: string;
  region?: string;
  rk9_link?: string;
  decklists_count?: number;
  total_players?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeckArchetype {
  identifier: string; // e.g. "charizard-ex-pidgeot", "gardevoir-ex"
  name: string;
  icons: string[];
  priority?: number;
  cards?: {
    name: string;
    count?: string | number;
    set?: string;
  }[];
  variants?: {
    identifier: string;
    name: string;
    icon?: string;
    cards?: { name: string; count?: string | number }[];
  }[];
}

export interface MatchGame {
  id: string;
  match_id: string;
  game_number: number; // 1, 2, 3
  start_seconds: number;
  winner_player_id?: string | null;
}

export interface StreamedMatch {
  id: string;
  tournament_id: string;
  round_name: string; // e.g. "Swiss Round 5", "Top 8", "Finals"
  division: 'masters' | 'seniors' | 'juniors';
  table_number?: number | null;
  
  player1_name: string;
  player1_country?: string | null;
  player1_deck_archetype: string;
  player1_decklist?: string[] | null; // e.g. ["2 MEG 86", "4 PAF 235"]
  
  player2_name: string;
  player2_country?: string | null;
  player2_deck_archetype: string;
  player2_decklist?: string[] | null;
  
  youtube_url: string;
  youtube_video_id: string;
  match_start_seconds: number;
  match_end_seconds?: number | null;
  
  winner_player_name?: string | null;
  match_score?: string | null; // e.g. "2-1", "2-0"
  
  is_published: boolean;
  submitted_by?: string | null;
  created_at: string;
  
  games?: MatchGame[];
  tournament?: Tournament;
}

export interface Submission {
  id: string;
  match_data: Omit<StreamedMatch, 'id' | 'created_at' | 'is_published'>;
  submitted_by: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}
