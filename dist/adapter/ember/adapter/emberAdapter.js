"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmberAdapter = void 0;
/* istanbul ignore file */
const es6_1 = __importDefault(require("fast-deep-equal/es6"));
const mz_1 = require("mz");
const serialPortUtils_1 = __importDefault(require("../../serialPortUtils"));
const socketPortUtils_1 = __importDefault(require("../../socketPortUtils"));
const utils_1 = require("../../../utils");
const __1 = require("../..");
const zcl_1 = require("../../../zcl");
const cluster_1 = __importDefault(require("../../../zcl/definition/cluster"));
const events_1 = require("../../events");
const math_1 = require("../utils/math");
const ezsp_1 = require("../ezsp/ezsp");
const consts_1 = require("../ezsp/consts");
const enums_1 = require("../ezsp/enums");
const buffalo_1 = require("../ezsp/buffalo");
const enums_2 = require("../enums");
const zdo_1 = require("../zdo");
const consts_2 = require("../consts");
const requestQueue_1 = require("./requestQueue");
const endpoints_1 = require("./endpoints");
const initters_1 = require("../utils/initters");
const crypto_1 = require("crypto");
const oneWaitress_1 = require("./oneWaitress");
const logger_1 = require("../../../utils/logger");
// import {EmberTokensManager} from "./tokensManager";
const NS = 'zh:ember';
/** Enum to pass strings from numbers up to Z2M. */
var RoutingTableStatus;
(function (RoutingTableStatus) {
    RoutingTableStatus[RoutingTableStatus["ACTIVE"] = 0] = "ACTIVE";
    RoutingTableStatus[RoutingTableStatus["DISCOVERY_UNDERWAY"] = 1] = "DISCOVERY_UNDERWAY";
    RoutingTableStatus[RoutingTableStatus["DISCOVERY_FAILED"] = 2] = "DISCOVERY_FAILED";
    RoutingTableStatus[RoutingTableStatus["INACTIVE"] = 3] = "INACTIVE";
    RoutingTableStatus[RoutingTableStatus["VALIDATION_UNDERWAY"] = 4] = "VALIDATION_UNDERWAY";
    RoutingTableStatus[RoutingTableStatus["RESERVED1"] = 5] = "RESERVED1";
    RoutingTableStatus[RoutingTableStatus["RESERVED2"] = 6] = "RESERVED2";
    RoutingTableStatus[RoutingTableStatus["RESERVED3"] = 7] = "RESERVED3";
})(RoutingTableStatus || (RoutingTableStatus = {}));
;
var NetworkInitAction;
(function (NetworkInitAction) {
    /** Ain't that nice! */
    NetworkInitAction[NetworkInitAction["DONE"] = 0] = "DONE";
    /** Config mismatch, must leave network. */
    NetworkInitAction[NetworkInitAction["LEAVE"] = 1] = "LEAVE";
    /** Config mismatched, left network. Will evaluate forming from backup or config next. */
    NetworkInitAction[NetworkInitAction["LEFT"] = 2] = "LEFT";
    /** Form the network using config. No backup, or backup mismatch. */
    NetworkInitAction[NetworkInitAction["FORM_CONFIG"] = 3] = "FORM_CONFIG";
    /** Re-form the network using full backed-up data. */
    NetworkInitAction[NetworkInitAction["FORM_BACKUP"] = 4] = "FORM_BACKUP";
})(NetworkInitAction || (NetworkInitAction = {}));
;
/** NOTE: Drivers can override `manufacturer`. Verify logic doesn't work in most cases anyway. */
const autoDetectDefinitions = [
    /** NOTE: Manuf code "0x1321" for "Shenzhen Sonoff Technologies Co., Ltd." */
    { manufacturer: 'ITEAD', vendorId: '1a86', productId: '55d4' }, // Sonoff ZBDongle-E
    /** NOTE: Manuf code "0x134B" for "Nabu Casa, Inc." */
    { manufacturer: 'Nabu Casa', vendorId: '10c4', productId: 'ea60' }, // Home Assistant SkyConnect
];
/**
 * Config for EMBER_LOW_RAM_CONCENTRATOR type concentrator.
 *
 * Based on ZigbeeMinimalHost/zigpc
 */
const LOW_RAM_CONCENTRATOR_CONFIG = {
    minTime: 5, // zigpc: 10
    maxTime: 60, // zigpc: 60
    routeErrorThreshold: 3, // zigpc: 3
    deliveryFailureThreshold: 1, // zigpc: 1, ZigbeeMinimalHost: 3
    mapHops: 0, // zigpc: 0
};
/**
 * Config for EMBER_HIGH_RAM_CONCENTRATOR type concentrator.
 *
 * XXX: For now, same as low, until proper values can be determined.
 */
const HIGH_RAM_CONCENTRATOR_CONFIG = {
    minTime: 5,
    maxTime: 60,
    routeErrorThreshold: 3,
    deliveryFailureThreshold: 1,
    mapHops: 0,
};
/**
 * Application generated ZDO messages use sequence numbers 0-127, and the stack
 * uses sequence numbers 128-255.  This simplifies life by eliminating the need
 * for coordination between the two entities, and allows both to send ZDO
 * messages with non-conflicting sequence numbers.
 */
const APPLICATION_ZDO_SEQUENCE_MASK = 0x7F;
/** Current revision of the spec by zigbee alliance. XXX: what are `Zigbee Pro 2023` devices reporting?? */
const CURRENT_ZIGBEE_SPEC_REVISION = 23;
/** Each scan period is 15.36ms. Scan for at least 200ms (2^4 + 1 periods) to pick up WiFi beacon frames. */
const ENERGY_SCAN_DURATION = 4;
/** Oldest supported EZSP version for backups. Don't take the risk to restore a broken network until older backup versions can be investigated. */
const BACKUP_OLDEST_SUPPORTED_EZSP_VERSION = 12;
/**
 * 9sec is minimum recommended for `ezspBroadcastNextNetworkKey` to have propagated throughout network.
 * NOTE: This is blocking the request queue, so we shouldn't go crazy high.
 */
const BROADCAST_NETWORK_KEY_SWITCH_WAIT_TIME = 15000;
/**
 * Stack configuration values for various supported stacks.
 *
 * https://github.com/darkxst/silabs-firmware-builder/tree/main/manifests
 * https://github.com/NabuCasa/silabs-firmware/wiki/Zigbee-EmberZNet-NCP-firmware-configuration#skyconnect
 * https://github.com/SiliconLabs/UnifySDK/blob/main/applications/zigbeed/project_files/zigbeed.slcp
 */
const STACK_CONFIGS = {
    "default": {
        /** <1-250> (Default: 2) @see EzspConfigId.ADDRESS_TABLE_SIZE */
        ADDRESS_TABLE_SIZE: 16, // zigpc: 32, darkxst: 16, nabucasa: 16
        /** <0-4> (Default: 2) @see EzspConfigId.TRUST_CENTER_ADDRESS_CACHE_SIZE */
        TRUST_CENTER_ADDRESS_CACHE_SIZE: 2,
        /** (Default: USE_TOKEN) @see EzspConfigId.TX_POWER_MODE */
        TX_POWER_MODE: enums_2.EmberTXPowerMode.USE_TOKEN,
        /** <-> (Default: 1) @see EzspConfigId.SUPPORTED_NETWORKS */
        SUPPORTED_NETWORKS: 1,
        /** <-> (Default: ) @see EzspConfigId.STACK_PROFILE */
        STACK_PROFILE: consts_2.STACK_PROFILE_ZIGBEE_PRO,
        /** <-> (Default: ) @see EzspConfigId.SECURITY_LEVEL */
        SECURITY_LEVEL: consts_2.SECURITY_LEVEL_Z3,
        /** (Default: KEEP_ALIVE_SUPPORT_ALL) @see EzspValueId.END_DEVICE_KEEP_ALIVE_SUPPORT_MODE */
        END_DEVICE_KEEP_ALIVE_SUPPORT_MODE: enums_2.EmberKeepAliveMode.KEEP_ALIVE_SUPPORT_ALL,
        /** <-> (Default: MAXIMUM_APS_PAYLOAD_LENGTH) @see EzspValueId.MAXIMUM_INCOMING_TRANSFER_SIZE */
        MAXIMUM_INCOMING_TRANSFER_SIZE: consts_2.MAXIMUM_APS_PAYLOAD_LENGTH,
        /** <-> (Default: MAXIMUM_APS_PAYLOAD_LENGTH) @see EzspValueId.MAXIMUM_OUTGOING_TRANSFER_SIZE */
        MAXIMUM_OUTGOING_TRANSFER_SIZE: consts_2.MAXIMUM_APS_PAYLOAD_LENGTH,
        /** <-> (Default: 10000) @see EzspValueId.TRANSIENT_DEVICE_TIMEOUT */
        TRANSIENT_DEVICE_TIMEOUT: 10000,
        /** <0-127> (Default: 2) @see EzspConfigId.BINDING_TABLE_SIZE */
        BINDING_TABLE_SIZE: 32, // zigpc: 2, Z3GatewayGPCombo: 5, nabucasa: 32
        /** <0-127> (Default: 0) @see EzspConfigId.KEY_TABLE_SIZE */
        KEY_TABLE_SIZE: 0, // zigpc: 4
        /** <6-64> (Default: 6) @see EzspConfigId.MAX_END_DEVICE_CHILDREN */
        MAX_END_DEVICE_CHILDREN: 32, // zigpc: 6, nabucasa: 32, Dongle-E (Sonoff firmware): 32
        /** <1-255> (Default: 10) @see EzspConfigId.APS_UNICAST_MESSAGE_COUNT */
        APS_UNICAST_MESSAGE_COUNT: 32, // zigpc: 10, darkxst: 20, nabucasa: 20
        /** <15-254> (Default: 15) @see EzspConfigId.BROADCAST_TABLE_SIZE */
        BROADCAST_TABLE_SIZE: 15, // zigpc: 15, Z3GatewayGPCombo: 35 - NOTE: Sonoff Dongle-E fails at 35
        /** [1, 16, 26] (Default: 16). @see EzspConfigId.NEIGHBOR_TABLE_SIZE */
        NEIGHBOR_TABLE_SIZE: 26, // zigpc: 16, darkxst: 26, nabucasa: 26
        /** (Default: 8) @see EzspConfigId.END_DEVICE_POLL_TIMEOUT */
        END_DEVICE_POLL_TIMEOUT: 8, // zigpc: 8
        /** <0-65535> (Default: 300) @see EzspConfigId.TRANSIENT_KEY_TIMEOUT_S */
        TRANSIENT_KEY_TIMEOUT_S: 300, // zigpc: 65535
        /** <-> (Default: 16) @see EzspConfigId.RETRY_QUEUE_SIZE */
        RETRY_QUEUE_SIZE: 16, // nabucasa: 16
        /** <0-255> (Default: 0) @see EzspConfigId.SOURCE_ROUTE_TABLE_SIZE */
        SOURCE_ROUTE_TABLE_SIZE: 200, // Z3GatewayGPCombo: 100, darkxst: 200, nabucasa: 200
        /** <1-250> (Default: 8) @see EzspConfigId.MULTICAST_TABLE_SIZE */
        MULTICAST_TABLE_SIZE: 16, // darkxst: 16, nabucasa: 16 - NOTE: should always be at least enough to register FIXED_ENDPOINTS multicastIds
    },
    "zigbeed": {
        ADDRESS_TABLE_SIZE: 128,
        TRUST_CENTER_ADDRESS_CACHE_SIZE: 2,
        TX_POWER_MODE: enums_2.EmberTXPowerMode.USE_TOKEN,
        SUPPORTED_NETWORKS: 1,
        STACK_PROFILE: consts_2.STACK_PROFILE_ZIGBEE_PRO,
        SECURITY_LEVEL: consts_2.SECURITY_LEVEL_Z3,
        END_DEVICE_KEEP_ALIVE_SUPPORT_MODE: enums_2.EmberKeepAliveMode.KEEP_ALIVE_SUPPORT_ALL,
        MAXIMUM_INCOMING_TRANSFER_SIZE: consts_2.MAXIMUM_APS_PAYLOAD_LENGTH,
        MAXIMUM_OUTGOING_TRANSFER_SIZE: consts_2.MAXIMUM_APS_PAYLOAD_LENGTH,
        TRANSIENT_DEVICE_TIMEOUT: 10000,
        BINDING_TABLE_SIZE: 128,
        KEY_TABLE_SIZE: 0, // zigbeed 128
        MAX_END_DEVICE_CHILDREN: 64,
        APS_UNICAST_MESSAGE_COUNT: 32,
        BROADCAST_TABLE_SIZE: 15,
        NEIGHBOR_TABLE_SIZE: 26,
        END_DEVICE_POLL_TIMEOUT: 8,
        TRANSIENT_KEY_TIMEOUT_S: 300,
        RETRY_QUEUE_SIZE: 16,
        SOURCE_ROUTE_TABLE_SIZE: 254,
        MULTICAST_TABLE_SIZE: 128,
    },
};
/**
 * NOTE: This from SDK is currently ignored here because of issue in below link:
 * - BUGZID 12261: Concentrators use MTORRs for route discovery and should not enable route discovery in the APS options.
 * - https://community.silabs.com/s/question/0D58Y00008DRfDCSA1/coordinator-cant-send-unicast-to-sleepy-node-after-reboot?language=en_US
 *
 * No issue have been linked to this at the moment, so keeping ENABLE_ROUTE_DISCOVERY just in case...
 */
const DEFAULT_APS_OPTIONS = (enums_2.EmberApsOption.RETRY | enums_2.EmberApsOption.ENABLE_ROUTE_DISCOVERY | enums_2.EmberApsOption.ENABLE_ADDRESS_DISCOVERY);
/**
 * Enabling this allows to immediately reject requests that won't be able to get to their destination.
 * However, it causes more NCP calls, notably to get the source route overhead.
 * XXX: Needs further testing before enabling
 */
const CHECK_APS_PAYLOAD_LENGTH = false;
/** Time for a ZDO request to get a callback response. ASH is 2400*6 for ACK timeout. */
const DEFAULT_ZDO_REQUEST_TIMEOUT = 15000; // msec
/** Time for a ZCL request to get a callback response. ASH is 2400*6 for ACK timeout. */
const DEFAULT_ZCL_REQUEST_TIMEOUT = 15000; //msec
/** Time for a network-related request to get a response (usually via event). */
const DEFAULT_NETWORK_REQUEST_TIMEOUT = 10000; // nothing on the network to bother requests, should be much faster than this
/** Time between watchdog counters reading/clearing */
const WATCHDOG_COUNTERS_FEED_INTERVAL = 3600000; // every hour...
/** Default manufacturer code reported by coordinator. */
const DEFAULT_MANUFACTURER_CODE = zcl_1.ManufacturerCode.SILICON_LABORATORIES;
/**
 * Workaround for devices that require a specific manufacturer code to be reported by coordinator while interviewing...
 * - Lumi/Aqara devices do not work properly otherwise (missing features): https://github.com/Koenkk/zigbee2mqtt/issues/9274
 */
const WORKAROUND_JOIN_MANUF_IEEE_PREFIX_TO_CODE = {
    // NOTE: Lumi has a new prefix registered since 2021, in case they start using that one with new devices, it might need to be added here too...
    //       "0x18c23c" https://maclookup.app/vendors/lumi-united-technology-co-ltd
    "0x54ef44": zcl_1.ManufacturerCode.LUMI_UNITED_TECHOLOGY_LTD_SHENZHEN,
};
/**
 * Relay calls between Z2M and EZSP-layer and handle any error that might occur via queue & waitress.
 *
 * Anything post `start` that requests anything from the EZSP layer must run through the request queue for proper execution flow.
 */
