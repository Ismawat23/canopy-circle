import { Users } from 'lucide-react';
import type { Circle } from '../lib/types';
import { joinCircle } from '../lib/canopy';
import { useApp } from '../lib/store';
import { useState } from 'react';

interface Props {
  circle: Circle;
  onJoin?: () => void;
}

export default function CircleCard({ circle, onJoin }: Props) {
  const { wallet } = useApp();
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleJoin = async () => {
    if (!wallet || joining || joined) return;
    setJoining(true);
    try {
      await joinCircle(wallet.address, circle.id);
      setJoined(true);
      onJoin?.();
    } catch { /* already member */ joined || setJoined(true); }
    setJoining(false);
  };

  const colors = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'];
  const color = colors[Math.abs(circle.id.charCodeAt(0)) % colors.length];

  return (
    <div className="glass" style={{ padding: '18px 20px', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${color}20`,
          border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          ⭕
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 4 }}>{circle.name}</div>
          {circle.description && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 10, lineHeight: 1.5 }}>
              {circle.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              <Users size={13} />
              {circle.memberCount.toLocaleString()} members
            </div>
            {wallet && (
              <button
                onClick={handleJoin}
                disabled={joining || joined}
                style={{
                  padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: joined ? 'rgba(34,197,94,0.15)' : 'var(--green-600)',
                  color: joined ? 'var(--green-400)' : 'white',
                  border: joined ? '1px solid rgba(34,197,94,0.3)' : 'none',
                  opacity: joining ? 0.6 : 1,
                  cursor: joined ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {joining ? '...' : joined ? 'Joined' : 'Join'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
