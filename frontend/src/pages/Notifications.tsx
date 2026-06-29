import { Bell, Heart, UserPlus, MessageCircle, Star } from 'lucide-react';
import { useApp } from '../lib/store';
import { formatAddress } from '../lib/canopy';

// Notifications are stored on-chain as Notification records.
// This page shows a local demo of notification types until
// the query endpoint returns real notification data.
const DEMO_TYPES = [
  { icon: Heart,          color: '#f43f5e', label: 'appreciated your post',    time: '2m ago' },
  { icon: UserPlus,       color: '#22c55e', label: 'started following you',    time: '15m ago' },
  { icon: MessageCircle,  color: '#3b82f6', label: 'replied to your post',     time: '1h ago' },
  { icon: Star,           color: '#f59e0b', label: 'bookmarked your post',     time: '2h ago' },
  { icon: UserPlus,       color: '#22c55e', label: 'started following you',    time: '3h ago' },
];

export default function Notifications() {
  const { wallet, profile } = useApp();

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,15,26,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '18px 20px',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={18} color="#22c55e" /> Notifications
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>On-chain social activity for {profile?.username || formatAddress(wallet?.address || '')}</p>
      </div>

      <div style={{ padding: '12px 0' }}>
        {/* Info banner */}
        <div style={{
          margin: '12px 20px 20px', padding: '14px 16px', borderRadius: 12,
          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
          fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
        }}>
          🔔 Notifications are stored on-chain as <code style={{ color: '#4ade80' }}>Notification</code> records.
          Query the plugin RPC at <code style={{ color: '#4ade80' }}>GET /v1/query/notifications/:address</code> for live data.
          Showing preview below.
        </div>

        {DEMO_TYPES.map(({ icon: Icon, color, label, time }, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: `${color}18`, border: `1px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={16} color={color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#f1f5f9' }}>
                <span style={{ fontWeight: 600, color: '#4ade80' }}>0x{Math.random().toString(16).slice(2, 10)}…</span>
                {' '}{label}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{time}</div>
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px rgba(34,197,94,0.5)',
            }} />
          </div>
        ))}

        <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
          Real notifications are written to chain on every social interaction.<br />
          Each follow, appreciate, reply triggers a <code>Notification</code> protobuf record.
        </div>
      </div>
    </div>
  );
}
