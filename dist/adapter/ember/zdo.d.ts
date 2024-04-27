import { EmberEUI64, EmberExtendedPanId, EmberNodeId } from "./types";
/** The endpoint where the ZigBee Device Object (ZDO) resides. */
export declare const ZDO_ENDPOINT = 0;
/** The profile ID used by the ZigBee Device Object (ZDO). */
export declare const ZDO_PROFILE_ID = 0;
/** ZDO messages start with a sequence number. */
export declare const ZDO_MESSAGE_OVERHEAD = 1;
/**
 * ZDO response status.
 *
 * Most responses to ZDO commands contain a status byte.
 * The meaning of this byte is defined by the ZigBee Device Profile.
 * uint8_t
 */
export declare enum EmberZdoStatus {
    ZDP_SUCCESS = 0,
    ZDP_INVALID_REQUEST_TYPE = 128,
    ZDP_DEVICE_NOT_FOUND = 129,
    ZDP_INVALID_ENDPOINT = 130,
    ZDP_NOT_ACTIVE = 131,
    ZDP_NOT_SUPPORTED = 132,
    ZDP_TIMEOUT = 133,
    ZDP_NO_MATCH = 134,
    ZDP_NO_ENTRY = 136,
    ZDP_NO_DESCRIPTOR = 137,
    ZDP_INSUFFICIENT_SPACE = 138,
    ZDP_NOT_PERMITTED = 139,
    ZDP_TABLE_FULL = 140,
    ZDP_NOT_AUTHORIZED = 141,
    ZDP_DEVICE_BINDING_TABLE_FULL = 142,
    ZDP_INVALID_INDEX = 143,
    ZDP_FRAME_TOO_LARGE = 144,
    ZDP_BAD_KEY_NEGOTIATION_METHOD = 145,
    ZDP_TEMPORARY_FAILURE = 146,
    APS_SECURITY_FAIL = 173,
    NWK_ALREADY_PRESENT = 197,
    NWK_TABLE_FULL = 199,
    NWK_UNKNOWN_DEVICE = 200,
    NWK_MISSING_TLV = 214,
    NWK_INVALID_TLV = 215
}
export type MACCapabilityFlags = {
    /**
     * The alternate PAN coordinator sub-field is one bit in length and shall be set to 1 if this node is capable of becoming a PAN coordinator.
     * Otherwise, the alternative PAN coordinator sub-field shall be set to 0.
     */
    alternatePANCoordinator: number;
    /**
     * The device type sub-field is one bit in length and shall be set to 1 if this node is a full function device (FFD).
     * Otherwise, the device type sub-field shall be set to 0, indicating a reduced function device (RFD).
     */
    deviceType: number;
    /**
     * The power source sub-field is one bit in length and shall be set to 1 if the current power source is mains power.
     * Otherwise, the power source sub-field shall be set to 0.
     * This information is derived from the node current power source field of the node power descriptor.
     */
    powerSource: number;
    /**
     * The receiver on when idle sub-field is one bit in length and shall be set to 1 if the device does not disable its receiver to
     * conserve power during idle periods.
     * Otherwise, the receiver on when idle sub-field shall be set to 0 (see also section 2.3.2.4.)
     */
    rxOnWhenIdle: number;
    /** reserved */
    reserved1: number;
    /** reserved */
    reserved2: number;
    /**
     * The security capability sub-field is one bit in length and shall be set to 1 if the device is capable of sending and receiving
     * frames secured using the security suite specified in [B1].
     * Otherwise, the security capability sub-field shall be set to 0.
     */
    securityCapability: number;
    /** The allocate address sub-field is one bit in length and shall be set to 0 or 1. */
    allocateAddress: number;
};
export type ZDOLQITableEntry = {
    /**
     * The 64-bit extended PAN identifier of the neighboring device.
     *
     * 64-bit
     */
    extendedPanId: EmberExtendedPanId;
    /**
     * 64-bit IEEE address that is unique to every device.
     * If this value is unknown at the time of the request, this field shall be set to 0xffffffffffffffff.
     *
     * 64-bit
     */
    eui64: EmberEUI64;
    /** The 16-bit network address of the neighboring device. 16-bit */
    nodeId: EmberNodeId;
    /**
     * The type of the neighbor device:
     * 0x00 = ZigBee coordinator
     * 0x01 = ZigBee router
     * 0x02 = ZigBee end device
     * 0x03 = Unknown
     *
     * 2-bit
     */
    deviceType: number;
    /**
     * Indicates if neighbor's receiver is enabled during idle portions of the CAP:
     * 0x00 = Receiver is off
     * 0x01 = Receiver is on
     * 0x02 = unknown
     *
     * 2-bit
     */
    rxOnWhenIdle: number;
    /**
     * The relationship between the neighbor and the current device:
     * 0x00 = neighbor is the parent
     * 0x01 = neighbor is a child
     * 0x02 = neighbor is a sibling
     * 0x03 = None of the above
     * 0x04 = previous child
     *
     * 3-bit
     */
    relationship: number;
    /** This reserved bit shall be set to 0. 1-bit */
    reserved1: number;
    /**
     * An indication of whether the neighbor device is accepting join requests:
     * 0x00 = neighbor is not accepting join requests
     * 0x01 = neighbor is accepting join requests
     * 0x02 = unknown
     *
     * 2-bit
     */
    permitJoining: number;
    /** Each of these reserved bits shall be set to 0. 6-bit */
    reserved2: number;
    /**
     * The tree depth of the neighbor device.
     * A value of 0x00 indicates that the device is the ZigBee coordinator for the network
     *
     * 8-bit
     */
    depth: number;
    /**
     * The estimated link quality for RF transmissions from this device.
     * See [B1] for discussion of how this is calculated.
     *
     * 8-bit
     */
    lqi: number;
};
export type ZDORoutingTableEntry = {
    /** 16-bit network address of this route */
    destinationAddress: EmberNodeId;
    /**
     * Status of the route
     * 0x0=ACTIVE.
     * 0x1=DISCOVERY_UNDERWAY.
     * 0x2=DISCOVERY_FAILED.
     * 0x3=INACTIVE.
     * 0x4=VALIDATION_UNDERWAY
     * 0x5-0x7=RESERVED
     *
     * 3-bit
     */
    status: number;
    /**
     * A flag indicating whether the device is a memory constrained concentrator
     *
     * 1-bit
     */
    memoryConstrained: number;
    /**
     * A flag indicating that the destination is a concentrator that issued a many-to-one request
     *
     * 1-bit
     */
    manyToOne: number;
    /**
     * A flag indicating that a route record command frame should be sent to the destination prior to the next data packet.
     *
     * 1-bit
     */
    routeRecordRequired: number;
    /** 2-bit */
    reserved: number;
    /** 16-bit network address of the next hop on the way to the destination. */
    nextHopAddress: EmberNodeId;
};
export type ZDOBindingTableEntry = {
    /** The source IEEE address for the binding entry. */
    sourceEui64: EmberEUI64;
    /** The source endpoint for the binding entry. uint8_t */
    sourceEndpoint: number;
    /** The identifier of the cluster on the source device that is bound to the destination device. uint16_t */
    clusterId: number;
    /**
     * The addressing mode for the destination address. This field can take one of the non-reserved values from the following list:
     *   - 0x00 = reserved
     *   - 0x01 = 16-bit group address for DstAddr and DstEndpoint not present
     *   - 0x02 = reserved
     *   - 0x03 = 64-bit extended address for DstAddr and DstEndp present
     *   - 0x04 – 0xff = reserved
     *
     * uint8_t
     */
    destAddrMode: number;
    /** The destination address for the binding entry. uint16_t or uint8_t[EUI64_SIZE] */
    dest: EmberNodeId | EmberEUI64;
    /**
     * This field shall be present only if the DstAddrMode field has a value of 0x03 and, if present,
     * shall be the destination endpoint for the binding entry.
     * uint8_t or not present
     */
    destEndpoint?: number;
};
/** @see IEEE_ADDRESS_RESPONSE */
export type IEEEAddressResponsePayload = {
    eui64: EmberEUI64;
    nodeId: EmberNodeId;
    assocDevList: number[];
};
/** @see NETWORK_ADDRESS_RESPONSE */
export type NetworkAddressResponsePayload = {
    eui64: EmberEUI64;
    nodeId: EmberNodeId;
    assocDevList: number[];
};
/** @see MATCH_DESCRIPTORS_RESPONSE */
export type MatchDescriptorsResponsePayload = {
    nodeId: EmberNodeId;
    endpointList: number[];
};
/** @see SIMPLE_DESCRIPTOR_RESPONSE */
export type SimpleDescriptorResponsePayload = {
    nodeId: EmberNodeId;
    /** uint8_t  */
    /** const uint16_t*  */
    inClusterList: number[];
    /** uint8_t  */
    /** const uint16_t*  */
    outClusterList: number[];
    /** uint18_t  */
    profileId: number;
    /** uint16_t  */
    deviceId: number;
    /** uint8_t  */
    endpoint: number;
};
/** @see NODE_DESCRIPTOR_RESPONSE */
export type NodeDescriptorResponsePayload = {
    nodeId: EmberNodeId;
    logicalType: number;
    macCapFlags: MACCapabilityFlags;
    manufacturerCode: number;
    stackRevision: number;
};
/** @see POWER_DESCRIPTOR_RESPONSE */
export type PowerDescriptorResponsePayload = {
    nodeId: EmberNodeId;
    currentPowerMode: number;
    availPowerSources: number;
    currentPowerSource: number;
    currentPowerSourceLevel: number;
};
/** @see ACTIVE_ENDPOINTS_RESPONSE */
export type ActiveEndpointsResponsePayload = {
    nodeId: EmberNodeId;
    endpointList: number[];
};
/** @see LQI_TABLE_RESPONSE */
export type LQITableResponsePayload = {
    neighborTableEntries: number;
    entryList: ZDOLQITableEntry[];
};
/** @see ROUTING_TABLE_RESPONSE */
export type RoutingTableResponsePayload = {
    routingTableEntries: number;
    entryList: ZDORoutingTableEntry[];
};
/** @see BINDING_TABLE_RESPONSE */
export type BindingTableResponsePayload = {
    bindingTableEntries: number;
    entryList: ZDOBindingTableEntry[];
};
/** @see END_DEVICE_ANNOUNCE */
export type EndDeviceAnnouncePayload = {
    nodeId: EmberNodeId;
    eui64: EmberEUI64;
    capabilities: MACCapabilityFlags;
};
/** @see PARENT_ANNOUNCE_RESPONSE */
export type ParentAnnounceResponsePayload = {
    children: EmberEUI64[];
};
/**
 * Defines for ZigBee device profile cluster IDs follow. These
 * include descriptions of the formats of the messages.
 *
 * Note that each message starts with a 1-byte transaction sequence
 * number. This sequence number is used to match a response command frame
 * to the request frame that it is replying to. The application shall
 * maintain a 1-byte counter that is copied into this field and incremented
 * by one for each command sent. When a value of 0xff is reached, the next
 * command shall re-start the counter with a value of 0x00.
 */
