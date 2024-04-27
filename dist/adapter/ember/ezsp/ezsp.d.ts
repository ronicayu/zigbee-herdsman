/// <reference types="node" />
/// <reference types="node" />
import EventEmitter from "events";
import { SerialPortOptions } from "../../tstype";
import { EmberOutgoingMessageType, EmberCounterType, EmberDutyCycleState, EmberEntropySource, EmberEventUnits, EmberLibraryId, EmberLibraryStatus, EmberMultiPhyNwkConfig, EmberNetworkStatus, EmberNodeType, EmberStatus, EzspNetworkScanType, EzspStatus, SLStatus, EmberIncomingMessageType, EmberSourceRouteDiscoveryMode, EmberMacPassthroughType, EmberKeyStatus, SecManFlag, EmberDeviceUpdate, EmberJoinDecision, EzspZllNetworkOperation, EmberGpSecurityLevel, EmberGpKeyType, EmberTXPowerMode, EmberExtendedSecurityBitmask, EmberStackError } from "../enums";
import { EmberVersion, EmberEUI64, EmberPanId, EmberBeaconData, EmberBeaconIterator, EmberBindingTableEntry, EmberChildData, EmberDutyCycleLimits, EmberMultiPhyRadioParameters, EmberNeighborTableEntry, EmberNetworkInitStruct, EmberNetworkParameters, EmberNodeId, EmberPerDeviceDutyCycle, EmberRouteTableEntry, EmberApsFrame, EmberMulticastTableEntry, EmberBeaconClassificationParams, EmberInitialSecurityState, EmberCurrentSecurityState, SecManContext, SecManKey, SecManNetworkKeyInfo, SecManAPSKeyMetadata, EmberKeyData, EmberAesMmoHashContext, EmberPublicKeyData, EmberCertificateData, EmberSmacData, EmberPublicKey283k1Data, EmberCertificate283k1Data, EmberMessageDigest, EmberSignatureData, EmberSignature283k1Data, EmberPrivateKeyData, EmberZllNetwork, EmberZllInitialSecurityState, EmberZllDeviceInfoRecord, EmberZllAddressAssignment, EmberTokTypeStackZllData, EmberTokTypeStackZllSecurity, EmberGpAddress, EmberGpProxyTableEntry, EmberGpSinkTableEntry, EmberTokenInfo, EmberTokenData, EmberZigbeeNetwork } from "../types";
import { EmberLeaveReason, EmberRejoinReason, EzspConfigId, EzspEndpointFlag, EzspExtendedValueId, EzspMfgTokenId, EzspPolicyId, EzspValueId } from "./enums";
import { UartAsh } from "../uart/ash";
export declare enum EzspEvents {
    ncpNeedsResetAndInit = "ncpNeedsResetAndInit",
    /** params => status: EmberZdoStatus, sender: EmberNodeId, apsFrame: EmberApsFrame, payload: { cluster-dependent @see zdo.ts } */
    ZDO_RESPONSE = "ZDO_RESPONSE",
    /** params => type: EmberIncomingMessageType, apsFrame: EmberApsFrame, lastHopLqi: number, sender: EmberNodeId, messageContents: Buffer */
    INCOMING_MESSAGE = "INCOMING_MESSAGE",
    /** params => sourcePanId: EmberPanId, sourceAddress: EmberEUI64, groupId: number | null, lastHopLqi: number, messageContents: Buffer */
    TOUCHLINK_MESSAGE = "TOUCHLINK_MESSAGE",
    /** params => sender: EmberNodeId, apsFrame: EmberApsFrame, payload: EndDeviceAnnouncePayload */
    END_DEVICE_ANNOUNCE = "END_DEVICE_ANNOUNCE",
    /** params => status: EmberStatus */
    STACK_STATUS = "STACK_STATUS",
    /** params => newNodeId: EmberNodeId, newNodeEui64: EmberEUI64, status: EmberDeviceUpdate, policyDecision: EmberJoinDecision, parentOfNewNodeId: EmberNodeId */
    TRUST_CENTER_JOIN = "TRUST_CENTER_JOIN",
    /** params => type: EmberOutgoingMessageType, indexOrDestination: number, apsFrame: EmberApsFrame, messageTag: number */
    /** params => type: EmberOutgoingMessageType, indexOrDestination: number, apsFrame: EmberApsFrame, messageTag: number */
    MESSAGE_SENT_DELIVERY_FAILED = "MESSAGE_SENT_DELIVERY_FAILED",
    /** params => sequenceNumber: number, commandIdentifier: number, sourceId: number, frameCounter: number, gpdCommandId: number, gpdCommandPayload: Buffer, gpdLink: number */
    GREENPOWER_MESSAGE = "GREENPOWER_MESSAGE"
}
/**
 * Host EZSP layer.
 *
 * Provides functions that allow the Host application to send every EZSP command to the NCP.
 *
 * Commands to send to the serial>ASH layers all are named `ezsp${CommandName}`.
 * They do nothing but build the command, send it and return the value(s).
 * Callers are expected to handle errors appropriately.
 *   - They will throw `EzspStatus` if `sendCommand` fails or the returned value(s) by NCP are invalid (wrong length, etc).
 *   - Most will return `EmberStatus` given by NCP (some `EzspStatus`, some `SLStatus`...).
 *
 * @event 'ncpNeedsResetAndInit(EzspStatus)' An error was detected that requires resetting the NCP.
 */
