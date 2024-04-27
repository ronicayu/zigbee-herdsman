"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AshParser = void 0;
/* istanbul ignore file */
const stream_1 = require("stream");
const enums_1 = require("./enums");
// import {logger} from "../../../utils/logger";
// const NS = 'zh:ember:uart:ash:parser';
class AshParser extends stream_1.Transform {
    buffer;
    constructor(opts) {
        super(opts);
        this.buffer = Buffer.alloc(0);
    }
    _transform(chunk, encoding, cb) {
        let data = Buffer.concat([this.buffer, chunk]);
        let position;
        while ((position = data.indexOf(enums_1.AshReservedByte.FLAG)) !== -1) {
            // emit the frame via 'data' event
            const frame = data.subarray(0, position + 1);
            setImmediate(() => {
                // expensive and very verbose, enable locally only if necessary
                // logger.debug(`<<<< [FRAME raw=${frame.toString('hex')}]`, NS);
                this.push(frame);
            });
            // remove the frame from internal buffer (set below)
            data = data.subarray(position + 1);
        }
        this.buffer = data;
        cb();
    }
    _flush(cb) {
        this.push(this.buffer);
        this.buffer = Buffer.alloc(0);
        cb();
    }
}
exports.AshParser = AshParser;
//# sourceMappingURL=parser.js.map