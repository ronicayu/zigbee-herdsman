"use strict";
//-------------------------------------------------------------------------------------------------
// General
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZB_PSA_ALG = exports.EMBER_INSTALL_CODE_SIZES = exports.EMBER_NUM_INSTALL_CODE_SIZES = exports.EMBER_INSTALL_CODE_CRC_SIZE = exports.EMBER_TRUST_CENTER_NODE_ID = exports.EMBER_HIGH_RAM_CONCENTRATOR = exports.EMBER_LOW_RAM_CONCENTRATOR = exports.APS_FRAGMENTATION_OVERHEAD = exports.APS_ENCRYPTION_OVERHEAD = exports.MAXIMUM_APS_PAYLOAD_LENGTH = exports.SOURCE_ROUTING_RESERVED_PAYLOAD_LENGTH = exports.NWK_SOURCE_ROUTE_OVERHEAD = exports.NETWORK_FIND_CUT_OFF_VALUE = exports.NETWORK_FIND_CHANNEL_MASK = exports.EMBER_ALL_802_15_4_CHANNELS_MASK = exports.EMBER_NUM_802_15_4_CHANNELS = exports.EMBER_SUB_GHZ_SCAN_DURATION = exports.EMBER_ACTIVE_SCAN_DURATION = exports.EMBER_MIN_SUBGHZ_CHANNEL_NUMBER = exports.EMBER_MIN_802_15_4_CHANNEL_NUMBER = exports.EMBER_MAX_802_15_4_CHANNEL_NUMBER = exports.EMBER_MIN_BROADCAST_ADDRESS = exports.EMBER_SLEEPY_BROADCAST_ADDRESS = exports.EMBER_RX_ON_WHEN_IDLE_BROADCAST_ADDRESS = exports.EMBER_BROADCAST_ADDRESS = exports.PERMIT_JOIN_MAX_TIMEOUT = exports.PERMIT_JOIN_FOREVER = exports.SOURCE_ROUTE_OVERHEAD_UNKNOWN = exports.EMBER_NULL_ADDRESS_TABLE_INDEX = exports.EMBER_DISCOVERY_ACTIVE_NODE_ID = exports.EMBER_UNKNOWN_NODE_ID = exports.EMBER_MULTICAST_NODE_ID = exports.NULL_BINDING = exports.UNKNOWN_NETWORK_STATE = exports.NULL_NODE_ID = exports.INVALID_RADIO_CHANNEL = exports.INVALID_CONFIG_VALUE = exports.INVALID_NODE_TYPE = exports.INVALID_PAN_ID = exports.INVALID_CLUSTER_ID = exports.INVALID_PROFILE_ID = exports.BLANK_EXTENDED_PAN_ID = exports.BLANK_EUI64 = exports.ZIGBEE_COORDINATOR_ADDRESS = exports.WILDCARD_PROFILE_ID = exports.TOUCHLINK_PROFILE_ID = exports.GP_PROFILE_ID = exports.SE_PROFILE_ID = exports.HA_PROFILE_ID = exports.CBA_PROFILE_ID = void 0;
exports.INTERPAN_APS_FRAME_SECURITY = exports.INTERPAN_APS_FRAME_DELIVERY_MODE_MASK = exports.INTERPAN_APS_FRAME_CONTROL_NO_DELIVERY_MODE = exports.INTERPAN_APS_FRAME_TYPE_MASK = exports.INTERPAN_APS_FRAME_TYPE = exports.MIN_STUB_APS_SIZE = exports.MAX_STUB_APS_SIZE = exports.INTERPAN_APS_MULTICAST_SIZE = exports.INTERPAN_APS_UNICAST_BROADCAST_SIZE = exports.STUB_NWK_FRAME_CONTROL = exports.STUB_NWK_SIZE = exports.MAC_ACK_REQUIRED = exports.LONG_DEST_FRAME_CONTROL = exports.SHORT_DEST_FRAME_CONTROL = exports.MAXIMUM_INTERPAN_LENGTH = exports.GP_SIZE_OF_SINK_LIST_ENTRIES_OCTET_STRING = exports.GP_SINK_LIST_ENTRIES = exports.GP_ENDPOINT = exports.ZIGBEE_PROFILE_INTEROPERABILITY_LINK_KEY = exports.SECURITY_LEVEL_Z3 = exports.STACK_PROFILE_ZIGBEE_PRO = void 0;
/** Endpoint profile ID */
exports.CBA_PROFILE_ID = 0x0105;
/** Endpoint profile ID for Zigbee 3.0. "Home Automation" */
exports.HA_PROFILE_ID = 0x0104;
/** Endpoint profile ID for Smart Energy */
exports.SE_PROFILE_ID = 0x0109;
/** Endpoint profile ID for Green Power */
exports.GP_PROFILE_ID = 0xA1E0;
/** The touchlink (ZigBee Light Link/ZLL) Profile ID. */
exports.TOUCHLINK_PROFILE_ID = 0xC05E;
/** The profile ID used to address all the public profiles. */
exports.WILDCARD_PROFILE_ID = 0xFFFF;
/** The network ID of the coordinator in a ZigBee network is 0x0000. */
exports.ZIGBEE_COORDINATOR_ADDRESS = 0x0000;
/** A blank (also used as "wildcard") EUI64 hex string prefixed with 0x */
exports.BLANK_EUI64 = "0xFFFFFFFFFFFFFFFF";
/** A blank extended PAN ID. (null/not present) */
exports.BLANK_EXTENDED_PAN_ID = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
/** An invalid profile ID. This is a reserved profileId. */
exports.INVALID_PROFILE_ID = 0xFFFF;
/** An invalid cluster ID. */
exports.INVALID_CLUSTER_ID = 0xFFFF;
/** An invalid PAN ID. */
exports.INVALID_PAN_ID = 0xFFFF;
/** Serves to initialize cache */
exports.INVALID_NODE_TYPE = 0xFF;
/** Serves to initialize cache for config IDs */
exports.INVALID_CONFIG_VALUE = 0xFFFF;
/** Serves to initialize cache */
exports.INVALID_RADIO_CHANNEL = 0xFF;
/** A distinguished network ID that will never be assigned to any node. It is used to indicate the absence of a node ID. */
exports.NULL_NODE_ID = 0xFFFF;
exports.UNKNOWN_NETWORK_STATE = 0xFF;
/** A distinguished binding index used to indicate the absence of a binding. */
exports.NULL_BINDING = 0xFF;
/**
 * A distinguished network ID that will never be assigned to any node.
 * This value is returned when getting the remote node ID from the binding table and the given binding table index refers
 * to a multicast binding entry.
 */
