import fs from 'fs';
import { loadManifest, withMeta } from '@/lib/manifest';
import { loadArchive } from '@/lib/archive';
import { OBSIDIAN_VAULT, SUMMARIES_FOLDER, SUMMARIES_DIR, PDF_DIR, OBSIDIAN_FILE_PREFIX } from '@/lib/config';
import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default function Page() {
  const manifest = loadManifest();
  const archive  = loadArchive();
  const archived = new Set(archive.archived);
  const videos   = withMeta(manifest.videos, archived);

  const summaryFiles = fs.existsSync(SUMMARIES_DIR) ? new Set(fs.readdirSync(SUMMARIES_DIR)) : new Set<string>();
  const pdfFiles     = fs.existsSync(PDF_DIR)       ? new Set(fs.readdirSync(PDF_DIR))       : new Set<string>();

  const deepDiveIds    = manifest.videos.filter(v => summaryFiles.has(v.filename.replace('.md', '_dive.md'))).map(v => v.id);
  const deepDivePdfIds = manifest.videos.filter(v => pdfFiles.has(v.filename.replace('.md', '_dive.pdf'))).map(v => v.id);

  return (
    <Dashboard
      videos={videos}
      totalCount={manifest.videos.length}
      obsidianVault={OBSIDIAN_VAULT}
      summariesFolder={SUMMARIES_FOLDER}
      obsidianFilePrefix={OBSIDIAN_FILE_PREFIX}
      initialDeepDiveIds={deepDiveIds}
      initialDeepDivePdfIds={deepDivePdfIds}
    />
  );
}
