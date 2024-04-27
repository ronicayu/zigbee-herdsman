"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const definition_1 = require("./definition");
const buffaloZcl_1 = __importDefault(require("./buffaloZcl"));
const logger_1 = require("../utils/logger");
const NS = 'zh:zcl:header';
const HEADER_MINIMAL_LENGTH = 3;
const HEADER_WITH_MANUF_LENGTH = HEADER_MINIMAL_LENGTH + 2;
class ZclHeader {
    frameControl;
    manufacturerCode;
    transactionSequenceNumber;
    commandIdentifier;
    constructor(frameControl, manufacturerCode, transactionSequenceNumber, commandIdentifier) {
        this.frameControl = frameControl;
        this.manufacturerCode = manufacturerCode;
        this.transactionSequenceNumber = transactionSequenceNumber;
        this.commandIdentifier = commandIdentifier;
    }
    /** Returns the amount of bytes used by this header */
    get length() {
        return this.manufacturerCode === null ? HEADER_MINIMAL_LENGTH : HEADER_WITH_MANUF_LENGTH;
    }
    get isGlobal() {
        return this.frameControl.frameType === definition_1.FrameType.GLOBAL;
    }
    get isSpecific() {
        return this.frameControl.frameType === definition_1.FrameType.SPECIFIC;
    }
    write(buffalo) {
        const frameControl = ((this.frameControl.frameType & 0x03) |
            (((this.frameControl.manufacturerSpecific ? 1 : 0) << 2) & 0x04) |
            ((this.frameControl.direction << 3) & 0x08) |
            (((this.frameControl.disableDefaultResponse ? 1 : 0) << 4) & 0x10) |
            ((this.frameControl.reservedBits << 5) & 0xE0));
        buffalo.writeUInt8(frameControl);
        if (this.frameControl.manufacturerSpecific) {
            buffalo.writeUInt16(this.manufacturerCode);
        }
        buffalo.writeUInt8(this.transactionSequenceNumber);
        buffalo.writeUInt8(this.commandIdentifier);
    }
    static fromBuffer(buffer) {
        // Returns `undefined` in case the ZclHeader cannot be parsed.
        if (buffer.length < HEADER_MINIMAL_LENGTH) {
            logger_1.logger.debug(`ZclHeader is too short.`, NS);
            return undefined;
        }
        const buffalo = new buffaloZcl_1.default(buffer);
        const frameControlValue = buffalo.readUInt8();
        const frameControl = {
            frameType: frameControlValue & 0x03,
            manufacturerSpecific: ((frameControlValue >> 2) & 0x01) === 1,
            direction: (frameControlValue >> 3) & 0x01,
            disableDefaultResponse: ((frameControlValue >> 4) & 0x01) === 1,
            reservedBits: frameControlValue >> 5,
        };
        let manufacturerCode = null;
        if (frameControl.manufacturerSpecific) {
            if (buffer.length < HEADER_WITH_MANUF_LENGTH) {
                logger_1.logger.debug(`ZclHeader is too short for control with manufacturer-specific.`, NS);
                return undefined;
            }
            manufacturerCode = buffalo.readUInt16();
        }
        const transactionSequenceNumber = buffalo.readUInt8();
        const commandIdentifier = buffalo.readUInt8();
        return new ZclHeader(frameControl, manufacturerCode, transactionSequenceNumber, commandIdentifier);
    }
}
exports.default = ZclHeader;
//# sourceMappingURL=zclHeader.js.map