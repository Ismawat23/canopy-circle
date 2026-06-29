import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { createPost } from '../lib/canopy';
import { useApp } from '../lib/store';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  defaultCircleId?: string;
}

export default function CreatePostModal({ onClose, onSuccess, defaultCircleId = '' }: Props) {
  const { wallet } = useApp();
  const [content, setContent] = useState('');
  const [circleId, setCircleId] = useState(defaultCircleId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!wallet || !content.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      await createPost(wallet.address, content.trim(), circleId.trim());
      onSuccess();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass fade-in" style={{ width: '100%', maxWidth: 520, margin: 20, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Create Post</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={500}
          placeholder="What's on your mind? Share with the Canopy community..."
          autoFocus
          style={{
            width: '100%', minHeight: 120, padding: 14, borderRadius: 12, resize: 'vertical',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#f1f5f9', fontSize: 14, lineHeight: 1.6,
            marginBottom: 12,
          }}
        />

        <input
          value={circleId}
          onChange={e => setCircleId(e.target.value)}
          placeholder="Circle ID (optional — leave blank for global feed)"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#f1f5f9', fontSize: 13, marginBottom: 16,
          }}
        />

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{content.length}/500</span>
          <button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 10, fontWeight: 600, fontSize: 14,
              background: content.trim() ? 'var(--green-600)' : 'rgba(255,255,255,0.1)',
              color: content.trim() ? 'white' : 'rgba(255,255,255,0.3)',
              opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Send size={15} />
            {loading ? 'Posting...' : 'Post on-chain'}
          </button>
        </div>
      </div>
    </div>
  );
}
