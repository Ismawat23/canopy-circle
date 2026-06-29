/* Canopy Circle — socket communication layer (based on Canopy TypeScript template) */

import * as net from 'net';
import * as path from 'path';
import * as fs from 'fs/promises';
import Long from 'long';
import { types } from '../proto/types.js';

function normalizeId(id: Long | number | undefined): string {
    if (id === undefined || id === null) return '0';
    if (Long.isLong(id)) return id.toString();
    return String(id);
}

import {
    IPluginError,
    ErrPluginTimeout,
    ErrMarshal,
    ErrUnmarshal,
    ErrFailedPluginWrite,
    ErrInvalidPluginRespId,
    ErrUnexpectedFSMToPlugin,
    ErrInvalidFSMToPluginMMessage,
    ErrFromAny,
    ErrInvalidMessageCast
} from './error.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ContractClass: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ContractConfigValue: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ContractAsyncClass: any;

const socketPath = 'plugin.sock';
export const PLUGIN_BUILD = 'canopy-circle-plugin v1 (Social-Fi on Canopy Network)';

export interface Config {
    ChainId: number;
    DataDirPath: string;
    rpcAddress: string;
}

export function DefaultConfig(): Config {
    return {
        ChainId: 1,
        DataDirPath: '/tmp/plugin/',
        rpcAddress: '0.0.0.0:50010'
    };
}

export async function NewConfigFromFile(filepath: string): Promise<Config> {
    const fileBytes = await fs.readFile(filepath, 'utf-8');
    const c = DefaultConfig();
    const parsed = JSON.parse(fileBytes) as Partial<Config>;
    return { ...c, ...parsed };
}

