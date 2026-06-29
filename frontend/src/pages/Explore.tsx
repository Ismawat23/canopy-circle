import { useEffect, useState } from 'react';
import { Search, TrendingUp, RefreshCw } from 'lucide-react';
import { getProfile, getPostsByAuthor, formatAddress } from '../lib/canopy';
import type { Post, Profile } from '../lib/types';
import PostCard from '../components/PostCard';
import { useApp } from '../lib/store';

export default function Explore() {
  const { wallet } = useApp();
  const [searchAddr, setSearchAddr] = useState('');
  const [searchResult, setSearchResult] = useState<{ profile: Profile; posts: Post[] } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    setLoadingFeed(true);
    getPostsByAuthor(wallet.address)
      .then(d => setMyPosts((d.posts || []).sort((a: Post, b: Post) => b.createdAt - a.createdAt)))
      .catch(() => setMyPosts([]))
      .finally(() => setLoadingFeed(false));
  }, [wallet?.address]);

  const handleSearch = async () => {
    const addr = searchAddr.trim();
    if (!addr || addr.length < 20) { setSearchError('Enter a valid address (40 hex chars)'); return; }
    setSearchLoading(true); setSearchError(''); setSearchResult(null);
    try {
      const [profile, postsData] = await Promise.all([
        getProfile(addr),
        getPostsByAuthor(addr).catch(() => ({ posts: [] as Post[] }))
      ]);
      setSearchResult({ profile, posts: postsData.posts.sort((a: Post, b: Post) => b.createdAt - a.createdAt) });
    } catch {
      setSearchError('Profile not found on chain.');
    }
    setSearchLoading(false);
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,15,26,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '18px 20px',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Explore</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input
              value={searchAddr}
              onChange={e => setSearchAddr(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by wallet address (40 hex chars)..."
              style={{
                width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9', fontSize: 13,
              }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searchLoading}
            style={{
              padding: '10px 18px', borderRadius: 10, fontWeight: 600, fontSize: 13,
              background: 'var(--green-600)', color: 'white', opacity: searchLoading ? 0.6 : 1,
            }}
          >
            {searchLoading ? '...' : 'Search'}
          </button>
        </div>
        {searchError && <p style={{ fontSize: 12, color: '#fca5a5', marginTop: 8 }}>{searchError}</p>}
      </div>

      {searchResult && (
        <div className="fade-in">
          <div style={{ padding: '20px 20px 0' }}>
            <div className="glass" style={{ padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #22c55e, #15803d)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, color: 'white',
                }}>
                  {(searchResult.profile.username || 'A').slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{searchResult.profile.username || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{formatAddress(searchResult.profile.address)}</div>
                  {searchResult.profile.bio && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{searchResult.profile.bio}</p>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                {[
                  { label: 'Posts', value: searchResult.profile.postCount },
                  { label: 'Followers', value: searchResult.profile.followerCount },
                  { label: 'Following', value: searchResult.profile.followingCount },
                  { label: 'Rep', value: searchResult.profile.reputation },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#22c55e' }}>{value}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {searchResult.posts.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No posts found</div>
            ) : searchResult.posts.map((p: Post) => <PostCard key={p.id} post={{ ...p, authorProfile: searchResult.profile }} />)}
          </div>
        </div>
      )}

      {!searchResult && (
        <>
          <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={15} color="#22c55e" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Your Recent Posts</span>
            <button onClick={() => {
              setLoadingFeed(true);
              getPostsByAuthor(wallet?.address || '')
                .then(d => setMyPosts((d.posts || []).sort((a: Post, b: Post) => b.createdAt - a.createdAt)))
                .catch(() => {})
                .finally(() => setLoadingFeed(false));
            }} style={{ marginLeft: 'auto', padding: 6, background: 'transparent', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw size={14} />
            </button>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {loadingFeed ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading...</div>
            ) : myPosts.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Search any address above to explore their on-chain profile and posts</p>
              </div>
            ) : myPosts.map((p: Post) => <PostCard key={p.id} post={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
