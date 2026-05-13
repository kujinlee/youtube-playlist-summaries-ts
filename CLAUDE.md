# CLAUDE.md

Next.js 15 dashboard for a curated YouTube AI/Claude Code playlist. All data lives in the sibling `youtube-playlist-summaries-data/` folder (not tracked by git).

## Commands

```bash
npm run dev    # http://localhost:3000
npm run build
npm run lint
npm test       # Playwright e2e (requires dev server on :3000)
```

## Testing

Playwright e2e tests live in `tests/`. **Every new feature must have a corresponding test.**

- Each test is a standalone ESM script (`node tests/<name>.mjs`)
- Tests must clean up after themselves (restore any data they mutate)
- `DATA_ROOT` env var (default `../youtube-playlist-summaries-data`) sets data paths

## Non-obvious conventions

- **Archive uses indices, not IDs.** `archived.json` stores `{ archived: number[], playlist_removed: string[] }`. `archived` is an array of video index integers. `playlist_removed` stores video IDs already removed from YouTube to avoid double-removal.
- **Toggling archive moves files immediately.** `POST /api/archive` calls `syncArchiveFiles()` synchronously — MD and PDF move to/from `_archive/` on every toggle, not just during sync.
- **PDF route generates on demand.** `/api/pdf/[filename]` checks `_pdf/` then `_archive/_pdf/`; if missing, runs pandoc and saves to the correct dir (active → `_pdf/`, archived → `_archive/_pdf/`).
- **Korean detection** counts `[가-힣]` characters in the title; summaries are generated in the video's language.
- **Credentials are in the project root**, not the data folder: `token-ts.json` and `client_secrets.json` both live alongside `package.json`.
- **DATA_ROOT** defaults to `../youtube-playlist-summaries-data` relative to `process.cwd()`; override via `.env.local`.

## Environment variables

Copy `.env.local.example` to `.env.local`:

```
DATA_ROOT=/absolute/path/to/youtube-playlist-summaries-data
GEMINI_API_KEY=your_key_here
```