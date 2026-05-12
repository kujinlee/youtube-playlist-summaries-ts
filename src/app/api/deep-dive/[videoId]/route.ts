import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loadManifest } from '@/lib/manifest';
import { generateDeepDive, deepDiveFilename } from '@/lib/deep-dive';
import { SUMMARIES_DIR } from '@/lib/config';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (msg: string) => {
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
      };

      (async () => {
        const manifest = loadManifest();
        const video = manifest.videos.find(v => v.id === videoId);
        if (!video) {
          send(`ERROR: Video ${videoId} not found in manifest`);
          send('__done__');
          controller.close();
          return;
        }

        send(`Deep dive: "${video.title}"`);
        send('Analysing video with Gemini (audio + visuals)…');
        const md = await generateDeepDive(video);

        const filename = deepDiveFilename(video);
        fs.writeFileSync(path.join(SUMMARIES_DIR, filename), md, 'utf-8');
        send(`Saved → video-summaries/${filename}`);
        send('__done__');
        controller.close();
      })().catch(err => {
        send(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
        send('__done__');
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
