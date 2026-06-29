/**
 * Canopy Circle — Proxy Server
 *
 * Bridges the React frontend to the Canopy node RPC (50002/50003) and
 * the plugin custom RPC (50010). Handles BLS12-381 transaction signing
 * so the browser never needs to hold a private key.
 *
 * Run:  npm run dev   (port 3001)
 */

import express from 'express';
import cors from 'cors';
import { bls12_381 } from '@noble/curves/bls12-381.js';
import { createHash } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

// ─── Config ───────────────────────────────────────────────────────────────────
const QUERY_RPC  = process.env.CANOPY_QUERY_RPC  || 'http://127.0.0.1:50002';
const ADMIN_RPC  = process.env.CANOPY_ADMIN_RPC  || 'http://127.0.0.1:50003';
const PLUGIN_RPC = process.env.CANOPY_PLUGIN_RPC || 'http://127.0.0.1:50010';
const NETWORK_ID = BigInt(process.env.NETWORK_ID || '1');
const CHAIN_ID   = BigInt(process.env.CHAIN_ID   || '1');
const PORT       = parseInt(process.env.PORT || '3001');

// BLS DST used by Canopy
const DST = 'BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_';

// In-memory session store (demo only — use a DB in production)
const sessions: Map<string, { privateKey: string; publicKey: string; password: string }> = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function canopyPost(url: string, body: object): Promise<unknown> {
  const res = await fetch(`${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (res.status >= 400) throw new Error(`Canopy RPC error ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function canopyGet(url: string): Promise<unknown> {
  const res = await fetch(url);
  const text = await res.text();
  if (res.status >= 400) throw new Error(`Plugin RPC error ${res.status}: ${text}`);
  return JSON.parse(text);
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

function getSignBytes(
  msgType: string,
  msgTypeUrl: string,
  msgEncoded: Uint8Array,
  time: bigint,
  createdHeight: bigint,
  fee: bigint,
  memo: string,
  networkId: bigint,
  chainId: bigint
): Uint8Array {
  // Minimal protobuf encoding of Transaction (field by field)
  // This mirrors what the tutorial's getSignBytes function does
  // For a real implementation, use protobufjs to encode
  // Here we approximate it to get a deterministic byte sequence for signing
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [
    enc.encode(`${msgType}:${msgTypeUrl}:`),
    msgEncoded,
    enc.encode(`:${time}:${createdHeight}:${fee}:${memo}:${networkId}:${chainId}`)
  ];
  const total = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { result.set(p, offset); offset += p.length; }
  return result;
}

async function signAndSubmit(
  address: string,
  msgType: string,
  msgTypeUrl: string,
  msgEncoded: Uint8Array,
  fee: bigint,
  memo = ''
): Promise<unknown> {
  const session = sessions.get(address);
  if (!session) throw new Error('No session found — please log in first');

  // Get current height
  const heightResp = await canopyPost(`${QUERY_RPC}/v1/query/height`, {}) as { height: number };
  const createdHeight = BigInt(heightResp.height || 0);
  const time = BigInt(Date.now());

  const signBytes = getSignBytes(
    msgType, msgTypeUrl, msgEncoded,
    time, createdHeight, fee, memo, NETWORK_ID, CHAIN_ID
  );

  // BLS12-381 G2 signature
  const privKeyBytes = hexToBytes(session.privateKey);
  const signature = bls12_381.G2.hashToCurve(signBytes, { DST }).toRawBytes();
  const pubKeyBytes = hexToBytes(session.publicKey);

  // Build signed transaction body
  const txBody = {
    messageType: msgType,
    msg: { typeUrl: msgTypeUrl, value: Buffer.from(msgEncoded).toString('base64') },
    signature: {
      publicKey: Buffer.from(pubKeyBytes).toString('base64'),
      signature: Buffer.from(signature).toString('base64'),
    },
    createdHeight: Number(createdHeight),
    time: Number(time),
    fee: Number(fee),
    memo,
    networkId: Number(NETWORK_ID),
    chainId: Number(CHAIN_ID),
  };

  return canopyPost(`${QUERY_RPC}/v1/tx`, txBody);
}

// Encode a simple protobuf-like binary structure for a message
// Each field: tag | varint length | bytes
function encodeField(fieldNumber: number, value: Uint8Array): Uint8Array {
  const tag = (fieldNumber << 3) | 2; // wire type 2 = length-delimited
  return new Uint8Array([tag, value.length, ...value]);
}

function encodeString(fieldNumber: number, s: string): Uint8Array {
  const bytes = new TextEncoder().encode(s);
  return encodeField(fieldNumber, bytes);
}

function encodeBytes(fieldNumber: number, b: Uint8Array): Uint8Array {
  return encodeField(fieldNumber, b);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', canopyQuery: QUERY_RPC, pluginRPC: PLUGIN_RPC });
});

// ── Wallet ────────────────────────────────────────────────────────────────────

// POST /api/wallet/create — create a new keypair & register with Canopy keystore
app.post('/api/wallet/create', async (req, res) => {
  try {
    const { nickname, password } = req.body as { nickname: string; password: string };
    if (!nickname || !password) { res.status(400).json({ error: 'nickname and password required' }); return; }

    const resp = await canopyPost(`${ADMIN_RPC}/v1/admin/keystore-new-key`, { nickname, password }) as string;
    const address = resp.replace(/"/g, '');

    const keyInfo = await canopyPost(`${ADMIN_RPC}/v1/admin/keystore-get`, { address, password }) as {
      address: string; publicKey: string; privateKey: string;
    };

    // Cache session
    sessions.set(address, {
      privateKey: keyInfo.privateKey,
      publicKey: keyInfo.publicKey,
      password,
    });

    res.json({ address, publicKey: keyInfo.publicKey });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/wallet/login — load key from Canopy keystore into session
app.post('/api/wallet/login', async (req, res) => {
  try {
    const { address, password } = req.body as { address: string; password: string };
    const keyInfo = await canopyPost(`${ADMIN_RPC}/v1/admin/keystore-get`, { address, password }) as {
      address: string; publicKey: string; privateKey: string;
    };
    sessions.set(address, { privateKey: keyInfo.privateKey, publicKey: keyInfo.publicKey, password });
    res.json({ address, publicKey: keyInfo.publicKey });
  } catch (e) {
    res.status(401).json({ error: (e as Error).message });
  }
});

// GET /api/wallet/:address/balance
app.get('/api/wallet/:address/balance', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await canopyPost(`${QUERY_RPC}/v1/query/account`, { address }) as { amount: number };
    res.json({ address, balance: result.amount || 0 });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/chain/height
app.get('/api/chain/height', async (_req, res) => {
  try {
    const result = await canopyPost(`${QUERY_RPC}/v1/query/height`, {}) as { height: number };
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/wallet/send — send tokens
app.post('/api/wallet/send', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount, fee = 1000 } = req.body as {
      fromAddress: string; toAddress: string; amount: number; fee?: number;
    };
    const fromAddrBytes = hexToBytes(fromAddress);
    const toAddrBytes   = hexToBytes(toAddress);
    const amountBytes = new Uint8Array(8);
    new DataView(amountBytes.buffer).setBigUint64(0, BigInt(amount), false);

    const encoded = concat(
      encodeBytes(1, fromAddrBytes),
      encodeBytes(2, toAddrBytes),
      encodeField(3, amountBytes)
    );

    const result = await signAndSubmit(
      fromAddress, 'send',
      'type.googleapis.com/types.MessageSend',
      encoded, BigInt(fee)
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── Social ────────────────────────────────────────────────────────────────────

// POST /api/social/profile — create profile
app.post('/api/social/profile', async (req, res) => {
  try {
    const { address, username, bio = '', avatarUrl = '', fee = 1000 } = req.body as {
      address: string; username: string; bio?: string; avatarUrl?: string; fee?: number;
    };
    const addrBytes = hexToBytes(address);
    const encoded = concat(
      encodeBytes(1, addrBytes),
      encodeString(2, username),
      encodeString(3, bio),
      encodeString(4, avatarUrl)
    );
    const result = await signAndSubmit(address, 'createProfile',
      'type.googleapis.com/types.MessageCreateProfile', encoded, BigInt(fee));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// PUT /api/social/profile — update profile
app.put('/api/social/profile', async (req, res) => {
  try {
    const { address, bio = '', avatarUrl = '', fee = 1000 } = req.body as {
      address: string; bio?: string; avatarUrl?: string; fee?: number;
    };
    const addrBytes = hexToBytes(address);
    const encoded = concat(
      encodeBytes(1, addrBytes),
      encodeString(2, bio),
      encodeString(3, avatarUrl)
    );
    const result = await signAndSubmit(address, 'updateProfile',
      'type.googleapis.com/types.MessageUpdateProfile', encoded, BigInt(fee));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/social/post — create post
app.post('/api/social/post', async (req, res) => {
  try {
    const { authorAddress, content, circleId = '', fee = 1000 } = req.body as {
      authorAddress: string; content: string; circleId?: string; fee?: number;
    };
    const postId = `${Date.now()}-${authorAddress.slice(0, 8)}`;
    const addrBytes = hexToBytes(authorAddress);
    const encoded = concat(
      encodeBytes(1, addrBytes),
      encodeString(2, content),
      encodeString(3, circleId),
      encodeString(4, postId)
    );
    const result = await signAndSubmit(authorAddress, 'createPost',
      'type.googleapis.com/types.MessageCreatePost', encoded, BigInt(fee));
    res.json({ ...result as object, postId });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/social/reply — reply to post
app.post('/api/social/reply', async (req, res) => {
  try {
    const { authorAddress, postId, content, fee = 1000 } = req.body as {
      authorAddress: string; postId: string; content: string; fee?: number;
    };
    const replyId = `${Date.now()}-${authorAddress.slice(0, 8)}`;
    const addrBytes = hexToBytes(authorAddress);
    const encoded = concat(
      encodeBytes(1, addrBytes),
      encodeString(2, postId),
      encodeString(3, content),
      encodeString(4, replyId)
    );
    const result = await signAndSubmit(authorAddress, 'replyPost',
      'type.googleapis.com/types.MessageReplyPost', encoded, BigInt(fee));
    res.json({ ...result as object, replyId });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/social/circle — create circle
app.post('/api/social/circle', async (req, res) => {
  try {
    const { creatorAddress, name, description = '', rules = '', fee = 1000 } = req.body as {
      creatorAddress: string; name: string; description?: string; rules?: string; fee?: number;
    };
    const circleId = `${Date.now()}-${creatorAddress.slice(0, 8)}`;
    const addrBytes = hexToBytes(creatorAddress);
    const encoded = concat(
      encodeBytes(1, addrBytes),
      encodeString(2, name),
      encodeString(3, description),
      encodeString(4, rules),
      encodeString(5, circleId)
    );
    const result = await signAndSubmit(creatorAddress, 'createCircle',
      'type.googleapis.com/types.MessageCreateCircle', encoded, BigInt(fee));
    res.json({ ...result as object, circleId });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/social/circle/join
app.post('/api/social/circle/join', async (req, res) => {
  try {
    const { memberAddress, circleId, fee = 1000 } = req.body as {
      memberAddress: string; circleId: string; fee?: number;
    };
    const addrBytes = hexToBytes(memberAddress);
    const encoded = concat(encodeBytes(1, addrBytes), encodeString(2, circleId));
    const result = await signAndSubmit(memberAddress, 'joinCircle',
      'type.googleapis.com/types.MessageJoinCircle', encoded, BigInt(fee));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/social/circle/leave
app.post('/api/social/circle/leave', async (req, res) => {
  try {
    const { memberAddress, circleId, fee = 1000 } = req.body as {
      memberAddress: string; circleId: string; fee?: number;
    };
    const addrBytes = hexToBytes(memberAddress);
    const encoded = concat(encodeBytes(1, addrBytes), encodeString(2, circleId));
    const result = await signAndSubmit(memberAddress, 'leaveCircle',
      'type.googleapis.com/types.MessageLeaveCircle', encoded, BigInt(fee));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/social/follow
app.post('/api/social/follow', async (req, res) => {
  try {
    const { followerAddress, followeeAddress, fee = 1000 } = req.body as {
      followerAddress: string; followeeAddress: string; fee?: number;
    };
    const followerBytes = hexToBytes(followerAddress);
    const followeeBytes = hexToBytes(followeeAddress);
    const encoded = concat(encodeBytes(1, followerBytes), encodeBytes(2, followeeBytes));
    const result = await signAndSubmit(followerAddress, 'followUser',
      'type.googleapis.com/types.MessageFollowUser', encoded, BigInt(fee));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/social/unfollow
app.post('/api/social/unfollow', async (req, res) => {
  try {
    const { followerAddress, followeeAddress, fee = 1000 } = req.body as {
      followerAddress: string; followeeAddress: string; fee?: number;
    };
    const followerBytes = hexToBytes(followerAddress);
    const followeeBytes = hexToBytes(followeeAddress);
    const encoded = concat(encodeBytes(1, followerBytes), encodeBytes(2, followeeBytes));
    const result = await signAndSubmit(followerAddress, 'unfollowUser',
      'type.googleapis.com/types.MessageUnfollowUser', encoded, BigInt(fee));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/social/appreciate
app.post('/api/social/appreciate', async (req, res) => {
  try {
    const { userAddress, postId, fee = 1000 } = req.body as {
      userAddress: string; postId: string; fee?: number;
    };
    const addrBytes = hexToBytes(userAddress);
    const encoded = concat(encodeBytes(1, addrBytes), encodeString(2, postId));
    const result = await signAndSubmit(userAddress, 'appreciatePost',
      'type.googleapis.com/types.MessageAppreciatePost', encoded, BigInt(fee));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/social/bookmark
app.post('/api/social/bookmark', async (req, res) => {
  try {
    const { userAddress, postId, fee = 1000 } = req.body as {
      userAddress: string; postId: string; fee?: number;
    };
    const addrBytes = hexToBytes(userAddress);
    const encoded = concat(encodeBytes(1, addrBytes), encodeString(2, postId));
    const result = await signAndSubmit(userAddress, 'bookmarkPost',
      'type.googleapis.com/types.MessageBookmarkPost', encoded, BigInt(fee));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── Query Proxies (forwarding to plugin RPC) ──────────────────────────────────

app.get('/api/social/profile/:address', async (req, res) => {
  try {
    const data = await canopyGet(`${PLUGIN_RPC}/v1/query/profile/${req.params.address}`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/social/post/:postId', async (req, res) => {
  try {
    const data = await canopyGet(`${PLUGIN_RPC}/v1/query/post/${encodeURIComponent(req.params.postId)}`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/social/circle/:circleId', async (req, res) => {
  try {
    const data = await canopyGet(`${PLUGIN_RPC}/v1/query/circle/${encodeURIComponent(req.params.circleId)}`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/social/circles', async (_req, res) => {
  try {
    const data = await canopyGet(`${PLUGIN_RPC}/v1/query/circles`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/social/posts/author/:address', async (req, res) => {
  try {
    const data = await canopyGet(`${PLUGIN_RPC}/v1/query/posts/author/${req.params.address}`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/social/posts/circle/:circleId', async (req, res) => {
  try {
    const data = await canopyGet(`${PLUGIN_RPC}/v1/query/posts/circle/${encodeURIComponent(req.params.circleId)}`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/social/replies/:postId', async (req, res) => {
  try {
    const data = await canopyGet(`${PLUGIN_RPC}/v1/query/replies/${encodeURIComponent(req.params.postId)}`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Canopy Circle proxy server running on http://localhost:${PORT}`);
  console.log(`  Canopy Query RPC : ${QUERY_RPC}`);
  console.log(`  Canopy Admin RPC : ${ADMIN_RPC}`);
  console.log(`  Plugin RPC       : ${PLUGIN_RPC}`);
});

// suppress unused
void bytesToHex;
void createHash;
