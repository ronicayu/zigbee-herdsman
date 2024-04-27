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
const events_1 = __importDefault(require("events"));
const database_1 = __importDefault(require("./database"));
const adapter_1 = require("../adapter");
const model_1 = require("./model");
const helpers_1 = require("./helpers");
const Events = __importStar(require("./events"));
const tstype_1 = require("./tstype");
const fs_1 = __importDefault(require("fs"));
const zcl_1 = require("../zcl");
const touchlink_1 = __importDefault(require("./touchlink"));
const greenPower_1 = __importDefault(require("./greenPower"));
const utils_1 = require("../utils");
const assert_1 = __importDefault(require("assert"));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const mixin_deep_1 = __importDefault(require("mixin-deep"));
const group_1 = __importDefault(require("./model/group"));
const logger_1 = require("../utils/logger");
const NS = 'zh:controller';
async function catcho(func, errorMessage) {
    try {
        await func();
    }
    catch (error) {
        logger_1.logger.error(`${errorMessage}: ${error}`, NS);
    }
}
const DefaultOptions = {
    network: {
        networkKeyDistribute: false,
        networkKey: [0x01, 0x03, 0x05, 0x07, 0x09, 0x0B, 0x0D, 0x0F, 0x00, 0x02, 0x04, 0x06, 0x08, 0x0A, 0x0C, 0x0D],
        panID: 0x1a62,
        extendedPanID: [0xDD, 0xDD, 0xDD, 0xDD, 0xDD, 0xDD, 0xDD, 0xDD],
        channelList: [11],
    },
    serialPort: {},
    databasePath: null,
    databaseBackupPath: null,
    backupPath: null,
    adapter: { disableLED: false },
    acceptJoiningDeviceHandler: null,
};
/**
 * @noInheritDoc
 */
