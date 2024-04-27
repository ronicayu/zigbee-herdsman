/// <reference types="node" />
import { Adapter, TsType } from "../..";
import { Backup } from "../../../models";
import { FrameType, Direction, ZclFrame } from "../../../zcl";
import { ZclPayload } from "../../events";
import { EmberNetworkStatus } from "../enums";
import { EmberEUI64, EmberExtendedPanId, EmberKeyData, EmberNetworkParameters, EmberNodeId, EmberPanId } from "../types";
export type NetworkCache = {
    eui64: EmberEUI64;
    parameters: EmberNetworkParameters;
    status: EmberNetworkStatus;
};
/**
 * Use for a link key backup.
 *
 * Each entry notes the EUI64 of the device it is paired to and the key data.
 *   This key may be hashed and not the actual link key currently in use.
 */
type LinkKeyBackupData = {
    deviceEui64: EmberEUI64;
    key: EmberKeyData;
    outgoingFrameCounter: number;
    incomingFrameCounter: number;
};
/**
 * Relay calls between Z2M and EZSP-layer and handle any error that might occur via queue & waitress.
 *
 * Anything post `start` that requests anything from the EZSP layer must run through the request queue for proper execution flow.
 */
export declare class EmberAdapter extends Adapter {
    /** Current manufacturer code assigned to the coordinator. Used for join workarounds... */
    private manufacturerCode;
    /** Key in STACK_CONFIGS */
    readonly stackConfig: 'default' | 'zigbeed';
    /** EMBER_LOW_RAM_CONCENTRATOR or EMBER_HIGH_RAM_CONCENTRATOR. */
    private readonly concentratorType;
    private readonly ezsp;
    private version;
    private readonly requestQueue;
    private readonly oneWaitress;
    /** Periodically retrieve counters then clear them. */
    private watchdogCountersHandle;
    /** Hold ZDO request in process. */
    private readonly zdoRequestBuffalo;
    /** Sequence number used for ZDO requests. static uint8_t  */
    private zdoRequestSequence;
    /** Default radius used for broadcast ZDO requests. uint8_t */
    private zdoRequestRadius;
    private interpanLock;
    /**
     * Cached network params to avoid NCP calls. Prevents frequent EZSP transactions.
     * NOTE: Do not use directly, use getter functions for it that check if valid or need retrieval from NCP.
     */
    private networkCache;
    constructor(networkOptions: TsType.NetworkOptions, serialPortOptions: TsType.SerialPortOptions, backupPath: string, adapterOptions: TsType.AdapterOptions);
    /**
     * Emitted from @see Ezsp.ezspStackStatusHandler
     * @param status
     */
    private onStackStatus;
    /**
     * Emitted from @see Ezsp.ezspMessageSentHandler
     * WARNING: Cannot rely on `ezspMessageSentHandler` > `ezspIncomingMessageHandler` order, some devices mix it up!
     *
     * @param type
     * @param indexOrDestination
     * @param apsFrame
     * @param messageTag
     */
    private onMessageSentDeliveryFailed;
    /**
     * Emitted from @see Ezsp.ezspIncomingMessageHandler
     *
     * @param clusterId The ZDO response cluster ID.
     * @param sender The sender of the response. Should match `payload.nodeId` in many responses.
     * @param payload If null, the response indicated a failure.
     */
    private onZDOResponse;
    /**
     * Emitted from @see Ezsp.ezspIncomingMessageHandler
     *
     * @param sender
     * @param nodeId
     * @param eui64
     * @param macCapFlags
     */
    private onEndDeviceAnnounce;
    /**
     * Emitted from @see Ezsp.ezspIncomingMessageHandler
     *
     * @param type
     * @param apsFrame
     * @param lastHopLqi
     * @param sender
     * @param messageContents
     */
    private onIncomingMessage;
    /**
     * Emitted from @see Ezsp.ezspMacFilterMatchMessageHandler when the message is a valid InterPAN touchlink message.
     *
     * @param sourcePanId
     * @param sourceAddress
     * @param groupId
     * @param lastHopLqi
     * @param messageContents
     */
    private onTouchlinkMessage;
    /**
     * Emitted from @see Ezsp.ezspGpepIncomingMessageHandler
     *
     * @param sequenceNumber
     * @param commandIdentifier
     * @param sourceId
     * @param frameCounter
     * @param gpdCommandId
     * @param gpdCommandPayload
     * @param gpdLink
     */
    private onGreenpowerMessage;
    /**
     * Emitted from @see Ezsp.ezspTrustCenterJoinHandler
     * Also from @see Ezsp.ezspIdConflictHandler as a DEVICE_LEFT
     *
     * @param newNodeId
     * @param newNodeEui64
     * @param status
     * @param policyDecision
     * @param parentOfNewNodeId
     */
    private onTrustCenterJoin;
    private watchdogCounters;
    private initVariables;
    /**
     * Proceed to execute the long list of commands required to setup comms between Host<>NCP.
     * This is called by start and on internal reset.
     */
    private initEzsp;
    /**
     * NCP Config init. Should always be called first in the init stack (after version cmd).
     * @returns
     */
    private initNCPPreConfiguration;
    /**
     * NCP Address table init.
     * @returns
     */
    private initNCPAddressTable;
    /**
     * NCP configuration init
     */
    private initNCPConfiguration;
    /**
     * NCP concentrator init. Also enables source route discovery mode with RESCHEDULE.
     *
     * From AN1233:
     * To function correctly in a Zigbee PRO network, a trust center also requires that:
     *
     * 1. The trust center application must act as a concentrator (either high or low RAM).
     * 2. The trust center application must have support for source routing.
     *    It must record the source routes and properly handle requests by the stack for a particular source route.
     * 3. The trust center application must use an address cache for security, in order to maintain a mapping of IEEE address to short ID.
     *
     * Failure to satisfy all of the above requirements may result in failures when joining/rejoining devices to the network across multiple hops
     * (through a target node that is neither the trust center nor one of its neighboring routers.)
     */
    private initNCPConcentrator;
    /**
     * Register fixed endpoints and set any related multicast entries that need to be.
     */
    private registerFixedEndpoints;
    /**
     *
     * @returns True if the network needed to be formed.
     */
    private initTrustCenter;
    /**
     * Form a network using given parameters.
     */
    private formNetwork;
    /**
     * Loads currently stored backup and returns it in internal backup model.
     */
    getStoredBackup(): Promise<Backup>;
    /**
     * Export link keys for backup.
     *
     * @return List of keys data with AES hashed keys
     */
    exportLinkKeys(): Promise<LinkKeyBackupData[]>;
    /**
     * Import link keys from backup.
     *
     * @param backupData
     */
    importLinkKeys(backupData: LinkKeyBackupData[]): Promise<void>;
    /**
     * Routine to update the network key and broadcast the update to the network after a set time.
     * NOTE: This should run at a large interval, but before the uint32_t of the frame counter is able to reach all Fs (can't wrap to 0).
     *       This may disrupt sleepy end devices that miss the update, but they should be able to TC rejoin (in most cases...).
     *       On the other hand, the more often this runs, the more secure the network is...
     */
    private broadcastNetworkKeyUpdate;
    /**
     * Received when EZSP layer alerts of a problem that needs the NCP to be reset.
     * @param status
     */
    private onNcpNeedsResetAndInit;
    /**
     * Clear the cached network values (set to invalid values).
     */
    private clearNetworkCache;
    /**
     * Return the current network state.
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against UNKNOWN_NETWORK_STATE for validity.
     */
    emberNetworkState(): Promise<EmberNetworkStatus>;
    /**
     * Return the EUI 64 of the local node
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against BLANK_EUI64 for validity.
     */
    emberGetEui64(): Promise<EmberEUI64>;
    /**
     * Return the PAN ID of the local node.
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against INVALID_PAN_ID for validity.
     */
    emberGetPanId(): Promise<EmberPanId>;
    /**
     * Return the Extended PAN ID of the local node.
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against BLANK_EXTENDED_PAN_ID for validity.
     */
    emberGetExtendedPanId(): Promise<EmberExtendedPanId>;
    /**
     * Return the radio channel (uint8_t) of the current network.
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against INVALID_RADIO_CHANNEL for validity.
     */
    emberGetRadioChannel(): Promise<number>;
    emberStartEnergyScan(): Promise<void>;
    /**
     * Ensure the Host & NCP are aligned on protocols using version.
     * Cache the retrieved information.
     *
     * NOTE: currently throws on mismatch until support for lower versions is implemented (not planned atm)
     *
     * Does nothing if ncpNeedsResetAndInit == true.
     */
    private emberVersion;
    /**
     * This function sets an EZSP config value.
     * WARNING: Do not call for values that cannot be set after init without first resetting NCP (like table sizes).
     *          To avoid an extra NCP call, this does not check for it.
     * @param configId
     * @param value uint16_t
     * @returns
     */
    private emberSetEzspConfigValue;
    /**
     * This function sets an EZSP value.
     * @param valueId
     * @param valueLength uint8_t
     * @param value uint8_t *
     * @returns
     */
    private emberSetEzspValue;
    /**
     * This function sets an EZSP policy.
     * @param policyId
     * @param decisionId Can be bitop
     * @returns
     */
    private emberSetEzspPolicy;
    /**
     * Here we convert the normal Ember AES hash call to the specialized EZSP call.
     * This came about because we cannot pass a block of data that is
     * both input and output into EZSP. The block must be broken up into two
     * elements. We unify the two pieces here to make it invisible to the users.
     * @param context EmberAesMmoHashContext *
     * @param finalize
     * @param data uint8_t * Expected of valid length (as in, not larger alloc)
     * @returns status
     * @returns result context or null
     */
    private aesMmoHash;
    /**
     *  This routine processes the passed chunk of data and updates
     *  the hash calculation based on it.  The data passed in MUST
     *  have a length that is a multiple of 16.
     *
     * @param context EmberAesMmoHashContext*  A pointer to the location of the hash context to update.
     * @param data const uint8_t* A pointer to the location of the data to hash.
     *
     * @returns An ::EmberStatus value indicating EMBER_SUCCESS if the hash was
     *   calculated successfully.  EMBER_INVALID_CALL if the block size is not a
     *   multiple of 16 bytes, and EMBER_INDEX_OUT_OF_RANGE is returned when the
     *   data exceeds the maximum limits of the hash function.
     * @returns result context or null
     */
    private emberAesMmoHashUpdate;
    /**
     *  This routine processes the passed chunk of data (if non-NULL)
     *  and update the hash context that is passed in.  In then performs
     *  the final calculations on the hash and returns the final answer
     *  in the result parameter of the ::EmberAesMmoHashContext structure.
     *  The length of the data passed in may be any value, it does not have
     *  to be a multiple of 16.
     *
     * @param context EmberAesMmoHashContext * A pointer to the location of the hash context to finalize.
     * @param data uint8_t * A pointer to the location of data to hash. May be NULL.
     *
     * @returns An ::EmberStatus value indicating EMBER_SUCCESS if the hash was
     *   calculated successfully.  EMBER_INVALID_CALL if the block size is not a
     *   multiple of 16 bytes, and EMBER_INDEX_OUT_OF_RANGE is returned when the
     *   data exceeds the maximum limits of the hash function.
     * @returns result context or null
     */
    private emberAesMmoHashFinal;
    /**
     *  This is a convenience method when the hash data is less than 255
     *  bytes. It inits, updates, and finalizes the hash in one function call.
     *
     * @param data const uint8_t* The data to hash. Expected of valid length (as in, not larger alloc)
     *
     * @returns An ::EmberStatus value indicating EMBER_SUCCESS if the hash was
     *   calculated successfully.  EMBER_INVALID_CALL if the block size is not a
     *   multiple of 16 bytes, and EMBER_INDEX_OUT_OF_RANGE is returned when the
     *   data exceeds the maximum limits of the hash function.
     * @returns result uint8_t*  The location where the result of the hash will be written.
     */
    private emberAesHashSimple;
    /**
     * Enable local permit join and optionally broadcast the ZDO Mgmt_Permit_Join_req message.
     * This API can be called from any device type and still return EMBER_SUCCESS.
     * If the API is called from an end device, the permit association bit will just be left off.
     *
     * @param duration uint8_t The duration that the permit join bit will remain on
     * and other devices will be able to join the current network.
     * @param broadcastMgmtPermitJoin whether or not to broadcast the ZDO Mgmt_Permit_Join_req message.
     *
     * @returns status of whether or not permit join was enabled.
     * @returns apsFrame Will be null if not broadcasting.
     * @returns messageTag The tag passed to ezspSend${x} function.
     */
    private emberPermitJoining;
    /**
     * Set the trust center policy bitmask using decision.
     * @param decision
     * @returns
     */
    private emberSetJoinPolicy;
    /**
     * Get Source Route Overhead
     *
     * Returns the number of bytes needed in a packet for source routing.
     * Since each hop consumes 2 bytes in the packet, this routine calculates the
     * total number of bytes needed based on number of hops to reach the destination.
     *
     * This function is called by the framework to determine the overhead required
     * in the network frame for source routing to a particular destination.
     *
     * @param destination The node id of the destination  Ver.: always
     * @returns int8u The number of bytes needed for source routing in a packet.
     */
    emberGetSourceRouteOverhead(destination: EmberNodeId): Promise<number>;
    /**
     * Return the maximum size of the payload that the Application Support sub-layer will accept for
     * the given message type, destination, and APS frame.
     *
     * The size depends on multiple factors, including the security level in use and additional information
     * added to the message to support the various options.
     *
     * @param type The outgoing message type.
     * @param indexOrDestination uint16_t Depending on the message type, this is either the
     *  EmberNodeId of the destination, an index into the address table, an index
     *  into the binding table, the multicast identifier, or a broadcast address.
     * @param apsFrame EmberApsFrame *The APS frame for the message.
     * @return uint8_t The maximum APS payload length for the given message.
     */
    private maximumApsPayloadLength;
    /**
     * ZDO
     * Change the default radius for broadcast ZDO requests
     *
     * @param radius uint8_t The radius to be used for future ZDO request broadcasts.
     */
    private setZDORequestRadius;
    /**
     * ZDO
     * Retrieve the default radius for broadcast ZDO requests
     *
     * @return uint8_t The radius to be used for future ZDO request broadcasts.
     */
    private getZDORequestRadius;
    /**
     * ZDO
     * Get the next device request sequence number.
     *
     * Requests have sequence numbers so that they can be matched up with the
     * responses. To avoid complexities, the library uses numbers with the high
     * bit clear and the stack uses numbers with the high bit set.
     *
     * @return uint8_t The next device request sequence number
     */
    private nextZDORequestSequence;
    /**
     * ZDO
     *
     * @param destination
     * @param clusterId uint16_t
     * @param options
     * @param length uint8_t
     * @returns status Indicates success or failure (with reason) of send
     * @returns apsFrame The APS Frame resulting of the request being built and sent (`sequence` set from stack-given value).
     * @returns messageTag The tag passed to ezspSend${x} function.
     */
    private sendZDORequestBuffer;
    /**
     * ZDO
     * Service Discovery Functions
     * Request the specified node to send a list of its endpoints that
     * match the specified application profile and, optionally, lists of input
     * and/or output clusters.
     * @param target  The node whose matching endpoints are desired. The request can
     * be sent unicast or broadcast ONLY to the "RX-on-when-idle-address" (0xFFFD)
     * If sent as a broadcast, any node that has matching endpoints will send a
     * response.
     * @param profile uint16_t The application profile to match.
     * @param inCount uint8_t The number of input clusters. To not match any input
     * clusters, set this value to 0.
     * @param outCount uint8_t The number of output clusters. To not match any output
     * clusters, set this value to 0.
     * @param inClusters uint16_t * The list of input clusters.
     * @param outClusters uint16_t * The list of output clusters.
     * @param options  The options to use when sending the unicast request. See
     * emberSendUnicast() for a description. This parameter is ignored if the target
     * is a broadcast address.
     * @returns An EmberStatus value. EMBER_SUCCESS, MESSAGE_TOO_LONG,
     * EMBER_NETWORK_DOWN or EMBER_NETWORK_BUSY.
     */
    private emberMatchDescriptorsRequest;
    /**
     * ZDO
     * Device Discovery Functions
     * Request the 16 bit network address of a node whose EUI64 is known.
     *
     * @param target           The EUI64 of the node.
     * @param reportKids       true to request that the target list their children
     *                         in the response.
     * @param childStartIndex uint8_t The index of the first child to list in the response.
     *                         Ignored if @c reportKids is false.
     *
     * @return An ::EmberStatus value.
     * - ::EMBER_SUCCESS - The request was transmitted successfully.
     * - ::EMBER_NO_BUFFERS - Insufficient message buffers were available to construct the request.
     * - ::EMBER_NETWORK_DOWN - The node is not part of a network.
     * - ::EMBER_NETWORK_BUSY - Transmission of the request failed.
     */
    private emberNetworkAddressRequest;
    /**
     * ZDO
     * Device Discovery Functions
     * @brief Request the EUI64 of a node whose 16 bit network address is known.
     *
     * @param target uint16_t The network address of the node.
     * @param reportKids uint8_t true to request that the target list their children
     *                         in the response.
     * @param childStartIndex uint8_t The index of the first child to list in the response.
     *                         Ignored if reportKids is false.
     * @param options The options to use when sending the request. See ::emberSendUnicast() for a description.
     *
     * @return An ::EmberStatus value.
     * - ::EMBER_SUCCESS
     * - ::EMBER_NO_BUFFERS
     * - ::EMBER_NETWORK_DOWN
     * - ::EMBER_NETWORK_BUSY
     */
    private emberIeeeAddressRequest;
    /**
     * ZDO
     * @param discoveryNodeId uint16_t
     * @param reportKids uint8_t
     * @param childStartIndex uint8_t
     * @param options
     * @param targetNodeIdOfRequest
     */
    private emberIeeeAddressRequestToTarget;
    /**
     * ZDO
     *
     * @param target uint16_t
     * @param clusterId uint16_t
     * @param options
     * @returns
     */
    private emberSendZigDevRequestTarget;
    /**
     * ZDO
     * @brief Request the specified node to send the simple descriptor for
     * the specified endpoint.
     * The simple descriptor contains information specific
     * to a single endpoint. It describes the application profile identifier,
     * application device identifier, application device version, application flags,
     * application input clusters and application output clusters. It is defined in
     * the ZigBee Application Framework Specification.
     *
     * @param target uint16_t The node of interest.
     * @param targetEndpoint uint8_t The endpoint on the target node whose simple
     * descriptor is desired.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    private emberSimpleDescriptorRequest;
    /**
     * ZDO
     * Common logic used by `emberBindRequest` & `emberUnbindRequest`.
     *
     * @param target
     * @param bindClusterId
     * @param source
     * @param sourceEndpoint
     * @param clusterId
     * @param type
     * @param destination
     * @param groupAddress
     * @param destinationEndpoint
     * @param options
     *
     * @returns An ::EmberStatus value.
     * - ::EMBER_SUCCESS
     * - ::EMBER_NO_BUFFERS
     * - ::EMBER_NETWORK_DOWN
     * - ::EMBER_NETWORK_BUSY
     * @returns APS frame created for the request
     * @returns The tag used on the message.
     */
    private emberSendZigDevBindRequest;
    /**
     * ZDO
     * Send a request to create a binding entry with the specified
     * contents on the specified node.
     *
     * @param target  The node on which the binding will be created.
     * @param source  The source EUI64 in the binding entry.
     * @param sourceEndpoint  The source endpoint in the binding entry.
     * @param clusterId  The cluster ID in the binding entry.
     * @param type  The type of binding, either ::UNICAST_BINDING,
     *   ::MULTICAST_BINDING, or ::UNICAST_MANY_TO_ONE_BINDING.
     *   ::UNICAST_MANY_TO_ONE_BINDING is an Ember-specific extension
     *   and should be used only when the target is an Ember device.
     * @param destination  The destination EUI64 in the binding entry for
     *   ::UNICAST_BINDING or ::UNICAST_MANY_TO_ONE_BINDING.
     * @param groupAddress  The group address for the ::MULTICAST_BINDING.
     * @param destinationEndpoint  The destination endpoint in the binding entry for
     *   the ::UNICAST_BINDING or ::UNICAST_MANY_TO_ONE_BINDING.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @returns An ::EmberStatus value.
     * - ::EMBER_SUCCESS
     * - ::EMBER_NO_BUFFERS
     * - ::EMBER_NETWORK_DOWN
     * - ::EMBER_NETWORK_BUSY
     * @returns APS frame created for the request
     * @returns The tag used on the message.
     */
    private emberBindRequest;
    /**
     * ZDO
     * Send a request to remove a binding entry with the specified
     * contents from the specified node.
     *
     * @param target          The node on which the binding will be removed.
     * @param source          The source EUI64 in the binding entry.
     * @param sourceEndpoint uint8_t The source endpoint in the binding entry.
     * @param clusterId uint16_t      The cluster ID in the binding entry.
     * @param type uint8_t           The type of binding, either ::UNICAST_BINDING,
     *  ::MULTICAST_BINDING, or ::UNICAST_MANY_TO_ONE_BINDING.
     *  ::UNICAST_MANY_TO_ONE_BINDING is an Ember-specific extension
     *  and should be used only when the target is an Ember device.
     * @param destination     The destination EUI64 in the binding entry for the
     *   ::UNICAST_BINDING or ::UNICAST_MANY_TO_ONE_BINDING.
     * @param groupAddress    The group address for the ::MULTICAST_BINDING.
     * @param destinationEndpoint uint8_t The destination endpoint in the binding entry for
     *   the ::UNICAST_BINDING or ::UNICAST_MANY_TO_ONE_BINDING.
     * @param options         The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @returns An ::EmberStatus value.
     * - ::EMBER_SUCCESS
     * - ::EMBER_NO_BUFFERS
     * - ::EMBER_NETWORK_DOWN
     * - ::EMBER_NETWORK_BUSY
     * @returns APS frame created for the request
     * @returns The tag used on the message.
     */
    private emberUnbindRequest;
    /**
     * ZDO
     * Request the specified node to send a list of its active
     * endpoints. An active endpoint is one for which a simple descriptor is
     * available.
     *
     * @param target  The node whose active endpoints are desired.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    private emberActiveEndpointsRequest;
    /**
     * ZDO
     * Request the specified node to send its power descriptor.
     * The power descriptor gives a dynamic indication of the power
     * status of the node. It describes current power mode,
     * available power sources, current power source and
     * current power source level. It is defined in the ZigBee
     * Application Framework Specification.
     *
     * @param target  The node whose power descriptor is desired.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    private emberPowerDescriptorRequest;
    /**
     * ZDO
     * Request the specified node to send its node descriptor.
     * The node descriptor contains information about the capabilities of the ZigBee
     * node. It describes logical type, APS flags, frequency band, MAC capabilities
     * flags, manufacturer code and maximum buffer size. It is defined in the ZigBee
     * Application Framework Specification.
     *
     * @param target  The node whose node descriptor is desired.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An ::EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    private emberNodeDescriptorRequest;
    /**
     * ZDO
     * Request the specified node to send its LQI (neighbor) table.
     * The response gives PAN ID, EUI64, node ID and cost for each neighbor. The
     * EUI64 is only available if security is enabled. The other fields in the
     * response are set to zero. The response format is defined in the ZigBee Device
     * Profile Specification.
     *
     * @param target  The node whose LQI table is desired.
     * @param startIndex uint8_t The index of the first neighbor to include in the
     * response.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    private emberLqiTableRequest;
    /**
     * ZDO
     * Request the specified node to send its routing table.
     * The response gives destination node ID, status and many-to-one flags,
     * and the next hop node ID.
     * The response format is defined in the ZigBee Device
     * Profile Specification.
     *
     * @param target  The node whose routing table is desired.
     * @param startIndex uint8_t The index of the first route entry to include in the
     * response.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    private emberRoutingTableRequest;
    /**
     * ZDO
     * Request the specified node to send its nonvolatile bindings.
     * The response gives source address, source endpoint, cluster ID, destination
     * address and destination endpoint for each binding entry. The response format
     * is defined in the ZigBee Device Profile Specification.
     * Note that bindings that have the Ember-specific ::UNICAST_MANY_TO_ONE_BINDING
     * type are reported as having the standard ::UNICAST_BINDING type.
     *
     * @param target  The node whose binding table is desired.
     * @param startIndex uint8_t The index of the first binding entry to include in the
     * response.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    private emberBindingTableRequest;
    /**
     * ZDO
     *
     * @param clusterId uint16_t
     * @param target
     * @param startIndex uint8_t
     * @param options
     * @returns
     */
    private emberTableRequest;
    /**
     * ZDO
     * Request the specified node to remove the specified device from
     * the network. The device to be removed must be the node to which the request
     * is sent or one of its children.
     *
     * @param target  The node which will remove the device.
     * @param deviceAddress  All zeros if the target is to remove itself from
     *    the network or the EUI64 of a child of the target device to remove
     *    that child.
     * @param leaveRequestFlags uint8_t A bitmask of leave options.
     *   Include ::AND_REJOIN if the target is to rejoin the network immediately after leaving.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    private emberLeaveRequest;
    /**
     * ZDO
     * Request the specified node to allow or disallow association.
     *
     * @param target  The node which will allow or disallow association. The request
     * can be broadcast by using a broadcast address (0xFFFC/0xFFFD/0xFFFF). No
     * response is sent if the request is broadcast.
     * @param duration uint8_t A value of 0x00 disables joining. A value of 0xFF enables
     * joining.  Any other value enables joining for that number of seconds.
     * @param authentication uint8_t Controls Trust Center authentication behavior.
     * @param options  The options to use when sending the request. See
     * emberSendUnicast() for a description. This parameter is ignored if the target
     * is a broadcast address.
     *
     * @return An EmberStatus value. ::EMBER_SUCCESS, ::EMBER_NO_BUFFERS,
     * ::EMBER_NETWORK_DOWN or ::EMBER_NETWORK_BUSY.
     */
    private emberPermitJoiningRequest;
    /**
     * ZDO
     *
     * @see NWK_UPDATE_REQUEST
     *
     * @param target
     * @param scanChannels uint8_t[]
     * @param duration uint8_t
     * @param count uint8_t
     * @param manager
     */
    private emberNetworkUpdateRequest;
    private emberScanChannelsRequest;
    private emberChannelChangeRequest;
    private emberSetActiveChannelsAndNwkManagerIdRequest;
    static isValidPath(path: string): Promise<boolean>;
    static autoDetectPath(): Promise<string>;
    start(): Promise<TsType.StartResult>;
    stop(): Promise<void>;
    getCoordinator(): Promise<TsType.Coordinator>;
    getCoordinatorVersion(): Promise<TsType.CoordinatorVersion>;
    reset(type: "soft" | "hard"): Promise<void>;
    supportsBackup(): Promise<boolean>;
    backup(ieeeAddressesInDatabase: string[]): Promise<Backup>;
    getNetworkParameters(): Promise<TsType.NetworkParameters>;
    supportsChangeChannel(): Promise<boolean>;
    changeChannel(newChannel: number): Promise<void>;
    setTransmitPower(value: number): Promise<void>;
    addInstallCode(ieeeAddress: string, key: Buffer): Promise<void>;
    /** WARNING: Adapter impl. Starts timer immediately upon returning */
    waitFor(networkAddress: number, endpoint: number, frameType: FrameType, direction: Direction, transactionSequenceNumber: number, clusterID: number, commandIdentifier: number, timeout: number): {
        promise: Promise<ZclPayload>;
        cancel: () => void;
    };
    permitJoin(seconds: number, networkAddress: number): Promise<void>;
    lqi(networkAddress: number): Promise<TsType.LQI>;
    routingTable(networkAddress: number): Promise<TsType.RoutingTable>;
    nodeDescriptor(networkAddress: number): Promise<TsType.NodeDescriptor>;
    activeEndpoints(networkAddress: number): Promise<TsType.ActiveEndpoints>;
    simpleDescriptor(networkAddress: number, endpointID: number): Promise<TsType.SimpleDescriptor>;
    bind(destinationNetworkAddress: number, sourceIeeeAddress: string, sourceEndpoint: number, clusterID: number, destinationAddressOrGroup: string | number, type: "endpoint" | "group", destinationEndpoint?: number): Promise<void>;
    unbind(destinationNetworkAddress: number, sourceIeeeAddress: string, sourceEndpoint: number, clusterID: number, destinationAddressOrGroup: string | number, type: "endpoint" | "group", destinationEndpoint: number): Promise<void>;
    removeDevice(networkAddress: number, ieeeAddr: string): Promise<void>;
    sendZclFrameToEndpoint(ieeeAddr: string, networkAddress: number, endpoint: number, zclFrame: ZclFrame, timeout: number, disableResponse: boolean, disableRecovery: boolean, sourceEndpoint?: number): Promise<ZclPayload>;
    sendZclFrameToGroup(groupID: number, zclFrame: ZclFrame, sourceEndpoint?: number): Promise<void>;
    sendZclFrameToAll(endpoint: number, zclFrame: ZclFrame, sourceEndpoint: number): Promise<void>;
    setChannelInterPAN(channel: number): Promise<void>;
    sendZclFrameInterPANToIeeeAddr(zclFrame: ZclFrame, ieeeAddress: string): Promise<void>;
    sendZclFrameInterPANBroadcast(zclFrame: ZclFrame, timeout: number): Promise<ZclPayload>;
    restoreChannelInterPAN(): Promise<void>;
    private checkInterpanLock;
}
export {};
//# sourceMappingURL=emberAdapter.d.ts.map