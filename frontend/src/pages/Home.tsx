import { useEffect, useState, useCallback } from 'react';
import { PenSquare, RefreshCw, Sparkles } from 'lucide-react';
import { useApp } from '../lib/store';
import { getPostsByAuthor, createProfile } from '../lib/canopy';
import type { Post } from '../lib/types';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';

export default function Home() {
  const { wallet, profile, setProfile } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  const load = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const data = await getPostsByAuthor(wallet.address);
      setPosts(data.posts || []);
    } catch { setPosts([]); }
    setLoading(false);
  }, [wallet?.address]);

  useEffect(() => { load(); }, [load]);

  const handleSetupProfile = async () => {
    if (!wallet || !username.trim()) return;
    setSetupLoading(true); setSetupError('');
    try {
      await createProfile(wallet.address, username.trim(), bio.trim());
      const { getProfile } = await import('../lib/canopy');
      const p = await getProfile(wallet.address);
      setProfile(p);
      setShowSetup(false);
    } catch (e) { setSetupError((e as Error).message); }
    setSetupLoading(false);
  };

  const myPosts = posts.slice().sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,15,26,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '18px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>
            {profile ? `Welcome, ${profile.username}` : 'Home'}
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Your on-chain activity</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: 8, borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button
            onClick={() => profile ? setShowCompose(true) : setShowSetup(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13,
              background: 'linear-gradient(135deg, #22c55e, #15803d)',
              color: 'white', boxShadow: '0 2px 12px rgba(34,197,94,0.25)',
            }}
          >
            <PenSquare size={15} />
            {profile ? 'Post' : 'Set up profile'}
          </button>
        </div>
      </div>

      {/* Profile Setup Banner */}
      {!profile && !showSetup && (
        <div style={{
          margin: 20, padding: '18px 20px', borderRadius: 16,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Sparkles size={18} color="#22c55e" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Complete your on-chain profile</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
            Your profile is stored on the Canopy blockchain. Create it once — it's yours forever.
          </p>
          <button
            onClick={() => setShowSetup(true)}
            style={{
              padding: '8px 18px', borderRadius: 10, fontWeight: 600, fontSize: 13,
              background: 'var(--green-600)', color: 'white',
            }}
          >
            Create profile →
          </button>
        </div>
      )}

      {/* Profile Setup Form */}
      {showSetup && (
        <div className="glass fade-in" style={{ margin: 20, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Create your on-chain profile</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username (3-32 chars, alphanumeric + _)"
              style={{
                padding: '11px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9', fontSize: 13,
              }}
            />
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Bio (optional)"
              rows={2}
              style={{
                padding: '11px 14px', borderRadius: 10, resize: 'vertical',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9', fontSize: 13,
              }}
            />
            {setupError && <div style={{ color: '#fca5a5', fontSize: 12 }}>{setupError}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowSetup(false)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSetupProfile}
                disabled={setupLoading || !username.trim()}
                style={{
                  flex: 2, padding: '10px 0', borderRadius: 10, fontWeight: 600, fontSize: 13,
                  background: 'var(--green-600)', color: 'white',
                  opacity: setupLoading || !username.trim() ? 0.6 : 1,
                }}
              >
                {setupLoading ? 'Creating...' : 'Create on-chain →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            Loading your posts from chain...
          </div>
        ) : myPosts.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No posts yet — share something with the world!</p>
          </div>
        ) : (
          myPosts.map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>

      {showCompose && (
        <CreatePostModal
          onClose={() => setShowCompose(false)}
          onSuccess={() => { setTimeout(load, 1500); }}
        />
      )}
    </div>
  );
}
