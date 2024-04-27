"use strict";
/* istanbul ignore file */
/* eslint-disable */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const parser_delimiter_1 = require("@serialport/parser-delimiter");
const events_1 = require("events");
const serialPort_1 = require("../../serialPort");
const serialPortUtils_1 = __importDefault(require("../../serialPortUtils"));
const socketPortUtils_1 = __importDefault(require("../../socketPortUtils"));
const net_1 = __importDefault(require("net"));
const utils_1 = require("../../../utils");
const constants_1 = require("./constants");
const ziGateObject_1 = __importDefault(require("./ziGateObject"));
const waitress_1 = __importDefault(require("../../../utils/waitress"));
const commandType_1 = require("./commandType");
const frame_1 = __importDefault(require("./frame"));
const buffalo_1 = require("../../../buffalo");
const logger_1 = require("../../../utils/logger");
const NS = 'zh:zigate:driver';
const autoDetectDefinitions = [
    { manufacturer: 'zigate_PL2303', vendorId: '067b', productId: '2303' },
    { manufacturer: 'zigate_cp2102', vendorId: '10c4', productId: 'ea60' },
];
const timeouts = {
    reset: 30000,
    default: 10000,
};
function zeroPad(number, size) {
    return (number).toString(16).padStart(size || 4, '0');
}
function resolve(path, obj, separator = '.') {
    const properties = Array.isArray(path) ? path : path.split(separator);
    return properties.reduce((prev, curr) => prev && prev[curr], obj);
}
class ZiGate extends events_1.EventEmitter {
    path;
    baudRate;
    rtscts;
    initialized;
    // private timeoutResetTimeout: any;
    // private apsRequestFreeSlots: number;
    parser;
    serialPort;
    seqNumber;
    portType;
    socketPort;
    queue;
    portWrite;
    waitress;
    constructor(path, serialPortOptions) {
        super();
        this.path = path;
        this.baudRate = typeof serialPortOptions.baudRate === 'number' ? serialPortOptions.baudRate : 115200;
        this.rtscts = typeof serialPortOptions.rtscts === 'boolean' ? serialPortOptions.rtscts : false;
        this.portType = socketPortUtils_1.default.isTcpPath(path) ? 'socket' : 'serial';
        this.initialized = false;
        this.queue = new utils_1.Queue(1);
        this.waitress = new waitress_1.default(this.waitressValidator, this.waitressTimeoutFormatter);
    }
    async sendCommand(code, payload, timeout, extraParameters, disableResponse = false) {
        const waiters = [];
        const waitersId = [];
        return await this.queue.execute(async () => {
            try {
                logger_1.logger.debug('Send command \x1b[32m>>>> '
                    + constants_1.ZiGateCommandCode[code]
                    + ' 0x' + zeroPad(code)
                    + ` <<<<\x1b[0m \nPayload: ${JSON.stringify(payload)}`, NS);
                const ziGateObject = ziGateObject_1.default.createRequest(code, payload);
                const frame = ziGateObject.toZiGateFrame();
                logger_1.logger.debug(`${JSON.stringify(frame)}`, NS);
                const sendBuffer = frame.toBuffer();
                logger_1.logger.debug(`<-- send command ${sendBuffer.toString('hex')}`, NS);
                logger_1.logger.debug(`DisableResponse: ${disableResponse}`, NS);
                if (!disableResponse && Array.isArray(ziGateObject.command.response)) {
                    ziGateObject.command.response.forEach((rules) => {
                        let waiter = this.waitress.waitFor({ ziGateObject, rules, extraParameters }, timeout || timeouts.default);
                        waitersId.push(waiter.ID);
                        waiters.push(waiter.start().promise);
                    });
                }
                let resultPromise;
                if (ziGateObject.command.waitStatus !== false) {
                    const ruleStatus = [
                        { receivedProperty: 'code', matcher: commandType_1.equal, value: constants_1.ZiGateMessageCode.Status },
                        { receivedProperty: 'payload.packetType', matcher: commandType_1.equal, value: ziGateObject.code },
                    ];
                    const statusWaiter = this.waitress.waitFor({ ziGateObject, rules: ruleStatus }, timeout || timeouts.default).start();
                    resultPromise = statusWaiter.promise;
                }
                // @ts-ignore
                this.portWrite.write(sendBuffer);
                if (ziGateObject.command.waitStatus !== false) {
                    let statusResponse = await resultPromise;
                    if (statusResponse.payload.status !== constants_1.STATUS.E_SL_MSG_STATUS_SUCCESS) {
                        waitersId.map((id) => this.waitress.remove(id));
                        return Promise.reject(statusResponse);
                    }
                    else if (waiters.length === 0) {
                        return Promise.resolve(statusResponse);
                    }
                }
                return Promise.race(waiters);
            }
            catch (e) {
                logger_1.logger.error(`sendCommand error ${e}`, NS);
                return Promise.reject(new Error('sendCommand error: ' + e));
            }
        });
    }
    static async isValidPath(path) {
        return serialPortUtils_1.default.is(path, autoDetectDefinitions);
    }
    static async autoDetectPath() {
        const paths = await serialPortUtils_1.default.find(autoDetectDefinitions);
        return paths.length > 0 ? paths[0] : null;
    }
    open() {
        return this.portType === 'serial' ? this.openSerialPort() : this.openSocketPort();
    }
    async close() {
        logger_1.logger.info('closing', NS);
        this.queue.clear();
        if (this.initialized) {
            this.portWrite = null;
            this.initialized = false;
            if (this.portType === 'serial') {
                try {
                    await this.serialPort.asyncFlushAndClose();
                }
                catch (error) {
                    this.emit('close');
                    throw error;
                }
            }
            else {
                this.socketPort.destroy();
            }
        }
        this.emit('close');
    }
    waitFor(matcher, timeout = timeouts.default) {
        return this.waitress.waitFor(matcher, timeout);
    }
    async openSerialPort() {
        this.serialPort = new serialPort_1.SerialPort({
            path: this.path,
            baudRate: this.baudRate,
            dataBits: 8,
            parity: 'none', /* one of ['none', 'even', 'mark', 'odd', 'space'] */
            stopBits: 1, /* one of [1,2] */
            lock: false,
            autoOpen: false
        });
        this.parser = this.serialPort.pipe(new parser_delimiter_1.DelimiterParser({ delimiter: [frame_1.default.STOP_BYTE], includeDelimiter: true }));
        this.parser.on('data', this.onSerialData.bind(this));
        this.portWrite = this.serialPort;
        try {
            await this.serialPort.asyncOpen();
            logger_1.logger.debug('Serialport opened', NS);
            this.serialPort.once('close', this.onPortClose.bind(this));
            this.serialPort.once('error', this.onPortError.bind(this));
            this.initialized = true;
        }
        catch (error) {
            this.initialized = false;
            if (this.serialPort.isOpen) {
                this.serialPort.close();
            }
            throw error;
        }
    }
    async openSocketPort() {
        const info = socketPortUtils_1.default.parseTcpPath(this.path);
        logger_1.logger.debug(`Opening TCP socket with ${info.host}:${info.port}`, NS);
        this.socketPort = new net_1.default.Socket();
        this.socketPort.setNoDelay(true);
        this.socketPort.setKeepAlive(true, 15000);
        this.parser = this.socketPort.pipe(new parser_delimiter_1.DelimiterParser({ delimiter: [frame_1.default.STOP_BYTE], includeDelimiter: true }));
        this.parser.on('data', this.onSerialData.bind(this));
        this.portWrite = this.socketPort;
        return new Promise((resolve, reject) => {
            this.socketPort.on('connect', function () {
                logger_1.logger.debug('Socket connected', NS);
            });
            // eslint-disable-next-line
            const self = this;
            this.socketPort.on('ready', async function () {
                logger_1.logger.debug('Socket ready', NS);
                self.initialized = true;
                resolve();
            });
            this.socketPort.once('close', this.onPortClose.bind(this));
            this.socketPort.on('error', (error) => {
                logger_1.logger.error(`Socket error ${error}`, NS);
                // reject(new Error(`Error while opening socket`));
                reject();
                self.initialized = false;
            });
            this.socketPort.connect(info.port, info.host);
        });
    }
    onPortError(error) {
        logger_1.logger.error(`Port error: ${error}`, NS);
    }
    onPortClose() {
        logger_1.logger.debug('Port closed', NS);
        this.initialized = false;
        this.emit('close');
    }
    onSerialData(buffer) {
        try {
            // logger.debug(`--- parseNext `, buffer, NS);
            const frame = new frame_1.default(buffer);
            if (!(frame instanceof frame_1.default))
                return; // @Todo fix
            const code = frame.readMsgCode();
            const msgName = (constants_1.ZiGateMessageCode[code] ? constants_1.ZiGateMessageCode[code] : '') + ' 0x' + zeroPad(code);
            logger_1.logger.debug(`--> parsed frame \x1b[1;34m>>>> ${msgName} <<<<\x1b[0m `, NS);
            try {
                const ziGateObject = ziGateObject_1.default.fromZiGateFrame(frame);
                logger_1.logger.debug(`${JSON.stringify(ziGateObject.payload)}`, NS);
                this.waitress.resolve(ziGateObject);
                switch (code) {
                    case constants_1.ZiGateMessageCode.DataIndication:
                        switch (ziGateObject.payload.profileID) {
                            case 0x0000:
                                switch (ziGateObject.payload.clusterID) {
                                    case 0x0013:
                                        let networkAddress = ziGateObject.payload.payload.readUInt16LE(1);
                                        let ieeeAddr = new buffalo_1.Buffalo(ziGateObject.payload.payload.slice(3, 11)).readIeeeAddr();
                                        this.emit('DeviceAnnounce', networkAddress, ieeeAddr);
                                        break;
                                }
                                break;
                            case 0x0104:
                                this.emit('received', { ziGateObject });
                                break;
                            default:
                                logger_1.logger.error("not implemented profile: " + ziGateObject.payload.profileID, NS);
                        }
                        break;
                    case constants_1.ZiGateMessageCode.LeaveIndication:
                        this.emit('LeaveIndication', { ziGateObject });
                        break;
                    case constants_1.ZiGateMessageCode.DeviceAnnounce:
                        this.emit('DeviceAnnounce', ziGateObject.payload.shortAddress, ziGateObject.payload.ieee);
                        break;
                }
            }
            catch (error) {
                logger_1.logger.error(`Parsing error: ${error}`, NS);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error while parsing Frame '${error.stack}'`, NS);
        }
    }
    waitressTimeoutFormatter(matcher, timeout) {
        return `${matcher} after ${timeout}ms`;
    }
    waitressValidator(ziGateObject, matcher) {
        const validator = (rule) => {
            try {
                let expectedValue;
                if (typeof rule.value === "undefined" && typeof rule.expectedProperty !== "undefined") {
                    expectedValue = resolve(rule.expectedProperty, matcher.ziGateObject);
                }
                else if (typeof rule.value === "undefined" && typeof rule.expectedExtraParameter !== "undefined") {
                    expectedValue = resolve(rule.expectedExtraParameter, matcher.extraParameters);
                }
                else {
                    expectedValue = rule.value;
                }
                const receivedValue = resolve(rule.receivedProperty, ziGateObject);
                return rule.matcher(expectedValue, receivedValue);
            }
            catch (e) {
                return false;
            }
        };
        return matcher.rules.every(validator);
    }
}
exports.default = ZiGate;
//# sourceMappingURL=zigate.js.map