export declare class Ezsp extends EventEmitter {
    private readonly tickInterval;
    readonly ash: UartAsh;
    private readonly buffalo;
    /** The contents of the current EZSP frame. CAREFUL using this guy, it's pre-allocated. */
    private readonly frameContents;
    /** The total Length of the incoming frame */
    private frameLength;
    private initialVersionSent;
    /** True if a command is in the process of being sent. */
    private sendingCommand;
    /** EZSP frame sequence number. Used in EZSP_SEQUENCE_INDEX byte. */
    private frameSequence;
    /** Sequence used for EZSP send() tagging. static uint8_t */
    private sendSequence;
    /** If if a command is currently waiting for a response. Used to manage async CBs vs command responses */
    private waitingForResponse;
    /** Awaiting response resolve/timer struct. If waitingForResponse is not true, this should not be used. */
    private responseWaiter;
    /** Counter for Queue Full errors */
    counterErrQueueFull: number;
    /** Handle used to tick for possible received callbacks */
    private tickHandle;
    constructor(tickInterval: number, options: SerialPortOptions);
    /**
     * Returns the number of EZSP responses that have been received by the serial
     * protocol and are ready to be collected by the EZSP layer via
     * responseReceived().
     */
    get pendingResponseCount(): number;
    /**
     * Create a string representation of the last frame in storage (sent or received).
     */
    get frameToString(): string;
    private initVariables;
    start(): Promise<EzspStatus>;
    /**
     * Cleanly close down the serial protocol (UART).
     * After this function has been called, init() must be called to resume communication with the NCP.
     */
    stop(): Promise<void>;
    /**
     * Check if connected.
     * If not, attempt to restore the connection.
     *
     * @returns
     */
    checkConnection(): boolean;
    private onAshFatalError;
    private onAshFrame;
    /**
     * Event from the EZSP layer indicating that the transaction with the NCP could not be completed due to a
     * serial protocol error or that the response received from the NCP reported an error.
     * The status parameter provides more information about the error.
     *
     * @param status
     */
    ezspErrorHandler(status: EzspStatus): void;
    /**
     * The Host application must call this function periodically to allow the EZSP layer to handle asynchronous events.
     */
    private tick;
    private nextFrameSequence;
    private startCommand;
    /**
     * Sends the current EZSP command frame. Returns EZSP_SUCCESS if the command was sent successfully.
     * Any other return value means that an error has been detected by the serial protocol layer.
     *
     * if ezsp.sendCommand fails early, this will be:
     *   - EzspStatus.ERROR_INVALID_CALL
     *   - EzspStatus.NOT_CONNECTED
     *   - EzspStatus.ERROR_COMMAND_TOO_LONG
     *
     * if ezsp.sendCommand fails, this will be whatever ash.send returns:
     *   - EzspStatus.SUCCESS
     *   - EzspStatus.NO_TX_SPACE
     *   - EzspStatus.DATA_FRAME_TOO_SHORT
     *   - EzspStatus.DATA_FRAME_TOO_LONG
     *   - EzspStatus.NOT_CONNECTED
     *
     * if ezsp.sendCommand times out, this will be EzspStatus.ASH_ACK_TIMEOUT (XXX: for now)
     *
     * if ezsp.sendCommand resolves, this will be whatever ezsp.responseReceived returns:
     *   - EzspStatus.NO_RX_DATA (should not happen if command was sent (since we subscribe to frame event to trigger function))
     *   - status from EzspFrameID.INVALID_COMMAND status byte
     *   - EzspStatus.ERROR_UNSUPPORTED_CONTROL
     *   - EzspStatus.ERROR_WRONG_DIRECTION
     *   - EzspStatus.ERROR_TRUNCATED
     *   - EzspStatus.SUCCESS
     */
    private sendCommand;
    /**
     * Checks whether a new EZSP response frame has been received.
     * If any, the response payload is stored in frameContents/frameLength.
     * Any other return value means that an error has been detected by the serial protocol layer.
     * @returns NO_RX_DATA if no new response has been received.
     * @returns SUCCESS if a new response has been received.
     */
    checkResponseReceived(): EzspStatus;
    /**
     * Check if a response was received and sets the stage for parsing if valid (indexes buffalo to params index).
     * @returns
     */
    responseReceived(): EzspStatus;
    /**
     * Dispatches callback frames handlers.
     */
    callbackDispatch(): void;
    /**
     *
     * @returns uint8_t
     */
    private nextSendSequence;
    /**
     * Calls ezspSend${x} based on type and takes care of tagging message.
     *
     * Alias types expect `alias` & `sequence` params, along with `apsFrame.radius`.
     *
     * @param type Specifies the outgoing message type.
     * @param indexOrDestination uint16_t Depending on the type of addressing used, this is either the EmberNodeId of the destination,
     *     an index into the address table, or an index into the binding table.
     *     Unused for multicast types.
     *     This must be one of the three ZigBee broadcast addresses for broadcast.
     * @param apsFrame [IN/OUT] EmberApsFrame * The APS frame which is to be added to the message.
     * @param message uint8_t * Content of the message.
     * @param alias The alias source address
     * @param sequence uint8_t The alias sequence number
     * @returns Result of the ezspSend${x} call or EmberStatus.BAD_ARGUMENT if type not supported.
     * @returns apsSequence as returned by ezspSend${x} command
     * @returns messageTag Tag used for ezspSend${x} command
     */
    send(type: EmberOutgoingMessageType, indexOrDestination: number, apsFrame: EmberApsFrame, message: Buffer, alias: EmberNodeId, sequence: number): Promise<[EmberStatus, messageTag: number]>;
    /**
     * Retrieving the new version info.
     * Wrapper for `ezspGetValue`.
     * @returns Send status
     * @returns EmberVersion*, null if status not SUCCESS.
     */
    ezspGetVersionStruct(): Promise<[EzspStatus, version: EmberVersion]>;
    /**
     * Function for manipulating the endpoints flags on the NCP.
     * Wrapper for `ezspGetExtendedValue`
     * @param endpoint uint8_t
     * @param flags EzspEndpointFlags
     * @returns EzspStatus
     */
    ezspSetEndpointFlags(endpoint: number, flags: EzspEndpointFlag): Promise<EzspStatus>;
    /**
     * Function for manipulating the endpoints flags on the NCP.
     * Wrapper for `ezspGetExtendedValue`.
     * @param endpoint uint8_t
     * @returns EzspStatus
     * @returns flags
     */
    ezspGetEndpointFlags(endpoint: number): Promise<[EzspStatus, flags: EzspEndpointFlag]>;
    /**
     * Wrapper for `ezspGetExtendedValue`.
     * @param EmberNodeId
     * @param destination
     * @returns EzspStatus
     * @returns overhead uint8_t
     */
    ezspGetSourceRouteOverhead(destination: EmberNodeId): Promise<[EzspStatus, overhead: number]>;
    /**
     * Wrapper for `ezspGetExtendedValue`.
     * @returns EzspStatus
     * @returns reason
     * @returns nodeId EmberNodeId*
     */
    ezspGetLastLeaveReason(): Promise<[EzspStatus, reason: EmberLeaveReason, nodeId: EmberNodeId]>;
    /**
     * Wrapper for `ezspGetValue`.
     * @returns EzspStatus
     * @returns reason
     */
    ezspGetLastRejoinReason(): Promise<[EzspStatus, reason: EmberRejoinReason]>;
    /**
     * Wrapper for `ezspSetValue`.
     * @param mask
     * @returns
     */
    ezspSetExtendedSecurityBitmask(mask: EmberExtendedSecurityBitmask): Promise<EzspStatus>;
    /**
     * Wrapper for `ezspGetValue`.
     * @returns
     */
    ezspGetExtendedSecurityBitmask(): Promise<[EzspStatus, mask: EmberExtendedSecurityBitmask]>;
    /**
     * Wrapper for `ezspSetValue`.
     * @returns
     */
    ezspStartWritingStackTokens(): Promise<EzspStatus>;
    /**
     * Wrapper for `ezspSetValue`.
     * @returns
     */
    ezspStopWritingStackTokens(): Promise<EzspStatus>;
    /**
     * The command allows the Host to specify the desired EZSP version and must be
     * sent before any other command. The response provides information about the
     * firmware running on the NCP.
     *
     * @param desiredProtocolVersion uint8_t The EZSP version the Host wishes to use.
     *        To successfully set the version and allow other commands, this must be same as EZSP_PROTOCOL_VERSION.
     * @return
     * - uint8_t The EZSP version the NCP is using.
     * - uint8_t * The type of stack running on the NCP (2).
     * - uint16_t * The version number of the stack.
     */
    ezspVersion(desiredProtocolVersion: number): Promise<[protocolVersion: number, stackType: number, stackVersion: number]>;
    /**
     * Reads a configuration value from the NCP.
     *
     * @param configId Identifies which configuration value to read.
     * @returns
     * - EzspStatus.SUCCESS if the value was read successfully,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize configId.
     * - uint16_t * The configuration value.
     */
    ezspGetConfigurationValue(configId: EzspConfigId): Promise<[EzspStatus, value: number]>;
    /**
     * Writes a configuration value to the NCP. Configuration values can be modified
     * by the Host after the NCP has reset. Once the status of the stack changes to
     * EMBER_NETWORK_UP, configuration values can no longer be modified and this
     * command will respond with EzspStatus.ERROR_INVALID_CALL.
     *
     * @param configId Identifies which configuration value to change.
     * @param value uint16_t The new configuration value.
     * @returns EzspStatus
     * - EzspStatus.SUCCESS if the configuration value was changed,
     * - EzspStatus.ERROR_OUT_OF_MEMORY if the new value exceeded the available memory,
     * - EzspStatus.ERROR_INVALID_VALUE if the new value was out of bounds,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize configId,
     * - EzspStatus.ERROR_INVALID_CALL if configuration values can no longer be modified.
     */
    ezspSetConfigurationValue(configId: EzspConfigId, value: number): Promise<EzspStatus>;
    /**
     * Read attribute data on NCP endpoints.
     * @param endpoint uint8_t Endpoint
     * @param cluster uint16_t Cluster.
     * @param attributeId uint16_t Attribute ID.
     * @param mask uint8_t Mask.
     * @param manufacturerCode uint16_t Manufacturer code.
     * @returns
     * - An EmberStatus value indicating success or the reason for failure.
     * - uint8_t * Attribute data type.
     * - uint8_t * Length of attribute data.
     * - uint8_t * Attribute data.
     */
    ezspReadAttribute(endpoint: number, cluster: number, attributeId: number, mask: number, manufacturerCode: number, readLength: number): Promise<[EmberStatus, dataType: number, outReadLength: number, data: number[]]>;
    /**
     * Write attribute data on NCP endpoints.
     * @param endpoint uint8_t Endpoint
     * @param cluster uint16_t Cluster.
     * @param attributeId uint16_t Attribute ID.
     * @param mask uint8_t Mask.
     * @param manufacturerCode uint16_t Manufacturer code.
     * @param overrideReadOnlyAndDataType Override read only and data type.
     * @param justTest Override read only and data type.
     * @param dataType uint8_t Attribute data type.
     * @param data uint8_t * Attribute data.
     * @returns EmberStatus An EmberStatus value indicating success or the reason for failure.
     */
    ezspWriteAttribute(endpoint: number, cluster: number, attributeId: number, mask: number, manufacturerCode: number, overrideReadOnlyAndDataType: boolean, justTest: boolean, dataType: number, data: Buffer): Promise<EmberStatus>;
    /**
     * Configures endpoint information on the NCP. The NCP does not remember these
     * settings after a reset. Endpoints can be added by the Host after the NCP has
     * reset. Once the status of the stack changes to EMBER_NETWORK_UP, endpoints
     * can no longer be added and this command will respond with EzspStatus.ERROR_INVALID_CALL.
     * @param endpoint uint8_t The application endpoint to be added.
     * @param profileId uint16_t The endpoint's application profile.
     * @param deviceId uint16_t The endpoint's device ID within the application profile.
     * @param deviceVersion uint8_t The endpoint's device version.
     * @param inputClusterList uint16_t * Input cluster IDs the endpoint will accept.
     * @param outputClusterList uint16_t * Output cluster IDs the endpoint may send.
     * @returns EzspStatus
     * - EzspStatus.SUCCESS if the endpoint was added,
     * - EzspStatus.ERROR_OUT_OF_MEMORY if there is not enough memory available to add the endpoint,
     * - EzspStatus.ERROR_INVALID_VALUE if the endpoint already exists,
     * - EzspStatus.ERROR_INVALID_CALL if endpoints can no longer be added.
     */
    ezspAddEndpoint(endpoint: number, profileId: number, deviceId: number, deviceVersion: number, inputClusterList: number[], outputClusterList: number[]): Promise<EzspStatus>;
    /**
     * Allows the Host to change the policies used by the NCP to make fast
     * decisions.
     * @param policyId Identifies which policy to modify.
     * @param decisionId The new decision for the specified policy.
     * @returns
     * - EzspStatus.SUCCESS if the policy was changed,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize policyId.
     */
    ezspSetPolicy(policyId: EzspPolicyId, decisionId: number): Promise<EzspStatus>;
    /**
     * Allows the Host to read the policies used by the NCP to make fast decisions.
     * @param policyId Identifies which policy to read.
     * @returns
     * - EzspStatus.SUCCESS if the policy was read successfully,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize policyId.
     * - EzspDecisionId * The current decision for the specified policy.
     */
    ezspGetPolicy(policyId: EzspPolicyId): Promise<[EzspStatus, number]>;
    /**
     * Triggers a pan id update message.
     * @param The new Pan Id
     * @returns true if the request was successfully handed to the stack, false otherwise
     */
    ezspSendPanIdUpdate(newPan: EmberPanId): Promise<boolean>;
    /**
     * Reads a value from the NCP.
     * @param valueId Identifies which value to read.
     * @returns
     * - EzspStatus.SUCCESS if the value was read successfully,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize valueId,
     * - EzspStatus.ERROR_INVALID_VALUE if the length of the returned value exceeds the size of local storage allocated to receive it.
     * - uint8_t * Both a command and response parameter.
     *   On command, the maximum in bytes of local storage allocated to receive the returned value.
     *   On response, the actual length in bytes of the returned value.
     * - uint8_t * The value.
     */
    ezspGetValue(valueId: EzspValueId, valueLength: number): Promise<[EzspStatus, outValueLength: number, outValue: number[]]>;
    /**
     * Reads a value from the NCP but passes an extra argument specific to the value
     * being retrieved.
     * @param valueId Identifies which extended value ID to read.
     * @param characteristics uint32_t Identifies which characteristics of the extended value ID to read. These are specific to the value being read.
     * @returns
     * - EzspStatus.SUCCESS if the value was read successfully,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize valueId,
     * - EzspStatus.ERROR_INVALID_VALUE if the length of the returned value exceeds the size of local storage allocated to receive it.
     * - uint8_t * Both a command and response parameter.
     *   On command, the maximum in bytes of local storage allocated to receive the returned value.
     *   On response, the actual length in bytes of the returned value.
     * - uint8_t * The value.
     */
    ezspGetExtendedValue(valueId: EzspExtendedValueId, characteristics: number, valueLength: number): Promise<[EzspStatus, outValueLength: number, outValue: number[]]>;
    /**
     * Writes a value to the NCP.
     * @param valueId Identifies which value to change.
     * @param valueLength uint8_t The length of the value parameter in bytes.
     * @param value uint8_t * The new value.
     * @returns EzspStatus
     * - EzspStatus.SUCCESS if the value was changed,
     * - EzspStatus.ERROR_INVALID_VALUE if the new value was out of bounds,
     * - EzspStatus.ERROR_INVALID_ID if the NCP does not recognize valueId,
     * - EzspStatus.ERROR_INVALID_CALL if the value could not be modified.
     */
    ezspSetValue(valueId: EzspValueId, valueLength: number, value: number[]): Promise<EzspStatus>;
    /**
     * Allows the Host to control the broadcast behaviour of a routing device used
     * by the NCP.
     * @param config uint8_t Passive ack config enum.
     * @param minAcksNeeded uint8_t The minimum number of acknowledgments (re-broadcasts) to wait for until
     *        deeming the broadcast transmission complete.
     * @returns EmberStatus An EmberStatus value indicating success or the reason for failure.
     */
    ezspSetPassiveAckConfig(config: number, minAcksNeeded: number): Promise<EmberStatus>;
    /**
     * A command which does nothing. The Host can use this to set the sleep mode or to check the status of the NCP.
     */
    ezspNop(): Promise<void>;
    /**
     * Variable length data from the Host is echoed back by the NCP. This command
     * has no other effects and is designed for testing the link between the Host and NCP.
     * @param data uint8_t * The data to be echoed back.
     * @returns
     * - The length of the echo parameter in bytes.
     * - echo uint8_t * The echo of the data.
     */
    ezspEcho(data: Buffer): Promise<Buffer>;
    /**
     * Allows the NCP to respond with a pending callback.
     */
    ezspCallback(): Promise<void>;
    /**
     * Callback
     * Indicates that there are currently no pending callbacks.
     */
    ezspNoCallbacks(): void;
    /**
     * Sets a token (8 bytes of non-volatile storage) in the Simulated EEPROM of the NCP.
     * @param tokenId uint8_t Which token to set
     * @param tokenData uint8_t * The data to write to the token.
     * @returns EmberStatus An EmberStatus value indicating success or the reason for failure.
     */
    ezspSetToken(tokenId: number, tokenData: number[]): Promise<EmberStatus>;
    /**
     * Retrieves a token (8 bytes of non-volatile storage) from the Simulated EEPROM of the NCP.
     * @param tokenId uint8_t Which token to read
     * @returns
     * - An EmberStatus value indicating success or the reason for failure.
     * - uint8_t * The contents of the token.
     */
    ezspGetToken(tokenId: number): Promise<[EmberStatus, tokenData: number[]]>;
    /**
     * Retrieves a manufacturing token from the Flash Information Area of the NCP
     * (except for EZSP_STACK_CAL_DATA which is managed by the stack).
     * @param  Which manufacturing token to read.
     * @returns
     * - uint8_t The length of the tokenData parameter in bytes.
     * - uint8_t * The manufacturing token data.
     */
    ezspGetMfgToken(tokenId: EzspMfgTokenId): Promise<[number, tokenData: number[]]>;
    /**
     * Sets a manufacturing token in the Customer Information Block (CIB) area of
     * the NCP if that token currently unset (fully erased). Cannot be used with
     * EZSP_STACK_CAL_DATA, EZSP_STACK_CAL_FILTER, EZSP_MFG_ASH_CONFIG, or
     * EZSP_MFG_CBKE_DATA token.
     * @param tokenId Which manufacturing token to set.
     * @param tokenData uint8_t * The manufacturing token data.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspSetMfgToken(tokenId: EzspMfgTokenId, tokenData: Buffer): Promise<EmberStatus>;
    /**
     * Callback
     * A callback invoked to inform the application that a stack token has changed.
     * @param tokenAddress uint16_t The address of the stack token that has changed.
     */
    ezspStackTokenChangedHandler(tokenAddress: number): void;
    /**
     * Returns a pseudorandom number.
     * @returns
     * - Always returns EMBER_SUCCESS.
     * - uint16_t * A pseudorandom number.
     */
    ezspGetRandomNumber(): Promise<[EmberStatus, value: number]>;
    /**
     * Sets a timer on the NCP. There are 2 independent timers available for use by the Host.
     * A timer can be cancelled by setting time to 0 or units to EMBER_EVENT_INACTIVE.
     * @param timerId uint8_t Which timer to set (0 or 1).
     * @param time uint16_t The delay before the timerHandler callback will be generated.
     *        Note that the timer clock is free running and is not synchronized with this command.
     *        This means that the actual delay will be between time and (time - 1). The maximum delay is 32767.
     * @param units The units for time.
     * @param repeat If true, a timerHandler callback will be generated repeatedly. If false, only a single timerHandler callback will be generated.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspSetTimer(timerId: number, time: number, units: EmberEventUnits, repeat: boolean): Promise<EmberStatus>;
    /**
     * Gets information about a timer. The Host can use this command to find out how
     * much longer it will be before a previously set timer will generate a
     * callback.
     * @param timerId uint8_t Which timer to get information about (0 or 1).
     * @returns
     * - uint16_t The delay before the timerHandler callback will be generated.
     * - EmberEventUnits * The units for time.
     * - bool * True if a timerHandler callback will be generated repeatedly. False if only a single timerHandler callback will be generated.
     */
    ezspGetTimer(timerId: number): Promise<[number, units: EmberEventUnits, repeat: boolean]>;
    /**
     * Callback
     * A callback from the timer.
     * @param timerId uint8_t Which timer generated the callback (0 or 1).
     */
    ezspTimerHandler(timerId: number): void;
    /**
     * Sends a debug message from the Host to the Network Analyzer utility via the NCP.
     * @param binaryMessage true if the message should be interpreted as binary data, false if the message should be interpreted as ASCII text.
     * @param messageContents uint8_t * The binary message.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspDebugWrite(binaryMessage: boolean, messageContents: Buffer): Promise<EmberStatus>;
    /**
     * Retrieves and clears Ember counters. See the EmberCounterType enumeration for the counter types.
     * @returns uint16_t * A list of all counter values ordered according to the EmberCounterType enumeration.
     */
    ezspReadAndClearCounters(): Promise<number[]>;
    /**
     * Retrieves Ember counters. See the EmberCounterType enumeration for the counter types.
     * @returns uint16_t * A list of all counter values ordered according to the EmberCounterType enumeration.
     */
    ezspReadCounters(): Promise<number[]>;
    /**
     * Callback
     * This call is fired when a counter exceeds its threshold
     * @param type Type of Counter
     */
    ezspCounterRolloverHandler(type: EmberCounterType): void;
    /**
     * Used to test that UART flow control is working correctly.
     * @param delay uint16_t Data will not be read from the host for this many milliseconds.
     */
    ezspDelayTest(delay: number): Promise<void>;
    /**
     * This retrieves the status of the passed library ID to determine if it is compiled into the stack.
     * @param libraryId The ID of the library being queried.
     * @returns The status of the library being queried.
     */
    ezspGetLibraryStatus(libraryId: EmberLibraryId): Promise<EmberLibraryStatus>;
    /**
     * Allows the HOST to know whether the NCP is running the XNCP library. If so,
     * the response contains also the manufacturer ID and the version number of the
     * XNCP application that is running on the NCP.
     * @returns
     * - EMBER_SUCCESS if the NCP is running the XNCP library,
     * - EMBER_INVALID_CALL otherwise.
     * - manufacturerId uint16_t * The manufactured ID the user has defined in the XNCP application.
     * - versionNumber uint16_t * The version number of the XNCP application.
     */
    ezspGetXncpInfo(): Promise<[EmberStatus, manufacturerId: number, versionNumber: number]>;
    /**
     * Provides the customer a custom EZSP frame. On the NCP, these frames are only
     * handled if the XNCP library is included. On the NCP side these frames are
     * handled in the emberXNcpIncomingCustomEzspMessageCallback() callback
     * function.
     * @param uint8_t * The payload of the custom frame (maximum 119 bytes).
     * @param uint8_t The expected length of the response.
     * @returns
     * - The status returned by the custom command.
     * - uint8_t *The response.
     */
    ezspCustomFrame(payload: Buffer, replyLength: number): Promise<[EmberStatus, outReply: Buffer]>;
    /**
     * Callback
     * A callback indicating a custom EZSP message has been received.
     * @param payloadLength uint8_t The length of the custom frame payload.
     * @param payload uint8_t * The payload of the custom frame.
     */
    ezspCustomFrameHandler(payloadLength: number, payload: number[]): void;
    /**
     * Returns the EUI64 ID of the local node.
     * @returns The 64-bit ID.
     */
    ezspGetEui64(): Promise<EmberEUI64>;
    /**
     * Returns the 16-bit node ID of the local node.
     * @returns The 16-bit ID.
     */
    ezspGetNodeId(): Promise<EmberNodeId>;
    /**
     * Returns number of phy interfaces present.
     * @returns uint8_t Value indicate how many phy interfaces present.
     */
    ezspGetPhyInterfaceCount(): Promise<number>;
    /**
     * Returns the entropy source used for true random number generation.
     * @returns Value indicates the used entropy source.
     */
    ezspGetTrueRandomEntropySource(): Promise<EmberEntropySource>;
    /**
     * Sets the manufacturer code to the specified value.
     * The manufacturer code is one of the fields of the node descriptor.
     * @param code uint16_t The manufacturer code for the local node.
     */
    ezspSetManufacturerCode(code: number): Promise<void>;
    /**
     * Sets the power descriptor to the specified value. The power descriptor is a
     * dynamic value. Therefore, you should call this function whenever the value
     * changes.
     * @param descriptor uint16_t The new power descriptor for the local node.
     */
    ezspSetPowerDescriptor(descriptor: number): Promise<void>;
    /**
     * Resume network operation after a reboot. The node retains its original type.
     * This should be called on startup whether or not the node was previously part
     * of a network. EMBER_NOT_JOINED is returned if the node is not part of a
     * network. This command accepts options to control the network initialization.
     * @param networkInitStruct EmberNetworkInitStruct * An EmberNetworkInitStruct containing the options for initialization.
     * @returns An EmberStatus value that indicates one of the following: successful
     * initialization, EMBER_NOT_JOINED if the node is not part of a network, or the
     * reason for failure.
     */
    ezspNetworkInit(networkInitStruct: EmberNetworkInitStruct): Promise<EmberStatus>;
    /**
     * Returns a value indicating whether the node is joining, joined to, or leaving a network.
     * @returns Command send status.
     * @returns An EmberNetworkStatus value indicating the current join status.
     */
    ezspNetworkState(): Promise<EmberNetworkStatus>;
    /**
     * Callback
     * A callback invoked when the status of the stack changes. If the status
     * parameter equals EMBER_NETWORK_UP, then the getNetworkParameters command can
     * be called to obtain the new network parameters. If any of the parameters are
     * being stored in nonvolatile memory by the Host, the stored values should be
     * updated.
     * @param status Stack status
     */
    ezspStackStatusHandler(status: EmberStatus): void;
    /**
     * This function will start a scan.
     * @param scanType Indicates the type of scan to be performed. Possible values are: EZSP_ENERGY_SCAN and EZSP_ACTIVE_SCAN.
     *        For each type, the respective callback for reporting results is: energyScanResultHandler and networkFoundHandler.
     *        The energy scan and active scan report errors and completion via the scanCompleteHandler.
     * @param channelMask uint32_t Bits set as 1 indicate that this particular channel should be scanned.
     *        Bits set to 0 indicate that this particular channel should not be scanned. For example, a channelMask value of 0x00000001
     *        would indicate that only channel 0 should be scanned. Valid channels range from 11 to 26 inclusive.
     *        This translates to a channel mask value of 0x07FFF800.
     *        As a convenience, a value of 0 is reinterpreted as the mask for the current channel.
     * @param duration uint8_t Sets the exponent of the number of scan periods, where a scan period is 960 symbols.
     *        The scan will occur for ((2^duration) + 1) scan periods.
     * @returns
     * - SL_STATUS_OK signals that the scan successfully started. Possible error responses and their meanings:
     * - SL_STATUS_MAC_SCANNING, we are already scanning;
     * - SL_STATUS_BAD_SCAN_DURATION, we have set a duration value that is not 0..14 inclusive;
     * - SL_STATUS_MAC_INCORRECT_SCAN_TYPE, we have requested an undefined scanning type;
     * - SL_STATUS_INVALID_CHANNEL_MASK, our channel mask did not specify any valid channels.
     */
    ezspStartScan(scanType: EzspNetworkScanType, channelMask: number, duration: number): Promise<SLStatus>;
    /**
     * Callback
     * Reports the result of an energy scan for a single channel. The scan is not
     * complete until the scanCompleteHandler callback is called.
     * @param channel uint8_t The 802.15.4 channel number that was scanned.
     * @param maxRssiValue int8_t The maximum RSSI value found on the channel.
     */
    ezspEnergyScanResultHandler(channel: number, maxRssiValue: number): void;
    /**
     * Callback
     * Reports that a network was found as a result of a prior call to startScan.
     * Gives the network parameters useful for deciding which network to join.
     * @param networkFound EmberZigbeeNetwork * The parameters associated with the network found.
     * @param lastHopLqi uint8_t The link quality from the node that generated this beacon.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during the reception.
     */
    ezspNetworkFoundHandler(networkFound: EmberZigbeeNetwork, lastHopLqi: number, lastHopRssi: number): void;
    /**
     * Callback
     * @param channel uint8_t The channel on which the current error occurred. Undefined for the case of EMBER_SUCCESS.
     * @param status The error condition that occurred on the current channel. Value will be EMBER_SUCCESS when the scan has completed.
     * Returns the status of the current scan of type EZSP_ENERGY_SCAN or
     * EZSP_ACTIVE_SCAN. EMBER_SUCCESS signals that the scan has completed. Other
     * error conditions signify a failure to scan on the channel specified.
     */
    ezspScanCompleteHandler(channel: number, status: EmberStatus): void;
    /**
     * Callback
     * This function returns an unused panID and channel pair found via the find
     * unused panId scan procedure.
     * @param The unused panID which has been found.
     * @param channel uint8_t The channel that the unused panID was found on.
     */
    ezspUnusedPanIdFoundHandler(panId: EmberPanId, channel: number): void;
    /**
     * This function starts a series of scans which will return an available panId.
     * @param channelMask uint32_t The channels that will be scanned for available panIds.
     * @param duration uint8_t The duration of the procedure.
     * @returns The error condition that occurred during the scan. Value will be
     * EMBER_SUCCESS if there are no errors.
     */
    ezspFindUnusedPanId(channelMask: number, duration: number): Promise<EmberStatus>;
    /**
     * Terminates a scan in progress.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspStopScan(): Promise<EmberStatus>;
    /**
     * Forms a new network by becoming the coordinator.
     * @param parameters EmberNetworkParameters * Specification of the new network.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspFormNetwork(parameters: EmberNetworkParameters): Promise<EmberStatus>;
    /**
     * Causes the stack to associate with the network using the specified network
     * parameters. It can take several seconds for the stack to associate with the
     * local network. Do not send messages until the stackStatusHandler callback
     * informs you that the stack is up.
     * @param nodeType Specification of the role that this node will have in the network.
     *        This role must not be EMBER_COORDINATOR. To be a coordinator, use the formNetwork command.
     * @param parameters EmberNetworkParameters * Specification of the network with which the node should associate.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspJoinNetwork(nodeType: EmberNodeType, parameters: EmberNetworkParameters): Promise<EmberStatus>;
    /**
     * Causes the stack to associate with the network using the specified network
     * parameters in the beacon parameter. It can take several seconds for the stack
     * to associate with the local network. Do not send messages until the
     * stackStatusHandler callback informs you that the stack is up. Unlike
     * ::emberJoinNetwork(), this function does not issue an active scan before
     * joining. Instead, it will cause the local node to issue a MAC Association
     * Request directly to the specified target node. It is assumed that the beacon
     * parameter is an artifact after issuing an active scan. (For more information,
     * see emberGetBestBeacon and emberGetNextBeacon.)
     * @param localNodeType Specifies the role that this node will have in the network. This role must not be EMBER_COORDINATOR.
     *        To be a coordinator, use the formNetwork command.
     * @param beacon EmberBeaconData * Specifies the network with which the node should associate.
     * @param radioTxPower int8_t The radio transmit power to use, specified in dBm.
     * @param clearBeaconsAfterNetworkUp If true, clear beacons in cache upon join success. If join fail, do nothing.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspJoinNetworkDirectly(localNodeType: EmberNodeType, beacon: EmberBeaconData, radioTxPower: number, clearBeaconsAfterNetworkUp: boolean): Promise<EmberStatus>;
    /**
     * Causes the stack to leave the current network. This generates a
     * stackStatusHandler callback to indicate that the network is down. The radio
     * will not be used until after sending a formNetwork or joinNetwork command.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspLeaveNetwork(): Promise<EmberStatus>;
    /**
     * The application may call this function when contact with the network has been
     * lost. The most common usage case is when an end device can no longer
     * communicate with its parent and wishes to find a new one. Another case is
     * when a device has missed a Network Key update and no longer has the current
     * Network Key.  The stack will call ezspStackStatusHandler to indicate that the
     * network is down, then try to re-establish contact with the network by
     * performing an active scan, choosing a network with matching extended pan id,
     * and sending a ZigBee network rejoin request. A second call to the
     * ezspStackStatusHandler callback indicates either the success or the failure
     * of the attempt. The process takes approximately 150 milliseconds per channel
     * to complete.
     * @param haveCurrentNetworkKey This parameter tells the stack whether to try to use the current network key.
     *        If it has the current network key it will perform a secure rejoin (encrypted). If this fails the device should try an unsecure rejoin.
     *        If the Trust Center allows the rejoin then the current Network Key will be sent encrypted using the device's Link Key.
     * @param channelMask uint32_t A mask indicating the channels to be scanned. See emberStartScan for format details.
     *        A value of 0 is reinterpreted as the mask for the current channel.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspFindAndRejoinNetwork(haveCurrentNetworkKey: boolean, channelMask: number): Promise<EmberStatus>;
    /**
     * Tells the stack to allow other nodes to join the network with this node as
     * their parent. Joining is initially disabled by default.
     * @param duration uint8_t A value of 0x00 disables joining. A value of 0xFF enables joining.
     *        Any other value enables joining for that number of seconds.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspPermitJoining(duration: number): Promise<EmberStatus>;
    /**
     * Callback
     * Indicates that a child has joined or left.
     * @param index uint8_t The index of the child of interest.
     * @param joining True if the child is joining. False the child is leaving.
     * @param childId The node ID of the child.
     * @param childEui64 The EUI64 of the child.
     * @param childType The node type of the child.
     */
    ezspChildJoinHandler(index: number, joining: boolean, childId: EmberNodeId, childEui64: EmberEUI64, childType: EmberNodeType): void;
    /**
     * Sends a ZDO energy scan request. This request may only be sent by the current
     * network manager and must be unicast, not broadcast. See ezsp-utils.h for
     * related macros emberSetNetworkManagerRequest() and
     * emberChangeChannelRequest().
     * @param target The network address of the node to perform the scan.
     * @param scanChannels uint32_t A mask of the channels to be scanned
     * @param scanDuration uint8_t How long to scan on each channel.
     *        Allowed values are 0..5, with the scan times as specified by 802.15.4 (0 = 31ms, 1 = 46ms, 2 = 77ms, 3 = 138ms, 4 = 261ms, 5 = 507ms).
     * @param scanCount uint16_t The number of scans to be performed on each channel (1..8).
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspEnergyScanRequest(target: EmberNodeId, scanChannels: number, scanDuration: number, scanCount: number): Promise<EmberStatus>;
    /**
     * Returns the current network parameters.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberNodeType * An EmberNodeType value indicating the current node type.
     * @returns EmberNetworkParameters * The current network parameters.
     */
    ezspGetNetworkParameters(): Promise<[EmberStatus, nodeType: EmberNodeType, parameters: EmberNetworkParameters]>;
    /**
     * Returns the current radio parameters based on phy index.
     * @param phyIndex uint8_t Desired index of phy interface for radio parameters.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberMultiPhyRadioParameters * The current radio parameters based on provided phy index.
     */
    ezspGetRadioParameters(phyIndex: number): Promise<[EmberStatus, parameters: EmberMultiPhyRadioParameters]>;
    /**
     * Returns information about the children of the local node and the parent of
     * the local node.
     * @returns uint8_t The number of children the node currently has.
     * @returns The parent's EUI64. The value is undefined for nodes without parents (coordinators and nodes that are not joined to a network).
     * @returns EmberNodeId * The parent's node ID. The value is undefined for nodes without parents
     *          (coordinators and nodes that are not joined to a network).
     */
    ezspGetParentChildParameters(): Promise<[number, parentEui64: EmberEUI64, parentNodeId: EmberNodeId]>;
    /**
     * Returns information about a child of the local node.
     * @param uint8_t The index of the child of interest in the child table. Possible indexes range from zero to EMBER_CHILD_TABLE_SIZE.
     * @returns EMBER_SUCCESS if there is a child at index. EMBER_NOT_JOINED if there is no child at index.
     * @returns EmberChildData * The data of the child.
     */
    ezspGetChildData(index: number): Promise<[EmberStatus, childData: EmberChildData]>;
    /**
     * Sets child data to the child table token.
     * @param index uint8_t The index of the child of interest in the child table. Possible indexes range from zero to (EMBER_CHILD_TABLE_SIZE - 1).
     * @param childData EmberChildData * The data of the child.
     * @returns EMBER_SUCCESS if the child data is set successfully at index. EMBER_INDEX_OUT_OF_RANGE if provided index is out of range.
     */
    ezspSetChildData(index: number, childData: EmberChildData): Promise<EmberStatus>;
    /**
     * Convert a child index to a node ID
     * @param childIndex uint8_t The index of the child of interest in the child table. Possible indexes range from zero to EMBER_CHILD_TABLE_SIZE.
     * @returns The node ID of the child or EMBER_NULL_NODE_ID if there isn't a child at the childIndex specified
     */
    ezspChildId(childIndex: number): Promise<EmberNodeId>;
    /**
     * Convert a node ID to a child index
     * @param childId The node ID of the child
     * @returns uint8_t The child index or 0xFF if the node ID doesn't belong to a child
     */
    ezspChildIndex(childId: EmberNodeId): Promise<number>;
    /**
     * Returns the source route table total size.
     * @returns uint8_t Total size of source route table.
     */
    ezspGetSourceRouteTableTotalSize(): Promise<number>;
    /**
     * Returns the number of filled entries in source route table.
     * @returns uint8_t The number of filled entries in source route table.
     */
    ezspGetSourceRouteTableFilledSize(): Promise<number>;
    /**
     * Returns information about a source route table entry
     * @param index uint8_t The index of the entry of interest in the source route table.
     *        Possible indexes range from zero to SOURCE_ROUTE_TABLE_FILLED_SIZE.
     * @returns EMBER_SUCCESS if there is source route entry at index. EMBER_NOT_FOUND if there is no source route at index.
     * @returns EmberNodeId * The node ID of the destination in that entry.
     * @returns uint8_t * The closer node index for this source route table entry
     */
    ezspGetSourceRouteTableEntry(index: number): Promise<[EmberStatus, destination: EmberNodeId, closerIndex: number]>;
    /**
     * Returns the neighbor table entry at the given index. The number of active
     * neighbors can be obtained using the neighborCount command.
     * @param index uint8_t The index of the neighbor of interest. Neighbors are stored in ascending order by node id,
     *        with all unused entries at the end of the table.
     * @returns EMBER_ERR_FATAL if the index is greater or equal to the number of active neighbors, or if the device is an end device.
     *          Returns EMBER_SUCCESS otherwise.
     * @returns EmberNeighborTableEntry * The contents of the neighbor table entry.
     */
    ezspGetNeighbor(index: number): Promise<[EmberStatus, value: EmberNeighborTableEntry]>;
    /**
     * Return EmberStatus depending on whether the frame counter of the node is
     * found in the neighbor or child table. This function gets the last received
     * frame counter as found in the Network Auxiliary header for the specified
     * neighbor or child
     * @param eui64 eui64 of the node
     * @returns Return EMBER_NOT_FOUND if the node is not found in the neighbor or child table. Returns EMBER_SUCCESS otherwise
     * @returns uint32_t * Return the frame counter of the node from the neighbor or child table
     */
    ezspGetNeighborFrameCounter(eui64: EmberEUI64): Promise<[EmberStatus, returnFrameCounter: number]>;
    /**
     * Sets the frame counter for the neighbour or child.
     * @param eui64 eui64 of the node
     * @param frameCounter uint32_t Return the frame counter of the node from the neighbor or child table
     * @returns
     * - EMBER_NOT_FOUND if the node is not found in the neighbor or child table.
     * - EMBER_SUCCESS otherwise
     */
    ezspSetNeighborFrameCounter(eui64: EmberEUI64, frameCounter: number): Promise<EmberStatus>;
    /**
     * Sets the routing shortcut threshold to directly use a neighbor instead of
     * performing routing.
     * @param costThresh uint8_t The routing shortcut threshold to configure.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspSetRoutingShortcutThreshold(costThresh: number): Promise<EmberStatus>;
    /**
     * Gets the routing shortcut threshold used to differentiate between directly
     * using a neighbor vs. performing routing.
     * @returns uint8_t The routing shortcut threshold
     */
    ezspGetRoutingShortcutThreshold(): Promise<number>;
    /**
     * Returns the number of active entries in the neighbor table.
     * @returns uint8_t The number of active entries in the neighbor table.
     */
    ezspNeighborCount(): Promise<number>;
    /**
     * Returns the route table entry at the given index. The route table size can be
     * obtained using the getConfigurationValue command.
     * @param index uint8_t The index of the route table entry of interest.
     * @returns
     * - EMBER_ERR_FATAL if the index is out of range or the device is an end
     * - EMBER_SUCCESS otherwise.
     * @returns EmberRouteTableEntry * The contents of the route table entry.
     */
    ezspGetRouteTableEntry(index: number): Promise<[EmberStatus, value: EmberRouteTableEntry]>;
    /**
     * Sets the radio output power at which a node is operating. Ember radios have
     * discrete power settings. For a list of available power settings, see the
     * technical specification for the RF communication module in your Developer
     * Kit. Note: Care should be taken when using this API on a running network, as
     * it will directly impact the established link qualities neighboring nodes have
     * with the node on which it is called. This can lead to disruption of existing
     * routes and erratic network behavior.
     * @param power int8_t Desired radio output power, in dBm.
     * @returns An EmberStatus value indicating the success or failure of the command.
     */
    ezspSetRadioPower(power: number): Promise<EmberStatus>;
    /**
     * Sets the channel to use for sending and receiving messages. For a list of
     * available radio channels, see the technical specification for the RF
     * communication module in your Developer Kit. Note: Care should be taken when
     * using this API, as all devices on a network must use the same channel.
     * @param channel uint8_t Desired radio channel.
     * @returns An EmberStatus value indicating the success or failure of the command.
     */
    ezspSetRadioChannel(channel: number): Promise<EmberStatus>;
    /**
     * Gets the channel in use for sending and receiving messages.
     * @returns uint8_t Current radio channel.
     */
    ezspGetRadioChannel(): Promise<number>;
    /**
     * Set the configured 802.15.4 CCA mode in the radio.
     * @param ccaMode uint8_t A RAIL_IEEE802154_CcaMode_t value.
     * @returns An EmberStatus value indicating the success or failure of the
     * command.
     */
    ezspSetRadioIeee802154CcaMode(ccaMode: number): Promise<EmberStatus>;
    /**
     * Enable/disable concentrator support.
     * @param on If this bool is true the concentrator support is enabled. Otherwise is disabled.
     *        If this bool is false all the other arguments are ignored.
     * @param concentratorType uint16_t Must be either EMBER_HIGH_RAM_CONCENTRATOR or EMBER_LOW_RAM_CONCENTRATOR.
     *        The former is used when the caller has enough memory to store source routes for the whole network.
     *        In that case, remote nodes stop sending route records once the concentrator has successfully received one.
     *        The latter is used when the concentrator has insufficient RAM to store all outbound source routes.
     *        In that case, route records are sent to the concentrator prior to every inbound APS unicast.
     * @param minTime uint16_t The minimum amount of time that must pass between MTORR broadcasts.
     * @param maxTime uint16_t The maximum amount of time that can pass between MTORR broadcasts.
     * @param routeErrorThreshold uint8_t The number of route errors that will trigger a re-broadcast of the MTORR.
     * @param deliveryFailureThreshold uint8_t The number of APS delivery failures that will trigger a re-broadcast of the MTORR.
     * @param maxHops uint8_t The maximum number of hops that the MTORR broadcast will be allowed to have.
     *        A value of 0 will be converted to the EMBER_MAX_HOPS value set by the stack.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspSetConcentrator(on: boolean, concentratorType: number, minTime: number, maxTime: number, routeErrorThreshold: number, deliveryFailureThreshold: number, maxHops: number): Promise<EmberStatus>;
    /**
     * Sets the error code that is sent back from a router with a broken route.
     * @param errorCode uint8_t Desired error code.
     * @returns An EmberStatus value indicating the success or failure of the
     * command.
     */
    ezspSetBrokenRouteErrorCode(errorCode: number): Promise<EmberStatus>;
    /**
     * This causes to initialize the desired radio interface other than native and
     * form a new network by becoming the coordinator with same panId as native
     * radio network.
     * @param phyIndex uint8_t Index of phy interface. The native phy index would be always zero hence valid phy index starts from one.
     * @param page uint8_t Desired radio channel page.
     * @param channel uint8_t Desired radio channel.
     * @param power int8_t Desired radio output power, in dBm.
     * @param bitmask Network configuration bitmask.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspMultiPhyStart(phyIndex: number, page: number, channel: number, power: number, bitmask: EmberMultiPhyNwkConfig): Promise<EmberStatus>;
    /**
     * This causes to bring down the radio interface other than native.
     * @param phyIndex uint8_t Index of phy interface. The native phy index would be always zero hence valid phy index starts from one.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspMultiPhyStop(phyIndex: number): Promise<EmberStatus>;
    /**
     * Sets the radio output power for desired phy interface at which a node is
     * operating. Ember radios have discrete power settings. For a list of available
     * power settings, see the technical specification for the RF communication
     * module in your Developer Kit. Note: Care should be taken when using this api
     * on a running network, as it will directly impact the established link
     * qualities neighboring nodes have with the node on which it is called. This
     * can lead to disruption of existing routes and erratic network behavior.
     * @param phyIndex uint8_t Index of phy interface. The native phy index would be always zero hence valid phy index starts from one.
     * @param power int8_t Desired radio output power, in dBm.
     * @returns An EmberStatus value indicating the success or failure of the
     * command.
     */
    ezspMultiPhySetRadioPower(phyIndex: number, power: number): Promise<EmberStatus>;
    /**
     * Send Link Power Delta Request from a child to its parent
     * @returns An EmberStatus value indicating the success or failure of sending the request.
     */
    ezspSendLinkPowerDeltaRequest(): Promise<EmberStatus>;
    /**
     * Sets the channel for desired phy interface to use for sending and receiving
     * messages. For a list of available radio pages and channels, see the technical
     * specification for the RF communication module in your Developer Kit. Note:
     * Care should be taken when using this API, as all devices on a network must
     * use the same page and channel.
     * @param phyIndex uint8_t Index of phy interface. The native phy index would be always zero hence valid phy index starts from one.
     * @param page uint8_t Desired radio channel page.
     * @param channel uint8_t Desired radio channel.
     * @returns An EmberStatus value indicating the success or failure of the command.
     */
    ezspMultiPhySetRadioChannel(phyIndex: number, page: number, channel: number): Promise<EmberStatus>;
    /**
     * Obtains the current duty cycle state.
     * @returns An EmberStatus value indicating the success or failure of the command.
     * @returns EmberDutyCycleState * The current duty cycle state in effect.
     */
    ezspGetDutyCycleState(): Promise<[EmberStatus, returnedState: EmberDutyCycleState]>;
    /**
     * Set the current duty cycle limits configuration. The Default limits set by
     * stack if this call is not made.
     * @param limits EmberDutyCycleLimits * The duty cycle limits configuration to utilize.
     * @returns EMBER_SUCCESS  if the duty cycle limit configurations set
     * successfully, EMBER_BAD_ARGUMENT if set illegal value such as setting only
     * one of the limits to default or violates constraints Susp > Crit > Limi,
     * EMBER_INVALID_CALL if device is operating on 2.4Ghz
     */
    ezspSetDutyCycleLimitsInStack(limits: EmberDutyCycleLimits): Promise<EmberStatus>;
    /**
     * Obtains the current duty cycle limits that were previously set by a call to
     * emberSetDutyCycleLimitsInStack(), or the defaults set by the stack if no set
     * call was made.
     * @returns An EmberStatus value indicating the success or failure of the command.
     * @returns EmberDutyCycleLimits * Return current duty cycle limits if returnedLimits is not NULL
     */
    ezspGetDutyCycleLimits(): Promise<[EmberStatus, returnedLimits: EmberDutyCycleLimits]>;
    /**
     * Returns the duty cycle of the stack's connected children that are being
     * monitored, up to maxDevices. It indicates the amount of overall duty cycle
     * they have consumed (up to the suspend limit). The first entry is always the
     * local stack's nodeId, and thus the total aggregate duty cycle for the device.
     * The passed pointer arrayOfDeviceDutyCycles MUST have space for maxDevices.
     * @param maxDevices uint8_t Number of devices to retrieve consumed duty cycle.
     * @returns
     * - EMBER_SUCCESS  if the duty cycles were read successfully,
     * - EMBER_BAD_ARGUMENT maxDevices is greater than EMBER_MAX_END_DEVICE_CHILDREN + 1.
     * @returns uint8_t * Consumed duty cycles up to maxDevices. When the number of children that are being monitored is less than maxDevices,
     *          the EmberNodeId element in the EmberPerDeviceDutyCycle will be 0xFFFF.
     */
    ezspGetCurrentDutyCycle(maxDevices: number): Promise<[EmberStatus, arrayOfDeviceDutyCycles: number[]]>;
    /**
     * Callback
     * Callback fires when the duty cycle state has changed
     * @param channelPage uint8_t The channel page whose duty cycle state has changed.
     * @param channel uint8_t The channel number whose duty cycle state has changed.
     * @param state The current duty cycle state.
     * @param totalDevices uint8_t The total number of connected end devices that are being monitored for duty cycle.
     * @param arrayOfDeviceDutyCycles EmberPerDeviceDutyCycle * Consumed duty cycles of end devices that are being monitored.
     *        The first entry always be the local stack's nodeId, and thus the total aggregate duty cycle for the device.
    */
    ezspDutyCycleHandler(channelPage: number, channel: number, state: EmberDutyCycleState, totalDevices: number, arrayOfDeviceDutyCycles: EmberPerDeviceDutyCycle[]): void;
    /**
     * Returns the first beacon in the cache. Beacons are stored in cache after
     * issuing an active scan.
     * @returns
     * - EMBER_SUCCESS if first beacon found,
     * - EMBER_BAD_ARGUMENT if input parameters are invalid, EMBER_INVALID_CALL if no beacons stored,
     * - EMBER_ERR_FATAL if no first beacon found.
     * @returns EmberBeaconIterator * The iterator to use when returning the first beacon. This argument must not be NULL.
     */
    ezspGetFirstBeacon(): Promise<[EmberStatus, beaconIterator: EmberBeaconIterator]>;
    /**
     * Returns the next beacon in the cache. Beacons are stored in cache after
     * issuing an active scan.
     * @returns
     * - EMBER_SUCCESS if next beacon found,
     * - EMBER_BAD_ARGUMENT if input parameters are invalid,
     * - EMBER_ERR_FATAL if no next beacon found.
     * @returns EmberBeaconData * The next beacon retrieved. It is assumed that emberGetFirstBeacon has been called first.
     *          This argument must not be NULL.
     */
    ezspGetNextBeacon(): Promise<[EmberStatus, beacon: EmberBeaconData]>;
    /**
     * Returns the number of cached beacons that have been collected from a scan.
     * @returns uint8_t The number of cached beacons that have been collected from a scan.
     */
    ezspGetNumStoredBeacons(): Promise<number>;
    /**
     * Clears all cached beacons that have been collected from a scan.
     */
    ezspClearStoredBeacons(): Promise<void>;
    /**
     * This call sets the radio channel in the stack and propagates the information
     * to the hardware.
     * @param radioChannel uint8_t The radio channel to be set.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspSetLogicalAndRadioChannel(radioChannel: number): Promise<EmberStatus>;
    /**
     * Deletes all binding table entries.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspClearBindingTable(): Promise<EmberStatus>;
    /**
     * Sets an entry in the binding table.
     * @param index uint8_t The index of a binding table entry.
     * @param value EmberBindingTableEntry * The contents of the binding entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspSetBinding(index: number, value: EmberBindingTableEntry): Promise<EmberStatus>;
    /**
     * Gets an entry from the binding table.
     * @param index uint8_t The index of a binding table entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberBindingTableEntry * The contents of the binding entry.
     */
    ezspGetBinding(index: number): Promise<[EmberStatus, value: EmberBindingTableEntry]>;
    /**
     * Deletes a binding table entry.
     * @param index uint8_t The index of a binding table entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspDeleteBinding(index: number): Promise<EmberStatus>;
    /**
     * Indicates whether any messages are currently being sent using this binding
     * table entry. Note that this command does not indicate whether a binding is
     * clear. To determine whether a binding is clear, check whether the type field
     * of the EmberBindingTableEntry has the value EMBER_UNUSED_BINDING.
     * @param index uint8_t The index of a binding table entry.
     * @returns True if the binding table entry is active, false otherwise.
     */
    ezspBindingIsActive(index: number): Promise<boolean>;
    /**
     * Returns the node ID for the binding's destination, if the ID is known. If a
     * message is sent using the binding and the destination's ID is not known, the
     * stack will discover the ID by broadcasting a ZDO address request. The
     * application can avoid the need for this discovery by using
     * setBindingRemoteNodeId when it knows the correct ID via some other means. The
     * destination's node ID is forgotten when the binding is changed, when the
     * local node reboots or, much more rarely, when the destination node changes
     * its ID in response to an ID conflict.
     * @param index uint8_t The index of a binding table entry.
     * @returns The short ID of the destination node or EMBER_NULL_NODE_ID if no destination is known.
     */
    ezspGetBindingRemoteNodeId(index: number): Promise<EmberNodeId>;
    /**
     * Set the node ID for the binding's destination. See getBindingRemoteNodeId for
     * a description.
     * @param index uint8_t The index of a binding table entry.
     * @param The short ID of the destination node.
     */
    ezspSetBindingRemoteNodeId(index: number, nodeId: EmberNodeId): Promise<void>;
    /**
     * Callback
     * The NCP used the external binding modification policy to decide how to handle
     * a remote set binding request. The Host cannot change the current decision,
     * but it can change the policy for future decisions using the setPolicy
     * command.
     * @param entry EmberBindingTableEntry * The requested binding.
     * @param index uint8_t The index at which the binding was added.
     * @param policyDecision EMBER_SUCCESS if the binding was added to the table and any other status if not.
     */
    ezspRemoteSetBindingHandler(entry: EmberBindingTableEntry, index: number, policyDecision: EmberStatus): void;
    /**
     * Callback
     * The NCP used the external binding modification policy to decide how to handle
     * a remote delete binding request. The Host cannot change the current decision,
     * but it can change the policy for future decisions using the setPolicy
     * command.
     * @param index uint8_t The index of the binding whose deletion was requested.
     * @param policyDecision EMBER_SUCCESS if the binding was removed from the table and any other status if not.
     */
    ezspRemoteDeleteBindingHandler(index: number, policyDecision: EmberStatus): void;
    /**
     * Returns the maximum size of the payload. The size depends on the security level in use.
     * @returns uint8_t The maximum APS payload length.
     */
    ezspMaximumPayloadLength(): Promise<number>;
    /**
     * Sends a unicast message as per the ZigBee specification. The message will
     * arrive at its destination only if there is a known route to the destination
     * node. Setting the ENABLE_ROUTE_DISCOVERY option will cause a route to be
     * discovered if none is known. Setting the FORCE_ROUTE_DISCOVERY option will
     * force route discovery. Routes to end-device children of the local node are
     * always known. Setting the APS_RETRY option will cause the message to be
     * retransmitted until either a matching acknowledgement is received or three
     * transmissions have been made. Note: Using the FORCE_ROUTE_DISCOVERY option
     * will cause the first transmission to be consumed by a route request as part
     * of discovery, so the application payload of this packet will not reach its
     * destination on the first attempt. If you want the packet to reach its
     * destination, the APS_RETRY option must be set so that another attempt is made
     * to transmit the message with its application payload after the route has been
     * constructed. Note: When sending fragmented messages, the stack will only
     * assign a new APS sequence number for the first fragment of the message (i.e.,
     * EMBER_APS_OPTION_FRAGMENT is set and the low-order byte of the groupId field
     * in the APS frame is zero). For all subsequent fragments of the same message,
     * the application must set the sequence number field in the APS frame to the
     * sequence number assigned by the stack to the first fragment.
     * @param type Specifies the outgoing message type.
     *        Must be one of EMBER_OUTGOING_DIRECT, EMBER_OUTGOING_VIA_ADDRESS_TABLE, or EMBER_OUTGOING_VIA_BINDING.
     * @param indexOrDestination Depending on the type of addressing used, this is either the EmberNodeId of the destination,
     *        an index into the address table, or an index into the binding table.
     * @param apsFrame EmberApsFrame * The APS frame which is to be added to the message.
     * @param messageTag uint8_t A value chosen by the Host. This value is used in the ezspMessageSentHandler response to refer to this message.
     * @param messageContents uint8_t * Content of the message.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns uint8_t * The sequence number that will be used when this message is transmitted.
     */
    ezspSendUnicast(type: EmberOutgoingMessageType, indexOrDestination: EmberNodeId, apsFrame: EmberApsFrame, messageTag: number, messageContents: Buffer): Promise<[EmberStatus, apsSequence: number]>;
    /**
     * Sends a broadcast message as per the ZigBee specification.
     * @param destination The destination to which to send the broadcast. This must be one of the three ZigBee broadcast addresses.
     * @param apsFrame EmberApsFrame * The APS frame for the message.
     * @param radius uint8_t The message will be delivered to all nodes within radius hops of the sender.
     *        A radius of zero is converted to EMBER_MAX_HOPS.
     * @param uint8_t A value chosen by the Host. This value is used in the ezspMessageSentHandler response to refer to this message.
     * @param uint8_t * The broadcast message.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns uint8_t * The sequence number that will be used when this message is transmitted.
     */
    ezspSendBroadcast(destination: EmberNodeId, apsFrame: EmberApsFrame, radius: number, messageTag: number, messageContents: Buffer): Promise<[EmberStatus, apsSequence: number]>;
    /**
     * Sends a proxied broadcast message as per the ZigBee specification.
     * @param source The source from which to send the broadcast.
     * @param destination The destination to which to send the broadcast. This must be one of the three ZigBee broadcast addresses.
     * @param nwkSequence uint8_t The network sequence number for the broadcast.
     * @param apsFrame EmberApsFrame * The APS frame for the message.
     * @param radius uint8_t The message will be delivered to all nodes within radius hops of the sender.
     *        A radius of zero is converted to EMBER_MAX_HOPS.
     * @param messageTag uint8_t A value chosen by the Host. This value is used in the ezspMessageSentHandler response to refer to this message.
     * @param messageContents uint8_t * The broadcast message.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns uint8_t * The APS sequence number that will be used when this message is transmitted.
     */
    ezspProxyBroadcast(source: EmberNodeId, destination: EmberNodeId, nwkSequence: number, apsFrame: EmberApsFrame, radius: number, messageTag: number, messageContents: Buffer): Promise<[EmberStatus, apsSequence: number]>;
    /**
     * Sends a multicast message to all endpoints that share a specific multicast ID
     * and are within a specified number of hops of the sender.
     * @param apsFrame EmberApsFrame * The APS frame for the message. The multicast will be sent to the groupId in this frame.
     * @param hops uint8_t The message will be delivered to all nodes within this number of hops of the sender.
     *        A value of zero is converted to EMBER_MAX_HOPS.
     * @param nonmemberRadius uint8_t The number of hops that the message will be forwarded by devices that are not members of the group.
     *        A value of 7 or greater is treated as infinite.
     * @param messageTag uint8_t A value chosen by the Host. This value is used in the ezspMessageSentHandler response to refer to this message.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The multicast message.
     * @returns An EmberStatus value. For any result other than EMBER_SUCCESS, the message will not be sent.
     * - EMBER_SUCCESS - The message has been submitted for transmission.
     * - EMBER_INVALID_BINDING_INDEX - The bindingTableIndex refers to a non-multicast binding.
     * - EMBER_NETWORK_DOWN - The node is not part of a network.
     * - EMBER_MESSAGE_TOO_LONG - The message is too large to fit in a MAC layer frame.
     * - EMBER_NO_BUFFERS - The free packet buffer pool is empty.
     * - EMBER_NETWORK_BUSY - Insufficient resources available in Network or MAC layers to send message.
     * @returns uint8_t * The sequence number that will be used when this message is transmitted.
     */
    ezspSendMulticast(apsFrame: EmberApsFrame, hops: number, nonmemberRadius: number, messageTag: number, messageContents: Buffer): Promise<[EmberStatus, apsSequence: number]>;
    /**
     * Sends a multicast message to all endpoints that share a specific multicast ID
     * and are within a specified number of hops of the sender.
     * @param apsFrame EmberApsFrame * The APS frame for the message. The multicast will be sent to the groupId in this frame.
     * @param hops uint8_t The message will be delivered to all nodes within this number of hops of the sender.
     *        A value of zero is converted to EMBER_MAX_HOPS.
     * @param nonmemberRadius uint8_t The number of hops that the message will be forwarded by devices that are not members of the group.
     *        A value of 7 or greater is treated as infinite.
     * @param alias uint16_t The alias source address
     * @param nwkSequence uint8_t the alias sequence number
     * @param messageTag uint8_t A value chosen by the Host. This value is used in the ezspMessageSentHandler response to refer to this message.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The multicast message.
     * @returns An EmberStatus value. For any result other than EMBER_SUCCESS, the
     * message will not be sent. EMBER_SUCCESS - The message has been submitted for
     * transmission. EMBER_INVALID_BINDING_INDEX - The bindingTableIndex refers to a
     * non-multicast binding. EMBER_NETWORK_DOWN - The node is not part of a
     * network. EMBER_MESSAGE_TOO_LONG - The message is too large to fit in a MAC
     * layer frame. EMBER_NO_BUFFERS - The free packet buffer pool is empty.
     * EMBER_NETWORK_BUSY - Insufficient resources available in Network or MAC
     * layers to send message.
     * @returns The sequence number that will be used when this message is transmitted.
     */
    ezspSendMulticastWithAlias(apsFrame: EmberApsFrame, hops: number, nonmemberRadius: number, alias: number, nwkSequence: number, messageTag: number, messageContents: Buffer): Promise<[EmberStatus, apsSequence: number]>;
    /**
     * Sends a reply to a received unicast message. The incomingMessageHandler
     * callback for the unicast being replied to supplies the values for all the
     * parameters except the reply itself.
     * @param sender Value supplied by incoming unicast.
     * @param apsFrame EmberApsFrame * Value supplied by incoming unicast.
     * @param uint8_t The length of the messageContents parameter in bytes.
     * @param uint8_t * The reply message.
     * @returns An EmberStatus value.
     * - EMBER_INVALID_CALL - The EZSP_UNICAST_REPLIES_POLICY is set to EZSP_HOST_WILL_NOT_SUPPLY_REPLY.
     *   This means the NCP will automatically send an empty reply. The Host must change
     *   the policy to EZSP_HOST_WILL_SUPPLY_REPLY before it can supply the reply.
     *   There is one exception to this rule: In the case of responses to message
     *   fragments, the host must call sendReply when a message fragment is received.
     *   In this case, the policy set on the NCP does not matter. The NCP expects a
     *   sendReply call from the Host for message fragments regardless of the current
     *   policy settings.
     * - EMBER_NO_BUFFERS - Not enough memory was available to send the reply.
     * - EMBER_NETWORK_BUSY - Either no route or insufficient resources available.
     * - EMBER_SUCCESS - The reply was successfully queued for transmission.
     */
    ezspSendReply(sender: EmberNodeId, apsFrame: EmberApsFrame, messageContents: Buffer): Promise<EmberStatus>;
    /**
     * Callback
     * A callback indicating the stack has completed sending a message.
     * @param type The type of message sent.
     * @param indexOrDestination uint16_t The destination to which the message was sent, for direct unicasts,
     *        or the address table or binding index for other unicasts. The value is unspecified for multicasts and broadcasts.
     * @param apsFrame EmberApsFrame * The APS frame for the message.
     * @param messageTag uint8_t The value supplied by the Host in the ezspSendUnicast, ezspSendBroadcast or ezspSendMulticast command.
     * @param status An EmberStatus value of EMBER_SUCCESS if an ACK was received from the destination
     *        or EMBER_DELIVERY_FAILED if no ACK was received.
     * @param messageContents uint8_t * The unicast message supplied by the Host. The message contents are only included here if the decision
     *        for the messageContentsInCallback policy is messageTagAndContentsInCallback.
     */
    ezspMessageSentHandler(type: EmberOutgoingMessageType, indexOrDestination: number, apsFrame: EmberApsFrame, messageTag: number, status: EmberStatus, messageContents: Buffer): void;
    /**
     * Sends a route request packet that creates routes from every node in the
     * network back to this node. This function should be called by an application
     * that wishes to communicate with many nodes, for example, a gateway, central
     * monitor, or controller. A device using this function was referred to as an
     * 'aggregator' in EmberZNet 2.x and earlier, and is referred to as a
     * 'concentrator' in the ZigBee specification and EmberZNet 3.  This function
     * enables large scale networks, because the other devices do not have to
     * individually perform bandwidth-intensive route discoveries. Instead, when a
     * remote node sends an APS unicast to a concentrator, its network layer
     * automatically delivers a special route record packet first, which lists the
     * network ids of all the intermediate relays. The concentrator can then use
     * source routing to send outbound APS unicasts. (A source routed message is one
     * in which the entire route is listed in the network layer header.) This allows
     * the concentrator to communicate with thousands of devices without requiring
     * large route tables on neighboring nodes.  This function is only available in
     * ZigBee Pro (stack profile 2), and cannot be called on end devices. Any router
     * can be a concentrator (not just the coordinator), and there can be multiple
     * concentrators on a network.  Note that a concentrator does not automatically
     * obtain routes to all network nodes after calling this function. Remote
     * applications must first initiate an inbound APS unicast.  Many-to-one routes
     * are not repaired automatically. Instead, the concentrator application must
     * call this function to rediscover the routes as necessary, for example, upon
     * failure of a retried APS message. The reason for this is that there is no
     * scalable one-size-fits-all route repair strategy. A common and recommended
     * strategy is for the concentrator application to refresh the routes by calling
     * this function periodically.
     * @param concentratorType uint16_t Must be either EMBER_HIGH_RAM_CONCENTRATOR or EMBER_LOW_RAM_CONCENTRATOR.
     *        The former is used when the caller has enough memory to store source routes for the whole network.
     *        In that case, remote nodes stop sending route records once the concentrator has successfully received one.
     *        The latter is used when the concentrator has insufficient RAM to store all outbound source routes.
     *        In that case, route records are sent to the concentrator prior to every inbound APS unicast.
     * @param radius uint8_t The maximum number of hops the route request will be relayed. A radius of zero is converted to EMBER_MAX_HOPS
     * @returns EMBER_SUCCESS if the route request was successfully submitted to the
     * transmit queue, and EMBER_ERR_FATAL otherwise.
     */
    ezspSendManyToOneRouteRequest(concentratorType: number, radius: number): Promise<EmberStatus>;
    /**
     * Periodically request any pending data from our parent. Setting interval to 0
     * or units to EMBER_EVENT_INACTIVE will generate a single poll.
     * @param interval uint16_t The time between polls. Note that the timer clock is free running and is not synchronized with this command.
     *        This means that the time will be between interval and (interval - 1). The maximum interval is 32767.
     * @param units The units for interval.
     * @param failureLimit uint8_t The number of poll failures that will be tolerated before a pollCompleteHandler callback is generated.
     *        A value of zero will result in a callback for every poll. Any status value apart from EMBER_SUCCESS
     *        and EMBER_MAC_NO_DATA is counted as a failure.
     * @returns The result of sending the first poll.
     */
    ezspPollForData(interval: number, units: EmberEventUnits, failureLimit: number): Promise<EmberStatus>;
    /**
     * Callback
     * Indicates the result of a data poll to the parent of the local node.
     * @param status An EmberStatus value:
     *   - EMBER_SUCCESS - Data was received in response to the poll.
     *   - EMBER_MAC_NO_DATA - No data was pending.
     *   - EMBER_DELIVERY_FAILED - The poll message could not be sent.
     *   - EMBER_MAC_NO_ACK_RECEIVED - The poll message was sent but not acknowledged by the parent.
     */
    ezspPollCompleteHandler(status: EmberStatus): void;
    /**
     * Callback
     * Indicates that the local node received a data poll from a child.
     * @param childId The node ID of the child that is requesting data.
     * @param transmitExpected True if transmit is expected, false otherwise.
     */
    ezspPollHandler(childId: EmberNodeId, transmitExpected: boolean): void;
    /**
     * Callback
     * A callback indicating a message has been received containing the EUI64 of the
     * sender. This callback is called immediately before the incomingMessageHandler
     * callback. It is not called if the incoming message did not contain the EUI64
     * of the sender.
     * @param senderEui64 The EUI64 of the sender
     */
    ezspIncomingSenderEui64Handler(senderEui64: EmberEUI64): void;
    /**
     * Callback
     * A callback indicating a message has been received.
     * @param type The type of the incoming message. One of the following: EMBER_INCOMING_UNICAST, EMBER_INCOMING_UNICAST_REPLY,
     *        EMBER_INCOMING_MULTICAST, EMBER_INCOMING_MULTICAST_LOOPBACK, EMBER_INCOMING_BROADCAST, EMBER_INCOMING_BROADCAST_LOOPBACK
     * @param apsFrame EmberApsFrame * The APS frame from the incoming message.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the message.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during the reception.
     * @param sender The sender of the message.
     * @param bindingIndex uint8_t The index of a binding that matches the message or 0xFF if there is no matching binding.
     * @param addressIndex uint8_t The index of the entry in the address table that matches the sender of the message
     *        or 0xFF if there is no matching entry.
     * @param messageContents uint8_t * The incoming message.
     */
    ezspIncomingMessageHandler(type: EmberIncomingMessageType, apsFrame: EmberApsFrame, lastHopLqi: number, lastHopRssi: number, sender: EmberNodeId, bindingIndex: number, addressIndex: number, messageContents: Buffer): void;
    /**
     * Sets source route discovery(MTORR) mode to on, off, reschedule
     * @param mode uint8_t Source route discovery mode: off:0, on:1, reschedule:2
     * @returns uint32_t Remaining time(ms) until next MTORR broadcast if the mode is on, MAX_INT32U_VALUE if the mode is off
     */
    ezspSetSourceRouteDiscoveryMode(mode: EmberSourceRouteDiscoveryMode): Promise<number>;
    /**
     * Callback
     * A callback indicating that a many-to-one route to the concentrator with the given short and long id is available for use.
     * @param EmberNodeId The short id of the concentrator.
     * @param longId The EUI64 of the concentrator.
     * @param cost uint8_t The path cost to the concentrator. The cost may decrease as additional route request packets
     *        for this discovery arrive, but the callback is made only once.
     */
    ezspIncomingManyToOneRouteRequestHandler(source: EmberNodeId, longId: EmberEUI64, cost: number): void;
    /**
     * Callback
     * A callback invoked when a route error message is received.
     * The error indicates that a problem routing to or from the target node was encountered.
     *
     * A status of ::EMBER_SOURCE_ROUTE_FAILURE indicates that a source-routed unicast sent from this node encountered a broken link.
     * Note that this case occurs only if this node is a concentrator using many-to-one routing for inbound messages and source-routing for
     * outbound messages. The node prior to the broken link generated the route error message and returned it to us along the many-to-one route.
     *
     * A status of ::EMBER_MANY_TO_ONE_ROUTE_FAILURE also occurs only if the local device is a concentrator, and indicates that a unicast sent
     * to the local device along a many-to-one route encountered a broken link. The node prior to the broken link generated the route error
     * message and forwarded it to the local device via a randomly chosen neighbor, taking advantage of the many-to-one nature of the route.
     *
     * A status of ::EMBER_MAC_INDIRECT_TIMEOUT indicates that a message sent to the target end device could not be delivered by the parent
     * because the indirect transaction timer expired. Upon receipt of the route error, the stack sets the extended timeout for the target node
     * in the address table, if present. It then calls this handler to indicate receipt of the error.
     *
     * Note that if the original unicast data message is sent using the ::EMBER_APS_OPTION_RETRY option, a new route error message is generated
     * for each failed retry. Therefore, it is not unusual to receive three route error messages in succession for a single failed retried APS
     * unicast. On the other hand, it is also not guaranteed that any route error messages will be delivered successfully at all.
     * The only sure way to detect a route failure is to use retried APS messages and to check the status of the ::emberMessageSentHandler().
     *
     * @param status ::EMBER_SOURCE_ROUTE_FAILURE, ::EMBER_MANY_TO_ONE_ROUTE_FAILURE, ::EMBER_MAC_INDIRECT_TIMEOUT
     * @param target The short id of the remote node.
     */
    ezspIncomingRouteErrorHandler(status: EmberStatus, target: EmberNodeId): void;
    /**
     * Callback
     * A callback invoked when a network status/route error message is received.
     * The error indicates that there was a problem sending/receiving messages from the target node.
     *
     * Note: Network analyzer may flag this message as "route error" which is the old name for the "network status" command.
     *
     * This handler is a superset of ezspIncomingRouteErrorHandler. The old API was only invoking the handler for a couple of the possible
     * error codes and these were being translated into EmberStatus.
     *
     * @param errorCode uint8_t One byte over-the-air error code from network status message
     * @param target The short ID of the remote node
     */
    ezspIncomingNetworkStatusHandler(errorCode: EmberStackError, target: EmberNodeId): void;
    /**
     * Callback
     * Reports the arrival of a route record command frame.
     * @param EmberNodeId The source of the route record.
     * @param EmberEUI64 The EUI64 of the source.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the route record.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during the reception.
     * @param uint8_t The number of relays in relayList.
     * @param relayList uint8_t * The route record. Each relay in the list is an uint16_t node ID.
     *        The list is passed as uint8_t * to avoid alignment problems.
     */
    ezspIncomingRouteRecordHandler(source: EmberNodeId, sourceEui: EmberEUI64, lastHopLqi: number, lastHopRssi: number, relayCount: number, relayList: number[]): void;
    /**
     * Supply a source route for the next outgoing message.
     * @param destination The destination of the source route.
     * @param relayList uint16_t * The source route.
     * @returns EMBER_SUCCESS if the source route was successfully stored, and
     * EMBER_NO_BUFFERS otherwise.
     */
    ezspSetSourceRoute(destination: EmberNodeId, relayList: number[]): Promise<EmberStatus>;
    /**
     * Send the network key to a destination.
     * @param targetShort The destination node of the key.
     * @param targetLong The long address of the destination node.
     * @param parentShortId The parent node of the destination node.
     * @returns EMBER_SUCCESS if send was successful
     */
    ezspUnicastCurrentNetworkKey(targetShort: EmberNodeId, targetLong: EmberEUI64, parentShortId: EmberNodeId): Promise<EmberStatus>;
    /**
     * Indicates whether any messages are currently being sent using this address
     * table entry. Note that this function does not indicate whether the address
     * table entry is unused. To determine whether an address table entry is unused,
     * check the remote node ID. The remote node ID will have the value
     * EMBER_TABLE_ENTRY_UNUSED_NODE_ID when the address table entry is not in use.
     * @param uint8_tThe index of an address table entry.
     * @returns True if the address table entry is active, false otherwise.
     */
    ezspAddressTableEntryIsActive(addressTableIndex: number): Promise<boolean>;
    /**
     * Sets the EUI64 of an address table entry. This function will also check other
     * address table entries, the child table and the neighbor table to see if the
     * node ID for the given EUI64 is already known. If known then this function
     * will also set node ID. If not known it will set the node ID to
     * EMBER_UNKNOWN_NODE_ID.
     * @param addressTableIndex uint8_t  The index of an address table entry.
     * @param eui64 The EUI64 to use for the address table entry.
     * @returns
     * - EMBER_SUCCESS if the EUI64 was successfully set,
     * - EMBER_ADDRESS_TABLE_ENTRY_IS_ACTIVE otherwise.
     */
    ezspSetAddressTableRemoteEui64(addressTableIndex: number, eui64: EmberEUI64): Promise<EmberStatus>;
    /**
     * Sets the short ID of an address table entry. Usually the application will not
     * need to set the short ID in the address table. Once the remote EUI64 is set
     * the stack is capable of figuring out the short ID on its own. However, in
     * cases where the application does set the short ID, the application must set
     * the remote EUI64 prior to setting the short ID.
     * @param addressTableIndex uint8_t The index of an address table entry.
     * @param id The short ID corresponding to the remote node whose EUI64 is stored in the address table at the given index
     *        or EMBER_TABLE_ENTRY_UNUSED_NODE_ID which indicates that the entry stored in the address table at the given index is not in use.
     */
    ezspSetAddressTableRemoteNodeId(addressTableIndex: number, id: EmberNodeId): Promise<void>;
    /**
     * Gets the EUI64 of an address table entry.
     * @param addressTableIndex uint8_t The index of an address table entry.
     * @returns The EUI64 of the address table entry is copied to this location.
     */
    ezspGetAddressTableRemoteEui64(addressTableIndex: number): Promise<EmberEUI64>;
    /**
     * Gets the short ID of an address table entry.
     * @param addressTableIndex uint8_t The index of an address table entry.
     * @returns One of the following: The short ID corresponding to the remote node
     * whose EUI64 is stored in the address table at the given index.
     * - EMBER_UNKNOWN_NODE_ID - Indicates that the EUI64 stored in the address table
     * at the given index is valid but the short ID is currently unknown.
     * - EMBER_DISCOVERY_ACTIVE_NODE_ID - Indicates that the EUI64 stored in the
     * address table at the given location is valid and network address discovery is
     * underway.
     * - EMBER_TABLE_ENTRY_UNUSED_NODE_ID - Indicates that the entry stored
     * in the address table at the given index is not in use.
     */
    ezspGetAddressTableRemoteNodeId(addressTableIndex: number): Promise<EmberNodeId>;
    /**
     * Tells the stack whether or not the normal interval between retransmissions of a retried unicast message should
     * be increased by EMBER_INDIRECT_TRANSMISSION_TIMEOUT.
     * The interval needs to be increased when sending to a sleepy node so that the message is not retransmitted until the destination
     * has had time to wake up and poll its parent.
     * The stack will automatically extend the timeout:
     * - For our own sleepy children.
     * - When an address response is received from a parent on behalf of its child.
     * - When an indirect transaction expiry route error is received.
     * - When an end device announcement is received from a sleepy node.
     * @param remoteEui64 The address of the node for which the timeout is to be set.
     * @param extendedTimeout true if the retry interval should be increased by EMBER_INDIRECT_TRANSMISSION_TIMEOUT.
     *        false if the normal retry interval should be used.
     */
    ezspSetExtendedTimeout(remoteEui64: EmberEUI64, extendedTimeout: boolean): Promise<void>;
    /**
     * Indicates whether or not the stack will extend the normal interval between
     * retransmissions of a retried unicast message by
     * EMBER_INDIRECT_TRANSMISSION_TIMEOUT.
     * @param remoteEui64 The address of the node for which the timeout is to be returned.
     * @returns true if the retry interval will be increased by EMBER_INDIRECT_TRANSMISSION_TIMEOUT
     * and false if the normal retry interval will be used.
     */
    ezspGetExtendedTimeout(remoteEui64: EmberEUI64): Promise<boolean>;
    /**
     * Replaces the EUI64, short ID and extended timeout setting of an address table
     * entry. The previous EUI64, short ID and extended timeout setting are
     * returned.
     * @param addressTableIndex uint8_t The index of the address table entry that will be modified.
     * @param newEui64 The EUI64 to be written to the address table entry.
     * @param newId One of the following: The short ID corresponding to the new EUI64.
     *        EMBER_UNKNOWN_NODE_ID if the new EUI64 is valid but the short ID is unknown and should be discovered by the stack.
     *        EMBER_TABLE_ENTRY_UNUSED_NODE_ID if the address table entry is now unused.
     * @param newExtendedTimeout true if the retry interval should be increased by EMBER_INDIRECT_TRANSMISSION_TIMEOUT.
     *        false if the normal retry interval should be used.
     * @returns EMBER_SUCCESS if the EUI64, short ID and extended timeout setting
     * were successfully modified, and EMBER_ADDRESS_TABLE_ENTRY_IS_ACTIVE
     * otherwise.
     * @returns oldEui64 The EUI64 of the address table entry before it was modified.
     * @returns oldId EmberNodeId * One of the following: The short ID corresponding to the EUI64 before it was modified.
     *          EMBER_UNKNOWN_NODE_ID if the short ID was unknown. EMBER_DISCOVERY_ACTIVE_NODE_ID if discovery of the short ID was underway.
     *          EMBER_TABLE_ENTRY_UNUSED_NODE_ID if the address table entry was unused.
     * @returns oldExtendedTimeouttrue bool * if the retry interval was being increased by EMBER_INDIRECT_TRANSMISSION_TIMEOUT.
     *          false if the normal retry interval was being used.
     */
    ezspReplaceAddressTableEntry(addressTableIndex: number, newEui64: EmberEUI64, newId: EmberNodeId, newExtendedTimeout: boolean): Promise<[EmberStatus, oldEui64: EmberEUI64, oldId: EmberNodeId, oldExtendedTimeout: boolean]>;
    /**
     * Returns the node ID that corresponds to the specified EUI64. The node ID is
     * found by searching through all stack tables for the specified EUI64.
     * @param eui64 The EUI64 of the node to look up.
     * @returns The short ID of the node or EMBER_NULL_NODE_ID if the short ID is not
     * known.
     */
    ezspLookupNodeIdByEui64(eui64: EmberEUI64): Promise<EmberNodeId>;
    /**
     * Returns the EUI64 that corresponds to the specified node ID. The EUI64 is
     * found by searching through all stack tables for the specified node ID.
     * @param nodeId The short ID of the node to look up.
     * @returns EMBER_SUCCESS if the EUI64 was found, EMBER_ERR_FATAL if the EUI64 is
     * not known.
     * @returns eui64 The EUI64 of the node.
     */
    ezspLookupEui64ByNodeId(nodeId: EmberNodeId): Promise<[EmberStatus, eui64: EmberEUI64]>;
    /**
     * Gets an entry from the multicast table.
     * @param uint8_t The index of a multicast table entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberMulticastTableEntry * The contents of the multicast entry.
     */
    ezspGetMulticastTableEntry(index: number): Promise<[EmberStatus, value: EmberMulticastTableEntry]>;
    /**
     * Sets an entry in the multicast table.
     * @param index uint8_t The index of a multicast table entry
     * @param EmberMulticastTableEntry * The contents of the multicast entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspSetMulticastTableEntry(index: number, value: EmberMulticastTableEntry): Promise<EmberStatus>;
    /**
     * Callback
     * A callback invoked by the EmberZNet stack when an id conflict is discovered,
     * that is, two different nodes in the network were found to be using the same
     * short id. The stack automatically removes the conflicting short id from its
     * internal tables (address, binding, route, neighbor, and child tables). The
     * application should discontinue any other use of the id.
     * @param id The short id for which a conflict was detected
     */
    ezspIdConflictHandler(id: EmberNodeId): void;
    /**
     * Write the current node Id, PAN ID, or Node type to the tokens
     * @param erase Erase the node type or not
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspWriteNodeData(erase: boolean): Promise<EmberStatus>;
    /**
     * Transmits the given message without modification. The MAC header is assumed
     * to be configured in the message at the time this function is called.
     * @param messageContents uint8_t * The raw message.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspSendRawMessage(messageContents: Buffer): Promise<EmberStatus>;
    /**
     * Transmits the given message without modification. The MAC header is assumed
     * to be configured in the message at the time this function is called.
     * @param messageContents uint8_t * The raw message.
     * @param priority uint8_t transmit priority.
     * @param useCca Should we enable CCA or not.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspSendRawMessageExtended(messageContents: Buffer, priority: number, useCca: boolean): Promise<EmberStatus>;
    /**
     * Callback
     * A callback invoked by the EmberZNet stack when a MAC passthrough message is
     * received.
     * @param messageType The type of MAC passthrough message received.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the message.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during reception.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The raw message that was received.
     */
    ezspMacPassthroughMessageHandler(messageType: EmberMacPassthroughType, lastHopLqi: number, lastHopRssi: number, messageContents: Buffer): void;
    /**
     * Callback
     * A callback invoked by the EmberZNet stack when a raw MAC message that has
     * matched one of the application's configured MAC filters.
     * @param filterIndexMatch uint8_t The index of the filter that was matched.
     * @param legacyPassthroughType The type of MAC passthrough message received.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the message.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during reception.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The raw message that was received.
     */
    ezspMacFilterMatchMessageHandler(filterIndexMatch: number, legacyPassthroughType: EmberMacPassthroughType, lastHopLqi: number, lastHopRssi: number, messageContents: Buffer): void;
    /**
     * Callback
     * A callback invoked by the EmberZNet stack when the MAC has finished
     * transmitting a raw message.
     * @param status EMBER_SUCCESS if the transmission was successful, or EMBER_DELIVERY_FAILED if not
     */
    ezspRawTransmitCompleteHandler(status: EmberStatus): void;
    /**
     * This function is useful to sleepy end devices. This function will set the
     * retry interval (in milliseconds) for mac data poll. This interval is the time
     * in milliseconds the device waits before retrying a data poll when a MAC level
     * data poll fails for any reason.
     * @param waitBeforeRetryIntervalMs uint32_t Time in milliseconds the device waits before retrying
     *        a data poll when a MAC level data poll fails for any reason.
     */
    ezspSetMacPollFailureWaitTime(waitBeforeRetryIntervalMs: number): Promise<void>;
    /**
     * Sets the priority masks and related variables for choosing the best beacon.
     * @param param EmberBeaconClassificationParams * The beacon prioritization related variable
     * @returns The attempt to set the pramaters returns EMBER_SUCCESS
     */
    ezspSetBeaconClassificationParams(param: EmberBeaconClassificationParams): Promise<EmberStatus>;
    /**
     * Gets the priority masks and related variables for choosing the best beacon.
     * @returns The attempt to get the pramaters returns EMBER_SUCCESS
     * @returns EmberBeaconClassificationParams * Gets the beacon prioritization related variable
     */
    ezspGetBeaconClassificationParams(): Promise<[EmberStatus, param: EmberBeaconClassificationParams]>;
    /**
     * Sets the security state that will be used by the device when it forms or
     * joins the network. This call should not be used when restoring saved network
     * state via networkInit as this will result in a loss of security data and will
     * cause communication problems when the device re-enters the network.
     * @param state EmberInitialSecurityState * The security configuration to be set.
     * @returns The success or failure code of the operation.
     */
    ezspSetInitialSecurityState(state: EmberInitialSecurityState): Promise<EmberStatus>;
    /**
     * Gets the current security state that is being used by a device that is joined
     * in the network.
     * @returns The success or failure code of the operation.
     * @returns EmberCurrentSecurityState * The security configuration in use by the stack.
     */
    ezspGetCurrentSecurityState(): Promise<[EmberStatus, state: EmberCurrentSecurityState]>;
    /**
     * Exports a key from security manager based on passed context.
     * @param context sl_zb_sec_man_context_t * Metadata to identify the requested key.
     * @returns sl_zb_sec_man_key_t * Data to store the exported key in.
     * @returns sl_status_t * The success or failure code of the operation.
     */
    ezspExportKey(context: SecManContext): Promise<[key: SecManKey, status: SLStatus]>;
    /**
     * Imports a key into security manager based on passed context.
     * @param context sl_zb_sec_man_context_t * Metadata to identify where the imported key should be stored.
     * @param key sl_zb_sec_man_key_t * The key to be imported.
     * @returns The success or failure code of the operation.
     */
    ezspImportKey(context: SecManContext, key: SecManKey): Promise<SLStatus>;
    /**
     * Callback
     * A callback to inform the application that the Network Key has been updated
     * and the node has been switched over to use the new key. The actual key being
     * used is not passed up, but the sequence number is.
     * @param sequenceNumber uint8_t The sequence number of the new network key.
     */
    ezspSwitchNetworkKeyHandler(sequenceNumber: number): void;
    /**
     * This function searches through the Key Table and tries to find the entry that
     * matches the passed search criteria.
     * @param address The address to search for. Alternatively, all zeros may be passed in to search for the first empty entry.
     * @param linkKey This indicates whether to search for an entry that contains a link key or a master key.
     *        true means to search for an entry with a Link Key.
     * @returns uint8_t This indicates the index of the entry that matches the search
     * criteria. A value of 0xFF is returned if not matching entry is found.
     */
    ezspFindKeyTableEntry(address: EmberEUI64, linkKey: boolean): Promise<number>;
    /**
     * This function sends an APS TransportKey command containing the current trust
     * center link key. The node to which the command is sent is specified via the
     * short and long address arguments.
     * @param destinationNodeId The short address of the node to which this command will be sent
     * @param destinationEui64 The long address of the node to which this command will be sent
     * @returns An EmberStatus value indicating success of failure of the operation
     */
    ezspSendTrustCenterLinkKey(destinationNodeId: EmberNodeId, destinationEui64: EmberEUI64): Promise<EmberStatus>;
    /**
     * This function erases the data in the key table entry at the specified index.
     * If the index is invalid, false is returned.
     * @param index uint8_t This indicates the index of entry to erase.
     * @returns ::EMBER_SUCCESS if the index is valid and the key data was erased.
     *          ::EMBER_KEY_INVALID if the index is out of range for the size of the key table.
     */
    ezspEraseKeyTableEntry(index: number): Promise<EmberStatus>;
    /**
     * This function clears the key table of the current network.
     * @returns ::EMBER_SUCCESS if the key table was successfully cleared.
     *          ::EMBER_INVALID_CALL otherwise.
     */
    ezspClearKeyTable(): Promise<EmberStatus>;
    /**
     * A function to request a Link Key from the Trust Center with another device on
     * the Network (which could be the Trust Center). A Link Key with the Trust
     * Center is possible but the requesting device cannot be the Trust Center. Link
     * Keys are optional in ZigBee Standard Security and thus the stack cannot know
     * whether the other device supports them. If EMBER_REQUEST_KEY_TIMEOUT is
     * non-zero on the Trust Center and the partner device is not the Trust Center,
     * both devices must request keys with their partner device within the time
     * period. The Trust Center only supports one outstanding key request at a time
     * and therefore will ignore other requests. If the timeout is zero then the
     * Trust Center will immediately respond and not wait for the second request.
     * The Trust Center will always immediately respond to requests for a Link Key
     * with it. Sleepy devices should poll at a higher rate until a response is
     * received or the request times out. The success or failure of the request is
     * returned via ezspZigbeeKeyEstablishmentHandler(...)
     * @param partner This is the IEEE address of the partner device that will share the link key.
     * @returns The success or failure of sending the request.
     * This is not the final result of the attempt. ezspZigbeeKeyEstablishmentHandler(...) will return that.
     */
    ezspRequestLinkKey(partner: EmberEUI64): Promise<EmberStatus>;
    /**
     * Requests a new link key from the Trust Center. This function starts by
     * sending a Node Descriptor request to the Trust Center to verify its R21+
     * stack version compliance. A Request Key message will then be sent, followed
     * by a Verify Key Confirm message.
     * @param maxAttempts uint8_t The maximum number of attempts a node should make when sending the Node Descriptor,
     *        Request Key, and Verify Key Confirm messages. The number of attempts resets for each message type sent
     *        (e.g., if maxAttempts is 3, up to 3 Node Descriptors are sent, up to 3 Request Keys, and up to 3 Verify Key Confirm messages are sent).
     * @returns The success or failure of sending the request.
     * If the Node Descriptor is successfully transmitted, ezspZigbeeKeyEstablishmentHandler(...)
     * will be called at a later time with a final status result.
     */
    ezspUpdateTcLinkKey(maxAttempts: number): Promise<EmberStatus>;
    /**
     * Callback
     * This is a callback that indicates the success or failure of an attempt to establish a key with a partner device.
     * @param partner This is the IEEE address of the partner that the device successfully established a key with.
     *        This value is all zeros on a failure.
     * @param status This is the status indicating what was established or why the key establishment failed.
     */
    ezspZigbeeKeyEstablishmentHandler(partner: EmberEUI64, status: EmberKeyStatus): void;
    /**
     * Clear all of the transient link keys from RAM.
     */
    ezspClearTransientLinkKeys(): Promise<void>;
    /**
     * Retrieve information about the current and alternate network key, excluding their contents.
     * @returns Success or failure of retrieving network key info.
     * @returns sl_zb_sec_man_network_key_info_t * Information about current and alternate network keys.
     */
    ezspGetNetworkKeyInfo(): Promise<[SLStatus, networkKeyInfo: SecManNetworkKeyInfo]>;
    /**
     * Retrieve metadata about an APS link key.  Does not retrieve contents.
     * @param context_in sl_zb_sec_man_context_t * Context used to input information about key.
     * @returns EUI64 associated with this APS link key
     * @returns sl_zb_sec_man_aps_key_metadata_t * Metadata about the referenced key.
     * @returns sl_status_t * Status of metadata retrieval operation.
     */
    ezspGetApsKeyInfo(context_in: SecManContext): Promise<[eui: EmberEUI64, key_data: SecManAPSKeyMetadata, status: SLStatus]>;
    /**
     * Import an application link key into the key table.
     * @param index uint8_t Index where this key is to be imported to.
     * @param address EUI64 this key is associated with.
     * @param plaintextKey sl_zb_sec_man_key_t * The key data to be imported.
     * @returns Status of key import operation.
     */
    ezspImportLinkKey(index: number, address: EmberEUI64, plaintextKey: SecManKey): Promise<SLStatus>;
    /**
     * Export the link key at given index from the key table.
     * @param uint8_t  Index of key to export.
     * @returns EUI64 associated with the exported key.
     * @returns sl_zb_sec_man_key_t * The exported key.
     * @returns sl_zb_sec_man_aps_key_metadata_t * Metadata about the key.
     * @returns sl_status_t * Status of key export operation.
     */
    ezspExportLinkKeyByIndex(index: number): Promise<[eui: EmberEUI64, plaintextKey: SecManKey, keyData: SecManAPSKeyMetadata, status: SLStatus]>;
    /**
     * Export the link key associated with the given EUI from the key table.
     * @param eui EUI64 associated with the key to export.
     * @returns sl_zb_sec_man_key_t * The exported key.
     * @returns uint8_t * Key index of the exported key.
     * @returns sl_zb_sec_man_aps_key_metadata_t * Metadata about the key.
     * @returns sl_status_t * Status of key export operation.
     */
    ezspExportLinkKeyByEui(eui: EmberEUI64): Promise<[plaintextKey: SecManKey, index: number, keyData: SecManAPSKeyMetadata, status: SLStatus]>;
    /**
     * Check whether a key context can be used to load a valid key.
     * @param context sl_zb_sec_man_context_t * Context struct to check the validity of.
     * @returns Validity of the checked context.
     */
    ezspCheckKeyContext(context: SecManContext): Promise<SLStatus>;
    /**
     * Import a transient link key.
     * @param eui64 EUI64 associated with this transient key.
     * @param plaintextKey sl_zb_sec_man_key_t * The key to import.
     * @param sl_zigbee_sec_man_flags_t Flags associated with this transient key.
     * @returns Status of key import operation.
     */
    ezspImportTransientKey(eui64: EmberEUI64, plaintextKey: SecManKey, flags: SecManFlag): Promise<SLStatus>;
    /**
     * Export a transient link key from a given table index.
     * @param uint8_t Index to export from.
     * @returns sl_zb_sec_man_context_t * Context struct for export operation.
     * @returns sl_zb_sec_man_key_t * The exported key.
     * @returns sl_zb_sec_man_aps_key_metadata_t * Metadata about the key.
     * @returns sl_status_t * Status of key export operation.
     */
    ezspExportTransientKeyByIndex(index: number): Promise<[context: SecManContext, plaintextKey: SecManKey, key_data: SecManAPSKeyMetadata, status: SLStatus]>;
    /**
     * Export a transient link key associated with a given EUI64
     * @param eui Index to export from.
     * @returns sl_zb_sec_man_context_t * Context struct for export operation.
     * @returns sl_zb_sec_man_key_t * The exported key.
     * @returns sl_zb_sec_man_aps_key_metadata_t * Metadata about the key.
     * @returns sl_status_t * Status of key export operation.
     */
    ezspExportTransientKeyByEui(eui: EmberEUI64): Promise<[context: SecManContext, plaintextKey: SecManKey, key_data: SecManAPSKeyMetadata, status: SLStatus]>;
    /**
     * Callback
     * The NCP used the trust center behavior policy to decide whether to allow a
     * new node to join the network. The Host cannot change the current decision,
     * but it can change the policy for future decisions using the setPolicy
     * command.
     * @param newNodeId The Node Id of the node whose status changed
     * @param newNodeEui64 The EUI64 of the node whose status changed.
     * @param status The status of the node: Secure Join/Rejoin, Unsecure Join/Rejoin, Device left.
     * @param policyDecision An EmberJoinDecision reflecting the decision made.
     * @param parentOfNewNodeId The parent of the node whose status has changed.
     */
    ezspTrustCenterJoinHandler(newNodeId: EmberNodeId, newNodeEui64: EmberEUI64, status: EmberDeviceUpdate, policyDecision: EmberJoinDecision, parentOfNewNodeId: EmberNodeId): void;
    /**
     * This function broadcasts a new encryption key, but does not tell the nodes in
     * the network to start using it. To tell nodes to switch to the new key, use
     * ezspBroadcastNetworkKeySwitch(). This is only valid for the Trust
     * Center/Coordinator. It is up to the application to determine how quickly to
     * send the Switch Key after sending the alternate encryption key.
     * @param key EmberKeyData * An optional pointer to a 16-byte encryption key (EMBER_ENCRYPTION_KEY_SIZE).
     *        An all zero key may be passed in, which will cause the stack to randomly generate a new key.
     * @returns EmberStatus value that indicates the success or failure of the command.
     */
    ezspBroadcastNextNetworkKey(key: EmberKeyData): Promise<EmberStatus>;
    /**
     * This function broadcasts a switch key message to tell all nodes to change to
     * the sequence number of the previously sent Alternate Encryption Key.
     * @returns EmberStatus value that indicates the success or failure of the
     * command.
     */
    ezspBroadcastNetworkKeySwitch(): Promise<EmberStatus>;
    /**
     * This routine processes the passed chunk of data and updates the hash context
     * based on it. If the 'finalize' parameter is not set, then the length of the
     * data passed in must be a multiple of 16. If the 'finalize' parameter is set
     * then the length can be any value up 1-16, and the final hash value will be
     * calculated.
     * @param context EmberAesMmoHashContext * The hash context to update.
     * @param finalize This indicates whether the final hash value should be calculated
     * @param data uint8_t * The data to hash.
     * @returns The result of the operation
     * @returns EmberAesMmoHashContext * The updated hash context.
     */
    ezspAesMmoHash(context: EmberAesMmoHashContext, finalize: boolean, data: Buffer): Promise<[EmberStatus, returnContext: EmberAesMmoHashContext]>;
    /**
     * This command sends an APS remove device using APS encryption to the
     * destination indicating either to remove itself from the network, or one of
     * its children.
     * @param destShort The node ID of the device that will receive the message
     * @param destLong The long address (EUI64) of the device that will receive the message.
     * @param targetLong The long address (EUI64) of the device to be removed.
     * @returns An EmberStatus value indicating success, or the reason for failure
     */
    ezspRemoveDevice(destShort: EmberNodeId, destLong: EmberEUI64, targetLong: EmberEUI64): Promise<EmberStatus>;
    /**
     * This command will send a unicast transport key message with a new NWK key to
     * the specified device. APS encryption using the device's existing link key
     * will be used.
     * @param destShort The node ID of the device that will receive the message
     * @param destLong The long address (EUI64) of the device that will receive the message.
     * @param key EmberKeyData * The NWK key to send to the new device.
     * @returns An EmberStatus value indicating success, or the reason for failure
     */
    ezspUnicastNwkKeyUpdate(destShort: EmberNodeId, destLong: EmberEUI64, key: EmberKeyData): Promise<EmberStatus>;
    /**
     * This call starts the generation of the ECC Ephemeral Public/Private key pair.
     * When complete it stores the private key. The results are returned via
     * ezspGenerateCbkeKeysHandler().
     */
    ezspGenerateCbkeKeys(): Promise<EmberStatus>;
    /**
     * Callback
     * A callback by the Crypto Engine indicating that a new ephemeral
     * public/private key pair has been generated. The public/private key pair is
     * stored on the NCP, but only the associated public key is returned to the
     * host. The node's associated certificate is also returned.
     * @param status The result of the CBKE operation.
     * @param ephemeralPublicKey EmberPublicKeyData * The generated ephemeral public key.
     */
    ezspGenerateCbkeKeysHandler(status: EmberStatus, ephemeralPublicKey: EmberPublicKeyData): void;
    /**
     * Calculates the SMAC verification keys for both the initiator and responder
     * roles of CBKE using the passed parameters and the stored public/private key
     * pair previously generated with ezspGenerateKeysRetrieveCert(). It also stores
     * the unverified link key data in temporary storage on the NCP until the key
     * establishment is complete.
     * @param amInitiator The role of this device in the Key Establishment protocol.
     * @param partnerCertificate EmberCertificateData * The key establishment partner's implicit certificate.
     * @param partnerEphemeralPublicKey EmberPublicKeyData * The key establishment partner's ephemeral public key
     */
    ezspCalculateSmacs(amInitiator: boolean, partnerCertificate: EmberCertificateData, partnerEphemeralPublicKey: EmberPublicKeyData): Promise<EmberStatus>;
    /**
     * Callback
     * A callback to indicate that the NCP has finished calculating the Secure
     * Message Authentication Codes (SMAC) for both the initiator and responder. The
     * associated link key is kept in temporary storage until the host tells the NCP
     * to store or discard the key via emberClearTemporaryDataMaybeStoreLinkKey().
     * @param status The Result of the CBKE operation.
     * @param initiatorSmac EmberSmacData * The calculated value of the initiator's SMAC
     * @param responderSmac EmberSmacData * The calculated value of the responder's SMAC
     */
    ezspCalculateSmacsHandler(status: EmberStatus, initiatorSmac: EmberSmacData, responderSmac: EmberSmacData): void;
    /**
     * This call starts the generation of the ECC 283k1 curve Ephemeral
     * Public/Private key pair. When complete it stores the private key. The results
     * are returned via ezspGenerateCbkeKeysHandler283k1().
     */
    ezspGenerateCbkeKeys283k1(): Promise<EmberStatus>;
    /**
     * Callback
     * A callback by the Crypto Engine indicating that a new 283k1 ephemeral
     * public/private key pair has been generated. The public/private key pair is
     * stored on the NCP, but only the associated public key is returned to the
     * host. The node's associated certificate is also returned.
     * @param status The result of the CBKE operation.
     * @param ephemeralPublicKey EmberPublicKey283k1Data * The generated ephemeral public key.
     */
    ezspGenerateCbkeKeysHandler283k1(status: EmberStatus, ephemeralPublicKey: EmberPublicKey283k1Data): void;
    /**
     * Calculates the SMAC verification keys for both the initiator and responder
     * roles of CBKE for the 283k1 ECC curve using the passed parameters and the
     * stored public/private key pair previously generated with
     * ezspGenerateKeysRetrieveCert283k1(). It also stores the unverified link key
     * data in temporary storage on the NCP until the key establishment is complete.
     * @param amInitiator The role of this device in the Key Establishment protocol.
     * @param partnerCertificate EmberCertificate283k1Data * The key establishment partner's implicit certificate.
     * @param partnerEphemeralPublicKey EmberPublicKey283k1Data * The key establishment partner's ephemeral public key
     */
    ezspCalculateSmacs283k1(amInitiator: boolean, partnerCertificate: EmberCertificate283k1Data, partnerEphemeralPublicKey: EmberPublicKey283k1Data): Promise<EmberStatus>;
    /**
     * Callback
     * A callback to indicate that the NCP has finished calculating the Secure
     * Message Authentication Codes (SMAC) for both the initiator and responder for
     * the CBKE 283k1 Library. The associated link key is kept in temporary storage
     * until the host tells the NCP to store or discard the key via
     * emberClearTemporaryDataMaybeStoreLinkKey().
     * @param status The Result of the CBKE operation.
     * @param initiatorSmac EmberSmacData * The calculated value of the initiator's SMAC
     * @param responderSmac EmberSmacData * The calculated value of the responder's SMAC
     */
    ezspCalculateSmacsHandler283k1(status: EmberStatus, initiatorSmac: EmberSmacData, responderSmac: EmberSmacData): void;
    /**
     * Clears the temporary data associated with CBKE and the key establishment,
     * most notably the ephemeral public/private key pair. If storeLinKey is true it
     * moves the unverified link key stored in temporary storage into the link key
     * table. Otherwise it discards the key.
     * @param storeLinkKey A bool indicating whether to store (true) or discard (false) the unverified link
     *        key derived when ezspCalculateSmacs() was previously called.
     */
    ezspClearTemporaryDataMaybeStoreLinkKey(storeLinkKey: boolean): Promise<EmberStatus>;
    /**
     * Clears the temporary data associated with CBKE and the key establishment,
     * most notably the ephemeral public/private key pair. If storeLinKey is true it
     * moves the unverified link key stored in temporary storage into the link key
     * table. Otherwise it discards the key.
     * @param storeLinkKey A bool indicating whether to store (true) or discard (false) the unverified link
     *        key derived when ezspCalculateSmacs() was previously called.
     */
    ezspClearTemporaryDataMaybeStoreLinkKey283k1(storeLinkKey: boolean): Promise<EmberStatus>;
    /**
     * Retrieves the certificate installed on the NCP.
     * @returns EmberCertificateData * The locally installed certificate.
     */
    ezspGetCertificate(): Promise<[EmberStatus, localCert: EmberCertificateData]>;
    /**
     * Retrieves the 283k certificate installed on the NCP.
     * @returns EmberCertificate283k1Data * The locally installed certificate.
     */
    ezspGetCertificate283k1(): Promise<[EmberStatus, localCert: EmberCertificate283k1Data]>;
    /**
     * LEGACY FUNCTION: This functionality has been replaced by a single bit in the
     * EmberApsFrame, EMBER_APS_OPTION_DSA_SIGN. Devices wishing to send signed
     * messages should use that as it requires fewer function calls and message
     * buffering. The dsaSignHandler response is still called when
     * EMBER_APS_OPTION_DSA_SIGN is used. However, this function is still supported.
     * This function begins the process of signing the passed message contained
     * within the messageContents array. If no other ECC operation is going on, it
     * will immediately return with EMBER_OPERATION_IN_PROGRESS to indicate the
     * start of ECC operation. It will delay a period of time to let APS retries
     * take place, but then it will shut down the radio and consume the CPU
     * processing until the signing is complete. This may take up to 1 second. The
     * signed message will be returned in the dsaSignHandler response. Note that the
     * last byte of the messageContents passed to this function has special
     * significance. As the typical use case for DSA signing is to sign the ZCL
     * payload of a DRLC Report Event Status message in SE 1.0, there is often both
     * a signed portion (ZCL payload) and an unsigned portion (ZCL header). The last
     * byte in the content of messageToSign is therefore used as a special indicator
     * to signify how many bytes of leading data in the array should be excluded
     * from consideration during the signing process. If the signature needs to
     * cover the entire array (all bytes except last one), the caller should ensure
     * that the last byte of messageContents is 0x00. When the signature operation
     * is complete, this final byte will be replaced by the signature type indicator
     * (0x01 for ECDSA signatures), and the actual signature will be appended to the
     * original contents after this byte.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The message contents for which to create a signature.
     *        Per above notes, this may include a leading portion of data not included in the signature,
     *        in which case the last byte of this array should be set to the index of the first byte
     *        to be considered for signing. Otherwise, the last byte of messageContents should be 0x00
     *        to indicate that a signature should occur across the entire contents.
     * @returns EMBER_OPERATION_IN_PROGRESS if the stack has queued up the operation
     * for execution. EMBER_INVALID_CALL if the operation can't be performed in this
     * context, possibly because another ECC operation is pending.
     */
    ezspDsaSign(messageContents: Buffer): Promise<EmberStatus>;
    /**
     * Callback
     * The handler that returns the results of the signing operation. On success,
     * the signature will be appended to the original message (including the
     * signature type indicator that replaced the startIndex field for the signing)
     * and both are returned via this callback.
     * @param status The result of the DSA signing operation.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t *The message and attached which includes the original message and the appended signature.
     */
    ezspDsaSignHandler(status: EmberStatus, messageContents: Buffer): void;
    /**
     * Verify that signature of the associated message digest was signed by the
     * private key of the associated certificate.
     * @param digest EmberMessageDigest * The AES-MMO message digest of the signed data.
     *        If dsaSign command was used to generate the signature for this data, the final byte (replaced by signature type of 0x01)
     *        in the messageContents array passed to dsaSign is included in the hash context used for the digest calculation.
     * @param signerCertificate EmberCertificateData * The certificate of the signer. Note that the signer's certificate and the verifier's
     *        certificate must both be issued by the same Certificate Authority, so they should share the same CA Public Key.
     * @param receivedSig EmberSignatureData * The signature of the signed data.
     */
    ezspDsaVerify(digest: EmberMessageDigest, signerCertificate: EmberCertificateData, receivedSig: EmberSignatureData): Promise<EmberStatus>;
    /**
     * Callback
     * This callback is executed by the stack when the DSA verification has
     * completed and has a result. If the result is EMBER_SUCCESS, the signature is
     * valid. If the result is EMBER_SIGNATURE_VERIFY_FAILURE then the signature is
     * invalid. If the result is anything else then the signature verify operation
     * failed and the validity is unknown.
     * @param status The result of the DSA verification operation.
     */
    ezspDsaVerifyHandler(status: EmberStatus): void;
    /**
     * Verify that signature of the associated message digest was signed by the
     * private key of the associated certificate.
     * @param digest EmberMessageDigest * The AES-MMO message digest of the signed data.
     *        If dsaSign command was used to generate the signature for this data, the final byte (replaced by signature type of 0x01)
     *        in the messageContents array passed to dsaSign is included in the hash context used for the digest calculation.
     * @param signerCertificate EmberCertificate283k1Data * The certificate of the signer. Note that the signer's certificate and the verifier's
     *        certificate must both be issued by the same Certificate Authority, so they should share the same CA Public Key.
     * @param receivedSig EmberSignature283k1Data * The signature of the signed data.
     */
    ezspDsaVerify283k1(digest: EmberMessageDigest, signerCertificate: EmberCertificate283k1Data, receivedSig: EmberSignature283k1Data): Promise<EmberStatus>;
    /**
     * Sets the device's CA public key, local certificate, and static private key on
     * the NCP associated with this node.
     * @param caPublic EmberPublicKeyData * The Certificate Authority's public key.
     * @param myCert EmberCertificateData * The node's new certificate signed by the CA.
     * @param myKey EmberPrivateKeyData *The node's new static private key.
     */
    ezspSetPreinstalledCbkeData(caPublic: EmberPublicKeyData, myCert: EmberCertificateData, myKey: EmberPrivateKeyData): Promise<EmberStatus>;
    /**
     * Sets the device's 283k1 curve CA public key, local certificate, and static
     * private key on the NCP associated with this node.
     * @returns Status of operation
     */
    ezspSavePreinstalledCbkeData283k1(): Promise<EmberStatus>;
    /**
     * Activate use of mfglib test routines and enables the radio receiver to report
     * packets it receives to the mfgLibRxHandler() callback. These packets will not
     * be passed up with a CRC failure. All other mfglib functions will return an
     * error until the mfglibStart() has been called
     * @param rxCallback true to generate a mfglibRxHandler callback when a packet is received.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspMfglibStart(rxCallback: boolean): Promise<EmberStatus>;
    /**
     * Deactivate use of mfglib test routines; restores the hardware to the state it
     * was in prior to mfglibStart() and stops receiving packets started by
     * mfglibStart() at the same time.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    mfglibEnd(): Promise<EmberStatus>;
    /**
     * Starts transmitting an unmodulated tone on the currently set channel and
     * power level. Upon successful return, the tone will be transmitting. To stop
     * transmitting tone, application must call mfglibStopTone(), allowing it the
     * flexibility to determine its own criteria for tone duration (time, event,
     * etc.)
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    mfglibStartTone(): Promise<EmberStatus>;
    /**
     * Stops transmitting tone started by mfglibStartTone().
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    mfglibStopTone(): Promise<EmberStatus>;
    /**
     * Starts transmitting a random stream of characters. This is so that the radio
     * modulation can be measured.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    mfglibStartStream(): Promise<EmberStatus>;
    /**
     * Stops transmitting a random stream of characters started by
     * mfglibStartStream().
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    mfglibStopStream(): Promise<EmberStatus>;
    /**
     * Sends a single packet consisting of the following bytes: packetLength,
     * packetContents[0], ... , packetContents[packetLength - 3], CRC[0], CRC[1].
     * The total number of bytes sent is packetLength + 1. The radio replaces the
     * last two bytes of packetContents[] with the 16-bit CRC for the packet.
     * @param packetLength uint8_t The length of the packetContents parameter in bytes. Must be greater than 3 and less than 123.
     * @param packetContents uint8_t * The packet to send. The last two bytes will be replaced with the 16-bit CRC.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    mfglibSendPacket(packetContents: Buffer): Promise<EmberStatus>;
    /**
     * Sets the radio channel. Calibration occurs if this is the first time the
     * channel has been used.
     * @param channel uint8_t The channel to switch to. Valid values are 11 - 26.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    mfglibSetChannel(channel: number): Promise<EmberStatus>;
    /**
     * Returns the current radio channel, as previously set via mfglibSetChannel().
     * @returns uint8_t The current channel.
     */
    mfglibGetChannel(): Promise<number>;
    /**
     * First select the transmit power mode, and then include a method for selecting
     * the radio transmit power. The valid power settings depend upon the specific
     * radio in use. Ember radios have discrete power settings, and then requested
     * power is rounded to a valid power setting; the actual power output is
     * available to the caller via mfglibGetPower().
     * @param txPowerMode uint16_t Power mode. Refer to txPowerModes in stack/include/ember-types.h for possible values.
     * @param power int8_t Power in units of dBm. Refer to radio data sheet for valid range.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    mfglibSetPower(txPowerMode: EmberTXPowerMode, power: number): Promise<EmberStatus>;
    /**
     * Returns the current radio power setting, as previously set via mfglibSetPower().
     * @returns int8_t Power in units of dBm. Refer to radio data sheet for valid range.
     */
    mfglibGetPower(): Promise<number>;
    /**
     * Callback
     * A callback indicating a packet with a valid CRC has been received.
     * @param linkQuality uint8_t The link quality observed during the reception
     * @param rssi int8_t The energy level (in units of dBm) observed during the reception.
     * @param packetLength uint8_t The length of the packetContents parameter in bytes. Will be greater than 3 and less than 123.
     * @param packetContents uint8_t * The received packet (last 2 bytes are not FCS / CRC and may be discarded)
     */
    ezspMfglibRxHandler(linkQuality: number, rssi: number, packetLength: number, packetContents: number[]): void;
    /**
     * Quits the current application and launches the standalone bootloader (if
     * installed) The function returns an error if the standalone bootloader is not
     * present
     * @param mode uint8_t Controls the mode in which the standalone bootloader will run. See the app. note for full details.
     *        Options are: STANDALONE_BOOTLOADER_NORMAL_MODE: Will listen for an over-the-air image transfer on the current
     *        channel with current power settings. STANDALONE_BOOTLOADER_RECOVERY_MODE: Will listen for an over-the-air image
     *        transfer on the default channel with default power settings. Both modes also allow an image transfer to begin
     *        with XMODEM over the serial protocol's Bootloader Frame.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspLaunchStandaloneBootloader(mode: number): Promise<EmberStatus>;
    /**
     * Transmits the given bootload message to a neighboring node using a specific
     * 802.15.4 header that allows the EmberZNet stack as well as the bootloader to
     * recognize the message, but will not interfere with other ZigBee stacks.
     * @param broadcast If true, the destination address and pan id are both set to the broadcast address.
     * @param destEui64 The EUI64 of the target node. Ignored if the broadcast field is set to true.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The multicast message.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspSendBootloadMessage(broadcast: boolean, destEui64: EmberEUI64, messageContents: Buffer): Promise<EmberStatus>;
    /**
     * Detects if the standalone bootloader is installed, and if so returns the
     * installed version. If not return 0xffff. A returned version of 0x1234 would
     * indicate version 1.2 build 34. Also return the node's version of PLAT, MICRO
     * and PHY.
     * @returns uint16_t BOOTLOADER_INVALID_VERSION if the standalone bootloader is not present,
     *          or the version of the installed standalone bootloader.
     * @returns uint8_t * The value of PLAT on the node
     * @returns uint8_t * The value of MICRO on the node
     * @returns uint8_t * The value of PHY on the node
     */
    ezspGetStandaloneBootloaderVersionPlatMicroPhy(): Promise<[number, nodePlat: number, nodeMicro: number, nodePhy: number]>;
    /**
     * Callback
     * A callback invoked by the EmberZNet stack when a bootload message is
     * received.
     * @param longId The EUI64 of the sending node.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the message.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during the reception.
     * @param messageLength uint8_t The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t *The bootload message that was sent.
     */
    ezspIncomingBootloadMessageHandler(longId: EmberEUI64, lastHopLqi: number, lastHopRssi: number, messageContents: Buffer): void;
    /**
     * Callback
     * A callback invoked by the EmberZNet stack when the MAC has finished
     * transmitting a bootload message.
     * @param status An EmberStatus value of EMBER_SUCCESS if an ACK was received from the destination
     *        or EMBER_DELIVERY_FAILED if no ACK was received.
     * @param messageLength uint8_t  The length of the messageContents parameter in bytes.
     * @param messageContents uint8_t * The message that was sent.
     */
    ezspBootloadTransmitCompleteHandler(status: EmberStatus, messageContents: Buffer): void;
    /**
     * Perform AES encryption on plaintext using key.
     * @param uint8_t * 16 bytes of plaintext.
     * @param uint8_t * The 16-byte encryption key to use.
     * @returns uint8_t * 16 bytes of ciphertext.
     */
    ezspAesEncrypt(plaintext: number[], key: number[]): Promise<number[]>;
    /**
     * A consolidation of ZLL network operations with similar signatures;
     * specifically, forming and joining networks or touch-linking.
     * @param networkInfo EmberZllNetwork * Information about the network.
     * @param op Operation indicator.
     * @param radioTxPower int8_t Radio transmission power.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspZllNetworkOps(networkInfo: EmberZllNetwork, op: EzspZllNetworkOperation, radioTxPower: number): Promise<EmberStatus>;
    /**
     * This call will cause the device to setup the security information used in its
     * network. It must be called prior to forming, starting, or joining a network.
     * @param networkKey EmberKeyData * ZLL Network key.
     * @param securityState EmberZllInitialSecurityState * Initial security state of the network.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspZllSetInitialSecurityState(networkKey: EmberKeyData, securityState: EmberZllInitialSecurityState): Promise<EmberStatus>;
    /**
     * This call will update ZLL security token information. Unlike
     * emberZllSetInitialSecurityState, this can be called while a network is
     * already established.
     * @param securityState EmberZllInitialSecurityState * Security state of the network.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspZllSetSecurityStateWithoutKey(securityState: EmberZllInitialSecurityState): Promise<EmberStatus>;
    /**
     * This call will initiate a ZLL network scan on all the specified channels.
     * @param channelMask uint32_t The range of channels to scan.
     * @param radioPowerForScan int8_t The radio output power used for the scan requests.
     * @param nodeType The node type of the local device.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspZllStartScan(channelMask: number, radioPowerForScan: number, nodeType: EmberNodeType): Promise<EmberStatus>;
    /**
     * This call will change the mode of the radio so that the receiver is on for a
     * specified amount of time when the device is idle.
     * @param durationMs uint32_t The duration in milliseconds to leave the radio on.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspZllSetRxOnWhenIdle(durationMs: number): Promise<EmberStatus>;
    /**
     * Callback
     * This call is fired when a ZLL network scan finds a ZLL network.
     * @param networkInfo EmberZllNetwork * Information about the network.
     * @param isDeviceInfoNull Used to interpret deviceInfo field.
     * @param deviceInfo EmberZllDeviceInfoRecord * Device specific information.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the message.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during reception.
     */
    ezspZllNetworkFoundHandler(networkInfo: EmberZllNetwork, isDeviceInfoNull: boolean, deviceInfo: EmberZllDeviceInfoRecord, lastHopLqi: number, lastHopRssi: number): void;
    /**
     * Callback
     * This call is fired when a ZLL network scan is complete.
     * @param status Status of the operation.
     */
    ezspZllScanCompleteHandler(status: EmberStatus): void;
    /**
     * Callback
     * This call is fired when network and group addresses are assigned to a remote
     * mode in a network start or network join request.
     * @param addressInfo EmberZllAddressAssignment * Address assignment information.
     * @param lastHopLqi uint8_t The link quality from the node that last relayed the message.
     * @param lastHopRssi int8_t The energy level (in units of dBm) observed during reception.
     */
    ezspZllAddressAssignmentHandler(addressInfo: EmberZllAddressAssignment, lastHopLqi: number, lastHopRssi: number): void;
    /**
     * Callback
     * This call is fired when the device is a target of a touch link.
     * @param networkInfo EmberZllNetwork * Information about the network.
     */
    ezspZllTouchLinkTargetHandler(networkInfo: EmberZllNetwork): void;
    /**
     * Get the ZLL tokens.
     * @returns EmberTokTypeStackZllData * Data token return value.
     * @returns EmberTokTypeStackZllSecurity * Security token return value.
     */
    ezspZllGetTokens(): Promise<[data: EmberTokTypeStackZllData, security: EmberTokTypeStackZllSecurity]>;
    /**
     * Set the ZLL data token.
     * @param data EmberTokTypeStackZllData * Data token to be set.
     */
    ezspZllSetDataToken(data: EmberTokTypeStackZllData): Promise<void>;
    /**
     * Set the ZLL data token bitmask to reflect the ZLL network state.
     */
    ezspZllSetNonZllNetwork(): Promise<void>;
    /**
     * Is this a ZLL network?
     * @returns ZLL network?
     */
    ezspIsZllNetwork(): Promise<boolean>;
    /**
     * This call sets the radio's default idle power mode.
     * @param mode The power mode to be set.
     */
    ezspZllSetRadioIdleMode(mode: number): Promise<void>;
    /**
     * This call gets the radio's default idle power mode.
     * @returns uint8_t The current power mode.
     */
    ezspZllGetRadioIdleMode(): Promise<number>;
    /**
     * This call sets the default node type for a factory new ZLL device.
     * @param nodeType The node type to be set.
     */
    ezspSetZllNodeType(nodeType: EmberNodeType): Promise<void>;
    /**
     * This call sets additional capability bits in the ZLL state.
     * @param uint16_t A mask with the bits to be set or cleared.
     */
    ezspSetZllAdditionalState(state: number): Promise<void>;
    /**
     * Is there a ZLL (Touchlink) operation in progress?
     * @returns ZLL operation in progress? false on error
     */
    ezspZllOperationInProgress(): Promise<boolean>;
    /**
     * Is the ZLL radio on when idle mode is active?
     * @returns ZLL radio on when idle mode is active? false on error
     */
    ezspZllRxOnWhenIdleGetActive(): Promise<boolean>;
    /**
     * Informs the ZLL API that application scanning is complete
     */
    ezspZllScanningComplete(): Promise<void>;
    /**
     * Get the primary ZLL (touchlink) channel mask.
     * @returns uint32_t The primary ZLL channel mask
     */
    ezspGetZllPrimaryChannelMask(): Promise<number>;
    /**
     * Get the secondary ZLL (touchlink) channel mask.
     * @returns uint32_t The secondary ZLL channel mask
     */
    ezspGetZllSecondaryChannelMask(): Promise<number>;
    /**
     * Set the primary ZLL (touchlink) channel mask
     * @param uint32_t The primary ZLL channel mask
     */
    ezspSetZllPrimaryChannelMask(zllPrimaryChannelMask: number): Promise<void>;
    /**
     * Set the secondary ZLL (touchlink) channel mask.
     * @param uint32_t The secondary ZLL channel mask
     */
    ezspSetZllSecondaryChannelMask(zllSecondaryChannelMask: number): Promise<void>;
    /**
     * Clear ZLL stack tokens.
     */
    ezspZllClearTokens(): Promise<void>;
    /**
     * Sets whether to use parent classification when processing beacons during a
     * join or rejoin. Parent classification considers whether a received beacon
     * indicates trust center connectivity and long uptime on the network
     * @param enabled Enable or disable parent classification
     */
    ezspSetParentClassificationEnabled(enabled: boolean): Promise<void>;
    /**
     * Gets whether to use parent classification when processing beacons during a
     * join or rejoin. Parent classification considers whether a received beacon
     * indicates trust center connectivity and long uptime on the network
     * @returns Enable or disable parent classification
     */
    ezspGetParentClassificationEnabled(): Promise<boolean>;
    /**
     * sets the device uptime to be long or short
     * @param hasLongUpTime if the uptime is long or not
     */
    ezspSetLongUpTime(hasLongUpTime: boolean): Promise<void>;
    /**
     * sets the hub connectivity to be true or false
     * @param connected if the hub is connected or not
     */
    ezspSetHubConnectivity(connected: boolean): Promise<void>;
    /**
     * checks if the device uptime is long or short
     * @returns if the uptime is long or not
     */
    ezspIsUpTimeLong(): Promise<boolean>;
    /**
     * checks if the hub is connected or not
     * @returns if the hub is connected or not
     */
    ezspIsHubConnected(): Promise<boolean>;
    /**
     * Update the GP Proxy table based on a GP pairing.
     * @param options uint32_t The options field of the GP Pairing command.
     * @param addr EmberGpAddress * The target GPD.
     * @param commMode uint8_t The communication mode of the GP Sink.
     * @param sinkNetworkAddress uint16_t The network address of the GP Sink.
     * @param sinkGroupId uint16_t The group ID of the GP Sink.
     * @param assignedAlias uint16_t The alias assigned to the GPD.
     * @param sinkIeeeAddress uint8_t * The IEEE address of the GP Sink.
     * @param gpdKey EmberKeyData * The key to use for the target GPD.
     * @param gpdSecurityFrameCounter uint32_t The GPD security frame counter.
     * @param forwardingRadius uint8_t The forwarding radius.
     * @returns Whether a GP Pairing has been created or not.
     */
    ezspGpProxyTableProcessGpPairing(options: number, addr: EmberGpAddress, commMode: number, sinkNetworkAddress: number, sinkGroupId: number, assignedAlias: number, sinkIeeeAddress: EmberEUI64, gpdKey: EmberKeyData, gpdSecurityFrameCounter: number, forwardingRadius: number): Promise<boolean>;
    /**
     * Adds/removes an entry from the GP Tx Queue.
     * @param action The action to perform on the GP TX queue (true to add, false to remove).
     * @param useCca Whether to use ClearChannelAssessment when transmitting the GPDF.
     * @param addr EmberGpAddress * The Address of the destination GPD.
     * @param gpdCommandId uint8_t The GPD command ID to send.
     * @param gpdAsdu uint8_t * The GP command payload.
     * @param gpepHandle uint8_t The handle to refer to the GPDF.
     * @param gpTxQueueEntryLifetimeMs uint16_t How long to keep the GPDF in the TX Queue.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspDGpSend(action: boolean, useCca: boolean, addr: EmberGpAddress, gpdCommandId: number, gpdAsdu: Buffer, gpepHandle: number, gpTxQueueEntryLifetimeMs: number): Promise<EmberStatus>;
    /**
     * Callback
     * A callback to the GP endpoint to indicate the result of the GPDF
     * transmission.
     * @param status An EmberStatus value indicating success or the reason for failure.
     * @param gpepHandle uint8_t The handle of the GPDF.
     */
    ezspDGpSentHandler(status: EmberStatus, gpepHandle: number): void;
    /**
     * Callback
     * A callback invoked by the ZigBee GP stack when a GPDF is received.
     * @param status The status of the GPDF receive.
     * @param gpdLink uint8_t The gpdLink value of the received GPDF.
     * @param sequenceNumber uint8_t The GPDF sequence number.
     * @param addr EmberGpAddress *The address of the source GPD.
     * @param gpdfSecurityLevel The security level of the received GPDF.
     * @param gpdfSecurityKeyType The securityKeyType used to decrypt/authenticate the incoming GPDF.
     * @param autoCommissioning Whether the incoming GPDF had the auto-commissioning bit set.
     * @param bidirectionalInfo uint8_t Bidirectional information represented in bitfields,
     *        where bit0 holds the rxAfterTx of incoming gpdf and bit1 holds if tx queue is available for outgoing gpdf.
     * @param gpdSecurityFrameCounter uint32_t The security frame counter of the incoming GDPF.
     * @param gpdCommandId uint8_t The gpdCommandId of the incoming GPDF.
     * @param mic uint32_t The received MIC of the GPDF.
     * @param proxyTableIndex uint8_tThe proxy table index of the corresponding proxy table entry to the incoming GPDF.
     * @param gpdCommandPayload uint8_t * The GPD command payload.
     */
    ezspGpepIncomingMessageHandler(status: EmberStatus, gpdLink: number, sequenceNumber: number, addr: EmberGpAddress, gpdfSecurityLevel: EmberGpSecurityLevel, gpdfSecurityKeyType: EmberGpKeyType, autoCommissioning: boolean, bidirectionalInfo: number, gpdSecurityFrameCounter: number, gpdCommandId: number, mic: number, proxyTableIndex: number, gpdCommandPayload: Buffer): void;
    /**
     * Retrieves the proxy table entry stored at the passed index.
     * @param proxyIndex uint8_t The index of the requested proxy table entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberGpProxyTableEntry * An EmberGpProxyTableEntry struct containing a copy of the requested proxy entry.
     */
    ezspGpProxyTableGetEntry(proxyIndex: number): Promise<[EmberStatus, entry: EmberGpProxyTableEntry]>;
    /**
     * Finds the index of the passed address in the gp table.
     * @param addr EmberGpAddress * The address to search for
     * @returns uint8_t The index, or 0xFF for not found
     */
    ezspGpProxyTableLookup(addr: EmberGpAddress): Promise<number>;
    /**
     * Retrieves the sink table entry stored at the passed index.
     * @param sinkIndex uint8_t The index of the requested sink table entry.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberGpSinkTableEntry * An EmberGpSinkTableEntry struct containing a copy of the requested sink entry.
     */
    ezspGpSinkTableGetEntry(sinkIndex: number): Promise<[EmberStatus, entry: EmberGpSinkTableEntry]>;
    /**
     * Finds the index of the passed address in the gp table.
     * @param addr EmberGpAddress *The address to search for.
     * @returns uint8_t The index, or 0xFF for not found
     */
    ezspGpSinkTableLookup(addr: EmberGpAddress): Promise<number>;
    /**
     * Retrieves the sink table entry stored at the passed index.
     * @param sinkIndex uint8_t The index of the requested sink table entry.
     * @param entry EmberGpSinkTableEntry * An EmberGpSinkTableEntry struct containing a copy of the sink entry to be updated.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspGpSinkTableSetEntry(sinkIndex: number, entry: EmberGpSinkTableEntry): Promise<EmberStatus>;
    /**
     * Removes the sink table entry stored at the passed index.
     * @param uint8_t The index of the requested sink table entry.
     */
    ezspGpSinkTableRemoveEntry(sinkIndex: number): Promise<void>;
    /**
     * Finds or allocates a sink entry
     * @param addr EmberGpAddress * An EmberGpAddress struct containing a copy of the gpd address to be found.
     * @returns uint8_t An index of found or allocated sink or 0xFF if failed.
     */
    ezspGpSinkTableFindOrAllocateEntry(addr: EmberGpAddress): Promise<number>;
    /**
     * Clear the entire sink table
     */
    ezspGpSinkTableClearAll(): Promise<void>;
    /**
     * Iniitializes Sink Table
     */
    ezspGpSinkTableInit(): Promise<void>;
    /**
     * Sets security framecounter in the sink table
     * @param index uint8_t Index to the Sink table
     * @param sfc uint32_t Security Frame Counter
     */
    ezspGpSinkTableSetSecurityFrameCounter(index: number, sfc: number): Promise<void>;
    /**
     * Puts the GPS in commissioning mode.
     * @param uint8_t commissioning options
     * @param uint16_t gpm address for security.
     * @param uint16_t gpm address for pairing.
     * @param uint8_t sink endpoint.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspGpSinkCommission(options: number, gpmAddrForSecurity: number, gpmAddrForPairing: number, sinkEndpoint: number): Promise<EmberStatus>;
    /**
     * Clears all entries within the translation table.
     */
    ezspGpTranslationTableClear(): Promise<void>;
    /**
     * Return number of active entries in sink table.
     * @returns uint8_t Number of active entries in sink table. 0 if error.
     */
    ezspGpSinkTableGetNumberOfActiveEntries(): Promise<number>;
    /**
     * Gets the total number of tokens.
     * @returns uint8_t Total number of tokens.
     */
    ezspGetTokenCount(): Promise<number>;
    /**
     * Gets the token information for a single token at provided index
     * @param index uint8_t Index of the token in the token table for which information is needed.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberTokenInfo * Token information.
     */
    ezspGetTokenInfo(index: number): Promise<[EmberStatus, tokenInfo: EmberTokenInfo]>;
    /**
     * Gets the token data for a single token with provided key
     * @param token uint32_t Key of the token in the token table for which data is needed.
     * @param index uint32_t Index in case of the indexed token.
     * @returns An EmberStatus value indicating success or the reason for failure.
     * @returns EmberTokenData * Token Data
     */
    ezspGetTokenData(token: number, index: number): Promise<[EmberStatus, tokenData: EmberTokenData]>;
    /**
     * Sets the token data for a single token with provided key
     * @param token uint32_t Key of the token in the token table for which data is to be set.
     * @param index uint32_t Index in case of the indexed token.
     * @param EmberTokenData * Token Data
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspSetTokenData(token: number, index: number, tokenData: EmberTokenData): Promise<EmberStatus>;
    /**
     * Reset the node by calling halReboot.
     */
    ezspResetNode(): Promise<void>;
    /**
     * Run GP security test vectors.
     * @returns An EmberStatus value indicating success or the reason for failure.
     */
    ezspGpSecurityTestVectors(): Promise<EmberStatus>;
    /**
     * Factory reset all configured zigbee tokens
     * @param excludeOutgoingFC Exclude network and APS outgoing frame counter tokens.
     * @param excludeBootCounter Exclude stack boot counter token.
     */
    ezspTokenFactoryReset(excludeOutgoingFC: boolean, excludeBootCounter: boolean): Promise<void>;
}
//# sourceMappingURL=ezsp.d.ts.map