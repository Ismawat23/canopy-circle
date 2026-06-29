/*
 * Canopy Circle — Custom RPC Endpoints
 *
 * This HTTP server exposes read-only social-fi query endpoints backed by the
 * plugin's detached queryState() path. Canopy never needs to know about these
 * routes — the plugin owns its HTTP server entirely.
 *
 * Endpoints:
 *   GET /v1/query/profile/:address   — fetch a user profile by hex address
 *   GET /v1/query/post/:postId       — fetch a post by ID
 *   GET /v1/query/circle/:circleId   — fetch a circle by ID
 *   GET /v1/query/posts/author/:address — list posts by author
 *   GET /v1/query/posts/circle/:circleId — list posts in a circle
 *   GET /v1/query/replies/:postId    — list replies for a post
 *   GET /v1/health                   — health check
 */

import * as http from 'http';
import Long from 'long';
import { Plugin, PLUGIN_BUILD, Unmarshal } from './plugin.js';
import { types } from '../proto/types.js';
import {
    KeyForProfile,
    KeyForPost,
    KeyForCircle,
    postsByAuthorPrefix,
    postsByCirclePrefix,
    replyPrefix,
    profilePrefix
} from './contract.js';
import { JoinLenPrefix } from './plugin.js';

function randQueryId(): Long {
    return Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
}

// Decode a hex address string to a 20-byte Uint8Array
function hexToAddr(hex: string): Uint8Array | null {
    if (!/^[0-9a-fA-F]{40}$/.test(hex)) return null;
    return new Uint8Array(Buffer.from(hex, 'hex'));
}

