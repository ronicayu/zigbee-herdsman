/// <reference types="node" />
import { NetworkOptions, SerialPortOptions, Coordinator, CoordinatorVersion, NodeDescriptor, ActiveEndpoints, SimpleDescriptor, LQI, RoutingTable, NetworkParameters, StartResult, AdapterOptions } from '../../tstype';
import * as Events from '../../events';
import Adapter from '../../adapter';
import { ZpiObject } from '../znp';
import { ZclFrame, FrameType, Direction } from '../../../zcl';
import * as Models from "../../../models";
declare class ZStackAdapter extends Adapter {
    private deviceAnnounceRouteDiscoveryDebouncers;
    private znp;
    private adapterManager;
    private transactionID;
    private version;
    private closing;
    private queue;
    private supportsLED;
    private interpanLock;
    private interpanEndpointRegistered;
    private waitress;
    constructor(networkOptions: NetworkOptions, serialPortOptions: SerialPortOptions, backupPath: string, adapterOptions: AdapterOptions);
    /**
     * Adapter methods
     */
    start(): Promise<StartResult>;
    stop(): Promise<void>;
    static isValidPath(path: string): Promise<boolean>;
    static autoDetectPath(): Promise<string>;
    getCoordinator(): Promise<Coordinator>;
    permitJoin(seconds: number, networkAddress: number): Promise<void>;
    getCoordinatorVersion(): Promise<CoordinatorVersion>;
    reset(type: 'soft' | 'hard'): Promise<void>;
    private setLED;
    private requestNetworkAddress;
    private supportsAssocRemove;
    private supportsAssocAdd;
    private discoverRoute;
    nodeDescriptor(networkAddress: number): Promise<NodeDescriptor>;
    private nodeDescriptorInternal;
    activeEndpoints(networkAddress: number): Promise<ActiveEndpoints>;
    simpleDescriptor(networkAddress: number, endpointID: number): Promise<SimpleDescriptor>;
    sendZclFrameToEndpoint(ieeeAddr: string, networkAddress: number, endpoint: number, zclFrame: ZclFrame, timeout: number, disableResponse: boolean, disableRecovery: boolean, sourceEndpoint?: number): Promise<Events.ZclPayload>;
    private sendZclFrameToEndpointInternal;
    sendZclFrameToGroup(groupID: number, zclFrame: ZclFrame, sourceEndpoint?: number): Promise<void>;
    sendZclFrameToAll(endpoint: number, zclFrame: ZclFrame, sourceEndpoint: number): Promise<void>;
    lqi(networkAddress: number): Promise<LQI>;
    routingTable(networkAddress: number): Promise<RoutingTable>;
    addInstallCode(ieeeAddress: string, key: Buffer): Promise<void>;
    bind(destinationNetworkAddress: number, sourceIeeeAddress: string, sourceEndpoint: number, clusterID: number, destinationAddressOrGroup: string | number, type: 'endpoint' | 'group', destinationEndpoint?: number): Promise<void>;
    unbind(destinationNetworkAddress: number, sourceIeeeAddress: string, sourceEndpoint: number, clusterID: number, destinationAddressOrGroup: string | number, type: 'endpoint' | 'group', destinationEndpoint: number): Promise<void>;
    removeDevice(networkAddress: number, ieeeAddr: string): Promise<void>;
    /**
     * Event handlers
     */
    onZnpClose(): void;
    onZnpRecieved(object: ZpiObject): void;
    getNetworkParameters(): Promise<NetworkParameters>;
    supportsBackup(): Promise<boolean>;
    backup(ieeeAddressesInDatabase: string[]): Promise<Models.Backup>;
    setChannelInterPAN(channel: number): Promise<void>;
    sendZclFrameInterPANToIeeeAddr(zclFrame: ZclFrame, ieeeAddr: string): Promise<void>;
    sendZclFrameInterPANBroadcast(zclFrame: ZclFrame, timeout: number): Promise<Events.ZclPayload>;
    restoreChannelInterPAN(): Promise<void>;
    supportsChangeChannel(): Promise<boolean>;
    changeChannel(newChannel: number): Promise<void>;
    setTransmitPower(value: number): Promise<void>;
    private waitForInternal;
    waitFor(networkAddress: number, endpoint: number, frameType: FrameType, direction: Direction, transactionSequenceNumber: number, clusterID: number, commandIdentifier: number, timeout: number): {
        promise: Promise<Events.ZclPayload>;
        cancel: () => void;
    };
    /**
     * Private methods
     */
    private dataRequest;
    private dataRequestExtended;
    private nextTransactionID;
    private toAddressString;
    private waitressTimeoutFormatter;
    private waitressValidator;
    private checkInterpanLock;
}
export default ZStackAdapter;
//# sourceMappingURL=zStackAdapter.d.ts.map