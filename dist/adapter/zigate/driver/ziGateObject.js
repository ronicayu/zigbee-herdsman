"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* istanbul ignore file */
/* eslint-disable */
const frame_1 = __importDefault(require("./frame"));
const buffaloZiGate_1 = __importDefault(require("./buffaloZiGate"));
const messageType_1 = require("./messageType");
const commandType_1 = require("./commandType");
const logger_1 = require("../../../utils/logger");
const NS = 'zh:zigate:object';
const BufferAndListTypes = [
    'BUFFER', 'BUFFER8', 'BUFFER16',
    'BUFFER18', 'BUFFER32', 'BUFFER42',
    'BUFFER100', 'LIST_UINT16', 'LIST_ROUTING_TABLE',
    'LIST_BIND_TABLE', 'LIST_NEIGHBOR_LQI', 'LIST_NETWORK',
    'LIST_ASSOC_DEV', 'LIST_UINT8',
];
class ZiGateObject {
    _code;
    _payload;
    _parameters;
    _frame;
    constructor(code, payload, parameters, frame) {
        this._code = code;
        this._payload = payload;
        this._parameters = parameters;
        this._frame = frame;
    }
    get code() {
        return this._code;
    }
    get frame() {
        return this._frame;
    }
    get payload() {
        return this._payload;
    }
    get command() {
        return commandType_1.ZiGateCommand[this._code];
    }
    static createRequest(commandCode, payload) {
        const cmd = commandType_1.ZiGateCommand[commandCode];
        if (!cmd) {
            throw new Error(`Command '${commandCode}' not found`);
        }
        return new ZiGateObject(commandCode, payload, cmd.request);
    }
    static fromZiGateFrame(frame) {
        const code = frame.readMsgCode();
        return ZiGateObject.fromBufer(code, frame.msgPayloadBytes, frame);
    }
    static fromBufer(code, buffer, frame) {
        const msg = messageType_1.ZiGateMessage[code];
        if (!msg) {
            throw new Error(`Message '${code.toString(16)}' not found`);
        }
        const parameters = msg.response;
        if (parameters === undefined) {
            throw new Error(`Message '${code.toString(16)}' cannot be a response`);
        }
        const payload = this.readParameters(buffer, parameters);
        return new ZiGateObject(code, payload, parameters, frame);
    }
    static readParameters(buffer, parameters) {
        const buffalo = new buffaloZiGate_1.default(buffer);
        const result = {};
        for (const parameter of parameters) {
            const options = {};
            if (BufferAndListTypes.includes(parameter.parameterType)) {
                // When reading a buffer, assume that the previous parsed parameter contains
                // the length of the buffer
                const lengthParameter = parameters[parameters.indexOf(parameter) - 1];
                const length = result[lengthParameter.name];
                if (typeof length === 'number') {
                    options.length = length;
                }
            }
            try {
                result[parameter.name] = buffalo.read(parameter.parameterType, options);
            }
            catch (e) {
                logger_1.logger.error(e.stack, NS);
            }
        }
        if (buffalo.isMore()) {
            let bufferString = buffalo.getBuffer().toString('hex');
            logger_1.logger.error(`Last bytes of data were not parsed \x1b[32m${bufferString.slice(0, (buffalo.getPosition() * 2)).replace(/../g, "$& ")}`
                + `\x1b[31m${bufferString.slice(buffalo.getPosition() * 2).replace(/../g, "$& ")}\x1b[0m `, NS);
        }
        return result;
    }
    toZiGateFrame() {
        const buffer = this.createPayloadBuffer();
        const frame = new frame_1.default();
        frame.writeMsgCode(this._code);
        frame.writeMsgPayload(buffer);
        return frame;
    }
    createPayloadBuffer() {
        const buffalo = new buffaloZiGate_1.default(Buffer.alloc(256)); // hardcode @todo
        for (const parameter of this._parameters) {
            const value = this._payload[parameter.name];
            buffalo.write(parameter.parameterType, value, {});
        }
        return buffalo.getWritten();
    }
}
exports.default = ZiGateObject;
//# sourceMappingURL=ziGateObject.js.map