// Encode a Uint8Array to hex string
function addrToHex(addr: Uint8Array): string {
    return Buffer.from(addr).toString('hex');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function longToNum(v: any): number {
    if (Long.isLong(v)) return v.toNumber();
    return Number(v) || 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeProfile(p: any): object {
    return {
        address: addrToHex(p.address || new Uint8Array()),
        username: p.username || '',
        bio: p.bio || '',
        avatarUrl: p.avatarUrl || p.avatar_url || '',
        createdAt: longToNum(p.createdAt),
        postCount: longToNum(p.postCount),
        followerCount: longToNum(p.followerCount),
        followingCount: longToNum(p.followingCount),
        reputation: longToNum(p.reputation)
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePost(p: any): object {
    return {
        id: p.id || '',
        authorAddress: addrToHex(p.authorAddress || new Uint8Array()),
        circleId: p.circleId || '',
        content: p.content || '',
        createdAt: longToNum(p.createdAt),
        replyCount: longToNum(p.replyCount),
        appreciateCount: longToNum(p.appreciateCount)
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeCircle(c: any): object {
    return {
        id: c.id || '',
        creatorAddress: addrToHex(c.creatorAddress || new Uint8Array()),
        name: c.name || '',
        description: c.description || '',
        rules: c.rules || '',
        createdAt: longToNum(c.createdAt),
        memberCount: longToNum(c.memberCount)
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeReply(r: any): object {
    return {
        id: r.id || '',
        postId: r.postId || '',
        authorAddress: addrToHex(r.authorAddress || new Uint8Array()),
        content: r.content || '',
        createdAt: longToNum(r.createdAt)
    };
}

export function StartRPCServer(plugin: Plugin): void {
    const addr = plugin.config.rpcAddress;
    if (!addr) { console.log('plugin RPC server disabled (no rpcAddress configured)'); return; }

    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const segments = url.pathname.split('/').filter(Boolean);

        try {
            // GET /v1/health
            if (req.method === 'GET' && url.pathname === '/v1/health') {
                writeJSON(res, 200, { status: 'ok', build: PLUGIN_BUILD });
                return;
            }

            // GET /v1/query/profile/:address
            if (req.method === 'GET' && segments[0] === 'v1' && segments[1] === 'query' && segments[2] === 'profile' && segments[3]) {
                const addr = hexToAddr(segments[3]);
                if (!addr) { writeJSONError(res, 400, 'invalid address'); return; }
                const key = KeyForProfile(addr);
                const [resp, err] = await plugin.queryState(0, { keys: [{ queryId: randQueryId(), key }] });
                if (err) { writeJSONError(res, 500, err.msg); return; }
                const bytes = resp?.results?.[0]?.entries?.[0]?.value;
                const [profile] = Unmarshal(bytes || new Uint8Array(), types.Profile);
                if (!profile) { writeJSONError(res, 404, 'profile not found'); return; }
                writeJSON(res, 200, serializeProfile(profile));
                return;
            }

            // GET /v1/query/post/:postId
            if (req.method === 'GET' && segments[0] === 'v1' && segments[1] === 'query' && segments[2] === 'post' && segments[3]) {
                const postId = decodeURIComponent(segments[3]);
                const key = KeyForPost(postId);
                const [resp, err] = await plugin.queryState(0, { keys: [{ queryId: randQueryId(), key }] });
                if (err) { writeJSONError(res, 500, err.msg); return; }
                const bytes = resp?.results?.[0]?.entries?.[0]?.value;
                const [post] = Unmarshal(bytes || new Uint8Array(), types.Post);
                if (!post) { writeJSONError(res, 404, 'post not found'); return; }
                writeJSON(res, 200, serializePost(post));
                return;
            }

            // GET /v1/query/circle/:circleId
            if (req.method === 'GET' && segments[0] === 'v1' && segments[1] === 'query' && segments[2] === 'circle' && segments[3]) {
                const circleId = decodeURIComponent(segments[3]);
                const key = KeyForCircle(circleId);
                const [resp, err] = await plugin.queryState(0, { keys: [{ queryId: randQueryId(), key }] });
                if (err) { writeJSONError(res, 500, err.msg); return; }
                const bytes = resp?.results?.[0]?.entries?.[0]?.value;
                const [circle] = Unmarshal(bytes || new Uint8Array(), types.Circle);
                if (!circle) { writeJSONError(res, 404, 'circle not found'); return; }
                writeJSON(res, 200, serializeCircle(circle));
                return;
            }

            // GET /v1/query/posts/author/:address?limit=20
            if (req.method === 'GET' && segments[0] === 'v1' && segments[1] === 'query' && segments[2] === 'posts' && segments[3] === 'author' && segments[4]) {
                const addr = hexToAddr(segments[4]);
                if (!addr) { writeJSONError(res, 400, 'invalid address'); return; }
                const limit = parseInt(url.searchParams.get('limit') || '20');
                const prefix = JoinLenPrefix(Buffer.from([22]), Buffer.from(addr));
                const [resp, err] = await plugin.queryState(0, {
                    ranges: [{ queryId: randQueryId(), prefix, limit: Math.min(limit, 100), reverse: true }]
                });
                if (err) { writeJSONError(res, 500, err.msg); return; }
                const entries = resp?.results?.[0]?.entries || [];
                const posts = entries
                    .map((e: { value: Uint8Array }) => { const [p] = Unmarshal(e.value, types.Post); return p ? serializePost(p) : null; })
                    .filter(Boolean);
                writeJSON(res, 200, { posts });
                return;
            }

            // GET /v1/query/posts/circle/:circleId?limit=20
            if (req.method === 'GET' && segments[0] === 'v1' && segments[1] === 'query' && segments[2] === 'posts' && segments[3] === 'circle' && segments[4]) {
                const circleId = decodeURIComponent(segments[4]);
                const limit = parseInt(url.searchParams.get('limit') || '20');
                const prefix = JoinLenPrefix(Buffer.from([31]), Buffer.from(circleId));
                const [resp, err] = await plugin.queryState(0, {
                    ranges: [{ queryId: randQueryId(), prefix, limit: Math.min(limit, 100), reverse: true }]
                });
                if (err) { writeJSONError(res, 500, err.msg); return; }
                const entries = resp?.results?.[0]?.entries || [];
                const posts = entries
                    .map((e: { value: Uint8Array }) => { const [p] = Unmarshal(e.value, types.Post); return p ? serializePost(p) : null; })
                    .filter(Boolean);
                writeJSON(res, 200, { posts });
                return;
            }

            // GET /v1/query/replies/:postId?limit=50
            if (req.method === 'GET' && segments[0] === 'v1' && segments[1] === 'query' && segments[2] === 'replies' && segments[3]) {
                const postId = decodeURIComponent(segments[3]);
                const limit = parseInt(url.searchParams.get('limit') || '50');
                const prefix = JoinLenPrefix(Buffer.from([29]), Buffer.from(postId));
                const [resp, err] = await plugin.queryState(0, {
                    ranges: [{ queryId: randQueryId(), prefix, limit: Math.min(limit, 200), reverse: false }]
                });
                if (err) { writeJSONError(res, 500, err.msg); return; }
                const entries = resp?.results?.[0]?.entries || [];
                const replies = entries
                    .map((e: { value: Uint8Array }) => { const [r] = Unmarshal(e.value, types.Reply); return r ? serializeReply(r) : null; })
                    .filter(Boolean);
                writeJSON(res, 200, { replies });
                return;
            }

            // GET /v1/query/circles?limit=20
            if (req.method === 'GET' && segments[0] === 'v1' && segments[1] === 'query' && segments[2] === 'circles') {
                const limit = parseInt(url.searchParams.get('limit') || '20');
                const prefix = Buffer.from([23]);
                const [resp, err] = await plugin.queryState(0, {
                    ranges: [{ queryId: randQueryId(), prefix, limit: Math.min(limit, 100), reverse: false }]
                });
                if (err) { writeJSONError(res, 500, err.msg); return; }
                const entries = resp?.results?.[0]?.entries || [];
                const circles = entries
                    .map((e: { value: Uint8Array }) => { const [c] = Unmarshal(e.value, types.Circle); return c ? serializeCircle(c) : null; })
                    .filter(Boolean);
                writeJSON(res, 200, { circles });
                return;
            }

            writeJSONError(res, 404, 'not found');
        } catch (e) {
            writeJSONError(res, 500, `internal error: ${(e as Error).message}`);
        }
    });

    const idx = addr.lastIndexOf(':');
    const host = idx >= 0 ? addr.slice(0, idx) : '0.0.0.0';
    const port = idx >= 0 ? Number(addr.slice(idx + 1)) : Number(addr);

    server.listen(port, host, () => {
        console.log(`Canopy Circle RPC server (${PLUGIN_BUILD}) listening on ${addr}`);
    });
    server.on('error', (err) => { console.log(`RPC server error: ${err.message}`); });
}

// Suppress unused import warnings
void postsByAuthorPrefix;
void postsByCirclePrefix;
void replyPrefix;
void profilePrefix;

function writeJSON(res: http.ServerResponse, status: number, data: unknown): void {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify(data));
}

function writeJSONError(res: http.ServerResponse, status: number, message: string): void {
    writeJSON(res, status, { error: message });
}