/**
 * Network request: [transaction sequence number: 1]
 *                  [EUI64:8]   [type:1] [start index:1]
 */
export declare const NETWORK_ADDRESS_REQUEST = 0;
/**
 * Response: [transaction sequence number: 1]
 *           [status:1] [EUI64:8] [node ID:2]
 *           [ID count:1] [start index:1] [child ID:2]*
 */
export declare const NETWORK_ADDRESS_RESPONSE = 32768;
/**
 * IEEE request:    [transaction sequence number: 1]
 *                  [node ID:2] [type:1] [start index:1]
 *                  [type] = 0x00 single address response, ignore the start index
 *                  = 0x01 extended response -] sends kid's IDs as well
 */
export declare const IEEE_ADDRESS_REQUEST = 1;
/**
 * Response: [transaction sequence number: 1]
 *           [status:1] [EUI64:8] [node ID:2]
 *           [ID count:1] [start index:1] [child ID:2]*
 */
export declare const IEEE_ADDRESS_RESPONSE = 32769;
/**
 * Request:  [transaction sequence number: 1] [node ID:2] [tlvs: varies]
 */
export declare const NODE_DESCRIPTOR_REQUEST = 2;
/**
 * Response: [transaction sequence number: 1] [status:1] [node ID:2]
 *           [node descriptor: 13] [tlvs: varies]
 *
 * Node Descriptor field is divided into subfields of bitmasks as follows:
 *     (Note: All lengths below are given in bits rather than bytes.)
 *           Logical Type:                     3
 *           Complex Descriptor Available:     1
 *           User Descriptor Available:        1
 *           (reserved/unused):                3
 *           APS Flags:                        3
 *           Frequency Band:                   5
 *           MAC capability flags:             8
 *           Manufacturer Code:               16
 *           Maximum buffer size:              8
 *           Maximum incoming transfer size:  16
 *           Server mask:                     16
 *           Maximum outgoing transfer size:  16
 *           Descriptor Capability Flags:      8
 *    See ZigBee document 053474, Section 2.3.2.3 for more details.
 */
