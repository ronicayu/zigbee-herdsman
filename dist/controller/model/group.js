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
const zclTransactionSequenceNumber_1 = __importDefault(require("../helpers/zclTransactionSequenceNumber"));
const Zcl = __importStar(require("../../zcl"));
const device_1 = __importDefault(require("./device"));
const assert_1 = __importDefault(require("assert"));
const logger_1 = require("../../utils/logger");
const NS = 'zh:controller:group';
class Group extends entity_1.default {
    databaseID;
    groupID;
    _members;
    get members() { return Array.from(this._members).filter((e) => e.getDevice()); }
    // Can be used by applications to store data.
    meta;
    // This lookup contains all groups that are queried from the database, this is to ensure that always
    // the same instance is returned.
    static groups = null;
    constructor(databaseID, groupID, members, meta) {
        super();
        this.databaseID = databaseID;
        this.groupID = groupID;
        this._members = members;
        this.meta = meta;
    }
    /*
     * CRUD
     */
    static fromDatabaseEntry(entry) {
        const members = new Set();
        for (const member of entry.members) {
            const device = device_1.default.byIeeeAddr(member.deviceIeeeAddr);
            if (device) {
                const endpoint = device.getEndpoint(member.endpointID);
                members.add(endpoint);
            }
        }
        return new Group(entry.id, entry.groupID, members, entry.meta);
    }
    toDatabaseRecord() {
        const members = Array.from(this.members).map((member) => {
            return { deviceIeeeAddr: member.getDevice().ieeeAddr, endpointID: member.ID };
        });
        return { id: this.databaseID, type: 'Group', groupID: this.groupID, members, meta: this.meta };
    }
    static loadFromDatabaseIfNecessary() {
        if (!Group.groups) {
            Group.groups = {};
            const entries = entity_1.default.database.getEntries(['Group']);
            for (const entry of entries) {
                const group = Group.fromDatabaseEntry(entry);
                Group.groups[group.groupID] = group;
            }
        }
    }
    static byGroupID(groupID) {
        Group.loadFromDatabaseIfNecessary();
        return Group.groups[groupID];
    }
    static all() {
        Group.loadFromDatabaseIfNecessary();
        return Object.values(Group.groups);
    }
    static create(groupID) {
        (0, assert_1.default)(typeof groupID === 'number', 'GroupID must be a number');
        // Don't allow groupID 0, from the spec:
        // "Scene identifier 0x00, along with group identifier 0x0000, is reserved for the global scene used by the OnOff cluster"
        (0, assert_1.default)(groupID >= 1, 'GroupID must be at least 1');
        Group.loadFromDatabaseIfNecessary();
        if (Group.groups[groupID]) {
            throw new Error(`Group with groupID '${groupID}' already exists`);
        }
        const databaseID = entity_1.default.database.newID();
        const group = new Group(databaseID, groupID, new Set(), {});
        entity_1.default.database.insert(group.toDatabaseRecord());
        Group.groups[group.groupID] = group;
        return group;
    }
    async removeFromNetwork() {
        for (const endpoint of this._members) {
            await endpoint.removeFromGroup(this);
        }
        this.removeFromDatabase();
    }
    removeFromDatabase() {
        Group.loadFromDatabaseIfNecessary();
        if (entity_1.default.database.has(this.databaseID)) {
            entity_1.default.database.remove(this.databaseID);
        }
        delete Group.groups[this.groupID];
    }
    save(writeDatabase = true) {
        entity_1.default.database.update(this.toDatabaseRecord(), writeDatabase);
    }
    addMember(endpoint) {
        this._members.add(endpoint);
        this.save();
    }
    removeMember(endpoint) {
        this._members.delete(endpoint);
        this.save();
    }
    hasMember(endpoint) {
        return this._members.has(endpoint);
    }
    /*
     * Zigbee functions
     */
    async write(clusterKey, attributes, options) {
        options = this.getOptionsWithDefaults(options, Zcl.Direction.CLIENT_TO_SERVER);
        const cluster = Zcl.Utils.getCluster(clusterKey, null, {});
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
        const log = `Write ${this.groupID} ${cluster.name}(${JSON.stringify(attributes)}, ${JSON.stringify(options)})`;
        logger_1.logger.debug(log, NS);
        try {
            const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, options.direction, true, options.manufacturerCode, options.transactionSequenceNumber ?? zclTransactionSequenceNumber_1.default.next(), 'write', cluster.ID, payload, {}, options.reservedBits);
            await entity_1.default.adapter.sendZclFrameToGroup(this.groupID, frame, options.srcEndpoint);
        }
        catch (error) {
            error.message = `${log} failed (${error.message})`;
            logger_1.logger.debug(error, NS);
            throw error;
        }
    }
    async read(clusterKey, attributes, options) {
        options = this.getOptionsWithDefaults(options, Zcl.Direction.CLIENT_TO_SERVER);
        const cluster = Zcl.Utils.getCluster(clusterKey, null, {});
        const payload = [];
        for (const attribute of attributes) {
            payload.push({ attrId: typeof attribute === 'number' ? attribute : cluster.getAttribute(attribute).ID });
        }
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, options.direction, true, options.manufacturerCode, options.transactionSequenceNumber ?? zclTransactionSequenceNumber_1.default.next(), 'read', cluster.ID, payload, {}, options.reservedBits);
        const log = `Read ${this.groupID} ${cluster.name}(${JSON.stringify(attributes)}, ${JSON.stringify(options)})`;
        logger_1.logger.debug(log, NS);
        try {
            await entity_1.default.adapter.sendZclFrameToGroup(this.groupID, frame, options.srcEndpoint);
        }
        catch (error) {
            error.message = `${log} failed (${error.message})`;
            logger_1.logger.debug(error, NS);
            throw error;
        }
    }
    async command(clusterKey, commandKey, payload, options) {
        options = this.getOptionsWithDefaults(options, Zcl.Direction.CLIENT_TO_SERVER);
        const cluster = Zcl.Utils.getCluster(clusterKey, null, {});
        const command = cluster.getCommand(commandKey);
        const log = `Command ${this.groupID} ${cluster.name}.${command.name}(${JSON.stringify(payload)})`;
        logger_1.logger.debug(log, NS);
        try {
            const frame = Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, options.direction, true, options.manufacturerCode, options.transactionSequenceNumber || zclTransactionSequenceNumber_1.default.next(), command.ID, cluster.ID, payload, {}, options.reservedBits);
            await entity_1.default.adapter.sendZclFrameToGroup(this.groupID, frame, options.srcEndpoint);
        }
        catch (error) {
            error.message = `${log} failed (${error.message})`;
            logger_1.logger.debug(error, NS);
            throw error;
        }
    }
    getOptionsWithDefaults(options, direction) {
        const providedOptions = options || {};
        return {
            direction,
            srcEndpoint: null,
            reservedBits: 0,
            manufacturerCode: null,
            transactionSequenceNumber: null,
            ...providedOptions
        };
    }
}
exports.default = Group;
//# sourceMappingURL=group.js.map