import path from 'path';

// DATA_ROOT is the shared data folder, independent of either app.
// Default: sibling of the TypeScript project root.
// Override with DATA_ROOT in .env.local if needed.
export const DATA_ROOT =
  process.env.DATA_ROOT ??
  path.join(process.cwd(), '..', 'youtube-playlist-summaries-data');

export const SUMMARIES_DIR  = path.join(DATA_ROOT, 'video-summaries');
export const PDF_DIR        = path.join(DATA_ROOT, '_pdf');
export const ARCHIVE_DIR    = path.join(DATA_ROOT, '_archive');
export const ARCHIVE_PDF    = path.join(ARCHIVE_DIR, '_pdf');
export const MANIFEST_PATH  = path.join(DATA_ROOT, 'manifest.json');
export const ARCHIVED_PATH  = path.join(DATA_ROOT, 'archived.json');
export const CLIENT_SECRETS = path.join(DATA_ROOT, 'client_secrets.json');
export const TOKEN_FILE = path.join(process.cwd(), 'token-ts.json');

export const OBSIDIAN_VAULT        = process.env.OBSIDIAN_VAULT ?? path.basename(DATA_ROOT);
export const SUMMARIES_FOLDER      = 'video-summaries';
// Prefix prepended to filenames in obsidian:// URLs.
// Set to empty string when the vault root IS the video-summaries folder.
export const OBSIDIAN_FILE_PREFIX  = process.env.OBSIDIAN_FILE_PREFIX ?? SUMMARIES_FOLDER;
export const YT_SCOPES        = ['https://www.googleapis.com/auth/youtube'];
