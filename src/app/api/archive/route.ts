import { NextResponse } from 'next/server';
import { loadArchive, saveArchive } from '@/lib/archive';

export async function GET() {
  const data = loadArchive();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json() as { archived: number[] };
  const existing = loadArchive();
  existing.archived = [...new Set(body.archived)].sort((a, b) => a - b);
  saveArchive(existing);
  return NextResponse.json({ ok: true });
}
