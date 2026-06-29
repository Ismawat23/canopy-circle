/* Canopy Circle — Social-Fi Plugin Contract
 * Extends the Canopy TypeScript plugin with on-chain social transactions:
 * CreateProfile, UpdateProfile, CreatePost, ReplyPost, CreateCircle,
 * JoinCircle, LeaveCircle, FollowUser, UnfollowUser, AppreciatePost, BookmarkPost
 */

import Long from 'long';
import { types } from '../proto/types.js';
import {
    IPluginError,
    ErrInsufficientFunds,
    ErrInvalidAddress,
    ErrInvalidAmount,
    ErrInvalidMessageCast,
    ErrTxFeeBelowStateLimit,
    ErrProfileAlreadyExists,
    ErrProfileNotFound,
    ErrInvalidUsername,
    ErrInvalidContent,
    ErrCannotFollowSelf,
    ErrInvalidPostId,
    ErrInvalidCircleId,
    ErrAlreadyMember,
    ErrAlreadyFollowing,
    ErrAlreadyAppreciated,
    ErrAlreadyBookmarked
} from './error.js';
import type { Plugin, Config } from './plugin.js';
import { JoinLenPrefix, FromAny, Unmarshal } from './plugin.js';
import { fileDescriptorProtos } from '../proto/descriptors.js';

// ─── State Key Prefixes ────────────────────────────────────────────────────────
// Must all be > 15 to avoid collision with Canopy core-reserved prefixes (1-15)
export const accountPrefix    = Buffer.from([1]);   // shared with core
export const poolPrefix       = Buffer.from([2]);   // shared with core
export const paramsPrefix     = Buffer.from([7]);   // shared with core
export const profilePrefix    = Buffer.from([20]);  // Profile storage
export const postPrefix       = Buffer.from([21]);  // Post storage
export const postsByAuthorPrefix = Buffer.from([22]); // Posts by author index
export const circlePrefix     = Buffer.from([23]);  // Circle storage
export const circleMemberPrefix = Buffer.from([24]); // Circle membership
export const followPrefix     = Buffer.from([25]);  // Follow (follower -> followee)
export const followerPrefix   = Buffer.from([26]);  // Follower index (followee -> follower)
export const appreciatePrefix = Buffer.from([27]);  // Appreciate (post + user)
export const bookmarkPrefix   = Buffer.from([28]);  // Bookmark (user + post)
export const replyPrefix      = Buffer.from([29]);  // Reply (post + reply)
export const notificationPrefix = Buffer.from([30]); // Notifications
export const postsByCirclePrefix = Buffer.from([31]); // Posts by circle index

// ─── State Key Functions ───────────────────────────────────────────────────────
export function KeyForAccount(addr: Uint8Array): Uint8Array {
    return JoinLenPrefix(accountPrefix, Buffer.from(addr));
}
export function KeyForFeeParams(): Uint8Array {
    return JoinLenPrefix(paramsPrefix, Buffer.from('/f/'));
}
export function KeyForFeePool(chainId: Long): Uint8Array {
    return JoinLenPrefix(poolPrefix, formatUint64(chainId));
}
export function KeyForProfile(addr: Uint8Array): Uint8Array {
    return JoinLenPrefix(profilePrefix, Buffer.from(addr));
}
export function KeyForPost(postId: string): Uint8Array {
    return JoinLenPrefix(postPrefix, Buffer.from(postId));
}
export function KeyForPostByAuthor(author: Uint8Array, postId: string): Uint8Array {
    return JoinLenPrefix(postsByAuthorPrefix, Buffer.from(author), Buffer.from(postId));
}
export function KeyForCircle(circleId: string): Uint8Array {
    return JoinLenPrefix(circlePrefix, Buffer.from(circleId));
}
export function KeyForCircleMember(circleId: string, memberAddr: Uint8Array): Uint8Array {
    return JoinLenPrefix(circleMemberPrefix, Buffer.from(circleId), Buffer.from(memberAddr));
}
export function KeyForFollow(follower: Uint8Array, followee: Uint8Array): Uint8Array {
    return JoinLenPrefix(followPrefix, Buffer.from(follower), Buffer.from(followee));
}
export function KeyForFollower(followee: Uint8Array, follower: Uint8Array): Uint8Array {
    return JoinLenPrefix(followerPrefix, Buffer.from(followee), Buffer.from(follower));
}
export function KeyForAppreciate(postId: string, userAddr: Uint8Array): Uint8Array {
    return JoinLenPrefix(appreciatePrefix, Buffer.from(postId), Buffer.from(userAddr));
}
export function KeyForBookmark(userAddr: Uint8Array, postId: string): Uint8Array {
    return JoinLenPrefix(bookmarkPrefix, Buffer.from(userAddr), Buffer.from(postId));
}
export function KeyForReply(postId: string, replyId: string): Uint8Array {
    return JoinLenPrefix(replyPrefix, Buffer.from(postId), Buffer.from(replyId));
}
export function KeyForNotification(addr: Uint8Array, notifId: string): Uint8Array {
    return JoinLenPrefix(notificationPrefix, Buffer.from(addr), Buffer.from(notifId));
}
export function KeyForPostByCircle(circleId: string, postId: string): Uint8Array {
    return JoinLenPrefix(postsByCirclePrefix, Buffer.from(circleId), Buffer.from(postId));
}

