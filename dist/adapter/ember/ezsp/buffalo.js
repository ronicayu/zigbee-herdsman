"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EzspBuffalo = void 0;
/* istanbul ignore file */
const buffalo_1 = __importDefault(require("../../../buffalo/buffalo"));
const consts_1 = require("../consts");
const enums_1 = require("../enums");
const math_1 = require("../utils/math");
const consts_2 = require("./consts");
class EzspBuffalo extends buffalo_1.default {
    getBufferLength() {
        return this.buffer.length;
    }
    /** Set the position of the internal position tracker. */
    setPosition(position) {
        this.position = position;
    }
    /**
     * Set the byte at given position without affecting the internal position tracker.
     * @param position
     * @param value
     */
    setCommandByte(position, value) {
        this.buffer.writeUInt8(value, position);
    }
    /**
     * Get the byte at given position without affecting the internal position tracker.
     * @param position
     * @returns
     */
    getCommandByte(position) {
        return this.buffer.readUInt8(position);
    }
    /**
     * Get the byte at given position without affecting the internal position tracker.
     * @param position
     * @returns
     */
    getResponseByte(position) {
        return this.buffer.readUInt8(position);
    }
    getExtFrameControl() {
        return (this.getResponseByte(consts_2.EZSP_EXTENDED_FRAME_CONTROL_HB_INDEX) << 8 | this.getResponseByte(consts_2.EZSP_EXTENDED_FRAME_CONTROL_LB_INDEX));
    }
    getExtFrameId() {
        return (this.getResponseByte(consts_2.EZSP_EXTENDED_FRAME_ID_HB_INDEX) << 8 | this.getResponseByte(consts_2.EZSP_EXTENDED_FRAME_ID_LB_INDEX));
    }
    getFrameId() {
        if ((this.getResponseByte(consts_2.EZSP_EXTENDED_FRAME_CONTROL_HB_INDEX) & consts_2.EZSP_EXTENDED_FRAME_FORMAT_VERSION_MASK)
            === consts_2.EZSP_EXTENDED_FRAME_FORMAT_VERSION) {
            return this.getExtFrameId();
        }
        else {
            return this.getResponseByte(consts_2.EZSP_FRAME_ID_INDEX);
        }
    }
    /**
     * Get the frame control, ID and params index according to format version.
     * Throws if frame control is unsupported (using reserved).
     * @returns Anything but SUCCESS should stop further processing.
     */
    getResponseMetadata() {
        let status = enums_1.EzspStatus.SUCCESS;
        let frameControl;
        let frameId;
        let parametersIndex;
        if ((this.getResponseByte(consts_2.EZSP_EXTENDED_FRAME_CONTROL_HB_INDEX) & consts_2.EZSP_EXTENDED_FRAME_FORMAT_VERSION_MASK)
            === consts_2.EZSP_EXTENDED_FRAME_FORMAT_VERSION) {
            // use extended ezsp frame format
            frameControl = this.getExtFrameControl();
            frameId = this.getExtFrameId();
            parametersIndex = consts_2.EZSP_EXTENDED_PARAMETERS_INDEX;
            if ((0, math_1.highByte)(frameControl) & consts_2.EZSP_EXTENDED_FRAME_CONTROL_RESERVED_MASK) {
                // reject if unsupported frame
                status = enums_1.EzspStatus.ERROR_UNSUPPORTED_CONTROL;
            }
        }
        else {
            // use legacy ezsp frame format
            frameControl = this.getResponseByte(consts_2.EZSP_FRAME_CONTROL_INDEX);
            frameId = this.getResponseByte(consts_2.EZSP_FRAME_ID_INDEX);
            parametersIndex = consts_2.EZSP_PARAMETERS_INDEX;
        }
        return [status, frameControl, frameId, parametersIndex];
    }
    /**
     * Get a copy of the rest of the buffer (from current position to end).
     * WARNING: Make sure the length is appropriate, if alloc'ed longer, it will return everything until the end.
     * @returns
     */
    readRest() {
        return Buffer.from(this.buffer.subarray(this.position));
    }
    /**
     * This is mostly used for payload/encryption stuff.
     * Copies the buffer to avoid memory referencing issues since Ezsp has a single buffer allocated.
     * @param length
     * @returns
     */
    readBufferCopy(length) {
        return Buffer.from(this.readBuffer(length));
    }
    /**
     * Write a uint8_t for payload length, followed by payload buffer (copied at post-length position).
     *
     * WARNING: `payload` must have a valid length (as in, not a Buffer allocated to longer length).
     *          Should be passed with getWritten() in most cases.
     * @param payload
     */
    writePayload(payload) {
        this.writeUInt8(payload.length);
        this.position += payload.copy(this.buffer, this.position);
    }
    /**
     * Read a uint8_t for payload length, followed by payload buffer (using post-length position).
     * @returns
     */
    readPayload() {
        const messageLength = this.readUInt8();
        return this.readBufferCopy(messageLength);
    }
    writeEmberNetworkParameters(value) {
        this.writeListUInt8(value.extendedPanId);
        this.writeUInt16(value.panId);
        this.writeUInt8(value.radioTxPower);
        this.writeUInt8(value.radioChannel);
        this.writeUInt8(value.joinMethod);
        this.writeUInt16(value.nwkManagerId);
        this.writeUInt8(value.nwkUpdateId);
        this.writeUInt32(value.channels);
    }
    readEmberNetworkParameters() {
        const extendedPanId = this.readListUInt8({ length: consts_2.EXTENDED_PAN_ID_SIZE });
        const panId = this.readUInt16();
        const radioTxPower = this.readUInt8();
        const radioChannel = this.readUInt8();
        const joinMethod = this.readUInt8();
        const nwkManagerId = this.readUInt16();
        const nwkUpdateId = this.readUInt8();
        const channels = this.readUInt32();
        return {
            extendedPanId,
            panId,
            radioTxPower,
            radioChannel,
            joinMethod,
            nwkManagerId,
            nwkUpdateId,
            channels,
        };
    }
    writeEmberMultiPhyRadioParameters(value) {
        this.writeUInt8(value.radioTxPower);
        this.writeUInt8(value.radioPage);
        this.writeUInt8(value.radioChannel);
    }
    readEmberMultiPhyRadioParameters() {
        const radioTxPower = this.readUInt8();
        const radioPage = this.readUInt8();
        const radioChannel = this.readUInt8();
        return { radioTxPower, radioPage, radioChannel };
    }
    writeEmberApsFrame(value) {
        this.writeUInt16(value.profileId);
        this.writeUInt16(value.clusterId);
        this.writeUInt8(value.sourceEndpoint);
        this.writeUInt8(value.destinationEndpoint);
        this.writeUInt16(value.options);
        this.writeUInt16(value.groupId);
        this.writeUInt8(value.sequence);
        // this.writeUInt8(value.radius);// XXX: not in gecko_sdk, appended with separate param
    }
    readEmberApsFrame() {
        const profileId = this.readUInt16();
        const clusterId = this.readUInt16();
        const sourceEndpoint = this.readUInt8();
        const destinationEndpoint = this.readUInt8();
        const options = this.readUInt16();
        const groupId = this.readUInt16();
        const sequence = this.readUInt8();
        // const radius = this.readUInt8();// XXX: not in gecko_sdk, appended with separate param
        return {
            profileId,
            clusterId,
            sourceEndpoint,
            destinationEndpoint,
            options,
            groupId,
            sequence,
            // radius,
        };
    }
    writeEmberBindingTableEntry(value) {
        this.writeUInt8(value.type);
        this.writeUInt8(value.local);
        this.writeUInt16(value.clusterId);
        this.writeUInt8(value.remote);
        this.writeIeeeAddr(value.identifier);
        this.writeUInt8(value.networkIndex);
    }
    readEmberBindingTableEntry() {
        const type = this.readUInt8();
        const local = this.readUInt8();
        const clusterId = this.readUInt16();
        const remote = this.readUInt8();
        const identifier = this.readIeeeAddr();
        const networkIndex = this.readUInt8();
        return {
            type,
            local,
            clusterId,
            remote,
            identifier,
            networkIndex,
        };
    }
    writeEmberMulticastTableEntry(value) {
        this.writeUInt16(value.multicastId);
        this.writeUInt8(value.endpoint);
        this.writeUInt8(value.networkIndex);
    }
    readEmberMulticastTableEntry() {
        const multicastId = this.readUInt16();
        const endpoint = this.readUInt8();
        // XXX: not in gecko_sdk? as workaround check length for now since used at end in just one place
        const networkIndex = this.isMore() ? this.readUInt8() : 0x00;
        return { multicastId, endpoint, networkIndex };
    }
    writeEmberBeaconClassificationParams(value) {
        this.writeUInt8(value.minRssiForReceivingPkts);
        this.writeUInt16(value.beaconClassificationMask);
    }
    readEmberBeaconClassificationParams() {
        const minRssiForReceivingPkts = this.readUInt8(); // Int8...
        const beaconClassificationMask = this.readUInt16();
        return { minRssiForReceivingPkts, beaconClassificationMask };
    }
    writeEmberNeighborTableEntry(value) {
        this.writeUInt16(value.shortId);
        this.writeUInt8(value.averageLqi);
        this.writeUInt8(value.inCost);
        this.writeUInt8(value.outCost);
        this.writeUInt8(value.age);
        this.writeIeeeAddr(value.longId);
    }
    readEmberNeighborTableEntry() {
        const shortId = this.readUInt16();
        const averageLqi = this.readUInt8();
        const inCost = this.readUInt8();
        const outCost = this.readUInt8();
        const age = this.readUInt8();
        const longId = this.readIeeeAddr();
        return {
            shortId,
            averageLqi,
            inCost,
            outCost,
            age,
            longId,
        };
    }
    writeEmberRouteTableEntry(value) {
        this.writeUInt16(value.destination);
        this.writeUInt16(value.nextHop);
        this.writeUInt8(value.status);
        this.writeUInt8(value.age);
        this.writeUInt8(value.concentratorType);
        this.writeUInt8(value.routeRecordState);
    }
    readEmberRouteTableEntry() {
        const destination = this.readUInt16();
        const nextHop = this.readUInt16();
        const status = this.readUInt8();
        const age = this.readUInt8();
        const concentratorType = this.readUInt8();
        const routeRecordState = this.readUInt8();
        return {
            destination,
            nextHop,
            status,
            age,
            concentratorType,
            routeRecordState,
        };
    }
    writeEmberKeyData(value) {
        this.writeBuffer(value.contents, consts_2.EMBER_ENCRYPTION_KEY_SIZE);
    }
    readEmberKeyData() {
        const contents = this.readBufferCopy(consts_2.EMBER_ENCRYPTION_KEY_SIZE);
        return { contents };
    }
    writeSecManKey(value) {
        this.writeEmberKeyData(value);
    }
    readSecManKey() {
        return this.readEmberKeyData();
    }
    writeSecManContext(value) {
        this.writeUInt8(value.coreKeyType);
        this.writeUInt8(value.keyIndex);
        this.writeUInt16(value.derivedType);
        this.writeIeeeAddr(value.eui64);
        this.writeUInt8(value.multiNetworkIndex);
        this.writeUInt8(value.flags);
        this.writeUInt32(value.psaKeyAlgPermission);
    }
    readSecManContext() {
        const core_key_type = this.readUInt8();
        const key_index = this.readUInt8();
        const derived_type = this.readUInt16();
        const eui64 = this.readIeeeAddr();
        const multi_network_index = this.readUInt8();
        const flags = this.readUInt8();
        const psa_key_alg_permission = this.readUInt32();
        return {
            coreKeyType: core_key_type,
            keyIndex: key_index,
            derivedType: derived_type,
            eui64,
            multiNetworkIndex: multi_network_index,
            flags,
            psaKeyAlgPermission: psa_key_alg_permission,
        };
    }
    writeSecManNetworkKeyInfo(value) {
        this.writeUInt8(value.networkKeySet ? 1 : 0);
        this.writeUInt8(value.alternateNetworkKeySet ? 1 : 0);
        this.writeUInt8(value.networkKeySequenceNumber);
        this.writeUInt8(value.altNetworkKeySequenceNumber);
        this.writeUInt32(value.networkKeyFrameCounter);
    }
    readSecManNetworkKeyInfo() {
        const networkKeySet = this.readUInt8() === 1 ? true : false;
        const alternateNetworkKeySet = this.readUInt8() === 1 ? true : false;
        const networkKeySequenceNumber = this.readUInt8();
        const altNetworkKeySequenceNumber = this.readUInt8();
        const networkKeyFrameCounter = this.readUInt32();
        return {
            networkKeySet: networkKeySet,
            alternateNetworkKeySet: alternateNetworkKeySet,
            networkKeySequenceNumber: networkKeySequenceNumber,
            altNetworkKeySequenceNumber: altNetworkKeySequenceNumber,
            networkKeyFrameCounter: networkKeyFrameCounter,
        };
    }
    writeSecManAPSKeyMetadata(value) {
        this.writeUInt16(value.bitmask);
        this.writeUInt32(value.outgoingFrameCounter);
        this.writeUInt32(value.incomingFrameCounter);
        this.writeUInt16(value.ttlInSeconds);
    }
    readSecManAPSKeyMetadata() {
        const bitmask = this.readUInt16();
        const outgoing_frame_counter = this.readUInt32();
        const incoming_frame_counter = this.readUInt32();
        const ttl_in_seconds = this.readUInt16();
        return {
            bitmask,
            outgoingFrameCounter: outgoing_frame_counter,
            incomingFrameCounter: incoming_frame_counter,
            ttlInSeconds: ttl_in_seconds,
        };
    }
    writeEmberTransientKeyData(value) {
        this.writeIeeeAddr(value.eui64);
        this.writeEmberKeyData(value.keyData);
        this.writeUInt32(value.incomingFrameCounter);
        this.writeUInt16(value.bitmask);
        this.writeUInt16(value.remainingTimeSeconds);
        this.writeUInt8(value.networkIndex);
    }
    readEmberTransientKeyData() {
        const eui64 = this.readIeeeAddr();
        const keyData = this.readEmberKeyData();
        const incomingFrameCounter = this.readUInt32();
        const bitmask = this.readUInt16();
        const remainingTimeSeconds = this.readUInt16();
        const networkIndex = this.readUInt8();
        return {
            eui64,
            keyData,
            incomingFrameCounter,
            bitmask,
            remainingTimeSeconds,
            networkIndex,
        };
    }
    writeEmberInitialSecurityState(value) {
        this.writeUInt16(value.bitmask);
        this.writeEmberKeyData(value.preconfiguredKey);
        this.writeEmberKeyData(value.networkKey);
        this.writeUInt8(value.networkKeySequenceNumber);
        this.writeIeeeAddr(value.preconfiguredTrustCenterEui64);
    }
    readEmberInitialSecurityState() {
        const bitmask = this.readUInt16();
        const preconfiguredKey = this.readEmberKeyData();
        const networkKey = this.readEmberKeyData();
        const networkKeySequenceNumber = this.readUInt8();
        const preconfiguredTrustCenterEui64 = this.readIeeeAddr();
        return {
            bitmask,
            preconfiguredKey,
            networkKey,
            networkKeySequenceNumber,
            preconfiguredTrustCenterEui64,
        };
    }
    writeEmberCurrentSecurityState(value) {
        this.writeUInt16(value.bitmask);
        this.writeIeeeAddr(value.trustCenterLongAddress);
    }
    readEmberCurrentSecurityState() {
        const bitmask = this.readUInt16();
        const trustCenterLongAddress = this.readIeeeAddr();
        return { bitmask, trustCenterLongAddress };
    }
    writeEmberChildData(value) {
        this.writeIeeeAddr(value.eui64);
        this.writeUInt8(value.type);
        this.writeUInt16(value.id);
        this.writeUInt8(value.phy);
        this.writeUInt8(value.power);
        this.writeUInt8(value.timeout);
        this.writeUInt32(value.remainingTimeout);
    }
    readEmberChildData() {
        const eui64 = this.readIeeeAddr();
        const type = this.readUInt8();
        const id = this.readUInt16();
        const phy = this.readUInt8();
        const power = this.readUInt8();
        const timeout = this.readUInt8();
        const remainingTimeout = this.readUInt32();
        return {
            eui64,
            type,
            id,
            phy,
            power,
            timeout,
            remainingTimeout,
        };
    }
    readEmberZigbeeNetwork() {
        const channel = this.readUInt8();
        const panId = this.readUInt16();
        const extendedPanId = this.readListUInt8({ length: consts_2.EXTENDED_PAN_ID_SIZE });
        const allowingJoin = this.readUInt8();
        const stackProfile = this.readUInt8();
        const nwkUpdateId = this.readUInt8();
        return {
            channel,
            panId,
            extendedPanId,
            allowingJoin,
            stackProfile,
            nwkUpdateId,
        };
    }
    writeEmberZigbeeNetwork(value) {
        this.writeUInt8(value.channel);
        this.writeUInt16(value.panId);
        this.writeListUInt8(value.extendedPanId);
        this.writeUInt8(value.allowingJoin);
        this.writeUInt8(value.stackProfile);
        this.writeUInt8(value.nwkUpdateId);
    }
    writeEmberCertificateData(value) {
        this.writeBuffer(value.contents, consts_2.EMBER_CERTIFICATE_SIZE);
    }
    readEmberCertificateData() {
        const contents = this.readBufferCopy(consts_2.EMBER_CERTIFICATE_SIZE);
        return { contents };
    }
    writeEmberPublicKeyData(value) {
        this.writeBuffer(value.contents, consts_2.EMBER_PUBLIC_KEY_SIZE);
    }
    readEmberPublicKeyData() {
        const contents = this.readBufferCopy(consts_2.EMBER_PUBLIC_KEY_SIZE);
        return { contents };
    }
    writeEmberPrivateKeyData(value) {
        this.writeBuffer(value.contents, consts_2.EMBER_PRIVATE_KEY_SIZE);
    }
    readEmberPrivateKeyData() {
        const contents = this.readBufferCopy(consts_2.EMBER_PRIVATE_KEY_SIZE);
        return { contents };
    }
    writeEmberSmacData(value) {
        this.writeBuffer(value.contents, consts_2.EMBER_SMAC_SIZE);
    }
    readEmberSmacData() {
        const contents = this.readBufferCopy(consts_2.EMBER_SMAC_SIZE);
        return { contents };
    }
    writeEmberSignatureData(value) {
        this.writeBuffer(value.contents, consts_2.EMBER_SIGNATURE_SIZE);
    }
    readEmberSignatureData() {
        const contents = this.readBufferCopy(consts_2.EMBER_SIGNATURE_SIZE);
        return { contents };
    }
    writeEmberCertificate283k1Data(value) {
        this.writeBuffer(value.contents, consts_2.EMBER_CERTIFICATE_283K1_SIZE);
    }
    readEmberCertificate283k1Data() {
        const contents = this.readBufferCopy(consts_2.EMBER_CERTIFICATE_283K1_SIZE);
        return { contents };
    }
    writeEmberPublicKey283k1Data(value) {
        this.writeBuffer(value.contents, consts_2.EMBER_PUBLIC_KEY_283K1_SIZE);
    }
    readEmberPublicKey283k1Data() {
        const contents = this.readBufferCopy(consts_2.EMBER_PUBLIC_KEY_283K1_SIZE);
        return { contents };
    }
    writeEmberPrivateKey283k1Data(value) {
        this.writeBuffer(value.contents, consts_2.EMBER_PRIVATE_KEY_283K1_SIZE);
    }
    readEmberPrivateKey283k1Data() {
        const contents = this.readBufferCopy(consts_2.EMBER_PRIVATE_KEY_283K1_SIZE);
        return { contents };
    }
    writeEmberSignature283k1Data(value) {
        this.writeBuffer(value.contents, consts_2.EMBER_SIGNATURE_283K1_SIZE);
    }
    readEmberSignature283k1Data() {
        const contents = this.readBufferCopy(consts_2.EMBER_SIGNATURE_283K1_SIZE);
        return { contents };
    }
    writeEmberAesMmoHashContext(context) {
        this.writeBuffer(context.result, consts_2.EMBER_AES_HASH_BLOCK_SIZE);
        this.writeUInt32(context.length);
    }
    readEmberAesMmoHashContext() {
        const result = this.readBufferCopy(consts_2.EMBER_AES_HASH_BLOCK_SIZE);
        const length = this.readUInt32();
        return { result, length };
    }
    writeEmberMessageDigest(value) {
        this.writeBuffer(value.contents, consts_2.EMBER_AES_HASH_BLOCK_SIZE);
    }
    readEmberMessageDigest() {
        const contents = this.readBufferCopy(consts_2.EMBER_AES_HASH_BLOCK_SIZE);
        return { contents };
    }
    writeEmberNetworkInitStruct(networkInitStruct) {
        this.writeUInt16(networkInitStruct.bitmask);
    }
    readEmberNetworkInitStruct() {
        const bitmask = this.readUInt16();
        return { bitmask };
    }
    writeEmberZllNetwork(network) {
        this.writeEmberZigbeeNetwork(network.zigbeeNetwork);
        this.writeEmberZllSecurityAlgorithmData(network.securityAlgorithm);
        this.writeIeeeAddr(network.eui64);
        this.writeUInt16(network.nodeId);
        this.writeUInt16(network.state);
        this.writeUInt8(network.nodeType);
        this.writeUInt8(network.numberSubDevices);
        this.writeUInt8(network.totalGroupIdentifiers);
        this.writeUInt8(network.rssiCorrection);
    }
    readEmberZllNetwork() {
        const zigbeeNetwork = this.readEmberZigbeeNetwork();
        const securityAlgorithm = this.readEmberZllSecurityAlgorithmData();
        const eui64 = this.readIeeeAddr();
        const nodeId = this.readUInt16();
        const state = this.readUInt16();
        const nodeType = this.readUInt8();
        const numberSubDevices = this.readUInt8();
        const totalGroupIdentifiers = this.readUInt8();
        const rssiCorrection = this.readUInt8();
        return {
            zigbeeNetwork,
            securityAlgorithm,
            eui64,
            nodeId,
            state,
            nodeType,
            numberSubDevices,
            totalGroupIdentifiers,
            rssiCorrection,
        };
    }
    writeEmberZllSecurityAlgorithmData(data) {
        this.writeUInt32(data.transactionId);
        this.writeUInt32(data.responseId);
        this.writeUInt16(data.bitmask);
    }
    readEmberZllSecurityAlgorithmData() {
        const transactionId = this.readUInt32();
        const responseId = this.readUInt32();
        const bitmask = this.readUInt16();
        return { transactionId, responseId, bitmask };
    }
    writeEmberZllInitialSecurityState(state) {
        this.writeUInt32(state.bitmask);
        this.writeUInt8(state.keyIndex);
        this.writeEmberKeyData(state.encryptionKey);
        this.writeEmberKeyData(state.preconfiguredKey);
    }
    writeEmberTokTypeStackZllData(data) {
        this.writeUInt32(data.bitmask);
        this.writeUInt16(data.freeNodeIdMin);
        this.writeUInt16(data.freeNodeIdMax);
        this.writeUInt16(data.myGroupIdMin);
        this.writeUInt16(data.freeGroupIdMin);
        this.writeUInt16(data.freeGroupIdMax);
        this.writeUInt8(data.rssiCorrection);
    }
    readEmberTokTypeStackZllData() {
        const bitmask = this.readUInt32();
        const freeNodeIdMin = this.readUInt16();
        const freeNodeIdMax = this.readUInt16();
        const myGroupIdMin = this.readUInt16();
        const freeGroupIdMin = this.readUInt16();
        const freeGroupIdMax = this.readUInt16();
        const rssiCorrection = this.readUInt8();
        return {
            bitmask,
            freeNodeIdMin,
            freeNodeIdMax,
            myGroupIdMin,
            freeGroupIdMin,
            freeGroupIdMax,
            rssiCorrection,
        };
    }
    writeEmberTokTypeStackZllSecurity(security) {
        this.writeUInt32(security.bitmask);
        this.writeUInt8(security.keyIndex);
        this.writeBuffer(security.encryptionKey, consts_2.EMBER_ENCRYPTION_KEY_SIZE);
        this.writeBuffer(security.preconfiguredKey, consts_2.EMBER_ENCRYPTION_KEY_SIZE);
    }
    readEmberTokTypeStackZllSecurity() {
        const bitmask = this.readUInt32();
        const keyIndex = this.readUInt8();
        const encryptionKey = this.readBufferCopy(consts_2.EMBER_ENCRYPTION_KEY_SIZE);
        const preconfiguredKey = this.readBufferCopy(consts_2.EMBER_ENCRYPTION_KEY_SIZE);
        return {
            bitmask,
            keyIndex,
            encryptionKey,
            preconfiguredKey,
        };
    }
    writeEmberGpAddress(value) {
        this.writeUInt8(value.applicationId);
        if (value.applicationId === enums_1.EmberGpApplicationId.SOURCE_ID) {
            this.writeUInt32(value.sourceId);
            this.writeUInt32(value.sourceId); // filler
        }
        else if (value.applicationId === enums_1.EmberGpApplicationId.IEEE_ADDRESS) {
            this.writeIeeeAddr(value.gpdIeeeAddress);
        }
        this.writeUInt8(value.endpoint);
    }
    readEmberGpAddress() {
        const applicationId = this.readUInt8();
        if (applicationId === enums_1.EmberGpApplicationId.SOURCE_ID) {
            const sourceId = this.readUInt32();
            this.readUInt32(); // filler
            const endpoint = this.readUInt8();
            return { applicationId, sourceId, endpoint };
        }
        else if (applicationId === enums_1.EmberGpApplicationId.IEEE_ADDRESS) {
            const gpdIeeeAddress = this.readIeeeAddr();
            const endpoint = this.readUInt8();
            return { applicationId, gpdIeeeAddress, endpoint };
        }
        return null;
    }
    readEmberGpSinkList() {
        const list = [];
        for (let i = 0; i < consts_1.GP_SINK_LIST_ENTRIES; i++) {
            const type = this.readUInt8();
            switch (type) {
                case enums_1.EmberGpSinkType.FULL_UNICAST:
                case enums_1.EmberGpSinkType.LW_UNICAST:
                case enums_1.EmberGpSinkType.UNUSED:
                default:
                    const sinkNodeId = this.readUInt16();
                    const sinkEUI = this.readIeeeAddr();
                    list.push({
                        type,
                        unicast: {
                            sinkNodeId,
                            sinkEUI,
                        }
                    });
                    break;
                case enums_1.EmberGpSinkType.D_GROUPCAST:
                case enums_1.EmberGpSinkType.GROUPCAST:
                    const alias = this.readUInt16();
                    const groupID = this.readUInt16();
                    // fillers
                    this.readUInt16();
                    this.readUInt16();
                    this.readUInt16();
                    list.push({
                        type,
                        groupcast: {
                            alias,
                            groupID,
                        }
                    });
                    break;
            }
        }
        return list;
    }
    writeEmberGpSinkList(value) {
        for (let i = 0; i < consts_1.GP_SINK_LIST_ENTRIES; i++) {
            this.writeUInt8(value[i].type);
            switch (value[i].type) {
                case enums_1.EmberGpSinkType.FULL_UNICAST:
                case enums_1.EmberGpSinkType.LW_UNICAST:
                case enums_1.EmberGpSinkType.UNUSED:
                default:
                    this.writeUInt16(value[i].unicast.sinkNodeId);
                    this.writeIeeeAddr(value[i].unicast.sinkEUI); // changed 8 to const var
                    break;
                case enums_1.EmberGpSinkType.D_GROUPCAST:
                case enums_1.EmberGpSinkType.GROUPCAST:
                    this.writeUInt16(value[i].groupcast.alias);
                    this.writeUInt16(value[i].groupcast.groupID);
                    //fillers
                    this.writeUInt16(value[i].groupcast.alias);
                    this.writeUInt16(value[i].groupcast.groupID);
                    this.writeUInt16(value[i].groupcast.alias);
                    break;
            }
        }
    }
    readEmberGpProxyTableEntry() {
        const status = this.readUInt8();
        const options = this.readUInt32();
        const gpd = this.readEmberGpAddress();
        const assignedAlias = this.readUInt16();
        const securityOptions = this.readUInt8();
        const gpdSecurityFrameCounter = this.readUInt32();
        const gpdKey = this.readEmberKeyData();
        const sinkList = this.readEmberGpSinkList();
        const groupcastRadius = this.readUInt8();
        const searchCounter = this.readUInt8();
        return {
            status,
            options,
            gpd,
            assignedAlias,
            securityOptions,
            gpdSecurityFrameCounter,
            gpdKey,
            sinkList,
            groupcastRadius,
            searchCounter,
        };
    }
    writeEmberGpProxyTableEntry(value) {
        this.writeUInt8(value.status);
        this.writeUInt32(value.options);
        this.writeEmberGpAddress(value.gpd);
        this.writeUInt16(value.assignedAlias);
        this.writeUInt8(value.securityOptions);
        this.writeUInt32(value.gpdSecurityFrameCounter);
        this.writeEmberKeyData(value.gpdKey);
        this.writeEmberGpSinkList(value.sinkList);
        this.writeUInt8(value.groupcastRadius);
        this.writeUInt8(value.searchCounter);
    }
    readEmberGpSinkTableEntry() {
        const status = this.readUInt8();
        const options = this.readUInt16();
        const gpd = this.readEmberGpAddress();
        const deviceId = this.readUInt8();
        const sinkList = this.readEmberGpSinkList();
        const assignedAlias = this.readUInt16();
        const groupcastRadius = this.readUInt8();
        const securityOptions = this.readUInt8();
        const gpdSecurityFrameCounter = this.readUInt32();
        const gpdKey = this.readEmberKeyData();
        return {
            status,
            options,
            gpd,
            deviceId,
            sinkList,
            assignedAlias,
            groupcastRadius,
            securityOptions,
            gpdSecurityFrameCounter,
            gpdKey,
        };
    }
    writeEmberGpSinkTableEntry(value) {
        this.writeUInt8(value.status);
        this.writeUInt16(value.options);
        this.writeEmberGpAddress(value.gpd);
        this.writeUInt8(value.deviceId);
        this.writeEmberGpSinkList(value.sinkList);
        this.writeUInt16(value.assignedAlias);
        this.writeUInt8(value.groupcastRadius);
        this.writeUInt8(value.securityOptions);
        this.writeUInt32(value.gpdSecurityFrameCounter);
        this.writeEmberKeyData(value.gpdKey);
    }
    writeEmberDutyCycleLimits(limits) {
        this.writeUInt16(limits.limitThresh);
        this.writeUInt16(limits.critThresh);
        this.writeUInt16(limits.suspLimit);
    }
    readEmberDutyCycleLimits() {
        const limitThresh = this.readUInt16();
        const critThresh = this.readUInt16();
        const suspLimit = this.readUInt16();
        return {
            limitThresh,
            critThresh,
            suspLimit,
        };
    }
    writeEmberPerDeviceDutyCycle(maxDevices, arrayOfDeviceDutyCycles) {
        this.writeUInt16(maxDevices);
        for (let i = 0; i < maxDevices; i++) {
            this.writeUInt16(arrayOfDeviceDutyCycles[i].nodeId);
            this.writeUInt16(arrayOfDeviceDutyCycles[i].dutyCycleConsumed);
        }
    }
    readEmberPerDeviceDutyCycle() {
        const maxDevices = this.readUInt8();
        const arrayOfDeviceDutyCycles = [];
        for (let i = 0; i < maxDevices; i++) {
            const nodeId = this.readUInt16();
            const dutyCycleConsumed = this.readUInt16();
            arrayOfDeviceDutyCycles.push({ nodeId, dutyCycleConsumed });
        }
        return arrayOfDeviceDutyCycles;
    }
    readEmberZllDeviceInfoRecord() {
        const ieeeAddress = this.readIeeeAddr();
        const endpointId = this.readUInt8();
        const profileId = this.readUInt16();
        const deviceId = this.readUInt16();
        const version = this.readUInt8();
        const groupIdCount = this.readUInt8();
        return {
            ieeeAddress,
            endpointId,
            profileId,
            deviceId,
            version,
            groupIdCount,
        };
    }
    readEmberZllInitialSecurityState() {
        const bitmask = this.readUInt32();
        const keyIndex = this.readUInt8();
        const encryptionKey = this.readEmberKeyData();
        const preconfiguredKey = this.readEmberKeyData();
        return {
            bitmask,
            keyIndex,
            encryptionKey,
            preconfiguredKey,
        };
    }
    readEmberZllAddressAssignment() {
        const nodeId = this.readUInt16();
        const freeNodeIdMin = this.readUInt16();
        const freeNodeIdMax = this.readUInt16();
        const groupIdMin = this.readUInt16();
        const groupIdMax = this.readUInt16();
        const freeGroupIdMin = this.readUInt16();
        const freeGroupIdMax = this.readUInt16();
        return {
            nodeId,
            freeNodeIdMin,
            freeNodeIdMax,
            groupIdMin,
            groupIdMax,
            freeGroupIdMin,
            freeGroupIdMax,
        };
    }
    writeEmberBeaconIterator(value) {
        this.writeUInt8(value.beacon.channel);
        this.writeUInt8(value.beacon.lqi);
        this.writeUInt8(value.beacon.rssi);
        this.writeUInt8(value.beacon.depth);
        this.writeUInt8(value.beacon.nwkUpdateId);
        this.writeUInt8(value.beacon.power);
        this.writeUInt8(value.beacon.parentPriority);
        this.writeUInt8(value.beacon.enhanced ? 1 : 0);
        this.writeUInt8(value.beacon.permitJoin ? 1 : 0);
        this.writeUInt8(value.beacon.hasCapacity ? 1 : 0);
        this.writeUInt16(value.beacon.panId);
        this.writeUInt16(value.beacon.sender);
        this.writeListUInt8(value.beacon.extendedPanId);
        this.writeUInt8(value.index);
    }
    readEmberBeaconIterator() {
        const channel = this.readUInt8();
        const lqi = this.readUInt8();
        const rssi = this.readUInt8();
        const depth = this.readUInt8();
        const nwkUpdateId = this.readUInt8();
        const power = this.readUInt8();
        const parentPriority = this.readUInt8();
        const enhanced = this.readUInt8() === 1 ? true : false;
        const permitJoin = this.readUInt8() === 1 ? true : false;
        const hasCapacity = this.readUInt8() === 1 ? true : false;
        const panId = this.readUInt16();
        const sender = this.readUInt16();
        const extendedPanId = this.readListUInt8({ length: consts_2.EXTENDED_PAN_ID_SIZE });
        const index = this.readUInt8();
        return {
            beacon: {
                channel,
                lqi,
                rssi,
                depth,
                nwkUpdateId,
                power,
                parentPriority,
                enhanced,
                permitJoin,
                hasCapacity,
                panId,
                sender,
                extendedPanId,
                supportedKeyNegotiationMethods: 0,
                extended_beacon: false,
                tcConnectivity: true,
                longUptime: true,
                preferParent: true,
                macDataPollKeepalive: true,
                endDeviceKeepalive: true
            },
            index,
        };
    }
    writeEmberBeaconData(value) {
        this.writeUInt8(value.channel);
        this.writeUInt8(value.lqi);
        this.writeUInt8(value.rssi);
        this.writeUInt8(value.depth);
        this.writeUInt8(value.nwkUpdateId);
        this.writeUInt8(value.power);
        this.writeUInt8(value.parentPriority);
        this.writeUInt8(value.enhanced ? 1 : 0);
        this.writeUInt8(value.permitJoin ? 1 : 0);
        this.writeUInt8(value.hasCapacity ? 1 : 0);
        this.writeUInt16(value.panId);
        this.writeUInt16(value.sender);
        this.writeListUInt8(value.extendedPanId);
    }
    readEmberBeaconData() {
        const channel = this.readUInt8();
        const lqi = this.readUInt8();
        const rssi = this.readUInt8();
        const depth = this.readUInt8();
        const nwkUpdateId = this.readUInt8();
        const power = this.readUInt8();
        const parentPriority = this.readUInt8();
        const enhanced = this.readUInt8() === 1 ? true : false;
        const permitJoin = this.readUInt8() === 1 ? true : false;
        const hasCapacity = this.readUInt8() === 1 ? true : false;
        const panId = this.readUInt16();
        const sender = this.readUInt16();
        const extendedPanId = this.readListUInt8({ length: consts_2.EXTENDED_PAN_ID_SIZE });
        return {
            channel,
            lqi,
            rssi,
            depth,
            nwkUpdateId,
            power,
            parentPriority,
            enhanced,
            permitJoin,
            hasCapacity,
            panId,
            sender,
            extendedPanId,
            supportedKeyNegotiationMethods: 0,
            extended_beacon: false,
            tcConnectivity: true,
            longUptime: true,
            preferParent: true,
            macDataPollKeepalive: true,
            endDeviceKeepalive: true
        };
    }
    writeEmberTokenData(tokenData) {
        this.writeUInt32(tokenData.size);
        this.writeBuffer(tokenData.data, tokenData.size);
    }
    readEmberTokenData() {
        const size = this.readUInt32();
        const data = this.readBufferCopy(size);
        return { size, data };
    }
    readEmberTokenInfo() {
        const nvm3Key = this.readUInt32();
        const isCnt = this.readUInt8() === 1 ? true : false;
        const isIdx = this.readUInt8() === 1 ? true : false;
        const size = this.readUInt8();
        const arraySize = this.readUInt8();
        return {
            nvm3Key,
            isCnt,
            isIdx,
            size,
            arraySize,
        };
    }
    writeEmberTokenInfo(tokenInfo) {
        this.writeUInt32(tokenInfo.nvm3Key);
        this.writeUInt8(tokenInfo.isCnt ? 1 : 0);
        this.writeUInt8(tokenInfo.isIdx ? 1 : 0);
        this.writeUInt8(tokenInfo.size);
        this.writeUInt8(tokenInfo.arraySize);
    }
}
exports.EzspBuffalo = EzspBuffalo;
//# sourceMappingURL=buffalo.js.map