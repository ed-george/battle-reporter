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
   - **Limitless TCG Integration**: Direct links to full decklists, archetype statistics, and player profiles on Limitless TCG.

3. **Multi-Filter Stream Match Explorer (`/matches`)**:
   - Instant search across player names, deck archetypes, and tournaments.
   - Filter by tournament dropdown or quick archetype pills.

4. **Dedicated Entity Hubs**:
   - **Stream Players Leaderboard (`/players`)**: Full list of players who have appeared on broadcast streams, ranked by matches played and broadcast wins, with sorting options and Limitless profile links.
   - **Player Profiles (`/player/[slug]`)**: Track any player's stream appearances, match record, win rate on stream, and deck history.
   - **Archetype Pages (`/archetype/[slug]`)**: Explore archetype statistics, official Limitless sprite icons, and recorded stream games.

5. **Assisted Contributor Tagging Studio (`/submit`)**:
   - Autocompletes pairings, table numbers, and suggested archetypes from PokeData + Limitless Play API.
   - Embedded YouTube video preview with timestamp capture.
   - Direct submissions to the moderation queue for review before publishing.

6. **Secured Admin Moderation Queue (`/admin/moderation`)**:
   - Strict role-based authentication using Supabase Auth.
   - Only verified administrators can view pending community submissions.
   - One-click **Approve & Publish** (immediately indexes the match live) or **Reject**.

---

## 🛠️ Tech Stack & Integrations