export declare const NODE_DESCRIPTOR_RESPONSE = 32770;
/**
 *
 * Request:  [transaction sequence number: 1] [node ID:2]
 */
export declare const POWER_DESCRIPTOR_REQUEST = 3;
/**
 * Response: [transaction sequence number: 1] [status:1] [node ID:2]
 *           [current power mode, available power sources:1]
 *           [current power source, current power source level:1]
 *     See ZigBee document 053474, Section 2.3.2.4 for more details.
 */
export declare const POWER_DESCRIPTOR_RESPONSE = 32771;
/**
 *
 * Request:  [transaction sequence number: 1]
 *           [node ID:2] [endpoint:1]
 */
export declare const SIMPLE_DESCRIPTOR_REQUEST = 4;
/**
 * Response: [transaction sequence number: 1]
 *           [status:1] [node ID:2] [length:1] [endpoint:1]
 *           [app profile ID:2] [app device ID:2]
 *           [app device version, app flags:1]
 *           [input cluster count:1] [input cluster:2]*
 *           [output cluster count:1] [output cluster:2]*
 */
export declare const SIMPLE_DESCRIPTOR_RESPONSE = 32772;
/**
 *
 * Request:  [transaction sequence number: 1] [node ID:2]
 */
export declare const ACTIVE_ENDPOINTS_REQUEST = 5;
/**
 * Response: [transaction sequence number: 1]
 *           [status:1] [node ID:2] [endpoint count:1] [endpoint:1]*
 */
