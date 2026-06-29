import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Edit2, Check, X, RefreshCw } from 'lucide-react';
import { useApp } from '../lib/store';
import { getProfile, getPostsByAuthor, updateProfile, followUser, formatAddress, formatTime } from '../lib/canopy';
import type { Post, Profile } from '../lib/types';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';

export default function ProfilePage() {
  const { address: paramAddress } = useParams<{ address?: string }>();
  const { wallet, profile: myProfile, setProfile: setMyProfile } = useApp();

  const targetAddress = paramAddress || wallet?.address || '';
  const isMe = targetAddress === wallet?.address;

  const [profile, setProfile] = useState<Profile | null>(isMe ? myProfile : null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [following, setFollowing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  const load = async () => {
    if (!targetAddress) return;
    setLoading(true);
    try {
      const [p, postsData] = await Promise.all([
        getProfile(targetAddress),
        getPostsByAuthor(targetAddress).catch(() => ({ posts: [] as Post[] }))
      ]);
      setProfile(p);
      if (isMe) setMyProfile(p);
      setPosts(postsData.posts.sort((a, b) => b.createdAt - a.createdAt));
    } catch { setProfile(null); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [targetAddress]);

  const handleEdit = () => {
    setNewBio(profile?.bio || '');
    setNewAvatar(profile?.avatarUrl || '');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!wallet) return;
    setSaving(true);
    try {
      await updateProfile(wallet.address, newBio, newAvatar);
      setTimeout(load, 1500);
      setEditing(false);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleFollow = async () => {
    if (!wallet || !targetAddress || isMe) return;
    setFollowing(true);
    try {
      await followUser(wallet.address, targetAddress);
      await load();
    } catch { /* already following */ }
    setFollowing(false);
  };

  const initial = (profile?.username || targetAddress).slice(0, 1).toUpperCase();

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,15,26,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>
          {profile?.username ? `@${profile.username}` : 'Profile'}
        </h1>
        <button onClick={load} style={{ padding: 8, borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
          <RefreshCw size={15} />
        </button>
        {isMe && (
          <button
            onClick={() => setShowCompose(true)}
            style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--green-600)', color: 'white' }}
          >
            + Post
          </button>
        )}
      </div>

      {loading && !profile ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading profile from chain...</div>
      ) : !profile ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👤</div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No profile found on-chain for this address</p>
          {isMe && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8 }}>Go to Home to create your profile</p>}
        </div>
      ) : (
        <>
          {/* Profile header */}
          <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 800, color: 'white',
                boxShadow: '0 0 20px rgba(34,197,94,0.2)',
              }}>
                {initial}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 2 }}>{profile.username}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginBottom: 8 }}>
                  {formatAddress(profile.address)}
                </div>
                {editing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      value={newBio}
                      onChange={e => setNewBio(e.target.value)}
                      placeholder="Bio"
                      rows={2}
                      style={{
                        padding: '8px 12px', borderRadius: 8, resize: 'none',
                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                        color: '#f1f5f9', fontSize: 13, maxWidth: 360,
                      }}
                    />
                    <input
                      value={newAvatar}
                      onChange={e => setNewAvatar(e.target.value)}
                      placeholder="Avatar URL"
                      style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                        color: '#f1f5f9', fontSize: 13, maxWidth: 360,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: 'var(--green-600)', color: 'white', fontSize: 13, fontWeight: 600 }}>
                        <Check size={13} />{saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditing(false)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                        <X size={13} />Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {profile.bio && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, maxWidth: 360 }}>{profile.bio}</p>}
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                      Joined {formatTime(profile.createdAt)}
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {isMe ? (
                  <button
                    onClick={handleEdit}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    disabled={following}
                    style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'var(--green-600)', color: 'white', opacity: following ? 0.6 : 1 }}
                  >
                    {following ? '...' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 24 }}>
              {[
                { label: 'Posts', value: profile.postCount },
                { label: 'Followers', value: profile.followerCount },
                { label: 'Following', value: profile.followingCount },
                { label: 'Reputation', value: profile.reputation, color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <span style={{ fontWeight: 700, fontSize: 17, color: color || '#f1f5f9' }}>{value}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 5 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Posts */}
          <div>
            {posts.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No posts yet</p>
              </div>
            ) : posts.map(p => <PostCard key={p.id} post={{ ...p, authorProfile: profile }} />)}
          </div>
        </>
      )}

      {showCompose && (
        <CreatePostModal
          onClose={() => setShowCompose(false)}
          onSuccess={() => setTimeout(load, 1500)}
        />
      )}
    </div>
  );
}