- **Framework**: Next.js 16 (App Router, React 19, TypeScript, Turbopack)
- **Styling**: Tailwind CSS v4 + Lucide React Icons
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) & Supabase SSR
- **APIs**:
  - [PokeData.ovh API](https://www.pokedata.ovh/apiv3/help): Tournaments, divisions, standings, and decklists.
  - [Limitless TCG Play API](https://docs.limitlesstcg.com/developer/games.html): Canonical deck definitions, card matching rules, and sprite icon identifiers.

---

## 🗄️ Supabase Setup Guide

Follow these steps to configure your Supabase backend and enable the admin moderation workflow:

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Under **Project Settings -> API**, copy your **Project URL** and **anon public key**.

### 2. Configure Environment Variables
Create or update `.env.local` in your project root:

```env
# Supabase Project Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_publishable_key

# Optional: Supabase Service Role Key (recommended for server-side admin publishing)
# Found under Project Settings -> API -> Project API keys -> service_role secret
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret_key

# Limitless TCG Play API Key (for live deck archetypes)
LIMITLESS_API_KEY=your_limitless_api_key

# Administrator Emails (comma-separated list for moderation queue access)
ADMIN_EMAILS=admin@example.com,your-email@example.com
```

### 3. Apply Database Migrations and Grants
1. In your Supabase Dashboard, open the **SQL Editor** from the left navigation.
2. Click **New query**, paste the entire contents of [`supabase/migrations/20261018_initial_schema.sql`](supabase/migrations/20261018_initial_schema.sql), and click **Run**.
   - This provisions all tables (`tournaments`, `deck_archetypes`, `streamed_matches`, `match_games`, `submissions`), sets up indexes, configures Row Level Security (RLS), and executes necessary PostgREST role privileges.
3. Next, paste the contents of [`supabase/seed.sql`](supabase/seed.sql) and click **Run**.
   - This seeds official premier tournaments from PokeData and canonical deck archetypes from Limitless TCG.
   - It leaves `streamed_matches` and `match_games` clean, ready for you to add stream matches.

#### ⚠️ Updating an Existing Database (Permissions & Publishing Fix)
If you already set up your Supabase database previously and encounter errors when clicking **Approve & Publish** (e.g. `permission denied for table streamed_matches` or RLS policy violations):
1. In your Supabase Dashboard, open the **SQL Editor**.
2. Run [`supabase/migrations/20261019_moderation_permissions.sql`](supabase/migrations/20261019_moderation_permissions.sql).
3. This ensures that:
   - Full table grants (`ALL`) on `streamed_matches`, `match_games`, and `submissions` are assigned to `authenticated` users.
   - RLS policies `"Admins manage streamed matches"`, `"Admins manage match games"`, and `"Admins manage submissions"` are configured.
   - You can also optionally set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for direct server-side publishing authority.

### 4. Syncing / Refreshing API Data via CLI
You can refresh tournaments and deck archetypes at any time by running:

```bash
npm run seed
```
This fetches the latest tournaments from PokeData and archetypes from Limitless TCG, and automatically updates your database.

---

## 🛡️ Setting Up Admin Access for Moderation (`/admin/moderation`)

Only authenticated users with administrator privileges can access the moderation queue.

### Step 1: Create an Admin User in Supabase Auth
1. Go to your Supabase Dashboard and navigate to **Authentication -> Users**.
2. Click **Add User** -> **Create User**.
3. Enter an email (e.g. `admin@example.com`) and choose a secure password.
4. Check **Auto Confirm User** (or verify via email).

### Step 2: Grant Admin Rights
You have two ways to designate an account as an administrator:

- **Method A (Recommended — Environment Whitelist)**:
  Add the user's email to `ADMIN_EMAILS` in `.env.local`:
  ```env
  ADMIN_EMAILS=admin@example.com
  ```
  *(Multiple emails can be separated by commas, e.g. `admin@example.com,lead@example.com`).*

- **Method B (Supabase User Metadata)**:
  In the Supabase **Authentication -> Users** dashboard:
  - Click on the user -> **Edit User**.
  - In the **Raw User Meta Data** JSON editor, add `"role": "admin"` or `"is_admin": true`:
    ```json
    {
      "role": "admin"
    }
    ```

### Step 3: Access the Moderation Dashboard & Publish Matches
1. Navigate to [`http://localhost:3000/admin/moderation`](http://localhost:3000/admin/moderation).
2. If unauthenticated, you will see the **Admin Sign In** form.
3. Enter your administrator email and password.
4. Once verified, you will enter the **Moderation Queue Dashboard** where you can:
   - **Edit Submitted Details**: Click **Edit Details** on any pending card to adjust tournament, round name, division, table number, player names/countries, deck archetypes (ordered alphabetically), YouTube URL, match start timestamp, game 1/2/3 timestamps, winner, and score.
   - **Save Changes (Keep Pending)**: Save corrected values to the database without publishing yet.
   - **Approve & Publish**: Immediately inserts the match and game timestamps into `streamed_matches` and `match_games`, sets status to `approved`, and indexes the match live on `/matches`, `/players`, `/archetypes`, and the tournament page.
   - **Reject**: Dismiss inaccurate submissions with a single click.

---

## 📹 Mass Match Ingestion (Google Sheets & CSV)

You can batch-upload broadcast matches directly via a Google Sheet (or CSV spreadsheet) and convert them to SQL for execution in the Supabase SQL Editor, or insert directly into Supabase:

### Option A: Direct Google Sheets Ingestion (Recommended)

1. **Format Your Google Sheet**:
   Create a Google Sheet matching the exact columns of [`matches_template.csv`](file:///Users/ehg/projs/battle-reporter/matches_template.csv):
   `tournament_id, round_name, division, table_number, player1_name, player1_country, player1_deck_archetype, player2_name, player2_country, player2_deck_archetype, youtube_url, match_start_time, match_end_time, winner_player_name, match_score, game1_start_time, game2_start_time, game3_start_time`
   - Timestamps support `HH:MM:SS` (e.g. `1:25:30`), `MM:SS` (e.g. `45:10`), or total seconds.
   - YouTube video IDs are extracted automatically.

2. **Access & Authorization**:
   - **For Non-Public / Private Sheets (Recommended)**:
     Use a **Google Cloud Service Account** so your sheet remains 100% private:
     1. In Google Cloud Console, create a Service Account and download its JSON key file (or copy the client email and private key).
     2. In your private Google Sheet, click **Share** and add the Service Account email address as a **Viewer**.
     3. In `.env.local`, set:
        ```env
        GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
        # OR:
        GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
        GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
        ```
   - **For Link-Shared Sheets**:
     Under General access in Google Sheets, change to **"Anyone with the link"** as **"Viewer"** (no credentials required).

3. **Run the Ingestion Pipeline**:
   ```bash
   # From a Google Sheet URL:
   npm run sheets-to-sql "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=0"

   # Or configure GOOGLE_SHEET_URL in .env.local and simply run:
   npm run sheets-to-sql

   # With explicit credentials flag:
   npm run sheets-to-sql "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID" --credentials="path/to/key.json"

   # Directly insert records into Supabase DB (bypassing manual SQL import):
   npm run ingest-sheets --direct
   ```

### Option B: Local CSV File

1. **Use the Template**:
   Open [`matches_template.csv`](file:///Users/ehg/projs/battle-reporter/matches_template.csv) or create your own `matches.csv`.

2. **Generate the SQL**:
   ```bash
   npm run csv-to-sql
   # Or specify custom file paths:
   # npm run csv-to-sql path/to/my_matches.csv supabase/my_matches.sql
   ```

3. **Execute in Supabase**:
   Copy the generated `INSERT` statements from `supabase/matches_import.sql` and run them in your **Supabase SQL Editor**. All matches will immediately appear on the site under `/matches`, `/players`, and respective tournament pages.

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm start
```

---

## 📄 License & Attribution

An open-source community archive project. All Pokémon TCG broadcast and intellectual property rights belong to **The Pokémon Company International** and official event broadcasters.
