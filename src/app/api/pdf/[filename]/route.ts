import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { PDF_DIR, SUMMARIES_DIR, ARCHIVE_DIR, ARCHIVE_PDF } from '@/lib/config';

function generatePdf(mdPath: string, pdfPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('pandoc', [
      mdPath, '-o', pdfPath,
      '--pdf-engine=xelatex',
      '-V', 'geometry:margin=1in',
      '-V', 'colorlinks=true',
      '-V', 'linkcolor=blue',
      '-V', 'CJKmainfont=Apple SD Gothic Neo',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.setEncoding('utf-8');
    proc.stderr.on('data', (c: string) => { stderr += c; });
    proc.on('close', code => {
      if (code !== 0) reject(new Error(`pandoc exited ${code}: ${stderr.slice(0, 500)}`));
      else resolve();
    });
    proc.on('error', reject);
  });
}

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

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
    // Check archive PDF dir before regenerating
    const archiveResolved = path.join(ARCHIVE_PDF, filename);
    if (fs.existsSync(archiveResolved)) {
      const buf = fs.readFileSync(archiveResolved);
      return new Response(buf, { headers: { 'Content-Type': 'application/pdf' } });
    }

    const mdFilename = filename.replace(/\.pdf$/, '.md');
    const mdInSummaries = path.join(SUMMARIES_DIR, mdFilename);
    const mdInArchive   = path.join(ARCHIVE_DIR, mdFilename);
    const isArchived = !fs.existsSync(mdInSummaries) && fs.existsSync(mdInArchive);
    const mdPath = fs.existsSync(mdInSummaries) ? mdInSummaries
                 : fs.existsSync(mdInArchive)   ? mdInArchive
                 : null;
    if (!mdPath) {
      return new Response('Not found', { status: 404 });
    }
    const targetDir = isArchived ? ARCHIVE_PDF : PDF_DIR;
    const targetPath = isArchived ? path.join(ARCHIVE_PDF, filename) : resolved;
    fs.mkdirSync(targetDir, { recursive: true });
    try {
      await generatePdf(mdPath, targetPath);
    } catch (e) {
      return new Response(
        `PDF generation failed: ${e instanceof Error ? e.message : String(e)}`,
        { status: 500 },
      );
    }
    // Re-point resolved to where the file was actually written
    if (isArchived) {
      const buf = fs.readFileSync(targetPath);
      return new Response(buf, { headers: { 'Content-Type': 'application/pdf' } });
    }
  }

  const buf = fs.readFileSync(resolved);
  return new Response(buf, {
    headers: { 'Content-Type': 'application/pdf' },
  });
}
