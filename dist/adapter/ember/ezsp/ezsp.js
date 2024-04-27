"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ezsp = exports.EzspEvents = void 0;
/* istanbul ignore file */
const events_1 = __importDefault(require("events"));
const cluster_1 = __importDefault(require("../../../zcl/definition/cluster"));
const math_1 = require("../utils/math");
const enums_1 = require("../enums");
const zdo_1 = require("../zdo");
const consts_1 = require("./consts");
const enums_2 = require("./enums");
const ash_1 = require("../uart/ash");
const buffalo_1 = require("./buffalo");
const consts_2 = require("../consts");
const endpoints_1 = require("../adapter/endpoints");
const logger_1 = require("../../../utils/logger");
const NS = 'zh:ember:ezsp';
/** no multi-network atm, so just use const */
const DEFAULT_NETWORK_INDEX = endpoints_1.FIXED_ENDPOINTS[0].networkIndex;
/** other values not supported atm */
const DEFAULT_SLEEP_MODE = enums_2.EzspSleepMode.IDLE;
/** Maximum number of times we attempt to reset the NCP and start the ASH protocol. */
const MAX_INIT_ATTEMPTS = 5;
/**
 * This is the max hops that the network can support - used to determine the max source route overhead
 * and broadcast radius if we havent defined MAX_HOPS then define based on profile ID
 */
// #ifdef HAS_SECURITY_PROFILE_SE
// export const ZA_MAX_HOPS = 6;
// #else
const ZA_MAX_HOPS = 12;
// #endif
/**
 * The mask applied to generated message tags used by the framework when sending messages via EZSP.
 * Customers who call ezspSend functions directly must use message tags outside this mask.
 */
const MESSAGE_TAG_MASK = 0x7F;
/* eslint-disable max-len */
var EzspEvents;
(function (EzspEvents) {
    //-- App logic
    EzspEvents["ncpNeedsResetAndInit"] = "ncpNeedsResetAndInit";
    //-- ezspIncomingMessageHandler
    /** params => status: EmberZdoStatus, sender: EmberNodeId, apsFrame: EmberApsFrame, payload: { cluster-dependent @see zdo.ts } */
    EzspEvents["ZDO_RESPONSE"] = "ZDO_RESPONSE";
    /** params => type: EmberIncomingMessageType, apsFrame: EmberApsFrame, lastHopLqi: number, sender: EmberNodeId, messageContents: Buffer */
    EzspEvents["INCOMING_MESSAGE"] = "INCOMING_MESSAGE";
    /** params => sourcePanId: EmberPanId, sourceAddress: EmberEUI64, groupId: number | null, lastHopLqi: number, messageContents: Buffer */
    EzspEvents["TOUCHLINK_MESSAGE"] = "TOUCHLINK_MESSAGE";
    /** params => sender: EmberNodeId, apsFrame: EmberApsFrame, payload: EndDeviceAnnouncePayload */
    EzspEvents["END_DEVICE_ANNOUNCE"] = "END_DEVICE_ANNOUNCE";
    //-- ezspStackStatusHandler
    /** params => status: EmberStatus */
    EzspEvents["STACK_STATUS"] = "STACK_STATUS";
    //-- ezspTrustCenterJoinHandler
    /** params => newNodeId: EmberNodeId, newNodeEui64: EmberEUI64, status: EmberDeviceUpdate, policyDecision: EmberJoinDecision, parentOfNewNodeId: EmberNodeId */
    EzspEvents["TRUST_CENTER_JOIN"] = "TRUST_CENTER_JOIN";
    //-- ezspMessageSentHandler
    /** params => type: EmberOutgoingMessageType, indexOrDestination: number, apsFrame: EmberApsFrame, messageTag: number */
    // MESSAGE_SENT_SUCCESS = 'MESSAGE_SENT_SUCCESS',
    /** params => type: EmberOutgoingMessageType, indexOrDestination: number, apsFrame: EmberApsFrame, messageTag: number */
    EzspEvents["MESSAGE_SENT_DELIVERY_FAILED"] = "MESSAGE_SENT_DELIVERY_FAILED";
    //-- ezspGpepIncomingMessageHandler
    /** params => sequenceNumber: number, commandIdentifier: number, sourceId: number, frameCounter: number, gpdCommandId: number, gpdCommandPayload: Buffer, gpdLink: number */
    EzspEvents["GREENPOWER_MESSAGE"] = "GREENPOWER_MESSAGE";
})(EzspEvents || (exports.EzspEvents = EzspEvents = {}));
/* eslint-enable max-len */
/**
 * Host EZSP layer.
 *
 * Provides functions that allow the Host application to send every EZSP command to the NCP.
 *
 * Commands to send to the serial>ASH layers all are named `ezsp${CommandName}`.
 * They do nothing but build the command, send it and return the value(s).
 * Callers are expected to handle errors appropriately.
 *   - They will throw `EzspStatus` if `sendCommand` fails or the returned value(s) by NCP are invalid (wrong length, etc).
 *   - Most will return `EmberStatus` given by NCP (some `EzspStatus`, some `SLStatus`...).
 *
 * @event 'ncpNeedsResetAndInit(EzspStatus)' An error was detected that requires resetting the NCP.
 */
