'use client';

import { useState, useEffect } from 'react';
import type { VideoWithMeta, SortCol, SortDir } from '@/types';

interface Props {
  videos: VideoWithMeta[];
  obsidianVault: string;
  summariesFolder: string;
  obsidianFilePrefix: string;
  onToggleArchive: (index: number) => void;
  onDeepDive: (videoId: string, title: string) => void;
  deepDiveIds: Set<string>;
  deepDivePdfIds: Set<string>;
}

const BADGE: Record<string, string> = {
  EN: '#e6f1fb|#185fa5', KR: '#faeeda|#854f0b',
  Tutorial: '#eaf3de|#3b6d11', Talk: '#eeedfe|#534ab7',
  Analysis: '#faece7|#993c1d', Reference: '#e1f5ee|#0f6e56',
  Podcast: '#fbeaf0|#993556', News: '#f1efe8|#5f5e5a',
  'Case Study': '#e6f1fb|#0c447c', Framework: '#eeedfe|#3c3489',
  Beginner: '#eaf3de|#3b6d11', Intermediate: '#faeeda|#634806',
  Advanced: '#fcebeb|#a32d2d', All: '#e1f5ee|#085041',
};

function Badge({ label }: { label: string }) {
  const colors = BADGE[label] ?? '#e0ded6|#6b6a65';
  const [bg, color] = colors.split('|');
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 4,
      fontSize: 11, fontWeight: 500, background: bg, color, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}


function scoreColor(s: number) {
  if (s >= 4.5) return '#1d9e75';
  if (s >= 4.0) return '#3b6d11';
  if (s >= 3.5) return '#854f0b';
  return '#993c1d';
}

type Filters = { search: string; lang: string; type: string; audience: string; minScore: number; showArchived: boolean };

