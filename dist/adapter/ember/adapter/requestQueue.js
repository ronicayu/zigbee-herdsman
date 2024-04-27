"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmberRequestQueue = exports.NETWORK_DOWN_DEFER_MSEC = exports.NETWORK_BUSY_DEFER_MSEC = void 0;
/* istanbul ignore file */
const logger_1 = require("../../../utils/logger");
const enums_1 = require("../enums");
const NS = 'zh:ember:queue';
;
exports.NETWORK_BUSY_DEFER_MSEC = 500;
exports.NETWORK_DOWN_DEFER_MSEC = 1500;
class EmberRequestQueue {
    dispatchInterval;
    /** If true, the queue is currently busy dispatching. */
    dispatching;
    /** The queue holding requests to be sent. */
    queue;
    /** Queue with requests that should take priority over the above queue. */
    priorityQueue;
    constructor(dispatchInterval) {
        this.dispatchInterval = dispatchInterval || 5;
        this.dispatching = false;
        this.queue = [];
        this.priorityQueue = [];
    }
    /**
     * Empty each queue.
     */
    clear() {
        this.queue = [];
        this.priorityQueue = [];
    }
    /**
     * Prevent sending requests (usually due to NCP being reset).
     */
    stopDispatching() {
        this.dispatching = false;
        logger_1.logger.debug(`Dispatching stopped; queue=${this.queue.length} priorityQueue=${this.priorityQueue.length}`, NS);
    }
    /**
     * Allow sending requests.
     * Must be called after init.
     */
    startDispatching() {
        this.dispatching = true;
        setTimeout(this.dispatch.bind(this), 0);
        logger_1.logger.debug(`Dispatching started.`, NS);
    }
    /**
     * Store a function in the queue to be resolved when appropriate.
     * @param function The function to enqueue. Upon dispatch:
     *     - if its return value is one of MAX_MESSAGE_LIMIT_REACHED, NETWORK_BUSY, NETWORK_DOWN,
     *       queue will defer dispatching and keep the function in the queue; reject otherwise.
     *     - if it throws, it is expected to throw `EzspStatus`, and will act same as above if one of NOT_CONNECTED, NO_TX_SPACE; reject otherwise.
     *     - any other value will result in the function being removed from the queue.
     * @param reject The `reject` of the Promise wrapping the `enqueue` call
     *     (`resolve` is done in `func` directly to have typing on results & control on exec).
     * @param prioritize If true, function will be enqueued in the priority queue. Defaults to false.
     * @returns new length of the queue.
     */
    enqueue(func, reject, prioritize = false) {
        logger_1.logger.debug(`Status queue=${this.queue.length} priorityQueue=${this.priorityQueue.length}.`, NS);
        return (prioritize ? this.priorityQueue : this.queue).push({
            sendAttempts: 0,
            func,
            reject,
        });
    }
    /**
     * Dispatch the head of the queue.
     *
     * If request `func` throws, catch error and reject the request. `ezsp${x}` functions throw `EzspStatus` as error.
     *
     * If request `func` resolves but has an error, look at what error, and determine if should retry or remove the request from queue.
     *
     * If request `func` resolves without error, remove request from queue.
     *
     * WARNING: Because of this logic for "internal retries", any error thrown by `func` will not immediatedly bubble back to Adapter/Controller
     */
    async dispatch() {
        if (!this.dispatching) {
            return;
        }
        let fromPriorityQueue = true;
        let entry = this.priorityQueue[0]; // head of queue if any, priority first
        if (!entry) {
            fromPriorityQueue = false;
            entry = this.queue[0];
        }
        if (entry) {
            entry.sendAttempts++;
            // NOTE: refer to `enqueue()` comment to keep logic in sync with expectations, adjust comment on change.
            try {
                const status = (await entry.func());
                if ((status === enums_1.EmberStatus.MAX_MESSAGE_LIMIT_REACHED) || (status === enums_1.EmberStatus.NETWORK_BUSY)) {
                    logger_1.logger.debug(`Dispatching deferred: NCP busy.`, NS);
                    this.defer(exports.NETWORK_BUSY_DEFER_MSEC);
                }
                else if (status === enums_1.EmberStatus.NETWORK_DOWN) {
                    logger_1.logger.debug(`Dispatching deferred: Network not ready`, NS);
                    this.defer(exports.NETWORK_DOWN_DEFER_MSEC);
                }
                else {
                    // success
                    (fromPriorityQueue ? this.priorityQueue : this.queue).shift();
                    if (status !== enums_1.EmberStatus.SUCCESS) {
                        entry.reject(new Error(enums_1.EmberStatus[status]));
                    }
                }
            }
            catch (err) { // message is EzspStatus string from ezsp${x} commands, except for stuff rejected by OneWaitress, but that's never "retry"
                if (err.message === enums_1.EzspStatus[enums_1.EzspStatus.NO_TX_SPACE]) {
                    logger_1.logger.debug(`Dispatching deferred: Host busy.`, NS);
                    this.defer(exports.NETWORK_BUSY_DEFER_MSEC);
                }
                else if (err.message === enums_1.EzspStatus[enums_1.EzspStatus.NOT_CONNECTED]) {
                    logger_1.logger.debug(`Dispatching deferred: Network not ready`, NS);
                    this.defer(exports.NETWORK_DOWN_DEFER_MSEC);
                }
                else {
                    (fromPriorityQueue ? this.priorityQueue : this.queue).shift();
                    entry.reject(err);
                }
            }
        }
        if (this.dispatching) {
            setTimeout(this.dispatch.bind(this), this.dispatchInterval);
        }
    }
    /**
     * Defer dispatching for the specified duration (in msec).
     * @param msec
     */
    defer(msec) {
        this.stopDispatching();
        setTimeout(this.startDispatching.bind(this), msec);
    }
}
exports.EmberRequestQueue = EmberRequestQueue;
//# sourceMappingURL=requestQueue.js.map