exports.EMBER_MULTICAST_NODE_ID = 0xFFFE;
/**
 * A distinguished network ID that will never be assigned
 * to any node.  This value is used when getting the remote node ID
 * from the address or binding tables.  It indicates that the address
 * or binding table entry is currently in use but the node ID
 * corresponding to the EUI64 in the table is currently unknown.
 */
exports.EMBER_UNKNOWN_NODE_ID = 0xFFFD;
/**
 * A distinguished network ID that will never be assigned
 * to any node.  This value is used when getting the remote node ID
 * from the address or binding tables.  It indicates that the address
 * or binding table entry is currently in use and network address
 * discovery is underway.
 */
exports.EMBER_DISCOVERY_ACTIVE_NODE_ID = 0xFFFC;
/** A distinguished address table index used to indicate the absence of an address table entry. */
exports.EMBER_NULL_ADDRESS_TABLE_INDEX = 0xFF;
/** Invalidates cached information */
exports.SOURCE_ROUTE_OVERHEAD_UNKNOWN = 0xFF;
// Permit join times.
exports.PERMIT_JOIN_FOREVER = 0xFF;
exports.PERMIT_JOIN_MAX_TIMEOUT = 0xFE;
//-------------------------------------------------------------------------------------------------
// Network
/**
 * ZigBee Broadcast Addresses
 *
 *  ZigBee specifies three different broadcast addresses that
 *  reach different collections of nodes.  Broadcasts are normally sent only
 *  to routers.  Broadcasts can also be forwarded to end devices, either
 *  all of them or only those that do not sleep.  Broadcasting to end
 *  devices is both significantly more resource-intensive and significantly
 *  less reliable than broadcasting to routers.
 */
/** Broadcast to all routers. */
exports.EMBER_BROADCAST_ADDRESS = 0xFFFC;
/** Broadcast to all non-sleepy devices. */
exports.EMBER_RX_ON_WHEN_IDLE_BROADCAST_ADDRESS = 0xFFFD;
/** Broadcast to all devices, including sleepy end devices. */
exports.EMBER_SLEEPY_BROADCAST_ADDRESS = 0xFFFF;
// From table 3.51 of 053474r14
// When sending many-to-one route requests, the following
// addresses are used
// 0xFFF9 indicates a non-memory-constrained many-to-one route request
// 0xFFF8 indicates a memory-constrained many-to-one route request
exports.EMBER_MIN_BROADCAST_ADDRESS = 0xFFF8;
/** The maximum 802.15.4 channel number is 26. */
exports.EMBER_MAX_802_15_4_CHANNEL_NUMBER = 26;
/** The minimum 2.4GHz 802.15.4 channel number is 11. */
exports.EMBER_MIN_802_15_4_CHANNEL_NUMBER = 11;
/** The minimum SubGhz channel number is 0. */
exports.EMBER_MIN_SUBGHZ_CHANNEL_NUMBER = 0;
/**
 * ZigBee protocol specifies that active scans have a duration of 3 (138 msec).
 * See documentation for emberStartScan in include/network-formation.h
 * for more info on duration values.
 */
