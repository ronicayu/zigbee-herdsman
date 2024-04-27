"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
class Request {
    static defaultSendPolicy = {
        0x00: 'keep-payload', // Read Attributes
        0x01: 'immediate', // Read Attributes Response
        0x02: 'keep-command', // Write Attributes
        0x03: 'keep-cmd-undiv', // Write Attributes Undivided
        0x04: 'immediate', // Write Attributes Response
        0x05: 'keep-command', // Write Attributes No Response
        0x06: 'keep-payload', // Configure Reporting
        0x07: 'immediate', // Configure Reporting Response
        0x08: 'keep-payload', // Read Reporting Configuration
        0x09: 'immediate', // Read Reporting Configuration Response
        0x0a: 'keep-payload', // Report attributes
        0x0b: 'immediate', // Default Response
        0x0c: 'keep-payload', // Discover Attributes
        0x0d: 'immediate', // Discover Attributes Response
        0x0e: 'keep-payload', // Read Attributes Structured
        0x0f: 'keep-payload', // Write Attributes Structured
        0x10: 'immediate', // Write Attributes Structured response
        0x11: 'keep-payload', // Discover Commands Received
        0x12: 'immediate', // Discover Commands Received Response
        0x13: 'keep-payload', // Discover Commands Generated
        0x14: 'immediate', // Discover Commands Generated Response
        0x15: 'keep-payload', // Discover Attributes Extended
        0x16: 'immediate', // Discover Attributes Extended Response
    };
    func;
    frame;
    expires;
    sendPolicy;
    resolveQueue;
    rejectQueue;
    lastError;
    constructor(func, frame, timeout, sendPolicy, lastError, resolve, reject) {
        this.func = func;
        this.frame = frame;
        this.expires = timeout + Date.now();
        this.sendPolicy = sendPolicy ?? (!frame.command ?
            undefined : Request.defaultSendPolicy[frame.command.ID]);
        this.resolveQueue = resolve === undefined ?
            new Array() : new Array(resolve);
        this.rejectQueue = reject === undefined ?
            new Array() : new Array(reject);
        this.lastError = lastError ?? Error("Request rejected before first send");
    }
    moveCallbacks(from) {
        this.resolveQueue = this.resolveQueue.concat(from.resolveQueue);
        this.rejectQueue = this.rejectQueue.concat(from.rejectQueue);
        from.resolveQueue.length = 0;
        from.rejectQueue.length = 0;
    }
    addCallbacks(resolve, reject) {
        this.resolveQueue.push(resolve);
        this.rejectQueue.push(reject);
    }
    reject(error) {
        this.rejectQueue.forEach(el => el(error ?? this.lastError));
        this.rejectQueue.length = 0;
    }
    resolve(value) {
        this.resolveQueue.forEach(el => el(value));
        this.resolveQueue.length = 0;
    }
    async send() {
        try {
            return await this.func(this.frame);
        }
        catch (error) {
            this.lastError = error;
            throw (error);
        }
    }
}
exports.default = Request;
//# sourceMappingURL=request.js.map