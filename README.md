# Agentic AI. Claude Code — Video Summaries (TypeScript)

A Next.js dashboard for managing the `Agentic AI. Claude Code` video-summary collection. Tracks a YouTube playlist, auto-generates markdown summaries using Gemini, and provides an interactive dashboard for browsing, rating, and archiving videos.

## What it does

- Fetches your YouTube playlist via yt-dlp and detects new videos
- Generates structured markdown summaries and ratings with Gemini 2.5 Flash
- Serves a web dashboard at `http://localhost:3000` for filtering, sorting, and archiving
- Moves archived videos to `_archive/` and removes them from the YouTube playlist
- Serves PDFs via `/api/pdf/[filename]` from the shared `_pdf/` folder
- Integrates with Obsidian via `obsidian://` deep links

## Repository layout

This project contains code only. All data lives in the sibling `youtube-playlist-summaries-data/` folder, which is not tracked by git.

```
youtube-playlist-summaries-ts/    ← this repo (code)
├── src/
│   ├── app/
│   │   ├── page.tsx                      # Dashboard (server component)
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── archive/route.ts          # GET/POST archive state
│   │       ├── sync/route.ts             # SSE stream: runs full sync
│   │       ├── pdf/[filename]/route.ts   # Serve PDFs
│   │       └── deep-dive/[videoId]/      # Deep dive generation + PDF
│   ├── components/
│   │   ├── Dashboard.tsx                 # State management and layout
│   │   ├── FilterBar.tsx                 # Search, filters, Sync button
│   │   ├── VideoTable.tsx                # Sortable, filterable table
│   │   └── SyncLog.tsx                   # Live sync progress panel
│   ├── lib/
│   │   ├── config.ts                     # Paths (DATA_ROOT) and constants
│   │   ├── manifest.ts                   # Read/write manifest.json
│   │   ├── archive.ts                    # Read/write archived.json + file moves
│   │   ├── playlist.ts                   # yt-dlp subprocess wrapper
│   │   ├── gemini.ts                     # Gemini summary and ratings generation
│   │   ├── deep-dive.ts                  # Gemini deep-dive generation + pandoc PDF
│   │   ├── youtube.ts                    # YouTube OAuth + playlist removal
│   │   └── sync.ts                       # Sync orchestration
│   └── types/index.ts                    # Shared TypeScript types
├── .env.local.example
└── package.json

youtube-playlist-summaries-data/  ← data folder (not in git, sibling directory)
├── video-summaries/        # Markdown summaries + deep dives (*_dive.md)
├── _pdf/                   # Generated PDFs (summaries + deep dives)
├── _archive/               # Archived summaries
├── manifest.json           # Video index and ratings
├── archived.json           # Archive state
├── client_secrets.json     # YouTube OAuth credentials
└── token-ts.json           # YouTube OAuth token
```

## Setup

### Prerequisites

- Node.js 18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) on your PATH — for playlist fetching
- A Gemini API key — for summary generation

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file:

```bash
cp .env.local.example .env.local
```

The defaults work if the data folder is the sibling `youtube-playlist-summaries-data/`. Override if needed:

```
DATA_ROOT=/absolute/path/to/youtube-playlist-summaries-data
GEMINI_API_KEY=your_key_here
```

Get a free Gemini key at [aistudio.google.com](https://aistudio.google.com/app/apikey).

### 3. Set up YouTube OAuth (optional — only needed for auto-removing archived videos)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the YouTube Data API v3
3. Create OAuth 2.0 credentials (Desktop app) and download as `client_secrets.json` into the data folder
4. Add your Google account as a test user in the OAuth consent screen
5. On first sync, a browser window will open for authorization — sign in with the account that owns the playlist

The app stores its token at `token-ts.json` in the data folder.

## Usage

### Start the dashboard

```bash
npm run dev
```

Opens `http://localhost:3000`. From the dashboard you can:

- **Filter and sort** videos by language, type, audience, and score
- **Archive** videos — moves files to `_archive/` and removes them from the YouTube playlist
- **Sync** — fetches new playlist videos, generates summaries, and reloads the dashboard

### Commands

```bash
npm run dev      # Start the development server
npm run build    # Build for production
npm run start    # Start the production server
npm run lint     # Run Next.js linting
```

## Ratings

Each video is rated automatically by Gemini on five dimensions (1–5):

| Key | Dimension | Weight |
|-----|-----------|--------|
| U | Usefulness for Claude Code practitioners | 35% |
| C | Comprehensiveness of coverage | 20% |
| D | Depth / technical level | 15% |
| O | Originality vs. commentary | 15% |
| R | Recency | 15% |

Scores and ratings are stored in `manifest.json` in the data folder.

## Obsidian integration

Open the data vault root (`youtube-playlist-summaries/`) directly in Obsidian. Summaries live in `video-summaries/` and archived notes move to `_archive/`, keeping the main vault view uncluttered. OBS buttons in the dashboard open notes directly in Obsidian via the `obsidian://` URL scheme.

## Dependencies

Managed by npm via `package.json`:

| Package | Purpose |
|---------|---------|
| `next`, `react`, `react-dom` | Framework and UI |
| `@google/genai` | Gemini 2.5 Flash for summary generation |
| `googleapis` | YouTube Data API v3 |
| `google-auth-library` | YouTube OAuth flow |
| `yt-dlp` (system) | Playlist and video metadata fetching (called as subprocess) |

## Architecture

```
Next.js (localhost:3000)
│
├── GET  /                        → Dashboard (server component, reads manifest + archive)
├── GET  /api/pdf/[filename]      → Serve PDF from _pdf/
├── GET  /api/archive             → Return archived.json
├── POST /api/archive             → Write archived.json (called by archive button)
└── GET  /api/sync                → SSE stream: runs full sync
                                        ├── fetch playlist (yt-dlp subprocess)
                                        ├── generate summaries (Gemini)
                                        ├── move/restore files
                                        └── remove from YouTube playlist (OAuth)
```

## Notes

- `token-ts.json` (in the data folder) is account-specific. If playlist removal fails with a 403 error, delete it and re-run to re-authenticate with the correct account (sign in with the brand account that owns the playlist).
- PDF generation uses pandoc/XeLaTeX via the "Gen PDF" button in the dashboard, or via the deep-dive "Gen PDF" button for deep-dive documents.
- The dashboard reloads automatically after a sync completes.
- Set `DATA_ROOT` in `.env.local` to point to a data folder in a non-default location.
