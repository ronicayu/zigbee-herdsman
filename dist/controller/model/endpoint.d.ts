import Entity from './entity';
import { KeyValue, SendPolicy } from '../tstype';
import * as Zcl from '../../zcl';
import Group from './group';
import Device from './device';
export interface ConfigureReportingItem {
    attribute: string | number | {
        ID: number;
        type: number;
    };
    minimumReportInterval: number;
    maximumReportInterval: number;
    reportableChange: number | [number, number];
}
interface Options {
    manufacturerCode?: number;
    disableDefaultResponse?: boolean;
    disableResponse?: boolean;
    timeout?: number;
    direction?: Zcl.Direction;
    srcEndpoint?: number;
    reservedBits?: number;
    transactionSequenceNumber?: number;
    disableRecovery?: boolean;
    writeUndiv?: boolean;
    sendPolicy?: SendPolicy;
}
interface Clusters {
    [cluster: string]: {
        attributes: {
            [attribute: string]: number | string;
        };
    };
}
interface Bind {
    cluster: Zcl.TsType.Cluster;
    target: Endpoint | Group;
}
interface ConfiguredReporting {
    cluster: Zcl.TsType.Cluster;
    attribute: Zcl.TsType.Attribute;
    minimumReportInterval: number;
    maximumReportInterval: number;
    reportableChange: number;
}
declare class Endpoint extends Entity {
    deviceID?: number;
    inputClusters: number[];
    outputClusters: number[];
    profileID?: number;
    readonly ID: number;
    readonly clusters: Clusters;
    deviceIeeeAddress: string;
    deviceNetworkAddress: number;
    private _binds;
    private _configuredReportings;
    meta: KeyValue;
    private pendingRequests;
    get binds(): Bind[];
    get configuredReportings(): ConfiguredReporting[];
    private constructor();
    /**
     * Get device of this endpoint
     */
    getDevice(): Device;
    /**
     * @param {number|string} clusterKey
     * @returns {boolean}
     */
    supportsInputCluster(clusterKey: number | string): boolean;
    /**
     * @param {number|string} clusterKey
     * @returns {boolean}
     */
    supportsOutputCluster(clusterKey: number | string): boolean;
    /**
     * @returns {Zcl.TsType.Cluster[]}
     */
    getInputClusters(): Zcl.TsType.Cluster[];
    /**
     * @returns {Zcl.TsType.Cluster[]}
     */
    getOutputClusters(): Zcl.TsType.Cluster[];
    private clusterNumbersToClusters;
    static fromDatabaseRecord(record: KeyValue, deviceNetworkAddress: number, deviceIeeeAddress: string): Endpoint;
    toDatabaseRecord(): KeyValue;
    static create(ID: number, profileID: number, deviceID: number, inputClusters: number[], outputClusters: number[], deviceNetworkAddress: number, deviceIeeeAddress: string): Endpoint;
    saveClusterAttributeKeyValue(clusterKey: number | string, list: KeyValue): void;
    getClusterAttributeValue(clusterKey: number | string, attributeKey: number | string): number | string;
    hasPendingRequests(): boolean;
    sendPendingRequests(fastPolling: boolean): Promise<void>;
    private sendRequest;
    private checkStatus;
    report(clusterKey: number | string, attributes: KeyValue, options?: Options): Promise<void>;
    write(clusterKey: number | string, attributes: KeyValue, options?: Options): Promise<void>;
    writeResponse(clusterKey: number | string, transactionSequenceNumber: number, attributes: KeyValue, options?: Options): Promise<void>;
    read(clusterKey: number | string, attributes: (string | number)[], options?: Options): Promise<KeyValue>;
    readResponse(clusterKey: number | string, transactionSequenceNumber: number, attributes: KeyValue, options?: Options): Promise<void>;
    addBinding(clusterKey: number | string, target: Endpoint | Group | number): void;
    bind(clusterKey: number | string, target: Endpoint | Group | number): Promise<void>;
    save(): void;
    unbind(clusterKey: number | string, target: Endpoint | Group | number): Promise<void>;
    defaultResponse(commandID: number, status: number, clusterID: number, transactionSequenceNumber: number, options?: Options): Promise<void>;
    configureReporting(clusterKey: number | string, items: ConfigureReportingItem[], options?: Options): Promise<void>;
    writeStructured(clusterKey: number | string, payload: KeyValue, options?: Options): Promise<void>;
    command(clusterKey: number | string, commandKey: number | string, payload: KeyValue, options?: Options): Promise<void | KeyValue>;
    commandResponse(clusterKey: number | string, commandKey: number | string, payload: KeyValue, options?: Options, transactionSequenceNumber?: number): Promise<void | KeyValue>;
    waitForCommand(clusterKey: number | string, commandKey: number | string, transactionSequenceNumber: number, timeout: number): {
        promise: Promise<{
            header: Zcl.ZclHeader;
            payload: KeyValue;
        }>;
        cancel: () => void;
    };
    private getOptionsWithDefaults;
    private ensureManufacturerCodeIsUniqueAndGet;
    addToGroup(group: Group): Promise<void>;
    private getCluster;
    /**
     * Remove endpoint from a group, accepts both a Group and number as parameter.
     * The number parameter type should only be used when removing from a group which is not known
     * to zigbee-herdsman.
     */
    removeFromGroup(group: Group | number): Promise<void>;
    removeFromAllGroups(): Promise<void>;
    removeFromAllGroupsDatabase(): void;
    zclCommand(clusterKey: number | string, commandKey: number | string, payload: KeyValue, options?: Options, logPayload?: KeyValue, checkStatus?: boolean, frameType?: Zcl.FrameType): Promise<void | Zcl.ZclFrame>;
}
export default Endpoint;
//# sourceMappingURL=endpoint.d.ts.map