function formatUint64(u: Long): Buffer {
    const b = Buffer.alloc(8);
    b.writeBigUInt64BE(BigInt(u.toString()));
    return b;
}

function now(): number {
    return Math.floor(Date.now() / 1000);
}

function isValidUsername(s: string): boolean {
    return /^[a-zA-Z0-9_]{3,32}$/.test(s);
}

function isValidContent(s: string): boolean {
    return s.length >= 1 && s.length <= 500;
}

function isValidId(s: string): boolean {
    return typeof s === 'string' && s.length > 0 && s.length <= 128;
}

// ─── Contract Config ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ContractConfig: any = {
    name: 'canopy-circle',
    id: 1,
    version: 1,
    supportedTransactions: [
        'send',
        'createProfile',
        'updateProfile',
        'createPost',
        'replyPost',
        'createCircle',
        'joinCircle',
        'leaveCircle',
        'followUser',
        'unfollowUser',
        'appreciatePost',
        'bookmarkPost'
    ],
    transactionTypeUrls: [
        'type.googleapis.com/types.MessageSend',
        'type.googleapis.com/types.MessageCreateProfile',
        'type.googleapis.com/types.MessageUpdateProfile',
        'type.googleapis.com/types.MessageCreatePost',
        'type.googleapis.com/types.MessageReplyPost',
        'type.googleapis.com/types.MessageCreateCircle',
        'type.googleapis.com/types.MessageJoinCircle',
        'type.googleapis.com/types.MessageLeaveCircle',
        'type.googleapis.com/types.MessageFollowUser',
        'type.googleapis.com/types.MessageUnfollowUser',
        'type.googleapis.com/types.MessageAppreciatePost',
        'type.googleapis.com/types.MessageBookmarkPost'
    ],
    eventTypeUrls: [],
    customStatePrefixes: [
        profilePrefix,
        postPrefix,
        postsByAuthorPrefix,
        circlePrefix,
        circleMemberPrefix,
        followPrefix,
        followerPrefix,
        appreciatePrefix,
        bookmarkPrefix,
        replyPrefix,
        notificationPrefix,
        postsByCirclePrefix
    ],
    fileDescriptorProtos
};

