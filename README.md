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

5. **Community Match Tagging (Google Form Integration)**:
   - One-click access to the community match tagging form from the navbar, tournament pages, player directory, and archetype directory.
   - Configurable external URL via `NEXT_PUBLIC_TAG_MATCH_URL` in `.env.local` (or `TAG_MATCH_URL` in `src/config.ts`), defaulting to `https://example.com`.
   - External Google Form captures YouTube stream links, game timestamps, player names, and archetypes safely outside of direct database write access.
   - Verified submissions are batch-ingested into the archive using the spreadsheet pipeline (`npm run sheets-to-sql` or `npm run ingest-sheets`).

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

# Supabase Service Role Key (for direct server/CLI batch ingestion and seeding)
# Found under Project Settings -> API -> Project API keys -> service_role secret
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret_key

# Limitless TCG Play API Key (for live deck archetypes)
LIMITLESS_API_KEY=your_limitless_api_key

# Community Match Tagging Google Form URL (opens when users click "Tag a Match")
NEXT_PUBLIC_TAG_MATCH_URL=https://example.com
```

### 3. Apply Database Migrations and Grants
1. In your Supabase Dashboard, open the **SQL Editor** from the left navigation.
2. Click **New query**, paste the entire contents of [`supabase/migrations/20261018_initial_schema.sql`](supabase/migrations/20261018_initial_schema.sql), and click **Run**.
   - This provisions tables (`tournaments`, `deck_archetypes`, `streamed_matches`, `match_games`), sets up indexes, and configures Row Level Security (RLS).
3. Next, apply the security & permissions hardening migration [`supabase/migrations/20261029_remove_admin_and_submissions.sql`](supabase/migrations/20261029_remove_admin_and_submissions.sql) and click **Run**.
   - This removes the legacy in-app submissions/moderation queue, revokes all client mutation privileges, and locks down public access to strictly read-only.
4. Next, paste the contents of [`supabase/seed.sql`](supabase/seed.sql) and click **Run**.
   - This seeds official premier tournaments from PokeData and canonical deck archetypes from Limitless TCG.
   - It leaves `streamed_matches` and `match_games` ready for you to ingest stream matches via Google Sheets or CSV.

### 4. Syncing / Refreshing API Data via CLI
You can refresh tournaments and deck archetypes at any time by running:

```bash
npm run seed
```
This fetches the latest tournaments from PokeData and archetypes from Limitless TCG, and automatically updates your database.

---

## 📝 Community Match Tagging (Google Form)

Community contributors can submit broadcast matches and game timestamps via an external Google Form:
- Clicking **"Tag a Match"** in the navigation bar or on tournament pages opens the configured external form URL in a new browser tab.
- The external form URL is defined as a property in `src/config.ts` (`TAG_MATCH_URL`) and can be overridden via `NEXT_PUBLIC_TAG_MATCH_URL` in `.env.local` (defaults to `https://example.com`).
- Direct navigation to `/submit` automatically redirects to the configured Google Form URL.
- Once reviewed by the archive maintainers, responses in the Google Sheet are ingested directly into Supabase using the CLI batch pipeline.

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

## 🌐 Deploying to GitHub Pages

GitHub Pages is a static file hosting service. Because it does not run a dynamic Node.js server, Next.js must be configured for **Static HTML Export** (`output: 'export'`), which generates a self-contained `out/` directory consisting of HTML, CSS, JavaScript, and static assets.

Follow these step-by-step instructions to automate building and deploying **Battle Reporter** to GitHub Pages using GitHub Actions:

### Step 1: Configure `next.config.ts` for Static Export

