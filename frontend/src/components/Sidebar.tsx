import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Compass, Circle, Wallet, Bell, User, LogOut, Leaf } from 'lucide-react';
import { useApp } from '../lib/store';
import { formatAddress } from '../lib/canopy';

const NAV = [
  { to: '/',              icon: Home,    label: 'Home' },
  { to: '/explore',       icon: Compass, label: 'Explore' },
  { to: '/circles',       icon: Circle,  label: 'Circles' },
  { to: '/wallet',        icon: Wallet,  label: 'Wallet' },
  { to: '/notifications', icon: Bell,    label: 'Notifications' },
];

export default function Sidebar() {
  const { wallet, profile, chain, logout } = useApp();
  const navigate = useNavigate();

  const profilePath = wallet ? `/profile/${wallet.address}` : '/profile';

  return (
    <aside style={{
      width: 240,
      minWidth: 240,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(0,0,0,0.2)',
      backdropFilter: 'blur(20px)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(34,197,94,0.3)',
        }}>
          <Leaf size={20} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', color: '#f1f5f9' }}>Canopy</div>
          <div style={{ fontSize: 11, color: 'var(--green-500)', fontWeight: 600, letterSpacing: '0.5px' }}>CIRCLE</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 12,
              fontWeight: isActive ? 600 : 400,
              fontSize: 14,
              color: isActive ? '#22c55e' : 'rgba(255,255,255,0.6)',
              background: isActive ? 'rgba(34,197,94,0.1)' : 'transparent',
              transition: 'all 0.15s',
              border: isActive ? '1px solid rgba(34,197,94,0.2)' : '1px solid transparent',
              textDecoration: 'none',
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        <NavLink
          to={profilePath}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 12,
            fontWeight: isActive ? 600 : 400,
            fontSize: 14,
            color: isActive ? '#22c55e' : 'rgba(255,255,255,0.6)',
            background: isActive ? 'rgba(34,197,94,0.1)' : 'transparent',
            transition: 'all 0.15s',
            border: isActive ? '1px solid rgba(34,197,94,0.2)' : '1px solid transparent',
            textDecoration: 'none',
          })}
        >
          <User size={18} />
          Profile
        </NavLink>
      </nav>

      {/* Chain status */}
      <div style={{
        padding: '10px 12px', borderRadius: 10, marginBottom: 12,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: chain.connected ? '#22c55e' : '#ef4444',
            animation: chain.connected ? 'pulse-green 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: chain.connected ? '#4ade80' : '#ef4444' }}>
            {chain.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          Block #{chain.height.toLocaleString()}
        </div>
      </div>

      {/* User card */}
      {wallet && (
        <div style={{
          padding: '12px', borderRadius: 12,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div
            onClick={() => navigate(profilePath)}
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, #22c55e 0%, #15803d 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer',
            }}
          >
            {(profile?.username || wallet.address).slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.username || 'Anonymous'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {formatAddress(wallet.address)}
            </div>
          </div>
          <button
            onClick={logout}
            style={{ padding: 6, borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.35)' }}
            title="Log out"
          >
            <LogOut size={14} />
          </button>
        </div>
      )}
    </aside>
  );
}
