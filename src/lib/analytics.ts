/**
 * Google Analytics (gtag.js) tracking helper
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_ID || 'G-SB5QDH746M';

/**
 * Sends a raw custom event to Google Analytics
 */
export function trackEvent(
  action: string,
  params?: Record<string, string | number | boolean | null | undefined>
) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', action, params);
  }
}

/**
 * Semantic event tracking helpers
 */
export const analytics = {
  // Navigation & Search
  search: (
    searchTerm: string,
    location: 'navbar' | 'matches_explorer' | 'archetypes' | 'players'
  ) => {
    trackEvent('search', {
      search_term: searchTerm,
      location,
    });
  },

  selectTournament: (
    tournamentId: string,
    tournamentName?: string,
    season?: string
  ) => {
    trackEvent('select_tournament', {
      tournament_id: tournamentId,
      tournament_name: tournamentName,
      season,
    });
  },

  selectMatch: (
    matchId: string,
    tournamentId?: string,
    roundName?: string
  ) => {
    trackEvent('select_match', {
      match_id: matchId,
      tournament_id: tournamentId,
      round_name: roundName,
    });
  },

  // Video Theater & Game Jump Bar
  matchSeek: (matchId: string, target: string, seconds: number) => {
    trackEvent('match_seek', {
      match_id: matchId,
      target,
      seconds,
    });
  },

  openYouTubeExternal: (videoId: string, timestamp: number) => {
    trackEvent('open_youtube_external', {
      video_id: videoId,
      timestamp,
    });
  },

  // Spoiler Protections
  toggleSpoilers: (spoilersHidden: boolean, source?: string) => {
    trackEvent('toggle_spoilers', {
      spoilers_hidden: spoilersHidden,
      source: source || 'global',
    });
  },

  revealMatchSpoiler: (matchId: string, tournamentId?: string) => {
    trackEvent('reveal_match_spoiler', {
      match_id: matchId,
      tournament_id: tournamentId,
    });
  },

  // Directory Filters & View Preferences
  filterSeason: (season: string, category: 'archetypes' | 'players') => {
    trackEvent('filter_season', {
      season,
      category,
    });
  },

  changeViewMode: (viewMode: string, category: 'archetypes' | 'players') => {
    trackEvent('change_view_mode', {
      view_mode: viewMode,
      category,
    });
  },

  sortDirectory: (sortField: string, category: 'archetypes' | 'players') => {
    trackEvent('sort_directory', {
      sort_field: sortField,
      category,
    });
  },

  filterMatches: (filters: {
    tournamentId?: string;
    archetype?: string;
    player?: string;
  }) => {
    trackEvent('filter_matches', {
      tournament_id: filters.tournamentId || 'all',
      archetype: filters.archetype || 'all',
      player: filters.player || '',
    });
  },

  // External Links
  externalLinkClick: (destination: string, details?: Record<string, string>) => {
    trackEvent('external_link_click', {
      destination,
      ...details,
    });
  },
};
