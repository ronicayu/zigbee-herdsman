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
const unpi_1 = require("../unpi");
const utils_1 = require("../../../utils");
const serialPort_1 = require("../../serialPort");
const serialPortUtils_1 = __importDefault(require("../../serialPortUtils"));
const socketPortUtils_1 = __importDefault(require("../../socketPortUtils"));
const Constants = __importStar(require("../constants"));
const zpiObject_1 = __importDefault(require("./zpiObject"));
const constants_1 = require("../unpi/constants");
const net_1 = __importDefault(require("net"));
const events_1 = __importDefault(require("events"));
const es6_1 = __importDefault(require("fast-deep-equal/es6"));
const logger_1 = require("../../../utils/logger");
const { COMMON: { ZnpCommandStatus }, Utils: { statusDescription } } = Constants;
const timeouts = {
    SREQ: 6000,
    reset: 30000,
    default: 10000,
};
const NS = 'zh:zstack:znp';
const autoDetectDefinitions = [
    { manufacturer: 'Texas Instruments', vendorId: '0451', productId: '16c8' }, // CC2538
    { manufacturer: 'Texas Instruments', vendorId: '0451', productId: '16a8' }, // CC2531
    { manufacturer: 'Texas Instruments', vendorId: '0451', productId: 'bef3' }, // CC1352P_2 and CC26X2R1
    { manufacturer: 'Electrolama', vendorId: '0403', productId: '6015' }, // ZZH
];
class Znp extends events_1.default.EventEmitter {
    path;
    baudRate;
    rtscts;
    portType;
    serialPort;
    socketPort;
    unpiWriter;
    unpiParser;
    initialized;
    queue;
    waitress;
    constructor(path, baudRate, rtscts) {
        super();
        this.path = path;
        this.baudRate = typeof baudRate === 'number' ? baudRate : 115200;
        this.rtscts = typeof rtscts === 'boolean' ? rtscts : false;
        this.portType = socketPortUtils_1.default.isTcpPath(path) ? 'socket' : 'serial';
        this.initialized = false;
        this.queue = new utils_1.Queue();
        this.waitress = new utils_1.Waitress(this.waitressValidator, this.waitressTimeoutFormatter);
    }
    log(type, message) {
        if (type === constants_1.Type.SRSP) {
            logger_1.logger.debug(`SRSP: ${message}`, NS);
        }
        else if (type === constants_1.Type.AREQ) {
            logger_1.logger.debug(`AREQ: ${message}`, NS);
        }
        else {
            /* istanbul ignore else */
            if (type === constants_1.Type.SREQ) {
                logger_1.logger.debug(`SREQ: ${message}`, NS);
            }
            else {
                throw new Error(`Unknown type '${type}'`);
            }
        }
    }
    onUnpiParsed(frame) {
        try {
            const object = zpiObject_1.default.fromUnpiFrame(frame);
            const message = `<-- ${constants_1.Subsystem[object.subsystem]} - ${object.command} - ${JSON.stringify(object.payload)}`;
            this.log(object.type, message);
            this.waitress.resolve(object);
            this.emit('received', object);
        }
        catch (error) {
            logger_1.logger.error(`Error while parsing to ZpiObject '${error.stack}'`, NS);
        }
    }
    isInitialized() {
        return this.initialized;
    }
    onPortError(error) {
        logger_1.logger.error(`Port error: ${error}`, NS);
    }
    onPortClose() {
        logger_1.logger.info('Port closed', NS);
        this.initialized = false;
        this.emit('close');
    }
    async open() {
        return this.portType === 'serial' ? this.openSerialPort() : this.openSocketPort();
    }
    async openSerialPort() {
        const options = { path: this.path, baudRate: this.baudRate, rtscts: this.rtscts, autoOpen: false };
        logger_1.logger.info(`Opening SerialPort with ${JSON.stringify(options)}`, NS);
        this.serialPort = new serialPort_1.SerialPort(options);
        this.unpiWriter = new unpi_1.Writer();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.unpiWriter.pipe(this.serialPort);
        this.unpiParser = new unpi_1.Parser();
        this.serialPort.pipe(this.unpiParser);
        this.unpiParser.on('parsed', this.onUnpiParsed.bind(this));
        try {
            await this.serialPort.asyncOpen();
            logger_1.logger.info('Serialport opened', NS);
            this.serialPort.once('close', this.onPortClose.bind(this));
            this.serialPort.once('error', this.onPortError.bind(this));
            this.initialized = true;
            await this.skipBootloader();
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
        logger_1.logger.info(`Opening TCP socket with ${info.host}:${info.port}`, NS);
        this.socketPort = new net_1.default.Socket();
        this.socketPort.setNoDelay(true);
        this.socketPort.setKeepAlive(true, 15000);
        this.unpiWriter = new unpi_1.Writer();
        this.unpiWriter.pipe(this.socketPort);
        this.unpiParser = new unpi_1.Parser();
        this.socketPort.pipe(this.unpiParser);
        this.unpiParser.on('parsed', this.onUnpiParsed.bind(this));
        return new Promise((resolve, reject) => {
            this.socketPort.on('connect', function () {
                logger_1.logger.info('Socket connected', NS);
            });
            // eslint-disable-next-line
            const self = this;
            this.socketPort.on('ready', async function () {
                logger_1.logger.info('Socket ready', NS);
                await self.skipBootloader();
                self.initialized = true;
                resolve();
            });
            this.socketPort.once('close', this.onPortClose.bind(this));
            this.socketPort.on('error', function () {
                logger_1.logger.info('Socket error', NS);
                reject(new Error(`Error while opening socket`));
                self.initialized = false;
            });
            this.socketPort.connect(info.port, info.host);
        });
    }
    async skipBootloader() {
        try {
            await this.request(constants_1.Subsystem.SYS, 'ping', { capabilities: 1 }, null, 250);
        }
        catch (error) {
            // Skip bootloader on CC2530/CC2531
            // Send magic byte: https://github.com/Koenkk/zigbee2mqtt/issues/1343 to bootloader
            // and give ZNP 1 second to start.
            try {
                logger_1.logger.info('Writing CC2530/CC2531 skip bootloader payload', NS);
                this.unpiWriter.writeBuffer(Buffer.from([0xef]));
                await (0, utils_1.Wait)(1000);
                await this.request(constants_1.Subsystem.SYS, 'ping', { capabilities: 1 }, null, 250);
            }
            catch (error) {
                // Skip bootloader on some CC2652 devices (e.g. zzh-p)
                logger_1.logger.info('Skip bootloader for CC2652/CC1352', NS);
                if (this.serialPort) {
                    await this.setSerialPortOptions({ dtr: false, rts: false });
                    await (0, utils_1.Wait)(150);
                    await this.setSerialPortOptions({ dtr: false, rts: true });
                    await (0, utils_1.Wait)(150);
                    await this.setSerialPortOptions({ dtr: false, rts: false });
                    await (0, utils_1.Wait)(150);
                }
            }
        }
    }
    async setSerialPortOptions(options) {
        return new Promise((resolve) => {
            this.serialPort.set(options, () => {
                resolve();
            });
        });
    }
    static async isValidPath(path) {
        // For TCP paths we cannot get device information, therefore we cannot validate it.
        if (socketPortUtils_1.default.isTcpPath(path)) {
            return false;
        }
        try {
            return serialPortUtils_1.default.is((0, utils_1.RealpathSync)(path), autoDetectDefinitions);
        }
        catch (error) {
            logger_1.logger.error(`Failed to determine if path is valid: '${error}'`, NS);
            return false;
        }
    }
    static async autoDetectPath() {
        const paths = await serialPortUtils_1.default.find(autoDetectDefinitions);
        // CC1352P_2 and CC26X2R1 lists as 2 USB devices with same manufacturer, productId and vendorId
        // one is the actual chip interface, other is the XDS110.
        // The chip is always exposed on the first one after alphabetical sorting.
        paths.sort((a, b) => (a < b) ? -1 : 1);
        return paths.length > 0 ? paths[0] : null;
    }
    async close() {
        logger_1.logger.info('closing', NS);
        this.queue.clear();
        if (this.initialized) {
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
    request(subsystem, command, payload, waiterID = null, timeout = null, expectedStatuses = [ZnpCommandStatus.SUCCESS]) {
        if (!this.initialized) {
            throw new Error('Cannot request when znp has not been initialized yet');
        }
        const object = zpiObject_1.default.createRequest(subsystem, command, payload);
        const message = `--> ${constants_1.Subsystem[object.subsystem]} - ${object.command} - ${JSON.stringify(payload)}`;
        return this.queue.execute(async () => {
            this.log(object.type, message);
            const frame = object.toUnpiFrame();
            if (object.type === constants_1.Type.SREQ) {
                const t = object.command === 'bdbStartCommissioning' || object.command === 'startupFromApp' ?
                    40000 : timeouts.SREQ;
                const waiter = this.waitress.waitFor({ type: constants_1.Type.SRSP, subsystem: object.subsystem, command: object.command }, timeout || t);
                this.unpiWriter.writeFrame(frame);
                const result = await waiter.start().promise;
                if (result && result.payload.hasOwnProperty('status') &&
                    !expectedStatuses.includes(result.payload.status)) {
                    if (typeof waiterID === 'number') {
                        this.waitress.remove(waiterID);
                    }
                    throw new Error(`SREQ '${message}' failed with status '${statusDescription(result.payload.status)}' (expected '${expectedStatuses.map(statusDescription)}')`);
                }
                else {
                    return result;
                }
            }
            else if (object.type === constants_1.Type.AREQ && object.isResetCommand()) {
                const waiter = this.waitress.waitFor({ type: constants_1.Type.AREQ, subsystem: constants_1.Subsystem.SYS, command: 'resetInd' }, timeout || timeouts.reset);
                this.queue.clear();
                this.unpiWriter.writeFrame(frame);
                return waiter.start().promise;
            }
            else {
                /* istanbul ignore else */
                if (object.type === constants_1.Type.AREQ) {
                    this.unpiWriter.writeFrame(frame);
                    return undefined;
                }
                else {
                    throw new Error(`Unknown type '${object.type}'`);
                }
            }
        });
    }
    waitressTimeoutFormatter(matcher, timeout) {
        return `${constants_1.Type[matcher.type]} - ${constants_1.Subsystem[matcher.subsystem]} - ${matcher.command} after ${timeout}ms`;
    }
    waitFor(type, subsystem, command, payload = {}, timeout = timeouts.default) {
        return this.waitress.waitFor({ type, subsystem, command, payload }, timeout);
    }
    waitressValidator(zpiObject, matcher) {
        const requiredMatch = matcher.type === zpiObject.type && matcher.subsystem == zpiObject.subsystem &&
            matcher.command === zpiObject.command;
        let payloadMatch = true;
        if (matcher.payload) {
            for (const [key, value] of Object.entries(matcher.payload)) {
                if (!(0, es6_1.default)(zpiObject.payload[key], value)) {
                    payloadMatch = false;
                    break;
                }
            }
        }
        return requiredMatch && payloadMatch;
    }
}
exports.default = Znp;
//# sourceMappingURL=znp.js.map