// ─── Contract (Synchronous / Stateless) ───────────────────────────────────────
export class Contract {
    Config: Config;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FSMConfig: any;
    plugin: Plugin;
    fsmId: Long;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(config: Config, fsmConfig: any, plugin: Plugin, fsmId: Long) {
        this.Config = config;
        this.FSMConfig = fsmConfig;
        this.plugin = plugin;
        this.fsmId = fsmId;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    Genesis(_request: any): any { return {}; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    BeginBlock(_request: any): any { return {}; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    EndBlock(_request: any): any { return {}; }

    // ── Stateless Validators ──────────────────────────────────────────────────

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageSend(msg: any): any {
        if (!msg.fromAddress || msg.fromAddress.length !== 20) return { error: ErrInvalidAddress() };
        if (!msg.toAddress || msg.toAddress.length !== 20) return { error: ErrInvalidAddress() };
        const amount = msg.amount as Long | number | undefined;
        if (!amount || (Long.isLong(amount) ? amount.isZero() : amount === 0)) return { error: ErrInvalidAmount() };
        return { recipient: msg.toAddress, authorizedSigners: [msg.fromAddress] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageCreateProfile(msg: any): any {
        if (!msg.address || msg.address.length !== 20) return { error: ErrInvalidAddress() };
        if (!isValidUsername(msg.username || '')) return { error: ErrInvalidUsername() };
        return { recipient: msg.address, authorizedSigners: [msg.address] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageUpdateProfile(msg: any): any {
        if (!msg.address || msg.address.length !== 20) return { error: ErrInvalidAddress() };
        return { recipient: msg.address, authorizedSigners: [msg.address] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageCreatePost(msg: any): any {
        if (!msg.authorAddress || msg.authorAddress.length !== 20) return { error: ErrInvalidAddress() };
        if (!isValidContent(msg.content || '')) return { error: ErrInvalidContent() };
        if (!isValidId(msg.postId || '')) return { error: ErrInvalidPostId() };
        return { recipient: msg.authorAddress, authorizedSigners: [msg.authorAddress] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageReplyPost(msg: any): any {
        if (!msg.authorAddress || msg.authorAddress.length !== 20) return { error: ErrInvalidAddress() };
        if (!isValidId(msg.postId || '')) return { error: ErrInvalidPostId() };
        if (!isValidContent(msg.content || '')) return { error: ErrInvalidContent() };
        if (!isValidId(msg.replyId || '')) return { error: ErrInvalidPostId() };
        return { recipient: msg.authorAddress, authorizedSigners: [msg.authorAddress] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageCreateCircle(msg: any): any {
        if (!msg.creatorAddress || msg.creatorAddress.length !== 20) return { error: ErrInvalidAddress() };
        if (!msg.name || msg.name.length < 3 || msg.name.length > 64) return { error: ErrInvalidContent() };
        if (!isValidId(msg.circleId || '')) return { error: ErrInvalidCircleId() };
        return { recipient: msg.creatorAddress, authorizedSigners: [msg.creatorAddress] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageJoinCircle(msg: any): any {
        if (!msg.memberAddress || msg.memberAddress.length !== 20) return { error: ErrInvalidAddress() };
        if (!isValidId(msg.circleId || '')) return { error: ErrInvalidCircleId() };
        return { recipient: msg.memberAddress, authorizedSigners: [msg.memberAddress] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageLeaveCircle(msg: any): any {
        if (!msg.memberAddress || msg.memberAddress.length !== 20) return { error: ErrInvalidAddress() };
        if (!isValidId(msg.circleId || '')) return { error: ErrInvalidCircleId() };
        return { recipient: msg.memberAddress, authorizedSigners: [msg.memberAddress] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageFollowUser(msg: any): any {
        if (!msg.followerAddress || msg.followerAddress.length !== 20) return { error: ErrInvalidAddress() };
        if (!msg.followeeAddress || msg.followeeAddress.length !== 20) return { error: ErrInvalidAddress() };
        if (Buffer.from(msg.followerAddress).equals(Buffer.from(msg.followeeAddress))) {
            return { error: ErrCannotFollowSelf() };
        }
        return { recipient: msg.followeeAddress, authorizedSigners: [msg.followerAddress] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageUnfollowUser(msg: any): any {
        if (!msg.followerAddress || msg.followerAddress.length !== 20) return { error: ErrInvalidAddress() };
        if (!msg.followeeAddress || msg.followeeAddress.length !== 20) return { error: ErrInvalidAddress() };
        return { recipient: msg.followeeAddress, authorizedSigners: [msg.followerAddress] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageAppreciatePost(msg: any): any {
        if (!msg.userAddress || msg.userAddress.length !== 20) return { error: ErrInvalidAddress() };
        if (!isValidId(msg.postId || '')) return { error: ErrInvalidPostId() };
        return { recipient: msg.userAddress, authorizedSigners: [msg.userAddress] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageBookmarkPost(msg: any): any {
        if (!msg.userAddress || msg.userAddress.length !== 20) return { error: ErrInvalidAddress() };
        if (!isValidId(msg.postId || '')) return { error: ErrInvalidPostId() };
        return { recipient: msg.userAddress, authorizedSigners: [msg.userAddress] };
    }
}

// ─── ContractAsync (State Operations) ─────────────────────────────────────────
export class ContractAsync {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async CheckTx(contract: Contract, request: any): Promise<any> {
        // Validate fee against state limit
        const [resp, err] = await contract.plugin.StateRead(contract, {
            keys: [{ queryId: Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)), key: KeyForFeeParams() }]
        });
        if (err) return { error: err };
        if (resp?.error) return { error: resp.error };

        const feeParamsBytes = resp?.results?.[0]?.entries?.[0]?.value;
        if (feeParamsBytes && feeParamsBytes.length > 0) {
            const [minFees, unmarshalErr] = Unmarshal(feeParamsBytes, types.FeeParams);
            if (unmarshalErr) return { error: unmarshalErr };
            const txFee = request.tx?.fee as Long | number | undefined;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sendFee = (minFees as any)?.sendFee as Long | number | undefined;
            if (txFee !== undefined && sendFee !== undefined) {
                const txFeeNum = Long.isLong(txFee) ? txFee.toNumber() : txFee;
                const sendFeeNum = Long.isLong(sendFee) ? sendFee.toNumber() : sendFee;
                if (txFeeNum < sendFeeNum) return { error: ErrTxFeeBelowStateLimit() };
            }
        }

        const [msg, msgType, msgErr] = FromAny(request.tx?.msg);
        if (msgErr) return { error: msgErr };
        if (!msg) return { error: ErrInvalidMessageCast() };

        switch (msgType) {
            case 'MessageSend':           return contract.CheckMessageSend(msg);
            case 'MessageCreateProfile':  return contract.CheckMessageCreateProfile(msg);
            case 'MessageUpdateProfile':  return contract.CheckMessageUpdateProfile(msg);
            case 'MessageCreatePost':     return contract.CheckMessageCreatePost(msg);
            case 'MessageReplyPost':      return contract.CheckMessageReplyPost(msg);
            case 'MessageCreateCircle':   return contract.CheckMessageCreateCircle(msg);
            case 'MessageJoinCircle':     return contract.CheckMessageJoinCircle(msg);
            case 'MessageLeaveCircle':    return contract.CheckMessageLeaveCircle(msg);
            case 'MessageFollowUser':     return contract.CheckMessageFollowUser(msg);
            case 'MessageUnfollowUser':   return contract.CheckMessageUnfollowUser(msg);
            case 'MessageAppreciatePost': return contract.CheckMessageAppreciatePost(msg);
            case 'MessageBookmarkPost':   return contract.CheckMessageBookmarkPost(msg);
            default: return { error: ErrInvalidMessageCast() };
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverTx(contract: Contract, request: any): Promise<any> {
        const [msg, msgType, err] = FromAny(request.tx?.msg);
        if (err) return { error: err };
        if (!msg) return { error: ErrInvalidMessageCast() };

        switch (msgType) {
            case 'MessageSend':
                return ContractAsync.DeliverMessageSend(contract, msg, request.tx?.fee as Long);
            case 'MessageCreateProfile':
                return ContractAsync.DeliverCreateProfile(contract, msg);
            case 'MessageUpdateProfile':
                return ContractAsync.DeliverUpdateProfile(contract, msg);
            case 'MessageCreatePost':
                return ContractAsync.DeliverCreatePost(contract, msg);
            case 'MessageReplyPost':
                return ContractAsync.DeliverReplyPost(contract, msg);
            case 'MessageCreateCircle':
                return ContractAsync.DeliverCreateCircle(contract, msg);
            case 'MessageJoinCircle':
                return ContractAsync.DeliverJoinCircle(contract, msg);
            case 'MessageLeaveCircle':
                return ContractAsync.DeliverLeaveCircle(contract, msg);
            case 'MessageFollowUser':
                return ContractAsync.DeliverFollowUser(contract, msg);
            case 'MessageUnfollowUser':
                return ContractAsync.DeliverUnfollowUser(contract, msg);
            case 'MessageAppreciatePost':
                return ContractAsync.DeliverAppreciatePost(contract, msg);
            case 'MessageBookmarkPost':
                return ContractAsync.DeliverBookmarkPost(contract, msg);
            default:
                return { error: ErrInvalidMessageCast() };
        }
    }

    // ── Send ──────────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverMessageSend(contract: Contract, msg: any, fee: Long | number | undefined): Promise<any> {
        const fromQueryId = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        const toQueryId   = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        const feeQueryId  = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        const fromKey    = KeyForAccount(msg.fromAddress!);
        const toKey      = KeyForAccount(msg.toAddress!);
        const feePoolKey = KeyForFeePool(Long.fromNumber(contract.Config.ChainId));

        const [response, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: feeQueryId, key: feePoolKey },
                { queryId: fromQueryId, key: fromKey },
                { queryId: toQueryId, key: toKey }
            ]
        });
        if (readErr) return { error: readErr };
        if (response?.error) return { error: response.error };

        let fromBytes: Uint8Array | null = null;
        let toBytes: Uint8Array | null = null;
        let feePoolBytes: Uint8Array | null = null;
        for (const resp of response?.results || []) {
            const qid = resp.queryId as Long;
            if (qid.equals(fromQueryId)) fromBytes = resp.entries?.[0]?.value || null;
            else if (qid.equals(toQueryId)) toBytes = resp.entries?.[0]?.value || null;
            else if (qid.equals(feeQueryId)) feePoolBytes = resp.entries?.[0]?.value || null;
        }

        const [fromRaw, fromErr]       = Unmarshal(fromBytes || new Uint8Array(), types.Account);
        const [toRaw, toErr]           = Unmarshal(toBytes || new Uint8Array(), types.Account);
        const [feePoolRaw, feePoolErr] = Unmarshal(feePoolBytes || new Uint8Array(), types.Pool);
        if (fromErr || toErr || feePoolErr) return { error: fromErr || toErr || feePoolErr };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const from = fromRaw as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const to = toRaw as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const feePool = feePoolRaw as any;

        const msgAmount    = Long.isLong(msg.amount) ? msg.amount : Long.fromNumber((msg.amount as number) || 0);
        const feeAmount    = Long.isLong(fee) ? fee : Long.fromNumber((fee as number) || 0);
        const amountToDeduct = msgAmount.add(feeAmount);
        const fromAmount   = Long.isLong(from?.amount) ? from.amount : Long.fromNumber((from?.amount as number) || 0);

        if (fromAmount.lessThan(amountToDeduct)) return { error: ErrInsufficientFunds() };

        const isSelfTransfer = Buffer.from(fromKey).equals(Buffer.from(toKey));
        const toAccount = isSelfTransfer ? from : to;
        const newFromAmount  = fromAmount.subtract(amountToDeduct);
        const toAmount       = Long.isLong(toAccount?.amount) ? toAccount.amount : Long.fromNumber((toAccount?.amount as number) || 0);
        const newToAmount    = toAmount.add(msgAmount);
        const poolAmount     = Long.isLong(feePool?.amount) ? feePool.amount : Long.fromNumber((feePool?.amount as number) || 0);
        const newPoolAmount  = poolAmount.add(feeAmount);

        const updatedFrom  = types.Account.create({ address: from?.address, amount: newFromAmount });
        const updatedTo    = types.Account.create({ address: toAccount?.address, amount: newToAmount });
        const updatedPool  = types.Pool.create({ id: feePool?.id, amount: newPoolAmount });
        const newFromBytes = types.Account.encode(updatedFrom).finish();
        const newToBytes   = types.Account.encode(updatedTo).finish();
        const newFeePoolBytes = types.Pool.encode(updatedPool).finish();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let writeResp: any;
        let writeErr: IPluginError | null;
        if (newFromAmount.isZero()) {
            [writeResp, writeErr] = await contract.plugin.StateWrite(contract, {
                sets: [{ key: feePoolKey, value: newFeePoolBytes }, { key: toKey, value: newToBytes }],
                deletes: [{ key: fromKey }]
            });
        } else {
            [writeResp, writeErr] = await contract.plugin.StateWrite(contract, {
                sets: [{ key: feePoolKey, value: newFeePoolBytes }, { key: toKey, value: newToBytes }, { key: fromKey, value: newFromBytes }]
            });
        }
        if (writeErr) return { error: writeErr };
        if (writeResp?.error) return { error: writeResp.error };
        return {};
    }

    // ── CreateProfile ─────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverCreateProfile(contract: Contract, msg: any): Promise<any> {
        const profileKey = KeyForProfile(msg.address!);
        const qId = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        const [resp, readErr] = await contract.plugin.StateRead(contract, {
            keys: [{ queryId: qId, key: profileKey }]
        });
        if (readErr) return { error: readErr };
        if (resp?.error) return { error: resp.error };

        const existing = resp?.results?.[0]?.entries?.[0]?.value;
        if (existing && existing.length > 0) return { error: ErrProfileAlreadyExists() };

        const profile = types.Profile.create({
            address: msg.address,
            username: msg.username,
            bio: msg.bio || '',
            avatarUrl: msg.avatarUrl || msg.avatar_url || '',
            createdAt: now(),
            postCount: 0,
            followerCount: 0,
            followingCount: 0,
            reputation: 0
        });
        const profileBytes = types.Profile.encode(profile).finish();
        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, {
            sets: [{ key: profileKey, value: profileBytes }]
        });
        if (writeErr) return { error: writeErr };
        if (writeResp?.error) return { error: writeResp.error };
        return {};
    }

    // ── UpdateProfile ─────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverUpdateProfile(contract: Contract, msg: any): Promise<any> {
        const profileKey = KeyForProfile(msg.address!);
        const qId = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        const [resp, readErr] = await contract.plugin.StateRead(contract, {
            keys: [{ queryId: qId, key: profileKey }]
        });
        if (readErr) return { error: readErr };
        if (resp?.error) return { error: resp.error };

        const profileBytes = resp?.results?.[0]?.entries?.[0]?.value;
        const [existing, parseErr] = Unmarshal(profileBytes || new Uint8Array(), types.Profile);
        if (parseErr) return { error: parseErr };
        if (!existing) return { error: ErrProfileNotFound() };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = existing as any;
        const updated = types.Profile.create({
            address: p.address,
            username: p.username,
            bio: msg.bio !== undefined ? msg.bio : p.bio,
            avatarUrl: msg.avatarUrl || msg.avatar_url || p.avatarUrl,
            createdAt: p.createdAt,
            postCount: p.postCount,
            followerCount: p.followerCount,
            followingCount: p.followingCount,
            reputation: p.reputation
        });
        const newBytes = types.Profile.encode(updated).finish();
        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, {
            sets: [{ key: profileKey, value: newBytes }]
        });
        if (writeErr) return { error: writeErr };
        if (writeResp?.error) return { error: writeResp.error };
        return {};
    }

    // ── CreatePost ────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverCreatePost(contract: Contract, msg: any): Promise<any> {
        const postKey          = KeyForPost(msg.postId);
        const postByAuthorKey  = KeyForPostByAuthor(msg.authorAddress!, msg.postId);
        const profileKey       = KeyForProfile(msg.authorAddress!);
        const profileQId       = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

        const [resp, readErr] = await contract.plugin.StateRead(contract, {
            keys: [{ queryId: profileQId, key: profileKey }]
        });
        if (readErr) return { error: readErr };
        if (resp?.error) return { error: resp.error };

        const profileBytes = resp?.results?.[0]?.entries?.[0]?.value;
        const [profile, parseErr] = Unmarshal(profileBytes || new Uint8Array(), types.Profile);
        if (parseErr) return { error: parseErr };
        if (!profile) return { error: ErrProfileNotFound() };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = profile as any;
        const post = types.Post.create({
            id: msg.postId,
            authorAddress: msg.authorAddress,
            circleId: msg.circleId || '',
            content: msg.content,
            createdAt: now(),
            replyCount: 0,
            appreciateCount: 0
        });
        const postBytes = types.Post.encode(post).finish();
        const updatedProfile = types.Profile.create({
            ...p,
            postCount: (Long.isLong(p.postCount) ? p.postCount.toNumber() : (p.postCount || 0)) + 1,
            reputation: (Long.isLong(p.reputation) ? p.reputation.toNumber() : (p.reputation || 0)) + 2
        });
        const updatedProfileBytes = types.Profile.encode(updatedProfile).finish();

        const sets = [
            { key: postKey, value: postBytes },
            { key: postByAuthorKey, value: postBytes },
            { key: profileKey, value: updatedProfileBytes }
        ];
        if (msg.circleId) {
            sets.push({ key: KeyForPostByCircle(msg.circleId, msg.postId), value: postBytes });
        }

        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, { sets });
        if (writeErr) return { error: writeErr };
        if (writeResp?.error) return { error: writeResp.error };
        return {};
    }

    // ── ReplyPost ─────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverReplyPost(contract: Contract, msg: any): Promise<any> {
        const postKey  = KeyForPost(msg.postId);
        const replyKey = KeyForReply(msg.postId, msg.replyId);
        const postQId  = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

        const [resp, readErr] = await contract.plugin.StateRead(contract, {
            keys: [{ queryId: postQId, key: postKey }]
        });
        if (readErr) return { error: readErr };
        if (resp?.error) return { error: resp.error };

        const postBytes = resp?.results?.[0]?.entries?.[0]?.value;
        const [post, parseErr] = Unmarshal(postBytes || new Uint8Array(), types.Post);
        if (parseErr) return { error: parseErr };

        const reply = types.Reply.create({
            id: msg.replyId,
            postId: msg.postId,
            authorAddress: msg.authorAddress,
            content: msg.content,
            createdAt: now()
        });
        const replyBytes = types.Reply.encode(reply).finish();

        const sets: { key: Uint8Array; value: Uint8Array }[] = [
            { key: replyKey, value: replyBytes }
        ];

        if (post) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = post as any;
            const updatedPost = types.Post.create({
                ...p,
                replyCount: (Long.isLong(p.replyCount) ? p.replyCount.toNumber() : (p.replyCount || 0)) + 1
            });
            sets.push({ key: postKey, value: types.Post.encode(updatedPost).finish() });
        }

        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, { sets });
        if (writeErr) return { error: writeErr };
        if (writeResp?.error) return { error: writeResp.error };
        return {};
    }

    // ── CreateCircle ──────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverCreateCircle(contract: Contract, msg: any): Promise<any> {
        const circleKey    = KeyForCircle(msg.circleId);
        const memberKey    = KeyForCircleMember(msg.circleId, msg.creatorAddress!);
        const circleQId    = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

        const [resp, readErr] = await contract.plugin.StateRead(contract, {
            keys: [{ queryId: circleQId, key: circleKey }]
        });
        if (readErr) return { error: readErr };
        if (resp?.error) return { error: resp.error };

        const existing = resp?.results?.[0]?.entries?.[0]?.value;
        if (existing && existing.length > 0) return { error: ErrAlreadyMember() };

        const circle = types.Circle.create({
            id: msg.circleId,
            creatorAddress: msg.creatorAddress,
            name: msg.name,
            description: msg.description || '',
            rules: msg.rules || '',
            createdAt: now(),
            memberCount: 1
        });
        const membership = types.CircleMemberRecord.create({ joinedAt: now() });

        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, {
            sets: [
                { key: circleKey, value: types.Circle.encode(circle).finish() },
                { key: memberKey, value: types.CircleMemberRecord.encode(membership).finish() }
            ]
        });
        if (writeErr) return { error: writeErr };
        if (writeResp?.error) return { error: writeResp.error };
        return {};
    }

    // ── JoinCircle ────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverJoinCircle(contract: Contract, msg: any): Promise<any> {
        const circleKey = KeyForCircle(msg.circleId);
        const memberKey = KeyForCircleMember(msg.circleId, msg.memberAddress!);
        const cQId      = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        const mQId      = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

        const [resp, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: cQId, key: circleKey },
                { queryId: mQId, key: memberKey }
            ]
        });
        if (readErr) return { error: readErr };
        if (resp?.error) return { error: resp.error };

        let circleBytes: Uint8Array | null = null;
        let memberBytes: Uint8Array | null = null;
        for (const r of resp?.results || []) {
            const qid = r.queryId as Long;
            if (qid.equals(cQId)) circleBytes = r.entries?.[0]?.value || null;
            else if (qid.equals(mQId)) memberBytes = r.entries?.[0]?.value || null;
        }

        if (memberBytes && memberBytes.length > 0) return { error: ErrAlreadyMember() };
        const [circle, parseErr] = Unmarshal(circleBytes || new Uint8Array(), types.Circle);
        if (parseErr) return { error: parseErr };

        const membership = types.CircleMemberRecord.create({ joinedAt: now() });
        const sets: { key: Uint8Array; value: Uint8Array }[] = [
            { key: memberKey, value: types.CircleMemberRecord.encode(membership).finish() }
        ];
        if (circle) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const c = circle as any;
            const updated = types.Circle.create({
                ...c,
                memberCount: (Long.isLong(c.memberCount) ? c.memberCount.toNumber() : (c.memberCount || 0)) + 1
            });
            sets.push({ key: circleKey, value: types.Circle.encode(updated).finish() });
        }

        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, { sets });
        if (writeErr) return { error: writeErr };
        if (writeResp?.error) return { error: writeResp.error };
        return {};
    }

    // ── LeaveCircle ───────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverLeaveCircle(contract: Contract, msg: any): Promise<any> {
        const circleKey = KeyForCircle(msg.circleId);
        const memberKey = KeyForCircleMember(msg.circleId, msg.memberAddress!);
        const cQId      = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

        const [resp, readErr] = await contract.plugin.StateRead(contract, {
            keys: [{ queryId: cQId, key: circleKey }]
        });
        if (readErr) return { error: readErr };
        if (resp?.error) return { error: resp.error };

        const circleBytes = resp?.results?.[0]?.entries?.[0]?.value;
        const [circle, parseErr] = Unmarshal(circleBytes || new Uint8Array(), types.Circle);
        if (parseErr) return { error: parseErr };

        const sets: { key: Uint8Array; value: Uint8Array }[] = [];
        if (circle) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const c = circle as any;
            const count = Long.isLong(c.memberCount) ? c.memberCount.toNumber() : (c.memberCount || 0);
            const updated = types.Circle.create({ ...c, memberCount: Math.max(0, count - 1) });
            sets.push({ key: circleKey, value: types.Circle.encode(updated).finish() });
        }

        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, {
            sets,
            deletes: [{ key: memberKey }]
        });
        if (writeErr) return { error: writeErr };
        if (writeResp?.error) return { error: writeResp.error };
        return {};
    }

    // ── FollowUser ────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverFollowUser(contract: Contract, msg: any): Promise<any> {
        const followKey    = KeyForFollow(msg.followerAddress!, msg.followeeAddress!);
        const followerKey  = KeyForFollower(msg.followeeAddress!, msg.followerAddress!);
        const followerProfileKey = KeyForProfile(msg.followerAddress!);
        const followeeProfileKey = KeyForProfile(msg.followeeAddress!);
        const fQId = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        const eQId = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        const fkQId = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

        const [resp, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: fkQId, key: followKey },
                { queryId: fQId, key: followerProfileKey },
                { queryId: eQId, key: followeeProfileKey }
            ]
        });
        if (readErr) return { error: readErr };
        if (resp?.error) return { error: resp.error };

        let existingFollow: Uint8Array | null = null;
        let followerProfileBytes: Uint8Array | null = null;
        let followeeProfileBytes: Uint8Array | null = null;
        for (const r of resp?.results || []) {
            const qid = r.queryId as Long;
            if (qid.equals(fkQId)) existingFollow = r.entries?.[0]?.value || null;
            else if (qid.equals(fQId)) followerProfileBytes = r.entries?.[0]?.value || null;
            else if (qid.equals(eQId)) followeeProfileBytes = r.entries?.[0]?.value || null;
        }

        if (existingFollow && existingFollow.length > 0) return { error: ErrAlreadyFollowing() };

        const followRecord = types.FollowRecord.create({ createdAt: now() });
        const sets: { key: Uint8Array; value: Uint8Array }[] = [
            { key: followKey, value: types.FollowRecord.encode(followRecord).finish() },
            { key: followerKey, value: types.FollowRecord.encode(followRecord).finish() }
        ];

        const [followerProfile] = Unmarshal(followerProfileBytes || new Uint8Array(), types.Profile);
        const [followeeProfile] = Unmarshal(followeeProfileBytes || new Uint8Array(), types.Profile);
        if (followerProfile) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = followerProfile as any;
            const updated = types.Profile.create({
                ...p,
                followingCount: (Long.isLong(p.followingCount) ? p.followingCount.toNumber() : (p.followingCount || 0)) + 1
            });
            sets.push({ key: followerProfileKey, value: types.Profile.encode(updated).finish() });
        }
        if (followeeProfile) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = followeeProfile as any;
            const updated = types.Profile.create({
                ...p,
                followerCount: (Long.isLong(p.followerCount) ? p.followerCount.toNumber() : (p.followerCount || 0)) + 1,
                reputation: (Long.isLong(p.reputation) ? p.reputation.toNumber() : (p.reputation || 0)) + 1
            });
            sets.push({ key: followeeProfileKey, value: types.Profile.encode(updated).finish() });
        }

        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, { sets });
        if (writeErr) return { error: writeErr };
        if (writeResp?.error) return { error: writeResp.error };
        return {};
    }

    // ── UnfollowUser ──────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverUnfollowUser(contract: Contract, msg: any): Promise<any> {
        const followKey    = KeyForFollow(msg.followerAddress!, msg.followeeAddress!);
        const followerKey  = KeyForFollower(msg.followeeAddress!, msg.followerAddress!);
        const followerProfileKey = KeyForProfile(msg.followerAddress!);
        const followeeProfileKey = KeyForProfile(msg.followeeAddress!);
        const fQId = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        const eQId = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

        const [resp, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: fQId, key: followerProfileKey },
                { queryId: eQId, key: followeeProfileKey }
            ]
        });
        if (readErr) return { error: readErr };
        if (resp?.error) return { error: resp.error };

        let followerProfileBytes: Uint8Array | null = null;
        let followeeProfileBytes: Uint8Array | null = null;
        for (const r of resp?.results || []) {
            const qid = r.queryId as Long;
            if (qid.equals(fQId)) followerProfileBytes = r.entries?.[0]?.value || null;
            else if (qid.equals(eQId)) followeeProfileBytes = r.entries?.[0]?.value || null;
        }

        const sets: { key: Uint8Array; value: Uint8Array }[] = [];
        const [followerProfile] = Unmarshal(followerProfileBytes || new Uint8Array(), types.Profile);
        const [followeeProfile] = Unmarshal(followeeProfileBytes || new Uint8Array(), types.Profile);
        if (followerProfile) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = followerProfile as any;
            const count = Long.isLong(p.followingCount) ? p.followingCount.toNumber() : (p.followingCount || 0);
            const updated = types.Profile.create({ ...p, followingCount: Math.max(0, count - 1) });
            sets.push({ key: followerProfileKey, value: types.Profile.encode(updated).finish() });
        }
        if (followeeProfile) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = followeeProfile as any;
            const count = Long.isLong(p.followerCount) ? p.followerCount.toNumber() : (p.followerCount || 0);
            const updated = types.Profile.create({ ...p, followerCount: Math.max(0, count - 1) });
            sets.push({ key: followeeProfileKey, value: types.Profile.encode(updated).finish() });
        }

        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, {
            sets,
            deletes: [{ key: followKey }, { key: followerKey }]
        });
        if (writeErr) return { error: writeErr };
        if (writeResp?.error) return { error: writeResp.error };
        return {};
    }

    // ── AppreciatePost ────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverAppreciatePost(contract: Contract, msg: any): Promise<any> {
        const appreciateKey = KeyForAppreciate(msg.postId, msg.userAddress!);
        const postKey       = KeyForPost(msg.postId);
        const aQId          = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        const pQId          = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

        const [resp, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: aQId, key: appreciateKey },
                { queryId: pQId, key: postKey }
            ]
        });
        if (readErr) return { error: readErr };
        if (resp?.error) return { error: resp.error };

        let appreciateBytes: Uint8Array | null = null;
        let postBytes: Uint8Array | null = null;
        for (const r of resp?.results || []) {
            const qid = r.queryId as Long;
            if (qid.equals(aQId)) appreciateBytes = r.entries?.[0]?.value || null;
            else if (qid.equals(pQId)) postBytes = r.entries?.[0]?.value || null;
        }

        if (appreciateBytes && appreciateBytes.length > 0) return { error: ErrAlreadyAppreciated() };

        const record = types.AppreciateRecord.create({ createdAt: now() });
        const sets: { key: Uint8Array; value: Uint8Array }[] = [
            { key: appreciateKey, value: types.AppreciateRecord.encode(record).finish() }
        ];

        const [post, parseErr] = Unmarshal(postBytes || new Uint8Array(), types.Post);
        if (parseErr) return { error: parseErr };
        if (post) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = post as any;
            const updated = types.Post.create({
                ...p,
                appreciateCount: (Long.isLong(p.appreciateCount) ? p.appreciateCount.toNumber() : (p.appreciateCount || 0)) + 1
            });
            sets.push({ key: postKey, value: types.Post.encode(updated).finish() });

            // Boost author reputation
            const authorProfileKey = KeyForProfile(p.authorAddress);
            const apQId = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
            const [profResp] = await contract.plugin.StateRead(contract, {
                keys: [{ queryId: apQId, key: authorProfileKey }]
            });
            const profBytes = profResp?.results?.[0]?.entries?.[0]?.value;
            const [authorProfile] = Unmarshal(profBytes || new Uint8Array(), types.Profile);
            if (authorProfile) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const ap = authorProfile as any;
                const updatedAuthor = types.Profile.create({
                    ...ap,
                    reputation: (Long.isLong(ap.reputation) ? ap.reputation.toNumber() : (ap.reputation || 0)) + 1
                });
                sets.push({ key: authorProfileKey, value: types.Profile.encode(updatedAuthor).finish() });
            }
        }

        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, { sets });
        if (writeErr) return { error: writeErr };
        if (writeResp?.error) return { error: writeResp.error };
        return {};
    }

    // ── BookmarkPost ──────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverBookmarkPost(contract: Contract, msg: any): Promise<any> {
        const bookmarkKey = KeyForBookmark(msg.userAddress!, msg.postId);
        const bQId        = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

        const [resp, readErr] = await contract.plugin.StateRead(contract, {
            keys: [{ queryId: bQId, key: bookmarkKey }]
        });
        if (readErr) return { error: readErr };
        if (resp?.error) return { error: resp.error };

        const existing = resp?.results?.[0]?.entries?.[0]?.value;
        if (existing && existing.length > 0) return { error: ErrAlreadyBookmarked() };

        const record = types.BookmarkRecord.create({ createdAt: now() });
        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, {
            sets: [{ key: bookmarkKey, value: types.BookmarkRecord.encode(record).finish() }]
        });
        if (writeErr) return { error: writeErr };
        if (writeResp?.error) return { error: writeResp.error };
        return {};
    }
}
