import type { NextRequest } from 'next/server';
import { loadManifest } from '@/lib/manifest';
import { generateDeepDivePdf } from '@/lib/deep-dive';

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;

  const manifest = loadManifest();
  const video = manifest.videos.find(v => v.id === videoId);
  if (!video) return new Response(`Video ${videoId} not found`, { status: 404 });

  try {
    await generateDeepDivePdf(video);
    return new Response('OK');
  } catch (err) {
    return new Response(err instanceof Error ? err.message : String(err), { status: 500 });
  }
}