export class Plugin {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fsmConfig: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pluginConfig: any;
    conn: net.Socket;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pending: Map<string, { resolve: (value: any) => void }> = new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestContract: Map<string, any> = new Map();
    config: Config;
    private buffer: Buffer = Buffer.alloc(0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(config: Config, conn: net.Socket, pluginConfig: any) {
        this.pluginConfig = pluginConfig;
        this.conn = conn;
        this.config = config;
    }

    async Handshake(): Promise<IPluginError | null> {
        console.log('Handshaking with FSM — Canopy Circle plugin');
        const contract = new ContractClass(this.config, this.fsmConfig, this, Long.ZERO);
        const [response, err] = await this.sendToPluginSync(contract, { config: this.pluginConfig });
        if (err) return err;
        if (!response || !response.config) return ErrUnexpectedFSMToPlugin(typeof response);
        this.fsmConfig = response.config;
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async StateRead(c: any, request: any): Promise<[any | null, IPluginError | null]> {
        const [response, err] = await this.sendToPluginSync(c, { stateRead: request });
        if (err) return [null, err];
        if (!response || !response.stateRead) return [null, ErrUnexpectedFSMToPlugin(typeof response)];
        return [response.stateRead, null];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async StateWrite(c: any, request: any): Promise<[any | null, IPluginError | null]> {
        const [response, err] = await this.sendToPluginSync(c, { stateWrite: request });
        if (err) return [null, err];
        if (!response || !response.stateWrite) return [null, ErrUnexpectedFSMToPlugin(typeof response)];
        return [response.stateWrite, null];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async queryState(height: number, request: any): Promise<[any | null, IPluginError | null]> {
        const [response, err] = await this.sendDetachedSync({ query: { height, read: request } });
        if (err) return [null, err];
        if (!response || !response.query) return [null, ErrUnexpectedFSMToPlugin(typeof response)];
        if (response.query.error) return [null, response.query.error];
        return [response.query.read, null];
    }

    ListenForInbound(): void {
        this.conn.on('data', (chunk: Buffer) => {
            this.buffer = Buffer.concat([this.buffer, chunk]);
            this.processBuffer();
        });
        this.conn.on('error', (err) => { console.error(`Socket error: ${err.message}`); process.exit(1); });
        this.conn.on('close', () => { console.log('Socket closed'); process.exit(0); });
    }

    private processBuffer(): void {
        while (this.buffer.length >= 4) {
            const messageLength = this.buffer.readUInt32BE(0);
            if (this.buffer.length < 4 + messageLength) break;
            const msgBytes = this.buffer.subarray(4, 4 + messageLength);
            this.buffer = this.buffer.subarray(4 + messageLength);
            this.handleMessage(msgBytes);
        }
    }

    private handleMessage(msgBytes: Buffer): void {
        const [msg, err] = Unmarshal(msgBytes, types.FSMToPlugin);
        if (err || !msg) { console.error(`Failed to unmarshal message: ${err?.msg}`); process.exit(1); }
        this.handleMessageAsync(msg).catch((e) => { console.error(`Error handling message: ${e}`); process.exit(1); });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async handleMessageAsync(msg: any): Promise<void> {
        const c = new ContractClass(this.config, this.fsmConfig, this, msg.id as Long);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let response: any = null;

        if (msg.config && Object.keys(msg.config).length >= 0 && msg.payload === 'config') {
            const handleErr = this.handleFSMResponse(msg);
            if (handleErr) { console.error(handleErr.msg); process.exit(1); }
            return;
        } else if (msg.stateRead && msg.payload === 'stateRead') {
            const handleErr = this.handleFSMResponse(msg);
            if (handleErr) { console.error(handleErr.msg); process.exit(1); }
            return;
        } else if (msg.stateWrite && msg.payload === 'stateWrite') {
            const handleErr = this.handleFSMResponse(msg);
            if (handleErr) { console.error(handleErr.msg); process.exit(1); }
            return;
        } else if (msg.query && msg.payload === 'query') {
            const handleErr = this.handleFSMResponse(msg);
            if (handleErr) { console.error(handleErr.msg); process.exit(1); }
            return;
        } else if (msg.genesis && msg.payload === 'genesis') {
            response = { genesis: c.Genesis(msg.genesis) };
        } else if (msg.begin && msg.payload === 'begin') {
            response = { begin: c.BeginBlock(msg.begin) };
        } else if (msg.check && msg.payload === 'check') {
            response = { check: await ContractAsyncClass.CheckTx(c, msg.check) };
        } else if (msg.deliver && msg.payload === 'deliver') {
            response = { deliver: await ContractAsyncClass.DeliverTx(c, msg.deliver) };
        } else if (msg.end && msg.payload === 'end') {
            response = { end: c.EndBlock(msg.end) };
        } else {
            const handleErr = ErrInvalidFSMToPluginMMessage(JSON.stringify(msg));
            console.error(handleErr.msg);
            process.exit(1);
        }

        const sendErr = this.sendProtoMsg(types.PluginToFSM.create({ id: msg.id, ...response }));
        if (sendErr) { console.error(sendErr.msg); process.exit(1); }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleFSMResponse(msg: any): IPluginError | null {
        const id = normalizeId(msg.id);
        const pending = this.pending.get(id);
        if (!pending) return ErrInvalidPluginRespId();
        this.pending.delete(id);
        this.requestContract.delete(id);
        pending.resolve(msg);
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async sendToPluginSync(c: any, payload: any): Promise<[any | null, IPluginError | null]> {
        const [promise, requestId, err] = this.sendToPluginAsync(c, payload);
        if (err) return [null, err];
        const [response, waitErr] = await this.waitForResponse(promise, requestId);
        this.requestContract.delete(requestId);
        return [response, waitErr];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendToPluginAsync(c: any, payload: any): [Promise<any>, string, IPluginError | null] {
        const requestId = normalizeId(c.fsmId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let resolvePromise: (value: any) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const promise = new Promise<any>((resolve) => { resolvePromise = resolve; });
        this.pending.set(requestId, { resolve: resolvePromise! });
        this.requestContract.set(requestId, c);
        const err = this.sendProtoMsg(types.PluginToFSM.create({ id: c.fsmId, ...payload }));
        return [promise, requestId, err];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async sendDetachedSync(payload: any): Promise<[any | null, IPluginError | null]> {
        const [promise, requestId, err] = this.sendDetachedAsync(payload);
        if (err) return [null, err];
        return await this.waitForResponse(promise, requestId);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendDetachedAsync(payload: any): [Promise<any>, string, IPluginError | null] {
        const requestIdLong = Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        const requestId = normalizeId(requestIdLong);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let resolvePromise: (value: any) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const promise = new Promise<any>((resolve) => { resolvePromise = resolve; });
        this.pending.set(requestId, { resolve: resolvePromise! });
        const err = this.sendProtoMsg(types.PluginToFSM.create({ id: requestIdLong, ...payload }));
        if (err) this.pending.delete(requestId);
        return [promise, requestId, err];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async waitForResponse(promise: Promise<any>, requestId: string): Promise<[any | null, IPluginError | null]> {
        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
        try {
            const response = await Promise.race([promise, timeoutPromise]);
            return [response, null];
        } catch {
            this.pending.delete(requestId);
            this.requestContract.delete(requestId);
            return [null, ErrPluginTimeout()];
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendProtoMsg(msg: any): IPluginError | null {
        const [bz, err] = Marshal(msg);
        if (err || !bz) return err;
        return this.sendLengthPrefixed(bz);
    }

    sendLengthPrefixed(bz: Uint8Array): IPluginError | null {
        const lengthPrefix = Buffer.alloc(4);
        lengthPrefix.writeUInt32BE(bz.length, 0);
        try {
            this.conn.write(Buffer.concat([lengthPrefix, Buffer.from(bz)]));
        } catch (er) {
            return ErrFailedPluginWrite(er as Error);
        }
        return null;
    }
}

export function StartPlugin(c: Config): Plugin {
    console.log(`==== STARTING ${PLUGIN_BUILD} ====`);
    const sockPath = path.join(c.DataDirPath, socketPath);
    const plugin = new Plugin(c, null as unknown as net.Socket, ContractConfigValue);

    const tryConnect = (): void => {
        const conn = net.createConnection(sockPath);
        conn.on('connect', () => {
            console.log('Connected to Canopy plugin socket');
            plugin.conn = conn;
            plugin.ListenForInbound();
            plugin.Handshake().then((err) => {
                if (err) { console.error(err.msg); process.exit(1); }
            });
        });
        conn.on('error', (err) => {
            console.log(`Failed to connect to plugin socket: ${err.message} — retrying in 1s`);
            setTimeout(tryConnect, 1000);
        });
    };

    tryConnect();
    return plugin;
}

export function initializeContract(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contractClass: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contractConfig: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contractAsyncClass: any
): void {
    ContractClass = contractClass;
    ContractConfigValue = contractConfig;
    ContractAsyncClass = contractAsyncClass;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Marshal(message: any): [Uint8Array | null, IPluginError | null] {
    try {
        return [types.PluginToFSM.encode(message).finish(), null];
    } catch (err) {
        return [null, ErrMarshal(err as Error)];
    }
}

export function Unmarshal<T>(protoBytes: Uint8Array | Buffer, MessageType: any): [T | null, IPluginError | null] { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!protoBytes || protoBytes.length === 0) return [null, null];
    try {
        return [MessageType.decode(protoBytes), null];
    } catch (err) {
        return [null, ErrUnmarshal(err as Error)];
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FromAny(any: any): [any | null, string | null, IPluginError | null] {
    if (!any || !any.value) return [null, null, ErrFromAny(new Error('any is null or has no value'))];
    const typeUrl = any.typeUrl || any.type_url || '';
    try {
        if (typeUrl.includes('MessageSend'))            return [types.MessageSend.decode(any.value),           'MessageSend', null];
        if (typeUrl.includes('MessageCreateProfile'))   return [types.MessageCreateProfile.decode(any.value),  'MessageCreateProfile', null];
        if (typeUrl.includes('MessageUpdateProfile'))   return [types.MessageUpdateProfile.decode(any.value),  'MessageUpdateProfile', null];
        if (typeUrl.includes('MessageCreatePost'))      return [types.MessageCreatePost.decode(any.value),     'MessageCreatePost', null];
        if (typeUrl.includes('MessageReplyPost'))       return [types.MessageReplyPost.decode(any.value),      'MessageReplyPost', null];
        if (typeUrl.includes('MessageCreateCircle'))    return [types.MessageCreateCircle.decode(any.value),   'MessageCreateCircle', null];
        if (typeUrl.includes('MessageJoinCircle'))      return [types.MessageJoinCircle.decode(any.value),     'MessageJoinCircle', null];
        if (typeUrl.includes('MessageLeaveCircle'))     return [types.MessageLeaveCircle.decode(any.value),    'MessageLeaveCircle', null];
        if (typeUrl.includes('MessageFollowUser'))      return [types.MessageFollowUser.decode(any.value),     'MessageFollowUser', null];
        if (typeUrl.includes('MessageUnfollowUser'))    return [types.MessageUnfollowUser.decode(any.value),   'MessageUnfollowUser', null];
        if (typeUrl.includes('MessageAppreciatePost'))  return [types.MessageAppreciatePost.decode(any.value), 'MessageAppreciatePost', null];
        if (typeUrl.includes('MessageBookmarkPost'))    return [types.MessageBookmarkPost.decode(any.value),   'MessageBookmarkPost', null];
        return [null, null, ErrInvalidMessageCast()];
    } catch (err) {
        return [null, null, ErrFromAny(err as Error)];
    }
}

export function JoinLenPrefix(...toAppend: (Buffer | Uint8Array | null | undefined)[]): Uint8Array {
    let totalLen = 0;
    for (const item of toAppend) { if (item) totalLen += 1 + item.length; }
    const res = Buffer.alloc(totalLen);
    let offset = 0;
    for (const item of toAppend) {
        if (!item) continue;
        res[offset++] = item.length;
        Buffer.from(item).copy(res, offset);
        offset += item.length;
    }
    return res;
}
