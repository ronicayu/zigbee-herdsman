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
const zclTransactionSequenceNumber_1 = __importDefault(require("../helpers/zclTransactionSequenceNumber"));
const endpoint_1 = __importDefault(require("./endpoint"));
const entity_1 = __importDefault(require("./entity"));
const utils_1 = require("../../utils");
const Zcl = __importStar(require("../../zcl"));
const assert_1 = __importDefault(require("assert"));
const helpers_1 = require("../helpers");
const logger_1 = require("../../utils/logger");
const zcl_1 = require("../../zcl");
const utils_2 = require("../../zcl/utils");
/**
 * @ignore
 */
const OneJanuary2000 = new Date('January 01, 2000 00:00:00 UTC+00:00').getTime();
const NS = 'zh:controller:device';
class Device extends entity_1.default {
    ID;
    _applicationVersion;
    _dateCode;
    _endpoints;
    _hardwareVersion;
    _ieeeAddr;
    _interviewCompleted;
    _interviewing;
    _lastSeen;
    _manufacturerID;
    _manufacturerName;
    _modelID;
    _networkAddress;
    _powerSource;
    _softwareBuildID;
    _stackVersion;
    _type;
    _zclVersion;
    _linkquality;
    _skipDefaultResponse;
    _customReadResponse;
    _deleted;
    _lastDefaultResponseSequenceNumber;
    _checkinInterval;
    _pendingRequestTimeout;
    _customClusters = {};
    // Getters/setters
    get ieeeAddr() { return this._ieeeAddr; }
    set ieeeAddr(ieeeAddr) { this._ieeeAddr = ieeeAddr; }
    get applicationVersion() { return this._applicationVersion; }
    set applicationVersion(applicationVersion) { this._applicationVersion = applicationVersion; }
    get endpoints() { return this._endpoints; }
    get interviewCompleted() { return this._interviewCompleted; }
    get interviewing() { return this._interviewing; }
    get lastSeen() { return this._lastSeen; }
    get manufacturerID() { return this._manufacturerID; }
    get isDeleted() { return this._deleted; }
    set type(type) { this._type = type; }
    get type() { return this._type; }
    get dateCode() { return this._dateCode; }
    set dateCode(dateCode) { this._dateCode = dateCode; }
    set hardwareVersion(hardwareVersion) { this._hardwareVersion = hardwareVersion; }
    get hardwareVersion() { return this._hardwareVersion; }
    get manufacturerName() { return this._manufacturerName; }
    set manufacturerName(manufacturerName) { this._manufacturerName = manufacturerName; }
    set modelID(modelID) { this._modelID = modelID; }
    get modelID() { return this._modelID; }
    get networkAddress() { return this._networkAddress; }
    set networkAddress(networkAddress) {
        this._networkAddress = networkAddress;
        for (const endpoint of this._endpoints) {
            endpoint.deviceNetworkAddress = networkAddress;
        }
    }
    get powerSource() { return this._powerSource; }
    set powerSource(powerSource) {
        this._powerSource = typeof powerSource === 'number' ? Zcl.PowerSource[powerSource & ~(1 << 7)] : powerSource;
    }
    get softwareBuildID() { return this._softwareBuildID; }
    set softwareBuildID(softwareBuildID) { this._softwareBuildID = softwareBuildID; }
    get stackVersion() { return this._stackVersion; }
    set stackVersion(stackVersion) { this._stackVersion = stackVersion; }
    get zclVersion() { return this._zclVersion; }
    set zclVersion(zclVersion) { this._zclVersion = zclVersion; }
    get linkquality() { return this._linkquality; }
    set linkquality(linkquality) { this._linkquality = linkquality; }
    get skipDefaultResponse() { return this._skipDefaultResponse; }
    set skipDefaultResponse(skipDefaultResponse) { this._skipDefaultResponse = skipDefaultResponse; }
    get customReadResponse() { return this._customReadResponse; }
    set customReadResponse(customReadResponse) { this._customReadResponse = customReadResponse; }
    get checkinInterval() { return this._checkinInterval; }
    set checkinInterval(checkinInterval) {
        this._checkinInterval = checkinInterval;
        this.resetPendingRequestTimeout();
    }
    ;
    get pendingRequestTimeout() { return this._pendingRequestTimeout; }
    set pendingRequestTimeout(pendingRequestTimeout) { this._pendingRequestTimeout = pendingRequestTimeout; }
    get customClusters() { return this._customClusters; }
    meta;
    // This lookup contains all devices that are queried from the database, this is to ensure that always
    // the same instance is returned.
    static devices = null;
    static ReportablePropertiesMapping = {
        modelId: { key: 'modelID', set: (v, d) => { d.modelID = v; } },
        manufacturerName: { key: 'manufacturerName', set: (v, d) => { d.manufacturerName = v; } },
        powerSource: { key: 'powerSource', set: (v, d) => { d.powerSource = v; } },
        zclVersion: { key: 'zclVersion', set: (v, d) => { d.zclVersion = v; } },
        appVersion: { key: 'applicationVersion', set: (v, d) => { d.applicationVersion = v; } },
        stackVersion: { key: 'stackVersion', set: (v, d) => { d.stackVersion = v; } },
        hwVersion: { key: 'hardwareVersion', set: (v, d) => { d.hardwareVersion = v; } },
        dateCode: { key: 'dateCode', set: (v, d) => { d.dateCode = v; } },
        swBuildId: { key: 'softwareBuildID', set: (v, d) => { d.softwareBuildID = v; } },
    };
    constructor(ID, type, ieeeAddr, networkAddress, manufacturerID, endpoints, manufacturerName, powerSource, modelID, applicationVersion, stackVersion, zclVersion, hardwareVersion, dateCode, softwareBuildID, interviewCompleted, meta, lastSeen, checkinInterval, pendingRequestTimeout) {
        super();
        this.ID = ID;
        this._type = type;
        this.ieeeAddr = ieeeAddr;
        this._networkAddress = networkAddress;
        this._manufacturerID = manufacturerID;
        this._endpoints = endpoints;
        this._manufacturerName = manufacturerName;
        this._powerSource = powerSource;
        this._modelID = modelID;
        this._applicationVersion = applicationVersion;
        this._stackVersion = stackVersion;
        this._zclVersion = zclVersion;
        this.hardwareVersion = hardwareVersion;
        this._dateCode = dateCode;
        this._softwareBuildID = softwareBuildID;
        this._interviewCompleted = interviewCompleted;
        this._interviewing = false;
        this._skipDefaultResponse = false;
        this.meta = meta;
        this._lastSeen = lastSeen;
        this._checkinInterval = checkinInterval;
        this._pendingRequestTimeout = pendingRequestTimeout;
    }
    createEndpoint(ID) {
        if (this.getEndpoint(ID)) {
            throw new Error(`Device '${this.ieeeAddr}' already has an endpoint '${ID}'`);
        }
        const endpoint = endpoint_1.default.create(ID, undefined, undefined, [], [], this.networkAddress, this.ieeeAddr);
        this.endpoints.push(endpoint);
        this.save();
        return endpoint;
    }
    changeIeeeAddress(ieeeAddr) {
        delete Device.devices[this.ieeeAddr];
        this.ieeeAddr = ieeeAddr;
        Device.devices[this.ieeeAddr] = this;
        this.endpoints.forEach((e) => e.deviceIeeeAddress = ieeeAddr);
        this.save();
    }
    getEndpoint(ID) {
        return this.endpoints.find((e) => e.ID === ID);
    }
    // There might be multiple endpoints with same DeviceId but it is not supported and first endpoint is returned
    getEndpointByDeviceType(deviceType) {
        const deviceID = Zcl.EndpointDeviceType[deviceType];
        return this.endpoints.find((d) => d.deviceID === deviceID);
    }
    implicitCheckin() {
        this.endpoints.forEach(async (e) => e.sendPendingRequests(false));
    }
    updateLastSeen() {
        this._lastSeen = Date.now();
    }
    resetPendingRequestTimeout() {
        // pendingRequestTimeout can be changed dynamically at runtime, and it is not persisted.
        // Default timeout is one checkin interval in milliseconds.
        this._pendingRequestTimeout = this._checkinInterval * 1000;
    }
    hasPendingRequests() {
        return this.endpoints.find(e => e.hasPendingRequests()) !== undefined;
    }
    async onZclData(dataPayload, frame, endpoint) {
        // Update reportable properties
        if (frame.isCluster('genBasic') && (frame.isCommand('readRsp') || frame.isCommand('report'))) {
            for (const [key, val] of Object.entries(helpers_1.ZclFrameConverter.attributeKeyValue(frame, this.manufacturerID, this.customClusters))) {
                Device.ReportablePropertiesMapping[key]?.set(val, this);
            }
        }
        // Respond to enroll requests
        if (frame.header.isSpecific && frame.isCluster('ssIasZone') && frame.isCommand('enrollReq')) {
            logger_1.logger.debug(`IAS - '${this.ieeeAddr}' responding to enroll response`, NS);
            const payload = { enrollrspcode: 0, zoneid: 23 };
            await endpoint.command('ssIasZone', 'enrollRsp', payload, { disableDefaultResponse: true });
        }
        // Reponse to read requests
        if (frame.header.isGlobal && frame.isCommand('read') && !(this._customReadResponse?.(frame, endpoint))) {
            const time = Math.round(((new Date()).getTime() - OneJanuary2000) / 1000);
            const attributes = {
                ...endpoint.clusters,
                genTime: {
                    attributes: {
                        timeStatus: 3, // Time-master + synchronised
                        time: time,
                        timeZone: ((new Date()).getTimezoneOffset() * -1) * 60,
                        localTime: time - (new Date()).getTimezoneOffset() * 60,
                        lastSetTime: time,
                        validUntilTime: time + (24 * 60 * 60), // valid for 24 hours
                    },
                },
            };
            if (frame.cluster.name in attributes) {
                const response = {};
                for (const entry of frame.payload) {
                    if (frame.cluster.hasAttribute(entry.attrId)) {
                        const name = frame.cluster.getAttribute(entry.attrId).name;
                        if (name in attributes[frame.cluster.name].attributes) {
                            response[name] = attributes[frame.cluster.name].attributes[name];
                        }
                    }
                }
                try {
                    await endpoint.readResponse(frame.cluster.ID, frame.header.transactionSequenceNumber, response, { srcEndpoint: dataPayload.destinationEndpoint });
                }
                catch (error) {
                    logger_1.logger.error(`Read response to ${this.ieeeAddr} failed`, NS);
                }
            }
        }
        // Handle check-in from sleeping end devices
        if (frame.header.isSpecific && frame.isCluster("genPollCtrl") && frame.isCommand("checkin")) {
            try {
                if (this.hasPendingRequests() || (this._checkinInterval === undefined)) {
                    const payload = {
                        startFastPolling: true,
                        fastPollTimeout: 0,
                    };
                    logger_1.logger.debug(`check-in from ${this.ieeeAddr}: accepting fast-poll`, NS);
                    await endpoint.command(frame.cluster.ID, 'checkinRsp', payload, { sendPolicy: 'immediate' });
                    // This is a good time to read the checkin interval if we haven't stored it previously
                    if (this._checkinInterval === undefined) {
                        const pollPeriod = await endpoint.read('genPollCtrl', ['checkinInterval'], { sendPolicy: 'immediate' });
                        this._checkinInterval = pollPeriod.checkinInterval / 4; // convert to seconds
                        this.resetPendingRequestTimeout();
                        logger_1.logger.debug(`Request Queue (${this.ieeeAddr}): default expiration timeout set to ${this.pendingRequestTimeout}`, NS);
                    }
                    await Promise.all(this.endpoints.map(async (e) => e.sendPendingRequests(true)));
                    // We *must* end fast-poll when we're done sending things. Otherwise
                    // we cause undue power-drain.
                    logger_1.logger.debug(`check-in from ${this.ieeeAddr}: stopping fast-poll`, NS);
                    await endpoint.command(frame.cluster.ID, 'fastPollStop', {}, { sendPolicy: 'immediate' });
                }
                else {
                    const payload = {
                        startFastPolling: false,
                        fastPollTimeout: 0,
                    };
                    logger_1.logger.debug(`check-in from ${this.ieeeAddr}: declining fast-poll`, NS);
                    await endpoint.command(frame.cluster.ID, 'checkinRsp', payload, { sendPolicy: 'immediate' });
                }
            }
            catch (error) {
                /* istanbul ignore next */
                logger_1.logger.error(`Handling of poll check-in from ${this.ieeeAddr} failed`, NS);
            }
        }
        // Send a default response if necessary.
        const isDefaultResponse = frame.header.isGlobal && frame.command.name === 'defaultRsp';
        const commandHasResponse = frame.command.hasOwnProperty('response');
        const disableDefaultResponse = frame.header.frameControl.disableDefaultResponse;
        /* istanbul ignore next */
        const disableTuyaDefaultResponse = endpoint.getDevice().manufacturerName?.startsWith('_TZ') && process.env['DISABLE_TUYA_DEFAULT_RESPONSE'];
        // Sometimes messages are received twice, prevent responding twice
        const alreadyResponded = this._lastDefaultResponseSequenceNumber === frame.header.transactionSequenceNumber;
        if (this.type !== 'GreenPower' && !dataPayload.wasBroadcast && !disableDefaultResponse && !isDefaultResponse &&
            !commandHasResponse && !this._skipDefaultResponse && !alreadyResponded && !disableTuyaDefaultResponse) {
            try {
                this._lastDefaultResponseSequenceNumber = frame.header.transactionSequenceNumber;
                // In the ZCL it is not documented what the direction of the default response should be
                // In https://github.com/Koenkk/zigbee2mqtt/issues/18096 a commandResponse (SERVER_TO_CLIENT)
                // is send and the device expects a CLIENT_TO_SERVER back.
                // Previously SERVER_TO_CLIENT was always used.
                // Therefore for non-global commands we inverse the direction.                
                const direction = frame.header.isGlobal ? Zcl.Direction.SERVER_TO_CLIENT : (frame.header.frameControl.direction === Zcl.Direction.CLIENT_TO_SERVER
                    ? Zcl.Direction.SERVER_TO_CLIENT : Zcl.Direction.CLIENT_TO_SERVER);
                await endpoint.defaultResponse(frame.command.ID, 0, frame.cluster.ID, frame.header.transactionSequenceNumber, { direction });
            }
            catch (error) {
                logger_1.logger.error(`Default response to ${this.ieeeAddr} failed`, NS);
            }
        }
    }
    /*
     * CRUD
     */
    static fromDatabaseEntry(entry) {
        const networkAddress = entry.nwkAddr;
        const ieeeAddr = entry.ieeeAddr;
        const endpoints = Object.values(entry.endpoints).map((e) => {
            return endpoint_1.default.fromDatabaseRecord(e, networkAddress, ieeeAddr);
        });
        const meta = entry.meta ? entry.meta : {};
        if (entry.type === 'Group') {
            throw new Error('Cannot load device from group');
        }
        // default: no timeout (messages expire immediately after first send attempt)
        let pendingRequestTimeout = 0;
        if ((endpoints.filter((e) => e.inputClusters.includes(zcl_1.Clusters.genPollCtrl.ID))).length > 0) {
            // default for devices that support genPollCtrl cluster (RX off when idle): 1 day
            pendingRequestTimeout = 86400000;
            /* istanbul ignore else */
            if (entry.hasOwnProperty('checkinInterval')) {
                // if the checkin interval is known, messages expire by default after one checkin interval
                pendingRequestTimeout = entry.checkinInterval * 1000; // milliseconds
            }
        }
        logger_1.logger.debug(`Request Queue (${ieeeAddr}): default expiration timeout set to ${pendingRequestTimeout}`, NS);
        return new Device(entry.id, entry.type, ieeeAddr, networkAddress, entry.manufId, endpoints, entry.manufName, entry.powerSource, entry.modelId, entry.appVersion, entry.stackVersion, entry.zclVersion, entry.hwVersion, entry.dateCode, entry.swBuildId, entry.interviewCompleted, meta, entry.lastSeen || null, entry.checkinInterval, pendingRequestTimeout);
    }
    toDatabaseEntry() {
        const epList = this.endpoints.map((e) => e.ID);
        const endpoints = {};
        for (const endpoint of this.endpoints) {
            endpoints[endpoint.ID] = endpoint.toDatabaseRecord();
        }
        return {
            id: this.ID, type: this.type, ieeeAddr: this.ieeeAddr, nwkAddr: this.networkAddress,
            manufId: this.manufacturerID, manufName: this.manufacturerName, powerSource: this.powerSource,
            modelId: this.modelID, epList, endpoints, appVersion: this.applicationVersion,
            stackVersion: this.stackVersion, hwVersion: this.hardwareVersion, dateCode: this.dateCode,
            swBuildId: this.softwareBuildID, zclVersion: this.zclVersion, interviewCompleted: this.interviewCompleted,
            meta: this.meta, lastSeen: this.lastSeen, checkinInterval: this.checkinInterval
        };
    }
    save(writeDatabase = true) {
        entity_1.default.database.update(this.toDatabaseEntry(), writeDatabase);
    }
    static loadFromDatabaseIfNecessary() {
        if (!Device.devices) {
            Device.devices = {};
            const entries = entity_1.default.database.getEntries(['Coordinator', 'EndDevice', 'Router', 'GreenPower', 'Unknown']);
            for (const entry of entries) {
                const device = Device.fromDatabaseEntry(entry);
                Device.devices[device.ieeeAddr] = device;
            }
        }
    }
    static find(ieeeOrNwkAddress, includeDeleted = false) {
        return typeof ieeeOrNwkAddress === 'string' ? Device.byIeeeAddr(ieeeOrNwkAddress, includeDeleted)
            : Device.byNetworkAddress(ieeeOrNwkAddress, includeDeleted);
    }
    static byIeeeAddr(ieeeAddr, includeDeleted = false) {
        Device.loadFromDatabaseIfNecessary();
        const device = Device.devices[ieeeAddr];
        return device?._deleted && !includeDeleted ? undefined : device;
    }
    static byNetworkAddress(networkAddress, includeDeleted = false) {
        Device.loadFromDatabaseIfNecessary();
        return Object.values(Device.devices).find(d => (includeDeleted || !d._deleted) && d.networkAddress === networkAddress);
    }
    static byType(type) {
        return Device.all().filter(d => d.type === type);
    }
    static all() {
        Device.loadFromDatabaseIfNecessary();
        return Object.values(Device.devices).filter(d => !d._deleted);
    }
    undelete(interviewCompleted) {
        (0, assert_1.default)(this._deleted, `Device '${this.ieeeAddr}' is not deleted`);
        this._deleted = false;
        this._interviewCompleted = interviewCompleted ?? this._interviewCompleted;
        entity_1.default.database.insert(this.toDatabaseEntry());
    }
    static create(type, ieeeAddr, networkAddress, manufacturerID, manufacturerName, powerSource, modelID, interviewCompleted, endpoints) {
        Device.loadFromDatabaseIfNecessary();
        if (Device.devices[ieeeAddr] && !Device.devices[ieeeAddr]._deleted) {
            throw new Error(`Device with ieeeAddr '${ieeeAddr}' already exists`);
        }
        const endpointsMapped = endpoints.map((e) => {
            return endpoint_1.default.create(e.ID, e.profileID, e.deviceID, e.inputClusters, e.outputClusters, networkAddress, ieeeAddr);
        });
        const ID = entity_1.default.database.newID();
        const device = new Device(ID, type, ieeeAddr, networkAddress, manufacturerID, endpointsMapped, manufacturerName, powerSource, modelID, undefined, undefined, undefined, undefined, undefined, undefined, interviewCompleted, {}, null, undefined, 0);
        entity_1.default.database.insert(device.toDatabaseEntry());
        Device.devices[device.ieeeAddr] = device;
        return device;
    }
    /*
     * Zigbee functions
     */
    async interview() {
        if (this.interviewing) {
            const message = `Interview - interview already in progress for '${this.ieeeAddr}'`;
            logger_1.logger.debug(message, NS);
            throw new Error(message);
        }
        let error;
        this._interviewing = true;
        logger_1.logger.debug(`Interview - start device '${this.ieeeAddr}'`, NS);
        try {
            await this.interviewInternal();
            logger_1.logger.debug(`Interview - completed for device '${this.ieeeAddr}'`, NS);
            this._interviewCompleted = true;
        }
        catch (e) {
            if (this.interviewQuirks()) {
                logger_1.logger.debug(`Interview - completed for device '${this.ieeeAddr}' because of quirks ('${e}')`, NS);
            }
            else {
                logger_1.logger.debug(`Interview - failed for device '${this.ieeeAddr}' with error '${e.stack}'`, NS);
                error = e;
            }
        }
        finally {
            this._interviewing = false;
            this.save();
        }
        if (error) {
            throw error;
        }
    }
    interviewQuirks() {
        logger_1.logger.debug(`Interview - quirks check for '${this.modelID}'-'${this.manufacturerName}'-'${this.type}'`, NS);
        // TuYa devices are typically hard to interview. They also don't require a full interview to work correctly
        // e.g. no ias enrolling is required for the devices to work.
        // Assume that in case we got both the manufacturerName and modelID the device works correctly.
        // https://github.com/Koenkk/zigbee2mqtt/issues/7564:
        //      Fails during ias enroll due to UNSUPPORTED_ATTRIBUTE
        // https://github.com/Koenkk/zigbee2mqtt/issues/4655
        //      Device does not change zoneState after enroll (event with original gateway)
        // modelID is mostly in the form of e.g. TS0202 and manufacturerName like e.g. _TYZB01_xph99wvr
        if (this.modelID?.match('^TS\\d*$') &&
            (this.manufacturerName?.match('^_TZ.*_.*$') || this.manufacturerName?.match('^_TYZB01_.*$'))) {
            this._powerSource = this._powerSource || 'Battery';
            this._interviewing = false;
            this._interviewCompleted = true;
            logger_1.logger.debug(`Interview - quirks matched for TuYa end device`, NS);
            return true;
        }
        // Some devices, e.g. Xiaomi end devices have a different interview procedure, after pairing they
        // report it's modelID trough a readResponse. The readResponse is received by the controller and set
        // on the device.
        const lookup = {
            '^3R.*?Z': {
                type: 'EndDevice', powerSource: 'Battery'
            },
            'lumi\..*': {
                type: 'EndDevice', manufacturerID: 4151, manufacturerName: 'LUMI', powerSource: 'Battery'
            },
            'TERNCY-PP01': {
                type: 'EndDevice', manufacturerID: 4648, manufacturerName: 'TERNCY', powerSource: 'Battery'
            },
            '3RWS18BZ': {}, // https://github.com/Koenkk/zigbee-herdsman-converters/pull/2710
            'MULTI-MECI--EA01': {},
            'MOT003': {}, // https://github.com/Koenkk/zigbee2mqtt/issues/12471
        };
        const match = Object.keys(lookup).find((key) => this.modelID && this.modelID.match(key));
        if (match) {
            const info = lookup[match];
            logger_1.logger.debug(`Interview procedure failed but got modelID matching '${match}', assuming interview succeeded`, NS);
            this._type = this._type === 'Unknown' ? info.type : this._type;
            this._manufacturerID = this._manufacturerID || info.manufacturerID;
            this._manufacturerName = this._manufacturerName || info.manufacturerName;
            this._powerSource = this._powerSource || info.powerSource;
            this._interviewing = false;
            this._interviewCompleted = true;
            logger_1.logger.debug(`Interview - quirks matched on '${match}'`, NS);
            return true;
        }
        else {
            logger_1.logger.debug('Interview - quirks did not match', NS);
            return false;
        }
    }
    async interviewInternal() {
        const nodeDescriptorQuery = async () => {
            const nodeDescriptor = await entity_1.default.adapter.nodeDescriptor(this.networkAddress);
            this._manufacturerID = nodeDescriptor.manufacturerCode;
            this._type = nodeDescriptor.type;
            logger_1.logger.debug(`Interview - got node descriptor for device '${this.ieeeAddr}'`, NS);
        };
        const hasNodeDescriptor = () => this._manufacturerID != null && this._type != null;
        if (!hasNodeDescriptor()) {
            for (let attempt = 0; attempt < 6; attempt++) {
                try {
                    await nodeDescriptorQuery();
                    break;
                }
                catch (error) {
                    if (this.interviewQuirks()) {
                        logger_1.logger.debug(`Interview - completed for device '${this.ieeeAddr}' because of quirks ('${error}')`, NS);
                        return;
                    }
                    else {
                        // Most of the times the first node descriptor query fails and the seconds one succeeds.
                        logger_1.logger.debug(`Interview - node descriptor request failed for '${this.ieeeAddr}', attempt ${attempt + 1}`, NS);
                    }
                }
            }
        }
        else {
            logger_1.logger.debug(`Interview - skip node descriptor request for '${this.ieeeAddr}', already got it`, NS);
        }
        if (!hasNodeDescriptor()) {
            throw new Error(`Interview failed because can not get node descriptor ('${this.ieeeAddr}')`);
        }
        if (this.manufacturerID === 4619 && this._type === 'EndDevice') {
            // Give TuYa end device some time to pair. Otherwise they leave immediately.
            // https://github.com/Koenkk/zigbee2mqtt/issues/5814
            logger_1.logger.debug("Interview - Detected TuYa end device, waiting 10 seconds...", NS);
            await (0, utils_1.Wait)(10000);
        }
        else if ([0, 4098].includes(this.manufacturerID)) {
            // Potentially a TuYa device, some sleep fast so make sure to read the modelId and manufacturerName quickly.
            // In case the device responds, the endoint and modelID/manufacturerName are set
            // in controller.onZclOrRawData()
            // https://github.com/Koenkk/zigbee2mqtt/issues/7553
            logger_1.logger.debug("Interview - Detected potential TuYa end device, reading modelID and manufacturerName...", NS);
            try {
                const endpoint = endpoint_1.default.create(1, undefined, undefined, [], [], this.networkAddress, this.ieeeAddr);
                const result = await endpoint.read('genBasic', ['modelId', 'manufacturerName'], { sendPolicy: 'immediate' });
                Object.entries(result)
                    .forEach((entry) => Device.ReportablePropertiesMapping[entry[0]].set(entry[1], this));
            }
            catch (error) {
                /* istanbul ignore next */
                logger_1.logger.debug(`Interview - TuYa read modelID and manufacturerName failed (${error})`, NS);
            }
        }
        // e.g. Xiaomi Aqara Opple devices fail to respond to the first active endpoints request, therefore try 2 times
        // https://github.com/Koenkk/zigbee-herdsman/pull/103
        let activeEndpoints;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                activeEndpoints = await entity_1.default.adapter.activeEndpoints(this.networkAddress);
                break;
            }
            catch (error) {
                logger_1.logger.debug(`Interview - active endpoints request failed for '${this.ieeeAddr}', attempt ${attempt + 1}`, NS);
            }
        }
        if (!activeEndpoints) {
            throw new Error(`Interview failed because can not get active endpoints ('${this.ieeeAddr}')`);
        }
        // Make sure that the endpoint are sorted.
        activeEndpoints.endpoints.sort((a, b) => a - b);
        // Some devices, e.g. TERNCY return endpoint 0 in the active endpoints request.
        // This is not a valid endpoint number according to the ZCL, requesting a simple descriptor will result
        // into an error. Therefore we filter it, more info: https://github.com/Koenkk/zigbee-herdsman/issues/82
        activeEndpoints.endpoints.filter((e) => e !== 0 && !this.getEndpoint(e)).forEach((e) => this._endpoints.push(endpoint_1.default.create(e, undefined, undefined, [], [], this.networkAddress, this.ieeeAddr)));
        logger_1.logger.debug(`Interview - got active endpoints for device '${this.ieeeAddr}'`, NS);
        for (const endpointID of activeEndpoints.endpoints.filter((e) => e !== 0)) {
            const endpoint = this.getEndpoint(endpointID);
            const simpleDescriptor = await entity_1.default.adapter.simpleDescriptor(this.networkAddress, endpoint.ID);
            endpoint.profileID = simpleDescriptor.profileID;
            endpoint.deviceID = simpleDescriptor.deviceID;
            endpoint.inputClusters = simpleDescriptor.inputClusters;
            endpoint.outputClusters = simpleDescriptor.outputClusters;
            logger_1.logger.debug(`Interview - got simple descriptor for endpoint '${endpoint.ID}' device '${this.ieeeAddr}'`, NS);
            // Read attributes, nice to have but not required for succesfull pairing as most of the attributes
            // are not mandatory in ZCL specification.
            if (endpoint.supportsInputCluster('genBasic')) {
                for (const [key, item] of Object.entries(Device.ReportablePropertiesMapping)) {
                    if (!this[item.key]) {
                        try {
                            let result;
                            try {
                                result = await endpoint.read('genBasic', [key], { sendPolicy: 'immediate' });
                            }
                            catch (error) {
                                // Reading attributes can fail for many reason, e.g. it could be that device rejoins
                                // while joining like in:
                                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/2485.
                                // The modelID and manufacturerName are crucial for device identification, so retry.
                                if (item.key === 'modelID' || item.key === 'manufacturerName') {
                                    logger_1.logger.debug(`Interview - first ${item.key} retrieval attempt failed, retrying after 10 seconds...`, NS);
                                    await (0, utils_1.Wait)(10000);
                                    result = await endpoint.read('genBasic', [key], { sendPolicy: 'immediate' });
                                }
                                else {
                                    throw error;
                                }
                            }
                            item.set(result[key], this);
                            logger_1.logger.debug(`Interview - got '${item.key}' for device '${this.ieeeAddr}'`, NS);
                        }
                        catch (error) {
                            logger_1.logger.debug(`Interview - failed to read attribute '${item.key}' from endpoint '${endpoint.ID}' (${error})`, NS);
                        }
                    }
                }
            }
        }
        const coordinator = Device.byType('Coordinator')[0];
        // Enroll IAS device
        for (const endpoint of this.endpoints.filter((e) => e.supportsInputCluster('ssIasZone'))) {
            logger_1.logger.debug(`Interview - IAS - enrolling '${this.ieeeAddr}' endpoint '${endpoint.ID}'`, NS);
            const stateBefore = await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState'], { sendPolicy: 'immediate' });
            logger_1.logger.debug(`Interview - IAS - before enrolling state: '${JSON.stringify(stateBefore)}'`, NS);
            // Do not enroll when device has already been enrolled
            if (stateBefore.zoneState !== 1 || stateBefore.iasCieAddr !== coordinator.ieeeAddr) {
                logger_1.logger.debug(`Interview - IAS - not enrolled, enrolling`, NS);
                await endpoint.write('ssIasZone', { 'iasCieAddr': coordinator.ieeeAddr }, { sendPolicy: 'immediate' });
                logger_1.logger.debug(`Interview - IAS - wrote iasCieAddr`, NS);
                // There are 2 enrollment procedures:
                // - Auto enroll: coordinator has to send enrollResponse without receiving an enroll request
                //                this case is handled below.
                // - Manual enroll: coordinator replies to enroll request with an enroll response.
                //                  this case in hanled in onZclData().
                // https://github.com/Koenkk/zigbee2mqtt/issues/4569#issuecomment-706075676
                await (0, utils_1.Wait)(500);
                logger_1.logger.debug(`IAS - '${this.ieeeAddr}' sending enroll response (auto enroll)`, NS);
                const payload = { enrollrspcode: 0, zoneid: 23 };
                await endpoint.command('ssIasZone', 'enrollRsp', payload, { disableDefaultResponse: true, sendPolicy: 'immediate' });
                let enrolled = false;
                for (let attempt = 0; attempt < 20; attempt++) {
                    await (0, utils_1.Wait)(500);
                    const stateAfter = await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState'], { sendPolicy: 'immediate' });
                    logger_1.logger.debug(`Interview - IAS - after enrolling state (${attempt}): '${JSON.stringify(stateAfter)}'`, NS);
                    if (stateAfter.zoneState === 1) {
                        enrolled = true;
                        break;
                    }
                }
                if (enrolled) {
                    logger_1.logger.debug(`Interview - IAS successfully enrolled '${this.ieeeAddr}' endpoint '${endpoint.ID}'`, NS);
                }
                else {
                    throw new Error(`Interview failed because of failed IAS enroll (zoneState didn't change ('${this.ieeeAddr}')`);
                }
            }
            else {
                logger_1.logger.debug(`Interview - IAS - already enrolled, skipping enroll`, NS);
            }
        }
        // Bind poll control
        try {
            for (const endpoint of this.endpoints.filter((e) => e.supportsInputCluster('genPollCtrl'))) {
                logger_1.logger.debug(`Interview - Poll control - binding '${this.ieeeAddr}' endpoint '${endpoint.ID}'`, NS);
                await endpoint.bind('genPollCtrl', coordinator.endpoints[0]);
                const pollPeriod = await endpoint.read('genPollCtrl', ['checkinInterval'], { sendPolicy: 'immediate' });
                this._checkinInterval = pollPeriod.checkinInterval / 4; // convert to seconds
                this.resetPendingRequestTimeout();
            }
        }
        catch (error) {
            /* istanbul ignore next */
            logger_1.logger.debug(`Interview - failed to bind genPollCtrl (${error})`, NS);
        }
    }
    async removeFromNetwork() {
        if (this._type === 'GreenPower') {
            const payload = {
                options: 0x002550,
                srcID: Number(this.ieeeAddr),
            };
            const frame = Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, Zcl.Direction.SERVER_TO_CLIENT, true, null, zclTransactionSequenceNumber_1.default.next(), 'pairing', 33, payload, this.customClusters);
            await entity_1.default.adapter.sendZclFrameToAll(242, frame, 242);
        }
        else
            await entity_1.default.adapter.removeDevice(this.networkAddress, this.ieeeAddr);
        this.removeFromDatabase();
    }
    removeFromDatabase() {
        Device.loadFromDatabaseIfNecessary();
        for (const endpoint of this.endpoints) {
            endpoint.removeFromAllGroupsDatabase();
        }
        if (entity_1.default.database.has(this.ID)) {
            entity_1.default.database.remove(this.ID);
        }
        this._deleted = true;
        // Clear all data in case device joins again
        this._interviewCompleted = false;
        this._interviewing = false;
        this.meta = {};
        const newEndpoints = [];
        for (const endpoint of this.endpoints) {
            newEndpoints.push(endpoint_1.default.create(endpoint.ID, endpoint.profileID, endpoint.deviceID, endpoint.inputClusters, endpoint.outputClusters, this.networkAddress, this.ieeeAddr));
        }
        this._endpoints = newEndpoints;
    }
    async lqi() {
        return entity_1.default.adapter.lqi(this.networkAddress);
    }
    async routingTable() {
        return entity_1.default.adapter.routingTable(this.networkAddress);
    }
    async ping(disableRecovery = true) {
        // Zigbee does not have an official pining mechamism. Use a read request
        // of a mandatory basic cluster attribute to keep it as lightweight as
        // possible.
        const endpoint = this.endpoints.find((ep) => ep.inputClusters.includes(0)) ?? this.endpoints[0];
        await endpoint.read('genBasic', ['zclVersion'], { disableRecovery });
    }
    addCustomCluster(name, cluster) {
        (0, assert_1.default)(!([zcl_1.Clusters.touchlink.ID, zcl_1.Clusters.greenPower.ID].includes(cluster.ID)), 'Overriding of greenPower or touchlink cluster is not supported');
        if ((0, utils_2.isClusterName)(name)) {
            const existingCluster = zcl_1.Clusters[name];
            // Extend existing cluster
            (0, assert_1.default)(existingCluster.ID === cluster.ID, `Custom cluster ID (${cluster.ID}) should match existing cluster ID (${existingCluster.ID})`);
            cluster = {
                ID: cluster.ID,
                manufacturerCode: cluster.manufacturerCode,
                attributes: { ...existingCluster.attributes, ...cluster.attributes },
                commands: { ...existingCluster.commands, ...cluster.commands },
                commandsResponse: { ...existingCluster.commandsResponse, ...cluster.commandsResponse },
            };
        }
        this._customClusters[name] = cluster;
    }
}
exports.default = Device;
//# sourceMappingURL=device.js.map