export default function VideoTable({ videos, obsidianVault, summariesFolder, obsidianFilePrefix, onToggleArchive, onDeepDive, deepDiveIds, deepDivePdfIds }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>('score');
  const [sortDir, setSortDir] = useState<SortDir>(-1);
  const [filters, setFilters] = useState<Filters>({
    search: '', lang: '', type: '', audience: '', minScore: 0, showArchived: false,
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const { key, value } = (e as CustomEvent).detail as { key: string; value: string | boolean | number };
      setFilters(f => ({ ...f, [key]: value }));
    };
    window.addEventListener('filter', handler);
    return () => window.removeEventListener('filter', handler);
  }, []);

  const handleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir(d => (d === 1 ? -1 : 1));
    else { setSortCol(col); setSortDir(typeof videos[0]?.[col] === 'number' ? -1 : 1); }
  };

  const topSet = new Set(videos.filter(v => v.score >= 4.5).map(v => v.index));

  const filtered = videos
    .filter(v => {
      if (!filters.showArchived && v.archived) return false;
      if (filters.search && !v.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          !v.channel.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.lang && v.lang !== filters.lang) return false;
      if (filters.type && v.type !== filters.type) return false;
      if (filters.audience && v.audience !== filters.audience) return false;
      if (filters.minScore && v.score < filters.minScore) return false;
      return true;
    })
    .sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'string') return av > bv ? sortDir : -sortDir;
      return ((av as number) - (bv as number)) * sortDir;
    });

  const avg = filtered.length
    ? (filtered.reduce((s, v) => s + v.score, 0) / filtered.length).toFixed(2)
    : '—';

  const thStyle = {
    background: '#f5f4f0', fontWeight: 600, fontSize: 12, color: '#6b6a65',
    padding: '9px 10px', textAlign: 'left' as const, borderBottom: '1px solid #e0ded6',
    whiteSpace: 'nowrap' as const, cursor: 'pointer', userSelect: 'none' as const,
  };
  const thCompact = { ...thStyle, padding: '9px 4px', textAlign: 'center' as const, width: 28 };
  const COL_LABEL: Record<string, string> = { U: 'Use', D: 'Dpt', O: 'Ori', R: 'Rel', C: 'Cmp' };
  const tdStyle = { padding: '8px 10px', borderBottom: '1px solid #f0ede6', verticalAlign: 'middle' as const };
  const tdCompact = { ...tdStyle, padding: '8px 4px', textAlign: 'center' as const, width: 28 };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, padding: '16px 28px' }}>
        {[
          [filtered.length, 'Showing'],
          [avg, 'Average score'],
          [filtered.filter(v => v.score >= 4.5).length, 'Score 4.5+'],
          [filtered.filter(v => v.lang === 'KR').length, 'Korean videos'],
        ].map(([val, label]) => (
          <div key={label as string} style={{
            background: '#fff', border: '1px solid #e0ded6', borderRadius: 8,
            padding: '12px 16px', flex: 1,
          }}>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{val}</div>
            <div style={{ fontSize: 11, color: '#6b6a65', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ padding: '0 28px 28px', overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse', background: '#fff',
          border: '1px solid #e0ded6', borderRadius: 8, overflow: 'hidden', fontSize: 13,
        }}>
          <thead>
            <tr>
              {(['index','title','lang','type','audience','U','D','O','R','C','score'] as SortCol[]).map(col => (
                <th key={col} style={['U','D','O','R','C'].includes(col) ? thCompact : thStyle} onClick={() => handleSort(col)}>
                  {col === 'index' ? '#' : (COL_LABEL[col] ?? col.charAt(0).toUpperCase() + col.slice(1))} ↕
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.index} style={{ opacity: v.archived ? 0.4 : 1 }}>
                <td style={{ ...tdStyle, textAlign: 'center', color: '#6b6a65', fontSize: 12 }}>{v.index}</td>
                <td style={{ ...tdStyle, maxWidth: 280 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.3 }}>
                    {v.title}
                    {topSet.has(v.index) && (
                      <span style={{
                        background: '#1d9e75', color: '#fff', fontSize: 10,
                        padding: '1px 5px', borderRadius: 3, marginLeft: 4, fontWeight: 600,
                      }}>TOP</span>
                    )}
                    {' '}
                    <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: '#fce8e8', color: '#cc0000', textDecoration: 'none', fontWeight: 500 }}>
                      YT
                    </a>
                    {' '}
                    <a href={`obsidian://open?vault=${encodeURIComponent(obsidianVault)}&file=${encodeURIComponent(obsidianFilePrefix ? `${obsidianFilePrefix}/${v.filename.replace('.md', '')}` : v.filename.replace('.md', ''))}`}
                      style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: '#eeedfe', color: '#534ab7', textDecoration: 'none', fontWeight: 500 }}>
                      OBS
                    </a>
                    {' '}
                    <a href={`/api/pdf/${v.filename.replace('.md', '.pdf')}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: '#faece7', color: '#993c1d', textDecoration: 'none', fontWeight: 500 }}>
                      PDF
                    </a>
                    {' '}
                    <button
                      onClick={() => onToggleArchive(v.index)}
                      style={{
                        fontSize: 11, padding: '1px 6px', borderRadius: 3,
                        background: v.archived ? '#faeeda' : '#f0ede6',
                        color: v.archived ? '#854f0b' : '#6b6a65',
                        border: 'none', cursor: 'pointer', fontWeight: 500,
                      }}
                    >
                      {v.archived ? '↩' : 'Archive'}
                    </button>
                    {' '}
                    <button
                      onClick={() => onDeepDive(v.id, v.title)}
                      style={{
                        fontSize: 11, padding: '1px 6px', borderRadius: 3,
                        background: '#e1f5ee', color: '#085041',
                        border: 'none', cursor: 'pointer', fontWeight: 500,
                      }}
                    >
                      Dive
                    </button>
                    {deepDiveIds.has(v.id) && (
                      <>
                        {' '}
                        <a
                          href={`obsidian://open?vault=${encodeURIComponent(obsidianVault)}&file=${encodeURIComponent(obsidianFilePrefix ? `${obsidianFilePrefix}/${v.filename.replace('.md', '_dive')}` : v.filename.replace('.md', '_dive'))}`}
                          style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: '#e1f5ee', color: '#085041', textDecoration: 'none', fontWeight: 500 }}
                        >
                          Deep↗
                        </a>
                        {' '}
                        {deepDivePdfIds.has(v.id) && (
                          <a
                            href={`/api/pdf/${v.filename.replace('.md', '_dive.pdf')}`}
                            target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: '#faece7', color: '#993c1d', textDecoration: 'none', fontWeight: 500 }}
                          >
                            PDF↗
                          </a>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b6a65', marginTop: 1 }}>{v.channel}</div>
                </td>
                <td style={tdStyle}><Badge label={v.lang} /></td>
                <td style={tdStyle}><Badge label={v.type} /></td>
                <td style={tdStyle}><Badge label={v.audience} /></td>
                {(['U','D','O','R','C'] as const).map(k => (
                  <td key={k} style={tdCompact}>{v[k]}</td>
                ))}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: scoreColor(v.score) }}>
                    {v.score.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