export declare const ACTIVE_ENDPOINTS_RESPONSE = 32773;
/**
 * Request:  [transaction sequence number: 1]
 *           [node ID:2] [app profile ID:2]
 *           [input cluster count:1] [input cluster:2]*
 *           [output cluster count:1] [output cluster:2]*
 */
export declare const MATCH_DESCRIPTORS_REQUEST = 6;
/**
 * Response: [transaction sequence number: 1]
 *           [status:1] [node ID:2] [endpoint count:1] [endpoint:1]*
 */
export declare const MATCH_DESCRIPTORS_RESPONSE = 32774;
/**
 * Request: [transaction sequence number: 1]
 *          [node ID:2] [EUI64:8] [capabilities:1]
 */
export declare const END_DEVICE_ANNOUNCE = 19;
/**
 * No response is sent.
 */
export declare const END_DEVICE_ANNOUNCE_RESPONSE = 32787;
/**
 * Request:  [transaction sequence number: 1] [server mask:2]
 */
export declare const SYSTEM_SERVER_DISCOVERY_REQUEST = 21;
/**
 * Response: [transaction sequence number: 1]
 *           [status (== EMBER_ZDP_SUCCESS):1] [server mask:2]
 */
export declare const SYSTEM_SERVER_DISCOVERY_RESPONSE = 32789;
/**
 * Request:  [transaction sequence number: 1]
 *           [number of children:1] [child EUI64:8]*
 */
export declare const PARENT_ANNOUNCE = 31;
/**
 * Response: [transaction sequence number: 1]
 *           [status: 1] [number of children:1] [child EUI64:8]*
 */
export declare const PARENT_ANNOUNCE_RESPONSE = 32799;
/**
 * Request:  [transaction sequence number: 1]
 *           [device of interest ID:2] [d-of-i EUI64:8]
 */
export declare const FIND_NODE_CACHE_REQUEST = 28;
/**
 * Response: [transaction sequence number: 1]
 *           [responder ID:2] [device of interest ID:2] [d-of-i EUI64:8]
 */
