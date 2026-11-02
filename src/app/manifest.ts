import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Battle Reporter — Pokémon TCG Stream Match Archive',
    short_name: 'Battle Reporter',
    description: 'Search and watch official Pokémon Trading Card Game broadcast stream matches from YouTube',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#dc2626',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
