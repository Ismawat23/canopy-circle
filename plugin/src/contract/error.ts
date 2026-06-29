/* Social-Fi error types for Canopy Circle plugin */

import { types } from '../proto/types.js';

const DefaultModule = 'canopy-circle';

export interface IPluginError {
    code: number;
    module: string;
    msg: string;
}

export function NewError(code: number, module: string, message: string): IPluginError {
    return types.PluginError.create({ code, module, msg: message });
}

export function ErrPluginTimeout(): IPluginError {
    return NewError(1, DefaultModule, 'a plugin timeout occurred');
}
export function ErrMarshal(err: Error): IPluginError {
    return NewError(2, DefaultModule, `marshal() failed with err: ${err.message}`);
}
export function ErrUnmarshal(err: Error): IPluginError {
    return NewError(3, DefaultModule, `unmarshal() failed with err: ${err.message}`);
}
export function ErrFailedPluginRead(err: Error): IPluginError {
    return NewError(4, DefaultModule, `a plugin read failed with err: ${err.message}`);
}
export function ErrFailedPluginWrite(err: Error): IPluginError {
    return NewError(5, DefaultModule, `a plugin write failed with err: ${err.message}`);
}
export function ErrInvalidPluginRespId(): IPluginError {
    return NewError(6, DefaultModule, 'plugin response id is invalid');
}
export function ErrUnexpectedFSMToPlugin(t: string): IPluginError {
    return NewError(7, DefaultModule, `unexpected FSM to plugin: ${t}`);
}
export function ErrInvalidFSMToPluginMMessage(t: string): IPluginError {
    return NewError(8, DefaultModule, `invalid FSM to plugin message: ${t}`);
}
export function ErrInsufficientFunds(): IPluginError {
    return NewError(9, DefaultModule, 'insufficient funds');
}
export function ErrFromAny(err: Error): IPluginError {
    return NewError(10, DefaultModule, `fromAny() failed with err: ${err.message}`);
}
export function ErrInvalidMessageCast(): IPluginError {
    return NewError(11, DefaultModule, 'the message cast failed');
}
export function ErrInvalidAddress(): IPluginError {
    return NewError(12, DefaultModule, 'address is invalid');
}
export function ErrInvalidAmount(): IPluginError {
    return NewError(13, DefaultModule, 'amount is invalid');
}
export function ErrTxFeeBelowStateLimit(): IPluginError {
    return NewError(14, DefaultModule, 'tx.fee is below state limit');
}

// Social-Fi specific errors (codes 100+)
export function ErrProfileAlreadyExists(): IPluginError {
    return NewError(100, DefaultModule, 'profile already exists for this address');
}
export function ErrProfileNotFound(): IPluginError {
    return NewError(101, DefaultModule, 'profile not found');
}
export function ErrInvalidUsername(): IPluginError {
    return NewError(102, DefaultModule, 'username is invalid (3-32 alphanumeric chars)');
}
export function ErrUsernameAlreadyTaken(): IPluginError {
    return NewError(103, DefaultModule, 'username is already taken');
}
export function ErrPostNotFound(): IPluginError {
    return NewError(104, DefaultModule, 'post not found');
}
export function ErrCircleNotFound(): IPluginError {
    return NewError(105, DefaultModule, 'circle not found');
}
export function ErrCircleAlreadyExists(): IPluginError {
    return NewError(106, DefaultModule, 'circle already exists');
}
export function ErrAlreadyMember(): IPluginError {
    return NewError(107, DefaultModule, 'already a member of this circle');
}
export function ErrNotMember(): IPluginError {
    return NewError(108, DefaultModule, 'not a member of this circle');
}
export function ErrAlreadyFollowing(): IPluginError {
    return NewError(109, DefaultModule, 'already following this user');
}
export function ErrNotFollowing(): IPluginError {
    return NewError(110, DefaultModule, 'not following this user');
}
export function ErrAlreadyAppreciated(): IPluginError {
    return NewError(111, DefaultModule, 'post already appreciated');
}
export function ErrAlreadyBookmarked(): IPluginError {
    return NewError(112, DefaultModule, 'post already bookmarked');
}
export function ErrInvalidContent(): IPluginError {
    return NewError(113, DefaultModule, 'content is invalid (1-500 chars)');
}
export function ErrCannotFollowSelf(): IPluginError {
    return NewError(114, DefaultModule, 'cannot follow yourself');
}
export function ErrInvalidPostId(): IPluginError {
    return NewError(115, DefaultModule, 'post id is invalid');
}
export function ErrInvalidCircleId(): IPluginError {
    return NewError(116, DefaultModule, 'circle id is invalid');
}
export function ErrNotCircleCreator(): IPluginError {
    return NewError(117, DefaultModule, 'only the circle creator can perform this action');
}
