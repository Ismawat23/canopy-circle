export interface Profile {
  address: string;
  username: string;
  bio: string;
  avatarUrl: string;
  createdAt: number;
  postCount: number;
  followerCount: number;
  followingCount: number;
  reputation: number;
}

export interface Post {
  id: string;
  authorAddress: string;
  circleId: string;
  content: string;
  createdAt: number;
  replyCount: number;
  appreciateCount: number;
  authorProfile?: Profile;
}

export interface Circle {
  id: string;
  creatorAddress: string;
  name: string;
  description: string;
  rules: string;
  createdAt: number;
  memberCount: number;
}

export interface Reply {
  id: string;
  postId: string;
  authorAddress: string;
  content: string;
  createdAt: number;
  authorProfile?: Profile;
}

export interface WalletInfo {
  address: string;
  publicKey: string;
  balance: number;
}

export interface ChainStatus {
  height: number;
  connected: boolean;
}
