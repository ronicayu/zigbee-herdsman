"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmberOneWaitress = exports.OneWaitressEvents = void 0;
/* istanbul ignore file */
const es6_1 = __importDefault(require("fast-deep-equal/es6"));
const consts_1 = require("../consts");
const zdo_1 = require("../zdo");
const logger_1 = require("../../../utils/logger");
const NS = 'zh:ember:waitress';
/** Events specific to OneWaitress usage. */
var OneWaitressEvents;
(function (OneWaitressEvents) {
    OneWaitressEvents["STACK_STATUS_NETWORK_UP"] = "STACK_STATUS_NETWORK_UP";
    OneWaitressEvents["STACK_STATUS_NETWORK_DOWN"] = "STACK_STATUS_NETWORK_DOWN";
    OneWaitressEvents["STACK_STATUS_NETWORK_OPENED"] = "STACK_STATUS_NETWORK_OPENED";
    OneWaitressEvents["STACK_STATUS_NETWORK_CLOSED"] = "STACK_STATUS_NETWORK_CLOSED";
    OneWaitressEvents["STACK_STATUS_CHANNEL_CHANGED"] = "STACK_STATUS_CHANNEL_CHANGED";
})(OneWaitressEvents || (exports.OneWaitressEvents = OneWaitressEvents = {}));
;
;
/**
 * The one waitress to rule them all. Hopefully.
 * Careful, she'll burn you if you're late on delivery!
 *
 * NOTE: `messageTag` is unreliable, so not used...
 */
