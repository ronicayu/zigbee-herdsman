"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attributeList = exports.attributeKeyValue = void 0;
const zcl_1 = require("../../zcl");
const manufacturerCode_1 = __importDefault(require("../../zcl/definition/manufacturerCode"));
// Legrand devices (e.g. 4129) fail to set the manufacturerSpecific flag and
// manufacturerCode in the frame header, despite using specific attributes.
// This leads to incorrect reported attribute names.
// Remap the attributes using the target device's manufacturer ID
// if the header is lacking the information.
function getCluster(frame, deviceManufacturerID, customClusters) {
    let cluster = frame.cluster;
    if (!frame?.header?.manufacturerCode && frame?.cluster && deviceManufacturerID == manufacturerCode_1.default.LEGRAND_GROUP) {
        cluster = zcl_1.Utils.getCluster(frame.cluster.ID, deviceManufacturerID, customClusters);
    }
    return cluster;
}
function attributeKeyValue(frame, deviceManufacturerID, customClusters) {
    const payload = {};
    const cluster = getCluster(frame, deviceManufacturerID, customClusters);
    for (const item of frame.payload) {
        try {
            const attribute = cluster.getAttribute(item.attrId);
            payload[attribute.name] = item.attrData;
        }
        catch (error) {
            payload[item.attrId] = item.attrData;
        }
    }
    return payload;
}
exports.attributeKeyValue = attributeKeyValue;
function attributeList(frame, deviceManufacturerID, customClusters) {
    const payload = [];
    const cluster = getCluster(frame, deviceManufacturerID, customClusters);
    for (const item of frame.payload) {
        try {
            const attribute = cluster.getAttribute(item.attrId);
            payload.push(attribute.name);
        }
        catch (error) {
            payload.push(item.attrId);
        }
    }
    return payload;
}
exports.attributeList = attributeList;
//# sourceMappingURL=zclFrameConverter.js.map