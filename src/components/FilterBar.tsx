'use client';

import { useState } from 'react';
import type { VideoWithMeta } from '@/types';

interface Props {
  videos: VideoWithMeta[];
  syncing: boolean;
  onSync: () => void;
}

const btn = {
  fontSize: 12, padding: '5px 10px', border: '1px solid #d0cfc7',
  borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#1a1a18',
} as const;

export type Filters = {
  search: string;
  lang: string;
  type: string;
  audience: string;
  minScore: number;
  showArchived: boolean;
};

// FilterBar is purely presentational; parent reads its emitted filters via context or lifting.
// For simplicity, we use a shared module-level store via a custom event approach.
// Actually, let's keep it simple: FilterBar calls window.dispatchEvent with filter updates,
// and VideoTable listens. Or better: lift state up to Dashboard.

// Let's export a controlled version that Dashboard drives.
export default function FilterBar({ syncing, onSync }: Props) {
  // These are uncontrolled inputs that broadcast changes via CustomEvent
  const emit = (key: string, value: string | boolean | number) => {
    window.dispatchEvent(new CustomEvent('filter', { detail: { key, value } }));
  };

  const inp = {
    fontSize: 12, padding: '5px 8px', border: '1px solid #d0cfc7',
    borderRadius: 6, background: '#fff', color: '#1a1a18',
  } as const;

  return (
    <div style={{
      background: '#fff', borderBottom: '1px solid #e0ded6',
      padding: '12px 28px', display: 'flex', gap: 12,
      flexWrap: 'wrap', alignItems: 'center',
    }}>
      <label style={{ fontSize: 12, color: '#6b6a65', fontWeight: 500 }}>Filter:</label>
      <input
        type="search"
        placeholder="Search title or channel…"
        style={{ ...inp, width: 180 }}
        onChange={e => emit('search', e.target.value)}
      />
      <select style={inp} onChange={e => emit('lang', e.target.value)}>
        <option value="">All languages</option>
        <option>EN</option>
        <option>KR</option>
      </select>
      <select style={inp} onChange={e => emit('type', e.target.value)}>
        <option value="">All types</option>
        {['Tutorial','Talk','Analysis','Reference','Framework','Podcast','News','Case Study'].map(t =>
          <option key={t}>{t}</option>
        )}
      </select>
      <select style={inp} onChange={e => emit('audience', e.target.value)}>
        <option value="">All audiences</option>
        {['Beginner','Intermediate','Advanced','All'].map(a =>
          <option key={a}>{a}</option>
        )}
      </select>
      <select style={inp} onChange={e => emit('minScore', parseFloat(e.target.value) || 0)}>
        <option value="">All scores</option>
        <option value="4.5">4.5+ ★★★★★</option>
        <option value="4.0">4.0+ ★★★★</option>
        <option value="3.5">3.5+ ★★★</option>
      </select>
      <label style={{ marginLeft: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <input type="checkbox" onChange={e => emit('showArchived', e.target.checked)} />
        Show archived
      </label>
      <button
        style={{ ...btn, marginLeft: 8, opacity: syncing ? 0.6 : 1 }}
        onClick={onSync}
        disabled={syncing}
      >
        {syncing ? '⧗ Syncing…' : '🔄 Sync'}
      </button>
    </div>
  );
}