class EmberAdapter extends __1.Adapter {
    /** Current manufacturer code assigned to the coordinator. Used for join workarounds... */
    manufacturerCode;
    /** Key in STACK_CONFIGS */
    stackConfig;
    /** EMBER_LOW_RAM_CONCENTRATOR or EMBER_HIGH_RAM_CONCENTRATOR. */
    concentratorType;
    ezsp;
    version;
    requestQueue;
    oneWaitress;
    /** Periodically retrieve counters then clear them. */
    watchdogCountersHandle;
    /** Hold ZDO request in process. */
    zdoRequestBuffalo;
    /** Sequence number used for ZDO requests. static uint8_t  */
    zdoRequestSequence;
    /** Default radius used for broadcast ZDO requests. uint8_t */
    zdoRequestRadius;
    interpanLock;
    /**
     * Cached network params to avoid NCP calls. Prevents frequent EZSP transactions.
     * NOTE: Do not use directly, use getter functions for it that check if valid or need retrieval from NCP.
     */
    networkCache;
    constructor(networkOptions, serialPortOptions, backupPath, adapterOptions) {
        super(networkOptions, serialPortOptions, backupPath, adapterOptions);
        // TODO config
        // XXX: 'zigbeed': 4.4.x/7.4.x not supported by multiprotocol at the moment, will need refactoring when/if support is added
        this.stackConfig = 'default';
        // TODO config
        this.concentratorType = consts_2.EMBER_HIGH_RAM_CONCENTRATOR;
        const delay = (typeof this.adapterOptions.delay === 'number') ? Math.min(Math.max(this.adapterOptions.delay, 5), 60) : 5;
        logger_1.logger.debug(`Using delay=${delay}.`, NS);
        this.requestQueue = new requestQueue_1.EmberRequestQueue(delay);
        this.oneWaitress = new oneWaitress_1.EmberOneWaitress();
        this.zdoRequestBuffalo = new buffalo_1.EzspBuffalo(Buffer.alloc(consts_1.EZSP_MAX_FRAME_LENGTH));
        this.ezsp = new ezsp_1.Ezsp(delay, serialPortOptions);
        this.ezsp.on(ezsp_1.EzspEvents.STACK_STATUS, this.onStackStatus.bind(this));
        this.ezsp.on(ezsp_1.EzspEvents.MESSAGE_SENT_DELIVERY_FAILED, this.onMessageSentDeliveryFailed.bind(this));
        this.ezsp.on(ezsp_1.EzspEvents.ZDO_RESPONSE, this.onZDOResponse.bind(this));
        this.ezsp.on(ezsp_1.EzspEvents.END_DEVICE_ANNOUNCE, this.onEndDeviceAnnounce.bind(this));
        this.ezsp.on(ezsp_1.EzspEvents.INCOMING_MESSAGE, this.onIncomingMessage.bind(this));
        this.ezsp.on(ezsp_1.EzspEvents.TOUCHLINK_MESSAGE, this.onTouchlinkMessage.bind(this));
        this.ezsp.on(ezsp_1.EzspEvents.GREENPOWER_MESSAGE, this.onGreenpowerMessage.bind(this));
        this.ezsp.on(ezsp_1.EzspEvents.TRUST_CENTER_JOIN, this.onTrustCenterJoin.bind(this));
    }
    /**
     * Emitted from @see Ezsp.ezspStackStatusHandler
     * @param status
     */
    async onStackStatus(status) {
        // to be extra careful, should clear network cache upon receiving this.
        this.clearNetworkCache();
        switch (status) {
            case enums_2.EmberStatus.NETWORK_UP: {
                this.oneWaitress.resolveEvent(oneWaitress_1.OneWaitressEvents.STACK_STATUS_NETWORK_UP);
                logger_1.logger.info(`[STACK STATUS] Network up.`, NS);
                break;
            }
            case enums_2.EmberStatus.NETWORK_DOWN: {
                this.oneWaitress.resolveEvent(oneWaitress_1.OneWaitressEvents.STACK_STATUS_NETWORK_DOWN);
                logger_1.logger.info(`[STACK STATUS] Network down.`, NS);
                break;
            }
            case enums_2.EmberStatus.NETWORK_OPENED: {
                this.oneWaitress.resolveEvent(oneWaitress_1.OneWaitressEvents.STACK_STATUS_NETWORK_OPENED);
                await new Promise((resolve, reject) => {
                    this.requestQueue.enqueue(async () => {
                        const setJPstatus = (await this.emberSetJoinPolicy(enums_2.EmberJoinDecision.USE_PRECONFIGURED_KEY));
                        if (setJPstatus !== enums_2.EzspStatus.SUCCESS) {
                            logger_1.logger.error(`[ZDO] Failed set join policy with status=${enums_2.EzspStatus[setJPstatus]}.`, NS);
                            return enums_2.EmberStatus.ERR_FATAL;
                        }
                        resolve();
                        return enums_2.EmberStatus.SUCCESS;
                    }, reject, true);
                });
                logger_1.logger.info(`[STACK STATUS] Network opened.`, NS);
                break;
            }
            case enums_2.EmberStatus.NETWORK_CLOSED: {
                this.oneWaitress.resolveEvent(oneWaitress_1.OneWaitressEvents.STACK_STATUS_NETWORK_CLOSED);
                logger_1.logger.info(`[STACK STATUS] Network closed.`, NS);
                break;
            }
            case enums_2.EmberStatus.CHANNEL_CHANGED: {
                this.oneWaitress.resolveEvent(oneWaitress_1.OneWaitressEvents.STACK_STATUS_CHANNEL_CHANGED);
                // invalidate cache
                this.networkCache.parameters.radioChannel = consts_2.INVALID_RADIO_CHANNEL;
                logger_1.logger.info(`[STACK STATUS] Channel changed.`, NS);
                break;
            }
            default: {
                logger_1.logger.debug(`[STACK STATUS] ${enums_2.EmberStatus[status]}.`, NS);
                break;
            }
        }
    }
    /**
     * Emitted from @see Ezsp.ezspMessageSentHandler
     * WARNING: Cannot rely on `ezspMessageSentHandler` > `ezspIncomingMessageHandler` order, some devices mix it up!
     *
     * @param type
     * @param indexOrDestination
     * @param apsFrame
     * @param messageTag
     */
    async onMessageSentDeliveryFailed(type, indexOrDestination, apsFrame, messageTag) {
        switch (type) {
            case enums_2.EmberOutgoingMessageType.BROADCAST:
            case enums_2.EmberOutgoingMessageType.BROADCAST_WITH_ALIAS:
            case enums_2.EmberOutgoingMessageType.MULTICAST:
            case enums_2.EmberOutgoingMessageType.MULTICAST_WITH_ALIAS: {
                // BC/MC not checking for message sent, avoid unnecessary waitress lookups
                logger_1.logger.error(`Delivery of ${enums_2.EmberOutgoingMessageType[type]} failed for "${indexOrDestination}" `
                    + `[apsFrame=${JSON.stringify(apsFrame)} messageTag=${messageTag}]`, NS);
                break;
            }
            default: {
                // reject any waitress early (don't wait for timeout if we know we're gonna get there eventually)
                this.oneWaitress.deliveryFailedFor(indexOrDestination, apsFrame);
                break;
            }
        }
    }
    /**
     * Emitted from @see Ezsp.ezspIncomingMessageHandler
     *
     * @param clusterId The ZDO response cluster ID.
     * @param sender The sender of the response. Should match `payload.nodeId` in many responses.
     * @param payload If null, the response indicated a failure.
     */
    async onZDOResponse(status, sender, apsFrame, payload) {
        this.oneWaitress.resolveZDO(status, sender, apsFrame, payload);
    }
    /**
     * Emitted from @see Ezsp.ezspIncomingMessageHandler
     *
     * @param sender
     * @param nodeId
     * @param eui64
     * @param macCapFlags
     */
    async onEndDeviceAnnounce(sender, apsFrame, payload) {
        // reduced function device
        // if ((payload.capabilities.deviceType === 0)) {
        // }
        this.emit(events_1.Events.deviceAnnounce, { networkAddress: payload.nodeId, ieeeAddr: payload.eui64 });
    }
    /**
     * Emitted from @see Ezsp.ezspIncomingMessageHandler
     *
     * @param type
     * @param apsFrame
     * @param lastHopLqi
     * @param sender
     * @param messageContents
     */
    async onIncomingMessage(type, apsFrame, lastHopLqi, sender, messageContents) {
        const payload = {
            clusterID: apsFrame.clusterId,
            header: zcl_1.ZclHeader.fromBuffer(messageContents),
            address: sender,
            data: messageContents,
            endpoint: apsFrame.sourceEndpoint,
            linkquality: lastHopLqi,
            groupID: apsFrame.groupId,
            wasBroadcast: ((type === enums_2.EmberIncomingMessageType.BROADCAST) || (type === enums_2.EmberIncomingMessageType.BROADCAST_LOOPBACK)),
            destinationEndpoint: apsFrame.destinationEndpoint,
        };
        this.oneWaitress.resolveZCL(payload);
        this.emit(events_1.Events.zclPayload, payload);
    }
    /**
     * Emitted from @see Ezsp.ezspMacFilterMatchMessageHandler when the message is a valid InterPAN touchlink message.
     *
     * @param sourcePanId
     * @param sourceAddress
     * @param groupId
     * @param lastHopLqi
     * @param messageContents
     */
    async onTouchlinkMessage(sourcePanId, sourceAddress, groupId, lastHopLqi, messageContents) {
        const payload = {
            clusterID: cluster_1.default.touchlink.ID,
            data: messageContents,
            header: zcl_1.ZclHeader.fromBuffer(messageContents),
            address: sourceAddress,
            endpoint: 1, // arbitrary since not sent over-the-air
            linkquality: lastHopLqi,
            groupID: groupId,
            wasBroadcast: true, // XXX: since always sent broadcast atm...
            destinationEndpoint: endpoints_1.FIXED_ENDPOINTS[0].endpoint,
        };
        this.oneWaitress.resolveZCL(payload);
        this.emit(events_1.Events.zclPayload, payload);
    }
    /**
     * Emitted from @see Ezsp.ezspGpepIncomingMessageHandler
     *
     * @param sequenceNumber
     * @param commandIdentifier
     * @param sourceId
     * @param frameCounter
     * @param gpdCommandId
     * @param gpdCommandPayload
     * @param gpdLink
     */
    async onGreenpowerMessage(sequenceNumber, commandIdentifier, sourceId, frameCounter, gpdCommandId, gpdCommandPayload, gpdLink) {
        try {
            const gpdHeader = Buffer.alloc(15);
            gpdHeader.writeUInt8(0b00000001, 0); // frameControl: FrameType.SPECIFIC + Direction.CLIENT_TO_SERVER + disableDefaultResponse=false
            gpdHeader.writeUInt8(sequenceNumber, 1); // transactionSequenceNumber
            gpdHeader.writeUInt8(commandIdentifier, 2); // commandIdentifier
            gpdHeader.writeUInt16LE(0, 3); // options XXX: bypassed, same as deconz https://github.com/Koenkk/zigbee-herdsman/pull/536
            gpdHeader.writeUInt32LE(sourceId, 5); // srcID
            // omitted: gpdIEEEAddr ieeeAddr
            // omitted: gpdEndpoint uint8
            gpdHeader.writeUInt32LE(frameCounter, 9); // frameCounter
            gpdHeader.writeUInt8(gpdCommandId, 13); // commandID
            gpdHeader.writeUInt8(gpdCommandPayload.length, 14); // payloadSize
            const data = Buffer.concat([gpdHeader, gpdCommandPayload]);
            const payload = {
                header: zcl_1.ZclHeader.fromBuffer(data),
                data,
                clusterID: cluster_1.default.greenPower.ID,
                address: sourceId,
                endpoint: consts_2.GP_ENDPOINT,
                linkquality: gpdLink,
                groupID: this.greenPowerGroup,
                wasBroadcast: true,
                destinationEndpoint: consts_2.GP_ENDPOINT,
            };
            this.oneWaitress.resolveZCL(payload);
            this.emit(events_1.Events.zclPayload, payload);
        }
        catch (err) {
            logger_1.logger.error(`<~x~ [GP] Failed creating ZCL payload. Skipping. ${err}`, NS);
            return;
        }
    }
    /**
     * Emitted from @see Ezsp.ezspTrustCenterJoinHandler
     * Also from @see Ezsp.ezspIdConflictHandler as a DEVICE_LEFT
     *
     * @param newNodeId
     * @param newNodeEui64
     * @param status
     * @param policyDecision
     * @param parentOfNewNodeId
     */
    async onTrustCenterJoin(newNodeId, newNodeEui64, status, policyDecision, parentOfNewNodeId) {
        if (status === enums_2.EmberDeviceUpdate.DEVICE_LEFT) {
            const payload = {
                networkAddress: newNodeId,
                ieeeAddr: newNodeEui64,
            };
            this.emit(events_1.Events.deviceLeave, payload);
        }
        else {
            if (policyDecision !== enums_2.EmberJoinDecision.DENY_JOIN) {
                const payload = {
                    networkAddress: newNodeId,
                    ieeeAddr: newNodeEui64,
                };
                // set workaround manuf code if necessary, or revert to default if previous joined device required workaround and new one does not
                const joinManufCode = WORKAROUND_JOIN_MANUF_IEEE_PREFIX_TO_CODE[newNodeEui64.substring(0, 8)] ?? DEFAULT_MANUFACTURER_CODE;
                if (this.manufacturerCode !== joinManufCode) {
                    await new Promise((resolve, reject) => {
                        this.requestQueue.enqueue(async () => {
                            logger_1.logger.debug(`[WORKAROUND] Setting coordinator manufacturer code to ${zcl_1.ManufacturerCode[joinManufCode]}.`, NS);
                            await this.ezsp.ezspSetManufacturerCode(joinManufCode);
                            this.manufacturerCode = joinManufCode;
                            this.emit(events_1.Events.deviceJoined, payload);
                            resolve();
                            return enums_2.EmberStatus.SUCCESS;
                        }, reject, true);
                    });
                }
                else {
                    this.emit(events_1.Events.deviceJoined, payload);
                }
            }
            else {
                logger_1.logger.warning(`[TRUST CENTER] Device ${newNodeId}:${newNodeEui64} was denied joining via ${parentOfNewNodeId}.`, NS);
            }
        }
    }
    async watchdogCounters() {
        await new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                // listed as per EmberCounterType
                const ncpCounters = (await this.ezsp.ezspReadAndClearCounters());
                logger_1.logger.info(`[NCP COUNTERS] ${ncpCounters.join(',')}`, NS);
                const ashCounters = this.ezsp.ash.readAndClearCounters();
                logger_1.logger.info(`[ASH COUNTERS] ${ashCounters.join(',')}`, NS);
                resolve();
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    initVariables() {
        this.ezsp.removeAllListeners(ezsp_1.EzspEvents.ncpNeedsResetAndInit);
        clearInterval(this.watchdogCountersHandle);
        this.zdoRequestBuffalo.setPosition(0);
        this.zdoRequestSequence = 0; // start at 1
        this.zdoRequestRadius = 255;
        this.interpanLock = false;
        this.networkCache = (0, initters_1.initNetworkCache)();
        this.manufacturerCode = DEFAULT_MANUFACTURER_CODE; // will be set in NCP in initEzsp
        this.ezsp.once(ezsp_1.EzspEvents.ncpNeedsResetAndInit, this.onNcpNeedsResetAndInit.bind(this));
    }
    /**
     * Proceed to execute the long list of commands required to setup comms between Host<>NCP.
     * This is called by start and on internal reset.
     */
    async initEzsp() {
        let result = "resumed";
        // NOTE: something deep in this call can throw too
        const startResult = (await this.ezsp.start());
        if (startResult !== enums_2.EzspStatus.SUCCESS) {
            throw new Error(`Failed to start EZSP layer with status=${enums_2.EzspStatus[startResult]}.`);
        }
        // call before any other command, else fails
        await this.emberVersion();
        await this.initNCPPreConfiguration();
        await this.initNCPAddressTable();
        await this.initNCPConfiguration();
        // WARNING: From here on EZSP commands that affect memory allocation on the NCP should no longer be called (like resizing tables)
        await this.registerFixedEndpoints();
        this.clearNetworkCache();
        result = (await this.initTrustCenter());
        // after network UP, as per SDK, ensures clean slate
        await this.initNCPConcentrator();
        // await (this.emberStartEnergyScan());// TODO: via config of some kind, better off waiting for UI supports though
        // populate network cache info
        const [status, , parameters] = (await this.ezsp.ezspGetNetworkParameters());
        if (status !== enums_2.EmberStatus.SUCCESS) {
            throw new Error(`Failed to get network parameters with status=${enums_2.EmberStatus[status]}.`);
        }
        this.networkCache.parameters = parameters;
        this.networkCache.status = (await this.ezsp.ezspNetworkState());
        this.networkCache.eui64 = (await this.ezsp.ezspGetEui64());
        logger_1.logger.debug(`[INIT] Network Ready! ${JSON.stringify(this.networkCache)}`, NS);
        this.watchdogCountersHandle = setInterval(this.watchdogCounters.bind(this), WATCHDOG_COUNTERS_FEED_INTERVAL);
        this.requestQueue.startDispatching();
        return result;
    }
    /**
     * NCP Config init. Should always be called first in the init stack (after version cmd).
     * @returns
     */
    async initNCPPreConfiguration() {
        // this can only decrease, not increase, NCP-side value
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.ADDRESS_TABLE_SIZE, STACK_CONFIGS[this.stackConfig].ADDRESS_TABLE_SIZE);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.TRUST_CENTER_ADDRESS_CACHE_SIZE, STACK_CONFIGS[this.stackConfig].TRUST_CENTER_ADDRESS_CACHE_SIZE);
        if (STACK_CONFIGS[this.stackConfig].STACK_PROFILE === consts_2.STACK_PROFILE_ZIGBEE_PRO) {
            // BUG 14222: If stack profile is 2 (ZigBee Pro), we need to enforce
            // the standard stack configuration values for that feature set.
            /** MAC indirect timeout should be 7.68 secs */
            await this.emberSetEzspConfigValue(enums_1.EzspConfigId.INDIRECT_TRANSMISSION_TIMEOUT, 7680);
            /** Max hops should be 2 * nwkMaxDepth, where nwkMaxDepth is 15 */
            await this.emberSetEzspConfigValue(enums_1.EzspConfigId.MAX_HOPS, 30);
        }
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.TX_POWER_MODE, STACK_CONFIGS[this.stackConfig].TX_POWER_MODE);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.SUPPORTED_NETWORKS, STACK_CONFIGS[this.stackConfig].SUPPORTED_NETWORKS);
        await this.emberSetEzspValue(enums_1.EzspValueId.END_DEVICE_KEEP_ALIVE_SUPPORT_MODE, 1, [STACK_CONFIGS[this.stackConfig].END_DEVICE_KEEP_ALIVE_SUPPORT_MODE]);
        // allow other devices to modify the binding table
        await this.emberSetEzspPolicy(enums_1.EzspPolicyId.BINDING_MODIFICATION_POLICY, enums_1.EzspDecisionId.CHECK_BINDING_MODIFICATIONS_ARE_VALID_ENDPOINT_CLUSTERS);
        // return message tag and message contents in ezspMessageSentHandler()
        await this.emberSetEzspPolicy(enums_1.EzspPolicyId.MESSAGE_CONTENTS_IN_CALLBACK_POLICY, enums_1.EzspDecisionId.MESSAGE_TAG_AND_CONTENTS_IN_CALLBACK);
        await this.emberSetEzspValue(enums_1.EzspValueId.MAXIMUM_INCOMING_TRANSFER_SIZE, 2, (0, math_1.lowHighBytes)(STACK_CONFIGS[this.stackConfig].MAXIMUM_INCOMING_TRANSFER_SIZE));
        await this.emberSetEzspValue(enums_1.EzspValueId.MAXIMUM_OUTGOING_TRANSFER_SIZE, 2, (0, math_1.lowHighBytes)(STACK_CONFIGS[this.stackConfig].MAXIMUM_OUTGOING_TRANSFER_SIZE));
        await this.emberSetEzspValue(enums_1.EzspValueId.TRANSIENT_DEVICE_TIMEOUT, 2, (0, math_1.lowHighBytes)(STACK_CONFIGS[this.stackConfig].TRANSIENT_DEVICE_TIMEOUT));
        await this.ezsp.ezspSetManufacturerCode(this.manufacturerCode);
        // network security init
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.STACK_PROFILE, STACK_CONFIGS[this.stackConfig].STACK_PROFILE);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.SECURITY_LEVEL, STACK_CONFIGS[this.stackConfig].SECURITY_LEVEL);
    }
    /**
     * NCP Address table init.
     * @returns
     */
    async initNCPAddressTable() {
        const desiredTableSize = STACK_CONFIGS[this.stackConfig].ADDRESS_TABLE_SIZE;
        // If the host and the ncp disagree on the address table size, explode.
        const [status, addressTableSize] = (await this.ezsp.ezspGetConfigurationValue(enums_1.EzspConfigId.ADDRESS_TABLE_SIZE));
        // After the change of ncp memory model in UC, we can not increase the default NCP table sizes anymore.
        // Therefore, checking for desiredTableSize == (ncp)addressTableSize might not be always true anymore
        // assert(desiredTableSize <= addressTableSize);
        if ((status !== enums_2.EzspStatus.SUCCESS) || (addressTableSize > desiredTableSize)) {
            throw new Error(`[INIT] NCP (${addressTableSize}) disagrees with Host (min ${desiredTableSize}) on table size. status=${enums_2.EzspStatus[status]}`);
        }
    }
    /**
     * NCP configuration init
     */
    async initNCPConfiguration() {
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.BINDING_TABLE_SIZE, STACK_CONFIGS[this.stackConfig].BINDING_TABLE_SIZE);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.KEY_TABLE_SIZE, STACK_CONFIGS[this.stackConfig].KEY_TABLE_SIZE);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.MAX_END_DEVICE_CHILDREN, STACK_CONFIGS[this.stackConfig].MAX_END_DEVICE_CHILDREN);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.APS_UNICAST_MESSAGE_COUNT, STACK_CONFIGS[this.stackConfig].APS_UNICAST_MESSAGE_COUNT);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.BROADCAST_TABLE_SIZE, STACK_CONFIGS[this.stackConfig].BROADCAST_TABLE_SIZE);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.NEIGHBOR_TABLE_SIZE, STACK_CONFIGS[this.stackConfig].NEIGHBOR_TABLE_SIZE);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.END_DEVICE_POLL_TIMEOUT, STACK_CONFIGS[this.stackConfig].END_DEVICE_POLL_TIMEOUT);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.TRANSIENT_KEY_TIMEOUT_S, STACK_CONFIGS[this.stackConfig].TRANSIENT_KEY_TIMEOUT_S);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.RETRY_QUEUE_SIZE, STACK_CONFIGS[this.stackConfig].RETRY_QUEUE_SIZE);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.SOURCE_ROUTE_TABLE_SIZE, STACK_CONFIGS[this.stackConfig].SOURCE_ROUTE_TABLE_SIZE);
        await this.emberSetEzspConfigValue(enums_1.EzspConfigId.MULTICAST_TABLE_SIZE, STACK_CONFIGS[this.stackConfig].MULTICAST_TABLE_SIZE);
    }
    /**
     * NCP concentrator init. Also enables source route discovery mode with RESCHEDULE.
     *
     * From AN1233:
     * To function correctly in a Zigbee PRO network, a trust center also requires that:
     *
     * 1. The trust center application must act as a concentrator (either high or low RAM).
     * 2. The trust center application must have support for source routing.
     *    It must record the source routes and properly handle requests by the stack for a particular source route.
     * 3. The trust center application must use an address cache for security, in order to maintain a mapping of IEEE address to short ID.
     *
     * Failure to satisfy all of the above requirements may result in failures when joining/rejoining devices to the network across multiple hops
     * (through a target node that is neither the trust center nor one of its neighboring routers.)
     */
    async initNCPConcentrator() {
        const config = (this.concentratorType === consts_2.EMBER_HIGH_RAM_CONCENTRATOR) ? HIGH_RAM_CONCENTRATOR_CONFIG : LOW_RAM_CONCENTRATOR_CONFIG;
        const status = (await this.ezsp.ezspSetConcentrator(true, this.concentratorType, config.minTime, config.maxTime, config.routeErrorThreshold, config.deliveryFailureThreshold, config.mapHops));
        if (status !== enums_2.EmberStatus.SUCCESS) {
            throw new Error(`[CONCENTRATOR] Failed to set concentrator with status=${status}.`);
        }
        const remainTilMTORR = (await this.ezsp.ezspSetSourceRouteDiscoveryMode(enums_2.EmberSourceRouteDiscoveryMode.RESCHEDULE));
        logger_1.logger.info(`[CONCENTRATOR] Started source route discovery. ${remainTilMTORR}ms until next broadcast.`, NS);
    }
    /**
     * Register fixed endpoints and set any related multicast entries that need to be.
     */
    async registerFixedEndpoints() {
        let mcTableIdx = 0;
        for (const ep of endpoints_1.FIXED_ENDPOINTS) {
            if (ep.networkIndex !== 0x00) {
                logger_1.logger.debug(`Multi-network not currently supported. Skipping endpoint ${JSON.stringify(ep)}.`, NS);
                continue;
            }
            const [epStatus,] = (await this.ezsp.ezspGetEndpointFlags(ep.endpoint));
            // endpoint not already registered
            if (epStatus !== enums_2.EzspStatus.SUCCESS) {
                // check to see if ezspAddEndpoint needs to be called
                // if ezspInit is called without NCP reset, ezspAddEndpoint is not necessary and will return an error
                const status = (await this.ezsp.ezspAddEndpoint(ep.endpoint, ep.profileId, ep.deviceId, ep.deviceVersion, ep.inClusterList.slice(), // copy
                ep.outClusterList.slice()));
                if (status === enums_2.EzspStatus.SUCCESS) {
                    logger_1.logger.debug(`Registered endpoint "${ep.endpoint}" with status=${enums_2.EzspStatus[status]}.`, NS);
                }
                else {
                    throw new Error(`Failed to register endpoint "${ep.endpoint}" with status=${enums_2.EzspStatus[status]}.`);
                }
            }
            else {
                logger_1.logger.debug(`Endpoint "${ep.endpoint}" already registered.`, NS);
            }
            for (const multicastId of ep.multicastIds) {
                const multicastEntry = {
                    multicastId,
                    endpoint: ep.endpoint,
                    networkIndex: ep.networkIndex,
                };
                const status = (await this.ezsp.ezspSetMulticastTableEntry(mcTableIdx++, multicastEntry));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    throw new Error(`Failed to register group "${multicastId}" in multicast table with status=${enums_2.EmberStatus[status]}.`);
                }
                logger_1.logger.debug(`Registered multicast table entry: ${JSON.stringify(multicastEntry)}.`, NS);
            }
        }
    }
    /**
     *
     * @returns True if the network needed to be formed.
     */
    async initTrustCenter() {
        // init TC policies
        {
            let status = (await this.emberSetEzspPolicy(enums_1.EzspPolicyId.TC_KEY_REQUEST_POLICY, enums_1.EzspDecisionId.ALLOW_TC_KEY_REQUESTS_AND_SEND_CURRENT_KEY));
            if (status !== enums_2.EzspStatus.SUCCESS) {
                throw new Error(`[INIT TC] Failed to set EzspPolicyId TC_KEY_REQUEST_POLICY to ALLOW_TC_KEY_REQUESTS_AND_SEND_CURRENT_KEY `
                    + `with status=${enums_2.EzspStatus[status]}.`);
            }
            const appKeyPolicy = STACK_CONFIGS[this.stackConfig].KEY_TABLE_SIZE
                ? enums_1.EzspDecisionId.ALLOW_APP_KEY_REQUESTS : enums_1.EzspDecisionId.DENY_APP_KEY_REQUESTS;
            status = (await this.emberSetEzspPolicy(enums_1.EzspPolicyId.APP_KEY_REQUEST_POLICY, appKeyPolicy));
            if (status !== enums_2.EzspStatus.SUCCESS) {
                throw new Error(`[INIT TC] Failed to set EzspPolicyId APP_KEY_REQUEST_POLICY to ${enums_1.EzspDecisionId[appKeyPolicy]} `
                    + `with status=${enums_2.EzspStatus[status]}.`);
            }
            status = (await this.emberSetJoinPolicy(enums_2.EmberJoinDecision.USE_PRECONFIGURED_KEY));
            if (status !== enums_2.EzspStatus.SUCCESS) {
                throw new Error(`[INIT TC] Failed to set join policy to USE_PRECONFIGURED_KEY with status=${enums_2.EzspStatus[status]}.`);
            }
        }
        const configNetworkKey = Buffer.from(this.networkOptions.networkKey);
        const networkInitStruct = {
            bitmask: (enums_2.EmberNetworkInitBitmask.PARENT_INFO_IN_TOKEN | enums_2.EmberNetworkInitBitmask.END_DEVICE_REJOIN_ON_REBOOT)
        };
        const initStatus = (await this.ezsp.ezspNetworkInit(networkInitStruct));
        logger_1.logger.debug(`[INIT TC] Network init status=${enums_2.EmberStatus[initStatus]}.`, NS);
        if ((initStatus !== enums_2.EmberStatus.SUCCESS) && (initStatus !== enums_2.EmberStatus.NOT_JOINED)) {
            throw new Error(`[INIT TC] Failed network init request with status=${enums_2.EmberStatus[initStatus]}.`);
        }
        let action = NetworkInitAction.DONE;
        if (initStatus === enums_2.EmberStatus.SUCCESS) {
            // network
            await this.oneWaitress.startWaitingForEvent({ eventName: oneWaitress_1.OneWaitressEvents.STACK_STATUS_NETWORK_UP }, DEFAULT_NETWORK_REQUEST_TIMEOUT, '[INIT TC] Network init');
            const [npStatus, nodeType, netParams] = (await this.ezsp.ezspGetNetworkParameters());
            logger_1.logger.debug(`[INIT TC] Current network config=${JSON.stringify(this.networkOptions)}`, NS);
            logger_1.logger.debug(`[INIT TC] Current NCP network: nodeType=${enums_2.EmberNodeType[nodeType]} params=${JSON.stringify(netParams)}`, NS);
            if ((npStatus === enums_2.EmberStatus.SUCCESS) && (nodeType === enums_2.EmberNodeType.COORDINATOR) && (this.networkOptions.panID === netParams.panId)
                && ((0, es6_1.default)(this.networkOptions.extendedPanID, netParams.extendedPanId))) {
                // config matches adapter so far, no error, we can check the network key
                const context = (0, initters_1.initSecurityManagerContext)();
                context.coreKeyType = enums_2.SecManKeyType.NETWORK;
                context.keyIndex = 0;
                const [networkKey, nkStatus] = (await this.ezsp.ezspExportKey(context));
                if (nkStatus !== enums_2.SLStatus.OK) {
                    throw new Error(`[BACKUP] Failed to export Network Key with status=${enums_2.SLStatus[nkStatus]}.`);
                }
                logger_1.logger.debug(`[INIT TC] Current NCP network: networkKey=${networkKey.contents.toString('hex')}`, NS);
                // config doesn't match adapter anymore
                if (!networkKey.contents.equals(configNetworkKey)) {
                    action = NetworkInitAction.LEAVE;
                }
            }
            else {
                // config doesn't match adapter
                action = NetworkInitAction.LEAVE;
            }
            if (action === NetworkInitAction.LEAVE) {
                logger_1.logger.info(`[INIT TC] NCP network does not match config. Leaving network...`, NS);
                const leaveStatus = (await this.ezsp.ezspLeaveNetwork());
                if (leaveStatus !== enums_2.EmberStatus.SUCCESS) {
                    throw new Error(`[INIT TC] Failed leave network request with status=${enums_2.EmberStatus[leaveStatus]}.`);
                }
                await this.oneWaitress.startWaitingForEvent({ eventName: oneWaitress_1.OneWaitressEvents.STACK_STATUS_NETWORK_DOWN }, DEFAULT_NETWORK_REQUEST_TIMEOUT, '[INIT TC] Leave network');
                await (0, utils_1.Wait)(200); // settle down
                action = NetworkInitAction.LEFT;
            }
        }
        const backup = (await this.getStoredBackup());
        if ((initStatus === enums_2.EmberStatus.NOT_JOINED) || (action === NetworkInitAction.LEFT)) {
            // no network
            if (backup != null) {
                if ((this.networkOptions.panID === backup.networkOptions.panId)
                    && (Buffer.from(this.networkOptions.extendedPanID).equals(backup.networkOptions.extendedPanId))
                    && (this.networkOptions.channelList.includes(backup.logicalChannel))
                    && (configNetworkKey.equals(backup.networkOptions.networkKey))) {
                    // config matches backup
                    action = NetworkInitAction.FORM_BACKUP;
                }
                else {
                    // config doesn't match backup
                    logger_1.logger.info(`[INIT TC] Config does not match backup.`, NS);
                    action = NetworkInitAction.FORM_CONFIG;
                }
            }
            else {
                // no backup
                logger_1.logger.info(`[INIT TC] No valid backup found.`, NS);
                action = NetworkInitAction.FORM_CONFIG;
            }
        }
        //---- from here on, we assume everything is in place for whatever decision was taken above
        let result = 'resumed';
        switch (action) {
            case NetworkInitAction.FORM_BACKUP: {
                logger_1.logger.info(`[INIT TC] Forming from backup.`, NS);
                const keyList = backup.devices.map((device) => {
                    const octets = Array.from(device.ieeeAddress.reverse());
                    const deviceEui64 = '0x' + octets.map(octet => octet.toString(16).padStart(2, '0')).join("");
                    const key = {
                        deviceEui64,
                        key: { contents: device.linkKey.key },
                        outgoingFrameCounter: device.linkKey.txCounter,
                        incomingFrameCounter: device.linkKey.rxCounter,
                    };
                    return key;
                });
                // before forming
                await this.importLinkKeys(keyList);
                await this.formNetwork(true, /*from backup*/ backup.networkOptions.networkKey, backup.networkKeyInfo.sequenceNumber, backup.networkOptions.panId, Array.from(backup.networkOptions.extendedPanId), backup.logicalChannel, backup.ezsp.hashed_tclk);
                result = 'restored';
                break;
            }
            case NetworkInitAction.FORM_CONFIG: {
                logger_1.logger.info(`[INIT TC] Forming from config.`, NS);
                await this.formNetwork(false, /*from config*/ configNetworkKey, 0, this.networkOptions.panID, this.networkOptions.extendedPanID, this.networkOptions.channelList[0], (0, crypto_1.randomBytes)(consts_1.EMBER_ENCRYPTION_KEY_SIZE));
                result = 'reset';
                break;
            }
            case NetworkInitAction.DONE: {
                logger_1.logger.info(`[INIT TC] NCP network matches config.`, NS);
                break;
            }
            default: {
                throw new Error(`[INIT TC] Invalid action "${NetworkInitAction[action]}" for final stage.`);
            }
        }
        // can't let frame counter wrap to zero (uint32_t), will force a broadcast after init if getting too close
        if (backup != null && (backup.networkKeyInfo.frameCounter > 0xFEEEEEEE)) {
            // XXX: while this remains a pretty low occurrence in most (small) networks,
            //      currently Z2M won't support the key update because of one-way config...
            //      need to investigate handling this properly
            // logger.warning(`[INIT TC] Network key frame counter is reaching its limit. Scheduling broadcast to update network key. `
            //     + `This may result in some devices (especially battery-powered) temporarily losing connection.`, NS);
            // // XXX: no idea here on the proper timer value, but this will block the network for several seconds on exec
            // //      (probably have to take the behavior of sleepy-end devices into account to improve chances of reaching everyone right away?)
            // setTimeout(async () => {
            //     this.requestQueue.enqueue(async (): Promise<EmberStatus> => {
            //         await this.broadcastNetworkKeyUpdate();
            //         return EmberStatus.SUCCESS;
            //     }, logger.error, true);// no reject just log error if any, will retry next start, & prioritize so we know it'll run when expected
            // }, 300000);
            logger_1.logger.warning(`[INIT TC] Network key frame counter is reaching its limit. A new network key will have to be instaured soon.`, NS);
        }
        return result;
    }
    /**
     * Form a network using given parameters.
     */
    async formNetwork(fromBackup, networkKey, networkKeySequenceNumber, panId, extendedPanId, radioChannel, tcLinkKey) {
        const state = {
            bitmask: (enums_2.EmberInitialSecurityBitmask.TRUST_CENTER_GLOBAL_LINK_KEY | enums_2.EmberInitialSecurityBitmask.HAVE_PRECONFIGURED_KEY
                | enums_2.EmberInitialSecurityBitmask.HAVE_NETWORK_KEY | enums_2.EmberInitialSecurityBitmask.TRUST_CENTER_USES_HASHED_LINK_KEY
                | enums_2.EmberInitialSecurityBitmask.REQUIRE_ENCRYPTED_KEY),
            preconfiguredKey: { contents: tcLinkKey },
            networkKey: { contents: networkKey },
            networkKeySequenceNumber: networkKeySequenceNumber,
            preconfiguredTrustCenterEui64: consts_2.BLANK_EUI64,
        };
        if (fromBackup) {
            state.bitmask |= enums_2.EmberInitialSecurityBitmask.NO_FRAME_COUNTER_RESET;
        }
        let emberStatus = (await this.ezsp.ezspSetInitialSecurityState(state));
        if (emberStatus !== enums_2.EmberStatus.SUCCESS) {
            throw new Error(`[INIT FORM] Failed to set initial security state with status=${enums_2.EmberStatus[emberStatus]}.`);
        }
        const extended = (enums_2.EmberExtendedSecurityBitmask.JOINER_GLOBAL_LINK_KEY | enums_2.EmberExtendedSecurityBitmask.NWK_LEAVE_REQUEST_NOT_ALLOWED);
        const extSecStatus = (await this.ezsp.ezspSetExtendedSecurityBitmask(extended));
        if (extSecStatus !== enums_2.EzspStatus.SUCCESS) {
            throw new Error(`[INIT FORM] Failed to set extended security bitmask to ${extended} with status=${enums_2.EzspStatus[extSecStatus]}.`);
        }
        if (!fromBackup && STACK_CONFIGS[this.stackConfig].KEY_TABLE_SIZE) {
            emberStatus = await this.ezsp.ezspClearKeyTable();
            if (emberStatus !== enums_2.EmberStatus.SUCCESS) {
                throw new Error(`[INIT FORM] Failed to clear key table with status=${enums_2.EmberStatus[emberStatus]}.`);
            }
        }
        const netParams = {
            panId,
            extendedPanId,
            radioTxPower: 5,
            radioChannel,
            joinMethod: enums_2.EmberJoinMethod.MAC_ASSOCIATION,
            nwkManagerId: consts_2.ZIGBEE_COORDINATOR_ADDRESS,
            nwkUpdateId: 0,
            channels: consts_2.EMBER_ALL_802_15_4_CHANNELS_MASK,
        };
        logger_1.logger.info(`[INIT FORM] Forming new network with: ${JSON.stringify(netParams)}`, NS);
        emberStatus = (await this.ezsp.ezspFormNetwork(netParams));
        if (emberStatus !== enums_2.EmberStatus.SUCCESS) {
            throw new Error(`[INIT FORM] Failed form network request with status=${enums_2.EmberStatus[emberStatus]}.`);
        }
        await this.oneWaitress.startWaitingForEvent({ eventName: oneWaitress_1.OneWaitressEvents.STACK_STATUS_NETWORK_UP }, DEFAULT_NETWORK_REQUEST_TIMEOUT, '[INIT FORM] Form network');
        const stStatus = await this.ezsp.ezspStartWritingStackTokens();
        logger_1.logger.debug(`[INIT FORM] Start writing stack tokens status=${enums_2.EzspStatus[stStatus]}.`, NS);
        logger_1.logger.info(`[INIT FORM] New network formed!`, NS);
    }
    /**
     * Loads currently stored backup and returns it in internal backup model.
     */
    async getStoredBackup() {
        try {
            await mz_1.fs.access(this.backupPath);
        }
        catch (error) {
            return null;
        }
        let data;
        try {
            data = JSON.parse((await mz_1.fs.readFile(this.backupPath)).toString());
        }
        catch (error) {
            throw new Error(`[BACKUP] Coordinator backup is corrupted.`);
        }
        if (data.metadata?.format === "zigpy/open-coordinator-backup" && data.metadata?.version) {
            if (data.metadata?.version !== 1) {
                throw new Error(`[BACKUP] Unsupported open coordinator backup version (version=${data.metadata?.version}).`);
            }
            if (!data.stack_specific?.ezsp || !data.metadata.internal.ezspVersion) {
                throw new Error(`[BACKUP] Current backup file is not for EmberZNet stack.`);
            }
            if (data.metadata.internal.ezspVersion < BACKUP_OLDEST_SUPPORTED_EZSP_VERSION) {
                throw new Error(`[BACKUP] Current backup file is from an unsupported EZSP version (min: ${BACKUP_OLDEST_SUPPORTED_EZSP_VERSION}).`);
            }
            return utils_1.BackupUtils.fromUnifiedBackup(data);
        }
        else {
            throw new Error(`[BACKUP] Unknown backup format.`);
        }
    }
    /**
     * Export link keys for backup.
     *
     * @return List of keys data with AES hashed keys
     */
    async exportLinkKeys() {
        const [confStatus, keyTableSize] = (await this.ezsp.ezspGetConfigurationValue(enums_1.EzspConfigId.KEY_TABLE_SIZE));
        if (confStatus !== enums_2.EzspStatus.SUCCESS) {
            throw new Error(`[BACKUP] Failed to retrieve key table size from NCP with status=${enums_2.EzspStatus[confStatus]}.`);
        }
        let deviceEui64;
        let plaintextKey;
        let apsKeyMeta;
        let status;
        const keyList = [];
        for (let i = 0; i < keyTableSize; i++) {
            [deviceEui64, plaintextKey, apsKeyMeta, status] = (await this.ezsp.ezspExportLinkKeyByIndex(i));
            logger_1.logger.debug(`[BACKUP] Export link key at index ${i}, status=${enums_2.SLStatus[status]}.`, NS);
            // only include key if we could retrieve one at index and hash it properly
            if (status === enums_2.SLStatus.OK) {
                // Rather than give the real link key, the backup contains a hashed version of the key.
                // This is done to prevent a compromise of the backup data from compromising the current link keys.
                // This is per the Smart Energy spec.
                const [hashStatus, hashedKey] = (await this.emberAesHashSimple(plaintextKey.contents));
                if (hashStatus === enums_2.EmberStatus.SUCCESS) {
                    keyList.push({
                        deviceEui64,
                        key: { contents: hashedKey },
                        outgoingFrameCounter: apsKeyMeta.outgoingFrameCounter,
                        incomingFrameCounter: apsKeyMeta.incomingFrameCounter,
                    });
                }
                else {
                    // this should never happen?
                    logger_1.logger.error(`[BACKUP] Failed to hash link key at index ${i} with status=${enums_2.EmberStatus[hashStatus]}. Omitting from backup.`, NS);
                }
            }
        }
        logger_1.logger.info(`[BACKUP] Retrieved ${keyList.length} link keys.`, NS);
        return keyList;
    }
    /**
     * Import link keys from backup.
     *
     * @param backupData
     */
    async importLinkKeys(backupData) {
        if (!backupData?.length) {
            return;
        }
        const [confStatus, keyTableSize] = (await this.ezsp.ezspGetConfigurationValue(enums_1.EzspConfigId.KEY_TABLE_SIZE));
        if (confStatus !== enums_2.EzspStatus.SUCCESS) {
            throw new Error(`[BACKUP] Failed to retrieve key table size from NCP with status=${enums_2.EzspStatus[confStatus]}.`);
        }
        if (backupData.length > keyTableSize) {
            throw new Error(`[BACKUP] Current key table of ${keyTableSize} is too small to import backup of ${backupData.length}!`);
        }
        const networkStatus = (await this.emberNetworkState());
        if (networkStatus !== enums_2.EmberNetworkStatus.NO_NETWORK) {
            throw new Error(`[BACKUP] Cannot import TC data while network is up, networkStatus=${enums_2.EmberNetworkStatus[networkStatus]}.`);
        }
        let status;
        for (let i = 0; i < keyTableSize; i++) {
            if (i >= backupData.length) {
                // erase any key index not present in backup but available on the NCP
                status = (await this.ezsp.ezspEraseKeyTableEntry(i));
            }
            else {
                const importStatus = (await this.ezsp.ezspImportLinkKey(i, backupData[i].deviceEui64, backupData[i].key));
                status = ((importStatus === enums_2.SLStatus.OK) ? enums_2.EmberStatus.SUCCESS : enums_2.EmberStatus.KEY_TABLE_INVALID_ADDRESS);
            }
            if (status !== enums_2.EmberStatus.SUCCESS) {
                throw new Error(`[BACKUP] Failed to ${((i >= backupData.length) ? "erase" : "set")} key table entry at index ${i} `
                    + `with status=${enums_2.EmberStatus[status]}`);
            }
        }
        logger_1.logger.info(`[BACKUP] Imported ${backupData.length} keys.`, NS);
    }
    /**
     * Routine to update the network key and broadcast the update to the network after a set time.
     * NOTE: This should run at a large interval, but before the uint32_t of the frame counter is able to reach all Fs (can't wrap to 0).
     *       This may disrupt sleepy end devices that miss the update, but they should be able to TC rejoin (in most cases...).
     *       On the other hand, the more often this runs, the more secure the network is...
     */
    async broadcastNetworkKeyUpdate() {
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                logger_1.logger.warning(`[TRUST CENTER] Performing a network key update. This might take a while and disrupt normal operation.`, NS);
                // zero-filled = let stack generate new random network key
                let status = await this.ezsp.ezspBroadcastNextNetworkKey({ contents: Buffer.alloc(consts_1.EMBER_ENCRYPTION_KEY_SIZE) });
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`[TRUST CENTER] Failed to broadcast next network key with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status;
                }
                // XXX: this will block other requests for a while, but should ensure the key propagates without interference?
                //      could also stop dispatching entirely and do this outside the queue if necessary/better
                await (0, utils_1.Wait)(BROADCAST_NETWORK_KEY_SWITCH_WAIT_TIME);
                status = (await this.ezsp.ezspBroadcastNetworkKeySwitch());
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    // XXX: Not sure how likely this is, but this is bad, probably should hard fail?
                    logger_1.logger.error(`[TRUST CENTER] Failed to broadcast network key switch with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status;
                }
                resolve();
                return status;
            }, reject);
        });
    }
    /**
     * Received when EZSP layer alerts of a problem that needs the NCP to be reset.
     * @param status
     */
    async onNcpNeedsResetAndInit(status) {
        logger_1.logger.error(`!!! NCP FATAL ERROR reason=${enums_2.EzspStatus[status]}. ATTEMPTING RESET... !!!`, NS);
        try {
            await this.stop();
            await (0, utils_1.Wait)(500); // just because
            await this.start();
        }
        catch (err) {
            logger_1.logger.error(`Failed to reset and init NCP. ${err}`, NS);
            this.emit(events_1.Events.disconnected);
        }
    }
    //---- START Events
    //---- END Events
    //---- START Cache-enabled EZSP wrappers
    /**
     * Clear the cached network values (set to invalid values).
     */
    clearNetworkCache() {
        this.networkCache = (0, initters_1.initNetworkCache)();
    }
    /**
     * Return the current network state.
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against UNKNOWN_NETWORK_STATE for validity.
     */
    async emberNetworkState() {
        if (this.networkCache.status === consts_2.UNKNOWN_NETWORK_STATE) {
            const networkStatus = (await this.ezsp.ezspNetworkState());
            this.networkCache.status = networkStatus;
        }
        return this.networkCache.status;
    }
    /**
     * Return the EUI 64 of the local node
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against BLANK_EUI64 for validity.
     */
    async emberGetEui64() {
        if (this.networkCache.eui64 === consts_2.BLANK_EUI64) {
            this.networkCache.eui64 = (await this.ezsp.ezspGetEui64());
        }
        return this.networkCache.eui64;
    }
    /**
     * Return the PAN ID of the local node.
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against INVALID_PAN_ID for validity.
     */
    async emberGetPanId() {
        if (this.networkCache.parameters.panId === consts_2.INVALID_PAN_ID) {
            const [status, , parameters] = (await this.ezsp.ezspGetNetworkParameters());
            if (status === enums_2.EmberStatus.SUCCESS) {
                this.networkCache.parameters = parameters;
            }
            else {
                logger_1.logger.error(`Failed to get PAN ID (via network parameters) with status=${enums_2.EmberStatus[status]}.`, NS);
            }
        }
        return this.networkCache.parameters.panId;
    }
    /**
     * Return the Extended PAN ID of the local node.
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against BLANK_EXTENDED_PAN_ID for validity.
     */
    async emberGetExtendedPanId() {
        if ((0, es6_1.default)(this.networkCache.parameters.extendedPanId, consts_2.BLANK_EXTENDED_PAN_ID)) {
            const [status, , parameters] = (await this.ezsp.ezspGetNetworkParameters());
            if (status === enums_2.EmberStatus.SUCCESS) {
                this.networkCache.parameters = parameters;
            }
            else {
                logger_1.logger.error(`Failed to get Extended PAN ID (via network parameters) with status=${enums_2.EmberStatus[status]}.`, NS);
            }
        }
        return this.networkCache.parameters.extendedPanId;
    }
    /**
     * Return the radio channel (uint8_t) of the current network.
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against INVALID_RADIO_CHANNEL for validity.
     */
    async emberGetRadioChannel() {
        if (this.networkCache.parameters.radioChannel === consts_2.INVALID_RADIO_CHANNEL) {
            const [status, , parameters] = (await this.ezsp.ezspGetNetworkParameters());
            if (status === enums_2.EmberStatus.SUCCESS) {
                this.networkCache.parameters = parameters;
            }
            else {
                logger_1.logger.error(`Failed to get radio channel (via network parameters) with status=${enums_2.EmberStatus[status]}.`, NS);
            }
        }
        return this.networkCache.parameters.radioChannel;
    }
    // queued
    async emberStartEnergyScan() {
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                const status = (await this.ezsp.ezspStartScan(enums_2.EzspNetworkScanType.ENERGY_SCAN, consts_2.EMBER_ALL_802_15_4_CHANNELS_MASK, ENERGY_SCAN_DURATION));
                if (status !== enums_2.SLStatus.OK) {
                    logger_1.logger.error(`Failed energy scan request with status=${enums_2.SLStatus[status]}.`, NS);
                    return enums_2.EmberStatus.ERR_FATAL;
                }
                // TODO: result in logs only atm, since UI doesn't support it
                resolve();
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    //---- END Cache-enabled EZSP wrappers
    //---- START EZSP wrappers
    /**
     * Ensure the Host & NCP are aligned on protocols using version.
     * Cache the retrieved information.
     *
     * NOTE: currently throws on mismatch until support for lower versions is implemented (not planned atm)
     *
     * Does nothing if ncpNeedsResetAndInit == true.
     */
    async emberVersion() {
        // Note that NCP == Network Co-Processor
        // the EZSP protocol version that the Host is running, we are the host so we set this value
        const hostEzspProtocolVer = consts_1.EZSP_PROTOCOL_VERSION;
        // send the Host version number to the NCP.
        // The NCP returns the EZSP version that the NCP is running along with the stackType and stackVersion
        const [ncpEzspProtocolVer, ncpStackType, ncpStackVer] = (await this.ezsp.ezspVersion(hostEzspProtocolVer));
        // verify that the stack type is what is expected
        if (ncpStackType !== consts_1.EZSP_STACK_TYPE_MESH) {
            throw new Error(`Stack type ${ncpStackType} is not expected!`);
        }
        // verify that the NCP EZSP Protocol version is what is expected
        if (ncpEzspProtocolVer !== consts_1.EZSP_PROTOCOL_VERSION) {
            throw new Error(`NCP EZSP protocol version of ${ncpEzspProtocolVer} does not match Host version ${hostEzspProtocolVer}`);
        }
        logger_1.logger.debug(`NCP info: EZSPVersion=${ncpEzspProtocolVer} StackType=${ncpStackType} StackVersion=${ncpStackVer}`, NS);
        const [status, versionStruct] = (await this.ezsp.ezspGetVersionStruct());
        if (status !== enums_2.EzspStatus.SUCCESS) {
            // Should never happen with support of only EZSP v13+
            throw new Error(`NCP has old-style version number. Not supported.`);
        }
        this.version = {
            ezsp: ncpEzspProtocolVer,
            revision: `${versionStruct.major}.${versionStruct.minor}.${versionStruct.patch} [${enums_2.EmberVersionType[versionStruct.type]}]`,
            ...versionStruct,
        };
        if (versionStruct.type !== enums_2.EmberVersionType.GA) {
            logger_1.logger.warning(`NCP is running a non-GA version (${enums_2.EmberVersionType[versionStruct.type]}).`, NS);
        }
        logger_1.logger.debug(`NCP version info: ${JSON.stringify(this.version)}`, NS);
    }
    /**
     * This function sets an EZSP config value.
     * WARNING: Do not call for values that cannot be set after init without first resetting NCP (like table sizes).
     *          To avoid an extra NCP call, this does not check for it.
     * @param configId
     * @param value uint16_t
     * @returns
     */
    async emberSetEzspConfigValue(configId, value) {
        const status = (await this.ezsp.ezspSetConfigurationValue(configId, value));
        logger_1.logger.debug(`[EzspConfigId] SET "${enums_1.EzspConfigId[configId]}" TO "${value}" with status=${enums_2.EzspStatus[status]}.`, NS);
        if (status === enums_2.EzspStatus.ERROR_INVALID_ID) {
            // can be ZLL where not all NCPs need or support it.
            logger_1.logger.warning(`[EzspConfigId] Unsupported configuration ID ${enums_1.EzspConfigId[configId]} by NCP.`, NS);
        }
        else if (status !== enums_2.EzspStatus.SUCCESS) {
            logger_1.logger.warning(`[EzspConfigId] Failed to SET "${enums_1.EzspConfigId[configId]}" TO "${value}" with status=${enums_2.EzspStatus[status]}. `
                + `Firmware value will be used instead.`, NS);
        }
        return status;
    }
    /**
     * This function sets an EZSP value.
     * @param valueId
     * @param valueLength uint8_t
     * @param value uint8_t *
     * @returns
     */
    async emberSetEzspValue(valueId, valueLength, value) {
        const status = (await this.ezsp.ezspSetValue(valueId, valueLength, value));
        logger_1.logger.debug(`[EzspValueId] SET "${enums_1.EzspValueId[valueId]}" TO "${value}" with status=${enums_2.EzspStatus[status]}.`, NS);
        return status;
    }
    /**
     * This function sets an EZSP policy.
     * @param policyId
     * @param decisionId Can be bitop
     * @returns
     */
    async emberSetEzspPolicy(policyId, decisionId) {
        const status = (await this.ezsp.ezspSetPolicy(policyId, decisionId));
        logger_1.logger.debug(`[EzspPolicyId] SET "${enums_1.EzspPolicyId[policyId]}" TO "${decisionId}" with status=${enums_2.EzspStatus[status]}.`, NS);
        return status;
    }
    /**
     * Here we convert the normal Ember AES hash call to the specialized EZSP call.
     * This came about because we cannot pass a block of data that is
     * both input and output into EZSP. The block must be broken up into two
     * elements. We unify the two pieces here to make it invisible to the users.
     * @param context EmberAesMmoHashContext *
     * @param finalize
     * @param data uint8_t * Expected of valid length (as in, not larger alloc)
     * @returns status
     * @returns result context or null
     */
    async aesMmoHash(context, finalize, data) {
        if (data.length > 255) {
            throw new Error(enums_2.EzspStatus[enums_2.EzspStatus.ERROR_INVALID_CALL]);
        }
        const [status, reContext] = (await this.ezsp.ezspAesMmoHash(context, finalize, data));
        return [status, reContext];
    }
    /**
     *  This routine processes the passed chunk of data and updates
     *  the hash calculation based on it.  The data passed in MUST
     *  have a length that is a multiple of 16.
     *
     * @param context EmberAesMmoHashContext*  A pointer to the location of the hash context to update.
     * @param data const uint8_t* A pointer to the location of the data to hash.
     *
     * @returns An ::EmberStatus value indicating EMBER_SUCCESS if the hash was
     *   calculated successfully.  EMBER_INVALID_CALL if the block size is not a
     *   multiple of 16 bytes, and EMBER_INDEX_OUT_OF_RANGE is returned when the
     *   data exceeds the maximum limits of the hash function.
     * @returns result context or null
     */
    async emberAesMmoHashUpdate(context, data) {
        return this.aesMmoHash(context, false /*finalize?*/, data);
    }
    /**
     *  This routine processes the passed chunk of data (if non-NULL)
     *  and update the hash context that is passed in.  In then performs
     *  the final calculations on the hash and returns the final answer
     *  in the result parameter of the ::EmberAesMmoHashContext structure.
     *  The length of the data passed in may be any value, it does not have
     *  to be a multiple of 16.
     *
     * @param context EmberAesMmoHashContext * A pointer to the location of the hash context to finalize.
     * @param data uint8_t * A pointer to the location of data to hash. May be NULL.
     *
     * @returns An ::EmberStatus value indicating EMBER_SUCCESS if the hash was
     *   calculated successfully.  EMBER_INVALID_CALL if the block size is not a
     *   multiple of 16 bytes, and EMBER_INDEX_OUT_OF_RANGE is returned when the
     *   data exceeds the maximum limits of the hash function.
     * @returns result context or null
     */
    async emberAesMmoHashFinal(context, data) {
        return this.aesMmoHash(context, true /*finalize?*/, data);
    }
    /**
     *  This is a convenience method when the hash data is less than 255
     *  bytes. It inits, updates, and finalizes the hash in one function call.
     *
     * @param data const uint8_t* The data to hash. Expected of valid length (as in, not larger alloc)
     *
     * @returns An ::EmberStatus value indicating EMBER_SUCCESS if the hash was
     *   calculated successfully.  EMBER_INVALID_CALL if the block size is not a
     *   multiple of 16 bytes, and EMBER_INDEX_OUT_OF_RANGE is returned when the
     *   data exceeds the maximum limits of the hash function.
     * @returns result uint8_t*  The location where the result of the hash will be written.
     */
    async emberAesHashSimple(data) {
        const context = (0, initters_1.aesMmoHashInit)();
        const [status, reContext] = (await this.emberAesMmoHashFinal(context, data));
        return [status, reContext?.result];
    }
    /**
     * Enable local permit join and optionally broadcast the ZDO Mgmt_Permit_Join_req message.
     * This API can be called from any device type and still return EMBER_SUCCESS.
     * If the API is called from an end device, the permit association bit will just be left off.
     *
     * @param duration uint8_t The duration that the permit join bit will remain on
     * and other devices will be able to join the current network.
     * @param broadcastMgmtPermitJoin whether or not to broadcast the ZDO Mgmt_Permit_Join_req message.
     *
     * @returns status of whether or not permit join was enabled.
     * @returns apsFrame Will be null if not broadcasting.
     * @returns messageTag The tag passed to ezspSend${x} function.
     */
    async emberPermitJoining(duration, broadcastMgmtPermitJoin) {
        let status = (await this.ezsp.ezspPermitJoining(duration));
        let apsFrame = null;
        let messageTag = null;
        logger_1.logger.debug(`Permit joining for ${duration} sec. status=${[status]}`, NS);
        if (broadcastMgmtPermitJoin) {
            // `authentication`: TC significance always 1 (zb specs)
            [status, apsFrame, messageTag] = (await this.emberPermitJoiningRequest(consts_2.EMBER_BROADCAST_ADDRESS, duration, 1, DEFAULT_APS_OPTIONS));
        }
        return [status, apsFrame, messageTag];
    }
    /**
     * Set the trust center policy bitmask using decision.
     * @param decision
     * @returns
     */
    async emberSetJoinPolicy(decision) {
        let policy = enums_1.EzspDecisionBitmask.DEFAULT_CONFIGURATION;
        if (decision == enums_2.EmberJoinDecision.USE_PRECONFIGURED_KEY) {
            policy = (enums_1.EzspDecisionBitmask.ALLOW_JOINS | enums_1.EzspDecisionBitmask.ALLOW_UNSECURED_REJOINS);
        }
        else if (decision == enums_2.EmberJoinDecision.SEND_KEY_IN_THE_CLEAR) {
            policy = (enums_1.EzspDecisionBitmask.ALLOW_JOINS | enums_1.EzspDecisionBitmask.ALLOW_UNSECURED_REJOINS | enums_1.EzspDecisionBitmask.SEND_KEY_IN_CLEAR);
        }
        else if (decision == enums_2.EmberJoinDecision.ALLOW_REJOINS_ONLY) {
            policy = enums_1.EzspDecisionBitmask.ALLOW_UNSECURED_REJOINS;
        }
        return this.emberSetEzspPolicy(enums_1.EzspPolicyId.TRUST_CENTER_POLICY, policy);
    }
    /**
     * Get Source Route Overhead
     *
     * Returns the number of bytes needed in a packet for source routing.
     * Since each hop consumes 2 bytes in the packet, this routine calculates the
     * total number of bytes needed based on number of hops to reach the destination.
     *
     * This function is called by the framework to determine the overhead required
     * in the network frame for source routing to a particular destination.
     *
     * @param destination The node id of the destination  Ver.: always
     * @returns int8u The number of bytes needed for source routing in a packet.
     */
    async emberGetSourceRouteOverhead(destination) {
        const [status, value] = (await this.ezsp.ezspGetSourceRouteOverhead(destination));
        if (status === enums_2.EzspStatus.SUCCESS) {
            return value;
        }
        else {
            logger_1.logger.debug(`Failed to get source route overhead (via extended value), status=${enums_2.EzspStatus[status]}.`, NS);
        }
        return 0;
    }
    /**
     * Return the maximum size of the payload that the Application Support sub-layer will accept for
     * the given message type, destination, and APS frame.
     *
     * The size depends on multiple factors, including the security level in use and additional information
     * added to the message to support the various options.
     *
     * @param type The outgoing message type.
     * @param indexOrDestination uint16_t Depending on the message type, this is either the
     *  EmberNodeId of the destination, an index into the address table, an index
     *  into the binding table, the multicast identifier, or a broadcast address.
     * @param apsFrame EmberApsFrame *The APS frame for the message.
     * @return uint8_t The maximum APS payload length for the given message.
     */
    async maximumApsPayloadLength(type, indexOrDestination, apsFrame) {
        let destination = consts_2.EMBER_UNKNOWN_NODE_ID;
        let max = consts_2.MAXIMUM_APS_PAYLOAD_LENGTH; // uint8_t
        if ((apsFrame.options & enums_2.EmberApsOption.ENCRYPTION) !== 0) {
            max -= consts_2.APS_ENCRYPTION_OVERHEAD;
        }
        if ((apsFrame.options & enums_2.EmberApsOption.SOURCE_EUI64) !== 0) {
            max -= consts_1.EUI64_SIZE;
        }
        if ((apsFrame.options & enums_2.EmberApsOption.DESTINATION_EUI64) !== 0) {
            max -= consts_1.EUI64_SIZE;
        }
        if ((apsFrame.options & enums_2.EmberApsOption.FRAGMENT) !== 0) {
            max -= consts_2.APS_FRAGMENTATION_OVERHEAD;
        }
        switch (type) {
            case enums_2.EmberOutgoingMessageType.DIRECT:
                destination = indexOrDestination;
                break;
            case enums_2.EmberOutgoingMessageType.VIA_ADDRESS_TABLE:
                destination = (await this.ezsp.ezspGetAddressTableRemoteNodeId(indexOrDestination));
                break;
            case enums_2.EmberOutgoingMessageType.VIA_BINDING:
                destination = (await this.ezsp.ezspGetBindingRemoteNodeId(indexOrDestination));
                break;
            case enums_2.EmberOutgoingMessageType.MULTICAST:
                // APS multicast messages include the two-byte group id and exclude the one-byte destination endpoint,
                // for a net loss of an extra byte.
                max--;
                break;
            case enums_2.EmberOutgoingMessageType.BROADCAST:
                break;
            default:
                break;
        }
        max -= (await this.emberGetSourceRouteOverhead(destination));
        return max;
    }
    //---- END EZSP wrappers
    //---- START Ember ZDO
    /**
     * ZDO
     * Change the default radius for broadcast ZDO requests
     *
     * @param radius uint8_t The radius to be used for future ZDO request broadcasts.
     */
    setZDORequestRadius(radius) {
        this.zdoRequestRadius = radius;
    }
    /**
     * ZDO
     * Retrieve the default radius for broadcast ZDO requests
     *
     * @return uint8_t The radius to be used for future ZDO request broadcasts.
     */
    getZDORequestRadius() {
        return this.zdoRequestRadius;
    }
    /**
     * ZDO
     * Get the next device request sequence number.
     *
     * Requests have sequence numbers so that they can be matched up with the
     * responses. To avoid complexities, the library uses numbers with the high
     * bit clear and the stack uses numbers with the high bit set.
     *
     * @return uint8_t The next device request sequence number
     */
    nextZDORequestSequence() {
        return (this.zdoRequestSequence = ((++this.zdoRequestSequence) & APPLICATION_ZDO_SEQUENCE_MASK));
    }
    /**
     * ZDO
     *
     * @param destination
     * @param clusterId uint16_t
     * @param options
     * @param length uint8_t
     * @returns status Indicates success or failure (with reason) of send
     * @returns apsFrame The APS Frame resulting of the request being built and sent (`sequence` set from stack-given value).
     * @returns messageTag The tag passed to ezspSend${x} function.
     */
    async sendZDORequestBuffer(destination, clusterId, options) {
        if (this.zdoRequestBuffalo.getPosition() > consts_1.EZSP_MAX_FRAME_LENGTH) {
            return [enums_2.EmberStatus.MESSAGE_TOO_LONG, null, null];
        }
        const messageTag = this.nextZDORequestSequence();
        this.zdoRequestBuffalo.setCommandByte(0, messageTag);
        const apsFrame = {
            profileId: zdo_1.ZDO_PROFILE_ID,
            clusterId: clusterId,
            sourceEndpoint: zdo_1.ZDO_ENDPOINT,
            destinationEndpoint: zdo_1.ZDO_ENDPOINT,
            options: options,
            groupId: 0,
            sequence: 0, // set by stack
        };
        const messageContents = this.zdoRequestBuffalo.getWritten();
        if (destination === consts_2.EMBER_BROADCAST_ADDRESS || destination === consts_2.EMBER_RX_ON_WHEN_IDLE_BROADCAST_ADDRESS
            || destination === consts_2.EMBER_SLEEPY_BROADCAST_ADDRESS) {
            logger_1.logger.debug(`~~~> [ZDO BROADCAST apsFrame=${JSON.stringify(apsFrame)} messageTag=${messageTag}]`, NS);
            const [status, apsSequence] = (await this.ezsp.ezspSendBroadcast(destination, apsFrame, this.getZDORequestRadius(), messageTag, messageContents));
            apsFrame.sequence = apsSequence;
            logger_1.logger.debug(`~~~> [SENT ZDO type=BROADCAST apsFrame=${JSON.stringify(apsFrame)} messageTag=${messageTag} status=${enums_2.EmberStatus[status]}]`, NS);
            return [status, apsFrame, messageTag];
        }
        else {
            logger_1.logger.debug(`~~~> [ZDO UNICAST apsFrame=${JSON.stringify(apsFrame)} messageTag=${messageTag}]`, NS);
            const [status, apsSequence] = (await this.ezsp.ezspSendUnicast(enums_2.EmberOutgoingMessageType.DIRECT, destination, apsFrame, messageTag, messageContents));
            apsFrame.sequence = apsSequence;
            logger_1.logger.debug(`~~~> [SENT ZDO type=DIRECT apsFrame=${JSON.stringify(apsFrame)} messageTag=${messageTag} status=${enums_2.EmberStatus[status]}]`, NS);
            return [status, apsFrame, messageTag];
        }
    }
    /**
     * ZDO
     * Service Discovery Functions
     * Request the specified node to send a list of its endpoints that
     * match the specified application profile and, optionally, lists of input
     * and/or output clusters.
     * @param target  The node whose matching endpoints are desired. The request can
     * be sent unicast or broadcast ONLY to the "RX-on-when-idle-address" (0xFFFD)
     * If sent as a broadcast, any node that has matching endpoints will send a
     * response.
     * @param profile uint16_t The application profile to match.
     * @param inCount uint8_t The number of input clusters. To not match any input
     * clusters, set this value to 0.
     * @param outCount uint8_t The number of output clusters. To not match any output
     * clusters, set this value to 0.
     * @param inClusters uint16_t * The list of input clusters.
     * @param outClusters uint16_t * The list of output clusters.
     * @param options  The options to use when sending the unicast request. See
     * emberSendUnicast() for a description. This parameter is ignored if the target
     * is a broadcast address.
     * @returns An EmberStatus value. EMBER_SUCCESS, MESSAGE_TOO_LONG,
     * EMBER_NETWORK_DOWN or EMBER_NETWORK_BUSY.
     */
    async emberMatchDescriptorsRequest(target, profile, inClusters, outClusters, options) {
        // 2 bytes for NWK Address + 2 bytes for Profile Id + 1 byte for in Cluster Count
        // + in times 2 for 2 byte Clusters + out Cluster Count + out times 2 for 2 byte Clusters
        const length = (zdo_1.ZDO_MESSAGE_OVERHEAD + 2 + 2 + 1 + (inClusters.length * 2) + 1 + (outClusters.length * 2));
        // sanity check
        if (length > consts_1.EZSP_MAX_FRAME_LENGTH) {
            return [enums_2.EmberStatus.MESSAGE_TOO_LONG, null, null];
        }
        this.zdoRequestBuffalo.setPosition(zdo_1.ZDO_MESSAGE_OVERHEAD);
        this.zdoRequestBuffalo.writeUInt16(target);
        this.zdoRequestBuffalo.writeUInt16(profile);
        this.zdoRequestBuffalo.writeUInt8(inClusters.length);
        this.zdoRequestBuffalo.writeListUInt16(inClusters);
        this.zdoRequestBuffalo.writeUInt8(outClusters.length);
        this.zdoRequestBuffalo.writeListUInt16(outClusters);
        logger_1.logger.debug(`~~~> [ZDO MATCH_DESCRIPTORS_REQUEST target=${target} profile=${profile} inClusters=${inClusters} outClusters=${outClusters}]`, NS);
        return this.sendZDORequestBuffer(target, zdo_1.MATCH_DESCRIPTORS_REQUEST, options);
    }
    /**
     * ZDO
     * Device Discovery Functions
     * Request the 16 bit network address of a node whose EUI64 is known.
     *
     * @param target           The EUI64 of the node.
     * @param reportKids       true to request that the target list their children
     *                         in the response.
     * @param childStartIndex uint8_t The index of the first child to list in the response.
     *                         Ignored if @c reportKids is false.
     *
     * @return An ::EmberStatus value.
     * - ::EMBER_SUCCESS - The request was transmitted successfully.
     * - ::EMBER_NO_BUFFERS - Insufficient message buffers were available to construct the request.
     * - ::EMBER_NETWORK_DOWN - The node is not part of a network.
     * - ::EMBER_NETWORK_BUSY - Transmission of the request failed.
     */
    async emberNetworkAddressRequest(target, reportKids, childStartIndex) {
        this.zdoRequestBuffalo.setPosition(zdo_1.ZDO_MESSAGE_OVERHEAD);
        this.zdoRequestBuffalo.writeIeeeAddr(target);
        this.zdoRequestBuffalo.writeUInt8(reportKids ? 1 : 0);
        this.zdoRequestBuffalo.writeUInt8(childStartIndex);
        logger_1.logger.debug(`~~~> [ZDO NETWORK_ADDRESS_REQUEST target=${target} reportKids=${reportKids} childStartIndex=${childStartIndex}]`, NS);
        return this.sendZDORequestBuffer(consts_2.EMBER_RX_ON_WHEN_IDLE_BROADCAST_ADDRESS, zdo_1.NETWORK_ADDRESS_REQUEST, enums_2.EmberApsOption.SOURCE_EUI64);
    }
    /**
     * ZDO
     * Device Discovery Functions
     * @brief Request the EUI64 of a node whose 16 bit network address is known.
     *
     * @param target uint16_t The network address of the node.
     * @param reportKids uint8_t true to request that the target list their children
     *                         in the response.
     * @param childStartIndex uint8_t The index of the first child to list in the response.
     *                         Ignored if reportKids is false.
     * @param options The options to use when sending the request. See ::emberSendUnicast() for a description.
     *
     * @return An ::EmberStatus value.
     * - ::EMBER_SUCCESS
     * - ::EMBER_NO_BUFFERS
     * - ::EMBER_NETWORK_DOWN
     * - ::EMBER_NETWORK_BUSY
     */
    async emberIeeeAddressRequest(target, reportKids, childStartIndex, options) {
        this.zdoRequestBuffalo.setPosition(zdo_1.ZDO_MESSAGE_OVERHEAD);
        this.zdoRequestBuffalo.writeUInt16(target);
        this.zdoRequestBuffalo.writeUInt8(reportKids ? 1 : 0);
        this.zdoRequestBuffalo.writeUInt8(childStartIndex);
        logger_1.logger.debug(`~~~> [ZDO IEEE_ADDRESS_REQUEST target=${target} reportKids=${reportKids} childStartIndex=${childStartIndex}]`, NS);
        return this.sendZDORequestBuffer(target, zdo_1.IEEE_ADDRESS_REQUEST, options);
    }
    /**
     * ZDO
     * @param discoveryNodeId uint16_t
     * @param reportKids uint8_t
     * @param childStartIndex uint8_t
     * @param options
     * @param targetNodeIdOfRequest
     */
    async emberIeeeAddressRequestToTarget(discoveryNodeId, reportKids, childStartIndex, options, targetNodeIdOfRequest) {
        this.zdoRequestBuffalo.setPosition(zdo_1.ZDO_MESSAGE_OVERHEAD);
        this.zdoRequestBuffalo.writeUInt16(discoveryNodeId);
        this.zdoRequestBuffalo.writeUInt8(reportKids ? 1 : 0);
        this.zdoRequestBuffalo.writeUInt8(childStartIndex);
        logger_1.logger.debug(`~~~> [ZDO IEEE_ADDRESS_REQUEST targetNodeIdOfRequest=${targetNodeIdOfRequest} discoveryNodeId=${discoveryNodeId} `
            + `reportKids=${reportKids} childStartIndex=${childStartIndex}]`, NS);
        return this.sendZDORequestBuffer(targetNodeIdOfRequest, zdo_1.IEEE_ADDRESS_REQUEST, options);
    }
    /**
     * ZDO
     *
     * @param target uint16_t
     * @param clusterId uint16_t
     * @param options
     * @returns
     */
    async emberSendZigDevRequestTarget(target, clusterId, options) {
        this.zdoRequestBuffalo.setPosition(zdo_1.ZDO_MESSAGE_OVERHEAD);
        this.zdoRequestBuffalo.writeUInt16(target);
        return this.sendZDORequestBuffer(target, clusterId, options);
    }
    /**
     * ZDO
     * @brief Request the specified node to send the simple descriptor for
     * the specified endpoint.
     * The simple descriptor contains information specific
     * to a single endpoint. It describes the application profile identifier,
     * application device identifier, application device version, application flags,
     * application input clusters and application output clusters. It is defined in
     * the ZigBee Application Framework Specification.
     *
     * @param target uint16_t The node of interest.
     * @param targetEndpoint uint8_t The endpoint on the target node whose simple
     * descriptor is desired.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    async emberSimpleDescriptorRequest(target, targetEndpoint, options) {
        this.zdoRequestBuffalo.setPosition(zdo_1.ZDO_MESSAGE_OVERHEAD);
        this.zdoRequestBuffalo.writeUInt16(target);
        this.zdoRequestBuffalo.writeUInt8(targetEndpoint);
        logger_1.logger.debug(`~~~> [ZDO SIMPLE_DESCRIPTOR_REQUEST target=${target} targetEndpoint=${targetEndpoint}]`, NS);
        return this.sendZDORequestBuffer(target, zdo_1.SIMPLE_DESCRIPTOR_REQUEST, options);
    }
    /**
     * ZDO
     * Common logic used by `emberBindRequest` & `emberUnbindRequest`.
     *
     * @param target
     * @param bindClusterId
     * @param source
     * @param sourceEndpoint
     * @param clusterId
     * @param type
     * @param destination
     * @param groupAddress
     * @param destinationEndpoint
     * @param options
     *
     * @returns An ::EmberStatus value.
     * - ::EMBER_SUCCESS
     * - ::EMBER_NO_BUFFERS
     * - ::EMBER_NETWORK_DOWN
     * - ::EMBER_NETWORK_BUSY
     * @returns APS frame created for the request
     * @returns The tag used on the message.
     */
    async emberSendZigDevBindRequest(target, bindClusterId, source, sourceEndpoint, clusterId, type, destination, groupAddress, destinationEndpoint, options) {
        this.zdoRequestBuffalo.setPosition(zdo_1.ZDO_MESSAGE_OVERHEAD);
        this.zdoRequestBuffalo.writeIeeeAddr(source);
        this.zdoRequestBuffalo.writeUInt8(sourceEndpoint);
        this.zdoRequestBuffalo.writeUInt16(clusterId);
        this.zdoRequestBuffalo.writeUInt8(type);
        switch (type) {
            case zdo_1.UNICAST_BINDING:
                this.zdoRequestBuffalo.writeIeeeAddr(destination);
                this.zdoRequestBuffalo.writeUInt8(destinationEndpoint);
                break;
            case zdo_1.MULTICAST_BINDING:
                this.zdoRequestBuffalo.writeUInt16(groupAddress);
                break;
            default:
                return [enums_2.EmberStatus.ERR_FATAL, null, null];
        }
        return this.sendZDORequestBuffer(target, bindClusterId, options);
    }
    /**
     * ZDO
     * Send a request to create a binding entry with the specified
     * contents on the specified node.
     *
     * @param target  The node on which the binding will be created.
     * @param source  The source EUI64 in the binding entry.
     * @param sourceEndpoint  The source endpoint in the binding entry.
     * @param clusterId  The cluster ID in the binding entry.
     * @param type  The type of binding, either ::UNICAST_BINDING,
     *   ::MULTICAST_BINDING, or ::UNICAST_MANY_TO_ONE_BINDING.
     *   ::UNICAST_MANY_TO_ONE_BINDING is an Ember-specific extension
     *   and should be used only when the target is an Ember device.
     * @param destination  The destination EUI64 in the binding entry for
     *   ::UNICAST_BINDING or ::UNICAST_MANY_TO_ONE_BINDING.
     * @param groupAddress  The group address for the ::MULTICAST_BINDING.
     * @param destinationEndpoint  The destination endpoint in the binding entry for
     *   the ::UNICAST_BINDING or ::UNICAST_MANY_TO_ONE_BINDING.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @returns An ::EmberStatus value.
     * - ::EMBER_SUCCESS
     * - ::EMBER_NO_BUFFERS
     * - ::EMBER_NETWORK_DOWN
     * - ::EMBER_NETWORK_BUSY
     * @returns APS frame created for the request
     * @returns The tag used on the message.
     */
    async emberBindRequest(target, source, sourceEndpoint, clusterId, type, destination, groupAddress, destinationEndpoint, options) {
        logger_1.logger.debug(`~~~> [ZDO BIND_REQUEST target=${target} source=${source} sourceEndpoint=${sourceEndpoint} clusterId=${clusterId} type=${type} `
            + `destination=${destination} groupAddress=${groupAddress} destinationEndpoint=${destinationEndpoint}]`, NS);
        return this.emberSendZigDevBindRequest(target, zdo_1.BIND_REQUEST, source, sourceEndpoint, clusterId, type, destination, groupAddress, destinationEndpoint, options);
    }
    /**
     * ZDO
     * Send a request to remove a binding entry with the specified
     * contents from the specified node.
     *
     * @param target          The node on which the binding will be removed.
     * @param source          The source EUI64 in the binding entry.
     * @param sourceEndpoint uint8_t The source endpoint in the binding entry.
     * @param clusterId uint16_t      The cluster ID in the binding entry.
     * @param type uint8_t           The type of binding, either ::UNICAST_BINDING,
     *  ::MULTICAST_BINDING, or ::UNICAST_MANY_TO_ONE_BINDING.
     *  ::UNICAST_MANY_TO_ONE_BINDING is an Ember-specific extension
     *  and should be used only when the target is an Ember device.
     * @param destination     The destination EUI64 in the binding entry for the
     *   ::UNICAST_BINDING or ::UNICAST_MANY_TO_ONE_BINDING.
     * @param groupAddress    The group address for the ::MULTICAST_BINDING.
     * @param destinationEndpoint uint8_t The destination endpoint in the binding entry for
     *   the ::UNICAST_BINDING or ::UNICAST_MANY_TO_ONE_BINDING.
     * @param options         The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @returns An ::EmberStatus value.
     * - ::EMBER_SUCCESS
     * - ::EMBER_NO_BUFFERS
     * - ::EMBER_NETWORK_DOWN
     * - ::EMBER_NETWORK_BUSY
     * @returns APS frame created for the request
     * @returns The tag used on the message.
     */
    async emberUnbindRequest(target, source, sourceEndpoint, clusterId, type, destination, groupAddress, destinationEndpoint, options) {
        logger_1.logger.debug(`~~~> [ZDO UNBIND_REQUEST target=${target} source=${source} sourceEndpoint=${sourceEndpoint} clusterId=${clusterId} type=${type} `
            + `destination=${destination} groupAddress=${groupAddress} destinationEndpoint=${destinationEndpoint}]`, NS);
        return this.emberSendZigDevBindRequest(target, zdo_1.UNBIND_REQUEST, source, sourceEndpoint, clusterId, type, destination, groupAddress, destinationEndpoint, options);
    }
    /**
     * ZDO
     * Request the specified node to send a list of its active
     * endpoints. An active endpoint is one for which a simple descriptor is
     * available.
     *
     * @param target  The node whose active endpoints are desired.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    async emberActiveEndpointsRequest(target, options) {
        logger_1.logger.debug(`~~~> [ZDO ACTIVE_ENDPOINTS_REQUEST target=${target}]`, NS);
        return this.emberSendZigDevRequestTarget(target, zdo_1.ACTIVE_ENDPOINTS_REQUEST, options);
    }
    /**
     * ZDO
     * Request the specified node to send its power descriptor.
     * The power descriptor gives a dynamic indication of the power
     * status of the node. It describes current power mode,
     * available power sources, current power source and
     * current power source level. It is defined in the ZigBee
     * Application Framework Specification.
     *
     * @param target  The node whose power descriptor is desired.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    async emberPowerDescriptorRequest(target, options) {
        logger_1.logger.debug(`~~~> [ZDO POWER_DESCRIPTOR_REQUEST target=${target}]`, NS);
        return this.emberSendZigDevRequestTarget(target, zdo_1.POWER_DESCRIPTOR_REQUEST, options);
    }
    /**
     * ZDO
     * Request the specified node to send its node descriptor.
     * The node descriptor contains information about the capabilities of the ZigBee
     * node. It describes logical type, APS flags, frequency band, MAC capabilities
     * flags, manufacturer code and maximum buffer size. It is defined in the ZigBee
     * Application Framework Specification.
     *
     * @param target  The node whose node descriptor is desired.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An ::EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    async emberNodeDescriptorRequest(target, options) {
        logger_1.logger.debug(`~~~> [ZDO NODE_DESCRIPTOR_REQUEST target=${target}]`, NS);
        return this.emberSendZigDevRequestTarget(target, zdo_1.NODE_DESCRIPTOR_REQUEST, options);
    }
    /**
     * ZDO
     * Request the specified node to send its LQI (neighbor) table.
     * The response gives PAN ID, EUI64, node ID and cost for each neighbor. The
     * EUI64 is only available if security is enabled. The other fields in the
     * response are set to zero. The response format is defined in the ZigBee Device
     * Profile Specification.
     *
     * @param target  The node whose LQI table is desired.
     * @param startIndex uint8_t The index of the first neighbor to include in the
     * response.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    async emberLqiTableRequest(target, startIndex, options) {
        logger_1.logger.debug(`~~~> [ZDO LQI_TABLE_REQUEST target=${target} startIndex=${startIndex}]`, NS);
        return this.emberTableRequest(zdo_1.LQI_TABLE_REQUEST, target, startIndex, options);
    }
    /**
     * ZDO
     * Request the specified node to send its routing table.
     * The response gives destination node ID, status and many-to-one flags,
     * and the next hop node ID.
     * The response format is defined in the ZigBee Device
     * Profile Specification.
     *
     * @param target  The node whose routing table is desired.
     * @param startIndex uint8_t The index of the first route entry to include in the
     * response.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    async emberRoutingTableRequest(target, startIndex, options) {
        logger_1.logger.debug(`~~~> [ZDO ROUTING_TABLE_REQUEST target=${target} startIndex=${startIndex}]`, NS);
        return this.emberTableRequest(zdo_1.ROUTING_TABLE_REQUEST, target, startIndex, options);
    }
    /**
     * ZDO
     * Request the specified node to send its nonvolatile bindings.
     * The response gives source address, source endpoint, cluster ID, destination
     * address and destination endpoint for each binding entry. The response format
     * is defined in the ZigBee Device Profile Specification.
     * Note that bindings that have the Ember-specific ::UNICAST_MANY_TO_ONE_BINDING
     * type are reported as having the standard ::UNICAST_BINDING type.
     *
     * @param target  The node whose binding table is desired.
     * @param startIndex uint8_t The index of the first binding entry to include in the
     * response.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    async emberBindingTableRequest(target, startIndex, options) {
        logger_1.logger.debug(`~~~> [ZDO BINDING_TABLE_REQUEST target=${target} startIndex=${startIndex}]`, NS);
        return this.emberTableRequest(zdo_1.BINDING_TABLE_REQUEST, target, startIndex, options);
    }
    /**
     * ZDO
     *
     * @param clusterId uint16_t
     * @param target
     * @param startIndex uint8_t
     * @param options
     * @returns
     */
    async emberTableRequest(clusterId, target, startIndex, options) {
        this.zdoRequestBuffalo.setPosition(zdo_1.ZDO_MESSAGE_OVERHEAD);
        this.zdoRequestBuffalo.writeUInt8(startIndex);
        return this.sendZDORequestBuffer(target, clusterId, options);
    }
    /**
     * ZDO
     * Request the specified node to remove the specified device from
     * the network. The device to be removed must be the node to which the request
     * is sent or one of its children.
     *
     * @param target  The node which will remove the device.
     * @param deviceAddress  All zeros if the target is to remove itself from
     *    the network or the EUI64 of a child of the target device to remove
     *    that child.
     * @param leaveRequestFlags uint8_t A bitmask of leave options.
     *   Include ::AND_REJOIN if the target is to rejoin the network immediately after leaving.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    async emberLeaveRequest(target, deviceAddress, leaveRequestFlags, options) {
        this.zdoRequestBuffalo.setPosition(zdo_1.ZDO_MESSAGE_OVERHEAD);
        this.zdoRequestBuffalo.writeIeeeAddr(deviceAddress);
        this.zdoRequestBuffalo.writeUInt8(leaveRequestFlags);
        logger_1.logger.debug(`~~~> [ZDO LEAVE_REQUEST target=${target} deviceAddress=${deviceAddress} leaveRequestFlags=${leaveRequestFlags}]`, NS);
        return this.sendZDORequestBuffer(target, zdo_1.LEAVE_REQUEST, options);
    }
    /**
     * ZDO
     * Request the specified node to allow or disallow association.
     *
     * @param target  The node which will allow or disallow association. The request
     * can be broadcast by using a broadcast address (0xFFFC/0xFFFD/0xFFFF). No
     * response is sent if the request is broadcast.
     * @param duration uint8_t A value of 0x00 disables joining. A value of 0xFF enables
     * joining.  Any other value enables joining for that number of seconds.
     * @param authentication uint8_t Controls Trust Center authentication behavior.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description. This parameter is ignored if the target
     * is a broadcast address.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    async emberPermitJoiningRequest(target, duration, authentication, options) {
        this.zdoRequestBuffalo.setPosition(zdo_1.ZDO_MESSAGE_OVERHEAD);
        this.zdoRequestBuffalo.writeUInt8(duration);
        this.zdoRequestBuffalo.writeUInt8(authentication);
        logger_1.logger.debug(`~~~> [ZDO PERMIT_JOINING_REQUEST target=${target} duration=${duration} authentication=${authentication}]`, NS);
        return this.sendZDORequestBuffer(target, zdo_1.PERMIT_JOINING_REQUEST, options);
    }
    /**
     * ZDO
     *
     * @see NWK_UPDATE_REQUEST
     *
     * @param target
     * @param scanChannels uint8_t[]
     * @param duration uint8_t
     * @param count uint8_t
     * @param manager
     */
    async emberNetworkUpdateRequest(target, scanChannels, duration, count, manager, options) {
        this.zdoRequestBuffalo.setPosition(zdo_1.ZDO_MESSAGE_OVERHEAD);
        this.zdoRequestBuffalo.writeUInt32(scanChannels.reduce((a, c) => a + (1 << c), 0)); // to uint32_t
        this.zdoRequestBuffalo.writeUInt8(duration);
        if (count != null) {
            this.zdoRequestBuffalo.writeUInt8(count);
        }
        if (manager != null) {
            this.zdoRequestBuffalo.writeUInt16(manager);
        }
        logger_1.logger.debug(`~~~> [ZDO NWK_UPDATE_REQUEST target=${target} scanChannels=${scanChannels} duration=${duration} count=${count} manager=${manager}]`, NS);
        return this.sendZDORequestBuffer(target, zdo_1.NWK_UPDATE_REQUEST, options);
    }
    async emberScanChannelsRequest(target, scanChannels, duration, count, options) {
        return this.emberNetworkUpdateRequest(target, scanChannels, duration, count, null, options);
    }
    async emberChannelChangeRequest(target, channel, options) {
        return this.emberNetworkUpdateRequest(target, [channel], 0xFE, null, null, options);
    }
    async emberSetActiveChannelsAndNwkManagerIdRequest(target, scanChannels, manager, options) {
        return this.emberNetworkUpdateRequest(target, scanChannels, 0xFF, null, manager, options);
    }
    //---- END Ember ZDO
    //-- START Adapter implementation
    static async isValidPath(path) {
        // For TCP paths we cannot get device information, therefore we cannot validate it.
        if (socketPortUtils_1.default.isTcpPath(path)) {
            return false;
        }
        try {
            return serialPortUtils_1.default.is((0, utils_1.RealpathSync)(path), autoDetectDefinitions);
        }
        catch (error) {
            logger_1.logger.debug(`Failed to determine if path is valid: '${error}'`, NS);
            return false;
        }
    }
    static async autoDetectPath() {
        const paths = await serialPortUtils_1.default.find(autoDetectDefinitions);
        paths.sort((a, b) => (a < b) ? -1 : 1);
        return paths.length > 0 ? paths[0] : null;
    }
    async start() {
        logger_1.logger.info(`======== Ember Adapter Starting ========`, NS);
        this.initVariables();
        logger_1.logger.debug(`Starting EZSP with stack configuration: "${this.stackConfig}".`, NS);
        const result = await this.initEzsp();
        return result;
    }
    async stop() {
        this.requestQueue.stopDispatching();
        await this.ezsp.stop();
        this.initVariables();
        logger_1.logger.info(`======== Ember Adapter Stopped ========`, NS);
    }
    // queued, non-InterPAN
    async getCoordinator() {
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.checkInterpanLock();
                // in all likelihood this will be retrieved from cache
                const ieeeAddr = (await this.emberGetEui64());
                resolve({
                    ieeeAddr,
                    networkAddress: consts_2.ZIGBEE_COORDINATOR_ADDRESS,
                    manufacturerID: DEFAULT_MANUFACTURER_CODE,
                    endpoints: endpoints_1.FIXED_ENDPOINTS.map((ep) => {
                        return {
                            profileID: ep.profileId,
                            ID: ep.endpoint,
                            deviceID: ep.deviceId,
                            inputClusters: ep.inClusterList.slice(), // copy
                            outputClusters: ep.outClusterList.slice(), // copy
                        };
                    }),
                });
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    async getCoordinatorVersion() {
        return { type: `EmberZNet`, meta: this.version };
    }
    // queued
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async reset(type) {
        return Promise.reject(new Error("Not supported"));
        // NOTE: although this function is legacy atm, a couple of new untested EZSP functions that could also prove useful:
        // this.ezsp.ezspTokenFactoryReset(true/*excludeOutgoingFC*/, true/*excludeBootCounter*/);
        // this.ezsp.ezspResetNode()
    }
    async supportsBackup() {
        return true;
    }
    // queued
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async backup(ieeeAddressesInDatabase) {
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                // grab fresh version here, bypass cache
                const [netStatus, , netParams] = (await this.ezsp.ezspGetNetworkParameters());
                if (netStatus !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`[BACKUP] Failed to get network parameters.`, NS);
                    return netStatus;
                }
                // update cache
                this.networkCache.parameters = netParams;
                this.networkCache.eui64 = (await this.ezsp.ezspGetEui64());
                const [netKeyStatus, netKeyInfo] = (await this.ezsp.ezspGetNetworkKeyInfo());
                if (netKeyStatus !== enums_2.SLStatus.OK) {
                    logger_1.logger.error(`[BACKUP] Failed to get network keys info.`, NS);
                    return ((netKeyStatus === enums_2.SLStatus.BUSY) || (netKeyStatus === enums_2.SLStatus.NOT_READY))
                        ? enums_2.EmberStatus.NETWORK_BUSY : enums_2.EmberStatus.ERR_FATAL; // allow retry on statuses that should be temporary
                }
                if (!netKeyInfo.networkKeySet) {
                    throw new Error(`[BACKUP] No network key set.`);
                }
                let keyList = [];
                if (STACK_CONFIGS[this.stackConfig].KEY_TABLE_SIZE) {
                    keyList = (await this.exportLinkKeys());
                }
                // XXX: this only makes sense on stop (if that), not hourly/on start, plus network needs to be at near-standstill @see AN1387
                // const tokensBuf = (await EmberTokensManager.saveTokens(
                //     this.ezsp,
                //     Buffer.from(this.networkCache.eui64.substring(2/*0x*/), 'hex').reverse()
                // ));
                let context = (0, initters_1.initSecurityManagerContext)();
                context.coreKeyType = enums_2.SecManKeyType.TC_LINK;
                const [tcLinkKey, tclkStatus] = (await this.ezsp.ezspExportKey(context));
                if (tclkStatus !== enums_2.SLStatus.OK) {
                    throw new Error(`[BACKUP] Failed to export TC Link Key with status=${enums_2.SLStatus[tclkStatus]}.`);
                }
                context = (0, initters_1.initSecurityManagerContext)(); // make sure it's back to zeroes
                context.coreKeyType = enums_2.SecManKeyType.NETWORK;
                context.keyIndex = 0;
                const [networkKey, nkStatus] = (await this.ezsp.ezspExportKey(context));
                if (nkStatus !== enums_2.SLStatus.OK) {
                    throw new Error(`[BACKUP] Failed to export Network Key with status=${enums_2.SLStatus[nkStatus]}.`);
                }
                const zbChannels = Array.from(Array(consts_2.EMBER_NUM_802_15_4_CHANNELS), (e, i) => i + consts_2.EMBER_MIN_802_15_4_CHANNEL_NUMBER);
                resolve({
                    networkOptions: {
                        panId: netParams.panId, // uint16_t
                        extendedPanId: Buffer.from(netParams.extendedPanId),
                        channelList: zbChannels.map((c) => ((2 ** c) & netParams.channels) ? c : null).filter((x) => x),
                        networkKey: networkKey.contents,
                        networkKeyDistribute: false,
                    },
                    logicalChannel: netParams.radioChannel,
                    networkKeyInfo: {
                        sequenceNumber: netKeyInfo.networkKeySequenceNumber,
                        frameCounter: netKeyInfo.networkKeyFrameCounter,
                    },
                    securityLevel: STACK_CONFIGS[this.stackConfig].SECURITY_LEVEL,
                    networkUpdateId: netParams.nwkUpdateId,
                    coordinatorIeeeAddress: Buffer.from(this.networkCache.eui64.substring(2) /*take out 0x*/, 'hex').reverse(),
                    devices: keyList.map((key) => ({
                        networkAddress: null, // not used for restore, no reason to make NCP calls for nothing
                        ieeeAddress: Buffer.from(key.deviceEui64.substring(2) /*take out 0x*/, 'hex').reverse(),
                        isDirectChild: false, // not used
                        linkKey: {
                            key: key.key.contents,
                            rxCounter: key.incomingFrameCounter,
                            txCounter: key.outgoingFrameCounter,
                        },
                    })),
                    ezsp: {
                        version: this.version.ezsp,
                        hashed_tclk: tcLinkKey.contents,
                        // tokens: tokensBuf.toString('hex'),
                        // altNetworkKey: altNetworkKey.contents,
                    }
                });
                return enums_2.EmberStatus.SUCCESS;
            }, reject, true);
        });
    }
    // queued, non-InterPAN
    async getNetworkParameters() {
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.checkInterpanLock();
                // first call will cache for the others, but in all likelihood, it will all be from freshly cached after init
                // since Controller caches this also.
                const channel = (await this.emberGetRadioChannel());
                const panID = (await this.emberGetPanId());
                const extendedPanID = (await this.emberGetExtendedPanId());
                resolve({
                    panID,
                    extendedPanID: parseInt(Buffer.from(extendedPanID).toString('hex'), 16),
                    channel,
                });
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    async supportsChangeChannel() {
        return true;
    }
    // queued
    async changeChannel(newChannel) {
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.checkInterpanLock();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const [status, apsFrame, messageTag] = (await this.emberChannelChangeRequest(consts_2.EMBER_SLEEPY_BROADCAST_ADDRESS, newChannel, DEFAULT_APS_OPTIONS));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`[ZDO] Failed broadcast channel change to "${newChannel}" with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status;
                }
                await this.oneWaitress.startWaitingForEvent({ eventName: oneWaitress_1.OneWaitressEvents.STACK_STATUS_CHANNEL_CHANGED }, DEFAULT_NETWORK_REQUEST_TIMEOUT * 2, // observed to ~9sec
                '[ZDO] Change Channel');
                resolve();
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    // queued
    async setTransmitPower(value) {
        if (typeof value !== 'number') {
            logger_1.logger.error(`Tried to set transmit power to non-number. Value ${value} of type ${typeof value}.`, NS);
            return;
        }
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                const status = await this.ezsp.ezspSetRadioPower(value);
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`Failed to set transmit power to ${value} status=${enums_2.EmberStatus[status]}.`, NS);
                    return status;
                }
                resolve();
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    // queued
    async addInstallCode(ieeeAddress, key) {
        if (!key) {
            throw new Error(`[ADD INSTALL CODE] Failed for "${ieeeAddress}"; no code given.`);
        }
        if (consts_2.EMBER_INSTALL_CODE_SIZES.indexOf(key.length) === -1) {
            throw new Error(`[ADD INSTALL CODE] Failed for "${ieeeAddress}"; invalid code size.`);
        }
        // Reverse the bits in a byte (uint8_t)
        const reverse = (b) => {
            return (((b * 0x0802 & 0x22110) | (b * 0x8020 & 0x88440)) * 0x10101 >> 16) & 0xFF;
        };
        let crc = 0xFFFF; // uint16_t
        // Compute the CRC and verify that it matches.
        // The bit reversals, byte swap, and ones' complement are due to differences between halCommonCrc16 and the Smart Energy version.
        for (let index = 0; index < (key.length - consts_2.EMBER_INSTALL_CODE_CRC_SIZE); index++) {
            crc = (0, math_1.halCommonCrc16)(reverse(key[index]), crc);
        }
        crc = (~(0, math_1.highLowToInt)(reverse((0, math_1.lowByte)(crc)), reverse((0, math_1.highByte)(crc)))) & 0xFFFF;
        if (key[key.length - consts_2.EMBER_INSTALL_CODE_CRC_SIZE] !== (0, math_1.lowByte)(crc) || key[key.length - consts_2.EMBER_INSTALL_CODE_CRC_SIZE + 1] !== (0, math_1.highByte)(crc)) {
            throw new Error(`[ADD INSTALL CODE] Failed for "${ieeeAddress}"; invalid code CRC.`);
        }
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                // Compute the key from the install code and CRC.
                const [aesStatus, keyContents] = (await this.emberAesHashSimple(key));
                if (aesStatus !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`[ADD INSTALL CODE] Failed AES hash for "${ieeeAddress}" with status=${enums_2.EmberStatus[aesStatus]}.`, NS);
                    return aesStatus;
                }
                // Add the key to the transient key table.
                // This will be used while the DUT joins.
                const impStatus = (await this.ezsp.ezspImportTransientKey(ieeeAddress, { contents: keyContents }, enums_2.SecManFlag.NONE));
                if (impStatus == enums_2.SLStatus.OK) {
                    logger_1.logger.debug(`[ADD INSTALL CODE] Success for "${ieeeAddress}".`, NS);
                }
                else {
                    logger_1.logger.error(`[ADD INSTALL CODE] Failed for "${ieeeAddress}" with status=${enums_2.SLStatus[impStatus]}.`, NS);
                    return enums_2.EmberStatus.ERR_FATAL;
                }
                resolve();
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    /** WARNING: Adapter impl. Starts timer immediately upon returning */
    waitFor(networkAddress, endpoint, frameType, direction, transactionSequenceNumber, clusterID, commandIdentifier, timeout) {
        const sourceEndpointInfo = endpoints_1.FIXED_ENDPOINTS[0];
        const waiter = this.oneWaitress.waitFor({
            target: networkAddress,
            apsFrame: {
                clusterId: clusterID,
                profileId: sourceEndpointInfo.profileId, // XXX: only used by OTA upstream
                sequence: 0, // set by stack
                sourceEndpoint: sourceEndpointInfo.endpoint,
                destinationEndpoint: endpoint,
                groupId: 0,
                options: enums_2.EmberApsOption.NONE,
            },
            zclSequence: transactionSequenceNumber,
            commandIdentifier,
        }, timeout || DEFAULT_ZCL_REQUEST_TIMEOUT * 3); // XXX: since this is used by OTA...
        return {
            cancel: () => this.oneWaitress.remove(waiter.id),
            promise: waiter.start().promise,
        };
    }
    //---- ZDO
    // queued, non-InterPAN
    async permitJoin(seconds, networkAddress) {
        const preJoining = async () => {
            if (seconds) {
                const plaintextKey = { contents: Buffer.from(consts_2.ZIGBEE_PROFILE_INTEROPERABILITY_LINK_KEY) };
                const impKeyStatus = (await this.ezsp.ezspImportTransientKey(consts_2.BLANK_EUI64, plaintextKey, enums_2.SecManFlag.NONE));
                logger_1.logger.debug(`[ZDO] Pre joining import transient key status=${enums_2.SLStatus[impKeyStatus]}.`, NS);
                return impKeyStatus === enums_2.SLStatus.OK ? enums_2.EmberStatus.SUCCESS : enums_2.EmberStatus.ERR_FATAL;
            }
            else {
                if (this.manufacturerCode !== DEFAULT_MANUFACTURER_CODE) {
                    logger_1.logger.debug(`[WORKAROUND] Reverting coordinator manufacturer code to default.`, NS);
                    await this.ezsp.ezspSetManufacturerCode(DEFAULT_MANUFACTURER_CODE);
                    this.manufacturerCode = DEFAULT_MANUFACTURER_CODE;
                }
                await this.ezsp.ezspClearTransientLinkKeys();
                const setJPstatus = (await this.emberSetJoinPolicy(enums_2.EmberJoinDecision.ALLOW_REJOINS_ONLY));
                if (setJPstatus !== enums_2.EzspStatus.SUCCESS) {
                    logger_1.logger.error(`[ZDO] Failed set join policy for with status=${enums_2.EzspStatus[setJPstatus]}.`, NS);
                    return enums_2.EmberStatus.ERR_FATAL;
                }
                return enums_2.EmberStatus.SUCCESS;
            }
        };
        if (networkAddress) {
            // specific device that is not `Coordinator`
            return new Promise((resolve, reject) => {
                this.requestQueue.enqueue(async () => {
                    this.checkInterpanLock();
                    const pjStatus = (await preJoining());
                    if (pjStatus !== enums_2.EmberStatus.SUCCESS) {
                        logger_1.logger.error(`[ZDO] Failed pre joining request for "${networkAddress}" with status=${enums_2.EmberStatus[pjStatus]}.`, NS);
                        return pjStatus;
                    }
                    // `authentication`: TC significance always 1 (zb specs)
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const [status, apsFrame, messageTag] = (await this.emberPermitJoiningRequest(networkAddress, seconds, 1, 0));
                    if (status !== enums_2.EmberStatus.SUCCESS) {
                        logger_1.logger.error(`[ZDO] Failed permit joining request for "${networkAddress}" with status=${enums_2.EmberStatus[status]}.`, NS);
                        return status;
                    }
                    (await this.oneWaitress.startWaitingFor({
                        target: networkAddress,
                        apsFrame,
                        responseClusterId: zdo_1.PERMIT_JOINING_RESPONSE,
                    }, DEFAULT_ZDO_REQUEST_TIMEOUT));
                    resolve();
                    return enums_2.EmberStatus.SUCCESS;
                }, reject);
            });
        }
        else {
            // coordinator-only, or all
            return new Promise((resolve, reject) => {
                this.requestQueue.enqueue(async () => {
                    this.checkInterpanLock();
                    const pjStatus = (await preJoining());
                    if (pjStatus !== enums_2.EmberStatus.SUCCESS) {
                        logger_1.logger.error(`[ZDO] Failed pre joining request for "${networkAddress}" with status=${enums_2.EmberStatus[pjStatus]}.`, NS);
                        return pjStatus;
                    }
                    // local permit join if `Coordinator`-only requested, else local + broadcast
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const [status, apsFrame, messageTag] = (await this.emberPermitJoining(seconds, (networkAddress === consts_2.ZIGBEE_COORDINATOR_ADDRESS) ? false : true));
                    if (status !== enums_2.EmberStatus.SUCCESS) {
                        logger_1.logger.error(`[ZDO] Failed permit joining request with status=${enums_2.EmberStatus[status]}.`, NS);
                        return status;
                    }
                    // NOTE: because Z2M is refreshing the permit join duration early to prevent it from closing
                    //       (every 200sec, even if only opened for 254sec), we can't wait for the stack opened status,
                    //       as it won't trigger again if already opened... so instead we assume it worked
                    // NOTE2: with EZSP, 255=forever, and 254=max, but since upstream logic uses fixed 254 with interval refresh,
                    //        we can't simply bypass upstream calls if called for "forever" to prevent useless NCP calls (3-4 each time),
                    //        until called with 0 (disable), since we don't know if it was requested for forever or not...
                    // TLDR: upstream logic change required to allow this
                    // if (seconds) {
                    //     await this.oneWaitress.startWaitingForEvent(
                    //         {eventName: OneWaitressEvents.STACK_STATUS_NETWORK_OPENED},
                    //         DEFAULT_ZCL_REQUEST_TIMEOUT,
                    //         '[ZDO] Permit Joining',
                    //     );
                    // } else {
                    //     // NOTE: CLOSED stack status is not triggered if the network was not OPENED in the first place, so don't wait for it
                    //     //       same kind of problem as described above (upstream always tries to close after start, but EZSP already is)
                    // }
                    resolve();
                    return enums_2.EmberStatus.SUCCESS;
                }, reject);
            });
        }
    }
    // queued, non-InterPAN
    async lqi(networkAddress) {
        const neighbors = [];
        const request = async (startIndex) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [reqStatus, apsFrame, messageTag] = (await this.emberLqiTableRequest(networkAddress, startIndex, DEFAULT_APS_OPTIONS));
            if (reqStatus !== enums_2.EmberStatus.SUCCESS) {
                logger_1.logger.error(`[ZDO] Failed LQI request for "${networkAddress}" (index "${startIndex}") with status=${enums_2.EmberStatus[reqStatus]}.`, NS);
                return [reqStatus, null, null];
            }
            const result = (await this.oneWaitress.startWaitingFor({
                target: networkAddress,
                apsFrame,
                responseClusterId: zdo_1.LQI_TABLE_RESPONSE,
            }, DEFAULT_ZDO_REQUEST_TIMEOUT));
            for (const entry of result.entryList) {
                neighbors.push({
                    ieeeAddr: entry.eui64,
                    networkAddress: entry.nodeId,
                    linkquality: entry.lqi,
                    relationship: entry.relationship,
                    depth: entry.depth,
                });
            }
            return [enums_2.EmberStatus.SUCCESS, result.neighborTableEntries, result.entryList.length];
        };
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.checkInterpanLock();
                let [status, tableEntries, entryCount] = (await request(0));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    return status;
                }
                const size = tableEntries;
                let nextStartIndex = entryCount;
                while (neighbors.length < size) {
                    [status, tableEntries, entryCount] = (await request(nextStartIndex));
                    if (status !== enums_2.EmberStatus.SUCCESS) {
                        return status;
                    }
                    nextStartIndex += entryCount;
                }
                resolve({ neighbors });
                return status;
            }, reject);
        });
    }
    // queued, non-InterPAN
    async routingTable(networkAddress) {
        const table = [];
        const request = async (startIndex) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [reqStatus, apsFrame, messageTag] = (await this.emberRoutingTableRequest(networkAddress, startIndex, DEFAULT_APS_OPTIONS));
            if (reqStatus !== enums_2.EmberStatus.SUCCESS) {
                logger_1.logger.error(`[ZDO] Failed routing table request for "${networkAddress}" (index "${startIndex}") with status=${enums_2.EmberStatus[reqStatus]}.`, NS);
                return [reqStatus, null, null];
            }
            const result = (await this.oneWaitress.startWaitingFor({
                target: networkAddress,
                apsFrame,
                responseClusterId: zdo_1.ROUTING_TABLE_RESPONSE,
            }, DEFAULT_ZDO_REQUEST_TIMEOUT));
            for (const entry of result.entryList) {
                table.push({
                    destinationAddress: entry.destinationAddress,
                    status: RoutingTableStatus[entry.status], // get str value from enum to satisfy upstream's needs
                    nextHop: entry.nextHopAddress,
                });
            }
            return [enums_2.EmberStatus.SUCCESS, result.routingTableEntries, result.entryList.length];
        };
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.checkInterpanLock();
                let [status, tableEntries, entryCount] = (await request(0));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    return status;
                }
                const size = tableEntries;
                let nextStartIndex = entryCount;
                while (table.length < size) {
                    [status, tableEntries, entryCount] = (await request(nextStartIndex));
                    if (status !== enums_2.EmberStatus.SUCCESS) {
                        return status;
                    }
                    nextStartIndex += entryCount;
                }
                resolve({ table });
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    // queued, non-InterPAN
    async nodeDescriptor(networkAddress) {
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.checkInterpanLock();
                /* eslint-disable @typescript-eslint/no-unused-vars */
                const [status, apsFrame, messageTag] = (await this.emberNodeDescriptorRequest(networkAddress, DEFAULT_APS_OPTIONS));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`[ZDO] Failed node descriptor for "${networkAddress}" with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status;
                }
                const result = (await this.oneWaitress.startWaitingFor({
                    target: networkAddress,
                    apsFrame,
                    responseClusterId: zdo_1.NODE_DESCRIPTOR_RESPONSE,
                }, DEFAULT_ZDO_REQUEST_TIMEOUT));
                let type = 'Unknown';
                switch (result.logicalType) {
                    case 0x0:
                        type = 'Coordinator';
                        break;
                    case 0x1:
                        type = 'Router';
                        break;
                    case 0x2:
                        type = 'EndDevice';
                        break;
                }
                // always 0 before rev. 21 where field was added
                if (result.stackRevision < CURRENT_ZIGBEE_SPEC_REVISION) {
                    logger_1.logger.warning(`[ZDO] Node descriptor for "${networkAddress}" reports device is only compliant to revision `
                        + `"${(result.stackRevision < 21) ? 'pre-21' : result.stackRevision}" of the ZigBee specification `
                        + `(current revision: ${CURRENT_ZIGBEE_SPEC_REVISION}).`, NS);
                }
                resolve({ type, manufacturerCode: result.manufacturerCode });
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    // queued, non-InterPAN
    async activeEndpoints(networkAddress) {
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.checkInterpanLock();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const [status, apsFrame, messageTag] = (await this.emberActiveEndpointsRequest(networkAddress, DEFAULT_APS_OPTIONS));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`[ZDO] Failed active endpoints request for "${networkAddress}" with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status;
                }
                const result = (await this.oneWaitress.startWaitingFor({
                    target: networkAddress,
                    apsFrame,
                    responseClusterId: zdo_1.ACTIVE_ENDPOINTS_RESPONSE,
                }, DEFAULT_ZDO_REQUEST_TIMEOUT));
                resolve({ endpoints: result.endpointList });
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    // queued, non-InterPAN
    async simpleDescriptor(networkAddress, endpointID) {
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.checkInterpanLock();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const [status, apsFrame, messageTag] = (await this.emberSimpleDescriptorRequest(networkAddress, endpointID, DEFAULT_APS_OPTIONS));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`[ZDO] Failed simple descriptor request for "${networkAddress}" endpoint "${endpointID}" `
                        + `with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status;
                }
                const result = (await this.oneWaitress.startWaitingFor({
                    target: networkAddress,
                    apsFrame,
                    responseClusterId: zdo_1.SIMPLE_DESCRIPTOR_RESPONSE,
                }, DEFAULT_ZDO_REQUEST_TIMEOUT));
                resolve({
                    profileID: result.profileId,
                    endpointID: result.endpoint,
                    deviceID: result.deviceId,
                    inputClusters: result.inClusterList,
                    outputClusters: result.outClusterList,
                });
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    // queued, non-InterPAN
    async bind(destinationNetworkAddress, sourceIeeeAddress, sourceEndpoint, clusterID, destinationAddressOrGroup, type, destinationEndpoint) {
        if (typeof destinationAddressOrGroup === 'string' && type === 'endpoint') {
            // dest address is EUI64 (str), so type should always be endpoint (unicast)
            return new Promise((resolve, reject) => {
                this.requestQueue.enqueue(async () => {
                    this.checkInterpanLock();
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const [status, apsFrame, messageTag] = (await this.emberBindRequest(destinationNetworkAddress, sourceIeeeAddress, sourceEndpoint, clusterID, zdo_1.UNICAST_BINDING, destinationAddressOrGroup, null, // doesn't matter
                    destinationEndpoint, DEFAULT_APS_OPTIONS));
                    if (status !== enums_2.EmberStatus.SUCCESS) {
                        logger_1.logger.error(`[ZDO] Failed bind request for "${destinationNetworkAddress}" destination "${destinationAddressOrGroup}" `
                            + `endpoint "${destinationEndpoint}" with status=${enums_2.EmberStatus[status]}.`, NS);
                        return status;
                    }
                    await this.oneWaitress.startWaitingFor({
                        target: destinationNetworkAddress,
                        apsFrame,
                        responseClusterId: zdo_1.BIND_RESPONSE,
                    }, DEFAULT_ZDO_REQUEST_TIMEOUT);
                    resolve();
                    return enums_2.EmberStatus.SUCCESS;
                }, reject);
            });
        }
        else if (typeof destinationAddressOrGroup === 'number' && type === 'group') {
            // dest is group num, so type should always be group (multicast)
            return new Promise((resolve, reject) => {
                this.requestQueue.enqueue(async () => {
                    this.checkInterpanLock();
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const [status, apsFrame, messageTag] = (await this.emberBindRequest(destinationNetworkAddress, sourceIeeeAddress, sourceEndpoint, clusterID, zdo_1.MULTICAST_BINDING, null, // doesn't matter
                    destinationAddressOrGroup, destinationEndpoint, // doesn't matter
                    DEFAULT_APS_OPTIONS));
                    if (status !== enums_2.EmberStatus.SUCCESS) {
                        logger_1.logger.error(`[ZDO] Failed bind request for "${destinationNetworkAddress}" group "${destinationAddressOrGroup}" `
                            + `with status=${enums_2.EmberStatus[status]}.`, NS);
                        return status;
                    }
                    await this.oneWaitress.startWaitingFor({
                        target: destinationNetworkAddress,
                        apsFrame,
                        responseClusterId: zdo_1.BIND_RESPONSE,
                    }, DEFAULT_ZDO_REQUEST_TIMEOUT);
                    resolve();
                    return enums_2.EmberStatus.SUCCESS;
                }, reject);
            });
        }
    }
    // queued, non-InterPAN
    async unbind(destinationNetworkAddress, sourceIeeeAddress, sourceEndpoint, clusterID, destinationAddressOrGroup, type, destinationEndpoint) {
        if (typeof destinationAddressOrGroup === 'string' && type === 'endpoint') {
            // dest address is EUI64 (str), so type should always be endpoint (unicast)
            return new Promise((resolve, reject) => {
                this.requestQueue.enqueue(async () => {
                    this.checkInterpanLock();
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const [status, apsFrame, messageTag] = (await this.emberUnbindRequest(destinationNetworkAddress, sourceIeeeAddress, sourceEndpoint, clusterID, zdo_1.UNICAST_BINDING, destinationAddressOrGroup, null, // doesn't matter
                    destinationEndpoint, DEFAULT_APS_OPTIONS));
                    if (status !== enums_2.EmberStatus.SUCCESS) {
                        logger_1.logger.error(`[ZDO] Failed unbind request for "${destinationNetworkAddress}" destination "${destinationAddressOrGroup}" `
                            + `endpoint "${destinationEndpoint}" with status=${enums_2.EmberStatus[status]}.`, NS);
                        return status;
                    }
                    await this.oneWaitress.startWaitingFor({
                        target: destinationNetworkAddress,
                        apsFrame,
                        responseClusterId: zdo_1.UNBIND_RESPONSE,
                    }, DEFAULT_ZDO_REQUEST_TIMEOUT);
                    resolve();
                    return enums_2.EmberStatus.SUCCESS;
                }, reject);
            });
        }
        else if (typeof destinationAddressOrGroup === 'number' && type === 'group') {
            // dest is group num, so type should always be group (multicast)
            return new Promise((resolve, reject) => {
                this.requestQueue.enqueue(async () => {
                    this.checkInterpanLock();
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const [status, apsFrame, messageTag] = (await this.emberUnbindRequest(destinationNetworkAddress, sourceIeeeAddress, sourceEndpoint, clusterID, zdo_1.MULTICAST_BINDING, null, // doesn't matter
                    destinationAddressOrGroup, destinationEndpoint, // doesn't matter
                    DEFAULT_APS_OPTIONS));
                    if (status !== enums_2.EmberStatus.SUCCESS) {
                        logger_1.logger.error(`[ZDO] Failed unbind request for "${destinationNetworkAddress}" group "${destinationAddressOrGroup}" `
                            + `with status=${enums_2.EmberStatus[status]}.`, NS);
                        return status;
                    }
                    await this.oneWaitress.startWaitingFor({
                        target: destinationNetworkAddress,
                        apsFrame,
                        responseClusterId: zdo_1.UNBIND_RESPONSE,
                    }, DEFAULT_ZDO_REQUEST_TIMEOUT);
                    resolve();
                    return enums_2.EmberStatus.SUCCESS;
                }, reject);
            });
        }
    }
    // queued, non-InterPAN
    async removeDevice(networkAddress, ieeeAddr) {
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.checkInterpanLock();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const [status, apsFrame, messageTag] = (await this.emberLeaveRequest(networkAddress, ieeeAddr, enums_2.EmberLeaveRequestFlags.WITHOUT_REJOIN, DEFAULT_APS_OPTIONS));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`[ZDO] Failed remove device request for "${networkAddress}" target "${ieeeAddr}" `
                        + `with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status;
                }
                await this.oneWaitress.startWaitingFor({
                    target: networkAddress,
                    apsFrame,
                    responseClusterId: zdo_1.LEAVE_RESPONSE,
                }, DEFAULT_ZDO_REQUEST_TIMEOUT);
                resolve();
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    //---- ZCL
    // queued, non-InterPAN
    async sendZclFrameToEndpoint(ieeeAddr, networkAddress, endpoint, zclFrame, timeout, disableResponse, disableRecovery, sourceEndpoint) {
        const sourceEndpointInfo = typeof sourceEndpoint === 'number' ?
            endpoints_1.FIXED_ENDPOINTS.find((epi) => (epi.endpoint === sourceEndpoint)) : endpoints_1.FIXED_ENDPOINTS[0];
        const command = zclFrame.command;
        let commandResponseId = null;
        if (command.hasOwnProperty('response') && disableResponse === false) {
            commandResponseId = command.response;
        }
        else if (!zclFrame.header.frameControl.disableDefaultResponse) {
            commandResponseId = zcl_1.Foundation.defaultRsp.ID;
        }
        const apsFrame = {
            profileId: sourceEndpointInfo.profileId,
            clusterId: zclFrame.cluster.ID,
            sourceEndpoint: sourceEndpointInfo.endpoint,
            destinationEndpoint: (typeof endpoint === 'number') ? endpoint : endpoints_1.FIXED_ENDPOINTS[0].endpoint,
            options: DEFAULT_APS_OPTIONS,
            groupId: 0,
            sequence: 0, // set by stack
        };
        // don't RETRY if no response expected
        if (commandResponseId == null) {
            apsFrame.options &= ~enums_2.EmberApsOption.RETRY;
        }
        const data = zclFrame.toBuffer();
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.checkInterpanLock();
                if (CHECK_APS_PAYLOAD_LENGTH) {
                    const maxPayloadLength = (await this.maximumApsPayloadLength(enums_2.EmberOutgoingMessageType.DIRECT, networkAddress, apsFrame));
                    if (data.length > maxPayloadLength) {
                        return enums_2.EmberStatus.MESSAGE_TOO_LONG; // queue will reject
                    }
                }
                logger_1.logger.debug(`~~~> [ZCL to=${networkAddress} apsFrame=${JSON.stringify(apsFrame)} header=${JSON.stringify(zclFrame.header)}]`, NS);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const [status, messageTag] = (await this.ezsp.send(enums_2.EmberOutgoingMessageType.DIRECT, networkAddress, apsFrame, data, 0, // alias
                0));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`~x~> [ZCL to=${networkAddress}] Failed to send request with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status; // let queue handle retry based on status
                }
                if (commandResponseId != null) {
                    // NOTE: aps sequence number will have been set by send function
                    const result = (await this.oneWaitress.startWaitingFor({
                        target: networkAddress,
                        apsFrame,
                        zclSequence: zclFrame.header.transactionSequenceNumber,
                        commandIdentifier: commandResponseId,
                    }, timeout || DEFAULT_ZCL_REQUEST_TIMEOUT));
                    resolve(result);
                }
                else {
                    resolve(null); // don't expect a response
                    return enums_2.EmberStatus.SUCCESS;
                }
            }, reject);
        });
    }
    // queued, non-InterPAN
    async sendZclFrameToGroup(groupID, zclFrame, sourceEndpoint) {
        const sourceEndpointInfo = typeof sourceEndpoint === 'number' ?
            endpoints_1.FIXED_ENDPOINTS.find((epi) => (epi.endpoint === sourceEndpoint)) : endpoints_1.FIXED_ENDPOINTS[0];
        const apsFrame = {
            profileId: sourceEndpointInfo.profileId,
            clusterId: zclFrame.cluster.ID,
            sourceEndpoint: sourceEndpointInfo.endpoint,
            destinationEndpoint: endpoints_1.FIXED_ENDPOINTS[0].endpoint,
            options: DEFAULT_APS_OPTIONS,
            groupId: groupID,
            sequence: 0, // set by stack
        };
        const data = zclFrame.toBuffer();
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.checkInterpanLock();
                if (CHECK_APS_PAYLOAD_LENGTH) {
                    const maxPayloadLength = (await this.maximumApsPayloadLength(enums_2.EmberOutgoingMessageType.MULTICAST, groupID, apsFrame));
                    if (data.length > maxPayloadLength) {
                        return enums_2.EmberStatus.MESSAGE_TOO_LONG; // queue will reject
                    }
                }
                logger_1.logger.debug(`~~~> [ZCL GROUP apsFrame=${JSON.stringify(apsFrame)} header=${JSON.stringify(zclFrame.header)}]`, NS);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const [status, messageTag] = (await this.ezsp.send(enums_2.EmberOutgoingMessageType.MULTICAST, apsFrame.groupId, // not used for MC
                apsFrame, data, 0, // alias
                0));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`~x~> [ZCL GROUP] Failed to send with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status; // let queue handle retry based on status
                }
                // NOTE: since ezspMessageSentHandler could take a while here, we don't block, it'll just be logged if the delivery failed
                resolve();
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    // queued, non-InterPAN
    async sendZclFrameToAll(endpoint, zclFrame, sourceEndpoint) {
        const sourceEndpointInfo = typeof sourceEndpoint === 'number' ?
            endpoints_1.FIXED_ENDPOINTS.find((epi) => (epi.endpoint === sourceEndpoint)) : endpoints_1.FIXED_ENDPOINTS[0];
        const apsFrame = {
            profileId: sourceEndpointInfo.profileId,
            clusterId: zclFrame.cluster.ID,
            sourceEndpoint: sourceEndpointInfo.endpoint,
            destinationEndpoint: (typeof endpoint === 'number') ? endpoint : endpoints_1.FIXED_ENDPOINTS[0].endpoint,
            options: DEFAULT_APS_OPTIONS,
            groupId: consts_2.EMBER_RX_ON_WHEN_IDLE_BROADCAST_ADDRESS,
            sequence: 0, // set by stack
        };
        const data = zclFrame.toBuffer();
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.checkInterpanLock();
                if (CHECK_APS_PAYLOAD_LENGTH) {
                    const maxPayloadLength = (await this.maximumApsPayloadLength(enums_2.EmberOutgoingMessageType.BROADCAST, consts_2.EMBER_RX_ON_WHEN_IDLE_BROADCAST_ADDRESS, apsFrame));
                    if (data.length > maxPayloadLength) {
                        return enums_2.EmberStatus.MESSAGE_TOO_LONG; // queue will reject
                    }
                }
                logger_1.logger.debug(`~~~> [ZCL BROADCAST apsFrame=${JSON.stringify(apsFrame)} header=${JSON.stringify(zclFrame.header)}]`, NS);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const [status, messageTag] = (await this.ezsp.send(enums_2.EmberOutgoingMessageType.BROADCAST, consts_2.EMBER_RX_ON_WHEN_IDLE_BROADCAST_ADDRESS, apsFrame, data, 0, // alias
                0));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`~x~> [ZCL BROADCAST] Failed to send with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status; // let queue handle retry based on status
                }
                // NOTE: since ezspMessageSentHandler could take a while here, we don't block, it'll just be logged if the delivery failed
                resolve();
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    //---- InterPAN for Touchlink
    // XXX: There might be a better way to handle touchlink with ZLL ezsp functions, but I don't have any device to test so, didn't look into it...
    // TODO: check all this touchlink/interpan stuff
    // queued
    async setChannelInterPAN(channel) {
        if (typeof channel !== 'number') {
            logger_1.logger.error(`Tried to set channel InterPAN to non-number. Channel ${channel} of type ${typeof channel}.`, NS);
            return;
        }
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                this.interpanLock = true;
                const status = (await this.ezsp.ezspSetLogicalAndRadioChannel(channel));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    this.interpanLock = false; // XXX: ok?
                    logger_1.logger.error(`Failed to set InterPAN channel to ${channel} with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status;
                }
                resolve();
                return status;
            }, reject);
        });
    }
    // queued
    async sendZclFrameInterPANToIeeeAddr(zclFrame, ieeeAddress) {
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                const msgBuffalo = new buffalo_1.EzspBuffalo(Buffer.alloc(consts_2.MAXIMUM_INTERPAN_LENGTH));
                // cache-enabled getters
                const sourcePanId = (await this.emberGetPanId());
                const sourceEui64 = (await this.emberGetEui64());
                msgBuffalo.writeUInt16((consts_2.LONG_DEST_FRAME_CONTROL | consts_2.MAC_ACK_REQUIRED)); // macFrameControl
                msgBuffalo.writeUInt8(0); // sequence Skip Sequence number, stack sets the sequence number.
                msgBuffalo.writeUInt16(consts_2.INVALID_PAN_ID); // destPanId
                msgBuffalo.writeIeeeAddr(ieeeAddress); // destAddress (longAddress)
                msgBuffalo.writeUInt16(sourcePanId); // sourcePanId
                msgBuffalo.writeIeeeAddr(sourceEui64); // sourceAddress
                msgBuffalo.writeUInt16(consts_2.STUB_NWK_FRAME_CONTROL); // nwkFrameControl
                msgBuffalo.writeUInt8((enums_2.EmberInterpanMessageType.UNICAST | consts_2.INTERPAN_APS_FRAME_TYPE)); // apsFrameControl
                msgBuffalo.writeUInt16(zclFrame.cluster.ID);
                msgBuffalo.writeUInt16(consts_2.TOUCHLINK_PROFILE_ID);
                logger_1.logger.debug(`~~~> [ZCL TOUCHLINK to=${ieeeAddress} header=${JSON.stringify(zclFrame.header)}]`, NS);
                const status = (await this.ezsp.ezspSendRawMessage(Buffer.concat([msgBuffalo.getWritten(), zclFrame.toBuffer()])));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`~x~> [ZCL TOUCHLINK to=${ieeeAddress}] Failed to send with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status;
                }
                // NOTE: can use ezspRawTransmitCompleteHandler if needed here
                resolve();
                return status;
            }, reject);
        });
    }
    // queued
    async sendZclFrameInterPANBroadcast(zclFrame, timeout) {
        const command = zclFrame.command;
        if (!command.hasOwnProperty('response')) {
            throw new Error(`Command '${command.name}' has no response, cannot wait for response.`);
        }
        // just for waitress
        const apsFrame = {
            profileId: consts_2.TOUCHLINK_PROFILE_ID,
            clusterId: zclFrame.cluster.ID,
            sourceEndpoint: 0,
            destinationEndpoint: 0,
            options: enums_2.EmberApsOption.NONE,
            groupId: consts_2.EMBER_SLEEPY_BROADCAST_ADDRESS,
            sequence: 0, // set by stack
        };
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                const msgBuffalo = new buffalo_1.EzspBuffalo(Buffer.alloc(consts_2.MAXIMUM_INTERPAN_LENGTH));
                // cache-enabled getters
                const sourcePanId = (await this.emberGetPanId());
                const sourceEui64 = (await this.emberGetEui64());
                msgBuffalo.writeUInt16(consts_2.SHORT_DEST_FRAME_CONTROL); // macFrameControl
                msgBuffalo.writeUInt8(0); // sequence Skip Sequence number, stack sets the sequence number.
                msgBuffalo.writeUInt16(consts_2.INVALID_PAN_ID); // destPanId
                msgBuffalo.writeUInt16(apsFrame.groupId); // destAddress (longAddress)
                msgBuffalo.writeUInt16(sourcePanId); // sourcePanId
                msgBuffalo.writeIeeeAddr(sourceEui64); // sourceAddress
                msgBuffalo.writeUInt16(consts_2.STUB_NWK_FRAME_CONTROL); // nwkFrameControl
                msgBuffalo.writeUInt8((enums_2.EmberInterpanMessageType.BROADCAST | consts_2.INTERPAN_APS_FRAME_TYPE)); // apsFrameControl
                msgBuffalo.writeUInt16(apsFrame.clusterId);
                msgBuffalo.writeUInt16(apsFrame.profileId);
                const data = Buffer.concat([msgBuffalo.getWritten(), zclFrame.toBuffer()]);
                logger_1.logger.debug(`~~~> [ZCL TOUCHLINK BROADCAST header=${JSON.stringify(zclFrame.header)}]`, NS);
                const status = (await this.ezsp.ezspSendRawMessage(data));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`~x~> [ZCL TOUCHLINK BROADCAST] Failed to send with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status;
                }
                // NOTE: can use ezspRawTransmitCompleteHandler if needed here
                const result = (await this.oneWaitress.startWaitingFor({
                    target: null,
                    apsFrame: apsFrame,
                    zclSequence: zclFrame.header.transactionSequenceNumber,
                    commandIdentifier: command.response,
                }, timeout || DEFAULT_ZCL_REQUEST_TIMEOUT * 2)); // XXX: touchlink timeout?
                resolve(result);
                return enums_2.EmberStatus.SUCCESS;
            }, reject);
        });
    }
    // queued
    async restoreChannelInterPAN() {
        return new Promise((resolve, reject) => {
            this.requestQueue.enqueue(async () => {
                const status = (await this.ezsp.ezspSetLogicalAndRadioChannel(this.networkOptions.channelList[0]));
                if (status !== enums_2.EmberStatus.SUCCESS) {
                    logger_1.logger.error(`Failed to restore InterPAN channel to ${this.networkOptions.channelList[0]} with status=${enums_2.EmberStatus[status]}.`, NS);
                    return status;
                }
                // let adapter settle down
                await (0, utils_1.Wait)(3000);
                this.interpanLock = false;
                resolve();
                return status;
            }, reject);
        });
    }
    //-- END Adapter implementation
    checkInterpanLock() {
        if (this.interpanLock) {
            logger_1.logger.error(`[INTERPAN MODE] Cannot execute non-InterPAN commands.`, NS);
            // will be caught by request queue and rejected internally.
            throw new Error(enums_2.EzspStatus[enums_2.EzspStatus.ERROR_INVALID_CALL]);
        }
    }
}
exports.EmberAdapter = EmberAdapter;
//# sourceMappingURL=emberAdapter.js.map