export declare const FIND_NODE_CACHE_RESPONSE = 32796;
/**
 * Request:  [transaction sequence number: 1]
 *           [node ID:2] [EUI64:8] [endpoint:1] [app profile ID:2]
 *           [input cluster count:1] [input cluster:2]*
 *           [output cluster count:1] [output cluster:2]*
 */
export declare const END_DEVICE_BIND_REQUEST = 32;
/**
 * Response: [transaction sequence number: 1] [status:1]
 */
export declare const END_DEVICE_BIND_RESPONSE = 32800;
/**
 * Request:  [transaction sequence number: 1]
 *           [clear all bindings request EUI64 TLV:Variable]
 * Clear all bindings request EUI64 TLV:
 *           [Count N:1][EUI64 1:8]...[EUI64 N:8]
 */
export declare const CLEAR_ALL_BINDINGS_REQUEST = 43;
/**
 * Response: [transaction sequence number: 1] [status:1]
 */
export declare const CLEAR_ALL_BINDINGS_RESPONSE = 32811;
/**
 *
 */
export declare const UNICAST_BINDING = 3;
/**
 *
 */
export declare const UNICAST_MANY_TO_ONE_BINDING = 131;
/**
 *
 */
export declare const MULTICAST_BINDING = 1;
/**
 * Request:  [transaction sequence number: 1]
 *           [source EUI64:8] [source endpoint:1]
 *           [cluster ID:2] [destination address:3 or 10]
 * Destination address:
 *           [0x01:1] [destination group:2]
 * Or:
 *           [0x03:1] [destination EUI64:8] [destination endpoint:1]
 *
 */
export declare const BIND_REQUEST = 33;
/**
 * Response: [transaction sequence number: 1] [status:1]
 */
export declare const BIND_RESPONSE = 32801;
/**
 * Request:  [transaction sequence number: 1]
 *           [source EUI64:8] [source endpoint:1]
 *           [cluster ID:2] [destination address:3 or 10]
 * Destination address:
 *           [0x01:1] [destination group:2]
 * Or:
 *           [0x03:1] [destination EUI64:8] [destination endpoint:1]
 *
 */
export declare const UNBIND_REQUEST = 34;
/**
 * Response: [transaction sequence number: 1] [status:1]
 */
export declare const UNBIND_RESPONSE = 32802;
/**
 * Request:  [transaction sequence number: 1] [start index:1]
 */
export declare const LQI_TABLE_REQUEST = 49;
/**
 * Response: [transaction sequence number: 1] [status:1]
 *           [neighbor table entries:1] [start index:1]
 *           [entry count:1] [entry:22]*
 *   [entry] = [extended PAN ID:8] [EUI64:8] [node ID:2]
 *             [device type, RX on when idle, relationship:1]
 *             [permit joining:1] [depth:1] [LQI:1]
 *
 * The device-type byte has the following fields:
 *
 *      Name          Mask        Values
 *
 *   device type      0x03     0x00 coordinator
 *                             0x01 router
 *                             0x02 end device
 *                             0x03 unknown
 *
 *   rx mode          0x0C     0x00 off when idle
 *                             0x04 on when idle
 *                             0x08 unknown
 *
 *   relationship     0x70     0x00 parent
 *                             0x10 child
 *                             0x20 sibling
 *                             0x30 other
 *                             0x40 previous child
 *   reserved         0x10
 *
 * The permit-joining byte has the following fields
 *
 *      Name          Mask        Values
 *
 *   permit joining   0x03     0x00 not accepting join requests
 *                             0x01 accepting join requests
 *                             0x02 unknown
 *   reserved         0xFC
 *
 */
export declare const LQI_TABLE_RESPONSE = 32817;
/**
 * Request:  [transaction sequence number: 1] [start index:1]
 */
export declare const ROUTING_TABLE_REQUEST = 50;
/**
 * Response: [transaction sequence number: 1] [status:1]
 *           [routing table entries:1] [start index:1]
 *           [entry count:1] [entry:5]*
 *   [entry] = [destination address:2]
 *             [status:1]
 *             [next hop:2]
 *
 *
 * The status byte has the following fields:
 *      Name          Mask        Values
 *
 *   status           0x07     0x00 active
 *                             0x01 discovery underway
 *                             0x02 discovery failed
 *                             0x03 inactive
 *                             0x04 validation underway
 *
 *   flags            0x38
 *                             0x08 memory constrained
 *                             0x10 many-to-one
 *                             0x20 route record required
 *
 *   reserved         0xC0
 */
