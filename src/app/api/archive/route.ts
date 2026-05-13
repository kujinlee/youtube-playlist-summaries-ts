import { NextResponse } from 'next/server';
import { loadArchive, saveArchive, syncArchiveFiles } from '@/lib/archive';
import { loadManifest } from '@/lib/manifest';

export async function GET() {
  const data = loadArchive();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json() as { archived: number[] };
  const existing = loadArchive();
  existing.archived = [...new Set(body.archived)].sort((a, b) => a - b);
  saveArchive(existing);
  const manifest = loadManifest();
  syncArchiveFiles(manifest, () => {});
  return NextResponse.json({ ok: true });
}
