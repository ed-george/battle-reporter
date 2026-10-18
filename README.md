# Battle Reporter — Pokémon TCG Stream Match Archive

Inspired by [Limitless TCG](https://labs.limitlesstcg.com/), **Battle Reporter** is a community-driven web archive for competitive Pokémon Trading Card Game stream broadcast matches.

Players, spectators, and casters can browse premier tournaments, search for matches by player or deck archetype, jump to specific games with timestamp accuracy, and enjoy default-on spoiler protection.

---

## 🌟 Key Features

1. **Tournament-Centric Directory**:
   - Live tournament metadata auto-synced from [PokeData.ovh](https://www.pokedata.ovh/apiv3/help).
   - Events grouped chronologically by season and year.
   - Direct links to official RK9 pairings and roster sheets.

2. **Dedicated Cinema-Mode Match Theater (`/match/[id]`)**:
   - Embedded responsive YouTube player starting at the exact broadcast moment.
   - **Game Jump Bar**: One-click jump buttons for **Match Start**, **Game 1**, **Game 2**, and **Game 3**.
   - **Spoiler Shield**: Default-on protection hiding match winners, final scores, and sweep spoilers until explicitly toggled.
   - **Interactive 60-Card Decklists**: Visual grid of registered cards with one-click **"Copy for Pokémon TCG Live"** (PTCGL format export).

3. **Multi-Filter Stream Match Explorer (`/matches`)**:
   - Instant search across player names, deck archetypes, and tournaments.
   - Filter by tournament dropdown or quick archetype pills.

4. **Dedicated Entity Hubs**:
   - **Player Profiles (`/player/[slug]`)**: Track any player's stream appearances, match record, win rate on stream, and deck history.
   - **Archetype Pages (`/archetype/[slug]`)**: Explore archetype statistics, official Limitless sprite icons, and recorded stream games.

5. **Assisted Contributor Tagging Studio (`/submit`)**:
   - Autocompletes pairings, table numbers, and suggested archetypes from PokeData + Limitless Play API.
   - Embedded YouTube video preview with timestamp capture.
   - Admin moderation queue (`/admin/moderation`) for approving community submissions.

---

## 🛠️ Tech Stack & Integrations

- **Framework**: Next.js 15+ (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS + Lucide React Icons
- **Database**: Supabase PostgreSQL with Row Level Security (migration provided in `supabase/migrations/`)
- **APIs**:
  - [PokeData.ovh API](https://www.pokedata.ovh/apiv3/help): Tournaments, divisions, standings, and decklists.
  - [Limitless TCG Play API](https://docs.limitlesstcg.com/developer/games.html): Canonical deck definitions, card matching rules, and sprite icon identifiers.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (Optional)
Create `.env.local` if you wish to configure live Limitless API keys or Supabase:
```env
# Optional: Limitless TCG Play API Key
LIMITLESS_API_KEY=your_key_here

# Optional: Supabase Credentials (app falls back seamlessly to local seed data if not configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Sync Live Data (PokeData & Limitless)
To refresh the tournament index from PokeData and archetypes from Limitless:
```bash
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🗄️ Database Setup (Supabase)

To connect your Supabase database:
1. Create a project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Paste the contents of [`supabase/migrations/20261018_initial_schema.sql`](file:///Users/ehg/projs/battle-reporter/supabase/migrations/20261018_initial_schema.sql) and execute.
4. Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.

---

## 📄 License & Attribution

An open-source community archive project. All Pokémon TCG broadcast and intellectual property rights belong to **The Pokémon Company International** and official event broadcasters.
