import fs from 'fs';
import path from 'path';
import { PDF_DIR } from '@/lib/config';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Prevent path traversal
  const resolved = path.resolve(PDF_DIR, filename);
  if (!resolved.startsWith(path.resolve(PDF_DIR))) {
    return new Response('Forbidden', { status: 403 });
  }

  if (!fs.existsSync(resolved)) {
    return new Response('PDF not found', { status: 404 });
  }

  const buf = fs.readFileSync(resolved);
  return new Response(buf, {
    headers: { 'Content-Type': 'application/pdf' },
  });
}