class Controller extends events_1.default.EventEmitter {
    options;
    database;
    adapter;
    greenPower;
    // eslint-disable-next-line
    permitJoinNetworkClosedTimer;
    // eslint-disable-next-line
    permitJoinTimeoutTimer;
    permitJoinTimeout;
    // eslint-disable-next-line
    backupTimer;
    // eslint-disable-next-line
    databaseSaveTimer;
    touchlink;
    stopping;
    networkParametersCached;
    /**
     * Create a controller
     *
     * To auto detect the port provide `null` for `options.serialPort.path`
     */
    constructor(options) {
        super();
        this.stopping = false;
        this.options = (0, mixin_deep_1.default)(JSON.parse(JSON.stringify(DefaultOptions)), options);
        // Validate options
        for (const channel of this.options.network.channelList) {
            if (channel < 11 || channel > 26) {
                throw new Error(`'${channel}' is an invalid channel, use a channel between 11 - 26.`);
            }
        }
        if (!Array.isArray(this.options.network.networkKey) || this.options.network.networkKey.length !== 16) {
            throw new Error(`Network key must be 16 digits long, got ${this.options.network.networkKey.length}.`);
        }
        if (!Array.isArray(this.options.network.extendedPanID) || this.options.network.extendedPanID.length !== 8) {
            throw new Error(`ExtendedPanID must be 8 digits long, got ${this.options.network.extendedPanID.length}.`);
        }
        if (this.options.network.panID >= 0xFFFF || this.options.network.panID <= 0) {
            throw new Error(`PanID must have a value of 0x0001 (1) - 0xFFFE (65534), got ${this.options.network.panID}.`);
        }
    }
    /**
     * Start the Herdsman controller
     */
    async start() {
        // Database (create end inject)
        this.database = database_1.default.open(this.options.databasePath);
        model_1.Entity.injectDatabase(this.database);
        // Adapter (create and inject)
        this.adapter = await adapter_1.Adapter.create(this.options.network, this.options.serialPort, this.options.backupPath, this.options.adapter);
        logger_1.logger.debug(`Starting with options '${JSON.stringify(this.options)}'`, NS);
        const startResult = await this.adapter.start();
        logger_1.logger.debug(`Started with result '${startResult}'`, NS);
        // Check if we have to change the channel, only do this when adapter `resumed` because:
        // - `getNetworkParameters` might be return wrong info because it needs to propogate after backup restore
        // - If result is not `resumed` (`reset` or `restored`), the adapter should comission with the channel from `this.options.network`
        if ((startResult === 'resumed') && (await this.adapter.supportsChangeChannel())) {
            const netParams = (await this.getNetworkParameters());
            if (this.options.network.channelList[0] !== netParams.channel) {
                await this.changeChannel();
            }
        }
        model_1.Entity.injectAdapter(this.adapter);
        // log injection
        logger_1.logger.debug(`Injected database: ${this.database != null}, adapter: ${this.adapter != null}`, NS);
        this.greenPower = new greenPower_1.default(this.adapter);
        this.greenPower.on(tstype_1.GreenPowerEvents.deviceJoined, this.onDeviceJoinedGreenPower.bind(this));
        // Register adapter events
        this.adapter.on(adapter_1.Events.Events.deviceJoined, this.onDeviceJoined.bind(this));
        this.adapter.on(adapter_1.Events.Events.zclPayload, this.onZclPayload.bind(this));
        this.adapter.on(adapter_1.Events.Events.disconnected, this.onAdapterDisconnected.bind(this));
        this.adapter.on(adapter_1.Events.Events.deviceAnnounce, this.onDeviceAnnounce.bind(this));
        this.adapter.on(adapter_1.Events.Events.deviceLeave, this.onDeviceLeave.bind(this));
        this.adapter.on(adapter_1.Events.Events.networkAddress, this.onNetworkAddress.bind(this));
        if (startResult === 'reset') {
            if (this.options.databaseBackupPath && fs_1.default.existsSync(this.options.databasePath)) {
                fs_1.default.copyFileSync(this.options.databasePath, this.options.databaseBackupPath);
            }
            logger_1.logger.debug('Clearing database...', NS);
            for (const group of group_1.default.all()) {
                group.removeFromDatabase();
            }
            for (const device of model_1.Device.all()) {
                device.removeFromDatabase();
            }
        }
        if (startResult === 'reset' || (this.options.backupPath && !fs_1.default.existsSync(this.options.backupPath))) {
            await this.backup();
        }
        // Add coordinator to the database if it is not there yet.
        const coordinator = await this.adapter.getCoordinator();
        if (model_1.Device.byType('Coordinator').length === 0) {
            logger_1.logger.debug('No coordinator in database, querying...', NS);
            model_1.Device.create('Coordinator', coordinator.ieeeAddr, coordinator.networkAddress, coordinator.manufacturerID, undefined, undefined, undefined, true, coordinator.endpoints);
        }
        // Update coordinator ieeeAddr if changed, can happen due to e.g. reflashing
        const databaseCoordinator = model_1.Device.byType('Coordinator')[0];
        if (databaseCoordinator.ieeeAddr !== coordinator.ieeeAddr) {
            logger_1.logger.info(`Coordinator address changed, updating to '${coordinator.ieeeAddr}'`, NS);
            databaseCoordinator.changeIeeeAddress(coordinator.ieeeAddr);
        }
        // Set backup timer to 1 day.
        this.backupTimer = setInterval(() => this.backup(), 86400000);
        // Set database save timer to 1 hour.
        this.databaseSaveTimer = setInterval(() => this.databaseSave(), 3600000);
        this.touchlink = new touchlink_1.default(this.adapter);
        return startResult;
    }
    async touchlinkIdentify(ieeeAddr, channel) {
        await this.touchlink.identify(ieeeAddr, channel);
    }
    async touchlinkScan() {
        return this.touchlink.scan();
    }
    async touchlinkFactoryReset(ieeeAddr, channel) {
        return this.touchlink.factoryReset(ieeeAddr, channel);
    }
    async touchlinkFactoryResetFirst() {
        return this.touchlink.factoryResetFirst();
    }
    async addInstallCode(installCode) {
        const aqaraMatch = installCode.match(/^G\$M:.+\$A:(.+)\$I:(.+)$/);
        let ieeeAddr, key;
        if (aqaraMatch) {
            ieeeAddr = aqaraMatch[1];
            key = aqaraMatch[2];
        }
        else {
            (0, assert_1.default)(installCode.length === 95 || installCode.length === 91, `Unsupported install code, got ${installCode.length} chars, expected 95 or 91`);
            const keyStart = installCode.length - (installCode.length === 95 ? 36 : 32);
            ieeeAddr = installCode.substring(keyStart - 19, keyStart - 3);
            key = installCode.substring(keyStart, installCode.length);
        }
        ieeeAddr = `0x${ieeeAddr}`;
        key = Buffer.from(key.match(/.{1,2}/g).map(d => parseInt(d, 16)));
        await this.adapter.addInstallCode(ieeeAddr, key);
    }
    async permitJoin(permit, device, time) {
        await this.permitJoinInternal(permit, 'manual', device, time);
    }
    async permitJoinInternal(permit, reason, device, time) {
        clearInterval(this.permitJoinNetworkClosedTimer);
        clearInterval(this.permitJoinTimeoutTimer);
        this.permitJoinNetworkClosedTimer = null;
        this.permitJoinTimeoutTimer = null;
        this.permitJoinTimeout = undefined;
        if (permit) {
            await this.adapter.permitJoin(254, !device ? null : device.networkAddress);
            await this.greenPower.permitJoin(254, !device ? null : device.networkAddress);
            // Zigbee 3 networks automatically close after max 255 seconds, keep network open.
            this.permitJoinNetworkClosedTimer = setInterval(async () => {
                await catcho(async () => {
                    await this.adapter.permitJoin(254, !device ? null : device.networkAddress);
                    await this.greenPower.permitJoin(254, !device ? null : device.networkAddress);
                }, "Failed to keep permit join alive");
            }, 200 * 1000);
            if (typeof time === 'number') {
                this.permitJoinTimeout = time;
                this.permitJoinTimeoutTimer = setInterval(async () => {
                    this.permitJoinTimeout--;
                    if (this.permitJoinTimeout <= 0) {
                        await this.permitJoinInternal(false, 'timer_expired');
                    }
                    else {
                        const data = { permitted: true, timeout: this.permitJoinTimeout, reason };
                        this.emit(Events.Events.permitJoinChanged, data);
                    }
                }, 1000);
            }
            const data = { permitted: true, reason, timeout: this.permitJoinTimeout };
            this.emit(Events.Events.permitJoinChanged, data);
        }
        else {
            logger_1.logger.debug('Disable joining', NS);
            await this.greenPower.permitJoin(0, null);
            await this.adapter.permitJoin(0, null);
            const data = { permitted: false, reason, timeout: this.permitJoinTimeout };
            this.emit(Events.Events.permitJoinChanged, data);
        }
    }
    getPermitJoin() {
        return this.permitJoinNetworkClosedTimer != null;
    }
    getPermitJoinTimeout() {
        return this.permitJoinTimeout;
    }
    isStopping() {
        return this.stopping;
    }
    async stop() {
        this.stopping = true;
        this.databaseSave();
        // Unregister adapter events
        this.adapter.removeAllListeners(adapter_1.Events.Events.deviceJoined);
        this.adapter.removeAllListeners(adapter_1.Events.Events.zclPayload);
        this.adapter.removeAllListeners(adapter_1.Events.Events.disconnected);
        this.adapter.removeAllListeners(adapter_1.Events.Events.deviceAnnounce);
        this.adapter.removeAllListeners(adapter_1.Events.Events.deviceLeave);
        await catcho(() => this.permitJoinInternal(false, 'manual'), "Failed to disable join on stop");
        clearInterval(this.backupTimer);
        clearInterval(this.databaseSaveTimer);
        await this.backup();
        await this.adapter.stop();
    }
    databaseSave() {
        for (const device of model_1.Device.all()) {
            device.save(false);
        }
        for (const group of group_1.default.all()) {
            group.save(false);
        }
        this.database.write();
    }
    async backup() {
        this.databaseSave();
        if (this.options.backupPath && await this.adapter.supportsBackup()) {
            logger_1.logger.debug('Creating coordinator backup', NS);
            const backup = await this.adapter.backup(model_1.Device.all().map((d) => d.ieeeAddr));
            const unifiedBackup = await utils_1.BackupUtils.toUnifiedBackup(backup);
            const tmpBackupPath = this.options.backupPath + '.tmp';
            fs_1.default.writeFileSync(tmpBackupPath, JSON.stringify(unifiedBackup, null, 2));
            fs_1.default.renameSync(tmpBackupPath, this.options.backupPath);
            logger_1.logger.info(`Wrote coordinator backup to '${this.options.backupPath}'`, NS);
        }
    }
    async coordinatorCheck() {
        if (await this.adapter.supportsBackup()) {
            const backup = await this.adapter.backup(model_1.Device.all().map((d) => d.ieeeAddr));
            const devicesInBackup = backup.devices.map((d) => `0x${d.ieeeAddress.toString('hex')}`);
            const missingRouters = this.getDevices()
                .filter((d) => d.type === 'Router' && !devicesInBackup.includes(d.ieeeAddr));
            return { missingRouters };
        }
        else {
            throw new Error("Coordinator does not coordinator check because it doesn't support backups");
        }
    }
    async reset(type) {
        await this.adapter.reset(type);
    }
    async getCoordinatorVersion() {
        return this.adapter.getCoordinatorVersion();
    }
    async getNetworkParameters() {
        // Cache network parameters as they don't change anymore after start.
        if (!this.networkParametersCached) {
            this.networkParametersCached = await this.adapter.getNetworkParameters();
        }
        return this.networkParametersCached;
    }
    /**
     * Get all devices
     */
    getDevices() {
        return model_1.Device.all();
    }
    /**
     * Get all devices with a specific type
     */
    getDevicesByType(type) {
        return model_1.Device.byType(type);
    }
    /**
     * Get device by ieeeAddr
     */
    getDeviceByIeeeAddr(ieeeAddr) {
        return model_1.Device.byIeeeAddr(ieeeAddr);
    }
    /**
     * Get device by networkAddress
     */
    getDeviceByNetworkAddress(networkAddress) {
        return model_1.Device.byNetworkAddress(networkAddress);
    }
    /**
     * Get group by ID
     */
    getGroupByID(groupID) {
        return group_1.default.byGroupID(groupID);
    }
    /**
     * Get all groups
     */
    getGroups() {
        return group_1.default.all();
    }
    /**
     * Create a Group
     */
    createGroup(groupID) {
        return group_1.default.create(groupID);
    }
    /**
     * Broadcast a network-wide channel change.
     */
    async changeChannel() {
        logger_1.logger.info(`Broadcasting change channel to '${this.options.network.channelList[0]}'.`, NS);
        await this.adapter.changeChannel(this.options.network.channelList[0]);
        this.networkParametersCached = null; // invalidate cache
    }
    /**
     *  Set transmit power of the adapter
     */
    async setTransmitPower(value) {
        return this.adapter.setTransmitPower(value);
    }
    onNetworkAddress(payload) {
        logger_1.logger.debug(`Network address '${payload.ieeeAddr}'`, NS);
        const device = model_1.Device.byIeeeAddr(payload.ieeeAddr);
        if (!device) {
            logger_1.logger.debug(`Network address is from unknown device '${payload.ieeeAddr}'`, NS);
            return;
        }
        device.updateLastSeen();
        this.selfAndDeviceEmit(device, Events.Events.lastSeenChanged, { device, reason: 'networkAddress' });
        if (device.networkAddress !== payload.networkAddress) {
            logger_1.logger.debug(`Device '${payload.ieeeAddr}' got new networkAddress '${payload.networkAddress}'`, NS);
            device.networkAddress = payload.networkAddress;
            device.save();
            const data = { device };
            this.selfAndDeviceEmit(device, Events.Events.deviceNetworkAddressChanged, data);
        }
    }
    onDeviceAnnounce(payload) {
        logger_1.logger.debug(`Device announce '${payload.ieeeAddr}'`, NS);
        const device = model_1.Device.byIeeeAddr(payload.ieeeAddr);
        if (!device) {
            logger_1.logger.debug(`Device announce is from unknown device '${payload.ieeeAddr}'`, NS);
            return;
        }
        device.updateLastSeen();
        this.selfAndDeviceEmit(device, Events.Events.lastSeenChanged, { device, reason: 'deviceAnnounce' });
        device.implicitCheckin();
        if (device.networkAddress !== payload.networkAddress) {
            logger_1.logger.debug(`Device '${payload.ieeeAddr}' announced with new networkAddress '${payload.networkAddress}'`, NS);
            device.networkAddress = payload.networkAddress;
            device.save();
        }
        const data = { device };
        this.selfAndDeviceEmit(device, Events.Events.deviceAnnounce, data);
    }
    onDeviceLeave(payload) {
        logger_1.logger.debug(`Device leave '${payload.ieeeAddr}'`, NS);
        const device = payload.ieeeAddr ? model_1.Device.byIeeeAddr(payload.ieeeAddr) : model_1.Device.byNetworkAddress(payload.networkAddress);
        if (!device) {
            logger_1.logger.debug(`Device leave is from unknown or already deleted device '${payload.ieeeAddr ?? payload.networkAddress}'`, NS);
            return;
        }
        logger_1.logger.debug(`Removing device from database '${device.ieeeAddr}'`, NS);
        device.removeFromDatabase();
        const data = { ieeeAddr: device.ieeeAddr };
        this.selfAndDeviceEmit(device, Events.Events.deviceLeave, data);
    }
    async onAdapterDisconnected() {
        logger_1.logger.debug(`Adapter disconnected`, NS);
        await catcho(() => this.adapter.stop(), 'Failed to stop adapter on disconnect');
        this.emit(Events.Events.adapterDisconnected);
    }
    async onDeviceJoinedGreenPower(payload) {
        logger_1.logger.debug(`Green power device '${JSON.stringify(payload)}' joined`, NS);
        // Green power devices don't have an ieeeAddr, the sourceID is unique and static so use this.
        let ieeeAddr = payload.sourceID.toString(16);
        ieeeAddr = `0x${'0'.repeat(16 - ieeeAddr.length)}${ieeeAddr}`;
        // Green power devices dont' have a modelID, create a modelID based on the deviceID (=type)
        const modelID = `GreenPower_${payload.deviceID}`;
        let device = model_1.Device.byIeeeAddr(ieeeAddr, true);
        if (!device) {
            logger_1.logger.debug(`New green power device '${ieeeAddr}' joined`, NS);
            logger_1.logger.debug(`Creating device '${ieeeAddr}'`, NS);
            device = model_1.Device.create('GreenPower', ieeeAddr, payload.networkAddress, null, undefined, undefined, modelID, true, []);
            device.save();
            this.selfAndDeviceEmit(device, Events.Events.deviceJoined, { device });
            const deviceInterviewPayload = { status: 'successful', device };
            this.selfAndDeviceEmit(device, Events.Events.deviceInterview, deviceInterviewPayload);
        }
        else if (device.isDeleted) {
            logger_1.logger.debug(`Deleted green power device '${ieeeAddr}' joined, undeleting`, NS);
            device.undelete(true);
            this.selfAndDeviceEmit(device, Events.Events.deviceJoined, { device });
            const deviceInterviewPayload = { status: 'successful', device };
            this.selfAndDeviceEmit(device, Events.Events.deviceInterview, deviceInterviewPayload);
        }
    }
    selfAndDeviceEmit(device, event, data) {
        device?.emit(event, data);
        this.emit(event, data);
    }
    async onDeviceJoined(payload) {
        logger_1.logger.debug(`Device '${payload.ieeeAddr}' joined`, NS);
        if (this.options.acceptJoiningDeviceHandler) {
            if (!(await this.options.acceptJoiningDeviceHandler(payload.ieeeAddr))) {
                logger_1.logger.debug(`Device '${payload.ieeeAddr}' rejected by handler, removing it`, NS);
                await catcho(() => this.adapter.removeDevice(payload.networkAddress, payload.ieeeAddr), 'Failed to remove rejected device');
                return;
            }
            else {
                logger_1.logger.debug(`Device '${payload.ieeeAddr}' accepted by handler`, NS);
            }
        }
        let device = model_1.Device.byIeeeAddr(payload.ieeeAddr, true);
        if (!device) {
            logger_1.logger.debug(`New device '${payload.ieeeAddr}' joined`, NS);
            logger_1.logger.debug(`Creating device '${payload.ieeeAddr}'`, NS);
            device = model_1.Device.create('Unknown', payload.ieeeAddr, payload.networkAddress, undefined, undefined, undefined, undefined, false, []);
            this.selfAndDeviceEmit(device, Events.Events.deviceJoined, { device });
        }
        else if (device.isDeleted) {
            logger_1.logger.debug(`Deleted device '${payload.ieeeAddr}' joined, undeleting`, NS);
            device.undelete();
            this.selfAndDeviceEmit(device, Events.Events.deviceJoined, { device });
        }
        if (device.networkAddress !== payload.networkAddress) {
            logger_1.logger.debug(`Device '${payload.ieeeAddr}' is already in database with different network address, updating network address`, NS);
            device.networkAddress = payload.networkAddress;
            device.save();
        }
        device.updateLastSeen();
        this.selfAndDeviceEmit(device, Events.Events.lastSeenChanged, { device, reason: 'deviceJoined' });
        device.implicitCheckin();
        if (!device.interviewCompleted && !device.interviewing) {
            const payloadStart = { status: 'started', device };
            logger_1.logger.info(`Interview for '${device.ieeeAddr}' started`, NS);
            this.selfAndDeviceEmit(device, Events.Events.deviceInterview, payloadStart);
            try {
                await device.interview();
                logger_1.logger.info(`Succesfully interviewed '${device.ieeeAddr}'`, NS);
                const event = { status: 'successful', device };
                this.selfAndDeviceEmit(device, Events.Events.deviceInterview, event);
            }
            catch (error) {
                logger_1.logger.error(`Interview failed for '${device.ieeeAddr} with error '${error}'`, NS);
                const event = { status: 'failed', device };
                this.selfAndDeviceEmit(device, Events.Events.deviceInterview, event);
            }
        }
        else {
            logger_1.logger.debug(`Not interviewing '${payload.ieeeAddr}', completed '${device.interviewCompleted}', in progress '${device.interviewing}'`, NS);
        }
    }
    async onZclPayload(payload) {
        let frame = undefined;
        let device = undefined;
        if (payload.clusterID === zcl_1.Clusters.touchlink.ID) {
            // This is handled by touchlink
            return;
        }
        else if (payload.clusterID === zcl_1.Clusters.greenPower.ID) {
            try {
                // Custom clusters are not supported for Green Power since we need to parse the frame to get the device.
                frame = zcl_1.ZclFrame.fromBuffer(payload.clusterID, payload.header, payload.data, {});
            }
            catch (error) {
                logger_1.logger.debug(`Failed to parse frame green power frame, ignoring it: ${error}`, NS);
                return;
            }
            await this.greenPower.onZclGreenPowerData(payload, frame);
            // lookup encapsulated gpDevice for further processing
            device = model_1.Device.byNetworkAddress(frame.payload.srcID & 0xFFFF);
        }
        else {
            /**
             * Handling of re-transmitted Xiaomi messages.
             * https://github.com/Koenkk/zigbee2mqtt/issues/1238
             * https://github.com/Koenkk/zigbee2mqtt/issues/3592
             *
             * Some Xiaomi router devices re-transmit messages from Xiaomi end devices.
             * The network address of these message is set to the one of the Xiaomi router.
             * Therefore it looks like if the message came from the Xiaomi router, while in
             * fact it came from the end device.
             * Handling these message would result in false state updates.
             * The group ID attribute of these message defines the network address of the end device.
             */
            device = model_1.Device.find(payload.address);
            if (device?.manufacturerName === 'LUMI' && device?.type == 'Router' && payload.groupID) {
                logger_1.logger.debug(`Handling re-transmitted Xiaomi message ${device.networkAddress} -> ${payload.groupID}`, NS);
                device = model_1.Device.byNetworkAddress(payload.groupID);
            }
            try {
                frame = zcl_1.ZclFrame.fromBuffer(payload.clusterID, payload.header, payload.data, device?.customClusters);
            }
            catch (error) {
                logger_1.logger.debug(`Failed to parse frame: ${error}`, NS);
            }
        }
        if (!device) {
            logger_1.logger.debug(`Data is from unknown device with address '${payload.address}', skipping...`, NS);
            return;
        }
        logger_1.logger.debug(`Received payload: clusterID=${payload.clusterID}, address=${payload.address}, groupID=${payload.groupID}, `
            + `endpoint=${payload.endpoint}, destinationEndpoint=${payload.destinationEndpoint}, wasBroadcast=${payload.wasBroadcast}, `
            + `linkQuality=${payload.linkquality}, frame=${frame?.toString()}`, NS);
        device.updateLastSeen();
        //no implicit checkin for genPollCtrl data because it might interfere with the explicit checkin
        if (!frame?.isCluster("genPollCtrl")) {
            device.implicitCheckin();
        }
        device.linkquality = payload.linkquality;
        let endpoint = device.getEndpoint(payload.endpoint);
        if (!endpoint) {
            logger_1.logger.debug(`Data is from unknown endpoint '${payload.endpoint}' from device with ` +
                `network address '${payload.address}', creating it...`, NS);
            endpoint = device.createEndpoint(payload.endpoint);
        }
        // Parse command for event
        let type = undefined;
        let data;
        let clusterName = undefined;
        const meta = {};
        if (frame) {
            const command = frame.command;
            clusterName = frame.cluster.name;
            meta.zclTransactionSequenceNumber = frame.header.transactionSequenceNumber;
            meta.manufacturerCode = frame.header.manufacturerCode;
            meta.frameControl = frame.header.frameControl;
            if (frame.header.isGlobal) {
                if (frame.isCommand('report')) {
                    type = 'attributeReport';
                    data = helpers_1.ZclFrameConverter.attributeKeyValue(frame, device.manufacturerID, device.customClusters);
                }
                else if (frame.isCommand('read')) {
                    type = 'read';
                    data = helpers_1.ZclFrameConverter.attributeList(frame, device.manufacturerID, device.customClusters);
                }
                else if (frame.isCommand('write')) {
                    type = 'write';
                    data = helpers_1.ZclFrameConverter.attributeKeyValue(frame, device.manufacturerID, device.customClusters);
                }
                else {
                    /* istanbul ignore else */
                    if (frame.isCommand('readRsp')) {
                        type = 'readResponse';
                        data = helpers_1.ZclFrameConverter.attributeKeyValue(frame, device.manufacturerID, device.customClusters);
                    }
                }
            }
            else {
                /* istanbul ignore else */
                if (frame.header.isSpecific) {
                    if (Events.CommandsLookup[command.name]) {
                        type = Events.CommandsLookup[command.name];
                        data = frame.payload;
                    }
                    else {
                        logger_1.logger.debug(`Skipping command '${command.name}' because it is missing from the lookup`, NS);
                    }
                }
            }
            if (type === 'readResponse' || type === 'attributeReport') {
                // Some device report, e.g. it's modelID through a readResponse or attributeReport
                for (const [key, value] of Object.entries(data)) {
                    const property = model_1.Device.ReportablePropertiesMapping[key];
                    if (property && !device[property.key]) {
                        property.set(value, device);
                    }
                }
                endpoint.saveClusterAttributeKeyValue(frame.cluster.ID, data);
            }
        }
        else {
            type = 'raw';
            data = payload.data;
            const name = zcl_1.Utils.getCluster(payload.clusterID, device.manufacturerID, device.customClusters).name;
            clusterName = Number.isNaN(Number(name)) ? name : Number(name);
        }
        if (type && data) {
            const endpoint = device.getEndpoint(payload.endpoint);
            const linkquality = payload.linkquality;
            const groupID = payload.groupID;
            const eventData = {
                type: type, device, endpoint, data, linkquality, groupID, cluster: clusterName, meta
            };
            this.selfAndDeviceEmit(device, Events.Events.message, eventData);
            this.selfAndDeviceEmit(device, Events.Events.lastSeenChanged, { device, reason: 'messageEmitted' });
        }
        else {
            this.selfAndDeviceEmit(device, Events.Events.lastSeenChanged, { device, reason: 'messageNonEmitted' });
        }
        if (frame) {
            await device.onZclData(payload, frame, endpoint);
        }
    }
}
exports.default = Controller;
//# sourceMappingURL=controller.js.map