export declare const ROUTING_TABLE_RESPONSE = 32818;
/**
 * Request:  [transaction sequence number: 1] [start index:1]
 */
export declare const BINDING_TABLE_REQUEST = 51;
/**
 * Response: [transaction sequence number: 1]
 *           [status:1] [binding table entries:1] [start index:1]
 *           [entry count:1] [entry:14/21]*
 *   [entry] = [source EUI64:8] [source endpoint:1] [cluster ID:2]
 *             [dest addr mode:1] [dest:2/8] [dest endpoint:0/1]
 * [br]
 * @note If Dest. Address Mode = 0x03, then the Long Dest. Address will be
 * used and Dest. endpoint will be included.  If Dest. Address Mode = 0x01,
 * then the Short Dest. Address will be used and there will be no Dest.
 * endpoint.
 */
export declare const BINDING_TABLE_RESPONSE = 32819;
/**
 * Request:  [transaction sequence number: 1] [EUI64:8] [flags:1]
 *          The flag bits are:
 *          0x40 remove children
 *          0x80 rejoin
 */
export declare const LEAVE_REQUEST = 52;
/**
 * Response: [transaction sequence number: 1] [status:1]
 */
export declare const LEAVE_RESPONSE = 32820;
/**
 * Request:  [transaction sequence number: 1]
 *           [duration:1] [permit authentication:1]
 */
export declare const PERMIT_JOINING_REQUEST = 54;
/**
 * Response: [transaction sequence number: 1] [status:1]
 */
export declare const PERMIT_JOINING_RESPONSE = 32822;
/**
 *
 * Request:  [transaction sequence number: 1]
 *           [scan channels:4] [duration:1] [count:0/1] [manager:0/2]
 *
 *   If the duration is in 0x00 ... 0x05, 'count' is present but
 *   not 'manager'.  Perform 'count' scans of the given duration on the
 *   given channels.
 *
 *   If duration is 0xFE, 'channels' should have a single channel
 *   and 'count' and 'manager' are not present.  Switch to the indicated
 *   channel.
 *
 *   If duration is 0xFF, 'count' is not present.  Set the active
 *   channels and the network manager ID to the values given.
 *
 *   Unicast requests always get a response, which is INVALID_REQUEST if the
 *   duration is not a legal value.
 */
export declare const NWK_UPDATE_REQUEST = 56;
/**
 *
 * Response: [transaction sequence number: 1] [status:1]
 *   [scanned channels:4] [transmissions:2] [failures:2]
 *   [energy count:1] [energy:1]*
 */
export declare const NWK_UPDATE_RESPONSE = 32824;
/**
 *
 */
export declare const NWK_UPDATE_ENHANCED_REQUEST = 57;
/**
 *
 */
export declare const NWK_UPDATE_ENHANCED_RESPONSE = 32825;
/**
 *
 */
export declare const NWK_UPDATE_IEEE_JOINING_LIST_REQUEST = 58;
/**
 *
 */
export declare const NWK_UPDATE_IEEE_JOINING_LIST_REPONSE = 32826;
/**
 *
 */
export declare const NWK_UNSOLICITED_ENHANCED_UPDATE_NOTIFY = 32827;
/**
 *
 * Request:  [transaction sequence number: 1]
 *           [TLVs: varies]
 *
 * Contains one Beacon Survey Configuration TLV (variable octets),
 * which contain the ScanChannelListStructure (variable length)
 * and the ConfigurationBitmask (1 octet). This information provides
 * the configuration for the end device's beacon survey.
 * See R23 spec section 2.4.3.3.12 for the request and 3.2.2.2.1
 * for the ChannelListStructure.
 */
