"use strict";
/* istanbul ignore file */
//--------------------------------------------------------------
// Define macros for handling 3-bit frame numbers modulo 8
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMacCapFlags = exports.byteToBits = exports.lowHighBits = exports.lowHighBytes = exports.bit32 = exports.bit = exports.highLowToInt = exports.highByte = exports.lowByte = exports.highBits = exports.lowBits = exports.halCommonCrc16 = exports.withinRange = exports.inc8 = exports.mod8 = void 0;
/** mask to frame number modulus */
const mod8 = (n) => n & 7;
exports.mod8 = mod8;
/** increment in frame number modulus */
const inc8 = (n) => (0, exports.mod8)(n + 1);
exports.inc8 = inc8;
/** Return true if n is within the range lo through hi, computed (mod 8) */
const withinRange = (lo, n, hi) => (0, exports.mod8)(n - lo) <= (0, exports.mod8)(hi - lo);
exports.withinRange = withinRange;
//--------------------------------------------------------------
// CRC
/**
 * Calculates 16-bit cyclic redundancy code (CITT CRC 16).
 *
 * Applies the standard CITT CRC 16 polynomial to a
 * single byte. It should support being called first with an initial
 * value, then repeatedly until all data is processed.
 *
 * @param newByte     The new byte to be run through CRC.
 * @param prevResult  The previous CRC result.
 * @returns The new CRC result.
 */
const halCommonCrc16 = (newByte, prevResult) => {
    /*
     *    16bit CRC notes:
     *    "CRC-CCITT"
     *     poly is g(X) = X^16 + X^12 + X^5 + 1  (0x1021)
     *     used in the FPGA (green boards and 15.4)
     *     initial remainder should be 0xFFFF
     */
    prevResult = ((prevResult >> 8) & 0xFFFF) | ((prevResult << 8) & 0xFFFF);
    prevResult ^= newByte;
    prevResult ^= (prevResult & 0xFF) >> 4;
    prevResult ^= (((prevResult << 8) & 0xFFFF) << 4) & 0xFFFF;
    prevResult ^= (((prevResult & 0xFF) << 5) & 0xFF) | (((((prevResult & 0xFF) >> 3) & 0xFFFF) << 8) & 0xFFFF);
    return prevResult;
};
exports.halCommonCrc16 = halCommonCrc16;
//--------------------------------------------------------------
// Byte manipulation
/** Returns the low bits of the 8-bit value 'n' as uint8_t. */
const lowBits = (n) => (n & 0xF);
exports.lowBits = lowBits;
/** Returns the high bits of the 8-bit value 'n' as uint8_t. */
const highBits = (n) => ((0, exports.lowBits)(n >> 4) & 0xF);
exports.highBits = highBits;
/** Returns the low byte of the 16-bit value 'n' as uint8_t. */
const lowByte = (n) => (n & 0xFF);
exports.lowByte = lowByte;
/** Returns the high byte of the 16-bit value 'n' as uint8_t. */
const highByte = (n) => ((0, exports.lowByte)(n >> 8) & 0xFF);
exports.highByte = highByte;
/** Returns the value built from the two uint8_t values high and low. */
const highLowToInt = (high, low) => (((high & 0xFFFF) << 8) + ((low & 0xFFFF) & 0xFF));
exports.highLowToInt = highLowToInt;
/** Useful to reference a single bit of a byte. */
const bit = (x) => (1 << x);
exports.bit = bit;
/** Useful to reference a single bit of an uint32_t type. */
const bit32 = (x) => (1 << x);
exports.bit32 = bit32;
/** Returns both the low and high bytes (in that order) of the same 16-bit value 'n' as uint8_t. */
const lowHighBytes = (n) => [(0, exports.lowByte)(n), (0, exports.highByte)(n)];
exports.lowHighBytes = lowHighBytes;
/** Returns both the low and high bits (in that order) of the same 8-bit value 'n' as uint8_t. */
const lowHighBits = (n) => [(0, exports.lowBits)(n), (0, exports.highBits)(n)];
exports.lowHighBits = lowHighBits;
/**
 * Get byte as an 8-bit string (`n` assumed of proper range).
 * @param n
 * @returns
 */
const byteToBits = (n) => {
    return (n >>> 0).toString(2).padStart(8, '0');
};
exports.byteToBits = byteToBits;
/**
 * Get the values for the bitmap `Mac Capability Flags Field` as per spec.
 * Given value is assumed to be a proper byte.
 * @param capabilities
 * @returns
 */
const getMacCapFlags = (capabilities) => {
    return {
        alternatePANCoordinator: (capabilities & 0x01),
        deviceType: (capabilities & 0x02) >> 1,
        powerSource: (capabilities & 0x04) >> 2,
        rxOnWhenIdle: (capabilities & 0x08) >> 3,
        reserved1: (capabilities & 0x10) >> 4,
        reserved2: (capabilities & 0x20) >> 5,
        securityCapability: (capabilities & 0x40) >> 6,
        allocateAddress: (capabilities & 0x80) >> 7,
    };
};
exports.getMacCapFlags = getMacCapFlags;
//# sourceMappingURL=math.js.map