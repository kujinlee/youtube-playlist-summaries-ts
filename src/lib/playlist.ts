import { spawn } from 'child_process';
import type { PlaylistEntry } from '@/types';

/** Run yt-dlp and collect stdout lines as JSON. */
function ytDlp(args: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const lines: string[] = [];
    let stderr = '';

    proc.stdout.setEncoding('utf-8');
    proc.stdout.on('data', (chunk: string) => {
      lines.push(...chunk.split('\n').filter(Boolean));
    });
    proc.stderr.setEncoding('utf-8');
    proc.stderr.on('data', (chunk: string) => { stderr += chunk; });

    proc.on('close', code => {
      if (code !== 0 && lines.length === 0) {
        reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(0, 300)}`));
      } else {
        resolve(lines);
      }
    });
    proc.on('error', reject);
  });
}

/** Fetch all entries from a playlist (flat, no download). */
export async function fetchPlaylist(url: string): Promise<PlaylistEntry[]> {
  const lines = await ytDlp([
    '--flat-playlist',
    '--print', '%(id)s\t%(title)s\t%(uploader)s\t%(duration)s',
    '--no-warnings',
    '--ignore-errors',
    url,
  ]);

  return lines.map(line => {
    const [id, title, uploader, dur] = line.split('\t');
    return {
      id,
      title: title ?? '',
      uploader: uploader !== 'NA' ? uploader : undefined,
      duration: dur ? parseInt(dur, 10) : undefined,
    };
  }).filter(e => e.id && e.title);
}

/** Fetch full metadata for a single video. */
export async function fetchVideoDetails(videoId: string): Promise<PlaylistEntry | null> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const lines = await ytDlp([
    '--print', '%(id)s\t%(title)s\t%(uploader)s\t%(duration)s\t%(description)s',
    '--no-warnings',
    '--no-playlist',
    url,
  ]);

  if (!lines[0]) return null;
  // description can contain tabs/newlines — everything after 4th tab is description
  const parts = lines[0].split('\t');
  const [id, title, uploader, dur, ...descParts] = parts;
  return {
    id,
    title: title ?? '',
    uploader: uploader !== 'NA' ? uploader : undefined,
    duration: dur ? parseInt(dur, 10) : undefined,
    description: descParts.join('\t').slice(0, 2500),
    webpage_url: url,
  };
}
