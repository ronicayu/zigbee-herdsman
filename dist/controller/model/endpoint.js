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
const entity_1 = __importDefault(require("./entity"));
const Zcl = __importStar(require("../../zcl"));
const zclTransactionSequenceNumber_1 = __importDefault(require("../helpers/zclTransactionSequenceNumber"));
const ZclFrameConverter = __importStar(require("../helpers/zclFrameConverter"));
const request_1 = __importDefault(require("../helpers/request"));
const requestQueue_1 = __importDefault(require("../helpers/requestQueue"));
const group_1 = __importDefault(require("./group"));
const device_1 = __importDefault(require("./device"));
const assert_1 = __importDefault(require("assert"));
const logger_1 = require("../../utils/logger");
const NS = 'zh:controller:endpoint';
class Endpoint extends entity_1.default {
    deviceID;
    inputClusters;
    outputClusters;
    profileID;
    ID;
    clusters;
    deviceIeeeAddress;
    deviceNetworkAddress;
    _binds;
    _configuredReportings;
    meta;
    pendingRequests;
    // Getters/setters
    get binds() {
        return this._binds.map((entry) => {
            let target = null;
            if (entry.type === 'endpoint') {
                const device = device_1.default.byIeeeAddr(entry.deviceIeeeAddress);
                if (device) {
                    target = device.getEndpoint(entry.endpointID);
                }
            }
            else {
                target = group_1.default.byGroupID(entry.groupID);
            }
            if (target) {
                return { target, cluster: this.getCluster(entry.cluster) };
            }
            else {
                return undefined;
            }
        }).filter(b => b !== undefined);
    }
    get configuredReportings() {
        return this._configuredReportings.map((entry) => {
            const cluster = Zcl.Utils.getCluster(entry.cluster, entry.manufacturerCode, this.getDevice().customClusters);
            let attribute;
            if (cluster.hasAttribute(entry.attrId)) {
                attribute = cluster.getAttribute(entry.attrId);
            }
            else {
                attribute = {
                    ID: entry.attrId,
                    name: undefined,
                    type: undefined,
                    manufacturerCode: undefined
                };
            }
            return {
                cluster, attribute,
                minimumReportInterval: entry.minRepIntval,
                maximumReportInterval: entry.maxRepIntval,
                reportableChange: entry.repChange,
            };
        });
    }
    constructor(ID, profileID, deviceID, inputClusters, outputClusters, deviceNetworkAddress, deviceIeeeAddress, clusters, binds, configuredReportings, meta) {
        super();
        this.ID = ID;
        this.profileID = profileID;
        this.deviceID = deviceID;
        this.inputClusters = inputClusters;
        this.outputClusters = outputClusters;
        this.deviceNetworkAddress = deviceNetworkAddress;
        this.deviceIeeeAddress = deviceIeeeAddress;
        this.clusters = clusters;
        this._binds = binds;
        this._configuredReportings = configuredReportings;
        this.meta = meta;
        this.pendingRequests = new requestQueue_1.default(this);
    }
    /**
     * Get device of this endpoint
     */
    getDevice() {
        return device_1.default.byIeeeAddr(this.deviceIeeeAddress);
    }
    /**
     * @param {number|string} clusterKey
     * @returns {boolean}
     */
    supportsInputCluster(clusterKey) {
        const cluster = this.getCluster(clusterKey);
        return this.inputClusters.includes(cluster.ID);
    }
    /**
     * @param {number|string} clusterKey
     * @returns {boolean}
     */
    supportsOutputCluster(clusterKey) {
        const cluster = this.getCluster(clusterKey);
        return this.outputClusters.includes(cluster.ID);
    }
    /**
     * @returns {Zcl.TsType.Cluster[]}
     */
    getInputClusters() {
        return this.clusterNumbersToClusters(this.inputClusters);
    }
    /**
     * @returns {Zcl.TsType.Cluster[]}
     */
    getOutputClusters() {
        return this.clusterNumbersToClusters(this.outputClusters);
    }
    clusterNumbersToClusters(clusterNumbers) {
        return clusterNumbers.map((c) => this.getCluster(c));
    }
    /*
     * CRUD
     */
    static fromDatabaseRecord(record, deviceNetworkAddress, deviceIeeeAddress) {
        // Migrate attrs to attributes
        for (const entry of Object.values(record.clusters).filter((e) => e.hasOwnProperty('attrs'))) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            entry.attributes = entry.attrs;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            delete entry.attrs;
        }
        return new Endpoint(record.epId, record.profId, record.devId, record.inClusterList, record.outClusterList, deviceNetworkAddress, deviceIeeeAddress, record.clusters, record.binds || [], record.configuredReportings || [], record.meta || {});
    }
    toDatabaseRecord() {
        return {
            profId: this.profileID, epId: this.ID, devId: this.deviceID,
            inClusterList: this.inputClusters, outClusterList: this.outputClusters, clusters: this.clusters,
            binds: this._binds, configuredReportings: this._configuredReportings, meta: this.meta,
        };
    }
    static create(ID, profileID, deviceID, inputClusters, outputClusters, deviceNetworkAddress, deviceIeeeAddress) {
        return new Endpoint(ID, profileID, deviceID, inputClusters, outputClusters, deviceNetworkAddress, deviceIeeeAddress, {}, [], [], {});
    }
    saveClusterAttributeKeyValue(clusterKey, list) {
        const cluster = this.getCluster(clusterKey);
        if (!this.clusters[cluster.name])
            this.clusters[cluster.name] = { attributes: {} };
        for (const [attribute, value] of Object.entries(list)) {
            this.clusters[cluster.name].attributes[attribute] = value;
        }
    }
    getClusterAttributeValue(clusterKey, attributeKey) {
        const cluster = this.getCluster(clusterKey);
        const attribute = cluster.getAttribute(attributeKey);
        if (this.clusters[cluster.name] && this.clusters[cluster.name].attributes) {
            return this.clusters[cluster.name].attributes[attribute.name];
        }
        return null;
    }
    hasPendingRequests() {
        return this.pendingRequests.size > 0;
    }
    async sendPendingRequests(fastPolling) {
        return this.pendingRequests.send(fastPolling);
    }
    async sendRequest(frame, options, func = (d) => {
        return entity_1.default.adapter.sendZclFrameToEndpoint(this.deviceIeeeAddress, this.deviceNetworkAddress, this.ID, d, options.timeout, options.disableResponse, options.disableRecovery, options.srcEndpoint);
    }) {
        const logPrefix = `Request Queue (${this.deviceIeeeAddress}/${this.ID}): `;
        const device = this.getDevice();
        const request = new request_1.default(func, frame, device.pendingRequestTimeout, options.sendPolicy);
        if (request.sendPolicy !== 'bulk') {
            // Check if such a request is already in the queue and remove the old one(s) if necessary
            this.pendingRequests.filter(request);
        }
        // send without queueing if sendPolicy is 'immediate' or if the device has no timeout set
        if (request.sendPolicy === 'immediate' || !device.pendingRequestTimeout) {
            if (device.pendingRequestTimeout > 0) {
                logger_1.logger.debug(logPrefix + `send ${frame.command.name} request immediately (sendPolicy=${options.sendPolicy})`, NS);
            }
            return request.send();
        }
        // If this is a bulk message, we queue directly.
        if (request.sendPolicy === 'bulk') {
            logger_1.logger.debug(logPrefix + `queue request (${this.pendingRequests.size})`, NS);
            return this.pendingRequests.queue(request);
        }
        try {
            logger_1.logger.debug(logPrefix + `send request`, NS);
            return await request.send();
        }
        catch (error) {
            // If we got a failed transaction, the device is likely sleeping.
            // Queue for transmission later.
            logger_1.logger.debug(logPrefix + `queue request (transaction failed)`, NS);
            return this.pendingRequests.queue(request);
        }
    }
    /*
     * Zigbee functions
     */
    checkStatus(payload) {
        const codes = Array.isArray(payload) ? payload.map((i) => i.status) : [payload.statusCode];
        const invalid = codes.find((c) => c !== Zcl.Status.SUCCESS);
        if (invalid)
            throw new Zcl.ZclStatusError(invalid);
    }
    async report(clusterKey, attributes, options) {
        const cluster = this.getCluster(clusterKey);
        const payload = [];
        for (const [nameOrID, value] of Object.entries(attributes)) {
            if (cluster.hasAttribute(nameOrID)) {
                const attribute = cluster.getAttribute(nameOrID);
                payload.push({ attrId: attribute.ID, attrData: value, dataType: attribute.type });
            }
            else if (!isNaN(Number(nameOrID))) {
                payload.push({ attrId: Number(nameOrID), attrData: value.value, dataType: value.type });
            }
            else {
                throw new Error(`Unknown attribute '${nameOrID}', specify either an existing attribute or a number`);
            }
        }
        await this.zclCommand(clusterKey, "report", payload, options, attributes);
    }
    async write(clusterKey, attributes, options) {
        const cluster = this.getCluster(clusterKey);
        options = this.getOptionsWithDefaults(options, true, Zcl.Direction.CLIENT_TO_SERVER, cluster.manufacturerCode);
        options.manufacturerCode = this.ensureManufacturerCodeIsUniqueAndGet(cluster, Object.keys(attributes), options.manufacturerCode, 'write');
        const payload = [];
        for (const [nameOrID, value] of Object.entries(attributes)) {
            if (cluster.hasAttribute(nameOrID)) {
                const attribute = cluster.getAttribute(nameOrID);
                payload.push({ attrId: attribute.ID, attrData: value, dataType: attribute.type });
            }
            else if (!isNaN(Number(nameOrID))) {
                payload.push({ attrId: Number(nameOrID), attrData: value.value, dataType: value.type });
            }
            else {
                throw new Error(`Unknown attribute '${nameOrID}', specify either an existing attribute or a number`);
            }
        }
        await this.zclCommand(clusterKey, options.writeUndiv ? "writeUndiv" : "write", payload, options, attributes, true);
    }
    async writeResponse(clusterKey, transactionSequenceNumber, attributes, options) {
        (0, assert_1.default)(!options || !options.hasOwnProperty('transactionSequenceNumber'), 'Use parameter');
        const cluster = this.getCluster(clusterKey);
        const payload = [];
        for (const [nameOrID, value] of Object.entries(attributes)) {
            if (value.hasOwnProperty('status')) {
                if (cluster.hasAttribute(nameOrID)) {
                    const attribute = cluster.getAttribute(nameOrID);
                    payload.push({ attrId: attribute.ID, status: value.status });
                }
                else if (!isNaN(Number(nameOrID))) {
                    payload.push({ attrId: Number(nameOrID), status: value.status });
                }
                else {
                    throw new Error(`Unknown attribute '${nameOrID}', specify either an existing attribute or a number`);
                }
            }
            else {
                throw new Error(`Missing attribute 'status'`);
            }
        }
        await this.zclCommand(clusterKey, 'writeRsp', payload, { direction: Zcl.Direction.SERVER_TO_CLIENT, ...options, transactionSequenceNumber }, attributes);
    }
    async read(clusterKey, attributes, options) {
        const device = this.getDevice();
        const cluster = this.getCluster(clusterKey, device);
        options = this.getOptionsWithDefaults(options, true, Zcl.Direction.CLIENT_TO_SERVER, cluster.manufacturerCode);
        options.manufacturerCode = this.ensureManufacturerCodeIsUniqueAndGet(cluster, attributes, options.manufacturerCode, 'read');
        const payload = [];
        for (const attribute of attributes) {
            payload.push({ attrId: typeof attribute === 'number' ? attribute : cluster.getAttribute(attribute).ID });
        }
        const resultFrame = await this.zclCommand(clusterKey, 'read', payload, options, attributes, true);
        if (resultFrame) {
            return ZclFrameConverter.attributeKeyValue(resultFrame, device.manufacturerID, device.customClusters);
        }
    }
    async readResponse(clusterKey, transactionSequenceNumber, attributes, options) {
        (0, assert_1.default)(!options || !options.hasOwnProperty('transactionSequenceNumber'), 'Use parameter');
        const cluster = this.getCluster(clusterKey);
        const payload = [];
        for (const [nameOrID, value] of Object.entries(attributes)) {
            if (cluster.hasAttribute(nameOrID)) {
                const attribute = cluster.getAttribute(nameOrID);
                payload.push({ attrId: attribute.ID, attrData: value, dataType: attribute.type, status: 0 });
            }
            else if (!isNaN(Number(nameOrID))) {
                payload.push({ attrId: Number(nameOrID), attrData: value.value, dataType: value.type, status: 0 });
            }
            else {
                throw new Error(`Unknown attribute '${nameOrID}', specify either an existing attribute or a number`);
            }
        }
        await this.zclCommand(clusterKey, 'readRsp', payload, { direction: Zcl.Direction.SERVER_TO_CLIENT, ...options, transactionSequenceNumber }, attributes);
    }
    addBinding(clusterKey, target) {
        const cluster = this.getCluster(clusterKey);
        if (typeof target === 'number') {
            target = group_1.default.byGroupID(target) || group_1.default.create(target);
        }
        if (!this.binds.find((b) => b.cluster.ID === cluster.ID && b.target === target)) {
            if (target instanceof group_1.default) {
                this._binds.push({ cluster: cluster.ID, groupID: target.groupID, type: 'group' });
            }
            else {
                this._binds.push({
                    cluster: cluster.ID, type: 'endpoint', deviceIeeeAddress: target.deviceIeeeAddress,
                    endpointID: target.ID
                });
            }
            this.save();
        }
    }
    async bind(clusterKey, target) {
        const cluster = this.getCluster(clusterKey);
        const type = target instanceof Endpoint ? 'endpoint' : 'group';
        if (typeof target === 'number') {
            target = group_1.default.byGroupID(target) || group_1.default.create(target);
        }
        const destinationAddress = target instanceof Endpoint ? target.deviceIeeeAddress : target.groupID;
        const log = `Bind ${this.deviceIeeeAddress}/${this.ID} ${cluster.name} from ` +
            `'${target instanceof Endpoint ? `${destinationAddress}/${target.ID}` : destinationAddress}'`;
        logger_1.logger.debug(log, NS);
        try {
            await entity_1.default.adapter.bind(this.deviceNetworkAddress, this.deviceIeeeAddress, this.ID, cluster.ID, destinationAddress, type, target instanceof Endpoint ? target.ID : null);
            this.addBinding(clusterKey, target);
        }
        catch (error) {
            error.message = `${log} failed (${error.message})`;
            logger_1.logger.debug(error, NS);
            throw error;
        }
    }
    save() {
        this.getDevice().save();
    }
    async unbind(clusterKey, target) {
        const cluster = this.getCluster(clusterKey);
        const type = target instanceof Endpoint ? 'endpoint' : 'group';
        const destinationAddress = target instanceof Endpoint ? target.deviceIeeeAddress : (target instanceof group_1.default ? target.groupID : target);
        const log = `Unbind ${this.deviceIeeeAddress}/${this.ID} ${cluster.name} from ` +
            `'${target instanceof Endpoint ? `${destinationAddress}/${target.ID}` : destinationAddress}'`;
        logger_1.logger.debug(log, NS);
        try {
            await entity_1.default.adapter.unbind(this.deviceNetworkAddress, this.deviceIeeeAddress, this.ID, cluster.ID, destinationAddress, type, target instanceof Endpoint ? target.ID : null);
            if (typeof target === 'number' && group_1.default.byGroupID(target)) {
                target = group_1.default.byGroupID(target);
            }
            const index = this.binds.findIndex((b) => b.cluster.ID === cluster.ID && b.target === target);
            if (index !== -1) {
                this._binds.splice(index, 1);
                this.save();
            }
        }
        catch (error) {
            error.message = `${log} failed (${error.message})`;
            logger_1.logger.debug(error, NS);
            throw error;
        }
    }
    async defaultResponse(commandID, status, clusterID, transactionSequenceNumber, options) {
        (0, assert_1.default)(!options || !options.hasOwnProperty('transactionSequenceNumber'), 'Use parameter');
        const payload = { cmdId: commandID, statusCode: status };
        await this.zclCommand(clusterID, 'defaultRsp', payload, { direction: Zcl.Direction.SERVER_TO_CLIENT, ...options, transactionSequenceNumber });
    }
    async configureReporting(clusterKey, items, options) {
        const cluster = this.getCluster(clusterKey);
        options = this.getOptionsWithDefaults(options, true, Zcl.Direction.CLIENT_TO_SERVER, cluster.manufacturerCode);
        options.manufacturerCode = this.ensureManufacturerCodeIsUniqueAndGet(cluster, items, options.manufacturerCode, 'configureReporting');
        const payload = items.map((item) => {
            let dataType, attrId;
            if (typeof item.attribute === 'object') {
                dataType = item.attribute.type;
                attrId = item.attribute.ID;
            }
            else {
                /* istanbul ignore else */
                if (cluster.hasAttribute(item.attribute)) {
                    const attribute = cluster.getAttribute(item.attribute);
                    dataType = attribute.type;
                    attrId = attribute.ID;
                }
            }
            return {
                direction: Zcl.Direction.CLIENT_TO_SERVER,
                attrId, dataType,
                minRepIntval: item.minimumReportInterval,
                maxRepIntval: item.maximumReportInterval,
                repChange: item.reportableChange,
            };
        });
        await this.zclCommand(clusterKey, 'configReport', payload, options, items, true);
        for (const e of payload) {
            this._configuredReportings = this._configuredReportings.filter((c) => !(c.attrId === e.attrId && c.cluster === cluster.ID &&
                (!('manufacturerCode' in c) || c.manufacturerCode === options.manufacturerCode)));
        }
        for (const entry of payload) {
            if (entry.maxRepIntval !== 0xFFFF) {
                this._configuredReportings.push({
                    cluster: cluster.ID, attrId: entry.attrId, minRepIntval: entry.minRepIntval,
                    maxRepIntval: entry.maxRepIntval, repChange: entry.repChange,
                    manufacturerCode: options.manufacturerCode,
                });
            }
        }
        this.save();
    }
    async writeStructured(clusterKey, payload, options) {
        await this.zclCommand(clusterKey, 'writeStructured', payload, options);
        // TODO: support `writeStructuredResponse`
    }
    async command(clusterKey, commandKey, payload, options) {
        const frame = await this.zclCommand(clusterKey, commandKey, payload, options, null, false, Zcl.FrameType.SPECIFIC);
        if (frame) {
            return frame.payload;
        }
    }
    async commandResponse(clusterKey, commandKey, payload, options, transactionSequenceNumber) {
        (0, assert_1.default)(!options || !options.hasOwnProperty('transactionSequenceNumber'), 'Use parameter');
        const device = this.getDevice();
        const cluster = this.getCluster(clusterKey, device);
        const command = cluster.getCommandResponse(commandKey);
        transactionSequenceNumber = transactionSequenceNumber || zclTransactionSequenceNumber_1.default.next();
        options = this.getOptionsWithDefaults(options, true, Zcl.Direction.SERVER_TO_CLIENT, cluster.manufacturerCode);
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, options.direction, options.disableDefaultResponse, options.manufacturerCode, transactionSequenceNumber, command.name, cluster.name, payload, device.customClusters, options.reservedBits);
        const log = `CommandResponse ${this.deviceIeeeAddress}/${this.ID} ` +
            `${cluster.name}.${command.name}(${JSON.stringify(payload)}, ${JSON.stringify(options)})`;
        logger_1.logger.debug(log, NS);
        try {
            await this.sendRequest(frame, options, async (f) => {
                // Broadcast Green Power responses
                if (this.ID === 242) {
                    await entity_1.default.adapter.sendZclFrameToAll(242, f, 242);
                }
                else {
                    await entity_1.default.adapter.sendZclFrameToEndpoint(this.deviceIeeeAddress, this.deviceNetworkAddress, this.ID, f, options.timeout, options.disableResponse, options.disableRecovery, options.srcEndpoint);
                }
            });
        }
        catch (error) {
            error.message = `${log} failed (${error.message})`;
            logger_1.logger.debug(error, NS);
            throw error;
        }
    }
    waitForCommand(clusterKey, commandKey, transactionSequenceNumber, timeout) {
        const device = this.getDevice();
        const cluster = this.getCluster(clusterKey, device);
        const command = cluster.getCommand(commandKey);
        const waiter = entity_1.default.adapter.waitFor(this.deviceNetworkAddress, this.ID, Zcl.FrameType.SPECIFIC, Zcl.Direction.CLIENT_TO_SERVER, transactionSequenceNumber, cluster.ID, command.ID, timeout);
        const promise = new Promise((resolve, reject) => {
            waiter.promise.then((payload) => {
                const frame = Zcl.ZclFrame.fromBuffer(payload.clusterID, payload.header, payload.data, device.customClusters);
                resolve({ header: frame.header, payload: frame.payload });
            }, (error) => reject(error));
        });
        return { promise, cancel: waiter.cancel };
    }
    getOptionsWithDefaults(options, disableDefaultResponse, direction, manufacturerCode) {
        const providedOptions = options || {};
        return {
            timeout: 10000,
            disableResponse: false,
            disableRecovery: false,
            disableDefaultResponse,
            direction,
            srcEndpoint: null,
            reservedBits: 0,
            manufacturerCode: manufacturerCode ? manufacturerCode : null,
            transactionSequenceNumber: null,
            writeUndiv: false,
            ...providedOptions
        };
    }
    ensureManufacturerCodeIsUniqueAndGet(cluster, attributes, fallbackManufacturerCode, caller) {
        const manufacturerCodes = new Set(attributes.map((nameOrID) => {
            let attributeID;
            if (typeof nameOrID == 'object') {
                // ConfigureReportingItem
                if (typeof nameOrID.attribute !== 'object') {
                    attributeID = nameOrID.attribute;
                }
                else {
                    return fallbackManufacturerCode;
                }
            }
            else {
                // string || number
                attributeID = nameOrID;
            }
            // we fall back to caller|cluster provided manufacturerCode
            if (cluster.hasAttribute(attributeID)) {
                const attribute = cluster.getAttribute(attributeID);
                return (attribute.manufacturerCode === undefined) ?
                    fallbackManufacturerCode :
                    attribute.manufacturerCode;
            }
            else {
                // unknown attribute, we should not fail on this here
                return fallbackManufacturerCode;
            }
        }));
        if (manufacturerCodes.size == 1) {
            return manufacturerCodes.values().next().value;
        }
        else {
            throw new Error(`Cannot have attributes with different manufacturerCode in single '${caller}' call`);
        }
    }
    async addToGroup(group) {
        await this.command('genGroups', 'add', { groupid: group.groupID, groupname: '' });
        group.addMember(this);
    }
    getCluster(clusterKey, device = undefined) {
        device = device ?? this.getDevice();
        return Zcl.Utils.getCluster(clusterKey, device.manufacturerID, device.customClusters);
    }
    /**
     * Remove endpoint from a group, accepts both a Group and number as parameter.
     * The number parameter type should only be used when removing from a group which is not known
     * to zigbee-herdsman.
     */
    async removeFromGroup(group) {
        await this.command('genGroups', 'remove', { groupid: group instanceof group_1.default ? group.groupID : group });
        if (group instanceof group_1.default) {
            group.removeMember(this);
        }
    }
    async removeFromAllGroups() {
        await this.command('genGroups', 'removeAll', {}, { disableDefaultResponse: true });
        this.removeFromAllGroupsDatabase();
    }
    removeFromAllGroupsDatabase() {
        for (const group of group_1.default.all()) {
            if (group.hasMember(this)) {
                group.removeMember(this);
            }
        }
    }
    async zclCommand(clusterKey, commandKey, payload, options, logPayload, checkStatus = false, frameType = Zcl.FrameType.GLOBAL) {
        const device = this.getDevice();
        const cluster = this.getCluster(clusterKey, device);
        const command = (frameType == Zcl.FrameType.GLOBAL) ? Zcl.Utils.getGlobalCommand(commandKey) : cluster.getCommand(commandKey);
        const hasResponse = (frameType == Zcl.FrameType.GLOBAL) ? true : command.hasOwnProperty('response');
        options = this.getOptionsWithDefaults(options, hasResponse, Zcl.Direction.CLIENT_TO_SERVER, cluster.manufacturerCode);
        const frame = Zcl.ZclFrame.create(frameType, options.direction, options.disableDefaultResponse, options.manufacturerCode, options.transactionSequenceNumber ?? zclTransactionSequenceNumber_1.default.next(), command.name, cluster.name, payload, device.customClusters, options.reservedBits);
        const log = `ZCL command ${this.deviceIeeeAddress}/${this.ID} ` +
            `${cluster.name}.${command.name}(${JSON.stringify((logPayload) ? logPayload : payload)}, ${JSON.stringify(options)})`;
        logger_1.logger.debug(log, NS);
        try {
            const result = await this.sendRequest(frame, options);
            if (result) {
                const resultFrame = Zcl.ZclFrame.fromBuffer(result.clusterID, result.header, result.data, device.customClusters);
                if (result && checkStatus && !options.disableResponse) {
                    this.checkStatus(resultFrame.payload);
                }
                return resultFrame;
            }
        }
        catch (error) {
            error.message = `${log} failed (${error.message})`;
            logger_1.logger.debug(error, NS);
            throw error;
        }
    }
}
exports.default = Endpoint;
//# sourceMappingURL=endpoint.js.map