<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Data Sourcing Policy

- **CRITICAL / ABSOLUTE RULE**: Never use fabricated, invented, mocked, or placeholder data for tournaments and/or deck archetypes under any circumstances — even if it was previously generated, suggested in conversation transcripts, or created on the fly.
- All tournament data in `tournaments` must come directly from the official PokeData API (`https://www.pokedata.ovh/apiv3`).
- All deck archetype data in `deck_archetypes` must come directly from the official Limitless TCG Play API (`https://play.limitlesstcg.com/api`).
- Any database seeding, migration scripts, or SQL outputs must exclusively source authoritative records fetched from these live APIs.
- Community/user data is restricted strictly to stream video URLs, match timestamps, player submissions, and match moderation.
