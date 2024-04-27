/// <reference types="node" />
import { Direction } from './definition';
import ZclHeader from './zclHeader';
import * as TsType from './tstype';
import { FrameType } from './definition';
import { CustomClusters } from './definition/tstype';
type ZclPayload = any;
declare class ZclFrame {
    readonly header: ZclHeader;
    readonly payload: ZclPayload;
    readonly cluster: TsType.Cluster;
    readonly command: TsType.Command;
    private constructor();
    toString(): string;
    /**
     * Creating
     */
    static create(frameType: FrameType, direction: Direction, disableDefaultResponse: boolean, manufacturerCode: number | null, transactionSequenceNumber: number, commandKey: number | string, clusterKey: number | string, payload: ZclPayload, customClusters: CustomClusters, reservedBits?: number): ZclFrame;
    toBuffer(): Buffer;
    private writePayloadGlobal;
    private writePayloadCluster;
    /**
     * Parsing
     */
    static fromBuffer(clusterID: number, header: ZclHeader, buffer: Buffer, customClusters: CustomClusters): ZclFrame;
    private static parsePayload;
    private static parsePayloadCluster;
    private static parsePayloadGlobal;
    /**
     * Utils
     */
    private static getDataTypeString;
    private static conditionsValid;
    isCluster(clusterName: 'genTime' | 'genAnalogInput' | 'genBasic' | 'genGroups' | 'genPollCtrl' | 'ssIasZone'): boolean;
    isCommand(commandName: 'read' | 'report' | 'readRsp' | 'remove' | 'add' | 'write' | 'enrollReq' | 'configReport' | 'checkin' | 'writeRsp'): boolean;
}
export default ZclFrame;
//# sourceMappingURL=zclFrame.d.ts.map