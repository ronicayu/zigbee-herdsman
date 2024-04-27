import { EmberStatus } from "../enums";
export declare const NETWORK_BUSY_DEFER_MSEC = 500;
export declare const NETWORK_DOWN_DEFER_MSEC = 1500;
export declare class EmberRequestQueue {
    private readonly dispatchInterval;
    /** If true, the queue is currently busy dispatching. */
    private dispatching;
    /** The queue holding requests to be sent. */
    private queue;
    /** Queue with requests that should take priority over the above queue. */
    private priorityQueue;
    constructor(dispatchInterval: number);
    /**
     * Empty each queue.
     */
    clear(): void;
    /**
     * Prevent sending requests (usually due to NCP being reset).
     */
    stopDispatching(): void;
    /**
     * Allow sending requests.
     * Must be called after init.
     */
    startDispatching(): void;
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
    enqueue(func: () => Promise<EmberStatus>, reject: (reason: Error) => void, prioritize?: boolean): number;
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
    private dispatch;
    /**
     * Defer dispatching for the specified duration (in msec).
     * @param msec
     */
    private defer;
}
//# sourceMappingURL=requestQueue.d.ts.map