exports.EMBER_ACTIVE_SCAN_DURATION = 3;
/** The SubGhz scan duration is 5. */
exports.EMBER_SUB_GHZ_SCAN_DURATION = 5;
/** There are sixteen 802.15.4 channels. */
exports.EMBER_NUM_802_15_4_CHANNELS = (exports.EMBER_MAX_802_15_4_CHANNEL_NUMBER - exports.EMBER_MIN_802_15_4_CHANNEL_NUMBER + 1);
/** A bitmask to scan all 2.4 GHz 802.15.4 channels. */
exports.EMBER_ALL_802_15_4_CHANNELS_MASK = 0x07FFF800;
/** The channels that the plugin will preferentially scan when forming and joining. */
exports.NETWORK_FIND_CHANNEL_MASK = 0x0318C800;
/**
 * Cut-off value (dBm) <-128..127>
 * The maximum noise allowed on a channel to consider for forming a network.
 * If the noise on all preferred channels is above this limit and "Enable scanning all channels" is ticked, the scan continues on all channels.
 * Use emberAfPluginNetworkFindGetEnergyThresholdForChannelCallback() to override this value.
 */
exports.NETWORK_FIND_CUT_OFF_VALUE = -48;
/**
 * The additional overhead required for network source routing (relay count = 1, relay index = 1).
 * This does not include the size of the relay list itself.
 */
exports.NWK_SOURCE_ROUTE_OVERHEAD = 2;
exports.SOURCE_ROUTING_RESERVED_PAYLOAD_LENGTH = 0;
/**
 * The maximum APS payload, not including any APS options.
 * This value is also available from emberMaximumApsPayloadLength() or ezspMaximumPayloadLength().
 * See http://portal.ember.com/faq/payload for more information.
 */
exports.MAXIMUM_APS_PAYLOAD_LENGTH = (82 - exports.SOURCE_ROUTING_RESERVED_PAYLOAD_LENGTH);
// export const MAXIMUM_APS_PAYLOAD_LENGTH_SECURITY_NONE = (100 - SOURCE_ROUTING_RESERVED_PAYLOAD_LENGTH);
/** The additional overhead required for APS encryption (security = 5, MIC = 4). */
exports.APS_ENCRYPTION_OVERHEAD = 9;
/** The additional overhead required for APS fragmentation. */
exports.APS_FRAGMENTATION_OVERHEAD = 2;
/**
 * A concentrator with insufficient memory to store source routes for the entire network.
 * Route records are sent to the concentrator prior to every inbound APS unicast.
 */
exports.EMBER_LOW_RAM_CONCENTRATOR = 0xFFF8;
/**
 * A concentrator with sufficient memory to store source routes for the entire network.
 * Remote nodes stop sending route records once the concentrator has successfully received one.
 */
exports.EMBER_HIGH_RAM_CONCENTRATOR = 0xFFF9;
//-------------------------------------------------------------------------------------------------
// Security
/** The short address of the trust center. This address never changes dynamically. */
exports.EMBER_TRUST_CENTER_NODE_ID = 0x0000;
/** The size of the CRC that is appended to an installation code. */
exports.EMBER_INSTALL_CODE_CRC_SIZE = 2;
/** The number of sizes of acceptable installation codes used in Certificate Based Key Establishment (CBKE). */
exports.EMBER_NUM_INSTALL_CODE_SIZES = 4;
/**
 * Various sizes of valid installation codes that are stored in the manufacturing tokens.
 * Note that each size includes 2 bytes of CRC appended to the end of the installation code.
 */
exports.EMBER_INSTALL_CODE_SIZES = [
    6 + exports.EMBER_INSTALL_CODE_CRC_SIZE,
    8 + exports.EMBER_INSTALL_CODE_CRC_SIZE,
    12 + exports.EMBER_INSTALL_CODE_CRC_SIZE,
    16 + exports.EMBER_INSTALL_CODE_CRC_SIZE
];
/**
 * Default value for context's PSA algorithm permission (CCM* with 4 byte tag).
 * Only used by NCPs with secure key storage; define is mirrored here to allow
 * host code to initialize the context itself rather than needing a new EZSP frame.
 */