class Ezsp extends events_1.default {
    tickInterval;
    ash;
    buffalo;
    /** The contents of the current EZSP frame. CAREFUL using this guy, it's pre-allocated. */
    frameContents;
    /** The total Length of the incoming frame */
    frameLength;
    initialVersionSent;
    /** True if a command is in the process of being sent. */
    sendingCommand;
    /** EZSP frame sequence number. Used in EZSP_SEQUENCE_INDEX byte. */
    frameSequence;
    /** Sequence used for EZSP send() tagging. static uint8_t */
    sendSequence;
    /** If if a command is currently waiting for a response. Used to manage async CBs vs command responses */
    waitingForResponse;
    /** Awaiting response resolve/timer struct. If waitingForResponse is not true, this should not be used. */
    responseWaiter;
    /** Counter for Queue Full errors */
    counterErrQueueFull;
    /** Handle used to tick for possible received callbacks */
    tickHandle;
    constructor(tickInterval, options) {
        super();
        this.tickInterval = tickInterval || 5;
        this.frameContents = Buffer.alloc(consts_1.EZSP_MAX_FRAME_LENGTH);
        this.buffalo = new buffalo_1.EzspBuffalo(this.frameContents);
        this.ash = new ash_1.UartAsh(options);
        this.ash.on(ash_1.AshEvents.fatalError, this.onAshFatalError.bind(this));
        this.ash.on(ash_1.AshEvents.frame, this.onAshFrame.bind(this));
    }
    /**
     * Returns the number of EZSP responses that have been received by the serial
     * protocol and are ready to be collected by the EZSP layer via
     * responseReceived().
     */
    get pendingResponseCount() {
        return this.ash.rxQueue.length;
    }
    /**
     * Create a string representation of the last frame in storage (sent or received).
     */
    get frameToString() {
        const id = this.buffalo.getFrameId();
        return `[FRAME: ID=${id}:"${enums_2.EzspFrameID[id]}" Seq=${this.frameContents[consts_1.EZSP_SEQUENCE_INDEX]} Len=${this.frameLength}]`;
    }
    initVariables() {
        if (this.waitingForResponse) {
            clearTimeout(this.responseWaiter.timer);
        }
        clearTimeout(this.tickHandle);
        this.frameContents.fill(0);
        this.frameLength = 0;
        this.buffalo.setPosition(0);
        this.initialVersionSent = false;
        this.sendingCommand = false;
        this.frameSequence = -1; // start at 0
        this.sendSequence = 0; // start at 1
        this.waitingForResponse = false;
        this.responseWaiter = null;
        this.counterErrQueueFull = 0;
        this.tickHandle = null;
    }
    async start() {
        logger_1.logger.info(`======== EZSP starting ========`, NS);
        this.initVariables();
        let status;
        for (let i = 0; i < MAX_INIT_ATTEMPTS; i++) {
            status = await this.ash.resetNcp();
            // fail early if we couldn't even get the port set up
            if (status !== enums_1.EzspStatus.SUCCESS) {
                return status;
            }
            status = await this.ash.start();
            if (status === enums_1.EzspStatus.SUCCESS) {
                logger_1.logger.info(`======== EZSP started ========`, NS);
                this.tick();
                return status;
            }
        }
        return status;
    }
    /**
     * Cleanly close down the serial protocol (UART).
     * After this function has been called, init() must be called to resume communication with the NCP.
     */
    async stop() {
        await this.ash.stop();
        this.initVariables();
        logger_1.logger.info(`======== EZSP stopped ========`, NS);
    }
    /**
     * Check if connected.
     * If not, attempt to restore the connection.
     *
     * @returns
     */
    checkConnection() {
        return this.ash.connected;
    }
    onAshFatalError(status) {
        this.emit(EzspEvents.ncpNeedsResetAndInit, status);
    }
    onAshFrame() {
        // let tick handle if not waiting for response (CBs)
        if (this.waitingForResponse) {
            const status = this.responseReceived();
            if (status !== enums_1.EzspStatus.NO_RX_DATA) {
                // we've got a non-CB frame, must be it!
                clearTimeout(this.responseWaiter.timer);
                this.responseWaiter.resolve(status);
            }
        }
    }
    /**
     * Event from the EZSP layer indicating that the transaction with the NCP could not be completed due to a
     * serial protocol error or that the response received from the NCP reported an error.
     * The status parameter provides more information about the error.
     *
     * @param status
     */
    ezspErrorHandler(status) {
        const lastFrameStr = `Last: ${this.frameToString}.`;
        if (status === enums_1.EzspStatus.ERROR_QUEUE_FULL) {
            this.counterErrQueueFull += 1;
            logger_1.logger.error(`NCP Queue full (counter: ${this.counterErrQueueFull}). ${lastFrameStr}`, NS);
        }
        else if (status === enums_1.EzspStatus.ERROR_OVERFLOW) {
            logger_1.logger.error(`The NCP has run out of buffers, causing general malfunction. Remediate network congestion, if present. ${lastFrameStr}`, NS);
        }
        else {
            logger_1.logger.error(`ERROR Transaction failure; status=${enums_1.EzspStatus[status]}. ${lastFrameStr}`, NS);
        }
        // Do not reset if this is a decryption failure, as we ignored the packet
        // Do not reset for a callback overflow or error queue, as we don't want the device to reboot under stress;
        // Resetting under these conditions does not solve the problem as the problem is external to the NCP.
        // Throttling the additional traffic and staggering things might make it better instead.
        // For all other errors, we reset the NCP
        if ((status !== enums_1.EzspStatus.ERROR_SECURITY_PARAMETERS_INVALID) && (status !== enums_1.EzspStatus.ERROR_OVERFLOW)
            && (status !== enums_1.EzspStatus.ERROR_QUEUE_FULL)) {
            this.emit(EzspEvents.ncpNeedsResetAndInit, status);
        }
    }
    /**
     * The Host application must call this function periodically to allow the EZSP layer to handle asynchronous events.
     */
    tick() {
        // don't process any callbacks while sending a command and waiting for its response
        // nothing in the rx queue, nothing to receive
        if (!this.sendingCommand && !this.ash.rxQueue.empty) {
            if (this.responseReceived() === enums_1.EzspStatus.SUCCESS) {
                this.callbackDispatch();
            }
        }
        this.tickHandle = setTimeout(this.tick.bind(this), this.tickInterval);
    }
    nextFrameSequence() {
        return (this.frameSequence = ((++this.frameSequence) & 0xFF));
    }
    startCommand(command) {
        if (this.sendingCommand) {
            logger_1.logger.error(`[SEND COMMAND] Cannot send second one before processing response from first one.`, NS);
            throw new Error(enums_1.EzspStatus[enums_1.EzspStatus.ERROR_INVALID_CALL]);
        }
        this.sendingCommand = true;
        // Send initial EZSP_VERSION command with old packet format for old Hosts/NCPs
        if (command === enums_2.EzspFrameID.VERSION && !this.initialVersionSent) {
            this.buffalo.setPosition(consts_1.EZSP_PARAMETERS_INDEX);
            this.buffalo.setCommandByte(consts_1.EZSP_FRAME_ID_INDEX, (0, math_1.lowByte)(command));
        }
        else {
            // convert to extended frame format
            this.buffalo.setPosition(consts_1.EZSP_EXTENDED_PARAMETERS_INDEX);
            this.buffalo.setCommandByte(consts_1.EZSP_EXTENDED_FRAME_ID_LB_INDEX, (0, math_1.lowByte)(command));
            this.buffalo.setCommandByte(consts_1.EZSP_EXTENDED_FRAME_ID_HB_INDEX, (0, math_1.highByte)(command));
        }
    }
    /**
     * Sends the current EZSP command frame. Returns EZSP_SUCCESS if the command was sent successfully.
     * Any other return value means that an error has been detected by the serial protocol layer.
     *
     * if ezsp.sendCommand fails early, this will be:
     *   - EzspStatus.ERROR_INVALID_CALL
     *   - EzspStatus.NOT_CONNECTED
     *   - EzspStatus.ERROR_COMMAND_TOO_LONG
     *
     * if ezsp.sendCommand fails, this will be whatever ash.send returns:
     *   - EzspStatus.SUCCESS
     *   - EzspStatus.NO_TX_SPACE
     *   - EzspStatus.DATA_FRAME_TOO_SHORT
     *   - EzspStatus.DATA_FRAME_TOO_LONG
     *   - EzspStatus.NOT_CONNECTED
     *
     * if ezsp.sendCommand times out, this will be EzspStatus.ASH_ACK_TIMEOUT (XXX: for now)
     *
     * if ezsp.sendCommand resolves, this will be whatever ezsp.responseReceived returns:
     *   - EzspStatus.NO_RX_DATA (should not happen if command was sent (since we subscribe to frame event to trigger function))
     *   - status from EzspFrameID.INVALID_COMMAND status byte
     *   - EzspStatus.ERROR_UNSUPPORTED_CONTROL
     *   - EzspStatus.ERROR_WRONG_DIRECTION
     *   - EzspStatus.ERROR_TRUNCATED
     *   - EzspStatus.SUCCESS
     */
    async sendCommand() {
        if (!this.checkConnection()) {
            logger_1.logger.debug(`[SEND COMMAND] NOT CONNECTED`, NS);
            return enums_1.EzspStatus.NOT_CONNECTED;
        }
        this.buffalo.setCommandByte(consts_1.EZSP_SEQUENCE_INDEX, this.nextFrameSequence());
        // we always set the network index in the ezsp frame control.
        this.buffalo.setCommandByte(consts_1.EZSP_EXTENDED_FRAME_CONTROL_LB_INDEX, (consts_1.EZSP_FRAME_CONTROL_COMMAND | (DEFAULT_SLEEP_MODE & consts_1.EZSP_FRAME_CONTROL_SLEEP_MODE_MASK)
            | ((DEFAULT_NETWORK_INDEX << consts_1.EZSP_FRAME_CONTROL_NETWORK_INDEX_OFFSET) & consts_1.EZSP_FRAME_CONTROL_NETWORK_INDEX_MASK)));
        // Send initial EZSP_VERSION command with old packet format for old Hosts/NCPs
        if (!this.initialVersionSent && (this.buffalo.getCommandByte(consts_1.EZSP_FRAME_ID_INDEX) === enums_2.EzspFrameID.VERSION)) {
            this.initialVersionSent = true;
        }
        else {
            this.buffalo.setCommandByte(consts_1.EZSP_EXTENDED_FRAME_CONTROL_HB_INDEX, consts_1.EZSP_EXTENDED_FRAME_FORMAT_VERSION);
        }
        // might have tried to write more than allocated EZSP_MAX_FRAME_LENGTH for frameContents
        // use write index to detect broken frames cases (inc'ed every time a byte is supposed to have been written)
        // since index is always inc'ed on setCommandByte, this should always end at 202 max
        const length = this.buffalo.getPosition();
        if (length > consts_1.EZSP_MAX_FRAME_LENGTH) {
            // this.ezspErrorHandler(EzspStatus.ERROR_COMMAND_TOO_LONG);// XXX: this forces a NCP reset??
            return enums_1.EzspStatus.ERROR_COMMAND_TOO_LONG;
        }
        this.frameLength = length;
        let status;
        logger_1.logger.debug(`===> ${this.frameToString}`, NS);
        try {
            status = await (new Promise((resolve, reject) => {
                const sendStatus = (this.ash.send(this.frameLength, this.frameContents));
                if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
                    reject(new Error(enums_1.EzspStatus[sendStatus]));
                }
                const error = new Error();
                Error.captureStackTrace(error);
                this.waitingForResponse = true;
                this.responseWaiter = {
                    timer: setTimeout(() => {
                        this.waitingForResponse = false;
                        error.message = `timed out after ${this.ash.responseTimeout}ms`;
                        reject(error);
                    }, this.ash.responseTimeout),
                    resolve,
                };
            }));
            if (status !== enums_1.EzspStatus.SUCCESS) {
                throw new Error(enums_1.EzspStatus[status]);
            }
        }
        catch (err) {
            logger_1.logger.debug(`=x=> ${this.frameToString} Error: ${err}`, NS);
            this.ezspErrorHandler(status);
        }
        this.sendingCommand = false;
        return status;
    }
    /**
     * Checks whether a new EZSP response frame has been received.
     * If any, the response payload is stored in frameContents/frameLength.
     * Any other return value means that an error has been detected by the serial protocol layer.
     * @returns NO_RX_DATA if no new response has been received.
     * @returns SUCCESS if a new response has been received.
     */
    checkResponseReceived() {
        // trigger housekeeping in ASH layer
        this.ash.sendExec();
        let status = enums_1.EzspStatus.NO_RX_DATA;
        let dropBuffer = null;
        let buffer = this.ash.rxQueue.getPrecedingEntry(null);
        while (buffer != null) {
            // While we are waiting for a response to a command, we use the asynch callback flag to ignore asynchronous callbacks.
            // This allows our caller to assume that no callbacks will appear between sending a command and receiving its response.
            if (this.waitingForResponse && (buffer.data[consts_1.EZSP_FRAME_CONTROL_INDEX] & consts_1.EZSP_FRAME_CONTROL_ASYNCH_CB)) {
                logger_1.logger.debug(`Skipping async callback while waiting for response to command.`, NS);
                if (this.ash.rxFree.length === 0) {
                    dropBuffer = buffer;
                }
                buffer = this.ash.rxQueue.getPrecedingEntry(buffer);
            }
            else {
                this.ash.rxQueue.removeEntry(buffer);
                buffer.data.copy(this.frameContents, 0, 0, buffer.len); // take only what len tells us is actual content
                this.frameLength = buffer.len;
                logger_1.logger.debug(`<=== ${this.frameToString}`, NS);
                this.ash.rxFree.freeBuffer(buffer);
                buffer = null;
                status = enums_1.EzspStatus.SUCCESS;
                this.waitingForResponse = false;
            }
        }
        if (dropBuffer != null) {
            this.ash.rxQueue.removeEntry(dropBuffer);
            this.ash.rxFree.freeBuffer(dropBuffer);
            logger_1.logger.debug(`ERROR Host receive queue full. Dropping received callback: ${dropBuffer.data.toString('hex')}`, NS);
            this.ezspErrorHandler(enums_1.EzspStatus.ERROR_QUEUE_FULL);
        }
        return status;
    }
    /**
     * Check if a response was received and sets the stage for parsing if valid (indexes buffalo to params index).
     * @returns
     */
    responseReceived() {
        let status;
        status = this.checkResponseReceived();
        if (status === enums_1.EzspStatus.NO_RX_DATA) {
            return status;
        }
        let frameControl, frameId, parametersIndex;
        // eslint-disable-next-line prefer-const
        [status, frameControl, frameId, parametersIndex] = this.buffalo.getResponseMetadata();
        if (status === enums_1.EzspStatus.SUCCESS) {
            if (frameId === enums_2.EzspFrameID.INVALID_COMMAND) {
                status = this.buffalo.getResponseByte(parametersIndex);
            }
            if ((frameControl & consts_1.EZSP_FRAME_CONTROL_DIRECTION_MASK) !== consts_1.EZSP_FRAME_CONTROL_RESPONSE) {
                status = enums_1.EzspStatus.ERROR_WRONG_DIRECTION;
            }
            if ((frameControl & consts_1.EZSP_FRAME_CONTROL_TRUNCATED_MASK) === consts_1.EZSP_FRAME_CONTROL_TRUNCATED) {
                status = enums_1.EzspStatus.ERROR_TRUNCATED;
            }
            if ((frameControl & consts_1.EZSP_FRAME_CONTROL_OVERFLOW_MASK) === consts_1.EZSP_FRAME_CONTROL_OVERFLOW) {
                status = enums_1.EzspStatus.ERROR_OVERFLOW;
            }
            if ((frameControl & consts_1.EZSP_FRAME_CONTROL_PENDING_CB_MASK) === consts_1.EZSP_FRAME_CONTROL_PENDING_CB) {
                this.ash.ncpHasCallbacks = true;
            }
            else {
                this.ash.ncpHasCallbacks = false;
            }
            // Set the callback network
            //this.callbackNetworkIndex = (frameControl & EZSP_FRAME_CONTROL_NETWORK_INDEX_MASK) >> EZSP_FRAME_CONTROL_NETWORK_INDEX_OFFSET;
        }
        if (status !== enums_1.EzspStatus.SUCCESS) {
            logger_1.logger.debug(`[RESPONSE RECEIVED] ERROR ${enums_1.EzspStatus[status]}`, NS);
            this.ezspErrorHandler(status);
        }
        this.buffalo.setPosition(parametersIndex);
        // An overflow does not indicate a comms failure;
        // The system can still communicate but buffers are running critically low.
        // This is almost always due to network congestion and goes away when the network becomes quieter.
        if (status === enums_1.EzspStatus.ERROR_OVERFLOW) {
            return enums_1.EzspStatus.SUCCESS;
        }
        return status;
    }
    /**
     * Dispatches callback frames handlers.
     */
    callbackDispatch() {
        switch (this.buffalo.getExtFrameId()) {
            case enums_2.EzspFrameID.NO_CALLBACKS: {
                this.ezspNoCallbacks();
                break;
            }
            case enums_2.EzspFrameID.STACK_TOKEN_CHANGED_HANDLER: {
                const tokenAddress = this.buffalo.readUInt16();
                this.ezspStackTokenChangedHandler(tokenAddress);
                break;
            }
            case enums_2.EzspFrameID.TIMER_HANDLER: {
                const timerId = this.buffalo.readUInt8();
                this.ezspTimerHandler(timerId);
                break;
            }
            case enums_2.EzspFrameID.COUNTER_ROLLOVER_HANDLER: {
                const type = this.buffalo.readUInt8();
                this.ezspCounterRolloverHandler(type);
                break;
            }
            case enums_2.EzspFrameID.CUSTOM_FRAME_HANDLER: {
                const payloadLength = this.buffalo.readUInt8();
                const payload = this.buffalo.readListUInt8({ length: payloadLength });
                this.ezspCustomFrameHandler(payloadLength, payload);
                break;
            }
            case enums_2.EzspFrameID.STACK_STATUS_HANDLER: {
                const status = this.buffalo.readUInt8();
                this.ezspStackStatusHandler(status);
                break;
            }
            case enums_2.EzspFrameID.ENERGY_SCAN_RESULT_HANDLER: {
                const channel = this.buffalo.readUInt8();
                const maxRssiValue = this.buffalo.readUInt8();
                this.ezspEnergyScanResultHandler(channel, maxRssiValue);
                break;
            }
            case enums_2.EzspFrameID.NETWORK_FOUND_HANDLER: {
                const networkFound = this.buffalo.readEmberZigbeeNetwork();
                const lastHopLqi = this.buffalo.readUInt8();
                const lastHopRssi = this.buffalo.readUInt8();
                this.ezspNetworkFoundHandler(networkFound, lastHopLqi, lastHopRssi);
                break;
            }
            case enums_2.EzspFrameID.SCAN_COMPLETE_HANDLER: {
                const channel = this.buffalo.readUInt8();
                const status = this.buffalo.readUInt8();
                this.ezspScanCompleteHandler(channel, status);
                break;
            }
            case enums_2.EzspFrameID.UNUSED_PAN_ID_FOUND_HANDLER: {
                const panId = this.buffalo.readUInt16();
                const channel = this.buffalo.readUInt8();
                this.ezspUnusedPanIdFoundHandler(panId, channel);
                break;
            }
            case enums_2.EzspFrameID.CHILD_JOIN_HANDLER: {
                const index = this.buffalo.readUInt8();
                const joining = this.buffalo.readUInt8() === 1 ? true : false;
                const childId = this.buffalo.readUInt16();
                const childEui64 = this.buffalo.readIeeeAddr();
                const childType = this.buffalo.readUInt8();
                this.ezspChildJoinHandler(index, joining, childId, childEui64, childType);
                break;
            }
            case enums_2.EzspFrameID.DUTY_CYCLE_HANDLER: {
                const channelPage = this.buffalo.readUInt8();
                const channel = this.buffalo.readUInt8();
                const state = this.buffalo.readUInt8();
                const totalDevices = this.buffalo.readUInt8();
                const arrayOfDeviceDutyCycles = this.buffalo.readEmberPerDeviceDutyCycle();
                this.ezspDutyCycleHandler(channelPage, channel, state, totalDevices, arrayOfDeviceDutyCycles);
                break;
            }
            case enums_2.EzspFrameID.REMOTE_SET_BINDING_HANDLER: {
                const entry = this.buffalo.readEmberBindingTableEntry();
                const index = this.buffalo.readUInt8();
                const policyDecision = this.buffalo.readUInt8();
                this.ezspRemoteSetBindingHandler(entry, index, policyDecision);
                break;
            }
            case enums_2.EzspFrameID.REMOTE_DELETE_BINDING_HANDLER: {
                const index = this.buffalo.readUInt8();
                const policyDecision = this.buffalo.readUInt8();
                this.ezspRemoteDeleteBindingHandler(index, policyDecision);
                break;
            }
            case enums_2.EzspFrameID.MESSAGE_SENT_HANDLER: {
                const type = this.buffalo.readUInt8();
                const indexOrDestination = this.buffalo.readUInt16();
                const apsFrame = this.buffalo.readEmberApsFrame();
                const messageTag = this.buffalo.readUInt8();
                const status = this.buffalo.readUInt8();
                const messageContents = this.buffalo.readPayload();
                this.ezspMessageSentHandler(type, indexOrDestination, apsFrame, messageTag, status, messageContents);
                break;
            }
            case enums_2.EzspFrameID.POLL_COMPLETE_HANDLER: {
                const status = this.buffalo.readUInt8();
                this.ezspPollCompleteHandler(status);
                break;
            }
            case enums_2.EzspFrameID.POLL_HANDLER: {
                const childId = this.buffalo.readUInt16();
                const transmitExpected = this.buffalo.readUInt8() === 1 ? true : false;
                this.ezspPollHandler(childId, transmitExpected);
                break;
            }
            case enums_2.EzspFrameID.INCOMING_SENDER_EUI64_HANDLER: {
                const senderEui64 = this.buffalo.readIeeeAddr();
                this.ezspIncomingSenderEui64Handler(senderEui64);
                break;
            }
            case enums_2.EzspFrameID.INCOMING_MESSAGE_HANDLER: {
                const type = this.buffalo.readUInt8();
                const apsFrame = this.buffalo.readEmberApsFrame();
                const lastHopLqi = this.buffalo.readUInt8();
                const lastHopRssi = this.buffalo.readUInt8();
                const sender = this.buffalo.readUInt16();
                const bindingIndex = this.buffalo.readUInt8();
                const addressIndex = this.buffalo.readUInt8();
                const messageContents = this.buffalo.readPayload();
                this.ezspIncomingMessageHandler(type, apsFrame, lastHopLqi, lastHopRssi, sender, bindingIndex, addressIndex, messageContents);
                break;
            }
            case enums_2.EzspFrameID.INCOMING_MANY_TO_ONE_ROUTE_REQUEST_HANDLER: {
                const source = this.buffalo.readUInt16();
                const longId = this.buffalo.readIeeeAddr();
                const cost = this.buffalo.readUInt8();
                this.ezspIncomingManyToOneRouteRequestHandler(source, longId, cost);
                break;
            }
            case enums_2.EzspFrameID.INCOMING_ROUTE_ERROR_HANDLER: {
                const status = this.buffalo.readUInt8();
                const target = this.buffalo.readUInt16();
                this.ezspIncomingRouteErrorHandler(status, target);
                break;
            }
            case enums_2.EzspFrameID.INCOMING_NETWORK_STATUS_HANDLER: {
                const errorCode = this.buffalo.readUInt8();
                const target = this.buffalo.readUInt16();
                this.ezspIncomingNetworkStatusHandler(errorCode, target);
                break;
            }
            case enums_2.EzspFrameID.INCOMING_ROUTE_RECORD_HANDLER: {
                const source = this.buffalo.readUInt16();
                const sourceEui = this.buffalo.readIeeeAddr();
                const lastHopLqi = this.buffalo.readUInt8();
                const lastHopRssi = this.buffalo.readUInt8();
                const relayCount = this.buffalo.readUInt8();
                const relayList = this.buffalo.readListUInt16({ length: relayCount }); //this.buffalo.readListUInt8({length: (relayCount * 2)});
                this.ezspIncomingRouteRecordHandler(source, sourceEui, lastHopLqi, lastHopRssi, relayCount, relayList);
                break;
            }
            case enums_2.EzspFrameID.ID_CONFLICT_HANDLER: {
                const id = this.buffalo.readUInt16();
                this.ezspIdConflictHandler(id);
                break;
            }
            case enums_2.EzspFrameID.MAC_PASSTHROUGH_MESSAGE_HANDLER: {
                const messageType = this.buffalo.readUInt8();
                const lastHopLqi = this.buffalo.readUInt8();
                const lastHopRssi = this.buffalo.readUInt8();
                const messageContents = this.buffalo.readPayload();
                this.ezspMacPassthroughMessageHandler(messageType, lastHopLqi, lastHopRssi, messageContents);
                break;
            }
            case enums_2.EzspFrameID.MAC_FILTER_MATCH_MESSAGE_HANDLER: {
                const filterIndexMatch = this.buffalo.readUInt8();
                const legacyPassthroughType = this.buffalo.readUInt8();
                const lastHopLqi = this.buffalo.readUInt8();
                const lastHopRssi = this.buffalo.readUInt8();
                const messageContents = this.buffalo.readPayload();
                this.ezspMacFilterMatchMessageHandler(filterIndexMatch, legacyPassthroughType, lastHopLqi, lastHopRssi, messageContents);
                break;
            }
            case enums_2.EzspFrameID.RAW_TRANSMIT_COMPLETE_HANDLER: {
                const status = this.buffalo.readUInt8();
                this.ezspRawTransmitCompleteHandler(status);
                break;
            }
            case enums_2.EzspFrameID.SWITCH_NETWORK_KEY_HANDLER: {
                const sequenceNumber = this.buffalo.readUInt8();
                this.ezspSwitchNetworkKeyHandler(sequenceNumber);
                break;
            }
            case enums_2.EzspFrameID.ZIGBEE_KEY_ESTABLISHMENT_HANDLER: {
                const partner = this.buffalo.readIeeeAddr();
                const status = this.buffalo.readUInt8();
                this.ezspZigbeeKeyEstablishmentHandler(partner, status);
                break;
            }
            case enums_2.EzspFrameID.TRUST_CENTER_JOIN_HANDLER: {
                const newNodeId = this.buffalo.readUInt16();
                const newNodeEui64 = this.buffalo.readIeeeAddr();
                const status = this.buffalo.readUInt8();
                const policyDecision = this.buffalo.readUInt8();
                const parentOfNewNodeId = this.buffalo.readUInt16();
                this.ezspTrustCenterJoinHandler(newNodeId, newNodeEui64, status, policyDecision, parentOfNewNodeId);
                break;
            }
            case enums_2.EzspFrameID.GENERATE_CBKE_KEYS_HANDLER: {
                const status = this.buffalo.readUInt8();
                const ephemeralPublicKey = this.buffalo.readEmberPublicKeyData();
                this.ezspGenerateCbkeKeysHandler(status, ephemeralPublicKey);
                break;
            }
            case enums_2.EzspFrameID.CALCULATE_SMACS_HANDLER: {
                const status = this.buffalo.readUInt8();
                const initiatorSmac = this.buffalo.readEmberSmacData();
                const responderSmac = this.buffalo.readEmberSmacData();
                this.ezspCalculateSmacsHandler(status, initiatorSmac, responderSmac);
                break;
            }
            case enums_2.EzspFrameID.GENERATE_CBKE_KEYS_HANDLER283K1: {
                const status = this.buffalo.readUInt8();
                const ephemeralPublicKey = this.buffalo.readEmberPublicKey283k1Data();
                this.ezspGenerateCbkeKeysHandler283k1(status, ephemeralPublicKey);
                break;
            }
            case enums_2.EzspFrameID.CALCULATE_SMACS_HANDLER283K1: {
                const status = this.buffalo.readUInt8();
                const initiatorSmac = this.buffalo.readEmberSmacData();
                const responderSmac = this.buffalo.readEmberSmacData();
                this.ezspCalculateSmacsHandler283k1(status, initiatorSmac, responderSmac);
                break;
            }
            case enums_2.EzspFrameID.DSA_SIGN_HANDLER: {
                const status = this.buffalo.readUInt8();
                const messageContents = this.buffalo.readPayload();
                this.ezspDsaSignHandler(status, messageContents);
                break;
            }
            case enums_2.EzspFrameID.DSA_VERIFY_HANDLER: {
                const status = this.buffalo.readUInt8();
                this.ezspDsaVerifyHandler(status);
                break;
            }
            case enums_2.EzspFrameID.MFGLIB_RX_HANDLER: {
                const linkQuality = this.buffalo.readUInt8();
                const rssi = this.buffalo.readUInt8();
                const packetLength = this.buffalo.readUInt8();
                const packetContents = this.buffalo.readListUInt8({ length: packetLength });
                this.ezspMfglibRxHandler(linkQuality, rssi, packetLength, packetContents);
                break;
            }
            case enums_2.EzspFrameID.INCOMING_BOOTLOAD_MESSAGE_HANDLER: {
                const longId = this.buffalo.readIeeeAddr();
                const lastHopLqi = this.buffalo.readUInt8();
                const lastHopRssi = this.buffalo.readUInt8();
                const messageContents = this.buffalo.readPayload();
                this.ezspIncomingBootloadMessageHandler(longId, lastHopLqi, lastHopRssi, messageContents);
                break;
            }
            case enums_2.EzspFrameID.BOOTLOAD_TRANSMIT_COMPLETE_HANDLER: {
                const status = this.buffalo.readUInt8();
                const messageContents = this.buffalo.readPayload();
                this.ezspBootloadTransmitCompleteHandler(status, messageContents);
                break;
            }
            case enums_2.EzspFrameID.ZLL_NETWORK_FOUND_HANDLER: {
                const networkInfo = this.buffalo.readEmberZllNetwork();
                const isDeviceInfoNull = this.buffalo.readUInt8() === 1 ? true : false;
                const deviceInfo = this.buffalo.readEmberZllDeviceInfoRecord();
                const lastHopLqi = this.buffalo.readUInt8();
                const lastHopRssi = this.buffalo.readUInt8();
                this.ezspZllNetworkFoundHandler(networkInfo, isDeviceInfoNull, deviceInfo, lastHopLqi, lastHopRssi);
                break;
            }
            case enums_2.EzspFrameID.ZLL_SCAN_COMPLETE_HANDLER: {
                const status = this.buffalo.readUInt8();
                this.ezspZllScanCompleteHandler(status);
                break;
            }
            case enums_2.EzspFrameID.ZLL_ADDRESS_ASSIGNMENT_HANDLER: {
                const addressInfo = this.buffalo.readEmberZllAddressAssignment();
                const lastHopLqi = this.buffalo.readUInt8();
                const lastHopRssi = this.buffalo.readUInt8();
                this.ezspZllAddressAssignmentHandler(addressInfo, lastHopLqi, lastHopRssi);
                break;
            }
            case enums_2.EzspFrameID.ZLL_TOUCH_LINK_TARGET_HANDLER: {
                const networkInfo = this.buffalo.readEmberZllNetwork();
                this.ezspZllTouchLinkTargetHandler(networkInfo);
                break;
            }
            case enums_2.EzspFrameID.D_GP_SENT_HANDLER: {
                const status = this.buffalo.readUInt8();
                const gpepHandle = this.buffalo.readUInt8();
                this.ezspDGpSentHandler(status, gpepHandle);
                break;
            }
            case enums_2.EzspFrameID.GPEP_INCOMING_MESSAGE_HANDLER: {
                const status = this.buffalo.readUInt8();
                const gpdLink = this.buffalo.readUInt8();
                const sequenceNumber = this.buffalo.readUInt8();
                const addr = this.buffalo.readEmberGpAddress();
                const gpdfSecurityLevel = this.buffalo.readUInt8();
                const gpdfSecurityKeyType = this.buffalo.readUInt8();
                const autoCommissioning = this.buffalo.readUInt8() === 1 ? true : false;
                const bidirectionalInfo = this.buffalo.readUInt8();
                const gpdSecurityFrameCounter = this.buffalo.readUInt32();
                const gpdCommandId = this.buffalo.readUInt8();
                const mic = this.buffalo.readUInt32();
                const proxyTableIndex = this.buffalo.readUInt8();
                const gpdCommandPayload = this.buffalo.readPayload();
                this.ezspGpepIncomingMessageHandler(status, gpdLink, sequenceNumber, addr, gpdfSecurityLevel, gpdfSecurityKeyType, autoCommissioning, bidirectionalInfo, gpdSecurityFrameCounter, gpdCommandId, mic, proxyTableIndex, gpdCommandPayload);
                break;
            }
            default:
                this.ezspErrorHandler(enums_1.EzspStatus.ERROR_INVALID_FRAME_ID);
        }
    }
    /**
     *
     * @returns uint8_t
     */
    nextSendSequence() {
        return (this.sendSequence = ((++this.sendSequence) & MESSAGE_TAG_MASK));
    }
    /**
     * Calls ezspSend${x} based on type and takes care of tagging message.
     *
     * Alias types expect `alias` & `sequence` params, along with `apsFrame.radius`.
     *
     * @param type Specifies the outgoing message type.
     * @param indexOrDestination uint16_t Depending on the type of addressing used, this is either the EmberNodeId of the destination,
     *     an index into the address table, or an index into the binding table.
     *     Unused for multicast types.
     *     This must be one of the three ZigBee broadcast addresses for broadcast.
     * @param apsFrame [IN/OUT] EmberApsFrame * The APS frame which is to be added to the message.
     * @param message uint8_t * Content of the message.
     * @param alias The alias source address
     * @param sequence uint8_t The alias sequence number
     * @returns Result of the ezspSend${x} call or EmberStatus.BAD_ARGUMENT if type not supported.
     * @returns apsSequence as returned by ezspSend${x} command
     * @returns messageTag Tag used for ezspSend${x} command
     */
    async send(type, indexOrDestination, apsFrame, message, alias, sequence) {
        let status = enums_1.EmberStatus.BAD_ARGUMENT;
        let apsSequence;
        const messageTag = this.nextSendSequence();
        switch (type) {
            case enums_1.EmberOutgoingMessageType.VIA_BINDING:
            case enums_1.EmberOutgoingMessageType.VIA_ADDRESS_TABLE:
            case enums_1.EmberOutgoingMessageType.DIRECT: {
                [status, apsSequence] = (await this.ezspSendUnicast(type, indexOrDestination, apsFrame, messageTag, message));
                break;
            }
            case enums_1.EmberOutgoingMessageType.MULTICAST: {
                [status, apsSequence] = (await this.ezspSendMulticast(apsFrame, ZA_MAX_HOPS /* hops */, ZA_MAX_HOPS /* nonmember radius */, messageTag, message));
                break;
            }
            case enums_1.EmberOutgoingMessageType.MULTICAST_WITH_ALIAS: {
                [status, apsSequence] = (await this.ezspSendMulticastWithAlias(apsFrame, apsFrame.radius /*radius*/, apsFrame.radius /*nonmember radius*/, alias, sequence, messageTag, message));
                break;
            }
            case enums_1.EmberOutgoingMessageType.BROADCAST: {
                [status, apsSequence] = (await this.ezspSendBroadcast(indexOrDestination, apsFrame, ZA_MAX_HOPS /*radius*/, messageTag, message));
                break;
            }
            case enums_1.EmberOutgoingMessageType.BROADCAST_WITH_ALIAS: {
                [status, apsSequence] = (await this.ezspProxyBroadcast(alias, indexOrDestination, sequence, apsFrame, apsFrame.radius, messageTag, message));
                break;
            }
            default:
                break;
        }
        apsFrame.sequence = apsSequence;
        // NOTE: match `~~~>` from adapter since this is just a wrapper for it
        logger_1.logger.debug(`~~~> [SENT type=${enums_1.EmberOutgoingMessageType[type]} apsSequence=${apsSequence} messageTag=${messageTag} status=${enums_1.EmberStatus[status]}]`, NS);
        return [status, messageTag];
    }
    /**
     * Retrieving the new version info.
     * Wrapper for `ezspGetValue`.
     * @returns Send status
     * @returns EmberVersion*, null if status not SUCCESS.
     */
    async ezspGetVersionStruct() {
        const [status, outValueLength, outValue] = (await this.ezspGetValue(enums_2.EzspValueId.VERSION_INFO, 7)); // sizeof(EmberVersion)
        if (outValueLength !== 7) {
            throw enums_1.EzspStatus.ERROR_INVALID_VALUE;
        }
        return [status, {
                build: outValue[0] + ((outValue[1]) << 8),
                major: outValue[2],
                minor: outValue[3],
                patch: outValue[4],
                special: outValue[5],
                type: outValue[6],
            }];
    }
    /**
     * Function for manipulating the endpoints flags on the NCP.
     * Wrapper for `ezspGetExtendedValue`
     * @param endpoint uint8_t
     * @param flags EzspEndpointFlags
     * @returns EzspStatus
     */
    async ezspSetEndpointFlags(endpoint, flags) {
        return this.ezspSetValue(enums_2.EzspValueId.ENDPOINT_FLAGS, 3, [endpoint, (0, math_1.lowByte)(flags), (0, math_1.highByte)(flags)]);
    }
    /**
     * Function for manipulating the endpoints flags on the NCP.
     * Wrapper for `ezspGetExtendedValue`.
     * @param endpoint uint8_t
     * @returns EzspStatus
     * @returns flags
     */
    async ezspGetEndpointFlags(endpoint) {
        const [status, outValLen, outVal] = (await this.ezspGetExtendedValue(enums_2.EzspExtendedValueId.ENDPOINT_FLAGS, endpoint, 2));
        if (outValLen < 2) {
            throw enums_1.EzspStatus.ERROR_INVALID_VALUE;
        }
        const returnFlags = (0, math_1.highLowToInt)(outVal[1], outVal[0]);
        return [status, returnFlags];
    }
    /**
     * Wrapper for `ezspGetExtendedValue`.
     * @param EmberNodeId
     * @param destination
     * @returns EzspStatus
     * @returns overhead uint8_t
     */
    async ezspGetSourceRouteOverhead(destination) {
        const [status, outValLen, outVal] = (await this.ezspGetExtendedValue(enums_2.EzspExtendedValueId.GET_SOURCE_ROUTE_OVERHEAD, destination, 1));
        if (outValLen < 1) {
            throw enums_1.EzspStatus.ERROR_INVALID_VALUE;
        }
        return [status, outVal[0]];
    }
    /**
     * Wrapper for `ezspGetExtendedValue`.
     * @returns EzspStatus
     * @returns reason
     * @returns nodeId EmberNodeId*
     */
    async ezspGetLastLeaveReason() {
        const [status, outValLen, outVal] = (await this.ezspGetExtendedValue(enums_2.EzspExtendedValueId.LAST_LEAVE_REASON, 0, 3));
        if (outValLen < 3) {
            throw enums_1.EzspStatus.ERROR_INVALID_VALUE;
        }
        return [status, outVal[0], (0, math_1.highLowToInt)(outVal[2], outVal[1])];
    }
    /**
     * Wrapper for `ezspGetValue`.
     * @returns EzspStatus
     * @returns reason
     */
    async ezspGetLastRejoinReason() {
        const [status, outValLen, outVal] = (await this.ezspGetValue(enums_2.EzspValueId.LAST_REJOIN_REASON, 1));
        if (outValLen < 1) {
            throw enums_1.EzspStatus.ERROR_INVALID_VALUE;
        }
        return [status, outVal[0]];
    }
    /**
     * Wrapper for `ezspSetValue`.
     * @param mask
     * @returns
     */
    async ezspSetExtendedSecurityBitmask(mask) {
        return this.ezspSetValue(enums_2.EzspValueId.EXTENDED_SECURITY_BITMASK, 2, [(0, math_1.lowByte)(mask), (0, math_1.highByte)(mask)]);
    }
    /**
     * Wrapper for `ezspGetValue`.
     * @returns
     */
    async ezspGetExtendedSecurityBitmask() {
        const [status, outValLen, outVal] = (await this.ezspGetValue(enums_2.EzspValueId.EXTENDED_SECURITY_BITMASK, 2));
        if (outValLen < 2) {
            throw enums_1.EzspStatus.ERROR_INVALID_VALUE;
        }
        return [status, (0, math_1.highLowToInt)(outVal[1], outVal[0])];
    }
    /**
     * Wrapper for `ezspSetValue`.
     * @returns
     */
    async ezspStartWritingStackTokens() {
        return this.ezspSetValue(enums_2.EzspValueId.STACK_TOKEN_WRITING, 1, [1]);
    }
    /**
     * Wrapper for `ezspSetValue`.
     * @returns
     */
    async ezspStopWritingStackTokens() {
        return this.ezspSetValue(enums_2.EzspValueId.STACK_TOKEN_WRITING, 1, [0]);
    }
    //-----------------------------------------------------------------------------//
    //---------------------------- START EZSP COMMANDS ----------------------------//
    //-----------------------------------------------------------------------------//
    //-----------------------------------------------------------------------------
    // Configuration Frames
    //-----------------------------------------------------------------------------
    /**
     * The command allows the Host to specify the desired EZSP version and must be
     * sent before any other command. The response provides information about the
     * firmware running on the NCP.
     *
     * @param desiredProtocolVersion uint8_t The EZSP version the Host wishes to use.
     *        To successfully set the version and allow other commands, this must be same as EZSP_PROTOCOL_VERSION.
     * @return
     * - uint8_t The EZSP version the NCP is using.
     * - uint8_t * The type of stack running on the NCP (2).
     * - uint16_t * The version number of the stack.
     */
    async ezspVersion(desiredProtocolVersion) {
        this.startCommand(enums_2.EzspFrameID.VERSION);
        this.buffalo.writeUInt8(desiredProtocolVersion);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const protocolVersion = this.buffalo.readUInt8();
        const stackType = this.buffalo.readUInt8();
        const stackVersion = this.buffalo.readUInt16();
        return [protocolVersion, stackType, stackVersion];
    }
    /**
     * Reads a configuration value from the NCP.
     *
     * @param configId Identifies which configuration value to read.
     * @returns
     * - EzspStatus.SUCCESS if the value was read successfully,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize configId.
     * - uint16_t * The configuration value.
     */
    async ezspGetConfigurationValue(configId) {
        this.startCommand(enums_2.EzspFrameID.GET_CONFIGURATION_VALUE);
        this.buffalo.writeUInt8(configId);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const value = this.buffalo.readUInt16();
        return [status, value];
    }
    /**
     * Writes a configuration value to the NCP. Configuration values can be modified
     * by the Host after the NCP has reset. Once the status of the stack changes to
     * EMBER_NETWORK_UP, configuration values can no longer be modified and this
     * command will respond with EzspStatus.ERROR_INVALID_CALL.
     *
     * @param configId Identifies which configuration value to change.
     * @param value uint16_t The new configuration value.
     * @returns EzspStatus
     * - EzspStatus.SUCCESS if the configuration value was changed,
     * - EzspStatus.ERROR_OUT_OF_MEMORY if the new value exceeded the available memory,
     * - EzspStatus.ERROR_INVALID_VALUE if the new value was out of bounds,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize configId,
     * - EzspStatus.ERROR_INVALID_CALL if configuration values can no longer be modified.
     */
    async ezspSetConfigurationValue(configId, value) {
        this.startCommand(enums_2.EzspFrameID.SET_CONFIGURATION_VALUE);
        this.buffalo.writeUInt8(configId);
        this.buffalo.writeUInt16(value);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Read attribute data on NCP endpoints.
     * @param endpoint uint8_t Endpoint
     * @param cluster uint16_t Cluster.
     * @param attributeId uint16_t Attribute ID.
     * @param mask uint8_t Mask.
     * @param manufacturerCode uint16_t Manufacturer code.
     * @returns
     * - An EmberStatus value indicating success or the reason for failure.
     * - uint8_t * Attribute data type.
     * - uint8_t * Length of attribute data.
     * - uint8_t * Attribute data.
     */
    async ezspReadAttribute(endpoint, cluster, attributeId, mask, manufacturerCode, readLength) {
        this.startCommand(enums_2.EzspFrameID.READ_ATTRIBUTE);
        this.buffalo.writeUInt8(endpoint);
        this.buffalo.writeUInt16(cluster);
        this.buffalo.writeUInt16(attributeId);
        this.buffalo.writeUInt8(mask);
        this.buffalo.writeUInt16(manufacturerCode);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const maxReadLength = readLength;
        const status = this.buffalo.readUInt8();
        const dataType = this.buffalo.readUInt8();
        readLength = this.buffalo.readUInt8();
        if (readLength > maxReadLength) {
            throw enums_1.EzspStatus.ERROR_INVALID_VALUE;
        }
        const data = this.buffalo.readListUInt8({ length: readLength });
        return [status, dataType, readLength, data];
    }
    /**
     * Write attribute data on NCP endpoints.
     * @param endpoint uint8_t Endpoint
     * @param cluster uint16_t Cluster.
     * @param attributeId uint16_t Attribute ID.
     * @param mask uint8_t Mask.
     * @param manufacturerCode uint16_t Manufacturer code.
     * @param overrideReadOnlyAndDataType Override read only and data type.
     * @param justTest Override read only and data type.
     * @param dataType uint8_t Attribute data type.
     * @param data uint8_t * Attribute data.
     * @returns EmberStatus An EmberStatus value indicating success or the reason for failure.
     */
    async ezspWriteAttribute(endpoint, cluster, attributeId, mask, manufacturerCode, overrideReadOnlyAndDataType, justTest, dataType, data) {
        this.startCommand(enums_2.EzspFrameID.WRITE_ATTRIBUTE);
        this.buffalo.writeUInt8(endpoint);
        this.buffalo.writeUInt16(cluster);
        this.buffalo.writeUInt16(attributeId);
        this.buffalo.writeUInt8(mask);
        this.buffalo.writeUInt16(manufacturerCode);
        this.buffalo.writeUInt8(overrideReadOnlyAndDataType ? 1 : 0);
        this.buffalo.writeUInt8(justTest ? 1 : 0);
        this.buffalo.writeUInt8(dataType);
        this.buffalo.writePayload(data);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Configures endpoint information on the NCP. The NCP does not remember these
     * settings after a reset. Endpoints can be added by the Host after the NCP has
     * reset. Once the status of the stack changes to EMBER_NETWORK_UP, endpoints
     * can no longer be added and this command will respond with EzspStatus.ERROR_INVALID_CALL.
     * @param endpoint uint8_t The application endpoint to be added.
     * @param profileId uint16_t The endpoint's application profile.
     * @param deviceId uint16_t The endpoint's device ID within the application profile.
     * @param deviceVersion uint8_t The endpoint's device version.
     * @param inputClusterList uint16_t * Input cluster IDs the endpoint will accept.
     * @param outputClusterList uint16_t * Output cluster IDs the endpoint may send.
     * @returns EzspStatus
     * - EzspStatus.SUCCESS if the endpoint was added,
     * - EzspStatus.ERROR_OUT_OF_MEMORY if there is not enough memory available to add the endpoint,
     * - EzspStatus.ERROR_INVALID_VALUE if the endpoint already exists,
     * - EzspStatus.ERROR_INVALID_CALL if endpoints can no longer be added.
     */
    async ezspAddEndpoint(endpoint, profileId, deviceId, deviceVersion, inputClusterList, outputClusterList) {
        this.startCommand(enums_2.EzspFrameID.ADD_ENDPOINT);
        this.buffalo.writeUInt8(endpoint);
        this.buffalo.writeUInt16(profileId);
        this.buffalo.writeUInt16(deviceId);
        this.buffalo.writeUInt8(deviceVersion);
        this.buffalo.writeUInt8(inputClusterList.length);
        this.buffalo.writeUInt8(outputClusterList.length);
        this.buffalo.writeListUInt16(inputClusterList);
        this.buffalo.writeListUInt16(outputClusterList);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Allows the Host to change the policies used by the NCP to make fast
     * decisions.
     * @param policyId Identifies which policy to modify.
     * @param decisionId The new decision for the specified policy.
     * @returns
     * - EzspStatus.SUCCESS if the policy was changed,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize policyId.
     */
    async ezspSetPolicy(policyId, decisionId) {
        this.startCommand(enums_2.EzspFrameID.SET_POLICY);
        this.buffalo.writeUInt8(policyId);
        this.buffalo.writeUInt8(decisionId);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Allows the Host to read the policies used by the NCP to make fast decisions.
     * @param policyId Identifies which policy to read.
     * @returns
     * - EzspStatus.SUCCESS if the policy was read successfully,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize policyId.
     * - EzspDecisionId * The current decision for the specified policy.
     */
    async ezspGetPolicy(policyId) {
        this.startCommand(enums_2.EzspFrameID.GET_POLICY);
        this.buffalo.writeUInt8(policyId);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const decisionId = this.buffalo.readUInt8();
        return [status, decisionId];
    }
    /**
     * Triggers a pan id update message.
     * @param The new Pan Id
     * @returns true if the request was successfully handed to the stack, false otherwise
     */
    async ezspSendPanIdUpdate(newPan) {
        this.startCommand(enums_2.EzspFrameID.SEND_PAN_ID_UPDATE);
        this.buffalo.writeUInt16(newPan);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8() === 1 ? true : false;
        return status;
    }
    /**
     * Reads a value from the NCP.
     * @param valueId Identifies which value to read.
     * @returns
     * - EzspStatus.SUCCESS if the value was read successfully,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize valueId,
     * - EzspStatus.ERROR_INVALID_VALUE if the length of the returned value exceeds the size of local storage allocated to receive it.
     * - uint8_t * Both a command and response parameter.
     *   On command, the maximum in bytes of local storage allocated to receive the returned value.
     *   On response, the actual length in bytes of the returned value.
     * - uint8_t * The value.
     */
    async ezspGetValue(valueId, valueLength) {
        this.startCommand(enums_2.EzspFrameID.GET_VALUE);
        this.buffalo.writeUInt8(valueId);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        // let value: number[] = null;
        const maxValueLength = valueLength;
        const status = this.buffalo.readUInt8();
        valueLength = this.buffalo.readUInt8();
        if (valueLength > maxValueLength) {
            throw enums_1.EzspStatus.ERROR_INVALID_VALUE;
        }
        const value = this.buffalo.readListUInt8({ length: valueLength });
        return [status, valueLength, value];
    }
    /**
     * Reads a value from the NCP but passes an extra argument specific to the value
     * being retrieved.
     * @param valueId Identifies which extended value ID to read.
     * @param characteristics uint32_t Identifies which characteristics of the extended value ID to read. These are specific to the value being read.
     * @returns
     * - EzspStatus.SUCCESS if the value was read successfully,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize valueId,
     * - EzspStatus.ERROR_INVALID_VALUE if the length of the returned value exceeds the size of local storage allocated to receive it.
     * - uint8_t * Both a command and response parameter.
     *   On command, the maximum in bytes of local storage allocated to receive the returned value.
     *   On response, the actual length in bytes of the returned value.
     * - uint8_t * The value.
     */
    async ezspGetExtendedValue(valueId, characteristics, valueLength) {
        this.startCommand(enums_2.EzspFrameID.GET_EXTENDED_VALUE);
        this.buffalo.writeUInt8(valueId);
        this.buffalo.writeUInt32(characteristics);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        // let value: number[] = null;
        const maxValueLength = valueLength;
        const status = this.buffalo.readUInt8();
        valueLength = this.buffalo.readUInt8();
        if (valueLength > maxValueLength) {
            throw enums_1.EzspStatus.ERROR_INVALID_VALUE;
        }
        const value = this.buffalo.readListUInt8({ length: valueLength });
        return [status, valueLength, value];
    }
    /**
     * Writes a value to the NCP.
     * @param valueId Identifies which value to change.
     * @param valueLength uint8_t The length of the value parameter in bytes.
     * @param value uint8_t * The new value.
     * @returns EzspStatus
     * - EzspStatus.SUCCESS if the value was changed,
     * - EzspStatus.ERROR_INVALID_VALUE if the new value was out of bounds,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize valueId,
     * - EzspStatus.ERROR_INVALID_CALL if the value could not be modified.
     */
    async ezspSetValue(valueId, valueLength, value) {
        this.startCommand(enums_2.EzspFrameID.SET_VALUE);
        this.buffalo.writeUInt8(valueId);
        this.buffalo.writeUInt8(valueLength);
        this.buffalo.writeListUInt8(value);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Allows the Host to control the broadcast behaviour of a routing device used
     * by the NCP.
     * @param config uint8_t Passive ack config enum.
     * @param minAcksNeeded uint8_t The minimum number of acknowledgments (re-broadcasts) to wait for until
     *        deeming the broadcast transmission complete.
     * @returns EmberStatus An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSetPassiveAckConfig(config, minAcksNeeded) {
        this.startCommand(enums_2.EzspFrameID.SET_PASSIVE_ACK_CONFIG);
        this.buffalo.writeUInt8(config);
        this.buffalo.writeUInt8(minAcksNeeded);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    //-----------------------------------------------------------------------------
    // Utilities Frames
    //-----------------------------------------------------------------------------
    /**
     * A command which does nothing. The Host can use this to set the sleep mode or to check the status of the NCP.
     */
    async ezspNop() {
        this.startCommand(enums_2.EzspFrameID.NOP);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Variable length data from the Host is echoed back by the NCP. This command
     * has no other effects and is designed for testing the link between the Host and NCP.
     * @param data uint8_t * The data to be echoed back.
     * @returns
     * - The length of the echo parameter in bytes.
     * - echo uint8_t * The echo of the data.
     */
    async ezspEcho(data) {
        this.startCommand(enums_2.EzspFrameID.ECHO);
        this.buffalo.writePayload(data);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const echo = this.buffalo.readPayload();
        if (echo.length > data.length) {
            throw enums_1.EzspStatus.ERROR_INVALID_VALUE;
        }
        return echo;
    }
    /**
     * Allows the NCP to respond with a pending callback.
     */
    async ezspCallback() {
        this.startCommand(enums_2.EzspFrameID.CALLBACK);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        this.callbackDispatch();
    }
    /**
     * Callback
     * Indicates that there are currently no pending callbacks.
     */
    ezspNoCallbacks() {
        logger_1.logger.debug(`ezspNoCallbacks(): callback called`, NS);
    }
    /**
     * Sets a token (8 bytes of non-volatile storage) in the Simulated EEPROM of the NCP.
     * @param tokenId uint8_t Which token to set
     * @param tokenData uint8_t * The data to write to the token.
     * @returns EmberStatus An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSetToken(tokenId, tokenData) {
        this.startCommand(enums_2.EzspFrameID.SET_TOKEN);
        this.buffalo.writeUInt8(tokenId);
        this.buffalo.writeListUInt8(tokenData);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Retrieves a token (8 bytes of non-volatile storage) from the Simulated EEPROM of the NCP.
     * @param tokenId uint8_t Which token to read
     * @returns
     * - An EmberStatus value indicating success or the reason for failure.
     * - uint8_t * The contents of the token.
     */
    async ezspGetToken(tokenId) {
        this.startCommand(enums_2.EzspFrameID.GET_TOKEN);
        this.buffalo.writeUInt8(tokenId);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const tokenData = this.buffalo.readListUInt8({ length: 8 });
        return [status, tokenData];
    }
    /**
     * Retrieves a manufacturing token from the Flash Information Area of the NCP
     * (except for EZSP_STACK_CAL_DATA which is managed by the stack).
     * @param  Which manufacturing token to read.
     * @returns
     * - uint8_t The length of the tokenData parameter in bytes.
     * - uint8_t * The manufacturing token data.
     */
    async ezspGetMfgToken(tokenId) {
        this.startCommand(enums_2.EzspFrameID.GET_MFG_TOKEN);
        this.buffalo.writeUInt8(tokenId);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const tokenDataLength = this.buffalo.readUInt8();
        let expectedTokenDataLength = 0;
        // the size of corresponding the EZSP Mfg token, please refer to app/util/ezsp/ezsp-enum.h
        switch (tokenId) {
            // 2 bytes
            case enums_2.EzspMfgTokenId.CUSTOM_VERSION:
            case enums_2.EzspMfgTokenId.MANUF_ID:
            case enums_2.EzspMfgTokenId.PHY_CONFIG:
            case enums_2.EzspMfgTokenId.CTUNE:
                expectedTokenDataLength = 2;
                break;
            // 8 bytes
            case enums_2.EzspMfgTokenId.EZSP_STORAGE:
            case enums_2.EzspMfgTokenId.CUSTOM_EUI_64:
                expectedTokenDataLength = 8;
                break;
            // 16 bytes
            case enums_2.EzspMfgTokenId.STRING:
            case enums_2.EzspMfgTokenId.BOARD_NAME:
            case enums_2.EzspMfgTokenId.BOOTLOAD_AES_KEY:
                expectedTokenDataLength = 16;
                break;
            // 20 bytes
            case enums_2.EzspMfgTokenId.INSTALLATION_CODE:
                expectedTokenDataLength = 20;
                break;
            // 40 bytes
            case enums_2.EzspMfgTokenId.ASH_CONFIG:
                expectedTokenDataLength = 40;
                break;
            // 92 bytes
            case enums_2.EzspMfgTokenId.CBKE_DATA:
                expectedTokenDataLength = 92;
                break;
            default:
                break;
        }
        if (tokenDataLength != expectedTokenDataLength) {
            throw enums_1.EzspStatus.ERROR_INVALID_VALUE;
        }
        const tokenData = this.buffalo.readListUInt8({ length: tokenDataLength });
        return [tokenDataLength, tokenData];
    }
    /**
     * Sets a manufacturing token in the Customer Information Block (CIB) area of
     * the NCP if that token currently unset (fully erased). Cannot be used with
     * EZSP_STACK_CAL_DATA, EZSP_STACK_CAL_FILTER, EZSP_MFG_ASH_CONFIG, or
     * EZSP_MFG_CBKE_DATA token.
     * @param tokenId Which manufacturing token to set.
     * @param tokenData uint8_t * The manufacturing token data.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSetMfgToken(tokenId, tokenData) {
        this.startCommand(enums_2.EzspFrameID.SET_MFG_TOKEN);
        this.buffalo.writeUInt8(tokenId);
        this.buffalo.writePayload(tokenData);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * A callback invoked to inform the application that a stack token has changed.
     * @param tokenAddress uint16_t The address of the stack token that has changed.
     */
    ezspStackTokenChangedHandler(tokenAddress) {
        logger_1.logger.debug(`ezspStackTokenChangedHandler(): callback called with: [tokenAddress=${tokenAddress}]`, NS);
    }
    /**
     * Returns a pseudorandom number.
     * @returns
     * - Always returns EMBER_SUCCESS.
     * - uint16_t * A pseudorandom number.
     */
    async ezspGetRandomNumber() {
        this.startCommand(enums_2.EzspFrameID.GET_RANDOM_NUMBER);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const value = this.buffalo.readUInt16();
        return [status, value];
    }
    /**
     * Sets a timer on the NCP. There are 2 independent timers available for use by the Host.
     * A timer can be cancelled by setting time to 0 or units to EMBER_EVENT_INACTIVE.
     * @param timerId uint8_t Which timer to set (0 or 1).
     * @param time uint16_t The delay before the timerHandler callback will be generated.
     *        Note that the timer clock is free running and is not synchronized with this command.
     *        This means that the actual delay will be between time and (time - 1). The maximum delay is 32767.
     * @param units The units for time.
     * @param repeat If true, a timerHandler callback will be generated repeatedly. If false, only a single timerHandler callback will be generated.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSetTimer(timerId, time, units, repeat) {
        this.startCommand(enums_2.EzspFrameID.SET_TIMER);
        this.buffalo.writeUInt8(timerId);
        this.buffalo.writeUInt16(time);
        this.buffalo.writeUInt8(units);
        this.buffalo.writeUInt8(repeat ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Gets information about a timer. The Host can use this command to find out how
     * much longer it will be before a previously set timer will generate a
     * callback.
     * @param timerId uint8_t Which timer to get information about (0 or 1).
     * @returns
     * - uint16_t The delay before the timerHandler callback will be generated.
     * - EmberEventUnits * The units for time.
     * - bool * True if a timerHandler callback will be generated repeatedly. False if only a single timerHandler callback will be generated.
     */
    async ezspGetTimer(timerId) {
        this.startCommand(enums_2.EzspFrameID.GET_TIMER);
        this.buffalo.writeUInt8(timerId);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const time = this.buffalo.readUInt16();
        const units = this.buffalo.readUInt8();
        const repeat = this.buffalo.readUInt8() === 1 ? true : false;
        return [time, units, repeat];
    }
    /**
     * Callback
     * A callback from the timer.
     * @param timerId uint8_t Which timer generated the callback (0 or 1).
     */
    ezspTimerHandler(timerId) {
        logger_1.logger.debug(`ezspTimerHandler(): callback called with: [timerId=${timerId}]`, NS);
    }
    /**
     * Sends a debug message from the Host to the Network Analyzer utility via the NCP.
     * @param binaryMessage true if the message should be interpreted as binary data, false if the message should be interpreted as ASCII text.
     * @param messageContents uint8_t * The binary message.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspDebugWrite(binaryMessage, messageContents) {
        this.startCommand(enums_2.EzspFrameID.DEBUG_WRITE);
        this.buffalo.writeUInt8(binaryMessage ? 1 : 0);
        this.buffalo.writePayload(messageContents);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Retrieves and clears Ember counters. See the EmberCounterType enumeration for the counter types.
     * @returns uint16_t * A list of all counter values ordered according to the EmberCounterType enumeration.
     */
    async ezspReadAndClearCounters() {
        this.startCommand(enums_2.EzspFrameID.READ_AND_CLEAR_COUNTERS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const values = this.buffalo.readListUInt16({ length: enums_1.EmberCounterType.COUNT });
        return values;
    }
    /**
     * Retrieves Ember counters. See the EmberCounterType enumeration for the counter types.
     * @returns uint16_t * A list of all counter values ordered according to the EmberCounterType enumeration.
     */
    async ezspReadCounters() {
        this.startCommand(enums_2.EzspFrameID.READ_COUNTERS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const values = this.buffalo.readListUInt16({ length: enums_1.EmberCounterType.COUNT });
        return values;
    }
    /**
     * Callback
     * This call is fired when a counter exceeds its threshold
     * @param type Type of Counter
     */
    ezspCounterRolloverHandler(type) {
        logger_1.logger.debug(`ezspCounterRolloverHandler(): callback called with: [type=${enums_1.EmberCounterType[type]}]`, NS);
        logger_1.logger.info(`NCP Counter ${enums_1.EmberCounterType[type]} rolled over.`, NS);
    }
    /**
     * Used to test that UART flow control is working correctly.
     * @param delay uint16_t Data will not be read from the host for this many milliseconds.
     */
    async ezspDelayTest(delay) {
        this.startCommand(enums_2.EzspFrameID.DELAY_TEST);
        this.buffalo.writeUInt16(delay);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * This retrieves the status of the passed library ID to determine if it is compiled into the stack.
     * @param libraryId The ID of the library being queried.
     * @returns The status of the library being queried.
     */
    async ezspGetLibraryStatus(libraryId) {
        this.startCommand(enums_2.EzspFrameID.GET_LIBRARY_STATUS);
        this.buffalo.writeUInt8(libraryId);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Allows the HOST to know whether the NCP is running the XNCP library. If so,
     * the response contains also the manufacturer ID and the version number of the
     * XNCP application that is running on the NCP.
     * @returns
     * - EMBER_SUCCESS if the NCP is running the XNCP library,
     * - EMBER_INVALID_CALL otherwise.
     * - manufacturerId uint16_t * The manufactured ID the user has defined in the XNCP application.
     * - versionNumber uint16_t * The version number of the XNCP application.
     */
    async ezspGetXncpInfo() {
        this.startCommand(enums_2.EzspFrameID.GET_XNCP_INFO);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const manufacturerId = this.buffalo.readUInt16();
        const versionNumber = this.buffalo.readUInt16();
        return [status, manufacturerId, versionNumber];
    }
    /**
     * Provides the customer a custom EZSP frame. On the NCP, these frames are only
     * handled if the XNCP library is included. On the NCP side these frames are
     * handled in the emberXNcpIncomingCustomEzspMessageCallback() callback
     * function.
     * @param uint8_t * The payload of the custom frame (maximum 119 bytes).
     * @param uint8_t The expected length of the response.
     * @returns
     * - The status returned by the custom command.
     * - uint8_t *The response.
     */
    async ezspCustomFrame(payload, replyLength) {
        this.startCommand(enums_2.EzspFrameID.CUSTOM_FRAME);
        this.buffalo.writePayload(payload);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const reply = this.buffalo.readPayload();
        if (reply.length > replyLength) {
            throw enums_1.EzspStatus.ERROR_INVALID_VALUE;
        }
        return [status, reply];
    }
    /**
     * Callback
     * A callback indicating a custom EZSP message has been received.
     * @param payloadLength uint8_t The length of the custom frame payload.
     * @param payload uint8_t * The payload of the custom frame.
     */
    ezspCustomFrameHandler(payloadLength, payload) {
        logger_1.logger.debug(`ezspCustomFrameHandler(): callback called with: [payloadLength=${payloadLength}], [payload=${payload}]`, NS);
    }
    /**
     * Returns the EUI64 ID of the local node.
     * @returns The 64-bit ID.
     */
    async ezspGetEui64() {
        this.startCommand(enums_2.EzspFrameID.GET_EUI64);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const eui64 = this.buffalo.readIeeeAddr();
        return eui64;
    }
    /**
     * Returns the 16-bit node ID of the local node.
     * @returns The 16-bit ID.
     */
    async ezspGetNodeId() {
        this.startCommand(enums_2.EzspFrameID.GET_NODE_ID);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const nodeId = this.buffalo.readUInt16();
        return nodeId;
    }
    /**
     * Returns number of phy interfaces present.
     * @returns uint8_t Value indicate how many phy interfaces present.
     */
    async ezspGetPhyInterfaceCount() {
        this.startCommand(enums_2.EzspFrameID.GET_PHY_INTERFACE_COUNT);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const interfaceCount = this.buffalo.readUInt8();
        return interfaceCount;
    }
    /**
     * Returns the entropy source used for true random number generation.
     * @returns Value indicates the used entropy source.
     */
    async ezspGetTrueRandomEntropySource() {
        this.startCommand(enums_2.EzspFrameID.GET_TRUE_RANDOM_ENTROPY_SOURCE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const entropySource = this.buffalo.readUInt8();
        return entropySource;
    }
    //-----------------------------------------------------------------------------
    // Networking Frames
    //-----------------------------------------------------------------------------
    /**
     * Sets the manufacturer code to the specified value.
     * The manufacturer code is one of the fields of the node descriptor.
     * @param code uint16_t The manufacturer code for the local node.
     */
    async ezspSetManufacturerCode(code) {
        this.startCommand(enums_2.EzspFrameID.SET_MANUFACTURER_CODE);
        this.buffalo.writeUInt16(code);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Sets the power descriptor to the specified value. The power descriptor is a
     * dynamic value. Therefore, you should call this function whenever the value
     * changes.
     * @param descriptor uint16_t The new power descriptor for the local node.
     */
    async ezspSetPowerDescriptor(descriptor) {
        this.startCommand(enums_2.EzspFrameID.SET_POWER_DESCRIPTOR);
        this.buffalo.writeUInt16(descriptor);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Resume network operation after a reboot. The node retains its original type.
     * This should be called on startup whether or not the node was previously part
     * of a network. EMBER_NOT_JOINED is returned if the node is not part of a
     * network. This command accepts options to control the network initialization.
     * @param networkInitStruct EmberNetworkInitStruct * An EmberNetworkInitStruct containing the options for initialization.
     * @returns An EmberStatus value that indicates one of the following: successful
     * initialization, EMBER_NOT_JOINED if the node is not part of a network, or the
     * reason for failure.
     */
    async ezspNetworkInit(networkInitStruct) {
        this.startCommand(enums_2.EzspFrameID.NETWORK_INIT);
        this.buffalo.writeEmberNetworkInitStruct(networkInitStruct);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Returns a value indicating whether the node is joining, joined to, or leaving a network.
     * @returns Command send status.
     * @returns An EmberNetworkStatus value indicating the current join status.
     */
    async ezspNetworkState() {
        this.startCommand(enums_2.EzspFrameID.NETWORK_STATE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * A callback invoked when the status of the stack changes. If the status
     * parameter equals EMBER_NETWORK_UP, then the getNetworkParameters command can
     * be called to obtain the new network parameters. If any of the parameters are
     * being stored in nonvolatile memory by the Host, the stored values should be
     * updated.
     * @param status Stack status
     */
    ezspStackStatusHandler(status) {
        logger_1.logger.debug(`ezspStackStatusHandler(): callback called with: [status=${enums_1.EmberStatus[status]}]`, NS);
        this.emit(EzspEvents.STACK_STATUS, status);
    }
    /**
     * This function will start a scan.
     * @param scanType Indicates the type of scan to be performed. Possible values are: EZSP_ENERGY_SCAN and EZSP_ACTIVE_SCAN.
     *        For each type, the respective callback for reporting results is: energyScanResultHandler and networkFoundHandler.
     *        The energy scan and active scan report errors and completion via the scanCompleteHandler.
     * @param channelMask uint32_t Bits set as 1 indicate that this particular channel should be scanned.
     *        Bits set to 0 indicate that this particular channel should not be scanned. For example, a channelMask value of 0x00000001
     *        would indicate that only channel 0 should be scanned. Valid channels range from 11 to 26 inclusive.
     *        This translates to a channel mask value of 0x07FFF800.
     *        As a convenience, a value of 0 is reinterpreted as the mask for the current channel.
     * @param duration uint8_t Sets the exponent of the number of scan periods, where a scan period is 960 symbols.
     *        The scan will occur for ((2^duration) + 1) scan periods.
     * @returns
     * - SL_STATUS_OK signals that the scan successfully started. Possible error responses and their meanings:
     * - SL_STATUS_MAC_SCANNING, we are already scanning;
     * - SL_STATUS_BAD_SCAN_DURATION, we have set a duration value that is not 0..14 inclusive;
     * - SL_STATUS_MAC_INCORRECT_SCAN_TYPE, we have requested an undefined scanning type;
     * - SL_STATUS_INVALID_CHANNEL_MASK, our channel mask did not specify any valid channels.
     */
    async ezspStartScan(scanType, channelMask, duration) {
        this.startCommand(enums_2.EzspFrameID.START_SCAN);
        this.buffalo.writeUInt8(scanType);
        this.buffalo.writeUInt32(channelMask);
        this.buffalo.writeUInt8(duration);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt32();
        return status;
    }
    /**
     * Callback
     * Reports the result of an energy scan for a single channel. The scan is not
     * complete until the scanCompleteHandler callback is called.
     * @param channel uint8_t The 802.15.4 channel number that was scanned.
     * @param maxRssiValue int8_t The maximum RSSI value found on the channel.
     */
    ezspEnergyScanResultHandler(channel, maxRssiValue) {
        logger_1.logger.debug(`ezspEnergyScanResultHandler(): callback called with: [channel=${channel}], [maxRssiValue=${maxRssiValue}]`, NS);
        logger_1.logger.info(`Energy scan for channel ${channel} reports max RSSI value at ${maxRssiValue}.`, NS);
    }
    /**
     * Callback
     * Reports that a network was found as a result of a prior call to startScan.
     * Gives the network parameters useful for deciding which network to join.
     * @param networkFound EmberZigbeeNetwork * The parameters associated with the network found.
     * @param lastHopLqi uint8_t The link quality from the node that generated this beacon.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during the reception.
     */
    ezspNetworkFoundHandler(networkFound, lastHopLqi, lastHopRssi) {
        logger_1.logger.debug(`ezspNetworkFoundHandler(): callback called with: [networkFound=${networkFound}], `
            + `[lastHopLqi=${lastHopLqi}], [lastHopRssi=${lastHopRssi}]`, NS);
    }
    /**
     * Callback
     * @param channel uint8_t The channel on which the current error occurred. Undefined for the case of EMBER_SUCCESS.
     * @param status The error condition that occurred on the current channel. Value will be EMBER_SUCCESS when the scan has completed.
     * Returns the status of the current scan of type EZSP_ENERGY_SCAN or
     * EZSP_ACTIVE_SCAN. EMBER_SUCCESS signals that the scan has completed. Other
     * error conditions signify a failure to scan on the channel specified.
     */
    ezspScanCompleteHandler(channel, status) {
        logger_1.logger.debug(`ezspScanCompleteHandler(): callback called with: [channel=${channel}], [status=${enums_1.EmberStatus[status]}]`, NS);
    }
    /**
     * Callback
     * This function returns an unused panID and channel pair found via the find
     * unused panId scan procedure.
     * @param The unused panID which has been found.
     * @param channel uint8_t The channel that the unused panID was found on.
     */
    ezspUnusedPanIdFoundHandler(panId, channel) {
        logger_1.logger.debug(`ezspUnusedPanIdFoundHandler(): callback called with: [panId=${panId}], [channel=${channel}]`, NS);
    }
    /**
     * This function starts a series of scans which will return an available panId.
     * @param channelMask uint32_t The channels that will be scanned for available panIds.
     * @param duration uint8_t The duration of the procedure.
     * @returns The error condition that occurred during the scan. Value will be
     * EMBER_SUCCESS if there are no errors.
     */
    async ezspFindUnusedPanId(channelMask, duration) {
        this.startCommand(enums_2.EzspFrameID.FIND_UNUSED_PAN_ID);
        this.buffalo.writeUInt32(channelMask);
        this.buffalo.writeUInt8(duration);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Terminates a scan in progress.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspStopScan() {
        this.startCommand(enums_2.EzspFrameID.STOP_SCAN);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Forms a new network by becoming the coordinator.
     * @param parameters EmberNetworkParameters * Specification of the new network.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspFormNetwork(parameters) {
        this.startCommand(enums_2.EzspFrameID.FORM_NETWORK);
        this.buffalo.writeEmberNetworkParameters(parameters);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Causes the stack to associate with the network using the specified network
     * parameters. It can take several seconds for the stack to associate with the
     * local network. Do not send messages until the stackStatusHandler callback
     * informs you that the stack is up.
     * @param nodeType Specification of the role that this node will have in the network.
     *        This role must not be EMBER_COORDINATOR. To be a coordinator, use the formNetwork command.
     * @param parameters EmberNetworkParameters * Specification of the network with which the node should associate.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspJoinNetwork(nodeType, parameters) {
        this.startCommand(enums_2.EzspFrameID.JOIN_NETWORK);
        this.buffalo.writeUInt8(nodeType);
        this.buffalo.writeEmberNetworkParameters(parameters);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Causes the stack to associate with the network using the specified network
     * parameters in the beacon parameter. It can take several seconds for the stack
     * to associate with the local network. Do not send messages until the
     * stackStatusHandler callback informs you that the stack is up. Unlike
     * ::emberJoinNetwork(), this function does not issue an active scan before
     * joining. Instead, it will cause the local node to issue a MAC Association
     * Request directly to the specified target node. It is assumed that the beacon
     * parameter is an artifact after issuing an active scan. (For more information,
     * see emberGetBestBeacon and emberGetNextBeacon.)
     * @param localNodeType Specifies the role that this node will have in the network. This role must not be EMBER_COORDINATOR.
     *        To be a coordinator, use the formNetwork command.
     * @param beacon EmberBeaconData * Specifies the network with which the node should associate.
     * @param radioTxPower int8_t The radio transmit power to use, specified in dBm.
     * @param clearBeaconsAfterNetworkUp If true, clear beacons in cache upon join success. If join fail, do nothing.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspJoinNetworkDirectly(localNodeType, beacon, radioTxPower, clearBeaconsAfterNetworkUp) {
        this.startCommand(enums_2.EzspFrameID.JOIN_NETWORK_DIRECTLY);
        this.buffalo.writeUInt8(localNodeType);
        this.buffalo.writeEmberBeaconData(beacon);
        this.buffalo.writeUInt8(radioTxPower);
        this.buffalo.writeUInt8(clearBeaconsAfterNetworkUp ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Causes the stack to leave the current network. This generates a
     * stackStatusHandler callback to indicate that the network is down. The radio
     * will not be used until after sending a formNetwork or joinNetwork command.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspLeaveNetwork() {
        this.startCommand(enums_2.EzspFrameID.LEAVE_NETWORK);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * The application may call this function when contact with the network has been
     * lost. The most common usage case is when an end device can no longer
     * communicate with its parent and wishes to find a new one. Another case is
     * when a device has missed a Network Key update and no longer has the current
     * Network Key.  The stack will call ezspStackStatusHandler to indicate that the
     * network is down, then try to re-establish contact with the network by
     * performing an active scan, choosing a network with matching extended pan id,
     * and sending a ZigBee network rejoin request. A second call to the
     * ezspStackStatusHandler callback indicates either the success or the failure
     * of the attempt. The process takes approximately 150 milliseconds per channel
     * to complete.
     * @param haveCurrentNetworkKey This parameter tells the stack whether to try to use the current network key.
     *        If it has the current network key it will perform a secure rejoin (encrypted). If this fails the device should try an unsecure rejoin.
     *        If the Trust Center allows the rejoin then the current Network Key will be sent encrypted using the device's Link Key.
     * @param channelMask uint32_t A mask indicating the channels to be scanned. See emberStartScan for format details.
     *        A value of 0 is reinterpreted as the mask for the current channel.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspFindAndRejoinNetwork(haveCurrentNetworkKey, channelMask) {
        this.startCommand(enums_2.EzspFrameID.FIND_AND_REJOIN_NETWORK);
        this.buffalo.writeUInt8(haveCurrentNetworkKey ? 1 : 0);
        this.buffalo.writeUInt32(channelMask);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Tells the stack to allow other nodes to join the network with this node as
     * their parent. Joining is initially disabled by default.
     * @param duration uint8_t A value of 0x00 disables joining. A value of 0xFF enables joining.
     *        Any other value enables joining for that number of seconds.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspPermitJoining(duration) {
        this.startCommand(enums_2.EzspFrameID.PERMIT_JOINING);
        this.buffalo.writeUInt8(duration);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * Indicates that a child has joined or left.
     * @param index uint8_t The index of the child of interest.
     * @param joining True if the child is joining. False the child is leaving.
     * @param childId The node ID of the child.
     * @param childEui64 The EUI64 of the child.
     * @param childType The node type of the child.
     */
    ezspChildJoinHandler(index, joining, childId, childEui64, childType) {
        logger_1.logger.debug(`ezspChildJoinHandler(): callback called with: [index=${index}], [joining=${joining}], `
            + `[childId=${childId}], [childEui64=${childEui64}], [childType=${childType}]`, NS);
    }
    /**
     * Sends a ZDO energy scan request. This request may only be sent by the current
     * network manager and must be unicast, not broadcast. See ezsp-utils.h for
     * related macros emberSetNetworkManagerRequest() and
     * emberChangeChannelRequest().
     * @param target The network address of the node to perform the scan.
     * @param scanChannels uint32_t A mask of the channels to be scanned
     * @param scanDuration uint8_t How long to scan on each channel.
     *        Allowed values are 0..5, with the scan times as specified by 802.15.4 (0 = 31ms, 1 = 46ms, 2 = 77ms, 3 = 138ms, 4 = 261ms, 5 = 507ms).
     * @param scanCount uint16_t The number of scans to be performed on each channel (1..8).
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspEnergyScanRequest(target, scanChannels, scanDuration, scanCount) {
        this.startCommand(enums_2.EzspFrameID.ENERGY_SCAN_REQUEST);
        this.buffalo.writeUInt16(target);
        this.buffalo.writeUInt32(scanChannels);
        this.buffalo.writeUInt8(scanDuration);
        this.buffalo.writeUInt16(scanCount);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Returns the current network parameters.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberNodeType * An EmberNodeType value indicating the current node type.
     * @returns EmberNetworkParameters * The current network parameters.
     */
    async ezspGetNetworkParameters() {
        this.startCommand(enums_2.EzspFrameID.GET_NETWORK_PARAMETERS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const nodeType = this.buffalo.readUInt8();
        const parameters = this.buffalo.readEmberNetworkParameters();
        return [status, nodeType, parameters];
    }
    /**
     * Returns the current radio parameters based on phy index.
     * @param phyIndex uint8_t Desired index of phy interface for radio parameters.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberMultiPhyRadioParameters * The current radio parameters based on provided phy index.
     */
    async ezspGetRadioParameters(phyIndex) {
        this.startCommand(enums_2.EzspFrameID.GET_RADIO_PARAMETERS);
        this.buffalo.writeUInt8(phyIndex);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const parameters = this.buffalo.readEmberMultiPhyRadioParameters();
        return [status, parameters];
    }
    /**
     * Returns information about the children of the local node and the parent of
     * the local node.
     * @returns uint8_t The number of children the node currently has.
     * @returns The parent's EUI64. The value is undefined for nodes without parents (coordinators and nodes that are not joined to a network).
     * @returns EmberNodeId * The parent's node ID. The value is undefined for nodes without parents
     *          (coordinators and nodes that are not joined to a network).
     */
    async ezspGetParentChildParameters() {
        this.startCommand(enums_2.EzspFrameID.GET_PARENT_CHILD_PARAMETERS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const childCount = this.buffalo.readUInt8();
        const parentEui64 = this.buffalo.readIeeeAddr();
        const parentNodeId = this.buffalo.readUInt16();
        return [childCount, parentEui64, parentNodeId];
    }
    /**
     * Returns information about a child of the local node.
     * @param uint8_t The index of the child of interest in the child table. Possible indexes range from zero to EMBER_CHILD_TABLE_SIZE.
     * @returns EMBER_SUCCESS if there is a child at index. EMBER_NOT_JOINED if there is no child at index.
     * @returns EmberChildData * The data of the child.
     */
    async ezspGetChildData(index) {
        this.startCommand(enums_2.EzspFrameID.GET_CHILD_DATA);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const childData = this.buffalo.readEmberChildData();
        return [status, childData];
    }
    /**
     * Sets child data to the child table token.
     * @param index uint8_t The index of the child of interest in the child table. Possible indexes range from zero to (EMBER_CHILD_TABLE_SIZE - 1).
     * @param childData EmberChildData * The data of the child.
     * @returns EMBER_SUCCESS if the child data is set successfully at index. EMBER_INDEX_OUT_OF_RANGE if provided index is out of range.
     */
    async ezspSetChildData(index, childData) {
        this.startCommand(enums_2.EzspFrameID.SET_CHILD_DATA);
        this.buffalo.writeUInt8(index);
        this.buffalo.writeEmberChildData(childData);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Convert a child index to a node ID
     * @param childIndex uint8_t The index of the child of interest in the child table. Possible indexes range from zero to EMBER_CHILD_TABLE_SIZE.
     * @returns The node ID of the child or EMBER_NULL_NODE_ID if there isn't a child at the childIndex specified
     */
    async ezspChildId(childIndex) {
        this.startCommand(enums_2.EzspFrameID.CHILD_ID);
        this.buffalo.writeUInt8(childIndex);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const childId = this.buffalo.readUInt16();
        return childId;
    }
    /**
     * Convert a node ID to a child index
     * @param childId The node ID of the child
     * @returns uint8_t The child index or 0xFF if the node ID doesn't belong to a child
     */
    async ezspChildIndex(childId) {
        this.startCommand(enums_2.EzspFrameID.CHILD_INDEX);
        this.buffalo.writeUInt16(childId);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const childIndex = this.buffalo.readUInt8();
        return childIndex;
    }
    /**
     * Returns the source route table total size.
     * @returns uint8_t Total size of source route table.
     */
    async ezspGetSourceRouteTableTotalSize() {
        this.startCommand(enums_2.EzspFrameID.GET_SOURCE_ROUTE_TABLE_TOTAL_SIZE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const sourceRouteTableTotalSize = this.buffalo.readUInt8();
        return sourceRouteTableTotalSize;
    }
    /**
     * Returns the number of filled entries in source route table.
     * @returns uint8_t The number of filled entries in source route table.
     */
    async ezspGetSourceRouteTableFilledSize() {
        this.startCommand(enums_2.EzspFrameID.GET_SOURCE_ROUTE_TABLE_FILLED_SIZE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const sourceRouteTableFilledSize = this.buffalo.readUInt8();
        return sourceRouteTableFilledSize;
    }
    /**
     * Returns information about a source route table entry
     * @param index uint8_t The index of the entry of interest in the source route table.
     *        Possible indexes range from zero to SOURCE_ROUTE_TABLE_FILLED_SIZE.
     * @returns EMBER_SUCCESS if there is source route entry at index. EMBER_NOT_FOUND if there is no source route at index.
     * @returns EmberNodeId * The node ID of the destination in that entry.
     * @returns uint8_t * The closer node index for this source route table entry
     */
    async ezspGetSourceRouteTableEntry(index) {
        this.startCommand(enums_2.EzspFrameID.GET_SOURCE_ROUTE_TABLE_ENTRY);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const destination = this.buffalo.readUInt16();
        const closerIndex = this.buffalo.readUInt8();
        return [status, destination, closerIndex];
    }
    /**
     * Returns the neighbor table entry at the given index. The number of active
     * neighbors can be obtained using the neighborCount command.
     * @param index uint8_t The index of the neighbor of interest. Neighbors are stored in ascending order by node id,
     *        with all unused entries at the end of the table.
     * @returns EMBER_ERR_FATAL if the index is greater or equal to the number of active neighbors, or if the device is an end device.
     *          Returns EMBER_SUCCESS otherwise.
     * @returns EmberNeighborTableEntry * The contents of the neighbor table entry.
     */
    async ezspGetNeighbor(index) {
        this.startCommand(enums_2.EzspFrameID.GET_NEIGHBOR);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const value = this.buffalo.readEmberNeighborTableEntry();
        return [status, value];
    }
    /**
     * Return EmberStatus depending on whether the frame counter of the node is
     * found in the neighbor or child table. This function gets the last received
     * frame counter as found in the Network Auxiliary header for the specified
     * neighbor or child
     * @param eui64 eui64 of the node
     * @returns Return EMBER_NOT_FOUND if the node is not found in the neighbor or child table. Returns EMBER_SUCCESS otherwise
     * @returns uint32_t * Return the frame counter of the node from the neighbor or child table
     */
    async ezspGetNeighborFrameCounter(eui64) {
        this.startCommand(enums_2.EzspFrameID.GET_NEIGHBOR_FRAME_COUNTER);
        this.buffalo.writeIeeeAddr(eui64);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const returnFrameCounter = this.buffalo.readUInt32();
        return [status, returnFrameCounter];
    }
    /**
     * Sets the frame counter for the neighbour or child.
     * @param eui64 eui64 of the node
     * @param frameCounter uint32_t Return the frame counter of the node from the neighbor or child table
     * @returns
     * - EMBER_NOT_FOUND if the node is not found in the neighbor or child table.
     * - EMBER_SUCCESS otherwise
     */
    async ezspSetNeighborFrameCounter(eui64, frameCounter) {
        this.startCommand(enums_2.EzspFrameID.SET_NEIGHBOR_FRAME_COUNTER);
        this.buffalo.writeIeeeAddr(eui64);
        this.buffalo.writeUInt32(frameCounter);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Sets the routing shortcut threshold to directly use a neighbor instead of
     * performing routing.
     * @param costThresh uint8_t The routing shortcut threshold to configure.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSetRoutingShortcutThreshold(costThresh) {
        this.startCommand(enums_2.EzspFrameID.SET_ROUTING_SHORTCUT_THRESHOLD);
        this.buffalo.writeUInt8(costThresh);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Gets the routing shortcut threshold used to differentiate between directly
     * using a neighbor vs. performing routing.
     * @returns uint8_t The routing shortcut threshold
     */
    async ezspGetRoutingShortcutThreshold() {
        this.startCommand(enums_2.EzspFrameID.GET_ROUTING_SHORTCUT_THRESHOLD);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const routingShortcutThresh = this.buffalo.readUInt8();
        return routingShortcutThresh;
    }
    /**
     * Returns the number of active entries in the neighbor table.
     * @returns uint8_t The number of active entries in the neighbor table.
     */
    async ezspNeighborCount() {
        this.startCommand(enums_2.EzspFrameID.NEIGHBOR_COUNT);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const value = this.buffalo.readUInt8();
        return value;
    }
    /**
     * Returns the route table entry at the given index. The route table size can be
     * obtained using the getConfigurationValue command.
     * @param index uint8_t The index of the route table entry of interest.
     * @returns
     * - EMBER_ERR_FATAL if the index is out of range or the device is an end
     * - EMBER_SUCCESS otherwise.
     * @returns EmberRouteTableEntry * The contents of the route table entry.
     */
    async ezspGetRouteTableEntry(index) {
        this.startCommand(enums_2.EzspFrameID.GET_ROUTE_TABLE_ENTRY);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const value = this.buffalo.readEmberRouteTableEntry();
        return [status, value];
    }
    /**
     * Sets the radio output power at which a node is operating. Ember radios have
     * discrete power settings. For a list of available power settings, see the
     * technical specification for the RF communication module in your Developer
     * Kit. Note: Care should be taken when using this API on a running network, as
     * it will directly impact the established link qualities neighboring nodes have
     * with the node on which it is called. This can lead to disruption of existing
     * routes and erratic network behavior.
     * @param power int8_t Desired radio output power, in dBm.
     * @returns An EmberStatus value indicating the success or failure of the command.
     */
    async ezspSetRadioPower(power) {
        this.startCommand(enums_2.EzspFrameID.SET_RADIO_POWER);
        this.buffalo.writeUInt8(power);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Sets the channel to use for sending and receiving messages. For a list of
     * available radio channels, see the technical specification for the RF
     * communication module in your Developer Kit. Note: Care should be taken when
     * using this API, as all devices on a network must use the same channel.
     * @param channel uint8_t Desired radio channel.
     * @returns An EmberStatus value indicating the success or failure of the command.
     */
    async ezspSetRadioChannel(channel) {
        this.startCommand(enums_2.EzspFrameID.SET_RADIO_CHANNEL);
        this.buffalo.writeUInt8(channel);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Gets the channel in use for sending and receiving messages.
     * @returns uint8_t Current radio channel.
     */
    async ezspGetRadioChannel() {
        this.startCommand(enums_2.EzspFrameID.GET_RADIO_CHANNEL);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const channel = this.buffalo.readUInt8();
        return channel;
    }
    /**
     * Set the configured 802.15.4 CCA mode in the radio.
     * @param ccaMode uint8_t A RAIL_IEEE802154_CcaMode_t value.
     * @returns An EmberStatus value indicating the success or failure of the
     * command.
     */
    async ezspSetRadioIeee802154CcaMode(ccaMode) {
        this.startCommand(enums_2.EzspFrameID.SET_RADIO_IEEE802154_CCA_MODE);
        this.buffalo.writeUInt8(ccaMode);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Enable/disable concentrator support.
     * @param on If this bool is true the concentrator support is enabled. Otherwise is disabled.
     *        If this bool is false all the other arguments are ignored.
     * @param concentratorType uint16_t Must be either EMBER_HIGH_RAM_CONCENTRATOR or EMBER_LOW_RAM_CONCENTRATOR.
     *        The former is used when the caller has enough memory to store source routes for the whole network.
     *        In that case, remote nodes stop sending route records once the concentrator has successfully received one.
     *        The latter is used when the concentrator has insufficient RAM to store all outbound source routes.
     *        In that case, route records are sent to the concentrator prior to every inbound APS unicast.
     * @param minTime uint16_t The minimum amount of time that must pass between MTORR broadcasts.
     * @param maxTime uint16_t The maximum amount of time that can pass between MTORR broadcasts.
     * @param routeErrorThreshold uint8_t The number of route errors that will trigger a re-broadcast of the MTORR.
     * @param deliveryFailureThreshold uint8_t The number of APS delivery failures that will trigger a re-broadcast of the MTORR.
     * @param maxHops uint8_t The maximum number of hops that the MTORR broadcast will be allowed to have.
     *        A value of 0 will be converted to the EMBER_MAX_HOPS value set by the stack.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSetConcentrator(on, concentratorType, minTime, maxTime, routeErrorThreshold, deliveryFailureThreshold, maxHops) {
        this.startCommand(enums_2.EzspFrameID.SET_CONCENTRATOR);
        this.buffalo.writeUInt8(on ? 1 : 0);
        this.buffalo.writeUInt16(concentratorType);
        this.buffalo.writeUInt16(minTime);
        this.buffalo.writeUInt16(maxTime);
        this.buffalo.writeUInt8(routeErrorThreshold);
        this.buffalo.writeUInt8(deliveryFailureThreshold);
        this.buffalo.writeUInt8(maxHops);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Sets the error code that is sent back from a router with a broken route.
     * @param errorCode uint8_t Desired error code.
     * @returns An EmberStatus value indicating the success or failure of the
     * command.
     */
    async ezspSetBrokenRouteErrorCode(errorCode) {
        this.startCommand(enums_2.EzspFrameID.SET_BROKEN_ROUTE_ERROR_CODE);
        this.buffalo.writeUInt8(errorCode);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * This causes to initialize the desired radio interface other than native and
     * form a new network by becoming the coordinator with same panId as native
     * radio network.
     * @param phyIndex uint8_t Index of phy interface. The native phy index would be always zero hence valid phy index starts from one.
     * @param page uint8_t Desired radio channel page.
     * @param channel uint8_t Desired radio channel.
     * @param power int8_t Desired radio output power, in dBm.
     * @param bitmask Network configuration bitmask.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspMultiPhyStart(phyIndex, page, channel, power, bitmask) {
        this.startCommand(enums_2.EzspFrameID.MULTI_PHY_START);
        this.buffalo.writeUInt8(phyIndex);
        this.buffalo.writeUInt8(page);
        this.buffalo.writeUInt8(channel);
        this.buffalo.writeUInt8(power);
        this.buffalo.writeUInt8(bitmask);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * This causes to bring down the radio interface other than native.
     * @param phyIndex uint8_t Index of phy interface. The native phy index would be always zero hence valid phy index starts from one.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspMultiPhyStop(phyIndex) {
        this.startCommand(enums_2.EzspFrameID.MULTI_PHY_STOP);
        this.buffalo.writeUInt8(phyIndex);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Sets the radio output power for desired phy interface at which a node is
     * operating. Ember radios have discrete power settings. For a list of available
     * power settings, see the technical specification for the RF communication
     * module in your Developer Kit. Note: Care should be taken when using this api
     * on a running network, as it will directly impact the established link
     * qualities neighboring nodes have with the node on which it is called. This
     * can lead to disruption of existing routes and erratic network behavior.
     * @param phyIndex uint8_t Index of phy interface. The native phy index would be always zero hence valid phy index starts from one.
     * @param power int8_t Desired radio output power, in dBm.
     * @returns An EmberStatus value indicating the success or failure of the
     * command.
     */
    async ezspMultiPhySetRadioPower(phyIndex, power) {
        this.startCommand(enums_2.EzspFrameID.MULTI_PHY_SET_RADIO_POWER);
        this.buffalo.writeUInt8(phyIndex);
        this.buffalo.writeUInt8(power);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Send Link Power Delta Request from a child to its parent
     * @returns An EmberStatus value indicating the success or failure of sending the request.
     */
    async ezspSendLinkPowerDeltaRequest() {
        this.startCommand(enums_2.EzspFrameID.SEND_LINK_POWER_DELTA_REQUEST);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Sets the channel for desired phy interface to use for sending and receiving
     * messages. For a list of available radio pages and channels, see the technical
     * specification for the RF communication module in your Developer Kit. Note:
     * Care should be taken when using this API, as all devices on a network must
     * use the same page and channel.
     * @param phyIndex uint8_t Index of phy interface. The native phy index would be always zero hence valid phy index starts from one.
     * @param page uint8_t Desired radio channel page.
     * @param channel uint8_t Desired radio channel.
     * @returns An EmberStatus value indicating the success or failure of the command.
     */
    async ezspMultiPhySetRadioChannel(phyIndex, page, channel) {
        this.startCommand(enums_2.EzspFrameID.MULTI_PHY_SET_RADIO_CHANNEL);
        this.buffalo.writeUInt8(phyIndex);
        this.buffalo.writeUInt8(page);
        this.buffalo.writeUInt8(channel);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Obtains the current duty cycle state.
     * @returns An EmberStatus value indicating the success or failure of the command.
     * @returns EmberDutyCycleState * The current duty cycle state in effect.
     */
    async ezspGetDutyCycleState() {
        this.startCommand(enums_2.EzspFrameID.GET_DUTY_CYCLE_STATE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const returnedState = this.buffalo.readUInt8();
        return [status, returnedState];
    }
    /**
     * Set the current duty cycle limits configuration. The Default limits set by
     * stack if this call is not made.
     * @param limits EmberDutyCycleLimits * The duty cycle limits configuration to utilize.
     * @returns EMBER_SUCCESS  if the duty cycle limit configurations set
     * successfully, EMBER_BAD_ARGUMENT if set illegal value such as setting only
     * one of the limits to default or violates constraints Susp > Crit > Limi,
     * EMBER_INVALID_CALL if device is operating on 2.4Ghz
     */
    async ezspSetDutyCycleLimitsInStack(limits) {
        this.startCommand(enums_2.EzspFrameID.SET_DUTY_CYCLE_LIMITS_IN_STACK);
        this.buffalo.writeEmberDutyCycleLimits(limits);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Obtains the current duty cycle limits that were previously set by a call to
     * emberSetDutyCycleLimitsInStack(), or the defaults set by the stack if no set
     * call was made.
     * @returns An EmberStatus value indicating the success or failure of the command.
     * @returns EmberDutyCycleLimits * Return current duty cycle limits if returnedLimits is not NULL
     */
    async ezspGetDutyCycleLimits() {
        this.startCommand(enums_2.EzspFrameID.GET_DUTY_CYCLE_LIMITS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const returnedLimits = this.buffalo.readEmberDutyCycleLimits();
        return [status, returnedLimits];
    }
    /**
     * Returns the duty cycle of the stack's connected children that are being
     * monitored, up to maxDevices. It indicates the amount of overall duty cycle
     * they have consumed (up to the suspend limit). The first entry is always the
     * local stack's nodeId, and thus the total aggregate duty cycle for the device.
     * The passed pointer arrayOfDeviceDutyCycles MUST have space for maxDevices.
     * @param maxDevices uint8_t Number of devices to retrieve consumed duty cycle.
     * @returns
     * - EMBER_SUCCESS  if the duty cycles were read successfully,
     * - EMBER_BAD_ARGUMENT maxDevices is greater than EMBER_MAX_END_DEVICE_CHILDREN + 1.
     * @returns uint8_t * Consumed duty cycles up to maxDevices. When the number of children that are being monitored is less than maxDevices,
     *          the EmberNodeId element in the EmberPerDeviceDutyCycle will be 0xFFFF.
     */
    async ezspGetCurrentDutyCycle(maxDevices) {
        this.startCommand(enums_2.EzspFrameID.GET_CURRENT_DUTY_CYCLE);
        this.buffalo.writeUInt8(maxDevices);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const arrayOfDeviceDutyCycles = this.buffalo.readListUInt8({ length: 134 });
        return [status, arrayOfDeviceDutyCycles];
    }
    /**
     * Callback
     * Callback fires when the duty cycle state has changed
     * @param channelPage uint8_t The channel page whose duty cycle state has changed.
     * @param channel uint8_t The channel number whose duty cycle state has changed.
     * @param state The current duty cycle state.
     * @param totalDevices uint8_t The total number of connected end devices that are being monitored for duty cycle.
     * @param arrayOfDeviceDutyCycles EmberPerDeviceDutyCycle * Consumed duty cycles of end devices that are being monitored.
     *        The first entry always be the local stack's nodeId, and thus the total aggregate duty cycle for the device.
    */
    ezspDutyCycleHandler(channelPage, channel, state, totalDevices, arrayOfDeviceDutyCycles) {
        logger_1.logger.debug(`ezspDutyCycleHandler(): callback called with: [channelPage=${channelPage}], [channel=${channel}], `
            + `[state=${state}], [totalDevices=${totalDevices}], [arrayOfDeviceDutyCycles=${arrayOfDeviceDutyCycles}]`, NS);
    }
    /**
     * Returns the first beacon in the cache. Beacons are stored in cache after
     * issuing an active scan.
     * @returns
     * - EMBER_SUCCESS if first beacon found,
     * - EMBER_BAD_ARGUMENT if input parameters are invalid, EMBER_INVALID_CALL if no beacons stored,
     * - EMBER_ERR_FATAL if no first beacon found.
     * @returns EmberBeaconIterator * The iterator to use when returning the first beacon. This argument must not be NULL.
     */
    async ezspGetFirstBeacon() {
        this.startCommand(enums_2.EzspFrameID.GET_FIRST_BEACON);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const beaconIterator = this.buffalo.readEmberBeaconIterator();
        return [status, beaconIterator];
    }
    /**
     * Returns the next beacon in the cache. Beacons are stored in cache after
     * issuing an active scan.
     * @returns
     * - EMBER_SUCCESS if next beacon found,
     * - EMBER_BAD_ARGUMENT if input parameters are invalid,
     * - EMBER_ERR_FATAL if no next beacon found.
     * @returns EmberBeaconData * The next beacon retrieved. It is assumed that emberGetFirstBeacon has been called first.
     *          This argument must not be NULL.
     */
    async ezspGetNextBeacon() {
        this.startCommand(enums_2.EzspFrameID.GET_NEXT_BEACON);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const beacon = this.buffalo.readEmberBeaconData();
        return [status, beacon];
    }
    /**
     * Returns the number of cached beacons that have been collected from a scan.
     * @returns uint8_t The number of cached beacons that have been collected from a scan.
     */
    async ezspGetNumStoredBeacons() {
        this.startCommand(enums_2.EzspFrameID.GET_NUM_STORED_BEACONS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const numBeacons = this.buffalo.readUInt8();
        return numBeacons;
    }
    /**
     * Clears all cached beacons that have been collected from a scan.
     */
    async ezspClearStoredBeacons() {
        this.startCommand(enums_2.EzspFrameID.CLEAR_STORED_BEACONS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * This call sets the radio channel in the stack and propagates the information
     * to the hardware.
     * @param radioChannel uint8_t The radio channel to be set.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSetLogicalAndRadioChannel(radioChannel) {
        this.startCommand(enums_2.EzspFrameID.SET_LOGICAL_AND_RADIO_CHANNEL);
        this.buffalo.writeUInt8(radioChannel);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    //-----------------------------------------------------------------------------
    // Binding Frames
    //-----------------------------------------------------------------------------
    /**
     * Deletes all binding table entries.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspClearBindingTable() {
        this.startCommand(enums_2.EzspFrameID.CLEAR_BINDING_TABLE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Sets an entry in the binding table.
     * @param index uint8_t The index of a binding table entry.
     * @param value EmberBindingTableEntry * The contents of the binding entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSetBinding(index, value) {
        this.startCommand(enums_2.EzspFrameID.SET_BINDING);
        this.buffalo.writeUInt8(index);
        this.buffalo.writeEmberBindingTableEntry(value);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Gets an entry from the binding table.
     * @param index uint8_t The index of a binding table entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberBindingTableEntry * The contents of the binding entry.
     */
    async ezspGetBinding(index) {
        this.startCommand(enums_2.EzspFrameID.GET_BINDING);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const value = this.buffalo.readEmberBindingTableEntry();
        return [status, value];
    }
    /**
     * Deletes a binding table entry.
     * @param index uint8_t The index of a binding table entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspDeleteBinding(index) {
        this.startCommand(enums_2.EzspFrameID.DELETE_BINDING);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Indicates whether any messages are currently being sent using this binding
     * table entry. Note that this command does not indicate whether a binding is
     * clear. To determine whether a binding is clear, check whether the type field
     * of the EmberBindingTableEntry has the value EMBER_UNUSED_BINDING.
     * @param index uint8_t The index of a binding table entry.
     * @returns True if the binding table entry is active, false otherwise.
     */
    async ezspBindingIsActive(index) {
        this.startCommand(enums_2.EzspFrameID.BINDING_IS_ACTIVE);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const active = this.buffalo.readUInt8() === 1 ? true : false;
        return active;
    }
    /**
     * Returns the node ID for the binding's destination, if the ID is known. If a
     * message is sent using the binding and the destination's ID is not known, the
     * stack will discover the ID by broadcasting a ZDO address request. The
     * application can avoid the need for this discovery by using
     * setBindingRemoteNodeId when it knows the correct ID via some other means. The
     * destination's node ID is forgotten when the binding is changed, when the
     * local node reboots or, much more rarely, when the destination node changes
     * its ID in response to an ID conflict.
     * @param index uint8_t The index of a binding table entry.
     * @returns The short ID of the destination node or EMBER_NULL_NODE_ID if no destination is known.
     */
    async ezspGetBindingRemoteNodeId(index) {
        this.startCommand(enums_2.EzspFrameID.GET_BINDING_REMOTE_NODE_ID);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const nodeId = this.buffalo.readUInt16();
        return nodeId;
    }
    /**
     * Set the node ID for the binding's destination. See getBindingRemoteNodeId for
     * a description.
     * @param index uint8_t The index of a binding table entry.
     * @param The short ID of the destination node.
     */
    async ezspSetBindingRemoteNodeId(index, nodeId) {
        this.startCommand(enums_2.EzspFrameID.SET_BINDING_REMOTE_NODE_ID);
        this.buffalo.writeUInt8(index);
        this.buffalo.writeUInt16(nodeId);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Callback
     * The NCP used the external binding modification policy to decide how to handle
     * a remote set binding request. The Host cannot change the current decision,
     * but it can change the policy for future decisions using the setPolicy
     * command.
     * @param entry EmberBindingTableEntry * The requested binding.
     * @param index uint8_t The index at which the binding was added.
     * @param policyDecision EMBER_SUCCESS if the binding was added to the table and any other status if not.
     */
    ezspRemoteSetBindingHandler(entry, index, policyDecision) {
        logger_1.logger.debug(`ezspRemoteSetBindingHandler(): callback called with: [entry=${entry}], [index=${index}], `
            + `[policyDecision=${enums_1.EmberStatus[policyDecision]}]`, NS);
    }
    /**
     * Callback
     * The NCP used the external binding modification policy to decide how to handle
     * a remote delete binding request. The Host cannot change the current decision,
     * but it can change the policy for future decisions using the setPolicy
     * command.
     * @param index uint8_t The index of the binding whose deletion was requested.
     * @param policyDecision EMBER_SUCCESS if the binding was removed from the table and any other status if not.
     */
    ezspRemoteDeleteBindingHandler(index, policyDecision) {
        logger_1.logger.debug(`ezspRemoteDeleteBindingHandler(): callback called with: [index=${index}], [policyDecision=${enums_1.EmberStatus[policyDecision]}]`, NS);
    }
    //-----------------------------------------------------------------------------
    // Messaging Frames
    //-----------------------------------------------------------------------------
    /**
     * Returns the maximum size of the payload. The size depends on the security level in use.
     * @returns uint8_t The maximum APS payload length.
     */
    async ezspMaximumPayloadLength() {
        this.startCommand(enums_2.EzspFrameID.MAXIMUM_PAYLOAD_LENGTH);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const apsLength = this.buffalo.readUInt8();
        return apsLength;
    }
    /**
     * Sends a unicast message as per the ZigBee specification. The message will
     * arrive at its destination only if there is a known route to the destination
     * node. Setting the ENABLE_ROUTE_DISCOVERY option will cause a route to be
     * discovered if none is known. Setting the FORCE_ROUTE_DISCOVERY option will
     * force route discovery. Routes to end-device children of the local node are
     * always known. Setting the APS_RETRY option will cause the message to be
     * retransmitted until either a matching acknowledgement is received or three
     * transmissions have been made. Note: Using the FORCE_ROUTE_DISCOVERY option
     * will cause the first transmission to be consumed by a route request as part
     * of discovery, so the application payload of this packet will not reach its
     * destination on the first attempt. If you want the packet to reach its
     * destination, the APS_RETRY option must be set so that another attempt is made
     * to transmit the message with its application payload after the route has been
     * constructed. Note: When sending fragmented messages, the stack will only
     * assign a new APS sequence number for the first fragment of the message (i.e.,
     * EMBER_APS_OPTION_FRAGMENT is set and the low-order byte of the groupId field
     * in the APS frame is zero). For all subsequent fragments of the same message,
     * the application must set the sequence number field in the APS frame to the
     * sequence number assigned by the stack to the first fragment.
     * @param type Specifies the outgoing message type.
     *        Must be one of EMBER_OUTGOING_DIRECT, EMBER_OUTGOING_VIA_ADDRESS_TABLE, or EMBER_OUTGOING_VIA_BINDING.
     * @param indexOrDestination Depending on the type of addressing used, this is either the EmberNodeId of the destination,
     *        an index into the address table, or an index into the binding table.
     * @param apsFrame EmberApsFrame * The APS frame which is to be added to the message.
     * @param messageTag uint8_t A value chosen by the Host. This value is used in the ezspMessageSentHandler response to refer to this message.
     * @param messageContents uint8_t * Content of the message.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns uint8_t * The sequence number that will be used when this message is transmitted.
     */
    async ezspSendUnicast(type, indexOrDestination, apsFrame, messageTag, messageContents) {
        this.startCommand(enums_2.EzspFrameID.SEND_UNICAST);
        this.buffalo.writeUInt8(type);
        this.buffalo.writeUInt16(indexOrDestination);
        this.buffalo.writeEmberApsFrame(apsFrame);
        this.buffalo.writeUInt8(messageTag);
        this.buffalo.writePayload(messageContents);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const apsSequence = this.buffalo.readUInt8();
        return [status, apsSequence];
    }
    /**
     * Sends a broadcast message as per the ZigBee specification.
     * @param destination The destination to which to send the broadcast. This must be one of the three ZigBee broadcast addresses.
     * @param apsFrame EmberApsFrame * The APS frame for the message.
     * @param radius uint8_t The message will be delivered to all nodes within radius hops of the sender.
     *        A radius of zero is converted to EMBER_MAX_HOPS.
     * @param uint8_t A value chosen by the Host. This value is used in the ezspMessageSentHandler response to refer to this message.
     * @param uint8_t * The broadcast message.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns uint8_t * The sequence number that will be used when this message is transmitted.
     */
    async ezspSendBroadcast(destination, apsFrame, radius, messageTag, messageContents) {
        this.startCommand(enums_2.EzspFrameID.SEND_BROADCAST);
        this.buffalo.writeUInt16(destination);
        this.buffalo.writeEmberApsFrame(apsFrame);
        this.buffalo.writeUInt8(radius);
        this.buffalo.writeUInt8(messageTag);
        this.buffalo.writePayload(messageContents);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const apsSequence = this.buffalo.readUInt8();
        return [status, apsSequence];
    }
    /**
     * Sends a proxied broadcast message as per the ZigBee specification.
     * @param source The source from which to send the broadcast.
     * @param destination The destination to which to send the broadcast. This must be one of the three ZigBee broadcast addresses.
     * @param nwkSequence uint8_t The network sequence number for the broadcast.
     * @param apsFrame EmberApsFrame * The APS frame for the message.
     * @param radius uint8_t The message will be delivered to all nodes within radius hops of the sender.
     *        A radius of zero is converted to EMBER_MAX_HOPS.
     * @param messageTag uint8_t A value chosen by the Host. This value is used in the ezspMessageSentHandler response to refer to this message.
     * @param messageContents uint8_t * The broadcast message.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns uint8_t * The APS sequence number that will be used when this message is transmitted.
     */
    async ezspProxyBroadcast(source, destination, nwkSequence, apsFrame, radius, messageTag, messageContents) {
        this.startCommand(enums_2.EzspFrameID.PROXY_BROADCAST);
        this.buffalo.writeUInt16(source);
        this.buffalo.writeUInt16(destination);
        this.buffalo.writeUInt8(nwkSequence);
        this.buffalo.writeEmberApsFrame(apsFrame);
        this.buffalo.writeUInt8(radius);
        this.buffalo.writeUInt8(messageTag);
        this.buffalo.writePayload(messageContents);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const apsSequence = this.buffalo.readUInt8();
        return [status, apsSequence];
    }
    /**
     * Sends a multicast message to all endpoints that share a specific multicast ID
     * and are within a specified number of hops of the sender.
     * @param apsFrame EmberApsFrame * The APS frame for the message. The multicast will be sent to the groupId in this frame.
     * @param hops uint8_t The message will be delivered to all nodes within this number of hops of the sender.
     *        A value of zero is converted to EMBER_MAX_HOPS.
     * @param nonmemberRadius uint8_t The number of hops that the message will be forwarded by devices that are not members of the group.
     *        A value of 7 or greater is treated as infinite.
     * @param messageTag uint8_t A value chosen by the Host. This value is used in the ezspMessageSentHandler response to refer to this message.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The multicast message.
     * @returns An EmberStatus value. For any result other than EMBER_SUCCESS, the message will not be sent.
     * - EMBER_SUCCESS - The message has been submitted for transmission.
     * - EMBER_INVALID_BINDING_INDEX - The bindingTableIndex refers to a non-multicast binding.
     * - EMBER_NETWORK_DOWN - The node is not part of a network.
     * - EMBER_MESSAGE_TOO_LONG - The message is too large to fit in a MAC layer frame.
     * - EMBER_NO_BUFFERS - The free packet buffer pool is empty.
     * - EMBER_NETWORK_BUSY - Insufficient resources available in Network or MAC layers to send message.
     * @returns uint8_t * The sequence number that will be used when this message is transmitted.
     */
    async ezspSendMulticast(apsFrame, hops, nonmemberRadius, messageTag, messageContents) {
        this.startCommand(enums_2.EzspFrameID.SEND_MULTICAST);
        this.buffalo.writeEmberApsFrame(apsFrame);
        this.buffalo.writeUInt8(hops);
        this.buffalo.writeUInt8(nonmemberRadius);
        this.buffalo.writeUInt8(messageTag);
        this.buffalo.writePayload(messageContents);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const apsSequence = this.buffalo.readUInt8();
        return [status, apsSequence];
    }
    /**
     * Sends a multicast message to all endpoints that share a specific multicast ID
     * and are within a specified number of hops of the sender.
     * @param apsFrame EmberApsFrame * The APS frame for the message. The multicast will be sent to the groupId in this frame.
     * @param hops uint8_t The message will be delivered to all nodes within this number of hops of the sender.
     *        A value of zero is converted to EMBER_MAX_HOPS.
     * @param nonmemberRadius uint8_t The number of hops that the message will be forwarded by devices that are not members of the group.
     *        A value of 7 or greater is treated as infinite.
     * @param alias uint16_t The alias source address
     * @param nwkSequence uint8_t the alias sequence number
     * @param messageTag uint8_t A value chosen by the Host. This value is used in the ezspMessageSentHandler response to refer to this message.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The multicast message.
     * @returns An EmberStatus value. For any result other than EMBER_SUCCESS, the
     * message will not be sent. EMBER_SUCCESS - The message has been submitted for
     * transmission. EMBER_INVALID_BINDING_INDEX - The bindingTableIndex refers to a
     * non-multicast binding. EMBER_NETWORK_DOWN - The node is not part of a
     * network. EMBER_MESSAGE_TOO_LONG - The message is too large to fit in a MAC
     * layer frame. EMBER_NO_BUFFERS - The free packet buffer pool is empty.
     * EMBER_NETWORK_BUSY - Insufficient resources available in Network or MAC
     * layers to send message.
     * @returns The sequence number that will be used when this message is transmitted.
     */
    async ezspSendMulticastWithAlias(apsFrame, hops, nonmemberRadius, alias, nwkSequence, messageTag, messageContents) {
        this.startCommand(enums_2.EzspFrameID.SEND_MULTICAST_WITH_ALIAS);
        this.buffalo.writeEmberApsFrame(apsFrame);
        this.buffalo.writeUInt8(hops);
        this.buffalo.writeUInt8(nonmemberRadius);
        this.buffalo.writeUInt16(alias);
        this.buffalo.writeUInt8(nwkSequence);
        this.buffalo.writeUInt8(messageTag);
        this.buffalo.writePayload(messageContents);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const apsSequence = this.buffalo.readUInt8();
        return [status, apsSequence];
    }
    /**
     * Sends a reply to a received unicast message. The incomingMessageHandler
     * callback for the unicast being replied to supplies the values for all the
     * parameters except the reply itself.
     * @param sender Value supplied by incoming unicast.
     * @param apsFrame EmberApsFrame * Value supplied by incoming unicast.
     * @param uint8_t The length of the messageContents parameter in bytes.
     * @param uint8_t * The reply message.
     * @returns An EmberStatus value.
     * - EMBER_INVALID_CALL - The EZSP_UNICAST_REPLIES_POLICY is set to EZSP_HOST_WILL_NOT_SUPPLY_REPLY.
     *   This means the NCP will automatically send an empty reply. The Host must change
     *   the policy to EZSP_HOST_WILL_SUPPLY_REPLY before it can supply the reply.
     *   There is one exception to this rule: In the case of responses to message
     *   fragments, the host must call sendReply when a message fragment is received.
     *   In this case, the policy set on the NCP does not matter. The NCP expects a
     *   sendReply call from the Host for message fragments regardless of the current
     *   policy settings.
     * - EMBER_NO_BUFFERS - Not enough memory was available to send the reply.
     * - EMBER_NETWORK_BUSY - Either no route or insufficient resources available.
     * - EMBER_SUCCESS - The reply was successfully queued for transmission.
     */
    async ezspSendReply(sender, apsFrame, messageContents) {
        this.startCommand(enums_2.EzspFrameID.SEND_REPLY);
        this.buffalo.writeUInt16(sender);
        this.buffalo.writeEmberApsFrame(apsFrame);
        this.buffalo.writePayload(messageContents);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * A callback indicating the stack has completed sending a message.
     * @param type The type of message sent.
     * @param indexOrDestination uint16_t The destination to which the message was sent, for direct unicasts,
     *        or the address table or binding index for other unicasts. The value is unspecified for multicasts and broadcasts.
     * @param apsFrame EmberApsFrame * The APS frame for the message.
     * @param messageTag uint8_t The value supplied by the Host in the ezspSendUnicast, ezspSendBroadcast or ezspSendMulticast command.
     * @param status An EmberStatus value of EMBER_SUCCESS if an ACK was received from the destination
     *        or EMBER_DELIVERY_FAILED if no ACK was received.
     * @param messageContents uint8_t * The unicast message supplied by the Host. The message contents are only included here if the decision
     *        for the messageContentsInCallback policy is messageTagAndContentsInCallback.
     */
    ezspMessageSentHandler(type, indexOrDestination, apsFrame, messageTag, status, messageContents) {
        logger_1.logger.debug(`ezspMessageSentHandler(): callback called with: [type=${enums_1.EmberOutgoingMessageType[type]}], [indexOrDestination=${indexOrDestination}], `
            + `[apsFrame=${JSON.stringify(apsFrame)}], [messageTag=${messageTag}], [status=${enums_1.EmberStatus[status]}], `
            + `[messageContents=${messageContents.toString('hex')}]`, NS);
        if (status === enums_1.EmberStatus.DELIVERY_FAILED) {
            // no ACK was received from the destination
            this.emit(EzspEvents.MESSAGE_SENT_DELIVERY_FAILED, type, indexOrDestination, apsFrame, messageTag);
        }
        // shouldn't be any other status except SUCCESS... no use for it atm
    }
    /**
     * Sends a route request packet that creates routes from every node in the
     * network back to this node. This function should be called by an application
     * that wishes to communicate with many nodes, for example, a gateway, central
     * monitor, or controller. A device using this function was referred to as an
     * 'aggregator' in EmberZNet 2.x and earlier, and is referred to as a
     * 'concentrator' in the ZigBee specification and EmberZNet 3.  This function
     * enables large scale networks, because the other devices do not have to
     * individually perform bandwidth-intensive route discoveries. Instead, when a
     * remote node sends an APS unicast to a concentrator, its network layer
     * automatically delivers a special route record packet first, which lists the
     * network ids of all the intermediate relays. The concentrator can then use
     * source routing to send outbound APS unicasts. (A source routed message is one
     * in which the entire route is listed in the network layer header.) This allows
     * the concentrator to communicate with thousands of devices without requiring
     * large route tables on neighboring nodes.  This function is only available in
     * ZigBee Pro (stack profile 2), and cannot be called on end devices. Any router
     * can be a concentrator (not just the coordinator), and there can be multiple
     * concentrators on a network.  Note that a concentrator does not automatically
     * obtain routes to all network nodes after calling this function. Remote
     * applications must first initiate an inbound APS unicast.  Many-to-one routes
     * are not repaired automatically. Instead, the concentrator application must
     * call this function to rediscover the routes as necessary, for example, upon
     * failure of a retried APS message. The reason for this is that there is no
     * scalable one-size-fits-all route repair strategy. A common and recommended
     * strategy is for the concentrator application to refresh the routes by calling
     * this function periodically.
     * @param concentratorType uint16_t Must be either EMBER_HIGH_RAM_CONCENTRATOR or EMBER_LOW_RAM_CONCENTRATOR.
     *        The former is used when the caller has enough memory to store source routes for the whole network.
     *        In that case, remote nodes stop sending route records once the concentrator has successfully received one.
     *        The latter is used when the concentrator has insufficient RAM to store all outbound source routes.
     *        In that case, route records are sent to the concentrator prior to every inbound APS unicast.
     * @param radius uint8_t The maximum number of hops the route request will be relayed. A radius of zero is converted to EMBER_MAX_HOPS
     * @returns EMBER_SUCCESS if the route request was successfully submitted to the
     * transmit queue, and EMBER_ERR_FATAL otherwise.
     */
    async ezspSendManyToOneRouteRequest(concentratorType, radius) {
        this.startCommand(enums_2.EzspFrameID.SEND_MANY_TO_ONE_ROUTE_REQUEST);
        this.buffalo.writeUInt16(concentratorType);
        this.buffalo.writeUInt8(radius);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Periodically request any pending data from our parent. Setting interval to 0
     * or units to EMBER_EVENT_INACTIVE will generate a single poll.
     * @param interval uint16_t The time between polls. Note that the timer clock is free running and is not synchronized with this command.
     *        This means that the time will be between interval and (interval - 1). The maximum interval is 32767.
     * @param units The units for interval.
     * @param failureLimit uint8_t The number of poll failures that will be tolerated before a pollCompleteHandler callback is generated.
     *        A value of zero will result in a callback for every poll. Any status value apart from EMBER_SUCCESS
     *        and EMBER_MAC_NO_DATA is counted as a failure.
     * @returns The result of sending the first poll.
     */
    async ezspPollForData(interval, units, failureLimit) {
        this.startCommand(enums_2.EzspFrameID.POLL_FOR_DATA);
        this.buffalo.writeUInt16(interval);
        this.buffalo.writeUInt8(units);
        this.buffalo.writeUInt8(failureLimit);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * Indicates the result of a data poll to the parent of the local node.
     * @param status An EmberStatus value:
     *   - EMBER_SUCCESS - Data was received in response to the poll.
     *   - EMBER_MAC_NO_DATA - No data was pending.
     *   - EMBER_DELIVERY_FAILED - The poll message could not be sent.
     *   - EMBER_MAC_NO_ACK_RECEIVED - The poll message was sent but not acknowledged by the parent.
     */
    ezspPollCompleteHandler(status) {
        logger_1.logger.debug(`ezspPollCompleteHandler(): callback called with: [status=${enums_1.EmberStatus[status]}]`, NS);
    }
    /**
     * Callback
     * Indicates that the local node received a data poll from a child.
     * @param childId The node ID of the child that is requesting data.
     * @param transmitExpected True if transmit is expected, false otherwise.
     */
    ezspPollHandler(childId, transmitExpected) {
        logger_1.logger.debug(`ezspPollHandler(): callback called with:  [childId=${childId}], [transmitExpected=${transmitExpected}]`, NS);
    }
    /**
     * Callback
     * A callback indicating a message has been received containing the EUI64 of the
     * sender. This callback is called immediately before the incomingMessageHandler
     * callback. It is not called if the incoming message did not contain the EUI64
     * of the sender.
     * @param senderEui64 The EUI64 of the sender
     */
    ezspIncomingSenderEui64Handler(senderEui64) {
        logger_1.logger.debug(`ezspIncomingSenderEui64Handler(): callback called with: [senderEui64=${senderEui64}]`, NS);
    }
    /**
     * Callback
     * A callback indicating a message has been received.
     * @param type The type of the incoming message. One of the following: EMBER_INCOMING_UNICAST, EMBER_INCOMING_UNICAST_REPLY,
     *        EMBER_INCOMING_MULTICAST, EMBER_INCOMING_MULTICAST_LOOPBACK, EMBER_INCOMING_BROADCAST, EMBER_INCOMING_BROADCAST_LOOPBACK
     * @param apsFrame EmberApsFrame * The APS frame from the incoming message.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the message.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during the reception.
     * @param sender The sender of the message.
     * @param bindingIndex uint8_t The index of a binding that matches the message or 0xFF if there is no matching binding.
     * @param addressIndex uint8_t The index of the entry in the address table that matches the sender of the message
     *        or 0xFF if there is no matching entry.
     * @param messageContents uint8_t * The incoming message.
     */
    ezspIncomingMessageHandler(type, apsFrame, lastHopLqi, lastHopRssi, sender, bindingIndex, addressIndex, messageContents) {
        logger_1.logger.debug(`ezspIncomingMessageHandler(): callback called with: [type=${enums_1.EmberIncomingMessageType[type]}], [apsFrame=${JSON.stringify(apsFrame)}], `
            + `[lastHopLqi=${lastHopLqi}], [lastHopRssi=${lastHopRssi}], [sender=${sender}], [bindingIndex=${bindingIndex}], `
            + `[addressIndex=${addressIndex}], [messageContents=${messageContents.toString('hex')}]`, NS);
        if (apsFrame.profileId === zdo_1.ZDO_PROFILE_ID) {
            const zdoBuffalo = new buffalo_1.EzspBuffalo(messageContents, zdo_1.ZDO_MESSAGE_OVERHEAD); // set pos to skip `transaction sequence number`
            switch (apsFrame.clusterId) {
                case zdo_1.IEEE_ADDRESS_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    if (status !== zdo_1.EmberZdoStatus.ZDP_SUCCESS) {
                        logger_1.logger.debug(`<=== [ZDO IEEE_ADDRESS_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, null);
                    }
                    else {
                        // 64-bit address for the remote device
                        const eui64 = zdoBuffalo.readIeeeAddr();
                        // 16-bit address for the remote device
                        const nodeId = zdoBuffalo.readUInt16();
                        // valid range 0x00-0xFF, count of the number of 16-bit shot addresses to follow.
                        // if the RequestType in the request is Extended Response, and there are no assoc. devices on the remote device, should be 0
                        // if an error occurs or the RequestType in the request is for a Single Device Response,
                        // this fiel is not included in the frame.
                        let assocDevCount = 0;
                        // 0x00-0xFF, starting index into the list of assoc. devices for this report.
                        // if the RequestType in the request is Extended Response, and there are no assoc. devices on the remote device,
                        // this field is not included in the frame, same if error, or RequestType is for Single Device Response
                        let startIndex = 0;
                        // list of 0x0000-0xFFFF, one corresponds to each assoc. device to the remote device.
                        // if the RequestType in the request is Extended Response, and there are no assoc. devices on the remote device,
                        // this field is not included in the frame, same if error, or RequestType is for Single Device Response
                        let assocDevList = [];
                        if (zdoBuffalo.isMore()) {
                            assocDevCount = zdoBuffalo.readUInt8();
                            startIndex = zdoBuffalo.readUInt8();
                            assocDevList = zdoBuffalo.readListUInt16({ length: assocDevCount });
                        }
                        logger_1.logger.debug(`<=== [ZDO IEEE_ADDRESS_RESPONSE status=${zdo_1.EmberZdoStatus[status]} eui64=${eui64} nodeId=${nodeId} `
                            + `startIndex=${startIndex} assocDevList=${assocDevList}]`, NS);
                        logger_1.logger.debug(`<=== [ZDO IEEE_ADDRESS_RESPONSE] Support not implemented upstream`, NS);
                        const payload = { eui64, nodeId, assocDevList };
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, payload);
                    }
                    break;
                }
                case zdo_1.NETWORK_ADDRESS_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    if (status !== zdo_1.EmberZdoStatus.ZDP_SUCCESS) {
                        logger_1.logger.debug(`<=== [ZDO NETWORK_ADDRESS_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, null);
                    }
                    else {
                        // 64-bit address for the remote device
                        const eui64 = zdoBuffalo.readIeeeAddr();
                        // 16-bit address for the remote device
                        const nodeId = zdoBuffalo.readUInt16();
                        // valid range 0x00-0xFF, count of the number of 16-bit shot addresses to follow.
                        // if the RequestType in the request is Extended Response, and there are no assoc. devices on the remote device, should be 0
                        // if an error occurs or the RequestType in the request is for a Single Device Response,
                        // this fiel is not included in the frame.
                        let assocDevCount = 0;
                        // 0x00-0xFF, starting index into the list of assoc. devices for this report.
                        // if the RequestType in the request is Extended Response, and there are no assoc. devices on the remote device,
                        // this field is not included in the frame, same if error, or RequestType is for Single Device Response
                        let startIndex = 0;
                        // list of 0x0000-0xFFFF, one corresponds to each assoc. device to the remote device.
                        // if the RequestType in the request is Extended Response, and there are no assoc. devices on the remote device,
                        // this field is not included in the frame, same if error, or RequestType is for Single Device Response
                        let assocDevList = [];
                        if (zdoBuffalo.isMore()) {
                            assocDevCount = zdoBuffalo.readUInt8();
                            startIndex = zdoBuffalo.readUInt8();
                            assocDevList = zdoBuffalo.readListUInt16({ length: assocDevCount });
                        }
                        logger_1.logger.debug(`<=== [ZDO NETWORK_ADDRESS_RESPONSE status=${zdo_1.EmberZdoStatus[status]} eui64=${eui64} nodeId=${nodeId} `
                            + `startIndex=${startIndex} assocDevList=${assocDevList}]`, NS);
                        const payload = { eui64, nodeId, assocDevList };
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, payload);
                    }
                    break;
                }
                case zdo_1.MATCH_DESCRIPTORS_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    if (status !== zdo_1.EmberZdoStatus.ZDP_SUCCESS) {
                        logger_1.logger.debug(`<=== [ZDO MATCH_DESCRIPTORS_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, null);
                    }
                    else {
                        const nodeId = zdoBuffalo.readUInt16();
                        const endpointCount = zdoBuffalo.readUInt8();
                        const endpointList = zdoBuffalo.readListUInt8({ length: endpointCount });
                        logger_1.logger.debug(`<=== [ZDO MATCH_DESCRIPTORS_RESPONSE status=${zdo_1.EmberZdoStatus[status]} nodeId=${nodeId} endpointList=${endpointList}]`, NS);
                        logger_1.logger.debug(`<=== [ZDO MATCH_DESCRIPTORS_RESPONSE] Support not implemented upstream`, NS);
                        const payload = { nodeId, endpointList };
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, payload);
                    }
                    break;
                }
                case zdo_1.SIMPLE_DESCRIPTOR_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    if (status !== zdo_1.EmberZdoStatus.ZDP_SUCCESS) {
                        logger_1.logger.debug(`<=== [ZDO SIMPLE_DESCRIPTOR_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, null);
                    }
                    else {
                        const nodeId = zdoBuffalo.readUInt16();
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const length = zdoBuffalo.readUInt8();
                        const endpoint = zdoBuffalo.readUInt8();
                        const profileId = zdoBuffalo.readUInt16();
                        const deviceId = zdoBuffalo.readUInt16();
                        // values 0000-1111, others reserved
                        const deviceVersion = zdoBuffalo.readUInt8();
                        const inClusterCount = zdoBuffalo.readUInt8();
                        const inClusterList = zdoBuffalo.readListUInt16({ length: inClusterCount });
                        const outClusterCount = zdoBuffalo.readUInt8();
                        const outClusterList = zdoBuffalo.readListUInt16({ length: outClusterCount });
                        logger_1.logger.debug(`<=== [ZDO SIMPLE_DESCRIPTOR_RESPONSE status=${zdo_1.EmberZdoStatus[status]} nodeId=${nodeId} endpoint=${endpoint} `
                            + `profileId=${profileId} deviceId=${deviceId} deviceVersion=${deviceVersion} inClusterList=${inClusterList} `
                            + `outClusterList=${outClusterList}]`, NS);
                        const payload = {
                            nodeId,
                            endpoint,
                            profileId,
                            deviceId,
                            inClusterList,
                            outClusterList,
                        };
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, payload);
                    }
                    break;
                }
                case zdo_1.NODE_DESCRIPTOR_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    if (status !== zdo_1.EmberZdoStatus.ZDP_SUCCESS) {
                        logger_1.logger.debug(`<=== [ZDO NODE_DESCRIPTOR_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, null);
                    }
                    else {
                        const nodeId = zdoBuffalo.readUInt16();
                        // in bits: [logical type: 3] [complex description available: 1] [user descriptor available: 1] [reserved/unused: 3]
                        const nodeDescByte1 = zdoBuffalo.readUInt8();
                        // 000 == Zigbee Coordinator, 001 == Zigbee Router,  010 === Zigbee End Device, 011-111 === Reserved
                        const logicalType = (nodeDescByte1 & 0x07);
                        // 0 == not avail
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const complexDescAvail = (nodeDescByte1 & 0x08) >> 3;
                        // 0 == not avai
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const userDescAvail = (nodeDescByte1 & 0x10) >> 4;
                        // in bits: [aps flags: 3] [frequency band: 5]
                        const nodeDescByte2 = zdoBuffalo.readUInt8();
                        // currently not supported, should be zero
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const apsFlags = (nodeDescByte2 & 0x07);
                        // 0 == 868 – 868.6 MHz BPSK, 1 == Reserved, 2 == 902 – 928 MHz BPSK,
                        // 3 == 2400 – 2483.5 MHz, 4 == European FSK sub-GHz bands: (863-876MHz and 915-921MHz)
                        const freqBand = (nodeDescByte2 & 0xF8) >> 3;
                        /** @see MACCapabilityFlags */
                        const macCapFlags = zdoBuffalo.readUInt8();
                        // allocated by Zigbee Alliance
                        const manufacturerCode = zdoBuffalo.readUInt16();
                        // valid range 0x00-0x7F, max size in octets of the network sub-layer data unit (NSDU) for node.
                        // max size of data or commands passed to or from the app by the app support sub-layer before any fragmentation or re-assembly.
                        // can be used as a high-level indication for network management
                        const maxBufSize = zdoBuffalo.readUInt8();
                        // valid range 0x0000-0x7FFF, max size in octets of the application sub-layer data unit (ASDU)
                        // that can be transferred to this node in one single message transfer.
                        // can exceed max buf size through use of fragmentation.
                        const maxIncTxSize = zdoBuffalo.readUInt16();
                        // in bits:
                        // [primary trust center: 1]
                        // [backup trust center: 1]
                        // [primary binding table cache: 1]
                        // [backup binding table cache: 1]
                        // [primary discovery cache: 1]
                        // [backup discovery cache: 1]
                        // [network manager: 1]
                        // [reserved: 2]
                        // [stack compliance revision: 7]
                        const serverMask = zdoBuffalo.readUInt16();
                        // revision of the Zigbee Pro Core specs implemented (always zeroed out prior to revision 21 that added these fields to the spec)
                        const stackRevision = (serverMask & 0xFE00) >> 9;
                        // valid range 0x0000-0x7FFF, max size in octets of the application sub-layer data uni (ASDU)
                        // that can be transferred from this node in one single message transfer.
                        // can exceed max buf size through use of fragmentation.
                        const maxOutTxSize = zdoBuffalo.readUInt16();
                        // in bits: [extended active endpoint list available: 1] [extended simple descriptor list available: 1] [reserved: 6]
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const descCapFlags = zdoBuffalo.readUInt8();
                        logger_1.logger.debug(`<=== [ZDO NODE_DESCRIPTOR_RESPONSE status=${zdo_1.EmberZdoStatus[status]} nodeId=${nodeId} logicalType=${logicalType} `
                            + `freqBand=${freqBand} macCapFlags=${(0, math_1.byteToBits)(macCapFlags)} manufacturerCode=${manufacturerCode} maxBufSize=${maxBufSize} `
                            + `maxIncTxSize=${maxIncTxSize} stackRevision=${stackRevision} maxOutTxSize=${maxOutTxSize}]`, NS);
                        const payload = {
                            nodeId,
                            logicalType,
                            macCapFlags: (0, math_1.getMacCapFlags)(macCapFlags),
                            manufacturerCode,
                            stackRevision
                        };
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, payload);
                    }
                    break;
                }
                case zdo_1.POWER_DESCRIPTOR_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    if (status !== zdo_1.EmberZdoStatus.ZDP_SUCCESS) {
                        logger_1.logger.debug(`<=== [ZDO POWER_DESCRIPTOR_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, null);
                    }
                    else {
                        const nodeId = zdoBuffalo.readUInt16();
                        // mode: 0000 == receiver sync'ed with receiver on when idle subfield of the node descriptor
                        //       0001 == receiver comes on periodically as defined by the node power descriptor
                        //       0010 == receiver comes on when stimulated, for example, by a user pressing a button
                        // 0011-1111 reserved
                        // source (bits): 0 == constants (mains) power
                        //                1 == rechargeable battery
                        //                2 == disposable battery
                        //                3 == reserved
                        const [currentPowerMode, availPowerSources] = (0, math_1.lowHighBits)(zdoBuffalo.readUInt8());
                        // source (bits): 0 == constants (mains) power
                        //                1 == rechargeable battery
                        //                2 == disposable battery
                        //                3 == reserved
                        // level: 0000 == critical
                        //        0100 == 33%
                        //        1000 == 66%
                        //        1100 == 100%
                        // All other values reserved
                        const [currentPowerSource, currentPowerSourceLevel] = (0, math_1.lowHighBits)(zdoBuffalo.readUInt8());
                        logger_1.logger.debug(`<=== [ZDO POWER_DESCRIPTOR_RESPONSE status=${zdo_1.EmberZdoStatus[status]} nodeId=${nodeId} `
                            + `currentPowerMode=${currentPowerMode} availPowerSources=${availPowerSources} currentPowerSource=${currentPowerSource} `
                            + `currentPowerSourceLevel=${currentPowerSourceLevel}]`, NS);
                        logger_1.logger.debug(`<=== [ZDO POWER_DESCRIPTOR_RESPONSE] Support not implemented upstream`, NS);
                        const payload = {
                            nodeId,
                            currentPowerMode,
                            availPowerSources,
                            currentPowerSource,
                            currentPowerSourceLevel
                        };
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, payload);
                    }
                    break;
                }
                case zdo_1.ACTIVE_ENDPOINTS_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    if (status !== zdo_1.EmberZdoStatus.ZDP_SUCCESS) {
                        logger_1.logger.debug(`<=== [ZDO ACTIVE_ENDPOINTS_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, null);
                    }
                    else {
                        const nodeId = zdoBuffalo.readUInt16();
                        const endpointCount = zdoBuffalo.readUInt8();
                        const endpointList = zdoBuffalo.readListUInt8({ length: endpointCount });
                        logger_1.logger.debug(`<=== [ZDO ACTIVE_ENDPOINTS_RESPONSE status=${zdo_1.EmberZdoStatus[status]} nodeId=${nodeId} endpointList=${endpointList}]`, NS);
                        const payload = { nodeId, endpointList };
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, payload);
                    }
                    break;
                }
                case zdo_1.LQI_TABLE_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    if (status !== zdo_1.EmberZdoStatus.ZDP_SUCCESS) {
                        logger_1.logger.debug(`<=== [ZDO LQI_TABLE_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, null);
                    }
                    else {
                        // 0x00-0xFF, total number of neighbor table entries within the remote device
                        const neighborTableEntries = zdoBuffalo.readUInt8();
                        // 0x00-0xFF, starting index within the neighbor table to begin reporting for the NeighborTableList
                        const startIndex = zdoBuffalo.readUInt8();
                        // 0x00-0x02, number of neighbor table entries included within NeighborTableList
                        const entryCount = zdoBuffalo.readUInt8();
                        // list of descriptors, beginning with the {startIndex} element and continuing for {entryCount}
                        // of the elements in the remote device's neighbor table, including the device address and assoc. LQI
                        const entryList = [];
                        for (let i = 0; i < entryCount; i++) {
                            const extendedPanId = zdoBuffalo.readListUInt8({ length: consts_1.EXTENDED_PAN_ID_SIZE });
                            const eui64 = zdoBuffalo.readIeeeAddr();
                            const nodeId = zdoBuffalo.readUInt16();
                            const deviceTypeByte = zdoBuffalo.readUInt8();
                            const permitJoiningByte = zdoBuffalo.readUInt8();
                            const depth = zdoBuffalo.readUInt8();
                            const lqi = zdoBuffalo.readUInt8();
                            entryList.push({
                                extendedPanId,
                                eui64,
                                nodeId,
                                deviceType: deviceTypeByte & 0x03,
                                rxOnWhenIdle: (deviceTypeByte & 0x0C) >> 2,
                                relationship: (deviceTypeByte & 0x70) >> 4,
                                reserved1: (deviceTypeByte & 0x10) >> 7,
                                permitJoining: permitJoiningByte & 0x03,
                                reserved2: (permitJoiningByte & 0xFC) >> 2,
                                depth,
                                lqi,
                            });
                        }
                        logger_1.logger.debug(`<=== [ZDO LQI_TABLE_RESPONSE status=${zdo_1.EmberZdoStatus[status]} neighborTableEntries=${neighborTableEntries} `
                            + `startIndex=${startIndex} entryCount=${entryCount} entryList=${JSON.stringify(entryList)}]`, NS);
                        const payload = { neighborTableEntries, entryList };
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, payload);
                    }
                    break;
                }
                case zdo_1.ROUTING_TABLE_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    if (status !== zdo_1.EmberZdoStatus.ZDP_SUCCESS) {
                        logger_1.logger.debug(`<=== [ZDO ROUTING_TABLE_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, null);
                    }
                    else {
                        // 0x00-0xFF, total number of routing table entries within the remote device
                        const routingTableEntries = zdoBuffalo.readUInt8();
                        // 0x00-0xFF, starting index within the routing table to begin reporting for the RoutingTableList
                        const startIndex = zdoBuffalo.readUInt8();
                        // 0x00-0xFF, number of routing table entries included within RoutingTableList
                        const entryCount = zdoBuffalo.readUInt8();
                        // list of descriptors, beginning with the {startIndex} element and continuing for {entryCount}
                        // of the elements in the remote device's routing table
                        const entryList = [];
                        for (let i = 0; i < entryCount; i++) {
                            const destinationAddress = zdoBuffalo.readUInt16();
                            const statusByte = zdoBuffalo.readUInt8();
                            const nextHopAddress = zdoBuffalo.readUInt16();
                            entryList.push({
                                destinationAddress,
                                status: statusByte & 0x07,
                                memoryConstrained: (statusByte & 0x08) >> 3,
                                manyToOne: (statusByte & 0x10) >> 4,
                                routeRecordRequired: (statusByte & 0x20) >> 5,
                                reserved: (statusByte & 0xC0) >> 6,
                                nextHopAddress,
                            });
                        }
                        logger_1.logger.debug(`<=== [ZDO ROUTING_TABLE_RESPONSE status=${zdo_1.EmberZdoStatus[status]} routingTableEntries=${routingTableEntries} `
                            + `startIndex=${startIndex} entryCount=${entryCount} entryList=${JSON.stringify(entryList)}]`, NS);
                        const payload = { routingTableEntries, entryList };
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, payload);
                    }
                    break;
                }
                case zdo_1.BINDING_TABLE_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    if (status !== zdo_1.EmberZdoStatus.ZDP_SUCCESS) {
                        logger_1.logger.debug(`<=== [ZDO BINDING_TABLE_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, null);
                    }
                    else {
                        const bindingTableEntries = zdoBuffalo.readUInt8();
                        const startIndex = zdoBuffalo.readUInt8();
                        const entryCount = zdoBuffalo.readUInt8();
                        const entryList = [];
                        for (let i = 0; i < entryCount; i++) {
                            const sourceEui64 = zdoBuffalo.readIeeeAddr();
                            const sourceEndpoint = zdoBuffalo.readUInt8();
                            const clusterId = zdoBuffalo.readUInt16();
                            const destAddrMode = zdoBuffalo.readUInt8();
                            const dest = (destAddrMode === 0x01) ? zdoBuffalo.readUInt16() : ((destAddrMode === 0x03) ? zdoBuffalo.readIeeeAddr() : null);
                            const destEndpoint = (destAddrMode === 0x03) ? zdoBuffalo.readUInt8() : null;
                            entryList.push({
                                sourceEui64,
                                sourceEndpoint,
                                clusterId,
                                destAddrMode,
                                dest,
                                destEndpoint,
                            });
                        }
                        logger_1.logger.debug(`<=== [ZDO BINDING_TABLE_RESPONSE status=${zdo_1.EmberZdoStatus[status]} bindingTableEntries=${bindingTableEntries} `
                            + `startIndex=${startIndex} entryCount=${entryCount} entryList=${JSON.stringify(entryList)}]`, NS);
                        logger_1.logger.debug(`<=== [ZDO BINDING_TABLE_RESPONSE] Support not implemented upstream`, NS);
                        const payload = { bindingTableEntries, entryList };
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, payload);
                    }
                    break;
                }
                case zdo_1.BIND_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    logger_1.logger.debug(`<=== [ZDO BIND_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                    this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame);
                    break;
                }
                case zdo_1.UNBIND_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    logger_1.logger.debug(`<=== [ZDO UNBIND_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                    this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame);
                    break;
                }
                case zdo_1.LEAVE_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    logger_1.logger.debug(`<=== [ZDO LEAVE_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                    this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame);
                    break;
                }
                case zdo_1.PERMIT_JOINING_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    logger_1.logger.debug(`<=== [ZDO PERMIT_JOINING_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                    this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame);
                    break;
                }
                case zdo_1.END_DEVICE_ANNOUNCE: {
                    const nodeId = zdoBuffalo.readUInt16();
                    const eui64 = zdoBuffalo.readIeeeAddr();
                    /** @see MACCapabilityFlags */
                    const capabilities = zdoBuffalo.readUInt8();
                    logger_1.logger.debug(`<=== [ZDO END_DEVICE_ANNOUNCE nodeId=${nodeId} eui64=${eui64} capabilities=${(0, math_1.byteToBits)(capabilities)}]`, NS);
                    const payload = { nodeId, eui64, capabilities: (0, math_1.getMacCapFlags)(capabilities) };
                    // this one gets its own event since its purpose is to pass an event up to Z2M
                    this.emit(EzspEvents.END_DEVICE_ANNOUNCE, sender, apsFrame, payload);
                    break;
                }
                case zdo_1.PARENT_ANNOUNCE_RESPONSE: {
                    const status = zdoBuffalo.readUInt8();
                    if (status !== zdo_1.EmberZdoStatus.ZDP_SUCCESS) {
                        // status should always be NOT_SUPPORTED here
                        logger_1.logger.debug(`<=== [ZDO PARENT_ANNOUNCE_RESPONSE status=${zdo_1.EmberZdoStatus[status]}]`, NS);
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, null);
                    }
                    else {
                        const numberOfChildren = zdoBuffalo.readUInt8();
                        const children = [];
                        for (let i = 0; i < numberOfChildren; i++) {
                            const childEui64 = zdoBuffalo.readIeeeAddr();
                            children.push(childEui64);
                        }
                        logger_1.logger.debug(`<=== [ZDO PARENT_ANNOUNCE_RESPONSE status=${zdo_1.EmberZdoStatus[status]} numberOfChildren=${numberOfChildren} `
                            + `children=${children}]`, NS);
                        logger_1.logger.debug(`<=== [ZDO PARENT_ANNOUNCE_RESPONSE] Support not implemented upstream`, NS);
                        const payload = { children };
                        this.emit(EzspEvents.ZDO_RESPONSE, status, sender, apsFrame, payload);
                    }
                }
                default: {
                    logger_1.logger.info(`<=== [ZDO clusterId=${apsFrame.clusterId} sender=${sender}] Support not implemented upstream.`, NS);
                    break;
                }
            }
        }
        else if (apsFrame.profileId === consts_2.HA_PROFILE_ID || apsFrame.profileId === consts_2.WILDCARD_PROFILE_ID) {
            this.emit(EzspEvents.INCOMING_MESSAGE, type, apsFrame, lastHopLqi, sender, messageContents);
        }
        else if (apsFrame.profileId === consts_2.GP_PROFILE_ID) {
            // only broadcast loopback in here
        }
    }
    /**
     * Sets source route discovery(MTORR) mode to on, off, reschedule
     * @param mode uint8_t Source route discovery mode: off:0, on:1, reschedule:2
     * @returns uint32_t Remaining time(ms) until next MTORR broadcast if the mode is on, MAX_INT32U_VALUE if the mode is off
     */
    async ezspSetSourceRouteDiscoveryMode(mode) {
        this.startCommand(enums_2.EzspFrameID.SET_SOURCE_ROUTE_DISCOVERY_MODE);
        this.buffalo.writeUInt8(mode);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const remainingTime = this.buffalo.readUInt32();
        return remainingTime;
    }
    /**
     * Callback
     * A callback indicating that a many-to-one route to the concentrator with the given short and long id is available for use.
     * @param EmberNodeId The short id of the concentrator.
     * @param longId The EUI64 of the concentrator.
     * @param cost uint8_t The path cost to the concentrator. The cost may decrease as additional route request packets
     *        for this discovery arrive, but the callback is made only once.
     */
    ezspIncomingManyToOneRouteRequestHandler(source, longId, cost) {
        logger_1.logger.debug(`ezspIncomingManyToOneRouteRequestHandler(): callback called with: [source=${source}], [longId=${longId}], [cost=${cost}]`, NS);
    }
    /**
     * Callback
     * A callback invoked when a route error message is received.
     * The error indicates that a problem routing to or from the target node was encountered.
     *
     * A status of ::EMBER_SOURCE_ROUTE_FAILURE indicates that a source-routed unicast sent from this node encountered a broken link.
     * Note that this case occurs only if this node is a concentrator using many-to-one routing for inbound messages and source-routing for
     * outbound messages. The node prior to the broken link generated the route error message and returned it to us along the many-to-one route.
     *
     * A status of ::EMBER_MANY_TO_ONE_ROUTE_FAILURE also occurs only if the local device is a concentrator, and indicates that a unicast sent
     * to the local device along a many-to-one route encountered a broken link. The node prior to the broken link generated the route error
     * message and forwarded it to the local device via a randomly chosen neighbor, taking advantage of the many-to-one nature of the route.
     *
     * A status of ::EMBER_MAC_INDIRECT_TIMEOUT indicates that a message sent to the target end device could not be delivered by the parent
     * because the indirect transaction timer expired. Upon receipt of the route error, the stack sets the extended timeout for the target node
     * in the address table, if present. It then calls this handler to indicate receipt of the error.
     *
     * Note that if the original unicast data message is sent using the ::EMBER_APS_OPTION_RETRY option, a new route error message is generated
     * for each failed retry. Therefore, it is not unusual to receive three route error messages in succession for a single failed retried APS
     * unicast. On the other hand, it is also not guaranteed that any route error messages will be delivered successfully at all.
     * The only sure way to detect a route failure is to use retried APS messages and to check the status of the ::emberMessageSentHandler().
     *
     * @param status ::EMBER_SOURCE_ROUTE_FAILURE, ::EMBER_MANY_TO_ONE_ROUTE_FAILURE, ::EMBER_MAC_INDIRECT_TIMEOUT
     * @param target The short id of the remote node.
     */
    ezspIncomingRouteErrorHandler(status, target) {
        logger_1.logger.debug(`ezspIncomingRouteErrorHandler(): callback called with: [status=${enums_1.EmberStatus[status]}], [target=${target}]`, NS);
        // NOTE: This can trigger immediately after removal of a device with status MAC_INDIRECT_TIMEOUT
    }
    /**
     * Callback
     * A callback invoked when a network status/route error message is received.
     * The error indicates that there was a problem sending/receiving messages from the target node.
     *
     * Note: Network analyzer may flag this message as "route error" which is the old name for the "network status" command.
     *
     * This handler is a superset of ezspIncomingRouteErrorHandler. The old API was only invoking the handler for a couple of the possible
     * error codes and these were being translated into EmberStatus.
     *
     * @param errorCode uint8_t One byte over-the-air error code from network status message
     * @param target The short ID of the remote node
     */
    ezspIncomingNetworkStatusHandler(errorCode, target) {
        logger_1.logger.debug(`ezspIncomingNetworkStatusHandler(): callback called with: [errorCode=${enums_1.EmberStackError[errorCode]}], [target=${target}]`, NS);
        logger_1.logger.warning(`Received network/route error ${enums_1.EmberStackError[errorCode]} for "${target}".`, NS);
    }
    /**
     * Callback
     * Reports the arrival of a route record command frame.
     * @param EmberNodeId The source of the route record.
     * @param EmberEUI64 The EUI64 of the source.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the route record.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during the reception.
     * @param uint8_t The number of relays in relayList.
     * @param relayList uint8_t * The route record. Each relay in the list is an uint16_t node ID.
     *        The list is passed as uint8_t * to avoid alignment problems.
     */
    ezspIncomingRouteRecordHandler(source, sourceEui, lastHopLqi, lastHopRssi, relayCount, relayList) {
        logger_1.logger.debug(`ezspIncomingRouteRecordHandler(): callback called with: [source=${source}], [sourceEui=${sourceEui}], `
            + `[lastHopLqi=${lastHopLqi}], [lastHopRssi=${lastHopRssi}], [relayCount=${relayCount}], [relayList=${relayList}]`, NS);
        // XXX: could at least trigger a `Events.lastSeenChanged` but this is not currently being listened to at the adapter level
    }
    /**
     * Supply a source route for the next outgoing message.
     * @param destination The destination of the source route.
     * @param relayList uint16_t * The source route.
     * @returns EMBER_SUCCESS if the source route was successfully stored, and
     * EMBER_NO_BUFFERS otherwise.
     */
    async ezspSetSourceRoute(destination, relayList) {
        this.startCommand(enums_2.EzspFrameID.SET_SOURCE_ROUTE);
        this.buffalo.writeUInt16(destination);
        this.buffalo.writeUInt8(relayList.length);
        this.buffalo.writeListUInt16(relayList);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Send the network key to a destination.
     * @param targetShort The destination node of the key.
     * @param targetLong The long address of the destination node.
     * @param parentShortId The parent node of the destination node.
     * @returns EMBER_SUCCESS if send was successful
     */
    async ezspUnicastCurrentNetworkKey(targetShort, targetLong, parentShortId) {
        this.startCommand(enums_2.EzspFrameID.UNICAST_CURRENT_NETWORK_KEY);
        this.buffalo.writeUInt16(targetShort);
        this.buffalo.writeIeeeAddr(targetLong);
        this.buffalo.writeUInt16(parentShortId);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Indicates whether any messages are currently being sent using this address
     * table entry. Note that this function does not indicate whether the address
     * table entry is unused. To determine whether an address table entry is unused,
     * check the remote node ID. The remote node ID will have the value
     * EMBER_TABLE_ENTRY_UNUSED_NODE_ID when the address table entry is not in use.
     * @param uint8_tThe index of an address table entry.
     * @returns True if the address table entry is active, false otherwise.
     */
    async ezspAddressTableEntryIsActive(addressTableIndex) {
        this.startCommand(enums_2.EzspFrameID.ADDRESS_TABLE_ENTRY_IS_ACTIVE);
        this.buffalo.writeUInt8(addressTableIndex);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const active = this.buffalo.readUInt8() === 1 ? true : false;
        return active;
    }
    /**
     * Sets the EUI64 of an address table entry. This function will also check other
     * address table entries, the child table and the neighbor table to see if the
     * node ID for the given EUI64 is already known. If known then this function
     * will also set node ID. If not known it will set the node ID to
     * EMBER_UNKNOWN_NODE_ID.
     * @param addressTableIndex uint8_t  The index of an address table entry.
     * @param eui64 The EUI64 to use for the address table entry.
     * @returns
     * - EMBER_SUCCESS if the EUI64 was successfully set,
     * - EMBER_ADDRESS_TABLE_ENTRY_IS_ACTIVE otherwise.
     */
    async ezspSetAddressTableRemoteEui64(addressTableIndex, eui64) {
        this.startCommand(enums_2.EzspFrameID.SET_ADDRESS_TABLE_REMOTE_EUI64);
        this.buffalo.writeUInt8(addressTableIndex);
        this.buffalo.writeIeeeAddr(eui64);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Sets the short ID of an address table entry. Usually the application will not
     * need to set the short ID in the address table. Once the remote EUI64 is set
     * the stack is capable of figuring out the short ID on its own. However, in
     * cases where the application does set the short ID, the application must set
     * the remote EUI64 prior to setting the short ID.
     * @param addressTableIndex uint8_t The index of an address table entry.
     * @param id The short ID corresponding to the remote node whose EUI64 is stored in the address table at the given index
     *        or EMBER_TABLE_ENTRY_UNUSED_NODE_ID which indicates that the entry stored in the address table at the given index is not in use.
     */
    async ezspSetAddressTableRemoteNodeId(addressTableIndex, id) {
        this.startCommand(enums_2.EzspFrameID.SET_ADDRESS_TABLE_REMOTE_NODE_ID);
        this.buffalo.writeUInt8(addressTableIndex);
        this.buffalo.writeUInt16(id);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Gets the EUI64 of an address table entry.
     * @param addressTableIndex uint8_t The index of an address table entry.
     * @returns The EUI64 of the address table entry is copied to this location.
     */
    async ezspGetAddressTableRemoteEui64(addressTableIndex) {
        this.startCommand(enums_2.EzspFrameID.GET_ADDRESS_TABLE_REMOTE_EUI64);
        this.buffalo.writeUInt8(addressTableIndex);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const eui64 = this.buffalo.readIeeeAddr();
        return eui64;
    }
    /**
     * Gets the short ID of an address table entry.
     * @param addressTableIndex uint8_t The index of an address table entry.
     * @returns One of the following: The short ID corresponding to the remote node
     * whose EUI64 is stored in the address table at the given index.
     * - EMBER_UNKNOWN_NODE_ID - Indicates that the EUI64 stored in the address table
     * at the given index is valid but the short ID is currently unknown.
     * - EMBER_DISCOVERY_ACTIVE_NODE_ID - Indicates that the EUI64 stored in the
     * address table at the given location is valid and network address discovery is
     * underway.
     * - EMBER_TABLE_ENTRY_UNUSED_NODE_ID - Indicates that the entry stored
     * in the address table at the given index is not in use.
     */
    async ezspGetAddressTableRemoteNodeId(addressTableIndex) {
        this.startCommand(enums_2.EzspFrameID.GET_ADDRESS_TABLE_REMOTE_NODE_ID);
        this.buffalo.writeUInt8(addressTableIndex);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const nodeId = this.buffalo.readUInt16();
        return nodeId;
    }
    /**
     * Tells the stack whether or not the normal interval between retransmissions of a retried unicast message should
     * be increased by EMBER_INDIRECT_TRANSMISSION_TIMEOUT.
     * The interval needs to be increased when sending to a sleepy node so that the message is not retransmitted until the destination
     * has had time to wake up and poll its parent.
     * The stack will automatically extend the timeout:
     * - For our own sleepy children.
     * - When an address response is received from a parent on behalf of its child.
     * - When an indirect transaction expiry route error is received.
     * - When an end device announcement is received from a sleepy node.
     * @param remoteEui64 The address of the node for which the timeout is to be set.
     * @param extendedTimeout true if the retry interval should be increased by EMBER_INDIRECT_TRANSMISSION_TIMEOUT.
     *        false if the normal retry interval should be used.
     */
    async ezspSetExtendedTimeout(remoteEui64, extendedTimeout) {
        this.startCommand(enums_2.EzspFrameID.SET_EXTENDED_TIMEOUT);
        this.buffalo.writeIeeeAddr(remoteEui64);
        this.buffalo.writeUInt8(extendedTimeout ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Indicates whether or not the stack will extend the normal interval between
     * retransmissions of a retried unicast message by
     * EMBER_INDIRECT_TRANSMISSION_TIMEOUT.
     * @param remoteEui64 The address of the node for which the timeout is to be returned.
     * @returns true if the retry interval will be increased by EMBER_INDIRECT_TRANSMISSION_TIMEOUT
     * and false if the normal retry interval will be used.
     */
    async ezspGetExtendedTimeout(remoteEui64) {
        this.startCommand(enums_2.EzspFrameID.GET_EXTENDED_TIMEOUT);
        this.buffalo.writeIeeeAddr(remoteEui64);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const extendedTimeout = this.buffalo.readUInt8() === 1 ? true : false;
        return extendedTimeout;
    }
    /**
     * Replaces the EUI64, short ID and extended timeout setting of an address table
     * entry. The previous EUI64, short ID and extended timeout setting are
     * returned.
     * @param addressTableIndex uint8_t The index of the address table entry that will be modified.
     * @param newEui64 The EUI64 to be written to the address table entry.
     * @param newId One of the following: The short ID corresponding to the new EUI64.
     *        EMBER_UNKNOWN_NODE_ID if the new EUI64 is valid but the short ID is unknown and should be discovered by the stack.
     *        EMBER_TABLE_ENTRY_UNUSED_NODE_ID if the address table entry is now unused.
     * @param newExtendedTimeout true if the retry interval should be increased by EMBER_INDIRECT_TRANSMISSION_TIMEOUT.
     *        false if the normal retry interval should be used.
     * @returns EMBER_SUCCESS if the EUI64, short ID and extended timeout setting
     * were successfully modified, and EMBER_ADDRESS_TABLE_ENTRY_IS_ACTIVE
     * otherwise.
     * @returns oldEui64 The EUI64 of the address table entry before it was modified.
     * @returns oldId EmberNodeId * One of the following: The short ID corresponding to the EUI64 before it was modified.
     *          EMBER_UNKNOWN_NODE_ID if the short ID was unknown. EMBER_DISCOVERY_ACTIVE_NODE_ID if discovery of the short ID was underway.
     *          EMBER_TABLE_ENTRY_UNUSED_NODE_ID if the address table entry was unused.
     * @returns oldExtendedTimeouttrue bool * if the retry interval was being increased by EMBER_INDIRECT_TRANSMISSION_TIMEOUT.
     *          false if the normal retry interval was being used.
     */
    async ezspReplaceAddressTableEntry(addressTableIndex, newEui64, newId, newExtendedTimeout) {
        this.startCommand(enums_2.EzspFrameID.REPLACE_ADDRESS_TABLE_ENTRY);
        this.buffalo.writeUInt8(addressTableIndex);
        this.buffalo.writeIeeeAddr(newEui64);
        this.buffalo.writeUInt16(newId);
        this.buffalo.writeUInt8(newExtendedTimeout ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const oldEui64 = this.buffalo.readIeeeAddr();
        const oldId = this.buffalo.readUInt16();
        const oldExtendedTimeout = this.buffalo.readUInt8() === 1 ? true : false;
        return [status, oldEui64, oldId, oldExtendedTimeout];
    }
    /**
     * Returns the node ID that corresponds to the specified EUI64. The node ID is
     * found by searching through all stack tables for the specified EUI64.
     * @param eui64 The EUI64 of the node to look up.
     * @returns The short ID of the node or EMBER_NULL_NODE_ID if the short ID is not
     * known.
     */
    async ezspLookupNodeIdByEui64(eui64) {
        this.startCommand(enums_2.EzspFrameID.LOOKUP_NODE_ID_BY_EUI64);
        this.buffalo.writeIeeeAddr(eui64);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const nodeId = this.buffalo.readUInt16();
        return nodeId;
    }
    /**
     * Returns the EUI64 that corresponds to the specified node ID. The EUI64 is
     * found by searching through all stack tables for the specified node ID.
     * @param nodeId The short ID of the node to look up.
     * @returns EMBER_SUCCESS if the EUI64 was found, EMBER_ERR_FATAL if the EUI64 is
     * not known.
     * @returns eui64 The EUI64 of the node.
     */
    async ezspLookupEui64ByNodeId(nodeId) {
        this.startCommand(enums_2.EzspFrameID.LOOKUP_EUI64_BY_NODE_ID);
        this.buffalo.writeUInt16(nodeId);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const eui64 = this.buffalo.readIeeeAddr();
        return [status, eui64];
    }
    /**
     * Gets an entry from the multicast table.
     * @param uint8_t The index of a multicast table entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberMulticastTableEntry * The contents of the multicast entry.
     */
    async ezspGetMulticastTableEntry(index) {
        this.startCommand(enums_2.EzspFrameID.GET_MULTICAST_TABLE_ENTRY);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const value = this.buffalo.readEmberMulticastTableEntry();
        return [status, value];
    }
    /**
     * Sets an entry in the multicast table.
     * @param index uint8_t The index of a multicast table entry
     * @param EmberMulticastTableEntry * The contents of the multicast entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSetMulticastTableEntry(index, value) {
        this.startCommand(enums_2.EzspFrameID.SET_MULTICAST_TABLE_ENTRY);
        this.buffalo.writeUInt8(index);
        this.buffalo.writeEmberMulticastTableEntry(value);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * A callback invoked by the EmberZNet stack when an id conflict is discovered,
     * that is, two different nodes in the network were found to be using the same
     * short id. The stack automatically removes the conflicting short id from its
     * internal tables (address, binding, route, neighbor, and child tables). The
     * application should discontinue any other use of the id.
     * @param id The short id for which a conflict was detected
     */
    ezspIdConflictHandler(id) {
        logger_1.logger.debug(`ezspIdConflictHandler(): callback called with: [id=${id}]`, NS);
        logger_1.logger.warning(`An ID conflict was detected for network address "${id}". Corresponding devices kicked from the network.`, NS);
        // XXX: this is currently causing more problems than not doing it, so disabled for now.
        //      devices should rejoin on ID conflict anyway, so the database isn't out of sync for very long.
        // hijacking the event from `ezspTrustCenterJoinHandler`, and forging a DEVICE_LEFT to avoid another event ending up doing the same logic
        // this.emit(EzspEvents.TRUST_CENTER_JOIN, id, null, EmberDeviceUpdate.DEVICE_LEFT, EmberJoinDecision.NO_ACTION, NULL_NODE_ID);
    }
    /**
     * Write the current node Id, PAN ID, or Node type to the tokens
     * @param erase Erase the node type or not
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspWriteNodeData(erase) {
        this.startCommand(enums_2.EzspFrameID.WRITE_NODE_DATA);
        this.buffalo.writeUInt8(erase ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Transmits the given message without modification. The MAC header is assumed
     * to be configured in the message at the time this function is called.
     * @param messageContents uint8_t * The raw message.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSendRawMessage(messageContents) {
        this.startCommand(enums_2.EzspFrameID.SEND_RAW_MESSAGE);
        this.buffalo.writePayload(messageContents);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Transmits the given message without modification. The MAC header is assumed
     * to be configured in the message at the time this function is called.
     * @param messageContents uint8_t * The raw message.
     * @param priority uint8_t transmit priority.
     * @param useCca Should we enable CCA or not.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSendRawMessageExtended(messageContents, priority, useCca) {
        this.startCommand(enums_2.EzspFrameID.SEND_RAW_MESSAGE_EXTENDED);
        this.buffalo.writePayload(messageContents);
        this.buffalo.writeUInt8(priority);
        this.buffalo.writeUInt8(useCca ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * A callback invoked by the EmberZNet stack when a MAC passthrough message is
     * received.
     * @param messageType The type of MAC passthrough message received.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the message.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during reception.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The raw message that was received.
     */
    ezspMacPassthroughMessageHandler(messageType, lastHopLqi, lastHopRssi, messageContents) {
        logger_1.logger.debug(`ezspMacPassthroughMessageHandler(): callback called with: [messageType=${messageType}], [lastHopLqi=${lastHopLqi}], `
            + `[lastHopRssi=${lastHopRssi}], [messageContents=${messageContents.toString('hex')}]`, NS);
    }
    /**
     * Callback
     * A callback invoked by the EmberZNet stack when a raw MAC message that has
     * matched one of the application's configured MAC filters.
     * @param filterIndexMatch uint8_t The index of the filter that was matched.
     * @param legacyPassthroughType The type of MAC passthrough message received.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the message.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during reception.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The raw message that was received.
     */
    ezspMacFilterMatchMessageHandler(filterIndexMatch, legacyPassthroughType, lastHopLqi, lastHopRssi, messageContents) {
        logger_1.logger.debug(`ezspMacFilterMatchMessageHandler(): callback called with: [filterIndexMatch=${filterIndexMatch}], `
            + `[legacyPassthroughType=${legacyPassthroughType}], [lastHopLqi=${lastHopLqi}], [lastHopRssi=${lastHopRssi}], `
            + `[messageContents=${messageContents.toString('hex')}]`, NS);
        // TODO: needs triple-checking, this is only valid for InterPAN messages
        const msgBuffalo = new buffalo_1.EzspBuffalo(messageContents, 0);
        const macFrameControl = msgBuffalo.readUInt16() & ~(consts_2.MAC_ACK_REQUIRED);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const sequence = msgBuffalo.readUInt8();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const destPanId = msgBuffalo.readUInt16();
        let destAddress;
        if (macFrameControl === consts_2.LONG_DEST_FRAME_CONTROL) {
            destAddress = msgBuffalo.readIeeeAddr();
        }
        else if (macFrameControl === consts_2.SHORT_DEST_FRAME_CONTROL) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            destAddress = msgBuffalo.readUInt16();
        }
        else {
            logger_1.logger.debug(`ezspMacFilterMatchMessageHandler INVALID InterPAN macFrameControl "${macFrameControl}".`, NS);
            return;
        }
        const sourcePanId = msgBuffalo.readUInt16();
        const sourceAddress = msgBuffalo.readIeeeAddr();
        // Now that we know the correct MAC length, verify the interpan frame is the correct length.
        let remainingLength = msgBuffalo.getBufferLength() - msgBuffalo.getPosition();
        if (remainingLength < (consts_2.STUB_NWK_SIZE + consts_2.MIN_STUB_APS_SIZE)) {
            logger_1.logger.debug(`ezspMacFilterMatchMessageHandler INVALID InterPAN length "${remainingLength}".`, NS);
            return;
        }
        const nwkFrameControl = msgBuffalo.readUInt16();
        remainingLength -= 2; // read 2 more bytes before APS stuff
        if (nwkFrameControl !== consts_2.STUB_NWK_FRAME_CONTROL) {
            logger_1.logger.debug(`ezspMacFilterMatchMessageHandler INVALID InterPAN nwkFrameControl "${nwkFrameControl}".`, NS);
            return;
        }
        const apsFrameControl = msgBuffalo.readUInt8();
        if ((apsFrameControl & ~(consts_2.INTERPAN_APS_FRAME_DELIVERY_MODE_MASK) & ~(consts_2.INTERPAN_APS_FRAME_SECURITY))
            !== consts_2.INTERPAN_APS_FRAME_CONTROL_NO_DELIVERY_MODE) {
            logger_1.logger.debug(`ezspMacFilterMatchMessageHandler INVALID InterPAN apsFrameControl "${apsFrameControl}".`, NS);
            return;
        }
        const messageType = (apsFrameControl & consts_2.INTERPAN_APS_FRAME_DELIVERY_MODE_MASK);
        let groupId = null;
        switch (messageType) {
            case enums_1.EmberInterpanMessageType.UNICAST:
            case enums_1.EmberInterpanMessageType.BROADCAST: {
                if (remainingLength < consts_2.INTERPAN_APS_UNICAST_BROADCAST_SIZE) {
                    logger_1.logger.debug(`ezspMacFilterMatchMessageHandler INVALID InterPAN length "${remainingLength}".`, NS);
                    return;
                }
                break;
            }
            case enums_1.EmberInterpanMessageType.MULTICAST: {
                if (remainingLength < consts_2.INTERPAN_APS_MULTICAST_SIZE) {
                    logger_1.logger.debug(`ezspMacFilterMatchMessageHandler INVALID InterPAN length "${remainingLength}".`, NS);
                    return;
                }
                groupId = msgBuffalo.readUInt16();
                break;
            }
            default: {
                logger_1.logger.debug(`ezspMacFilterMatchMessageHandler INVALID InterPAN messageType "${messageType}".`, NS);
                return;
            }
        }
        const clusterId = msgBuffalo.readUInt16();
        const profileId = msgBuffalo.readUInt16();
        const payload = msgBuffalo.readRest();
        if (profileId === consts_2.TOUCHLINK_PROFILE_ID && clusterId === cluster_1.default.touchlink.ID) {
            this.emit(EzspEvents.TOUCHLINK_MESSAGE, sourcePanId, sourceAddress, groupId, lastHopLqi, payload);
        }
    }
    /**
     * Callback
     * A callback invoked by the EmberZNet stack when the MAC has finished
     * transmitting a raw message.
     * @param status EMBER_SUCCESS if the transmission was successful, or EMBER_DELIVERY_FAILED if not
     */
    ezspRawTransmitCompleteHandler(status) {
        logger_1.logger.debug(`ezspRawTransmitCompleteHandler(): callback called with: [status=${enums_1.EmberStatus[status]}]`, NS);
    }
    /**
     * This function is useful to sleepy end devices. This function will set the
     * retry interval (in milliseconds) for mac data poll. This interval is the time
     * in milliseconds the device waits before retrying a data poll when a MAC level
     * data poll fails for any reason.
     * @param waitBeforeRetryIntervalMs uint32_t Time in milliseconds the device waits before retrying
     *        a data poll when a MAC level data poll fails for any reason.
     */
    async ezspSetMacPollFailureWaitTime(waitBeforeRetryIntervalMs) {
        this.startCommand(enums_2.EzspFrameID.SET_MAC_POLL_FAILURE_WAIT_TIME);
        this.buffalo.writeUInt32(waitBeforeRetryIntervalMs);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Sets the priority masks and related variables for choosing the best beacon.
     * @param param EmberBeaconClassificationParams * The beacon prioritization related variable
     * @returns The attempt to set the pramaters returns EMBER_SUCCESS
     */
    async ezspSetBeaconClassificationParams(param) {
        this.startCommand(enums_2.EzspFrameID.SET_BEACON_CLASSIFICATION_PARAMS);
        this.buffalo.writeEmberBeaconClassificationParams(param);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Gets the priority masks and related variables for choosing the best beacon.
     * @returns The attempt to get the pramaters returns EMBER_SUCCESS
     * @returns EmberBeaconClassificationParams * Gets the beacon prioritization related variable
     */
    async ezspGetBeaconClassificationParams() {
        this.startCommand(enums_2.EzspFrameID.GET_BEACON_CLASSIFICATION_PARAMS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const param = this.buffalo.readEmberBeaconClassificationParams();
        return [status, param];
    }
    //-----------------------------------------------------------------------------
    // Security Frames
    //-----------------------------------------------------------------------------
    /**
     * Sets the security state that will be used by the device when it forms or
     * joins the network. This call should not be used when restoring saved network
     * state via networkInit as this will result in a loss of security data and will
     * cause communication problems when the device re-enters the network.
     * @param state EmberInitialSecurityState * The security configuration to be set.
     * @returns The success or failure code of the operation.
     */
    async ezspSetInitialSecurityState(state) {
        this.startCommand(enums_2.EzspFrameID.SET_INITIAL_SECURITY_STATE);
        this.buffalo.writeEmberInitialSecurityState(state);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Gets the current security state that is being used by a device that is joined
     * in the network.
     * @returns The success or failure code of the operation.
     * @returns EmberCurrentSecurityState * The security configuration in use by the stack.
     */
    async ezspGetCurrentSecurityState() {
        this.startCommand(enums_2.EzspFrameID.GET_CURRENT_SECURITY_STATE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const state = this.buffalo.readEmberCurrentSecurityState();
        return [status, state];
    }
    /**
     * Exports a key from security manager based on passed context.
     * @param context sl_zb_sec_man_context_t * Metadata to identify the requested key.
     * @returns sl_zb_sec_man_key_t * Data to store the exported key in.
     * @returns sl_status_t * The success or failure code of the operation.
     */
    async ezspExportKey(context) {
        /**
         * Export a key from storage. Certain keys are indexed, while others are not, as described here.
         *
         * If context->core_key_type is..
         *
         * ..SL_ZB_SEC_MAN_KEY_TYPE_NETWORK, then context->key_index dictates whether to
         * export the current (active) network key (index 0) or the alternate network
         * key (index 1).
         *
         * ..SL_ZB_SEC_MAN_KEY_TYPE_TC_LINK, then context->eui64 is checked if
         * context->flags is set to ZB_SEC_MAN_FLAG_EUI_IS_VALID. If the EUI supplied
         * does not match the TC EUI stored on the local device (if it is known), then
         * an error is thrown.
         *
         * ..SL_ZB_SEC_MAN_KEY_TYPE_TC_LINK_WITH_TIMEOUT, then keys may be searched by
         * context->eui64 or context->key_index. context->flags determines how to search
         * (see ::sl_zigbee_sec_man_flags_t).
         *
         * ..SL_ZB_SEC_MAN_KEY_TYPE_APP_LINK, then keys may be searched by
         * context->eui64 or context->key_index. context->flags determines how to search
         * (see ::sl_zigbee_sec_man_flags_t).
         *
         * ..SL_ZB_SEC_MAN_KEY_TYPE_GREEN_POWER_PROXY_TABLE_KEY or
         * SL_ZB_SEC_MAN_KEY_TYPE_GREEN_POWER_SINK_TABLE_KEY, then context->key_index
         * dictates which key entry to export. These Green Power keys are indexed keys,
         * and there are EMBER_GP_PROXY_TABLE_SIZE/EMBER_GP_SINK_TABLE_SIZE many of them.
         *
         * For all other key types, both context->key_index and context->eui64 are not used.
         *
         * @param context sl_zb_sec_man_context_t* [IN/OUT] The context to set. The context dictates which key
         * type to export, which key_index (if applicable) into the relevant key
         * storage, which eui64 (if applicable), etc.
         * @param plaintext_key sl_zb_sec_man_key_t* [OUT] The key to export.
         *
         * @note The context->derived_type must be SL_ZB_SEC_MAN_DERIVED_KEY_TYPE_NONE.
         * Other values are ignored.
         *
         * @return SL_STATUS_OK upon success, a valid error code otherwise.
         */
        // NOTE: added for good measure
        if (context.coreKeyType === enums_1.SecManKeyType.INTERNAL) {
            logger_1.logger.error(`ezspImportKey cannot use INTERNAL key type.`, NS);
            return [null, enums_1.SLStatus.INVALID_PARAMETER];
        }
        this.startCommand(enums_2.EzspFrameID.EXPORT_KEY);
        this.buffalo.writeSecManContext(context);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const key = this.buffalo.readSecManKey();
        const status = this.buffalo.readUInt32();
        return [key, status];
    }
    /**
     * Imports a key into security manager based on passed context.
     * @param context sl_zb_sec_man_context_t * Metadata to identify where the imported key should be stored.
     * @param key sl_zb_sec_man_key_t * The key to be imported.
     * @returns The success or failure code of the operation.
     */
    async ezspImportKey(context, key) {
        /**
         * Import a key into storage. Certain keys are
         * indexed, while others are not, as described here.
         *
         * If context->core_key_type is..
         *
         * ..SL_ZB_SEC_MAN_KEY_TYPE_NETWORK, then context->key_index dictates whether to
         * import the current (active) network key (index 0) or the alternate network
         * key (index 1).
         *
         * ..SL_ZB_SEC_MAN_KEY_TYPE_TC_LINK_WITH_TIMEOUT, then context->eui64 must be
         * set. context->key_index is unused.
         *
         * ..SL_ZB_SEC_MAN_KEY_TYPE_APP_LINK, then context->key_index determines which
         * index in the persisted key table that the entry should be stored to.
         * context->eui64 must also be set.
         * If context->key_index is 0xFF, a suitable key index will be found (either one
         * storing an existing key with address of context->eui64, or an open entry),
         * and context->key_index will be updated with where the entry was stored.
         *
         * ..SL_ZB_SEC_MAN_KEY_TYPE_GREEN_POWER_PROXY_TABLE_KEY or
         * SL_ZB_SEC_MAN_KEY_TYPE_GREEN_POWER_SINK_TABLE_KEY, then context->key_index
         * dictates which key entry to import. These Green Power keys are indexed keys,
         * and there are EMBER_GP_PROXY_TABLE_SIZE/EMBER_GP_SINK_TABLE_SIZE many of them.
         *
         * For all other key types, both context->key_index and context->eui64 are not
         * used.
         *
         * @param context sl_zb_sec_man_context_t* [IN] The context to set. The context dictates which key type
         * to save, key_index (if applicable) into the relevant key storage, eui64 (if
         * applicable), etc.
         * @param plaintext_key sl_zb_sec_man_key_t*  [IN] The key to import.
         * @note The context->derived_type must be SL_ZB_SEC_MAN_DERIVED_KEY_TYPE_NONE,
         * else, an error will be thrown. Key derivations, which are used in crypto
         * operations, are performed using the ::sl_zb_sec_man_load_key_context routine.
         * @return SL_STATUS_OK upon success, a valid error code otherwise.
         */
        // NOTE: added for good measure
        if (context.coreKeyType === enums_1.SecManKeyType.INTERNAL) {
            logger_1.logger.error(`ezspImportKey cannot use INTERNAL key type.`, NS);
            return enums_1.SLStatus.INVALID_PARAMETER;
        }
        this.startCommand(enums_2.EzspFrameID.IMPORT_KEY);
        this.buffalo.writeSecManContext(context);
        this.buffalo.writeSecManKey(key);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt32();
        return status;
    }
    /**
     * Callback
     * A callback to inform the application that the Network Key has been updated
     * and the node has been switched over to use the new key. The actual key being
     * used is not passed up, but the sequence number is.
     * @param sequenceNumber uint8_t The sequence number of the new network key.
     */
    ezspSwitchNetworkKeyHandler(sequenceNumber) {
        logger_1.logger.debug(`ezspSwitchNetworkKeyHandler(): callback called with: [sequenceNumber=${sequenceNumber}]`, NS);
    }
    /**
     * This function searches through the Key Table and tries to find the entry that
     * matches the passed search criteria.
     * @param address The address to search for. Alternatively, all zeros may be passed in to search for the first empty entry.
     * @param linkKey This indicates whether to search for an entry that contains a link key or a master key.
     *        true means to search for an entry with a Link Key.
     * @returns uint8_t This indicates the index of the entry that matches the search
     * criteria. A value of 0xFF is returned if not matching entry is found.
     */
    async ezspFindKeyTableEntry(address, linkKey) {
        this.startCommand(enums_2.EzspFrameID.FIND_KEY_TABLE_ENTRY);
        this.buffalo.writeIeeeAddr(address);
        this.buffalo.writeUInt8(linkKey ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const index = this.buffalo.readUInt8();
        return index;
    }
    /**
     * This function sends an APS TransportKey command containing the current trust
     * center link key. The node to which the command is sent is specified via the
     * short and long address arguments.
     * @param destinationNodeId The short address of the node to which this command will be sent
     * @param destinationEui64 The long address of the node to which this command will be sent
     * @returns An EmberStatus value indicating success of failure of the operation
     */
    async ezspSendTrustCenterLinkKey(destinationNodeId, destinationEui64) {
        this.startCommand(enums_2.EzspFrameID.SEND_TRUST_CENTER_LINK_KEY);
        this.buffalo.writeUInt16(destinationNodeId);
        this.buffalo.writeIeeeAddr(destinationEui64);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * This function erases the data in the key table entry at the specified index.
     * If the index is invalid, false is returned.
     * @param index uint8_t This indicates the index of entry to erase.
     * @returns ::EMBER_SUCCESS if the index is valid and the key data was erased.
     *          ::EMBER_KEY_INVALID if the index is out of range for the size of the key table.
     */
    async ezspEraseKeyTableEntry(index) {
        this.startCommand(enums_2.EzspFrameID.ERASE_KEY_TABLE_ENTRY);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * This function clears the key table of the current network.
     * @returns ::EMBER_SUCCESS if the key table was successfully cleared.
     *          ::EMBER_INVALID_CALL otherwise.
     */
    async ezspClearKeyTable() {
        this.startCommand(enums_2.EzspFrameID.CLEAR_KEY_TABLE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * A function to request a Link Key from the Trust Center with another device on
     * the Network (which could be the Trust Center). A Link Key with the Trust
     * Center is possible but the requesting device cannot be the Trust Center. Link
     * Keys are optional in ZigBee Standard Security and thus the stack cannot know
     * whether the other device supports them. If EMBER_REQUEST_KEY_TIMEOUT is
     * non-zero on the Trust Center and the partner device is not the Trust Center,
     * both devices must request keys with their partner device within the time
     * period. The Trust Center only supports one outstanding key request at a time
     * and therefore will ignore other requests. If the timeout is zero then the
     * Trust Center will immediately respond and not wait for the second request.
     * The Trust Center will always immediately respond to requests for a Link Key
     * with it. Sleepy devices should poll at a higher rate until a response is
     * received or the request times out. The success or failure of the request is
     * returned via ezspZigbeeKeyEstablishmentHandler(...)
     * @param partner This is the IEEE address of the partner device that will share the link key.
     * @returns The success or failure of sending the request.
     * This is not the final result of the attempt. ezspZigbeeKeyEstablishmentHandler(...) will return that.
     */
    async ezspRequestLinkKey(partner) {
        this.startCommand(enums_2.EzspFrameID.REQUEST_LINK_KEY);
        this.buffalo.writeIeeeAddr(partner);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Requests a new link key from the Trust Center. This function starts by
     * sending a Node Descriptor request to the Trust Center to verify its R21+
     * stack version compliance. A Request Key message will then be sent, followed
     * by a Verify Key Confirm message.
     * @param maxAttempts uint8_t The maximum number of attempts a node should make when sending the Node Descriptor,
     *        Request Key, and Verify Key Confirm messages. The number of attempts resets for each message type sent
     *        (e.g., if maxAttempts is 3, up to 3 Node Descriptors are sent, up to 3 Request Keys, and up to 3 Verify Key Confirm messages are sent).
     * @returns The success or failure of sending the request.
     * If the Node Descriptor is successfully transmitted, ezspZigbeeKeyEstablishmentHandler(...)
     * will be called at a later time with a final status result.
     */
    async ezspUpdateTcLinkKey(maxAttempts) {
        this.startCommand(enums_2.EzspFrameID.UPDATE_TC_LINK_KEY);
        this.buffalo.writeUInt8(maxAttempts);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * This is a callback that indicates the success or failure of an attempt to establish a key with a partner device.
     * @param partner This is the IEEE address of the partner that the device successfully established a key with.
     *        This value is all zeros on a failure.
     * @param status This is the status indicating what was established or why the key establishment failed.
     */
    ezspZigbeeKeyEstablishmentHandler(partner, status) {
        logger_1.logger.debug(`ezspZigbeeKeyEstablishmentHandler(): callback called with: [partner=${partner}], [status=${enums_1.EmberKeyStatus[status]}]`, NS);
        // NOTE: For security reasons, any valid `partner` (not wildcard) that return with a status=TC_REQUESTER_VERIFY_KEY_TIMEOUT
        //       are kicked off the network for posing a risk, unless HA devices allowed (as opposed to Z3)
        //       and always if status=TC_REQUESTER_VERIFY_KEY_FAILURE
    }
    /**
     * Clear all of the transient link keys from RAM.
     */
    async ezspClearTransientLinkKeys() {
        this.startCommand(enums_2.EzspFrameID.CLEAR_TRANSIENT_LINK_KEYS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Retrieve information about the current and alternate network key, excluding their contents.
     * @returns Success or failure of retrieving network key info.
     * @returns sl_zb_sec_man_network_key_info_t * Information about current and alternate network keys.
     */
    async ezspGetNetworkKeyInfo() {
        /**
         * Retrieve information about the network key and alternate network key.
         * It will not retrieve the actual network key contents.
         *
         * @param network_key_info sl_zb_sec_man_network_key_info_t* [OUT] The network key info struct used to store network key metadata,
         * containing information about whether the current and next network keys are set, and the
         * sequence numbers associated with each key.
         *
         * @return sl_status_t SL_STATUS_OK
         *
         */
        this.startCommand(enums_2.EzspFrameID.GET_NETWORK_KEY_INFO);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt32();
        const networkKeyInfo = this.buffalo.readSecManNetworkKeyInfo();
        return [status, networkKeyInfo];
    }
    /**
     * Retrieve metadata about an APS link key.  Does not retrieve contents.
     * @param context_in sl_zb_sec_man_context_t * Context used to input information about key.
     * @returns EUI64 associated with this APS link key
     * @returns sl_zb_sec_man_aps_key_metadata_t * Metadata about the referenced key.
     * @returns sl_status_t * Status of metadata retrieval operation.
     */
    async ezspGetApsKeyInfo(context_in) {
        /**
         * Retrieve metadata about an APS key.
         * It does not retrieve the actual key contents.
         *
         * @param context sl_zb_sec_man_context_t* [IN/OUT] The context to use to look up a key entry. If the
         *  user calls this function with the ::ZB_SEC_MAN_FLAG_KEY_INDEX_IS_VALID bit
         *  set in the context->flag field, then the key_index field in the context
         *  argument dictates which entry to retrieve. For keys with timeout and
         *  application link keys, the key_index retrieves the indexed entry into the
         *  respective table. Upon success, the eui64 field in the context is updated.
         *  If the user calls this function with the
         *  ::ZB_SEC_MAN_FLAG_EUI_IS_VALID bit set in the
         *  context->flag field, then the eui64 field in the context argument
         *  dictates which entry to retrieve. If the context->core_key_type argument is
         *  set to SL_ZB_SEC_MAN_KEY_TYPE_NETWORK, an error is returned as network keys
         *  are not tied to any specific EUI.
         *  If neither the ::ZB_SEC_MAN_FLAG_KEY_INDEX_IS_VALID bit nor the
         *  ::ZB_SEC_MAN_FLAG_EUI_IS_VALID bit is set in context->flags, then an error
         *  will be returned by this function.
         *  Upon success in fetching a key, the other fields in this argument are
         *  updated (e.g. a successful search by key_index will update the euii64
         *  field).
         *
         * @param key_data sl_zb_sec_man_aps_key_metadata_t* [OUT] Metadata to fill in.
         *
         * @return SL_STATUS_OK if successful, SL_STATUS_NOT_FOUND if
         *  the key_index or eui64 does not result in a found entry,
         *  SL_STATUS_INVALID_TYPE if the core key type is not an APS layer key (e.g.
         *  SL_ZB_SEC_MAN_KEY_TYPE_NETWORK), or SL_STATUS_INVALID_MODE if core_key_type
         *  is SL_ZB_SEC_MAN_KEY_TYPE_TC_LINK and the initial security state does not
         *  indicate the a preconfigured key has been set (that is, both
         *  EMBER_HAVE_PRECONFIGURED_KEY and
         *  EMBER_GET_PRECONFIGURED_KEY_FROM_INSTALL_CODE have not been set in the
         *  initial security state).
         */
        this.startCommand(enums_2.EzspFrameID.GET_APS_KEY_INFO);
        this.buffalo.writeSecManContext(context_in);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const eui = this.buffalo.readIeeeAddr();
        const keyData = this.buffalo.readSecManAPSKeyMetadata();
        const status = this.buffalo.readUInt32();
        return [eui, keyData, status];
    }
    /**
     * Import an application link key into the key table.
     * @param index uint8_t Index where this key is to be imported to.
     * @param address EUI64 this key is associated with.
     * @param plaintextKey sl_zb_sec_man_key_t * The key data to be imported.
     * @returns Status of key import operation.
     */
    async ezspImportLinkKey(index, address, plaintextKey) {
        /**
         * Import a link key, or SL_ZB_SEC_MAN_KEY_TYPE_APP_LINK key, into storage.
         *
         * @param index uint8_t [IN] The index to set or overwrite in the key table for keys of
         * type SL_ZB_SEC_MAN_KEY_TYPE_APP_LINK.  If index is set to 0xFF (255), then
         * the key will either overwrite whichever key table entry has an EUI of address
         * (if one exists) or write to the first available key table entry.  The index
         * that the key was placed into will not be returned by this API.
         * @param address EmberEUI64 [IN] The EUI belonging to the key.
         * @param plaintext_key sl_zb_sec_man_key_t* [IN] A pointer to the key to import.
         *
         * @return SL_STATUS_OK upon success, a valid error code otherwise.
         *
         */
        this.startCommand(enums_2.EzspFrameID.IMPORT_LINK_KEY);
        this.buffalo.writeUInt8(index);
        this.buffalo.writeIeeeAddr(address);
        this.buffalo.writeSecManKey(plaintextKey);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt32();
        return status;
    }
    /**
     * Export the link key at given index from the key table.
     * @param uint8_t  Index of key to export.
     * @returns EUI64 associated with the exported key.
     * @returns sl_zb_sec_man_key_t * The exported key.
     * @returns sl_zb_sec_man_aps_key_metadata_t * Metadata about the key.
     * @returns sl_status_t * Status of key export operation.
     */
    async ezspExportLinkKeyByIndex(index) {
        /**
         * Export an APS link key by index.
         *
         * @param index uint8_t
         * @param address EmberEUI64
         * @param plaintext_key sl_zb_sec_man_key_t*
         * @param key_data sl_zb_sec_man_aps_key_metadata_t*
         */
        this.startCommand(enums_2.EzspFrameID.EXPORT_LINK_KEY_BY_INDEX);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const eui = this.buffalo.readIeeeAddr();
        const plaintextKey = this.buffalo.readSecManKey();
        const keyData = this.buffalo.readSecManAPSKeyMetadata();
        const status = this.buffalo.readUInt32();
        return [eui, plaintextKey, keyData, status];
    }
    /**
     * Export the link key associated with the given EUI from the key table.
     * @param eui EUI64 associated with the key to export.
     * @returns sl_zb_sec_man_key_t * The exported key.
     * @returns uint8_t * Key index of the exported key.
     * @returns sl_zb_sec_man_aps_key_metadata_t * Metadata about the key.
     * @returns sl_status_t * Status of key export operation.
     */
    async ezspExportLinkKeyByEui(eui) {
        /**
         * Search through the Key table to find an entry that has the same EUI address as the passed value.
         * If NULL is passed in for the address then it finds the first unused entry and sets the index in the context.
         * It is valid to pass in NULL to plaintext_key or key_data in case the index of the referenced key is desired
         * but not its value or other metadata.
         * @param eui EmberEUI64
         * @param context sl_zb_sec_man_context_t*
         * @param plaintext_key sl_zb_sec_man_key_t*
         * @param key_data sl_zb_sec_man_aps_key_metadata_t*
         */
        this.startCommand(enums_2.EzspFrameID.EXPORT_LINK_KEY_BY_EUI);
        this.buffalo.writeIeeeAddr(eui);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const plaintextKey = this.buffalo.readSecManKey();
        const index = this.buffalo.readUInt8();
        const keyData = this.buffalo.readSecManAPSKeyMetadata();
        const status = this.buffalo.readUInt32();
        return [plaintextKey, index, keyData, status];
    }
    /**
     * Check whether a key context can be used to load a valid key.
     * @param context sl_zb_sec_man_context_t * Context struct to check the validity of.
     * @returns Validity of the checked context.
     */
    async ezspCheckKeyContext(context) {
        /**
         * Check that the passed key exists and can be successfully loaded.
         * This function does not actually load the context, but only checks that it can be loaded.
         *
         * @param context sl_zb_sec_man_context_t* [IN] The context to check for validity. The fields that must be set depend
         * on the key type set in the context, as enough information is needed to identify the key.
         *
         * @return sl_status_t SL_STATUS_OK upon success, SL_STATUS_NOT_FOUND otherwise.
         */
        this.startCommand(enums_2.EzspFrameID.CHECK_KEY_CONTEXT);
        this.buffalo.writeSecManContext(context);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt32();
        return status;
    }
    /**
     * Import a transient link key.
     * @param eui64 EUI64 associated with this transient key.
     * @param plaintextKey sl_zb_sec_man_key_t * The key to import.
     * @param sl_zigbee_sec_man_flags_t Flags associated with this transient key.
     * @returns Status of key import operation.
     */
    async ezspImportTransientKey(eui64, plaintextKey, flags) {
        /**
         * @brief Add a transient or temporary key entry to key storage.
         * A key entry added with this API is timed out after
         * ::EMBER_TRANSIENT_KEY_TIMEOUT_S seconds, unless the key entry was added using
         * the Network Creator Security component, in which case the key will time out
         * after the longer between
         * ::EMBER_AF_PLUGIN_NETWORK_CREATOR_SECURITY_NETWORK_OPEN_TIME_S seconds and
         * ::EMBER_TRANSIENT_KEY_TIMEOUT_S seconds.
         *
         * @param eui64 [IN] An EmberEUI64 to import.
         * @param plaintext_key [IN] A sl_zb_sec_man_key_t* to import.
         * @param flags [IN]
         *
         * @return See ::zb_sec_man_import_transient_key for return information.
         */
        this.startCommand(enums_2.EzspFrameID.IMPORT_TRANSIENT_KEY);
        this.buffalo.writeIeeeAddr(eui64);
        this.buffalo.writeSecManKey(plaintextKey);
        this.buffalo.writeUInt8(flags);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt32();
        return status;
    }
    /**
     * Export a transient link key from a given table index.
     * @param uint8_t Index to export from.
     * @returns sl_zb_sec_man_context_t * Context struct for export operation.
     * @returns sl_zb_sec_man_key_t * The exported key.
     * @returns sl_zb_sec_man_aps_key_metadata_t * Metadata about the key.
     * @returns sl_status_t * Status of key export operation.
     */
    async ezspExportTransientKeyByIndex(index) {
        /**
         * Search for a transient, or temporary, key
         * entry from key storage by key index.
         *
         * @param index [IN] The key_index to fetch.
         * @param context sl_zb_sec_man_context_t* [OUT] The context about the key, filled in upon success.
         * @param plaintext_key sl_zb_sec_man_key_t* [OUT] If the security configuration allows for it, filled in
         *  with the key contents upon success.
         * @param key_data sl_zb_sec_man_aps_key_metadata_t* [OUT] Filled in with metadata about the key upon success.
         *
         * @return sl_status_t SL_STATUS_OK upon success, SL_STATUS_NOT_FOUND otherwise.
         */
        this.startCommand(enums_2.EzspFrameID.EXPORT_TRANSIENT_KEY_BY_INDEX);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const context = this.buffalo.readSecManContext();
        const plaintextKey = this.buffalo.readSecManKey();
        const keyData = this.buffalo.readSecManAPSKeyMetadata();
        const status = this.buffalo.readUInt32();
        return [context, plaintextKey, keyData, status];
    }
    /**
     * Export a transient link key associated with a given EUI64
     * @param eui Index to export from.
     * @returns sl_zb_sec_man_context_t * Context struct for export operation.
     * @returns sl_zb_sec_man_key_t * The exported key.
     * @returns sl_zb_sec_man_aps_key_metadata_t * Metadata about the key.
     * @returns sl_status_t * Status of key export operation.
     */
    async ezspExportTransientKeyByEui(eui) {
        /**
         * Search for a transient, or temporary, key
         * entry from key storage by EUI.
         *
         * @param eui64 [IN] The EUI to search for.
         * @param context sl_zb_sec_man_context_t* [OUT] The context about the key, filled in upon success.
         * @param plaintext_key sl_zb_sec_man_key_t* [OUT] If the security configuration allows for it, filled in
         *  with the key contents upon success.
         * @param key_data sl_zb_sec_man_aps_key_metadata_t* [OUT] Filled in with metadata about the key upon success.
         *
         * @return sl_status_t SL_STATUS_OK upon success, SL_STATUS_NOT_FOUND otherwise.
         */
        this.startCommand(enums_2.EzspFrameID.EXPORT_TRANSIENT_KEY_BY_EUI);
        this.buffalo.writeIeeeAddr(eui);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const context = this.buffalo.readSecManContext();
        const plaintextKey = this.buffalo.readSecManKey();
        const keyData = this.buffalo.readSecManAPSKeyMetadata();
        const status = this.buffalo.readUInt32();
        return [context, plaintextKey, keyData, status];
    }
    //-----------------------------------------------------------------------------
    // Trust Center Frames
    //-----------------------------------------------------------------------------
    /**
     * Callback
     * The NCP used the trust center behavior policy to decide whether to allow a
     * new node to join the network. The Host cannot change the current decision,
     * but it can change the policy for future decisions using the setPolicy
     * command.
     * @param newNodeId The Node Id of the node whose status changed
     * @param newNodeEui64 The EUI64 of the node whose status changed.
     * @param status The status of the node: Secure Join/Rejoin, Unsecure Join/Rejoin, Device left.
     * @param policyDecision An EmberJoinDecision reflecting the decision made.
     * @param parentOfNewNodeId The parent of the node whose status has changed.
     */
    ezspTrustCenterJoinHandler(newNodeId, newNodeEui64, status, policyDecision, parentOfNewNodeId) {
        logger_1.logger.debug(`ezspTrustCenterJoinHandler(): callback called with: [newNodeId=${newNodeId}], [newNodeEui64=${newNodeEui64}], `
            + `[status=${enums_1.EmberDeviceUpdate[status]}], [policyDecision=${enums_1.EmberJoinDecision[policyDecision]}], `
            + `[parentOfNewNodeId=${parentOfNewNodeId}]`, NS);
        // NOTE: this is mostly just passing stuff up to Z2M, so use only one emit for all, let adapter do the rest, no parsing needed
        this.emit(EzspEvents.TRUST_CENTER_JOIN, newNodeId, newNodeEui64, status, policyDecision, parentOfNewNodeId);
    }
    /**
     * This function broadcasts a new encryption key, but does not tell the nodes in
     * the network to start using it. To tell nodes to switch to the new key, use
     * ezspBroadcastNetworkKeySwitch(). This is only valid for the Trust
     * Center/Coordinator. It is up to the application to determine how quickly to
     * send the Switch Key after sending the alternate encryption key.
     * @param key EmberKeyData * An optional pointer to a 16-byte encryption key (EMBER_ENCRYPTION_KEY_SIZE).
     *        An all zero key may be passed in, which will cause the stack to randomly generate a new key.
     * @returns EmberStatus value that indicates the success or failure of the command.
     */
    async ezspBroadcastNextNetworkKey(key) {
        this.startCommand(enums_2.EzspFrameID.BROADCAST_NEXT_NETWORK_KEY);
        this.buffalo.writeEmberKeyData(key);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * This function broadcasts a switch key message to tell all nodes to change to
     * the sequence number of the previously sent Alternate Encryption Key.
     * @returns EmberStatus value that indicates the success or failure of the
     * command.
     */
    async ezspBroadcastNetworkKeySwitch() {
        this.startCommand(enums_2.EzspFrameID.BROADCAST_NETWORK_KEY_SWITCH);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * This routine processes the passed chunk of data and updates the hash context
     * based on it. If the 'finalize' parameter is not set, then the length of the
     * data passed in must be a multiple of 16. If the 'finalize' parameter is set
     * then the length can be any value up 1-16, and the final hash value will be
     * calculated.
     * @param context EmberAesMmoHashContext * The hash context to update.
     * @param finalize This indicates whether the final hash value should be calculated
     * @param data uint8_t * The data to hash.
     * @returns The result of the operation
     * @returns EmberAesMmoHashContext * The updated hash context.
     */
    async ezspAesMmoHash(context, finalize, data) {
        this.startCommand(enums_2.EzspFrameID.AES_MMO_HASH);
        this.buffalo.writeEmberAesMmoHashContext(context);
        this.buffalo.writeUInt8(finalize ? 1 : 0);
        this.buffalo.writePayload(data);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const returnContext = this.buffalo.readEmberAesMmoHashContext();
        return [status, returnContext];
    }
    /**
     * This command sends an APS remove device using APS encryption to the
     * destination indicating either to remove itself from the network, or one of
     * its children.
     * @param destShort The node ID of the device that will receive the message
     * @param destLong The long address (EUI64) of the device that will receive the message.
     * @param targetLong The long address (EUI64) of the device to be removed.
     * @returns An EmberStatus value indicating success, or the reason for failure
     */
    async ezspRemoveDevice(destShort, destLong, targetLong) {
        this.startCommand(enums_2.EzspFrameID.REMOVE_DEVICE);
        this.buffalo.writeUInt16(destShort);
        this.buffalo.writeIeeeAddr(destLong);
        this.buffalo.writeIeeeAddr(targetLong);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * This command will send a unicast transport key message with a new NWK key to
     * the specified device. APS encryption using the device's existing link key
     * will be used.
     * @param destShort The node ID of the device that will receive the message
     * @param destLong The long address (EUI64) of the device that will receive the message.
     * @param key EmberKeyData * The NWK key to send to the new device.
     * @returns An EmberStatus value indicating success, or the reason for failure
     */
    async ezspUnicastNwkKeyUpdate(destShort, destLong, key) {
        this.startCommand(enums_2.EzspFrameID.UNICAST_NWK_KEY_UPDATE);
        this.buffalo.writeUInt16(destShort);
        this.buffalo.writeIeeeAddr(destLong);
        this.buffalo.writeEmberKeyData(key);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    //-----------------------------------------------------------------------------
    // Certificate Based Key Exchange (CBKE) Frames
    //-----------------------------------------------------------------------------
    /**
     * This call starts the generation of the ECC Ephemeral Public/Private key pair.
     * When complete it stores the private key. The results are returned via
     * ezspGenerateCbkeKeysHandler().
     */
    async ezspGenerateCbkeKeys() {
        this.startCommand(enums_2.EzspFrameID.GENERATE_CBKE_KEYS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * A callback by the Crypto Engine indicating that a new ephemeral
     * public/private key pair has been generated. The public/private key pair is
     * stored on the NCP, but only the associated public key is returned to the
     * host. The node's associated certificate is also returned.
     * @param status The result of the CBKE operation.
     * @param ephemeralPublicKey EmberPublicKeyData * The generated ephemeral public key.
     */
    ezspGenerateCbkeKeysHandler(status, ephemeralPublicKey) {
        logger_1.logger.debug(`ezspGenerateCbkeKeysHandler(): callback called with: [status=${enums_1.EmberStatus[status]}], [ephemeralPublicKey=${ephemeralPublicKey}]`, NS);
    }
    /**
     * Calculates the SMAC verification keys for both the initiator and responder
     * roles of CBKE using the passed parameters and the stored public/private key
     * pair previously generated with ezspGenerateKeysRetrieveCert(). It also stores
     * the unverified link key data in temporary storage on the NCP until the key
     * establishment is complete.
     * @param amInitiator The role of this device in the Key Establishment protocol.
     * @param partnerCertificate EmberCertificateData * The key establishment partner's implicit certificate.
     * @param partnerEphemeralPublicKey EmberPublicKeyData * The key establishment partner's ephemeral public key
     */
    async ezspCalculateSmacs(amInitiator, partnerCertificate, partnerEphemeralPublicKey) {
        this.startCommand(enums_2.EzspFrameID.CALCULATE_SMACS);
        this.buffalo.writeUInt8(amInitiator ? 1 : 0);
        this.buffalo.writeEmberCertificateData(partnerCertificate);
        this.buffalo.writeEmberPublicKeyData(partnerEphemeralPublicKey);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * A callback to indicate that the NCP has finished calculating the Secure
     * Message Authentication Codes (SMAC) for both the initiator and responder. The
     * associated link key is kept in temporary storage until the host tells the NCP
     * to store or discard the key via emberClearTemporaryDataMaybeStoreLinkKey().
     * @param status The Result of the CBKE operation.
     * @param initiatorSmac EmberSmacData * The calculated value of the initiator's SMAC
     * @param responderSmac EmberSmacData * The calculated value of the responder's SMAC
     */
    ezspCalculateSmacsHandler(status, initiatorSmac, responderSmac) {
        logger_1.logger.debug(`ezspCalculateSmacsHandler(): callback called with: [status=${enums_1.EmberStatus[status]}], [initiatorSmac=${initiatorSmac}], `
            + `[responderSmac=${responderSmac}]`, NS);
    }
    /**
     * This call starts the generation of the ECC 283k1 curve Ephemeral
     * Public/Private key pair. When complete it stores the private key. The results
     * are returned via ezspGenerateCbkeKeysHandler283k1().
     */
    async ezspGenerateCbkeKeys283k1() {
        this.startCommand(enums_2.EzspFrameID.GENERATE_CBKE_KEYS283K1);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * A callback by the Crypto Engine indicating that a new 283k1 ephemeral
     * public/private key pair has been generated. The public/private key pair is
     * stored on the NCP, but only the associated public key is returned to the
     * host. The node's associated certificate is also returned.
     * @param status The result of the CBKE operation.
     * @param ephemeralPublicKey EmberPublicKey283k1Data * The generated ephemeral public key.
     */
    ezspGenerateCbkeKeysHandler283k1(status, ephemeralPublicKey) {
        logger_1.logger.debug(`ezspGenerateCbkeKeysHandler283k1(): callback called with: [status=${enums_1.EmberStatus[status]}], `
            + `[ephemeralPublicKey=${ephemeralPublicKey}]`, NS);
    }
    /**
     * Calculates the SMAC verification keys for both the initiator and responder
     * roles of CBKE for the 283k1 ECC curve using the passed parameters and the
     * stored public/private key pair previously generated with
     * ezspGenerateKeysRetrieveCert283k1(). It also stores the unverified link key
     * data in temporary storage on the NCP until the key establishment is complete.
     * @param amInitiator The role of this device in the Key Establishment protocol.
     * @param partnerCertificate EmberCertificate283k1Data * The key establishment partner's implicit certificate.
     * @param partnerEphemeralPublicKey EmberPublicKey283k1Data * The key establishment partner's ephemeral public key
     */
    async ezspCalculateSmacs283k1(amInitiator, partnerCertificate, partnerEphemeralPublicKey) {
        this.startCommand(enums_2.EzspFrameID.CALCULATE_SMACS283K1);
        this.buffalo.writeUInt8(amInitiator ? 1 : 0);
        this.buffalo.writeEmberCertificate283k1Data(partnerCertificate);
        this.buffalo.writeEmberPublicKey283k1Data(partnerEphemeralPublicKey);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * A callback to indicate that the NCP has finished calculating the Secure
     * Message Authentication Codes (SMAC) for both the initiator and responder for
     * the CBKE 283k1 Library. The associated link key is kept in temporary storage
     * until the host tells the NCP to store or discard the key via
     * emberClearTemporaryDataMaybeStoreLinkKey().
     * @param status The Result of the CBKE operation.
     * @param initiatorSmac EmberSmacData * The calculated value of the initiator's SMAC
     * @param responderSmac EmberSmacData * The calculated value of the responder's SMAC
     */
    ezspCalculateSmacsHandler283k1(status, initiatorSmac, responderSmac) {
        logger_1.logger.debug(`ezspCalculateSmacsHandler283k1(): callback called with: [status=${enums_1.EmberStatus[status]}], [initiatorSmac=${initiatorSmac}], `
            + `[responderSmac=${responderSmac}]`, NS);
    }
    /**
     * Clears the temporary data associated with CBKE and the key establishment,
     * most notably the ephemeral public/private key pair. If storeLinKey is true it
     * moves the unverified link key stored in temporary storage into the link key
     * table. Otherwise it discards the key.
     * @param storeLinkKey A bool indicating whether to store (true) or discard (false) the unverified link
     *        key derived when ezspCalculateSmacs() was previously called.
     */
    async ezspClearTemporaryDataMaybeStoreLinkKey(storeLinkKey) {
        this.startCommand(enums_2.EzspFrameID.CLEAR_TEMPORARY_DATA_MAYBE_STORE_LINK_KEY);
        this.buffalo.writeUInt8(storeLinkKey ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Clears the temporary data associated with CBKE and the key establishment,
     * most notably the ephemeral public/private key pair. If storeLinKey is true it
     * moves the unverified link key stored in temporary storage into the link key
     * table. Otherwise it discards the key.
     * @param storeLinkKey A bool indicating whether to store (true) or discard (false) the unverified link
     *        key derived when ezspCalculateSmacs() was previously called.
     */
    async ezspClearTemporaryDataMaybeStoreLinkKey283k1(storeLinkKey) {
        this.startCommand(enums_2.EzspFrameID.CLEAR_TEMPORARY_DATA_MAYBE_STORE_LINK_KEY283K1);
        this.buffalo.writeUInt8(storeLinkKey ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Retrieves the certificate installed on the NCP.
     * @returns EmberCertificateData * The locally installed certificate.
     */
    async ezspGetCertificate() {
        this.startCommand(enums_2.EzspFrameID.GET_CERTIFICATE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const localCert = this.buffalo.readEmberCertificateData();
        return [status, localCert];
    }
    /**
     * Retrieves the 283k certificate installed on the NCP.
     * @returns EmberCertificate283k1Data * The locally installed certificate.
     */
    async ezspGetCertificate283k1() {
        this.startCommand(enums_2.EzspFrameID.GET_CERTIFICATE283K1);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const localCert = this.buffalo.readEmberCertificate283k1Data();
        return [status, localCert];
    }
    /**
     * LEGACY FUNCTION: This functionality has been replaced by a single bit in the
     * EmberApsFrame, EMBER_APS_OPTION_DSA_SIGN. Devices wishing to send signed
     * messages should use that as it requires fewer function calls and message
     * buffering. The dsaSignHandler response is still called when
     * EMBER_APS_OPTION_DSA_SIGN is used. However, this function is still supported.
     * This function begins the process of signing the passed message contained
     * within the messageContents array. If no other ECC operation is going on, it
     * will immediately return with EMBER_OPERATION_IN_PROGRESS to indicate the
     * start of ECC operation. It will delay a period of time to let APS retries
     * take place, but then it will shut down the radio and consume the CPU
     * processing until the signing is complete. This may take up to 1 second. The
     * signed message will be returned in the dsaSignHandler response. Note that the
     * last byte of the messageContents passed to this function has special
     * significance. As the typical use case for DSA signing is to sign the ZCL
     * payload of a DRLC Report Event Status message in SE 1.0, there is often both
     * a signed portion (ZCL payload) and an unsigned portion (ZCL header). The last
     * byte in the content of messageToSign is therefore used as a special indicator
     * to signify how many bytes of leading data in the array should be excluded
     * from consideration during the signing process. If the signature needs to
     * cover the entire array (all bytes except last one), the caller should ensure
     * that the last byte of messageContents is 0x00. When the signature operation
     * is complete, this final byte will be replaced by the signature type indicator
     * (0x01 for ECDSA signatures), and the actual signature will be appended to the
     * original contents after this byte.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The message contents for which to create a signature.
     *        Per above notes, this may include a leading portion of data not included in the signature,
     *        in which case the last byte of this array should be set to the index of the first byte
     *        to be considered for signing. Otherwise, the last byte of messageContents should be 0x00
     *        to indicate that a signature should occur across the entire contents.
     * @returns EMBER_OPERATION_IN_PROGRESS if the stack has queued up the operation
     * for execution. EMBER_INVALID_CALL if the operation can't be performed in this
     * context, possibly because another ECC operation is pending.
     */
    async ezspDsaSign(messageContents) {
        this.startCommand(enums_2.EzspFrameID.DSA_SIGN);
        this.buffalo.writePayload(messageContents);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * The handler that returns the results of the signing operation. On success,
     * the signature will be appended to the original message (including the
     * signature type indicator that replaced the startIndex field for the signing)
     * and both are returned via this callback.
     * @param status The result of the DSA signing operation.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t *The message and attached which includes the original message and the appended signature.
     */
    ezspDsaSignHandler(status, messageContents) {
        logger_1.logger.debug(`ezspDsaSignHandler(): callback called with: [status=${enums_1.EmberStatus[status]}], [messageContents=${messageContents.toString('hex')}]`, NS);
    }
    /**
     * Verify that signature of the associated message digest was signed by the
     * private key of the associated certificate.
     * @param digest EmberMessageDigest * The AES-MMO message digest of the signed data.
     *        If dsaSign command was used to generate the signature for this data, the final byte (replaced by signature type of 0x01)
     *        in the messageContents array passed to dsaSign is included in the hash context used for the digest calculation.
     * @param signerCertificate EmberCertificateData * The certificate of the signer. Note that the signer's certificate and the verifier's
     *        certificate must both be issued by the same Certificate Authority, so they should share the same CA Public Key.
     * @param receivedSig EmberSignatureData * The signature of the signed data.
     */
    async ezspDsaVerify(digest, signerCertificate, receivedSig) {
        this.startCommand(enums_2.EzspFrameID.DSA_VERIFY);
        this.buffalo.writeEmberMessageDigest(digest);
        this.buffalo.writeEmberCertificateData(signerCertificate);
        this.buffalo.writeEmberSignatureData(receivedSig);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * This callback is executed by the stack when the DSA verification has
     * completed and has a result. If the result is EMBER_SUCCESS, the signature is
     * valid. If the result is EMBER_SIGNATURE_VERIFY_FAILURE then the signature is
     * invalid. If the result is anything else then the signature verify operation
     * failed and the validity is unknown.
     * @param status The result of the DSA verification operation.
     */
    ezspDsaVerifyHandler(status) {
        logger_1.logger.debug(`ezspDsaVerifyHandler(): callback called with: [status=${enums_1.EmberStatus[status]}]`, NS);
    }
    /**
     * Verify that signature of the associated message digest was signed by the
     * private key of the associated certificate.
     * @param digest EmberMessageDigest * The AES-MMO message digest of the signed data.
     *        If dsaSign command was used to generate the signature for this data, the final byte (replaced by signature type of 0x01)
     *        in the messageContents array passed to dsaSign is included in the hash context used for the digest calculation.
     * @param signerCertificate EmberCertificate283k1Data * The certificate of the signer. Note that the signer's certificate and the verifier's
     *        certificate must both be issued by the same Certificate Authority, so they should share the same CA Public Key.
     * @param receivedSig EmberSignature283k1Data * The signature of the signed data.
     */
    async ezspDsaVerify283k1(digest, signerCertificate, receivedSig) {
        this.startCommand(enums_2.EzspFrameID.DSA_VERIFY283K1);
        this.buffalo.writeEmberMessageDigest(digest);
        this.buffalo.writeEmberCertificate283k1Data(signerCertificate);
        this.buffalo.writeEmberSignature283k1Data(receivedSig);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Sets the device's CA public key, local certificate, and static private key on
     * the NCP associated with this node.
     * @param caPublic EmberPublicKeyData * The Certificate Authority's public key.
     * @param myCert EmberCertificateData * The node's new certificate signed by the CA.
     * @param myKey EmberPrivateKeyData *The node's new static private key.
     */
    async ezspSetPreinstalledCbkeData(caPublic, myCert, myKey) {
        this.startCommand(enums_2.EzspFrameID.SET_PREINSTALLED_CBKE_DATA);
        this.buffalo.writeEmberPublicKeyData(caPublic);
        this.buffalo.writeEmberCertificateData(myCert);
        this.buffalo.writeEmberPrivateKeyData(myKey);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Sets the device's 283k1 curve CA public key, local certificate, and static
     * private key on the NCP associated with this node.
     * @returns Status of operation
     */
    async ezspSavePreinstalledCbkeData283k1() {
        this.startCommand(enums_2.EzspFrameID.SAVE_PREINSTALLED_CBKE_DATA283K1);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    //-----------------------------------------------------------------------------
    // Mfglib Frames
    //-----------------------------------------------------------------------------
    /**
     * Activate use of mfglib test routines and enables the radio receiver to report
     * packets it receives to the mfgLibRxHandler() callback. These packets will not
     * be passed up with a CRC failure. All other mfglib functions will return an
     * error until the mfglibStart() has been called
     * @param rxCallback true to generate a mfglibRxHandler callback when a packet is received.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspMfglibStart(rxCallback) {
        this.startCommand(enums_2.EzspFrameID.MFGLIB_START);
        this.buffalo.writeUInt8(rxCallback ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Deactivate use of mfglib test routines; restores the hardware to the state it
     * was in prior to mfglibStart() and stops receiving packets started by
     * mfglibStart() at the same time.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async mfglibEnd() {
        this.startCommand(enums_2.EzspFrameID.MFGLIB_END);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Starts transmitting an unmodulated tone on the currently set channel and
     * power level. Upon successful return, the tone will be transmitting. To stop
     * transmitting tone, application must call mfglibStopTone(), allowing it the
     * flexibility to determine its own criteria for tone duration (time, event,
     * etc.)
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async mfglibStartTone() {
        this.startCommand(enums_2.EzspFrameID.MFGLIB_START_TONE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Stops transmitting tone started by mfglibStartTone().
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async mfglibStopTone() {
        this.startCommand(enums_2.EzspFrameID.MFGLIB_STOP_TONE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Starts transmitting a random stream of characters. This is so that the radio
     * modulation can be measured.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async mfglibStartStream() {
        this.startCommand(enums_2.EzspFrameID.MFGLIB_START_STREAM);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Stops transmitting a random stream of characters started by
     * mfglibStartStream().
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async mfglibStopStream() {
        this.startCommand(enums_2.EzspFrameID.MFGLIB_STOP_STREAM);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Sends a single packet consisting of the following bytes: packetLength,
     * packetContents[0], ... , packetContents[packetLength - 3], CRC[0], CRC[1].
     * The total number of bytes sent is packetLength + 1. The radio replaces the
     * last two bytes of packetContents[] with the 16-bit CRC for the packet.
     * @param packetLength uint8_t The length of the packetContents parameter in bytes. Must be greater than 3 and less than 123.
     * @param packetContents uint8_t * The packet to send. The last two bytes will be replaced with the 16-bit CRC.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async mfglibSendPacket(packetContents) {
        this.startCommand(enums_2.EzspFrameID.MFGLIB_SEND_PACKET);
        this.buffalo.writePayload(packetContents);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Sets the radio channel. Calibration occurs if this is the first time the
     * channel has been used.
     * @param channel uint8_t The channel to switch to. Valid values are 11 - 26.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async mfglibSetChannel(channel) {
        this.startCommand(enums_2.EzspFrameID.MFGLIB_SET_CHANNEL);
        this.buffalo.writeUInt8(channel);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Returns the current radio channel, as previously set via mfglibSetChannel().
     * @returns uint8_t The current channel.
     */
    async mfglibGetChannel() {
        this.startCommand(enums_2.EzspFrameID.MFGLIB_GET_CHANNEL);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const channel = this.buffalo.readUInt8();
        return channel;
    }
    /**
     * First select the transmit power mode, and then include a method for selecting
     * the radio transmit power. The valid power settings depend upon the specific
     * radio in use. Ember radios have discrete power settings, and then requested
     * power is rounded to a valid power setting; the actual power output is
     * available to the caller via mfglibGetPower().
     * @param txPowerMode uint16_t Power mode. Refer to txPowerModes in stack/include/ember-types.h for possible values.
     * @param power int8_t Power in units of dBm. Refer to radio data sheet for valid range.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async mfglibSetPower(txPowerMode, power) {
        this.startCommand(enums_2.EzspFrameID.MFGLIB_SET_POWER);
        this.buffalo.writeUInt16(txPowerMode);
        this.buffalo.writeUInt8(power);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Returns the current radio power setting, as previously set via mfglibSetPower().
     * @returns int8_t Power in units of dBm. Refer to radio data sheet for valid range.
     */
    async mfglibGetPower() {
        this.startCommand(enums_2.EzspFrameID.MFGLIB_GET_POWER);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const power = this.buffalo.readUInt8();
        return power;
    }
    /**
     * Callback
     * A callback indicating a packet with a valid CRC has been received.
     * @param linkQuality uint8_t The link quality observed during the reception
     * @param rssi int8_t The energy level (in units of dBm) observed during the reception.
     * @param packetLength uint8_t The length of the packetContents parameter in bytes. Will be greater than 3 and less than 123.
     * @param packetContents uint8_t * The received packet (last 2 bytes are not FCS / CRC and may be discarded)
     */
    ezspMfglibRxHandler(linkQuality, rssi, packetLength, packetContents) {
        logger_1.logger.debug(`ezspMfglibRxHandler(): callback called with: [linkQuality=${linkQuality}], [rssi=${rssi}], `
            + `[packetLength=${packetLength}], [packetContents=${packetContents}]`, NS);
    }
    //-----------------------------------------------------------------------------
    // Bootloader Frames
    //-----------------------------------------------------------------------------
    /**
     * Quits the current application and launches the standalone bootloader (if
     * installed) The function returns an error if the standalone bootloader is not
     * present
     * @param mode uint8_t Controls the mode in which the standalone bootloader will run. See the app. note for full details.
     *        Options are: STANDALONE_BOOTLOADER_NORMAL_MODE: Will listen for an over-the-air image transfer on the current
     *        channel with current power settings. STANDALONE_BOOTLOADER_RECOVERY_MODE: Will listen for an over-the-air image
     *        transfer on the default channel with default power settings. Both modes also allow an image transfer to begin
     *        with XMODEM over the serial protocol's Bootloader Frame.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspLaunchStandaloneBootloader(mode) {
        this.startCommand(enums_2.EzspFrameID.LAUNCH_STANDALONE_BOOTLOADER);
        this.buffalo.writeUInt8(mode);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Transmits the given bootload message to a neighboring node using a specific
     * 802.15.4 header that allows the EmberZNet stack as well as the bootloader to
     * recognize the message, but will not interfere with other ZigBee stacks.
     * @param broadcast If true, the destination address and pan id are both set to the broadcast address.
     * @param destEui64 The EUI64 of the target node. Ignored if the broadcast field is set to true.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The multicast message.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSendBootloadMessage(broadcast, destEui64, messageContents) {
        this.startCommand(enums_2.EzspFrameID.SEND_BOOTLOAD_MESSAGE);
        this.buffalo.writeUInt8(broadcast ? 1 : 0);
        this.buffalo.writeIeeeAddr(destEui64);
        this.buffalo.writePayload(messageContents);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Detects if the standalone bootloader is installed, and if so returns the
     * installed version. If not return 0xffff. A returned version of 0x1234 would
     * indicate version 1.2 build 34. Also return the node's version of PLAT, MICRO
     * and PHY.
     * @returns uint16_t BOOTLOADER_INVALID_VERSION if the standalone bootloader is not present,
     *          or the version of the installed standalone bootloader.
     * @returns uint8_t * The value of PLAT on the node
     * @returns uint8_t * The value of MICRO on the node
     * @returns uint8_t * The value of PHY on the node
     */
    async ezspGetStandaloneBootloaderVersionPlatMicroPhy() {
        this.startCommand(enums_2.EzspFrameID.GET_STANDALONE_BOOTLOADER_VERSION_PLAT_MICRO_PHY);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const bootloader_version = this.buffalo.readUInt16();
        const nodePlat = this.buffalo.readUInt8();
        const nodeMicro = this.buffalo.readUInt8();
        const nodePhy = this.buffalo.readUInt8();
        return [bootloader_version, nodePlat, nodeMicro, nodePhy];
    }
    /**
     * Callback
     * A callback invoked by the EmberZNet stack when a bootload message is
     * received.
     * @param longId The EUI64 of the sending node.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the message.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during the reception.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t *The bootload message that was sent.
     */
    ezspIncomingBootloadMessageHandler(longId, lastHopLqi, lastHopRssi, messageContents) {
        logger_1.logger.debug(`ezspIncomingBootloadMessageHandler(): callback called with: [longId=${longId}], [lastHopLqi=${lastHopLqi}], `
            + `[lastHopRssi=${lastHopRssi}], [messageContents=${messageContents.toString('hex')}]`, NS);
    }
    /**
     * Callback
     * A callback invoked by the EmberZNet stack when the MAC has finished
     * transmitting a bootload message.
     * @param status An EmberStatus value of EMBER_SUCCESS if an ACK was received from the destination
     *        or EMBER_DELIVERY_FAILED if no ACK was received.
     * @param messageLength uint8_t  The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The message that was sent.
     */
    ezspBootloadTransmitCompleteHandler(status, messageContents) {
        logger_1.logger.debug(`ezspBootloadTransmitCompleteHandler(): callback called with: [status=${enums_1.EmberStatus[status]}], `
            + `[messageContents=${messageContents.toString('hex')}]`, NS);
    }
    /**
     * Perform AES encryption on plaintext using key.
     * @param uint8_t * 16 bytes of plaintext.
     * @param uint8_t * The 16-byte encryption key to use.
     * @returns uint8_t * 16 bytes of ciphertext.
     */
    async ezspAesEncrypt(plaintext, key) {
        this.startCommand(enums_2.EzspFrameID.AES_ENCRYPT);
        this.buffalo.writeListUInt8(plaintext);
        this.buffalo.writeListUInt8(key);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const ciphertext = this.buffalo.readListUInt8({ length: 16 });
        return ciphertext;
    }
    //-----------------------------------------------------------------------------
    // ZLL Frames
    //-----------------------------------------------------------------------------
    /**
     * A consolidation of ZLL network operations with similar signatures;
     * specifically, forming and joining networks or touch-linking.
     * @param networkInfo EmberZllNetwork * Information about the network.
     * @param op Operation indicator.
     * @param radioTxPower int8_t Radio transmission power.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspZllNetworkOps(networkInfo, op, radioTxPower) {
        this.startCommand(enums_2.EzspFrameID.ZLL_NETWORK_OPS);
        this.buffalo.writeEmberZllNetwork(networkInfo);
        this.buffalo.writeUInt8(op);
        this.buffalo.writeUInt8(radioTxPower);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * This call will cause the device to setup the security information used in its
     * network. It must be called prior to forming, starting, or joining a network.
     * @param networkKey EmberKeyData * ZLL Network key.
     * @param securityState EmberZllInitialSecurityState * Initial security state of the network.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspZllSetInitialSecurityState(networkKey, securityState) {
        this.startCommand(enums_2.EzspFrameID.ZLL_SET_INITIAL_SECURITY_STATE);
        this.buffalo.writeEmberKeyData(networkKey);
        this.buffalo.writeEmberZllInitialSecurityState(securityState);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * This call will update ZLL security token information. Unlike
     * emberZllSetInitialSecurityState, this can be called while a network is
     * already established.
     * @param securityState EmberZllInitialSecurityState * Security state of the network.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspZllSetSecurityStateWithoutKey(securityState) {
        this.startCommand(enums_2.EzspFrameID.ZLL_SET_SECURITY_STATE_WITHOUT_KEY);
        this.buffalo.writeEmberZllInitialSecurityState(securityState);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * This call will initiate a ZLL network scan on all the specified channels.
     * @param channelMask uint32_t The range of channels to scan.
     * @param radioPowerForScan int8_t The radio output power used for the scan requests.
     * @param nodeType The node type of the local device.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspZllStartScan(channelMask, radioPowerForScan, nodeType) {
        this.startCommand(enums_2.EzspFrameID.ZLL_START_SCAN);
        this.buffalo.writeUInt32(channelMask);
        this.buffalo.writeUInt8(radioPowerForScan);
        this.buffalo.writeUInt8(nodeType);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * This call will change the mode of the radio so that the receiver is on for a
     * specified amount of time when the device is idle.
     * @param durationMs uint32_t The duration in milliseconds to leave the radio on.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspZllSetRxOnWhenIdle(durationMs) {
        this.startCommand(enums_2.EzspFrameID.ZLL_SET_RX_ON_WHEN_IDLE);
        this.buffalo.writeUInt32(durationMs);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * This call is fired when a ZLL network scan finds a ZLL network.
     * @param networkInfo EmberZllNetwork * Information about the network.
     * @param isDeviceInfoNull Used to interpret deviceInfo field.
     * @param deviceInfo EmberZllDeviceInfoRecord * Device specific information.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the message.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during reception.
     */
    ezspZllNetworkFoundHandler(networkInfo, isDeviceInfoNull, deviceInfo, lastHopLqi, lastHopRssi) {
        logger_1.logger.debug(`ezspZllNetworkFoundHandler(): callback called with: [networkInfo=${networkInfo}], [isDeviceInfoNull=${isDeviceInfoNull}], `
            + `[deviceInfo=${deviceInfo}], [lastHopLqi=${lastHopLqi}], [lastHopRssi=${lastHopRssi}]`, NS);
    }
    /**
     * Callback
     * This call is fired when a ZLL network scan is complete.
     * @param status Status of the operation.
     */
    ezspZllScanCompleteHandler(status) {
        logger_1.logger.debug(`ezspZllScanCompleteHandler(): callback called with: [status=${enums_1.EmberStatus[status]}]`, NS);
    }
    /**
     * Callback
     * This call is fired when network and group addresses are assigned to a remote
     * mode in a network start or network join request.
     * @param addressInfo EmberZllAddressAssignment * Address assignment information.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the message.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during reception.
     */
    ezspZllAddressAssignmentHandler(addressInfo, lastHopLqi, lastHopRssi) {
        logger_1.logger.debug(`ezspZllAddressAssignmentHandler(): callback called with: [addressInfo=${addressInfo}], [lastHopLqi=${lastHopLqi}], `
            + `[lastHopRssi=${lastHopRssi}]`, NS);
    }
    /**
     * Callback
     * This call is fired when the device is a target of a touch link.
     * @param networkInfo EmberZllNetwork * Information about the network.
     */
    ezspZllTouchLinkTargetHandler(networkInfo) {
        logger_1.logger.debug(`ezspZllTouchLinkTargetHandler(): callback called with: [networkInfo=${networkInfo}]`, NS);
    }
    /**
     * Get the ZLL tokens.
     * @returns EmberTokTypeStackZllData * Data token return value.
     * @returns EmberTokTypeStackZllSecurity * Security token return value.
     */
    async ezspZllGetTokens() {
        this.startCommand(enums_2.EzspFrameID.ZLL_GET_TOKENS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const data = this.buffalo.readEmberTokTypeStackZllData();
        const security = this.buffalo.readEmberTokTypeStackZllSecurity();
        return [data, security];
    }
    /**
     * Set the ZLL data token.
     * @param data EmberTokTypeStackZllData * Data token to be set.
     */
    async ezspZllSetDataToken(data) {
        this.startCommand(enums_2.EzspFrameID.ZLL_SET_DATA_TOKEN);
        this.buffalo.writeEmberTokTypeStackZllData(data);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Set the ZLL data token bitmask to reflect the ZLL network state.
     */
    async ezspZllSetNonZllNetwork() {
        this.startCommand(enums_2.EzspFrameID.ZLL_SET_NON_ZLL_NETWORK);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Is this a ZLL network?
     * @returns ZLL network?
     */
    async ezspIsZllNetwork() {
        this.startCommand(enums_2.EzspFrameID.IS_ZLL_NETWORK);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const isZllNetwork = this.buffalo.readUInt8() === 1 ? true : false;
        return isZllNetwork;
    }
    /**
     * This call sets the radio's default idle power mode.
     * @param mode The power mode to be set.
     */
    async ezspZllSetRadioIdleMode(mode) {
        this.startCommand(enums_2.EzspFrameID.ZLL_SET_RADIO_IDLE_MODE);
        this.buffalo.writeUInt8(mode);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * This call gets the radio's default idle power mode.
     * @returns uint8_t The current power mode.
     */
    async ezspZllGetRadioIdleMode() {
        this.startCommand(enums_2.EzspFrameID.ZLL_GET_RADIO_IDLE_MODE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const radioIdleMode = this.buffalo.readUInt8();
        return radioIdleMode;
    }
    /**
     * This call sets the default node type for a factory new ZLL device.
     * @param nodeType The node type to be set.
     */
    async ezspSetZllNodeType(nodeType) {
        this.startCommand(enums_2.EzspFrameID.SET_ZLL_NODE_TYPE);
        this.buffalo.writeUInt8(nodeType);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * This call sets additional capability bits in the ZLL state.
     * @param uint16_t A mask with the bits to be set or cleared.
     */
    async ezspSetZllAdditionalState(state) {
        this.startCommand(enums_2.EzspFrameID.SET_ZLL_ADDITIONAL_STATE);
        this.buffalo.writeUInt16(state);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Is there a ZLL (Touchlink) operation in progress?
     * @returns ZLL operation in progress? false on error
     */
    async ezspZllOperationInProgress() {
        this.startCommand(enums_2.EzspFrameID.ZLL_OPERATION_IN_PROGRESS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const zllOperationInProgress = this.buffalo.readUInt8() === 1 ? true : false;
        return zllOperationInProgress;
    }
    /**
     * Is the ZLL radio on when idle mode is active?
     * @returns ZLL radio on when idle mode is active? false on error
     */
    async ezspZllRxOnWhenIdleGetActive() {
        this.startCommand(enums_2.EzspFrameID.ZLL_RX_ON_WHEN_IDLE_GET_ACTIVE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const zllRxOnWhenIdleGetActive = this.buffalo.readUInt8() === 1 ? true : false;
        return zllRxOnWhenIdleGetActive;
    }
    /**
     * Informs the ZLL API that application scanning is complete
     */
    async ezspZllScanningComplete() {
        this.startCommand(enums_2.EzspFrameID.ZLL_SCANNING_COMPLETE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Get the primary ZLL (touchlink) channel mask.
     * @returns uint32_t The primary ZLL channel mask
     */
    async ezspGetZllPrimaryChannelMask() {
        this.startCommand(enums_2.EzspFrameID.GET_ZLL_PRIMARY_CHANNEL_MASK);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const zllPrimaryChannelMask = this.buffalo.readUInt32();
        return zllPrimaryChannelMask;
    }
    /**
     * Get the secondary ZLL (touchlink) channel mask.
     * @returns uint32_t The secondary ZLL channel mask
     */
    async ezspGetZllSecondaryChannelMask() {
        this.startCommand(enums_2.EzspFrameID.GET_ZLL_SECONDARY_CHANNEL_MASK);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const zllSecondaryChannelMask = this.buffalo.readUInt32();
        return zllSecondaryChannelMask;
    }
    /**
     * Set the primary ZLL (touchlink) channel mask
     * @param uint32_t The primary ZLL channel mask
     */
    async ezspSetZllPrimaryChannelMask(zllPrimaryChannelMask) {
        this.startCommand(enums_2.EzspFrameID.SET_ZLL_PRIMARY_CHANNEL_MASK);
        this.buffalo.writeUInt32(zllPrimaryChannelMask);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Set the secondary ZLL (touchlink) channel mask.
     * @param uint32_t The secondary ZLL channel mask
     */
    async ezspSetZllSecondaryChannelMask(zllSecondaryChannelMask) {
        this.startCommand(enums_2.EzspFrameID.SET_ZLL_SECONDARY_CHANNEL_MASK);
        this.buffalo.writeUInt32(zllSecondaryChannelMask);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Clear ZLL stack tokens.
     */
    async ezspZllClearTokens() {
        this.startCommand(enums_2.EzspFrameID.ZLL_CLEAR_TOKENS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    //-----------------------------------------------------------------------------
    // WWAH Frames
    //-----------------------------------------------------------------------------
    /**
     * Sets whether to use parent classification when processing beacons during a
     * join or rejoin. Parent classification considers whether a received beacon
     * indicates trust center connectivity and long uptime on the network
     * @param enabled Enable or disable parent classification
     */
    async ezspSetParentClassificationEnabled(enabled) {
        this.startCommand(enums_2.EzspFrameID.SET_PARENT_CLASSIFICATION_ENABLED);
        this.buffalo.writeUInt8(enabled ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Gets whether to use parent classification when processing beacons during a
     * join or rejoin. Parent classification considers whether a received beacon
     * indicates trust center connectivity and long uptime on the network
     * @returns Enable or disable parent classification
     */
    async ezspGetParentClassificationEnabled() {
        this.startCommand(enums_2.EzspFrameID.GET_PARENT_CLASSIFICATION_ENABLED);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const enabled = this.buffalo.readUInt8() === 1 ? true : false;
        return enabled;
    }
    /**
     * sets the device uptime to be long or short
     * @param hasLongUpTime if the uptime is long or not
     */
    async ezspSetLongUpTime(hasLongUpTime) {
        this.startCommand(enums_2.EzspFrameID.SET_LONG_UP_TIME);
        this.buffalo.writeUInt8(hasLongUpTime ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * sets the hub connectivity to be true or false
     * @param connected if the hub is connected or not
     */
    async ezspSetHubConnectivity(connected) {
        this.startCommand(enums_2.EzspFrameID.SET_HUB_CONNECTIVITY);
        this.buffalo.writeUInt8(connected ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * checks if the device uptime is long or short
     * @returns if the uptime is long or not
     */
    async ezspIsUpTimeLong() {
        this.startCommand(enums_2.EzspFrameID.IS_UP_TIME_LONG);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const hasLongUpTime = this.buffalo.readUInt8() === 1 ? true : false;
        return hasLongUpTime;
    }
    /**
     * checks if the hub is connected or not
     * @returns if the hub is connected or not
     */
    async ezspIsHubConnected() {
        this.startCommand(enums_2.EzspFrameID.IS_HUB_CONNECTED);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const isHubConnected = this.buffalo.readUInt8() === 1 ? true : false;
        return isHubConnected;
    }
    //-----------------------------------------------------------------------------
    // Green Power Frames
    //-----------------------------------------------------------------------------
    /**
     * Update the GP Proxy table based on a GP pairing.
     * @param options uint32_t The options field of the GP Pairing command.
     * @param addr EmberGpAddress * The target GPD.
     * @param commMode uint8_t The communication mode of the GP Sink.
     * @param sinkNetworkAddress uint16_t The network address of the GP Sink.
     * @param sinkGroupId uint16_t The group ID of the GP Sink.
     * @param assignedAlias uint16_t The alias assigned to the GPD.
     * @param sinkIeeeAddress uint8_t * The IEEE address of the GP Sink.
     * @param gpdKey EmberKeyData * The key to use for the target GPD.
     * @param gpdSecurityFrameCounter uint32_t The GPD security frame counter.
     * @param forwardingRadius uint8_t The forwarding radius.
     * @returns Whether a GP Pairing has been created or not.
     */
    async ezspGpProxyTableProcessGpPairing(options, addr, commMode, sinkNetworkAddress, sinkGroupId, assignedAlias, sinkIeeeAddress, gpdKey, gpdSecurityFrameCounter, forwardingRadius) {
        this.startCommand(enums_2.EzspFrameID.GP_PROXY_TABLE_PROCESS_GP_PAIRING);
        this.buffalo.writeUInt32(options);
        this.buffalo.writeEmberGpAddress(addr);
        this.buffalo.writeUInt8(commMode);
        this.buffalo.writeUInt16(sinkNetworkAddress);
        this.buffalo.writeUInt16(sinkGroupId);
        this.buffalo.writeUInt16(assignedAlias);
        this.buffalo.writeIeeeAddr(sinkIeeeAddress);
        this.buffalo.writeEmberKeyData(gpdKey);
        this.buffalo.writeUInt32(gpdSecurityFrameCounter);
        this.buffalo.writeUInt8(forwardingRadius);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const gpPairingAdded = this.buffalo.readUInt8() === 1 ? true : false;
        return gpPairingAdded;
    }
    /**
     * Adds/removes an entry from the GP Tx Queue.
     * @param action The action to perform on the GP TX queue (true to add, false to remove).
     * @param useCca Whether to use ClearChannelAssessment when transmitting the GPDF.
     * @param addr EmberGpAddress * The Address of the destination GPD.
     * @param gpdCommandId uint8_t The GPD command ID to send.
     * @param gpdAsdu uint8_t * The GP command payload.
     * @param gpepHandle uint8_t The handle to refer to the GPDF.
     * @param gpTxQueueEntryLifetimeMs uint16_t How long to keep the GPDF in the TX Queue.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspDGpSend(action, useCca, addr, gpdCommandId, gpdAsdu, gpepHandle, gpTxQueueEntryLifetimeMs) {
        this.startCommand(enums_2.EzspFrameID.D_GP_SEND);
        this.buffalo.writeUInt8(action ? 1 : 0);
        this.buffalo.writeUInt8(useCca ? 1 : 0);
        this.buffalo.writeEmberGpAddress(addr);
        this.buffalo.writeUInt8(gpdCommandId);
        this.buffalo.writePayload(gpdAsdu);
        this.buffalo.writeUInt8(gpepHandle);
        this.buffalo.writeUInt16(gpTxQueueEntryLifetimeMs);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Callback
     * A callback to the GP endpoint to indicate the result of the GPDF
     * transmission.
     * @param status An EmberStatus value indicating success or the reason for failure.
     * @param gpepHandle uint8_t The handle of the GPDF.
     */
    ezspDGpSentHandler(status, gpepHandle) {
        logger_1.logger.debug(`ezspDGpSentHandler(): callback called with: [status=${enums_1.EmberStatus[status]}], [gpepHandle=${gpepHandle}]`, NS);
    }
    /**
     * Callback
     * A callback invoked by the ZigBee GP stack when a GPDF is received.
     * @param status The status of the GPDF receive.
     * @param gpdLink uint8_t The gpdLink value of the received GPDF.
     * @param sequenceNumber uint8_t The GPDF sequence number.
     * @param addr EmberGpAddress *The address of the source GPD.
     * @param gpdfSecurityLevel The security level of the received GPDF.
     * @param gpdfSecurityKeyType The securityKeyType used to decrypt/authenticate the incoming GPDF.
     * @param autoCommissioning Whether the incoming GPDF had the auto-commissioning bit set.
     * @param bidirectionalInfo uint8_t Bidirectional information represented in bitfields,
     *        where bit0 holds the rxAfterTx of incoming gpdf and bit1 holds if tx queue is available for outgoing gpdf.
     * @param gpdSecurityFrameCounter uint32_t The security frame counter of the incoming GDPF.
     * @param gpdCommandId uint8_t The gpdCommandId of the incoming GPDF.
     * @param mic uint32_t The received MIC of the GPDF.
     * @param proxyTableIndex uint8_tThe proxy table index of the corresponding proxy table entry to the incoming GPDF.
     * @param gpdCommandPayload uint8_t * The GPD command payload.
     */
    ezspGpepIncomingMessageHandler(status, gpdLink, sequenceNumber, addr, gpdfSecurityLevel, gpdfSecurityKeyType, autoCommissioning, bidirectionalInfo, gpdSecurityFrameCounter, gpdCommandId, mic, proxyTableIndex, gpdCommandPayload) {
        logger_1.logger.debug(`ezspGpepIncomingMessageHandler(): callback called with: [status=${enums_1.EmberStatus[status]}], [gpdLink=${gpdLink}], `
            + `[sequenceNumber=${sequenceNumber}], [addr=${JSON.stringify(addr)}], [gpdfSecurityLevel=${enums_1.EmberGpSecurityLevel[gpdfSecurityLevel]}], `
            + `[gpdfSecurityKeyType=${enums_1.EmberGpKeyType[gpdfSecurityKeyType]}], [autoCommissioning=${autoCommissioning}], `
            + `[bidirectionalInfo=${bidirectionalInfo}], [gpdSecurityFrameCounter=${gpdSecurityFrameCounter}], [gpdCommandId=${gpdCommandId}], `
            + `[mic=${mic}], [proxyTableIndex=${proxyTableIndex}], [gpdCommandPayload=${gpdCommandPayload.toString('hex')}]`, NS);
        if (addr.applicationId === enums_1.EmberGpApplicationId.IEEE_ADDRESS) {
            // XXX: don't bother parsing for upstream for now, since it will be rejected
            logger_1.logger.error(`<=== [GP] Received IEEE address type in message. Support not implemented upstream. Dropping.`, NS);
            return;
        }
        let commandIdentifier = cluster_1.default.greenPower.commands.notification.ID;
        if (gpdCommandId === 0xE0) {
            if (!gpdCommandPayload.length) {
                // XXX: seem to be receiving duplicate commissioningNotification from some devices, second one with empty payload?
                //      this will mess with the process no doubt, so dropping them
                return;
            }
            commandIdentifier = cluster_1.default.greenPower.commands.commissioningNotification.ID;
        }
        this.emit(EzspEvents.GREENPOWER_MESSAGE, sequenceNumber, commandIdentifier, addr.sourceId, gpdSecurityFrameCounter, gpdCommandId, gpdCommandPayload, gpdLink);
    }
    /**
     * Retrieves the proxy table entry stored at the passed index.
     * @param proxyIndex uint8_t The index of the requested proxy table entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberGpProxyTableEntry * An EmberGpProxyTableEntry struct containing a copy of the requested proxy entry.
     */
    async ezspGpProxyTableGetEntry(proxyIndex) {
        this.startCommand(enums_2.EzspFrameID.GP_PROXY_TABLE_GET_ENTRY);
        this.buffalo.writeUInt8(proxyIndex);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const entry = this.buffalo.readEmberGpProxyTableEntry();
        return [status, entry];
    }
    /**
     * Finds the index of the passed address in the gp table.
     * @param addr EmberGpAddress * The address to search for
     * @returns uint8_t The index, or 0xFF for not found
     */
    async ezspGpProxyTableLookup(addr) {
        this.startCommand(enums_2.EzspFrameID.GP_PROXY_TABLE_LOOKUP);
        this.buffalo.writeEmberGpAddress(addr);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const index = this.buffalo.readUInt8();
        return index;
    }
    /**
     * Retrieves the sink table entry stored at the passed index.
     * @param sinkIndex uint8_t The index of the requested sink table entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberGpSinkTableEntry * An EmberGpSinkTableEntry struct containing a copy of the requested sink entry.
     */
    async ezspGpSinkTableGetEntry(sinkIndex) {
        this.startCommand(enums_2.EzspFrameID.GP_SINK_TABLE_GET_ENTRY);
        this.buffalo.writeUInt8(sinkIndex);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const entry = this.buffalo.readEmberGpSinkTableEntry();
        return [status, entry];
    }
    /**
     * Finds the index of the passed address in the gp table.
     * @param addr EmberGpAddress *The address to search for.
     * @returns uint8_t The index, or 0xFF for not found
     */
    async ezspGpSinkTableLookup(addr) {
        this.startCommand(enums_2.EzspFrameID.GP_SINK_TABLE_LOOKUP);
        this.buffalo.writeEmberGpAddress(addr);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const index = this.buffalo.readUInt8();
        return index;
    }
    /**
     * Retrieves the sink table entry stored at the passed index.
     * @param sinkIndex uint8_t The index of the requested sink table entry.
     * @param entry EmberGpSinkTableEntry * An EmberGpSinkTableEntry struct containing a copy of the sink entry to be updated.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspGpSinkTableSetEntry(sinkIndex, entry) {
        this.startCommand(enums_2.EzspFrameID.GP_SINK_TABLE_SET_ENTRY);
        this.buffalo.writeUInt8(sinkIndex);
        this.buffalo.writeEmberGpSinkTableEntry(entry);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Removes the sink table entry stored at the passed index.
     * @param uint8_t The index of the requested sink table entry.
     */
    async ezspGpSinkTableRemoveEntry(sinkIndex) {
        this.startCommand(enums_2.EzspFrameID.GP_SINK_TABLE_REMOVE_ENTRY);
        this.buffalo.writeUInt8(sinkIndex);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Finds or allocates a sink entry
     * @param addr EmberGpAddress * An EmberGpAddress struct containing a copy of the gpd address to be found.
     * @returns uint8_t An index of found or allocated sink or 0xFF if failed.
     */
    async ezspGpSinkTableFindOrAllocateEntry(addr) {
        this.startCommand(enums_2.EzspFrameID.GP_SINK_TABLE_FIND_OR_ALLOCATE_ENTRY);
        this.buffalo.writeEmberGpAddress(addr);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const index = this.buffalo.readUInt8();
        return index;
    }
    /**
     * Clear the entire sink table
     */
    async ezspGpSinkTableClearAll() {
        this.startCommand(enums_2.EzspFrameID.GP_SINK_TABLE_CLEAR_ALL);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Iniitializes Sink Table
     */
    async ezspGpSinkTableInit() {
        this.startCommand(enums_2.EzspFrameID.GP_SINK_TABLE_INIT);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Sets security framecounter in the sink table
     * @param index uint8_t Index to the Sink table
     * @param sfc uint32_t Security Frame Counter
     */
    async ezspGpSinkTableSetSecurityFrameCounter(index, sfc) {
        this.startCommand(enums_2.EzspFrameID.GP_SINK_TABLE_SET_SECURITY_FRAME_COUNTER);
        this.buffalo.writeUInt8(index);
        this.buffalo.writeUInt32(sfc);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Puts the GPS in commissioning mode.
     * @param uint8_t commissioning options
     * @param uint16_t gpm address for security.
     * @param uint16_t gpm address for pairing.
     * @param uint8_t sink endpoint.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspGpSinkCommission(options, gpmAddrForSecurity, gpmAddrForPairing, sinkEndpoint) {
        this.startCommand(enums_2.EzspFrameID.GP_SINK_COMMISSION);
        this.buffalo.writeUInt8(options);
        this.buffalo.writeUInt16(gpmAddrForSecurity);
        this.buffalo.writeUInt16(gpmAddrForPairing);
        this.buffalo.writeUInt8(sinkEndpoint);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Clears all entries within the translation table.
     */
    async ezspGpTranslationTableClear() {
        this.startCommand(enums_2.EzspFrameID.GP_TRANSLATION_TABLE_CLEAR);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Return number of active entries in sink table.
     * @returns uint8_t Number of active entries in sink table. 0 if error.
     */
    async ezspGpSinkTableGetNumberOfActiveEntries() {
        this.startCommand(enums_2.EzspFrameID.GP_SINK_TABLE_GET_NUMBER_OF_ACTIVE_ENTRIES);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const number_of_entries = this.buffalo.readUInt8();
        return number_of_entries;
    }
    //-----------------------------------------------------------------------------
    // Token Interface Frames
    //-----------------------------------------------------------------------------
    /**
     * Gets the total number of tokens.
     * @returns uint8_t Total number of tokens.
     */
    async ezspGetTokenCount() {
        this.startCommand(enums_2.EzspFrameID.GET_TOKEN_COUNT);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const count = this.buffalo.readUInt8();
        return count;
    }
    /**
     * Gets the token information for a single token at provided index
     * @param index uint8_t Index of the token in the token table for which information is needed.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberTokenInfo * Token information.
     */
    async ezspGetTokenInfo(index) {
        this.startCommand(enums_2.EzspFrameID.GET_TOKEN_INFO);
        this.buffalo.writeUInt8(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const tokenInfo = this.buffalo.readEmberTokenInfo();
        return [status, tokenInfo];
    }
    /**
     * Gets the token data for a single token with provided key
     * @param token uint32_t Key of the token in the token table for which data is needed.
     * @param index uint32_t Index in case of the indexed token.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberTokenData * Token Data
     */
    async ezspGetTokenData(token, index) {
        this.startCommand(enums_2.EzspFrameID.GET_TOKEN_DATA);
        this.buffalo.writeUInt32(token);
        this.buffalo.writeUInt32(index);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        const tokenData = this.buffalo.readEmberTokenData();
        return [status, tokenData];
    }
    /**
     * Sets the token data for a single token with provided key
     * @param token uint32_t Key of the token in the token table for which data is to be set.
     * @param index uint32_t Index in case of the indexed token.
     * @param EmberTokenData * Token Data
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspSetTokenData(token, index, tokenData) {
        this.startCommand(enums_2.EzspFrameID.SET_TOKEN_DATA);
        this.buffalo.writeUInt32(token);
        this.buffalo.writeUInt32(index);
        this.buffalo.writeEmberTokenData(tokenData);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Reset the node by calling halReboot.
     */
    async ezspResetNode() {
        this.startCommand(enums_2.EzspFrameID.RESET_NODE);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
    /**
     * Run GP security test vectors.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    async ezspGpSecurityTestVectors() {
        this.startCommand(enums_2.EzspFrameID.GP_SECURITY_TEST_VECTORS);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
        const status = this.buffalo.readUInt8();
        return status;
    }
    /**
     * Factory reset all configured zigbee tokens
     * @param excludeOutgoingFC Exclude network and APS outgoing frame counter tokens.
     * @param excludeBootCounter Exclude stack boot counter token.
     */
    async ezspTokenFactoryReset(excludeOutgoingFC, excludeBootCounter) {
        this.startCommand(enums_2.EzspFrameID.TOKEN_FACTORY_RESET);
        this.buffalo.writeUInt8(excludeOutgoingFC ? 1 : 0);
        this.buffalo.writeUInt8(excludeBootCounter ? 1 : 0);
        const sendStatus = await this.sendCommand();
        if (sendStatus !== enums_1.EzspStatus.SUCCESS) {
            throw new Error(enums_1.EzspStatus[sendStatus]);
        }
    }
}
exports.Ezsp = Ezsp;
//# sourceMappingURL=ezsp.js.map