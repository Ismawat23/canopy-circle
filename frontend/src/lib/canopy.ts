/**
 * Canopy Circle — API client
 * All calls go to the proxy server at /api (proxied from localhost:3001 by Vite)
 */

const BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as T;
}

// ── Wallet ────────────────────────────────────────────────────────────────────

export async function createWallet(nickname: string, password: string) {
  return apiFetch<{ address: string; publicKey: string }>('/wallet/create', {
    method: 'POST',
    body: JSON.stringify({ nickname, password }),
  });
}

export async function loginWallet(address: string, password: string) {
  return apiFetch<{ address: string; publicKey: string }>('/wallet/login', {
    method: 'POST',
    body: JSON.stringify({ address, password }),
  });
}

export async function getBalance(address: string) {
  return apiFetch<{ address: string; balance: number }>(`/wallet/${address}/balance`);
}

export async function getChainHeight() {
  return apiFetch<{ height: number }>('/chain/height');
}

export async function sendTokens(fromAddress: string, toAddress: string, amount: number) {
  return apiFetch('/wallet/send', {
    method: 'POST',
    body: JSON.stringify({ fromAddress, toAddress, amount }),
  });
}

// ── Social ────────────────────────────────────────────────────────────────────

export async function createProfile(address: string, username: string, bio = '', avatarUrl = '') {
  return apiFetch('/social/profile', {
    method: 'POST',
    body: JSON.stringify({ address, username, bio, avatarUrl }),
  });
}

export async function updateProfile(address: string, bio: string, avatarUrl: string) {
  return apiFetch('/social/profile', {
    method: 'PUT',
    body: JSON.stringify({ address, bio, avatarUrl }),
  });
}

export async function getProfile(address: string) {
  return apiFetch<import('./types').Profile>(`/social/profile/${address}`);
}

export async function createPost(authorAddress: string, content: string, circleId = '') {
  return apiFetch<{ postId: string }>('/social/post', {
    method: 'POST',
    body: JSON.stringify({ authorAddress, content, circleId }),
  });
}

export async function replyToPost(authorAddress: string, postId: string, content: string) {
  return apiFetch<{ replyId: string }>('/social/reply', {
    method: 'POST',
    body: JSON.stringify({ authorAddress, postId, content }),
  });
}

export async function getPost(postId: string) {
  return apiFetch<import('./types').Post>(`/social/post/${encodeURIComponent(postId)}`);
}

export async function getPostsByAuthor(address: string) {
  return apiFetch<{ posts: import('./types').Post[] }>(`/social/posts/author/${address}`);
}

export async function getPostsByCircle(circleId: string) {
  return apiFetch<{ posts: import('./types').Post[] }>(`/social/posts/circle/${encodeURIComponent(circleId)}`);
}

export async function getReplies(postId: string) {
  return apiFetch<{ replies: import('./types').Reply[] }>(`/social/replies/${encodeURIComponent(postId)}`);
}

export async function createCircle(creatorAddress: string, name: string, description = '', rules = '') {
  return apiFetch<{ circleId: string }>('/social/circle', {
    method: 'POST',
    body: JSON.stringify({ creatorAddress, name, description, rules }),
  });
}

export async function getCircle(circleId: string) {
  return apiFetch<import('./types').Circle>(`/social/circle/${encodeURIComponent(circleId)}`);
}

export async function getAllCircles() {
  return apiFetch<{ circles: import('./types').Circle[] }>('/social/circles');
}

export async function joinCircle(memberAddress: string, circleId: string) {
  return apiFetch('/social/circle/join', {
    method: 'POST',
    body: JSON.stringify({ memberAddress, circleId }),
  });
}

export async function leaveCircle(memberAddress: string, circleId: string) {
  return apiFetch('/social/circle/leave', {
    method: 'POST',
    body: JSON.stringify({ memberAddress, circleId }),
  });
}

export async function followUser(followerAddress: string, followeeAddress: string) {
  return apiFetch('/social/follow', {
    method: 'POST',
    body: JSON.stringify({ followerAddress, followeeAddress }),
  });
}

export async function unfollowUser(followerAddress: string, followeeAddress: string) {
  return apiFetch('/social/unfollow', {
    method: 'POST',
    body: JSON.stringify({ followerAddress, followeeAddress }),
  });
}

export async function appreciatePost(userAddress: string, postId: string) {
  return apiFetch('/social/appreciate', {
    method: 'POST',
    body: JSON.stringify({ userAddress, postId }),
  });
}

export async function bookmarkPost(userAddress: string, postId: string) {
  return apiFetch('/social/bookmark', {
    method: 'POST',
    body: JSON.stringify({ userAddress, postId }),
  });
}

export function formatAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
