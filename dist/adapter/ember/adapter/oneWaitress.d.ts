import { ZclPayload } from "../../events";
import { EmberApsFrame, EmberNodeId } from "../types";
import { EmberZdoStatus } from "../zdo";
/** Events specific to OneWaitress usage. */
export declare enum OneWaitressEvents {
    STACK_STATUS_NETWORK_UP = "STACK_STATUS_NETWORK_UP",
    STACK_STATUS_NETWORK_DOWN = "STACK_STATUS_NETWORK_DOWN",
    STACK_STATUS_NETWORK_OPENED = "STACK_STATUS_NETWORK_OPENED",
    STACK_STATUS_NETWORK_CLOSED = "STACK_STATUS_NETWORK_CLOSED",
    STACK_STATUS_CHANNEL_CHANGED = "STACK_STATUS_CHANNEL_CHANGED"
}
type OneWaitressMatcher = {
    /**
     * Matches `indexOrDestination` in `ezspMessageSentHandler` or `sender` in `ezspIncomingMessageHandler`
     * Except for InterPAN touchlink, it should always be present.
     */
    target?: EmberNodeId;
    apsFrame: EmberApsFrame;
    /** Cluster ID for when the response doesn't match the request. Takes priority over apsFrame.clusterId. Should be mostly for ZDO requests. */
    responseClusterId?: number;
    /** ZCL frame transaction sequence number */
    zclSequence?: number;
    /** Expected command ID for ZCL commands */
    commandIdentifier?: number;
};
type OneWaitressEventMatcher = {
    eventName: string;
    /** If supplied, keys/values are expected to match with resolve payload. */
    payload?: {
        [k: string]: unknown;
    };
};
/**
 * The one waitress to rule them all. Hopefully.
 * Careful, she'll burn you if you're late on delivery!
 *
 * NOTE: `messageTag` is unreliable, so not used...
 */
export declare class EmberOneWaitress {
    private readonly waiters;
    private readonly eventWaiters;
    private currentId;
    private currentEventId;
    constructor();
    /**
     * Reject because of failed delivery notified by `ezspMessageSentHandler`.
     * NOTE: This checks for APS sequence, which is only valid in `ezspMessageSentHandler`, not `ezspIncomingMessageHandler` (sequence from stack)
     *
     * @param target
     * @param apsFrame
     * @returns
     */
    deliveryFailedFor(target: number, apsFrame: EmberApsFrame): boolean;
    /**
     * Resolve or reject ZDO response based on given status.
     * @param status
     * @param sender
     * @param apsFrame
     * @param payload
     * @returns
     */
    resolveZDO(status: EmberZdoStatus, sender: EmberNodeId, apsFrame: EmberApsFrame, payload: unknown): boolean;
    resolveZCL(payload: ZclPayload): boolean;
    waitFor<T>(matcher: OneWaitressMatcher, timeout: number): {
        id: number;
        start: () => {
            promise: Promise<T>;
            id: number;
        };
    };
    /**
     * Shortcut that starts the timer immediately and returns the promise.
     * No access to `id`, so no easy cancel.
     * @param matcher
     * @param timeout
     * @returns
     */
    startWaitingFor<T>(matcher: OneWaitressMatcher, timeout: number): Promise<T>;
    remove(id: number): void;
    /**
     * Matches event name with matcher's, and payload (if any in matcher) using `fast-deep-equal/es6` (all keys & values must match)
     * @param eventName
     * @param payload
     * @returns
     */
    resolveEvent(eventName: string, payload?: {
        [k: string]: unknown;
    }): boolean;
    waitForEvent<T>(matcher: OneWaitressEventMatcher, timeout: number, reason?: string): {
        id: number;
        start: () => {
            promise: Promise<T>;
            id: number;
        };
    };
    /**
     * Shortcut that starts the timer immediately and returns the promise.
     * No access to `id`, so no easy cancel.
     * @param matcher
     * @param timeout
     * @param reason If supplied, will be used as timeout label, otherwise stringified matcher is.
     * @returns
     */
    startWaitingForEvent<T>(matcher: OneWaitressEventMatcher, timeout: number, reason?: string): Promise<T>;
    removeEvent(id: number): void;
}
export {};
//# sourceMappingURL=oneWaitress.d.ts.map