import fs from 'fs';
import path from 'path';
import { loadManifest, saveManifest } from './manifest';
import { loadArchive, syncArchiveFiles, markPlaylistRemoved } from './archive';
import { fetchPlaylist, fetchVideoDetails } from './playlist';
import { generateSummaryAndRatings, makeFilename } from './gemini';
import { getYouTubeClient, removeFromPlaylist } from './youtube';
import { SUMMARIES_DIR } from './config';
import type { Video } from '@/types';

export async function runSync(log: (msg: string) => void): Promise<void> {
  const manifest = loadManifest();
  const { playlist_url: playlistUrl } = manifest;

  const knownIds = new Set(manifest.videos.map(v => v.id));
  let nextIndex = Math.max(0, ...manifest.videos.map(v => v.index)) + 1;

  // 1. Fetch playlist
  log('Fetching playlist…');
  const playlist = await fetchPlaylist(playlistUrl);
  const playlistIds = playlist.map(e => e.id).filter(Boolean);
  log(`  Found ${playlist.length} videos in playlist.`);

  const newIds = playlistIds.filter(id => !knownIds.has(id));
  const removedIds = [...knownIds].filter(id => !playlistIds.includes(id));

  if (removedIds.length) {
    log(`\nNote: ${removedIds.length} video(s) no longer in playlist: ${removedIds.join(', ')}`);
  }

  // 2. Process new videos
  if (newIds.length === 0) {
    log('No new videos found. Checking archive…');
  } else {
    log(`\n${newIds.length} new video(s) to process: ${newIds.join(', ')}\n`);
    fs.mkdirSync(SUMMARIES_DIR, { recursive: true });

    for (const videoId of newIds) {
      log(`  [${nextIndex}] Fetching details for ${videoId}…`);
      const details = await fetchVideoDetails(videoId);
      if (!details) { log(`    Could not fetch details — skipping.`); continue; }

      log(`      Title: ${details.title?.slice(0, 70)}`);
      log(`      Generating summary… `);

      let md: string, ratings: Video['U'] extends number ? ReturnType<typeof generateSummaryAndRatings> extends Promise<infer R> ? R : never : never;
      try {
        const result = await generateSummaryAndRatings(details);
        md = result.md;
        const filename = makeFilename(nextIndex, details.title ?? `Video ${videoId}`);
        const filepath = path.join(SUMMARIES_DIR, filename);
        fs.writeFileSync(filepath, md, 'utf-8');
        log(`      Saved → ${filename}`);

        const entry: Video = {
          index:    nextIndex,
          id:       videoId,
          title:    details.title ?? `Video ${videoId}`,
          channel:  details.uploader ?? 'Unknown',
          lang:     result.lang,
          type:     result.ratings.type,
          audience: result.ratings.audience,
          U: result.ratings.U,
          D: result.ratings.D,
          O: result.ratings.O,
          R: result.ratings.R,
          C: result.ratings.C,
          filename,
        };
        manifest.videos.push(entry);
        nextIndex++;
      } catch (e) {
        log(`      ERROR: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
    }

    saveManifest(manifest);
    log(`\nmanifest.json updated (${manifest.videos.length} videos total).`);
  }

  // 3. Sync archive (move/restore files)
  log('\nChecking archive…');
  const pending = syncArchiveFiles(manifest, log);

  // 4. Remove from YouTube playlist
  if (pending.length > 0) {
    const playlistId = playlistUrl.split('list=').at(-1)?.split('&')[0] ?? '';
    const yt = await getYouTubeClient(log);
    if (yt && playlistId) {
      const succeeded = await removeFromPlaylist(yt, playlistId, pending, log);
      if (succeeded.length) markPlaylistRemoved(succeeded);
    }
  }

  log('\nDone!');
}
