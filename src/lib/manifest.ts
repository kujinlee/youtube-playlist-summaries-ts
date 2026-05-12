import fs from 'fs';
import { MANIFEST_PATH } from './config';
import type { Manifest, Video, VideoWithMeta } from '@/types';

export function loadManifest(): Manifest {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(raw) as Manifest;
}

export function saveManifest(manifest: Manifest): void {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
}

export function calcScore(v: Video): number {
  return Math.round((v.U * 0.35 + v.D * 0.15 + v.O * 0.15 + v.R * 0.15 + v.C * 0.20) * 100) / 100;
}

export function withMeta(videos: Video[], archived: Set<number>): VideoWithMeta[] {
  return videos.map(v => ({
    ...v,
    score: calcScore(v),
    archived: archived.has(v.index),
  }));
}