export declare const BEACON_SURVEY_REQUEST = 60;
/**
 *
 * Response:  [transaction sequence number: 1]
 *            [status: 1]
 *            [TLVs: varies]
 *
 * Contains one Beacon Survey Results TLV (4 octets), which contain
 * the number of on-network, off-network, potential parent and total
 * beacons recorded. If the device that received the request is not a
 * router, a Potential Parent TLV (variable octects) will be found. This
 * will contain information on the device's current parent, as well as
 * any potential parents found via beacons (up to a maximum of 5). A
 * Pan ID Conflict TLV can also found in the response.
 * See R23 spec section 2.4.4.3.13 for the response.
 */
export declare const BEACON_SURVEY_RESPONSE = 32828;
/**
 *
 * Request:  [transaction sequence number: 1]
 *           [TLVs: varies]
 *
 * Contains one or more Curve25519 Public Point TLVs (40 octets),
 * which contain an EUI64 and the 32-byte Curve public point.
 * See R23 spec section 2.4.3.4.1
 *
 * @note This command SHALL NOT be APS encrypted regardless of
 * whether sent before or after the device joins the network.
 * This command SHALL be network encrypted if the device has a
 * network key, i.e. it has joined the network earlier and wants
 * to negotiate or renegotiate a new link key; otherwise, if it
 * is used prior to joining the network, it SHALL NOT be network
 *  encrypted.
 */
export declare const KEY_NEGOTIATION_REQUEST = 64;
/**
 *
 * Response: [transaction sequence number: 1] [status:1]
 *           [TLVs: varies]
 *
 * Contains one or more Curve25519 Public Point TLVs (40 octets),
 * which contain an EUI64 and the 32-byte Curve public point, or
 * Local TLVs.
 * See R23 spec section 2.4.4.4.1
 *
 * @note This command SHALL NOT be APS encrypted. When performing
 * Key Negotiation with an unauthenticated neighbor that is not
 * yet on the network, network layer encryption SHALL NOT be used
 * on the message. If the message is being sent to unauthenticated
 * device that is not on the network and is not a neighbor, it
 * SHALL be relayed as described in section 4.6.3.7.7. Otherwise
 * the message SHALL have network layer encryption.
 */
export declare const KEY_NEGOTIATION_RESPONSE = 32832;
/**
 *
 * Request:  [transaction sequence number: 1]
 *           [TLVs: varies]
 *
 * Contains one or more Authentication Token ID TLVs (1 octet),
 * which contain the TLV Type Tag ID of the source of the
 * authentication token. See R23 spec section 2.4.3.4.2
 */
export declare const AUTHENTICATION_TOKEN_REQUEST = 65;
/**
 *
 * Response: [transaction sequence number: 1] [status:1]
 *           [TLVs: varies]
 *
 * Contains one or more 128-bit Symmetric Passphrase Global TLVs
 * (16 octets), which contain the symmetric passphrase authentication
 * token. See R23 spec section 2.4.4.4.2
 */
export declare const AUTHENTICATION_TOKEN_RESPONSE = 32833;
/**
 *
 * Request:  [transaction sequence number: 1]
 *           [TLVs: varies]
 *
 * Contains one or more Target IEEE Address TLVs (8 octets),
 * which contain the EUI64 of the device of interest.
 * See R23 spec section 2.4.3.4.3
 */
export declare const AUTHENTICATION_LEVEL_REQUEST = 66;
/**
 *
 * Response: [transaction sequence number: 1] [status:1]
 *           [TLVs: varies]
 *
 * Contains one or more Device Authentication Level TLVs
 * (10 octets), which contain the EUI64 of the inquired device,
 * along with the its initial join method and its active link
 * key update method.
 * See R23 spec section 2.4.4.4.3
 */
export declare const AUTHENTICATION_LEVEL_RESPONSE = 32834;
/**
 *
 * Request:  [transaction sequence number: 1]
 *           [TLVs: varies]
 *
 * Contains one or more Global TLVs (1 octet),
 * which contain the TLV Type Tag ID, and their
 * value.
 */
export declare const SET_CONFIGURATION_REQUEST = 67;
/**
 *
 * Response: [transaction sequence number: 1] [status:1]
 */
export declare const SET_CONFIGURATION_RESPONSE = 32835;
/**
 *
 * Request:  [transaction sequence number: 1]
 *           [TLVs: varies]
 *
 * Contains one or more TLVs (1 octet),
 * which the sender wants to get information
 */
