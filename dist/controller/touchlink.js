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
const Zcl = __importStar(require("../zcl"));
const utils_1 = require("../utils");
const logger_1 = require("../utils/logger");
const NS = 'zh:controller:touchlink';
const scanChannels = [11, 15, 20, 25, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23, 24, 26];
class Touchlink {
    adapter;
    locked;
    constructor(adapter) {
        this.adapter = adapter;
        this.locked = false;
    }
    lock(lock) {
        if (lock && this.locked) {
            throw new Error(`Touchlink operation already in progress`);
        }
        this.locked = lock;
    }
    transactionNumber() {
        return Math.floor(Math.random() * 0xFFFFFFFF);
    }
    async scan() {
        this.lock(true);
        const result = [];
        try {
            for (const channel of scanChannels) {
                logger_1.logger.info(`Set InterPAN channel to '${channel}'`, NS);
                await this.adapter.setChannelInterPAN(channel);
                try {
                    // TODO: multiple responses are not handled yet.
                    const response = await this.adapter.sendZclFrameInterPANBroadcast(this.createScanRequestFrame(this.transactionNumber()), 500);
                    logger_1.logger.debug(`Got scan response on channel '${channel}' of '${response.address}'`, NS);
                    (0, utils_1.AssertString)(response.address);
                    result.push({ ieeeAddr: response.address, channel });
                }
                catch (error) {
                    logger_1.logger.warning(`Scan request failed or was not answered: '${error}'`, NS);
                }
            }
        }
        finally {
            logger_1.logger.info(`Restore InterPAN channel`, NS);
            await this.adapter.restoreChannelInterPAN();
            this.lock(false);
        }
        return result;
    }
    async identify(ieeeAddr, channel) {
        this.lock(true);
        try {
            const transaction = this.transactionNumber();
            logger_1.logger.info(`Set InterPAN channel to '${channel}'`, NS);
            await this.adapter.setChannelInterPAN(channel);
            await this.adapter.sendZclFrameInterPANBroadcast(this.createScanRequestFrame(transaction), 500);
            logger_1.logger.debug(`Got scan response on channel '${channel}'`, NS);
            logger_1.logger.debug(`Identifying '${ieeeAddr}'`, NS);
            await this.adapter.sendZclFrameInterPANToIeeeAddr(this.createIdentifyRequestFrame(transaction), ieeeAddr);
        }
        finally {
            logger_1.logger.info(`Restore InterPAN channel`, NS);
            await this.adapter.restoreChannelInterPAN();
            this.lock(false);
        }
    }
    async factoryReset(ieeeAddr, channel) {
        this.lock(true);
        try {
            const transaction = this.transactionNumber();
            logger_1.logger.info(`Set InterPAN channel to '${channel}'`, NS);
            await this.adapter.setChannelInterPAN(channel);
            await this.adapter.sendZclFrameInterPANBroadcast(this.createScanRequestFrame(transaction), 500);
            logger_1.logger.debug(`Got scan response on channel '${channel}'`, NS);
            logger_1.logger.debug(`Identifying '${ieeeAddr}'`, NS);
            await this.adapter.sendZclFrameInterPANToIeeeAddr(this.createIdentifyRequestFrame(transaction), ieeeAddr);
            await (0, utils_1.Wait)(2000);
            logger_1.logger.debug(`Reset to factory new '${ieeeAddr}'`, NS);
            await this.adapter.sendZclFrameInterPANToIeeeAddr(this.createResetFactoryNewRequestFrame(transaction), ieeeAddr);
        }
        finally {
            logger_1.logger.info(`Restore InterPAN channel`, NS);
            await this.adapter.restoreChannelInterPAN();
            this.lock(false);
        }
        return true;
    }
    async factoryResetFirst() {
        this.lock(true);
        let done = false;
        try {
            for (const channel of scanChannels) {
                logger_1.logger.info(`Set InterPAN channel to '${channel}'`, NS);
                await this.adapter.setChannelInterPAN(channel);
                try {
                    const transaction = this.transactionNumber();
                    const response = await this.adapter.sendZclFrameInterPANBroadcast(this.createScanRequestFrame(transaction), 500);
                    logger_1.logger.debug(`Got scan response on channel '${channel}'`, NS);
                    (0, utils_1.AssertString)(response.address);
                    // Device answered (if not it will fall in the catch below),
                    // identify it (this will make e.g. the bulb flash)
                    logger_1.logger.debug(`Identifying`, NS);
                    await this.adapter.sendZclFrameInterPANToIeeeAddr(this.createIdentifyRequestFrame(transaction), response.address);
                    await (0, utils_1.Wait)(2000);
                    logger_1.logger.debug(`Reset to factory new`, NS);
                    await this.adapter.sendZclFrameInterPANToIeeeAddr(this.createResetFactoryNewRequestFrame(transaction), response.address);
                    done = true;
                }
                catch (error) {
                    logger_1.logger.warning(`Scan request failed or was not answered: '${error}'`, NS);
                }
                if (done)
                    break;
            }
        }
        finally {
            logger_1.logger.info(`Restore InterPAN channel`, NS);
            await this.adapter.restoreChannelInterPAN();
            this.lock(false);
        }
        return done;
    }
    createScanRequestFrame(transaction) {
        return Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, Zcl.Direction.CLIENT_TO_SERVER, true, null, 0, 'scanRequest', Zcl.Clusters.touchlink.ID, { transactionID: transaction, zigbeeInformation: 4, touchlinkInformation: 18 }, {});
    }
    createIdentifyRequestFrame(transaction) {
        return Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, Zcl.Direction.CLIENT_TO_SERVER, true, null, 0, 'identifyRequest', Zcl.Clusters.touchlink.ID, { transactionID: transaction, duration: 65535 }, {});
    }
    createResetFactoryNewRequestFrame(transaction) {
        return Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, Zcl.Direction.CLIENT_TO_SERVER, true, null, 0, 'resetToFactoryNew', Zcl.Clusters.touchlink.ID, { transactionID: transaction }, {});
    }
}
exports.default = Touchlink;
//# sourceMappingURL=touchlink.js.map