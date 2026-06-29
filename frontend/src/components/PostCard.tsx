import { useState } from 'react';
import { Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';
import type { Post } from '../lib/types';
import { appreciatePost, bookmarkPost, formatAddress, formatTime } from '../lib/canopy';
import { useApp } from '../lib/store';

interface Props {
  post: Post;
  onReply?: (postId: string) => void;
}

export default function PostCard({ post, onReply }: Props) {
  const { wallet } = useApp();
  const [appreciated, setAppreciated] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [appreciateCount, setAppreciateCount] = useState(post.appreciateCount);
  const [loading, setLoading] = useState<string | null>(null);

  const handleAppreciate = async () => {
    if (!wallet || appreciated || loading) return;
    setLoading('appreciate');
    try {
      await appreciatePost(wallet.address, post.id);
      setAppreciated(true);
      setAppreciateCount(c => c + 1);
    } catch { /* ignore duplicate */ }
    setLoading(null);
  };

  const handleBookmark = async () => {
    if (!wallet || bookmarked || loading) return;
    setLoading('bookmark');
    try {
      await bookmarkPost(wallet.address, post.id);
      setBookmarked(true);
    } catch { /* ignore */ }
    setLoading(null);
  };

  const authorLabel = post.authorProfile?.username || formatAddress(post.authorAddress);
  const initial = authorLabel.slice(0, 1).toUpperCase();

  return (
    <div style={{
      padding: '18px 20px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      transition: 'background 0.15s',
      cursor: 'default',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #22c55e, #15803d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: 'white',
        }}>
          {initial}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#f1f5f9' }}>{authorLabel}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              {formatAddress(post.authorAddress)}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
              {formatTime(post.createdAt)}
            </span>
          </div>

          {/* Content */}
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, wordBreak: 'break-word', marginBottom: 12 }}>
            {post.content}
          </p>

          {post.circleId && (
            <div style={{ marginBottom: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20,
                background: 'rgba(34,197,94,0.1)', color: 'var(--green-400)',
                border: '1px solid rgba(34,197,94,0.2)',
              }}>
                ⭕ {post.circleId.split('-')[0]}
              </span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 20 }}>
            <ActionBtn
              icon={<MessageCircle size={15} />}
              count={post.replyCount}
              onClick={() => onReply?.(post.id)}
              color="#94a3b8"
            />
            <ActionBtn
              icon={<Heart size={15} fill={appreciated ? '#22c55e' : 'none'} />}
              count={appreciateCount}
              onClick={handleAppreciate}
              active={appreciated}
              color={appreciated ? '#22c55e' : '#94a3b8'}
              loading={loading === 'appreciate'}
            />
            <ActionBtn
              icon={<Bookmark size={15} fill={bookmarked ? '#22c55e' : 'none'} />}
              count={0}
              onClick={handleBookmark}
              active={bookmarked}
              color={bookmarked ? '#22c55e' : '#94a3b8'}
              loading={loading === 'bookmark'}
              hideCount
            />
            <ActionBtn
              icon={<Share2 size={15} />}
              count={0}
              onClick={() => navigator.clipboard?.writeText(post.id)}
              color="#94a3b8"
              hideCount
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, count, onClick, active, color, loading, hideCount }: {
  icon: React.ReactNode; count: number; onClick?: () => void;
  active?: boolean; color?: string; loading?: boolean; hideCount?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        color: active ? '#22c55e' : (color || '#94a3b8'),
        background: 'transparent',
        fontSize: 13, opacity: loading ? 0.5 : 1,
        transition: 'color 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {icon}
      {!hideCount && count > 0 && <span>{count}</span>}
    </button>
  );
}
