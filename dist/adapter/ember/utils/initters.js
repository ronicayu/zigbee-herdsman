"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aesMmoHashInit = exports.initSecurityManagerContext = exports.initNetworkCache = void 0;
const consts_1 = require("../consts");
const enums_1 = require("../enums");
const consts_2 = require("../ezsp/consts");
/**
 * Initialize a network cache index with proper "invalid" values.
 * @returns
 */
const initNetworkCache = () => {
    return {
        eui64: consts_1.BLANK_EUI64,
        parameters: {
            extendedPanId: consts_1.BLANK_EXTENDED_PAN_ID.slice(), // copy
            panId: consts_1.INVALID_PAN_ID,
            radioTxPower: 0,
            radioChannel: consts_1.INVALID_RADIO_CHANNEL,
            joinMethod: enums_1.EmberJoinMethod.MAC_ASSOCIATION,
            nwkManagerId: consts_1.NULL_NODE_ID,
            nwkUpdateId: 0,
            channels: consts_1.EMBER_ALL_802_15_4_CHANNELS_MASK,
        },
        status: consts_1.UNKNOWN_NETWORK_STATE,
    };
};
exports.initNetworkCache = initNetworkCache;
/**
 * This routine will initialize a Security Manager context correctly for use in subsequent function calls.
 * @returns
 */
const initSecurityManagerContext = () => {
    return {
        coreKeyType: enums_1.SecManKeyType.NONE,
        keyIndex: 0,
        derivedType: enums_1.SecManDerivedKeyType.NONE,
        eui64: `0x0000000000000000`,
        multiNetworkIndex: 0,
        flags: enums_1.SecManFlag.NONE,
        psaKeyAlgPermission: consts_1.ZB_PSA_ALG, // unused for classic key storage
    };
};
exports.initSecurityManagerContext = initSecurityManagerContext;
/**
 *  This routine clears the passed context so that a new hash calculation
 *  can be performed.
 *
 *  @returns context A pointer to the location of hash context to clear.
 */
const aesMmoHashInit = () => {
    // MEMSET(context, 0, sizeof(EmberAesMmoHashContext));
    return {
        result: Buffer.alloc(consts_2.EMBER_AES_HASH_BLOCK_SIZE), // uint8_t[EMBER_AES_HASH_BLOCK_SIZE]
        length: 0x00000000, // uint32_t
    };
};
exports.aesMmoHashInit = aesMmoHashInit;
//# sourceMappingURL=initters.js.map