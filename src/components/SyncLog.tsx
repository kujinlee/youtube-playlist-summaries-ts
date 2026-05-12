'use client';

import { useEffect, useRef } from 'react';

interface Props {
  lines: string[];
  syncing: boolean;
  onClose: () => void;
  title?: string;
}

export default function SyncLog({ lines, syncing, onClose, title }: Props) {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div style={{ margin: '0 28px 16px', position: 'relative' }}>
      {title && (
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6b6a65', marginBottom: 4, paddingLeft: 2 }}>
          {title}
        </div>
      )}
      <pre ref={ref} style={{
        background: '#1a1a18', color: '#d4d4d4', borderRadius: 8,
        padding: 16, fontFamily: 'monospace', fontSize: 12,
        maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap',
        margin: 0,
      }}>
        {lines.join('\n') || (syncing ? 'Starting sync…' : '')}
      </pre>
      {!syncing && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'transparent', border: 'none',
            color: '#6b6a65', cursor: 'pointer', fontSize: 14,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
