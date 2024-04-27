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
const Zcl = __importStar(require("../zcl"));
const crypto_1 = __importDefault(require("crypto"));
const zclTransactionSequenceNumber_1 = __importDefault(require("./helpers/zclTransactionSequenceNumber"));
const events_1 = __importDefault(require("events"));
const tstype_1 = require("./tstype");
const logger_1 = require("../utils/logger");
const zcl_1 = require("../zcl");
const NS = 'zh:controller:greenpower';
const zigBeeLinkKey = Buffer.from([
    0x5A, 0x69, 0x67, 0x42, 0x65, 0x65, 0x41, 0x6C, 0x6C, 0x69, 0x61, 0x6E, 0x63, 0x65, 0x30, 0x39
]);
class GreenPower extends events_1.default.EventEmitter {
    adapter;
    constructor(adapter) {
        super();
        this.adapter = adapter;
    }
    encryptSecurityKey(sourceID, securityKey) {
        const sourceIDInBytes = Buffer.from([
            (sourceID & 0x000000ff),
            (sourceID & 0x0000ff00) >> 8,
            (sourceID & 0x00ff0000) >> 16,
            (sourceID & 0xff000000) >> 24
        ]);
        const nonce = Buffer.alloc(13);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                nonce[4 * i + j] = sourceIDInBytes[j];
            }
        }
        nonce[12] = 0x05;
        const cipher = crypto_1.default.createCipheriv('aes-128-ccm', zigBeeLinkKey, nonce, { authTagLength: 16 });
        const encrypted = cipher.update(securityKey);
        return Buffer.concat([encrypted, cipher.final()]);
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    async sendPairingCommand(payload, dataPayload, frame) {
        logger_1.logger.debug(`Payload.Options: ${payload.options} wasBroadcast: ${dataPayload.wasBroadcast}`, NS);
        // Set sink address based on communication mode
        switch ((payload.options >> 5) & 3) {
            case 0b10: // Groupcast to pre-commissioned GroupID
            case 0b01: // Groupcast to DGroupID
                payload.sinkGroupID = this.adapter.greenPowerGroup;
                break;
            /* istanbul ignore next */
            case 0b00: // Full unicast forwarding
            case 0b11: // Lightweight unicast forwarding
                const coordinator = await this.adapter.getCoordinator();
                payload.sinkIEEEAddr = coordinator.ieeeAddr;
                payload.sinkNwkAddr = coordinator.networkAddress;
                break;
            /* istanbul ignore next */
            default:
                logger_1.logger.error(`Unhandled applicationID: ${(payload.options & 7)}`, NS);
                return;
        }
        const replyFrame = Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, Zcl.Direction.SERVER_TO_CLIENT, true, null, zclTransactionSequenceNumber_1.default.next(), 'pairing', zcl_1.Clusters.greenPower.ID, payload, {});
        // Not sure how correct this is - according to GP spec Pairing command is
        // to be sent as broadcast unless communication mode is 0b11 - in which case
        // the proxy MAY send it as unicast to selected proxy.
        // This attempts to mirror logic from commit 92f77cc5.
        if (dataPayload.wasBroadcast) {
            return this.adapter.sendZclFrameToAll(242, replyFrame, 242);
        }
        else {
            return this.adapter.sendZclFrameToEndpoint(null, frame.payload.gppNwkAddr, 242, replyFrame, 10000, false, false, 242);
        }
    }
    async onZclGreenPowerData(dataPayload, frame) {
        try {
            switch (frame.payload.commandID) {
                /* istanbul ignore next */
                case undefined:
                    logger_1.logger.error(`Received undefined command from '${dataPayload.address}'`, NS);
                    break;
                case 0xE0: // GP Commissioning
                    logger_1.logger.info(`Received commissioning from '${dataPayload.address}'`, NS);
                    /* istanbul ignore if */
                    if (typeof dataPayload.address !== 'number') {
                        logger_1.logger.error(`Commissioning request with string type address unsupported for '${dataPayload.address}'`, NS);
                        break;
                    }
                    const rxOnCap = frame.payload.commandFrame.options & 0b10;
                    const key = this.encryptSecurityKey(frame.payload.srcID, frame.payload.commandFrame.securityKey);
                    // RX capable GPD needs GP Commissioning Reply
                    if (rxOnCap) {
                        logger_1.logger.debug("RxOnCap set -> supports bidirectional communication", NS);
                        // NOTE: currently encryption is disabled for RX capable GPDs
                        const networkParameters = await this.adapter.getNetworkParameters();
                        // Commissioning reply
                        const payloadReply = {
                            options: 0,
                            tempMaster: frame.payload.gppNwkAddr,
                            tempMasterTx: networkParameters.channel - 11,
                            srcID: frame.payload.srcID,
                            gpdCmd: 0xf0,
                            gpdPayload: {
                                commandID: 0xf0,
                                options: 0b00000000, // Disable encryption
                                // securityKey: [...frame.payload.commandFrame.securityKey],
                                // keyMic: frame.payload.commandFrame.keyMic,
                            }
                        };
                        const replyFrame = Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, Zcl.Direction.SERVER_TO_CLIENT, true, null, zclTransactionSequenceNumber_1.default.next(), 'response', zcl_1.Clusters.greenPower.ID, payloadReply, {});
                        await this.adapter.sendZclFrameToAll(242, replyFrame, 242);
                        const payloadPairing = {
                            options: 0b0000000110101000, // Disable encryption
                            srcID: frame.payload.srcID,
                            deviceID: frame.payload.commandFrame.deviceID,
                        };
                        await this.sendPairingCommand(payloadPairing, dataPayload, frame);
                    }
                    else {
                        // Communication mode:
                        //  Broadcast: Groupcast to precommissioned ID (0b10)
                        // !Broadcast: Lightweight unicast (0b11)
                        let opt = 0b1110010101101000;
                        if (dataPayload.wasBroadcast) {
                            opt = 0b1110010101001000;
                        }
                        const payload = {
                            options: opt,
                            srcID: frame.payload.srcID,
                            deviceID: frame.payload.commandFrame.deviceID,
                            frameCounter: frame.payload.commandFrame.outgoingCounter,
                            gpdKey: [...key],
                        };
                        await this.sendPairingCommand(payload, dataPayload, frame);
                    }
                    const eventData = {
                        sourceID: frame.payload.srcID,
                        deviceID: frame.payload.commandFrame.deviceID,
                        networkAddress: frame.payload.srcID & 0xFFFF,
                    };
                    this.emit(tstype_1.GreenPowerEvents.deviceJoined, eventData);
                    break;
                /* istanbul ignore next */
                case 0xE2: // GP Success
                    logger_1.logger.debug(`Received success from '${dataPayload.address}'`, NS);
                    break;
                case 0xE3: // GP Channel Request
                    logger_1.logger.debug(`Received channel request from '${dataPayload.address}'`, NS);
                    const networkParameters = await this.adapter.getNetworkParameters();
                    // Channel notification
                    const payload = {
                        options: 0,
                        tempMaster: frame.payload.gppNwkAddr,
                        tempMasterTx: frame.payload.commandFrame.nextChannel,
                        srcID: frame.payload.srcID,
                        gpdCmd: 0xf3,
                        gpdPayload: {
                            commandID: 0xf3,
                            options: networkParameters.channel - 11,
                        }
                    };
                    const replyFrame = Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, Zcl.Direction.SERVER_TO_CLIENT, true, null, zclTransactionSequenceNumber_1.default.next(), 'response', zcl_1.Clusters.greenPower.ID, payload, {});
                    await this.adapter.sendZclFrameToAll(242, replyFrame, 242);
                    break;
                /* istanbul ignore next */
                case 0xA1: // GP Manufacturer-specific Attribute Reporting
                    break;
                default:
                    // NOTE: this is spammy because it logs everything that is handed back to Controller without special processing here
                    logger_1.logger.debug(`Received unhandled command '0x${frame.payload.commandID.toString(16)}' from '${dataPayload.address}'`, NS);
            }
        }
        catch (error) {
            /* istanbul ignore next */
            logger_1.logger.error(error, NS);
        }
    }
    async permitJoin(time, networkAddress) {
        const payload = {
            options: time ? (networkAddress === null ? 0x0b : 0x2b) : 0x0a,
            commisioningWindow: time,
        };
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, Zcl.Direction.SERVER_TO_CLIENT, true, null, zclTransactionSequenceNumber_1.default.next(), 'commisioningMode', zcl_1.Clusters.greenPower.ID, payload, {});
        if (networkAddress === null) {
            await this.adapter.sendZclFrameToAll(242, frame, 242);
        }
        else {
            await this.adapter.sendZclFrameToEndpoint(null, networkAddress, 242, frame, 10000, false, false, 242);
        }
    }
}
exports.default = GreenPower;
//# sourceMappingURL=greenPower.js.map