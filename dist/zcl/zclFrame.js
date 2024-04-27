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
const definition_1 = require("./definition");
const zclHeader_1 = __importDefault(require("./zclHeader"));
const Utils = __importStar(require("./utils"));
const buffaloZcl_1 = __importDefault(require("./buffaloZcl"));
const definition_2 = require("./definition");
const ListTypes = [
    definition_1.BuffaloZclDataType.LIST_UINT8,
    definition_1.BuffaloZclDataType.LIST_UINT16,
    definition_1.BuffaloZclDataType.LIST_UINT24,
    definition_1.BuffaloZclDataType.LIST_UINT32,
    definition_1.BuffaloZclDataType.LIST_ZONEINFO,
];
class ZclFrame {
    header;
    payload;
    cluster;
    command;
    constructor(header, payload, cluster, command) {
        this.header = header;
        this.payload = payload;
        this.cluster = cluster;
        this.command = command;
    }
    toString() {
        return JSON.stringify({ header: this.header, payload: this.payload, command: this.command });
    }
    /**
     * Creating
     */
    static create(frameType, direction, disableDefaultResponse, manufacturerCode, transactionSequenceNumber, commandKey, clusterKey, payload, customClusters, reservedBits = 0) {
        const cluster = Utils.getCluster(clusterKey, manufacturerCode, customClusters);
        let command = null;
        if (frameType === definition_2.FrameType.GLOBAL) {
            command = Utils.getGlobalCommand(commandKey);
        }
        else {
            command = direction === definition_1.Direction.CLIENT_TO_SERVER ?
                cluster.getCommand(commandKey) : cluster.getCommandResponse(commandKey);
        }
        const header = new zclHeader_1.default({ reservedBits, frameType, direction, disableDefaultResponse, manufacturerSpecific: manufacturerCode != null }, manufacturerCode, transactionSequenceNumber, command.ID);
        return new ZclFrame(header, payload, cluster, command);
    }
    toBuffer() {
        const buffalo = new buffaloZcl_1.default(Buffer.alloc(250));
        this.header.write(buffalo);
        if (this.header.isGlobal) {
            this.writePayloadGlobal(buffalo);
        }
        else if (this.header.isSpecific) {
            this.writePayloadCluster(buffalo);
        }
        else {
            throw new Error(`Frametype '${this.header.frameControl.frameType}' not valid`);
        }
        return buffalo.getWritten();
    }
    writePayloadGlobal(buffalo) {
        const command = Object.values(definition_1.Foundation).find((c) => c.ID === this.command.ID);
        if (command.parseStrategy === 'repetitive') {
            for (const entry of this.payload) {
                for (const parameter of command.parameters) {
                    const options = {};
                    if (!ZclFrame.conditionsValid(parameter, entry, null)) {
                        continue;
                    }
                    if (parameter.type === definition_1.BuffaloZclDataType.USE_DATA_TYPE && typeof entry.dataType === 'number') {
                        // We need to grab the dataType to parse useDataType
                        options.dataType = definition_1.DataType[entry.dataType];
                    }
                    const typeStr = ZclFrame.getDataTypeString(parameter.type);
                    buffalo.write(typeStr, entry[parameter.name], options);
                }
            }
        }
        else if (command.parseStrategy === 'flat') {
            for (const parameter of command.parameters) {
                buffalo.write(definition_1.DataType[parameter.type], this.payload[parameter.name], {});
            }
        }
        else {
            /* istanbul ignore else */
            if (command.parseStrategy === 'oneof') {
                /* istanbul ignore else */
                if ([definition_1.Foundation.discoverRsp, definition_1.Foundation.discoverCommandsRsp,
                    definition_1.Foundation.discoverCommandsGenRsp, definition_1.Foundation.discoverExtRsp].includes(command)) {
                    buffalo.writeUInt8(this.payload.discComplete);
                    for (const entry of this.payload.attrInfos) {
                        for (const parameter of command.parameters) {
                            buffalo.write(definition_1.DataType[parameter.type], entry[parameter.name], {});
                        }
                    }
                }
            }
        }
    }
    writePayloadCluster(buffalo) {
        for (const parameter of this.command.parameters) {
            if (!ZclFrame.conditionsValid(parameter, this.payload, null)) {
                continue;
            }
            if (!this.payload.hasOwnProperty(parameter.name)) {
                throw new Error(`Parameter '${parameter.name}' is missing`);
            }
            const typeStr = ZclFrame.getDataTypeString(parameter.type);
            buffalo.write(typeStr, this.payload[parameter.name], {});
        }
    }
    /**
     * Parsing
     */
    static fromBuffer(clusterID, header, buffer, customClusters) {
        if (!header) {
            throw new Error("Invalid ZclHeader.");
        }
        const buffalo = new buffaloZcl_1.default(buffer, header.length);
        const cluster = Utils.getCluster(clusterID, header.manufacturerCode, customClusters);
        let command = null;
        if (header.isGlobal) {
            command = Utils.getGlobalCommand(header.commandIdentifier);
        }
        else {
            command = header.frameControl.direction === definition_1.Direction.CLIENT_TO_SERVER ?
                cluster.getCommand(header.commandIdentifier) : cluster.getCommandResponse(header.commandIdentifier);
        }
        const payload = this.parsePayload(header, cluster, buffalo);
        return new ZclFrame(header, payload, cluster, command);
    }
    static parsePayload(header, cluster, buffalo) {
        if (header.isGlobal) {
            return this.parsePayloadGlobal(header, buffalo);
        }
        else if (header.isSpecific) {
            return this.parsePayloadCluster(header, cluster, buffalo);
        }
        else {
            throw new Error(`Unsupported frameType '${header.frameControl.frameType}'`);
        }
    }
    static parsePayloadCluster(header, cluster, buffalo) {
        const command = header.frameControl.direction === definition_1.Direction.CLIENT_TO_SERVER ?
            cluster.getCommand(header.commandIdentifier) : cluster.getCommandResponse(header.commandIdentifier);
        const payload = {};
        for (const parameter of command.parameters) {
            const options = { payload };
            if (!this.conditionsValid(parameter, payload, buffalo.getBuffer().length - buffalo.getPosition())) {
                continue;
            }
            if (ListTypes.includes(parameter.type)) {
                const lengthParameter = command.parameters[command.parameters.indexOf(parameter) - 1];
                const length = payload[lengthParameter.name];
                /* istanbul ignore else */
                if (typeof length === 'number') {
                    options.length = length;
                }
            }
            const typeStr = ZclFrame.getDataTypeString(parameter.type);
            payload[parameter.name] = buffalo.read(typeStr, options);
        }
        return payload;
    }
    static parsePayloadGlobal(header, buffalo) {
        const command = Object.values(definition_1.Foundation).find((c) => c.ID === header.commandIdentifier);
        if (command.parseStrategy === 'repetitive') {
            const payload = [];
            while (buffalo.isMore()) {
                const entry = {};
                for (const parameter of command.parameters) {
                    const options = {};
                    if (!this.conditionsValid(parameter, entry, buffalo.getBuffer().length - buffalo.getPosition())) {
                        continue;
                    }
                    if (parameter.type === definition_1.BuffaloZclDataType.USE_DATA_TYPE && typeof entry.dataType === 'number') {
                        // We need to grab the dataType to parse useDataType
                        options.dataType = definition_1.DataType[entry.dataType];
                        if (entry.dataType === definition_1.DataType.charStr && entry.hasOwnProperty('attrId')) {
                            // For Xiaomi struct parsing we need to pass the attributeID.
                            options.attrId = entry.attrId;
                        }
                    }
                    const typeStr = definition_1.DataType[parameter.type] != null ?
                        definition_1.DataType[parameter.type] : definition_1.BuffaloZclDataType[parameter.type];
                    entry[parameter.name] = buffalo.read(typeStr, options);
                    // TODO: not needed, but temp workaroudn to make payload equal to that of zcl-packet
                    if (parameter.type === definition_1.BuffaloZclDataType.USE_DATA_TYPE && entry.dataType === definition_1.DataType.struct) {
                        entry['structElms'] = entry.attrData;
                        entry['numElms'] = entry.attrData.length;
                    }
                }
                payload.push(entry);
            }
            return payload;
        }
        else if (command.parseStrategy === 'flat') {
            const payload = {};
            for (const parameter of command.parameters) {
                payload[parameter.name] = buffalo.read(definition_1.DataType[parameter.type], {});
            }
            return payload;
        }
        else {
            /* istanbul ignore else */
            if (command.parseStrategy === 'oneof') {
                /* istanbul ignore else */
                if ([definition_1.Foundation.discoverRsp, definition_1.Foundation.discoverCommandsRsp,
                    definition_1.Foundation.discoverCommandsGenRsp, definition_1.Foundation.discoverExtRsp].includes(command)) {
                    const payload = {};
                    payload.discComplete = buffalo.readUInt8();
                    payload.attrInfos = [];
                    while (buffalo.isMore()) {
                        const entry = {};
                        for (const parameter of command.parameters) {
                            entry[parameter.name] = buffalo.read(definition_1.DataType[parameter.type], {});
                        }
                        payload.attrInfos.push(entry);
                    }
                    return payload;
                }
            }
        }
    }
    /**
     * Utils
     */
    static getDataTypeString(dataType) {
        return definition_1.DataType[dataType] != null ? definition_1.DataType[dataType] : definition_1.BuffaloZclDataType[dataType];
    }
    static conditionsValid(parameter, entry, remainingBufferBytes) {
        if (parameter.conditions) {
            const failedCondition = parameter.conditions.find((condition) => {
                if (condition.type === 'statusEquals') {
                    return entry.status !== condition.value;
                }
                else if (condition.type == 'statusNotEquals') {
                    return entry.status === condition.value;
                }
                else if (condition.type == 'directionEquals') {
                    return entry.direction !== condition.value;
                }
                else if (condition.type == 'bitMaskSet') {
                    return (entry[condition.param] & condition.mask) !== condition.mask;
                }
                else if (condition.type == 'bitFieldEnum') {
                    return ((entry[condition.param] >> condition.offset) & ((1 << condition.size) - 1)) !== condition.value;
                }
                else if (remainingBufferBytes != null && condition.type == 'minimumRemainingBufferBytes') {
                    return remainingBufferBytes < condition.value;
                }
                else {
                    /* istanbul ignore else */
                    if (condition.type == 'dataTypeValueTypeEquals') {
                        return Utils.IsDataTypeAnalogOrDiscrete(entry.dataType) !== condition.value;
                    }
                }
            });
            if (failedCondition) {
                return false;
            }
        }
        return true;
    }
    // List of clusters is not completed, feel free to add more.
    isCluster(clusterName) {
        return this.cluster.name === clusterName;
    }
    // List of commands is not completed, feel free to add more.
    isCommand(commandName) {
        return this.command.name === commandName;
    }
}
exports.default = ZclFrame;
//# sourceMappingURL=zclFrame.js.map