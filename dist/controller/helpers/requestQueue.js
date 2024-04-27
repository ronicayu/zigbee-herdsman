"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../utils/logger");
const NS = 'zh:controller:requestqueue';
class RequestQueue extends Set {
    sendInProgress;
    ID;
    deviceIeeeAddress;
    constructor(endpoint) {
        super();
        this.sendInProgress = false;
        this.ID = endpoint.ID;
        this.deviceIeeeAddress = endpoint.deviceIeeeAddress;
    }
    async send(fastPolling) {
        if (this.size === 0)
            return;
        if (!fastPolling && this.sendInProgress) {
            logger_1.logger.debug(`Request Queue (${this.deviceIeeeAddress}/${this.ID}): sendPendingRequests already in progress`, NS);
            return;
        }
        this.sendInProgress = true;
        // Remove expired requests first
        const now = Date.now();
        for (const request of this) {
            if (now > request.expires) {
                logger_1.logger.debug(`Request Queue (${this.deviceIeeeAddress}/${this.ID}): discard after timeout. Size before: ${this.size}`, NS);
                request.reject();
                this.delete(request);
            }
        }
        logger_1.logger.debug(`Request Queue (${this.deviceIeeeAddress}/${this.ID}): send pending requests (${this.size}, ${fastPolling})`, NS);
        for (const request of this) {
            if (fastPolling || request.sendPolicy !== 'bulk') {
                try {
                    const result = await request.send();
                    logger_1.logger.debug(`Request Queue (${this.deviceIeeeAddress}/${this.ID}): send success`, NS);
                    request.resolve(result);
                    this.delete(request);
                }
                catch (error) {
                    logger_1.logger.debug(`Request Queue (${this.deviceIeeeAddress}/${this.ID}): send failed, expires in ` +
                        `${(request.expires - now) / 1000} seconds`, NS);
                }
            }
        }
        this.sendInProgress = false;
    }
    async queue(request) {
        logger_1.logger.debug(`Request Queue (${this.deviceIeeeAddress}/${this.ID}): Sending when active. Expires: ${request.expires}`, NS);
        return new Promise((resolve, reject) => {
            request.addCallbacks(resolve, reject);
            this.add(request);
        });
    }
    filter(newRequest) {
        if (this.size === 0 || !(newRequest.frame.command)) {
            return;
        }
        const clusterID = newRequest.frame.cluster.ID;
        const payload = newRequest.frame.payload;
        const commandID = newRequest.frame.command.ID;
        logger_1.logger.debug(`Request Queue (${this.deviceIeeeAddress}/${this.ID}): ZCL ${newRequest.frame.command.name} ` +
            `command, filter requests. Before: ${this.size}`, NS);
        for (const request of this) {
            if (request?.frame?.cluster?.ID === undefined || !request.frame.command) {
                continue;
            }
            if (['bulk', 'queue', 'immediate'].includes(request.sendPolicy)) {
                continue;
            }
            /* istanbul ignore else */
            if (request.frame.cluster.ID === clusterID && request.frame.command.ID === commandID) {
                /* istanbul ignore else */
                if (newRequest.sendPolicy === 'keep-payload'
                    && JSON.stringify(request.frame.payload) === JSON.stringify(payload)) {
                    logger_1.logger.debug(`Request Queue (${this.deviceIeeeAddress}/${this.ID}): Merge duplicate request`, NS);
                    this.delete(request);
                    newRequest.moveCallbacks(request);
                }
                else if ((newRequest.sendPolicy === 'keep-command' || newRequest.sendPolicy === 'keep-cmd-undiv') &&
                    Array.isArray(request.frame.payload)) {
                    const filteredPayload = request.frame.payload.filter((oldEl) => !payload.find((newEl) => oldEl.attrId === newEl.attrId));
                    if (filteredPayload.length == 0) {
                        logger_1.logger.debug(`Request Queue (${this.deviceIeeeAddress}/${this.ID}): Remove & reject request`, NS);
                        if (JSON.stringify(request.frame.payload) === JSON.stringify(payload)) {
                            newRequest.moveCallbacks(request);
                        }
                        else {
                            request.reject();
                        }
                        this.delete(request);
                    }
                    else if (newRequest.sendPolicy !== 'keep-cmd-undiv') {
                        // remove all duplicate attributes if we shall not write undivided
                        request.frame.payload = filteredPayload;
                        logger_1.logger.debug(`Request Queue (${this.deviceIeeeAddress}/${this.ID}): Remove commands from request`, NS);
                    }
                }
            }
        }
        logger_1.logger.debug(`Request Queue (${this.deviceIeeeAddress}/${this.ID}): After: ${this.size}`, NS);
    }
}
exports.default = RequestQueue;
//# sourceMappingURL=requestQueue.js.map