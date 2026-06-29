import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Users, X } from 'lucide-react';
import { getAllCircles, createCircle, getPostsByCircle } from '../lib/canopy';
import type { Circle, Post } from '../lib/types';
import CircleCard from '../components/CircleCard';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { useApp } from '../lib/store';

export default function Circles() {
  const { wallet, profile } = useApp();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [circlePosts, setCirclePosts] = useState<Post[]>([]);
  const [showPost, setShowPost] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllCircles();
      setCircles(data.circles || []);
    } catch { setCircles([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedCircle) return;
    getPostsByCircle(selectedCircle.id)
      .then(d => setCirclePosts((d.posts || []).sort((a, b) => b.createdAt - a.createdAt)))
      .catch(() => setCirclePosts([]));
  }, [selectedCircle?.id]);

  const handleCreate = async () => {
    if (!wallet || !name.trim()) return;
    setCreating(true); setCreateError('');
    try {
      await createCircle(wallet.address, name.trim(), description.trim(), rules.trim());
      setShowCreate(false);
      setName(''); setDescription(''); setRules('');
      setTimeout(load, 1500);
    } catch (e) { setCreateError((e as Error).message); }
    setCreating(false);
  };

  if (selectedCircle) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(10,15,26,0.8)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSelectedCircle(null)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', padding: 4 }}>
              <X size={18} />
            </button>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700 }}>⭕ {selectedCircle.name}</h1>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                <Users size={11} style={{ display: 'inline', marginRight: 4 }} />{selectedCircle.memberCount} members
              </span>
            </div>
            {profile && (
              <button
                onClick={() => setShowPost(true)}
                style={{
                  marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: 'var(--green-600)', color: 'white',
                }}
              >
                <Plus size={14} /> Post
              </button>
            )}
          </div>
        </div>
        {selectedCircle.description && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            {selectedCircle.description}
          </div>
        )}
        <div>
          {circlePosts.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⭕</div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No posts in this circle yet</p>
            </div>
          ) : circlePosts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
        {showPost && (
          <CreatePostModal
            onClose={() => setShowPost(false)}
            onSuccess={() => setTimeout(() => getPostsByCircle(selectedCircle.id).then(d => setCirclePosts((d.posts || []).sort((a, b) => b.createdAt - a.createdAt))).catch(() => {}), 1500)}
            defaultCircleId={selectedCircle.id}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,15,26,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '18px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>Circles</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>On-chain communities</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: 8, borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
            <RefreshCw size={16} />
          </button>
          {wallet && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13,
                background: 'linear-gradient(135deg, #22c55e, #15803d)', color: 'white',
              }}
            >
              <Plus size={15} /> New Circle
            </button>
          )}
        </div>
      </div>

      {/* Create Circle Form */}
      {showCreate && (
        <div className="glass fade-in" style={{ margin: 20, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Create a new Circle</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { value: name, set: setName, placeholder: 'Circle name (3-64 chars)', required: true },
              { value: description, set: setDescription, placeholder: 'Description (optional)' },
              { value: rules, set: setRules, placeholder: 'Rules (optional)' },
            ].map(({ value, set, placeholder, required }) => (
              <input
                key={placeholder}
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                style={{
                  padding: '11px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,${required && !value.trim() ? '0.2' : '0.1'})`,
                  color: '#f1f5f9', fontSize: 13,
                }}
              />
            ))}
            {createError && <div style={{ color: '#fca5a5', fontSize: 12 }}>{createError}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                style={{ flex: 2, padding: '10px 0', borderRadius: 10, fontWeight: 600, fontSize: 13, background: 'var(--green-600)', color: 'white', opacity: creating || !name.trim() ? 0.6 : 1 }}
              >
                {creating ? 'Creating...' : 'Create on-chain →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Circles list */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading circles...</div>
        ) : circles.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⭕</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No circles yet — be the first to create one!</p>
          </div>
        ) : circles.map(circle => (
          <div key={circle.id} onClick={() => setSelectedCircle(circle)} style={{ cursor: 'pointer' }}>
            <CircleCard circle={circle} onJoin={load} />
          </div>
        ))}
      </div>
    </div>
  );
}