Open [`next.config.ts`](file:///Users/ehg/projs/battle-reporter/next.config.ts) and configure:
1. `output: 'export'`: Instructs Next.js to produce static assets in the `out/` folder upon running `next build`.
2. `images: { unoptimized: true }`: Required because GitHub Pages does not run the Next.js server-side image optimization engine.
3. `basePath`: If your site is hosted at `https://<username>.github.io/<repository-name>/` (the default GitHub Pages URL), you must prefix asset URLs with your repository name. If you use a custom domain (e.g. `https://battlereporter.com`), `basePath` can be left empty.

Example `next.config.ts`:

```typescript
import type { NextConfig } from "next";

// If deployed to https://<user>.github.io/<repo>/, set basePath to '/<repo>'
const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const repositoryName = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}`
  : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages && !process.env.CUSTOM_DOMAIN ? repositoryName : "",
  images: {
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

> [!TIP]
> If you test the static build locally, run `NEXT_PUBLIC_BASE_PATH="" npm run build` to verify that `out/` is created without errors.

---

### Step 2: Enable GitHub Pages with GitHub Actions

1. Open your repository on GitHub.
2. Click on **Settings** in the top navigation tab.
3. In the left sidebar, click on **Pages** (under the "Code and automation" section).
4. Under **Build and deployment -> Source**, select **GitHub Actions** from the dropdown menu (instead of "Deploy from a branch").

---

### Step 3: Configure Repository Secrets & Environment Variables

Because Next.js client components communicate directly with your Supabase database in the browser, your `NEXT_PUBLIC_` variables must be provided at build time:

1. In your GitHub repository, go to **Settings -> Secrets and variables -> Actions**.
2. Under the **Secrets** tab (or **Variables** tab for public variables), click **New repository secret** / **New repository variable**:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL (e.g. `https://xyzcompany.supabase.co`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase public anonymous API key.
   - `LIMITLESS_API_KEY` (optional): If using Limitless TCG Play API deck classification.
   - `CUSTOM_DOMAIN` (optional): Set to `true` if you attach a custom apex or subdomain so that the subfolder `basePath` is omitted.

> [!NOTE]
> Values prefixed with `NEXT_PUBLIC_` are safely embedded into the static bundle during `npm run build` and are intended for browser access. Supabase database tables remain protected by Row Level Security (RLS) policies.

---

### Step 4: Create the GitHub Actions Workflow

Create a new file in your repository at `.github/workflows/deploy.yml`:

```yaml
name: Deploy Battle Reporter to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

# Set permissions for GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow only one concurrent deployment, skipping runs queued between the run in-progress and latest queued.
concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Static Export with Next.js
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL || vars.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY || vars.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          LIMITLESS_API_KEY: ${{ secrets.LIMITLESS_API_KEY || vars.LIMITLESS_API_KEY }}
        run: npm run build

      - name: Upload GitHub Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

### Step 5: Test the Static Build Locally

Before pushing to GitHub, you can test the production static export locally on your machine:

1. Add `output: 'export'` and `images: { unoptimized: true }` to [`next.config.ts`](file:///Users/ehg/projs/battle-reporter/next.config.ts).
2. Run the build command:
   ```bash
   npm run build
   ```
3. Verify that the `out/` folder is generated containing static files (`index.html`, `404.html`, etc.).
4. Preview the static site locally:
   ```bash
   npx serve out
   ```
5. Open the displayed URL (usually `http://localhost:3000`) and test navigation across directories, match theaters, and leaderboards.

---

### Step 6: Custom Domains (Optional)

If you configure a custom domain (e.g. `https://battlereporter.com` or `https://archive.myteam.gg`):
1. In your GitHub repository, navigate to **Settings -> Pages**.
2. Under **Custom domain**, enter your domain name and save.
3. Configure the appropriate `CNAME` or `A` records in your DNS provider (e.g. Cloudflare, Namecheap, Google Domains).
4. If using a custom domain, ensure `basePath` in `next.config.ts` is empty (e.g. `basePath: ""` or set `CUSTOM_DOMAIN=true` in GitHub Variables), as the site will be served from the domain root instead of a subpath.

---

### ⚠️ Important Architecture Considerations for Static Hosting

- **Client-Side Data vs Server Actions**: Because GitHub Pages is purely static, server-only Node.js capabilities (such as writing to cookies via `next/headers` or running Node server actions) are not available on the hosting server. All live database queries and authentication execute directly from the browser using the client Supabase SDK.
- **Match Tagging & Ingestion Architecture**:
  - Community match submissions open an external Google Form, keeping public users separated from direct database write access.
  - The Google Sheets / CSV ingestion pipeline (`npm run sheets-to-sql`, `npm run ingest-sheets`) can be run locally on your computer or scheduled via separate GitHub Actions to update Supabase directly using the service role key.

---

## 📄 License & Attribution

An open-source community archive project. All Pokémon TCG broadcast and intellectual property rights belong to **The Pokémon Company International** and official event broadcasters.
