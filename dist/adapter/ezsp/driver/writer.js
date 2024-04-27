"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Writer = void 0;
/* istanbul ignore file */
const stream = __importStar(require("stream"));
const consts = __importStar(require("./consts"));
const utils_1 = require("./utils");
const logger_1 = require("../../../utils/logger");
const NS = 'zh:ezsp:uart';
class Writer extends stream.Readable {
    writeBuffer(buffer) {
        logger_1.logger.debug(`--> [${buffer.toString('hex')}]`, NS);
        this.push(buffer);
    }
    _read() {
    }
    sendACK(ackNum) {
        /* Construct a acknowledgement frame */
        const ackFrame = this.makeFrame((0b10000000 | ackNum));
        this.writeBuffer(ackFrame);
    }
    sendNAK(ackNum) {
        /* Construct a negative acknowledgement frame */
        const nakFrame = this.makeFrame((0b10100000 | ackNum));
        this.writeBuffer(nakFrame);
    }
    sendReset() {
        /* Construct a reset frame */
        const rstFrame = Buffer.concat([Buffer.from([consts.CANCEL]), this.makeFrame(0xC0)]);
        this.writeBuffer(rstFrame);
    }
    sendData(data, seq, rxmit, ackSeq) {
        /* Construct a data frame */
        const control = (((seq << 4) | (rxmit << 3)) | ackSeq);
        const dataFrame = this.makeFrame(control, data);
        this.writeBuffer(dataFrame);
    }
    *stuff(buffer) {
        /* Byte stuff (escape) a string for transmission */
        for (const byte of buffer) {
            if (consts.RESERVED.includes(byte)) {
                yield consts.ESCAPE;
                yield byte ^ consts.STUFF;
            }
            else {
                yield byte;
            }
        }
    }
    makeFrame(control, data) {
        /* Construct a frame */
        const frm = [control, ...(data || [])];
        const crc = (0, utils_1.crc16ccitt)(frm, 65535);
        frm.push(crc >> 8);
        frm.push(crc % 256);
        return Buffer.from([...this.stuff(frm), consts.FLAG]);
    }
}
exports.Writer = Writer;
//# sourceMappingURL=writer.js.map