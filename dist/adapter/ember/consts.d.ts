/** Endpoint profile ID */
export declare const CBA_PROFILE_ID = 261;
/** Endpoint profile ID for Zigbee 3.0. "Home Automation" */
export declare const HA_PROFILE_ID = 260;
/** Endpoint profile ID for Smart Energy */
export declare const SE_PROFILE_ID = 265;
/** Endpoint profile ID for Green Power */
export declare const GP_PROFILE_ID = 41440;
/** The touchlink (ZigBee Light Link/ZLL) Profile ID. */
export declare const TOUCHLINK_PROFILE_ID = 49246;
/** The profile ID used to address all the public profiles. */
export declare const WILDCARD_PROFILE_ID = 65535;
/** The network ID of the coordinator in a ZigBee network is 0x0000. */
export declare const ZIGBEE_COORDINATOR_ADDRESS = 0;
/** A blank (also used as "wildcard") EUI64 hex string prefixed with 0x */
export declare const BLANK_EUI64 = "0xFFFFFFFFFFFFFFFF";
/** A blank extended PAN ID. (null/not present) */
export declare const BLANK_EXTENDED_PAN_ID: readonly number[];
/** An invalid profile ID. This is a reserved profileId. */
export declare const INVALID_PROFILE_ID = 65535;
/** An invalid cluster ID. */
export declare const INVALID_CLUSTER_ID = 65535;
/** An invalid PAN ID. */
export declare const INVALID_PAN_ID = 65535;
/** Serves to initialize cache */
export declare const INVALID_NODE_TYPE = 255;
/** Serves to initialize cache for config IDs */
export declare const INVALID_CONFIG_VALUE = 65535;
/** Serves to initialize cache */
export declare const INVALID_RADIO_CHANNEL = 255;
/** A distinguished network ID that will never be assigned to any node. It is used to indicate the absence of a node ID. */
export declare const NULL_NODE_ID = 65535;
export declare const UNKNOWN_NETWORK_STATE = 255;
/** A distinguished binding index used to indicate the absence of a binding. */
export declare const NULL_BINDING = 255;
/**
 * A distinguished network ID that will never be assigned to any node.
 * This value is returned when getting the remote node ID from the binding table and the given binding table index refers
 * to a multicast binding entry.
 */
export declare const EMBER_MULTICAST_NODE_ID = 65534;
/**
 * A distinguished network ID that will never be assigned
 * to any node.  This value is used when getting the remote node ID
 * from the address or binding tables.  It indicates that the address
 * or binding table entry is currently in use but the node ID
 * corresponding to the EUI64 in the table is currently unknown.
 */
export declare const EMBER_UNKNOWN_NODE_ID = 65533;
/**
 * A distinguished network ID that will never be assigned
 * to any node.  This value is used when getting the remote node ID
 * from the address or binding tables.  It indicates that the address
 * or binding table entry is currently in use and network address
 * discovery is underway.
 */
export declare const EMBER_DISCOVERY_ACTIVE_NODE_ID = 65532;
/** A distinguished address table index used to indicate the absence of an address table entry. */
export declare const EMBER_NULL_ADDRESS_TABLE_INDEX = 255;
/** Invalidates cached information */
export declare const SOURCE_ROUTE_OVERHEAD_UNKNOWN = 255;
export declare const PERMIT_JOIN_FOREVER = 255;
export declare const PERMIT_JOIN_MAX_TIMEOUT = 254;
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
export declare const EMBER_BROADCAST_ADDRESS = 65532;
/** Broadcast to all non-sleepy devices. */
export declare const EMBER_RX_ON_WHEN_IDLE_BROADCAST_ADDRESS = 65533;
/** Broadcast to all devices, including sleepy end devices. */
export declare const EMBER_SLEEPY_BROADCAST_ADDRESS = 65535;
export declare const EMBER_MIN_BROADCAST_ADDRESS = 65528;
/** The maximum 802.15.4 channel number is 26. */
export declare const EMBER_MAX_802_15_4_CHANNEL_NUMBER = 26;
/** The minimum 2.4GHz 802.15.4 channel number is 11. */
export declare const EMBER_MIN_802_15_4_CHANNEL_NUMBER = 11;
/** The minimum SubGhz channel number is 0. */
export declare const EMBER_MIN_SUBGHZ_CHANNEL_NUMBER = 0;
/**
 * ZigBee protocol specifies that active scans have a duration of 3 (138 msec).
 * See documentation for emberStartScan in include/network-formation.h
 * for more info on duration values.
 */
export declare const EMBER_ACTIVE_SCAN_DURATION = 3;
/** The SubGhz scan duration is 5. */
export declare const EMBER_SUB_GHZ_SCAN_DURATION = 5;
/** There are sixteen 802.15.4 channels. */
export declare const EMBER_NUM_802_15_4_CHANNELS: number;
/** A bitmask to scan all 2.4 GHz 802.15.4 channels. */
export declare const EMBER_ALL_802_15_4_CHANNELS_MASK = 134215680;
/** The channels that the plugin will preferentially scan when forming and joining. */
export declare const NETWORK_FIND_CHANNEL_MASK = 51955712;
/**
 * Cut-off value (dBm) <-128..127>
 * The maximum noise allowed on a channel to consider for forming a network.
 * If the noise on all preferred channels is above this limit and "Enable scanning all channels" is ticked, the scan continues on all channels.
 * Use emberAfPluginNetworkFindGetEnergyThresholdForChannelCallback() to override this value.
 */
