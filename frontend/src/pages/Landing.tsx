import { useState } from 'react';
import { Leaf, Shield, Zap, Users, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../lib/store';
import { createWallet, loginWallet, getBalance, getProfile } from '../lib/canopy';

type Tab = 'create' | 'login';

export default function Landing() {
  const { setWallet, setProfile } = useApp();
  const [tab, setTab] = useState<Tab>('create');
  const [nickname, setNickname] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!nickname.trim() || !password.trim()) return;
    setLoading(true); setError('');
    try {
      const wallet = await createWallet(nickname.trim(), password);
      const balance = await getBalance(wallet.address).catch(() => ({ balance: 0 }));
      setWallet({ ...wallet, balance: balance.balance });
      const profile = await getProfile(wallet.address).catch(() => null);
      if (profile) setProfile(profile);
    } catch (e) {
      setError((e as Error).message || 'Failed to create wallet. Is the Canopy node running?');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!address.trim() || !password.trim()) return;
    setLoading(true); setError('');
    try {
      const wallet = await loginWallet(address.trim(), password);
      const balance = await getBalance(wallet.address).catch(() => ({ balance: 0 }));
      setWallet({ ...wallet, balance: balance.balance });
      const profile = await getProfile(wallet.address).catch(() => null);
      if (profile) setProfile(profile);
    } catch (e) {
      setError((e as Error).message || 'Login failed. Check address/password or Canopy node status.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, #030712 0%, #0a0f1a 50%, #0f172a 100%)',
      overflow: 'auto',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Header */}
      <header style={{ padding: '24px 40px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg, #22c55e, #15803d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(34,197,94,0.3)',
        }}>
          <Leaf size={22} color="white" />
        </div>
        <div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#f1f5f9' }}>Canopy Circle</span>
          <span style={{ fontSize: 11, color: 'var(--green-500)', marginLeft: 8, fontWeight: 600 }}>SOCIAL-FI</span>
        </div>
      </header>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 40px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: 80, alignItems: 'center', maxWidth: 1100, width: '100%', flexWrap: 'wrap' }}>

          {/* Left — copy */}
          <div style={{ flex: '1 1 380px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', marginBottom: 24,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-400)', letterSpacing: '0.5px' }}>
                BUILT ON CANOPY NETWORK
              </span>
            </div>

            <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1.5px' }}>
              Social media,<br />
              <span className="gradient-text">on-chain.</span>
            </h1>

            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 440, marginBottom: 36 }}>
              Canopy Circle is a Social-Fi platform where every post, follow, and circle membership
              is a real blockchain transaction. Your social graph lives on Canopy — forever and truly yours.
            </p>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { icon: Shield, text: 'Trustless & Censorship-resistant' },
                { icon: Zap,    text: 'Every action is a real tx' },
                { icon: Users,  text: 'Decentralized circles' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  <Icon size={14} color="#22c55e" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right — auth card */}
          <div className="glass glow-green" style={{ flex: '0 0 380px', padding: 28 }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderRadius: 12, background: 'rgba(255,255,255,0.06)', padding: 4, marginBottom: 24 }}>
              {(['create', 'login'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); }}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: tab === t ? 'rgba(34,197,94,0.2)' : 'transparent',
                    color: tab === t ? '#4ade80' : 'rgba(255,255,255,0.4)',
                    border: tab === t ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {t === 'create' ? 'Create Wallet' : 'Log In'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tab === 'create' && (
                <input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="Nickname (e.g. satoshi)"
                  style={inputStyle}
                />
              )}
              {tab === 'login' && (
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Wallet address (hex)"
                  style={inputStyle}
                />
              )}
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleLogin())}
                  placeholder="Password"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', color: 'rgba(255,255,255,0.4)' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: 12, lineHeight: 1.5 }}>
                  ⚠ {error}
                </div>
              )}

              <button
                onClick={tab === 'create' ? handleCreate : handleLogin}
                disabled={loading || (tab === 'create' ? !nickname.trim() : !address.trim()) || !password.trim()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 15,
                  background: 'linear-gradient(135deg, #22c55e, #15803d)',
                  color: 'white',
                  opacity: (loading || (tab === 'create' ? !nickname.trim() : !address.trim()) || !password.trim()) ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                  transition: 'all 0.2s',
                  marginTop: 4,
                }}
              >
                {loading ? 'Connecting...' : tab === 'create' ? 'Create account' : 'Enter the circle'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
              Requires a running Canopy node on localhost:50002/50003 and the proxy server on :3001
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ padding: '20px 40px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Canopy Circle · Social-Fi on Canopy Network · Contest #2</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>All social actions are real blockchain transactions</span>
      </footer>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#f1f5f9', fontSize: 14,
};