class EmberOneWaitress {
    waiters;
    // NOTE: for now, this could be much simpler (array-like), but more complex events might come into play
    eventWaiters;
    currentId;
    currentEventId;
    constructor() {
        this.waiters = new Map();
        this.eventWaiters = new Map();
        this.currentId = 0;
        this.currentEventId = 0;
    }
    /**
     * Reject because of failed delivery notified by `ezspMessageSentHandler`.
     * NOTE: This checks for APS sequence, which is only valid in `ezspMessageSentHandler`, not `ezspIncomingMessageHandler` (sequence from stack)
     *
     * @param target
     * @param apsFrame
     * @returns
     */
    deliveryFailedFor(target, apsFrame) {
        for (const [index, waiter] of this.waiters.entries()) {
            if (waiter.timedout) {
                this.waiters.delete(index);
                continue;
            }
            // no target in touchlink
            // in `ezspMessageSentHandler`, the clusterId for ZDO is still the request one, so check against apsFrame, not override
            if (((waiter.matcher.apsFrame.profileId === consts_1.TOUCHLINK_PROFILE_ID) || (target === waiter.matcher.target))
                && (apsFrame.sequence === waiter.matcher.apsFrame.sequence) && (apsFrame.profileId === waiter.matcher.apsFrame.profileId)
                && (apsFrame.clusterId === waiter.matcher.apsFrame.clusterId)) {
                clearTimeout(waiter.timer);
                waiter.resolved = true;
                this.waiters.delete(index);
                waiter.reject(new Error(`Delivery failed for ${JSON.stringify(apsFrame)}`));
                return true;
            }
        }
        return false;
    }
    /**
     * Resolve or reject ZDO response based on given status.
     * @param status
     * @param sender
     * @param apsFrame
     * @param payload
     * @returns
     */
    resolveZDO(status, sender, apsFrame, payload) {
        for (const [index, waiter] of this.waiters.entries()) {
            if (waiter.timedout) {
                this.waiters.delete(index);
                continue;
            }
            // always a sender expected in ZDO, profileId is a bit redundant here, but...
            if ((sender === waiter.matcher.target) && (apsFrame.profileId === waiter.matcher.apsFrame.profileId)
                && (apsFrame.clusterId === (waiter.matcher.responseClusterId != null ?
                    waiter.matcher.responseClusterId : waiter.matcher.apsFrame.clusterId))) {
                clearTimeout(waiter.timer);
                waiter.resolved = true;
                this.waiters.delete(index);
                if (status === zdo_1.EmberZdoStatus.ZDP_SUCCESS) {
                    waiter.resolve(payload);
                }
                else if (status === zdo_1.EmberZdoStatus.ZDP_NO_ENTRY) {
                    // XXX: bypassing fail here since Z2M seems to trigger ZDO remove-type commands without checking current state
                    //      Z2M also fails with ZCL payload NOT_FOUND though. This should be removed once upstream fixes that.
                    logger_1.logger.info(`[ZDO] Received status ZDP_NO_ENTRY for "${sender}" cluster "${apsFrame.clusterId}". Ignoring.`, NS);
                    waiter.resolve(payload);
                }
                else {
                    waiter.reject(new Error(`[ZDO] Failed response by NCP for "${sender}" cluster "${apsFrame.clusterId}" `
                        + `with status=${zdo_1.EmberZdoStatus[status]}.`));
                }
                return true;
            }
        }
        return false;
    }
    resolveZCL(payload) {
        if (!payload.header)
            return false;
        for (const [index, waiter] of this.waiters.entries()) {
            if (waiter.timedout) {
                this.waiters.delete(index);
                continue;
            }
            // no target in touchlink, also no APS sequence, but use the ZCL one instead
            if (((waiter.matcher.apsFrame.profileId === consts_1.TOUCHLINK_PROFILE_ID) || (payload.address === waiter.matcher.target))
                && (!waiter.matcher.zclSequence || (payload.header.transactionSequenceNumber === waiter.matcher.zclSequence))
                && (!waiter.matcher.commandIdentifier || (payload.header.commandIdentifier === waiter.matcher.commandIdentifier))
                && (payload.clusterID === waiter.matcher.apsFrame.clusterId)
                && (payload.endpoint === waiter.matcher.apsFrame.destinationEndpoint)) {
                clearTimeout(waiter.timer);
                waiter.resolved = true;
                this.waiters.delete(index);
                waiter.resolve(payload);
                return true;
            }
        }
        return false;
    }
    waitFor(matcher, timeout) {
        const id = this.currentId++;
        this.currentId &= 0xFFFF; // roll-over every so often - 65535 should be enough not to create conflicts ;-)
        const promise = new Promise((resolve, reject) => {
            const object = { matcher, resolve, reject, timedout: false, resolved: false, id };
            this.waiters.set(id, object);
        });
        const start = () => {
            const waiter = this.waiters.get(id);
            if (waiter && !waiter.resolved && !waiter.timer) {
                // Capture the stack trace from the caller of start()
                const error = new Error();
                Error.captureStackTrace(error);
                waiter.timer = setTimeout(() => {
                    error.message = `${JSON.stringify(matcher)} timed out after ${timeout}ms`;
                    waiter.timedout = true;
                    waiter.reject(error);
                }, timeout);
            }
            return { promise, id };
        };
        return { id, start };
    }
    /**
     * Shortcut that starts the timer immediately and returns the promise.
     * No access to `id`, so no easy cancel.
     * @param matcher
     * @param timeout
     * @returns
     */
    startWaitingFor(matcher, timeout) {
        return this.waitFor(matcher, timeout).start().promise;
    }
    remove(id) {
        const waiter = this.waiters.get(id);
        if (waiter) {
            if (!waiter.timedout && waiter.timer) {
                clearTimeout(waiter.timer);
            }
            this.waiters.delete(id);
        }
    }
    /**
     * Matches event name with matcher's, and payload (if any in matcher) using `fast-deep-equal/es6` (all keys & values must match)
     * @param eventName
     * @param payload
     * @returns
     */
    resolveEvent(eventName, payload) {
        for (const [index, waiter] of this.eventWaiters.entries()) {
            if (waiter.timedout) {
                this.eventWaiters.delete(index);
                continue;
            }
            if (eventName === waiter.matcher.eventName && (!waiter.matcher.payload || ((0, es6_1.default)(payload, waiter.matcher.payload)))) {
                clearTimeout(waiter.timer);
                waiter.resolved = true;
                this.eventWaiters.delete(index);
                waiter.resolve(payload);
                return true;
            }
        }
    }
    waitForEvent(matcher, timeout, reason = null) {
        // NOTE: logic is very much the same as `waitFor`, just different matcher
        const id = this.currentEventId++;
        this.currentEventId &= 0xFFFF; // roll-over every so often - 65535 should be enough not to create conflicts ;-)
        const promise = new Promise((resolve, reject) => {
            const object = { matcher, resolve, reject, timedout: false, resolved: false, id };
            this.eventWaiters.set(id, object);
        });
        const start = () => {
            const waiter = this.eventWaiters.get(id);
            if (waiter && !waiter.resolved && !waiter.timer) {
                // Capture the stack trace from the caller of start()
                const error = new Error();
                Error.captureStackTrace(error);
                waiter.timer = setTimeout(() => {
                    error.message = `${reason ? reason : JSON.stringify(matcher)} timed out after ${timeout}ms`;
                    waiter.timedout = true;
                    waiter.reject(error);
                }, timeout);
            }
            return { promise, id };
        };
        return { id, start };
    }
    /**
     * Shortcut that starts the timer immediately and returns the promise.
     * No access to `id`, so no easy cancel.
     * @param matcher
     * @param timeout
     * @param reason If supplied, will be used as timeout label, otherwise stringified matcher is.
     * @returns
     */
    startWaitingForEvent(matcher, timeout, reason = null) {
        return this.waitForEvent(matcher, timeout, reason).start().promise;
    }
    removeEvent(id) {
        const waiter = this.eventWaiters.get(id);
        if (waiter) {
            if (!waiter.timedout && waiter.timer) {
                clearTimeout(waiter.timer);
            }
            this.eventWaiters.delete(id);
        }
    }
}
exports.EmberOneWaitress = EmberOneWaitress;
//# sourceMappingURL=oneWaitress.js.map