exports.ZB_PSA_ALG = 0x05440100;
exports.STACK_PROFILE_ZIGBEE_PRO = 0x02;
exports.SECURITY_LEVEL_Z3 = 0x05;
/** This key is "ZigBeeAlliance09" */
exports.ZIGBEE_PROFILE_INTEROPERABILITY_LINK_KEY = [
    0x5A, 0x69, 0x67, 0x42, 0x65, 0x65, 0x41, 0x6C, 0x6C, 0x69, 0x61, 0x6E, 0x63, 0x65, 0x30, 0x39
];
//-------------------------------------------------------------------------------------------------
// Zigbee Green Power types and defines.
/** The GP endpoint, as defined in the ZigBee spec. */
exports.GP_ENDPOINT = 0xF2;
/** Number of GP sink list entries. Minimum is 2 sink list entries. */
exports.GP_SINK_LIST_ENTRIES = 2;
/** The size of the SinkList entries in sink table in format of octet string that has a format of {<1 byte length>, <n bytes for sink groups>} */
exports.GP_SIZE_OF_SINK_LIST_ENTRIES_OCTET_STRING = (1 + (exports.GP_SINK_LIST_ENTRIES * 4)); // sizeof(EmberGpSinkGroup) === uint16_t * 2
//-------------------------------------------------------------------------------------------------
//-- InterPAN
// Max PHY size = 128
//   -1 byte for PHY length
//   -2 bytes for MAC CRC
exports.MAXIMUM_INTERPAN_LENGTH = 125;
// MAC frame control
// Bits:
// | 0-2   |   3      |    4    |  5  |  6    |   7-9    | 10-11 |  12-13   | 14-15 |
// | Frame | Security |  Frame  | Ack | Intra | Reserved | Dest. | Reserved | Src   |
// | Type  | Enabled  | Pending | Req | PAN   |          | Addr. |          | Adrr. |
// |       |          |         |     |       |          | Mode  |          | Mode  |
// Frame Type
//   000       = Beacon
//   001       = Data
//   010       = Acknwoledgement
//   011       = MAC Command
//   100 - 111 = Reserved
// Addressing Mode
//   00 - PAN ID and address field are not present
//   01 - Reserved
//   10 - Address field contains a 16-bit short address
//   11 - Address field contains a 64-bit extended address
const MAC_FRAME_TYPE_DATA = 0x0001;
// const MAC_FRAME_SOURCE_MODE_SHORT      = 0x8000;
const MAC_FRAME_SOURCE_MODE_LONG = 0xC000;
const MAC_FRAME_DESTINATION_MODE_SHORT = 0x0800;
const MAC_FRAME_DESTINATION_MODE_LONG = 0x0C00;
// The two possible incoming MAC frame controls.
// Using short source address is not allowed.
exports.SHORT_DEST_FRAME_CONTROL = (MAC_FRAME_TYPE_DATA | MAC_FRAME_DESTINATION_MODE_SHORT | MAC_FRAME_SOURCE_MODE_LONG);
exports.LONG_DEST_FRAME_CONTROL = (MAC_FRAME_TYPE_DATA | MAC_FRAME_DESTINATION_MODE_LONG | MAC_FRAME_SOURCE_MODE_LONG);
exports.MAC_ACK_REQUIRED = 0x0020;
/** NWK stub frame has two control bytes. */
exports.STUB_NWK_SIZE = 2;
exports.STUB_NWK_FRAME_CONTROL = 0x000B;
/**
 * Interpan APS Unicast, same for Broadcast.
 * - Frame Control   (1-byte)
 * - Cluster ID      (2-bytes)
 * - Profile ID      (2-bytes)
 */
exports.INTERPAN_APS_UNICAST_BROADCAST_SIZE = 5;
/**
 * Interpan APS Multicast
 * - Frame Control   (1-byte)
 * - Group ID        (2-bytes)
 * - Cluster ID      (2-bytes)
 * - Profile ID      (2-bytes)
 */
exports.INTERPAN_APS_MULTICAST_SIZE = 7;
exports.MAX_STUB_APS_SIZE = (exports.INTERPAN_APS_MULTICAST_SIZE);
exports.MIN_STUB_APS_SIZE = (exports.INTERPAN_APS_UNICAST_BROADCAST_SIZE);
exports.INTERPAN_APS_FRAME_TYPE = 0x03;
exports.INTERPAN_APS_FRAME_TYPE_MASK = 0x03;
/** The only allowed APS FC value (without the delivery mode subfield) */
exports.INTERPAN_APS_FRAME_CONTROL_NO_DELIVERY_MODE = (exports.INTERPAN_APS_FRAME_TYPE);
exports.INTERPAN_APS_FRAME_DELIVERY_MODE_MASK = 0x0C;
exports.INTERPAN_APS_FRAME_SECURITY = 0x20;
//# sourceMappingURL=consts.js.map