export declare const GET_CONFIGURATION_REQUEST = 68;
/**
 *
 * Response: [transaction sequence number: 1] [status:1]
 *           [TLVs: varies]
 *
 * Contains one or more TLV tag Ids and their values
 * in response to the request
 */
export declare const GET_CONFIGURATION_RESPONSE = 32836;
/**
 *
 * Request:  [transaction sequence number: 1]
 *           [TLVs: varies]
 *
 * Contains one or more TLVs. These TLVs can be Selected Key
 * Negotiation Method TLVs (10 octets), Fragmentation Parameters
 * Global TLVs (5 octets), or other TLVs.
 * See R23 spec section 2.4.3.4.6
 *
 * @note This SHALL NOT be APS encrypted or NWK encrypted if the
 * link key update mechanism is done as part of the initial join
 * and before the receiving device has been issued a network
 * key. This SHALL be both APS encrypted and NWK encrypted if
 * the link key update mechanism is performed to refresh the
 * link key when the receiving device has the network key and
 * has previously successfully joined the network.
 */
export declare const KEY_UPDATE_REQUEST = 69;
/**
 *
 * Response: [transaction sequence number: 1] [status:1]
 *
 * See R23 spec section 2.4.4.4.6
 *
 * @note This command SHALL be APS encrypted.
 */
export declare const KEY_UPDATE_RESPONSE = 32837;
/**
 *
 * Request:  [transaction sequence number: 1]
 *           [security decommission request EUI64 TLV:Variable]
 * Security Decommission request EUI64 TLV:
 *           [Count N:1][EUI64 1:8]...[EUI64 N:8]
 */
export declare const SECURITY_DECOMMISSION_REQUEST = 70;
/**
 *
 * Response: [transaction sequence number: 1] [status:1]
 */
export declare const SECURITY_DECOMMISSION_RESPONSE = 32838;
/**
 *
 * Request:  [transaction sequence number: 1]
 *           [TLVs: varies]
 *
 * Contains at least the APS Frame Counter Challenge TLV, which holds the
 * sender EUI and the 64 bit challenge value.
 */
export declare const SECURITY_CHALLENGE_REQUEST = 71;
/**
 *
 * Response: [transaction sequence number: 1]
 *           [TLVs: varies]
 *
 * Contains at least the APS Frame Counter Response TLV, which holds the
 * sender EUI, received challenge value, APS frame counter, challenge
 * security frame counter, and 8-byte MIC.
 */
export declare const SECURITY_CHALLENGE_RESPONSE = 32839;
/**
 *
 */
export declare const COMPLEX_DESCRIPTOR_REQUEST = 16;
/**
 *
 */
export declare const COMPLEX_DESCRIPTOR_RESPONSE = 32784;
/**
 *
 */
export declare const USER_DESCRIPTOR_REQUEST = 17;
/**
 *
 */
export declare const USER_DESCRIPTOR_RESPONSE = 32785;
/**
 *
 */
export declare const DISCOVERY_REGISTER_REQUEST = 18;
/**
 *
 */
export declare const DISCOVERY_REGISTER_RESPONSE = 32786;
/**
 *
 */
export declare const USER_DESCRIPTOR_SET = 20;
/**
 *
 */
export declare const USER_DESCRIPTOR_CONFIRM = 32788;
/**
 *
 */
export declare const NETWORK_DISCOVERY_REQUEST = 48;
/**
 *
 */
export declare const NETWORK_DISCOVERY_RESPONSE = 32816;
/**
 *
 */
export declare const DIRECT_JOIN_REQUEST = 53;
/**
 *
 */
export declare const DIRECT_JOIN_RESPONSE = 32821;
/**
 * Response: [transaction sequence number: 1]
 *            [status (== EMBER_ZDP_SUCCESS):1]
 */
export declare const DISCOVERY_CACHE_REQUEST = 18;
/**
 * Request:  [transaction sequence number: 1]
 *            [source node ID:2] [source EUI64:8]
 */
export declare const DISCOVERY_CACHE_RESPONSE = 32786;
export declare const CLUSTER_ID_RESPONSE_MINIMUM = 32768;
//# sourceMappingURL=zdo.d.ts.map