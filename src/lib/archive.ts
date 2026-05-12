import fs from 'fs';
import path from 'path';
import {
  ARCHIVED_PATH, SUMMARIES_DIR, ARCHIVE_DIR,
  PDF_DIR, ARCHIVE_PDF,
} from './config';
import type { ArchiveData, Manifest } from '@/types';

export function loadArchive(): ArchiveData {
  if (!fs.existsSync(ARCHIVED_PATH)) return { archived: [], playlist_removed: [] };
  return JSON.parse(fs.readFileSync(ARCHIVED_PATH, 'utf-8')) as ArchiveData;
}

export function saveArchive(data: ArchiveData): void {
  fs.writeFileSync(ARCHIVED_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function updateArchivedIndices(indices: number[]): void {
  const existing = loadArchive();
  existing.archived = [...new Set(indices)].sort((a, b) => a - b);
  saveArchive(existing);
}

export function markPlaylistRemoved(videoIds: string[]): void {
  const data = loadArchive();
  const existing = new Set(data.playlist_removed);
  for (const id of videoIds) existing.add(id);
  data.playlist_removed = [...existing];
  saveArchive(data);
}

/** Move/restore .md and .pdf files based on archived.json. Returns pending YouTube removals. */
export function syncArchiveFiles(
  manifest: Manifest,
  log: (msg: string) => void,
): string[] {
  const data = loadArchive();
  const archivedSet = new Set(data.archived);
  const removedSet  = new Set(data.playlist_removed);

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  fs.mkdirSync(ARCHIVE_PDF, { recursive: true });

  let moved = 0, restored = 0;
  const pending: string[] = [];

  for (const v of manifest.videos) {
    const { index, filename, id } = v;
    const mdActive   = path.join(SUMMARIES_DIR, filename);
    const mdArchive  = path.join(ARCHIVE_DIR, filename);
    const pdfActive  = path.join(PDF_DIR,     filename.replace('.md', '.pdf'));
    const pdfArchive = path.join(ARCHIVE_PDF, filename.replace('.md', '.pdf'));

    if (archivedSet.has(index)) {
      if (fs.existsSync(mdActive))  { fs.renameSync(mdActive, mdArchive);   moved++; }
      if (fs.existsSync(pdfActive)) { fs.renameSync(pdfActive, pdfArchive); }
      if (!removedSet.has(id))      { pending.push(id); }
    } else {
      if (fs.existsSync(mdArchive))  { fs.renameSync(mdArchive, mdActive);   restored++; }
      if (fs.existsSync(pdfArchive)) { fs.renameSync(pdfArchive, pdfActive); }
    }
  }

  if (moved)    log(`  Archived ${moved} file(s) → _archive/`);
  if (restored) log(`  Restored ${restored} file(s) from _archive/`);

  return pending;
}