export declare const NETWORK_FIND_CUT_OFF_VALUE = -48;
/**
 * The additional overhead required for network source routing (relay count = 1, relay index = 1).
 * This does not include the size of the relay list itself.
 */
export declare const NWK_SOURCE_ROUTE_OVERHEAD = 2;
export declare const SOURCE_ROUTING_RESERVED_PAYLOAD_LENGTH = 0;
/**
 * The maximum APS payload, not including any APS options.
 * This value is also available from emberMaximumApsPayloadLength() or ezspMaximumPayloadLength().
 * See http://portal.ember.com/faq/payload for more information.
 */
export declare const MAXIMUM_APS_PAYLOAD_LENGTH: number;
/** The additional overhead required for APS encryption (security = 5, MIC = 4). */
export declare const APS_ENCRYPTION_OVERHEAD = 9;
/** The additional overhead required for APS fragmentation. */
export declare const APS_FRAGMENTATION_OVERHEAD = 2;
/**
 * A concentrator with insufficient memory to store source routes for the entire network.
 * Route records are sent to the concentrator prior to every inbound APS unicast.
 */
export declare const EMBER_LOW_RAM_CONCENTRATOR = 65528;
/**
 * A concentrator with sufficient memory to store source routes for the entire network.
 * Remote nodes stop sending route records once the concentrator has successfully received one.
 */
export declare const EMBER_HIGH_RAM_CONCENTRATOR = 65529;
/** The short address of the trust center. This address never changes dynamically. */
export declare const EMBER_TRUST_CENTER_NODE_ID = 0;
/** The size of the CRC that is appended to an installation code. */
export declare const EMBER_INSTALL_CODE_CRC_SIZE = 2;
/** The number of sizes of acceptable installation codes used in Certificate Based Key Establishment (CBKE). */
export declare const EMBER_NUM_INSTALL_CODE_SIZES = 4;
/**
 * Various sizes of valid installation codes that are stored in the manufacturing tokens.
 * Note that each size includes 2 bytes of CRC appended to the end of the installation code.
 */
export declare const EMBER_INSTALL_CODE_SIZES: number[];
/**
 * Default value for context's PSA algorithm permission (CCM* with 4 byte tag).
 * Only used by NCPs with secure key storage; define is mirrored here to allow
 * host code to initialize the context itself rather than needing a new EZSP frame.
 */
export declare const ZB_PSA_ALG = 88342784;
export declare const STACK_PROFILE_ZIGBEE_PRO = 2;
export declare const SECURITY_LEVEL_Z3 = 5;
/** This key is "ZigBeeAlliance09" */
export declare const ZIGBEE_PROFILE_INTEROPERABILITY_LINK_KEY: readonly number[];
/** The GP endpoint, as defined in the ZigBee spec. */
export declare const GP_ENDPOINT = 242;
/** Number of GP sink list entries. Minimum is 2 sink list entries. */
export declare const GP_SINK_LIST_ENTRIES = 2;
/** The size of the SinkList entries in sink table in format of octet string that has a format of {<1 byte length>, <n bytes for sink groups>} */
export declare const GP_SIZE_OF_SINK_LIST_ENTRIES_OCTET_STRING: number;
export declare const MAXIMUM_INTERPAN_LENGTH = 125;
export declare const SHORT_DEST_FRAME_CONTROL: number;
export declare const LONG_DEST_FRAME_CONTROL: number;
export declare const MAC_ACK_REQUIRED = 32;
/** NWK stub frame has two control bytes. */
export declare const STUB_NWK_SIZE = 2;
export declare const STUB_NWK_FRAME_CONTROL = 11;
/**
 * Interpan APS Unicast, same for Broadcast.
 * - Frame Control   (1-byte)
 * - Cluster ID      (2-bytes)
 * - Profile ID      (2-bytes)
 */
export declare const INTERPAN_APS_UNICAST_BROADCAST_SIZE = 5;
/**
 * Interpan APS Multicast
 * - Frame Control   (1-byte)
 * - Group ID        (2-bytes)
 * - Cluster ID      (2-bytes)
 * - Profile ID      (2-bytes)
 */
export declare const INTERPAN_APS_MULTICAST_SIZE = 7;
export declare const MAX_STUB_APS_SIZE = 7;
export declare const MIN_STUB_APS_SIZE = 5;
export declare const INTERPAN_APS_FRAME_TYPE = 3;
export declare const INTERPAN_APS_FRAME_TYPE_MASK = 3;
/** The only allowed APS FC value (without the delivery mode subfield) */
export declare const INTERPAN_APS_FRAME_CONTROL_NO_DELIVERY_MODE = 3;
export declare const INTERPAN_APS_FRAME_DELIVERY_MODE_MASK = 12;
export declare const INTERPAN_APS_FRAME_SECURITY = 32;
//# sourceMappingURL=consts.d.ts.map