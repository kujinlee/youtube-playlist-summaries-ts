'use client';

import { useState, useCallback } from 'react';
import type { VideoWithMeta } from '@/types';
import FilterBar from './FilterBar';
import VideoTable from './VideoTable';
import SyncLog from './SyncLog';

interface Props {
  videos: VideoWithMeta[];
  totalCount: number;
  obsidianVault: string;
  summariesFolder: string;
  obsidianFilePrefix: string;
  initialDeepDiveIds: string[];
  initialDeepDivePdfIds: string[];
}

export default function Dashboard({ videos: initial, totalCount, obsidianVault, summariesFolder, obsidianFilePrefix, initialDeepDiveIds, initialDeepDivePdfIds }: Props) {
  const [videos, setVideos]       = useState<VideoWithMeta[]>(initial);
  const [syncing, setSyncing]     = useState(false);
  const [syncLines, setSyncLines] = useState<string[]>([]);
  const [showLog, setShowLog]     = useState(false);
  const [deepDiving, setDeepDiving]         = useState(false);
  const [deepDiveLines, setDeepDiveLines]   = useState<string[]>([]);
  const [deepDiveTitle, setDeepDiveTitle]   = useState('');
  const [deepDiveIds, setDeepDiveIds]         = useState<Set<string>>(() => new Set(initialDeepDiveIds));
  const [deepDivePdfIds, setDeepDivePdfIds]   = useState<Set<string>>(() => new Set(initialDeepDivePdfIds));
  const [pdfGenerating, setPdfGenerating]     = useState<Set<string>>(new Set());

  const toggleArchive = useCallback(async (index: number) => {
    const updated = videos.map(v =>
      v.index === index ? { ...v, archived: !v.archived } : v
    );
    setVideos(updated);
    const archivedIndices = updated.filter(v => v.archived).map(v => v.index);
    await fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: archivedIndices }),
    });
  }, [videos]);

  const startDeepDive = useCallback((videoId: string, title: string) => {
    setDeepDiving(true);
    setDeepDiveLines([]);
    setDeepDiveTitle(title);

    const evts = new EventSource(`/api/deep-dive/${videoId}`);
    evts.onmessage = e => {
      if (e.data === '__done__') {
        evts.close();
        setDeepDiving(false);
        setDeepDiveIds(prev => new Set([...prev, videoId]));
      } else {
        setDeepDiveLines(prev => [...prev, e.data as string]);
      }
    };
    evts.onerror = () => { evts.close(); setDeepDiving(false); };
  }, []);

  const generatePdf = useCallback(async (videoId: string) => {
    setPdfGenerating(prev => new Set([...prev, videoId]));
    try {
      const res = await fetch(`/api/deep-dive/${videoId}/generate-pdf`, { method: 'POST' });
      if (res.ok) setDeepDivePdfIds(prev => new Set([...prev, videoId]));
    } finally {
      setPdfGenerating(prev => { const s = new Set(prev); s.delete(videoId); return s; });
    }
  }, []);

  const startSync = useCallback(() => {
    setSyncing(true);
    setSyncLines([]);
    setShowLog(true);

    const evts = new EventSource('/api/sync');
    evts.onmessage = e => {
      if (e.data === '__done__') {
        evts.close();
        setSyncing(false);
        window.location.reload();
      } else if (e.data === '__error__') {
        evts.close();
        setSyncing(false);
        // Leave log open so the user can read the error — do not reload
      } else {
        setSyncLines(prev => [...prev, e.data as string]);
      }
    };
    evts.onerror = () => {
      evts.close();
      setSyncing(false);
    };
  }, []);

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #e0ded6', padding: '20px 28px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
          Agentic AI. Claude Code — Video Ratings
        </h1>
        <p style={{ fontSize: 13, color: '#6b6a65' }}>
          {totalCount} videos · Last updated {new Date().toISOString().slice(0, 10)}
        </p>
      </div>

      <FilterBar onSync={startSync} syncing={syncing} videos={videos} />

      {showLog && <SyncLog lines={syncLines} syncing={syncing} onClose={() => setShowLog(false)} />}

      {(deepDiving || deepDiveLines.length > 0) && (
        <SyncLog
          lines={deepDiveLines}
          syncing={deepDiving}
          title={`Deep Dive: ${deepDiveTitle}`}
          onClose={() => { setDeepDiveLines([]); setDeepDiveTitle(''); }}
        />
      )}

      <VideoTable
        videos={videos}
        obsidianVault={obsidianVault}
        summariesFolder={summariesFolder}
        obsidianFilePrefix={obsidianFilePrefix}
        onToggleArchive={toggleArchive}
        onDeepDive={startDeepDive}
        deepDiveIds={deepDiveIds}
        deepDivePdfIds={deepDivePdfIds}
        pdfGenerating={pdfGenerating}
        onGeneratePdf={generatePdf}
      />
    </div>
  );
}
