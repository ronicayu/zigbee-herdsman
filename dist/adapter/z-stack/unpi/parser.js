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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stream = __importStar(require("stream"));
const constants_1 = require("./constants");
const frame_1 = __importDefault(require("./frame"));
const logger_1 = require("../../../utils/logger");
const NS = 'zh:zstack:unpi:parser';
class Parser extends stream.Transform {
    buffer;
    constructor() {
        super();
        this.buffer = Buffer.from([]);
    }
    _transform(chunk, _, cb) {
        logger_1.logger.debug(`<-- [${[...chunk]}]`, NS);
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this.parseNext();
        cb();
    }
    parseNext() {
        logger_1.logger.debug(`--- parseNext [${[...this.buffer]}]`, NS);
        if (this.buffer.length !== 0 && this.buffer.readUInt8(0) !== constants_1.SOF) {
            // Buffer doesn't start with SOF, skip till SOF.
            const index = this.buffer.indexOf(constants_1.SOF);
            if (index !== -1) {
                this.buffer = this.buffer.slice(index, this.buffer.length);
            }
        }
        if (this.buffer.length >= constants_1.MinMessageLength && this.buffer.readUInt8(0) == constants_1.SOF) {
            const dataLength = this.buffer[constants_1.PositionDataLength];
            const fcsPosition = constants_1.DataStart + dataLength;
            const frameLength = fcsPosition + 1;
            if (this.buffer.length >= frameLength) {
                const frameBuffer = this.buffer.slice(0, frameLength);
                try {
                    const frame = frame_1.default.fromBuffer(dataLength, fcsPosition, frameBuffer);
                    logger_1.logger.debug(`--> parsed ${frame}`, NS);
                    this.emit('parsed', frame);
                }
                catch (error) {
                    logger_1.logger.debug(`--> error ${error.stack}`, NS);
                }
                this.buffer = this.buffer.slice(frameLength, this.buffer.length);
                this.parseNext();
            }
        }
    }
}
exports.default = Parser;
//# sourceMappingURL=parser.js.map