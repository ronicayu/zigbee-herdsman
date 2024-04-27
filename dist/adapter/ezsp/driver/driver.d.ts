/// <reference types="node" />
/// <reference types="node" />
import * as TsType from './../../tstype';
import { Ezsp, EZSPFrameData, EZSPZDOResponseFrameData } from './ezsp';
import { EmberZDOCmd, EmberKeyData } from './types';
import { EventEmitter } from "events";
import { EmberApsFrame, EmberNetworkParameters, EmberRawFrame, EmberIeeeRawFrame } from './types/struct';
import { EmberEUI64, EmberKeyType } from './types/named';
import { ParamsDesc } from './commands';
import { EZSPAdapterBackup } from '../adapter/backup';
interface AddEndpointParameters {
    endpoint?: number;
    profileId?: number;
    deviceId?: number;
    appFlags?: number;
    inputClusters?: number[];
    outputClusters?: number[];
}
type EmberFrame = {
    address: number;
    payload: Buffer;
    frame: EmberApsFrame;
};
export interface EmberIncomingMessage {
    messageType: number;
    apsFrame: EmberApsFrame;
    lqi: number;
    rssi: number;
    sender: number;
    bindingIndex: number;
    addressIndex: number;
    message: Buffer;
    senderEui64: EmberEUI64;
}
export declare class Driver extends EventEmitter {
    ezsp: Ezsp;
    private nwkOpt;
    private greenPowerGroup;
    networkParams: EmberNetworkParameters;
    version: {
        product: number;
        majorrel: string;
        minorrel: string;
        maintrel: string;
        revision: string;
    };
    private eui64ToNodeId;
    private eui64ToRelays;
    ieee: EmberEUI64;
    private multicast;
    private waitress;
    private transactionID;
    private serialOpt;
    backupMan: EZSPAdapterBackup;
    constructor(serialOpt: TsType.SerialPortOptions, nwkOpt: TsType.NetworkOptions, greenPowerGroup: number, backupPath: string);
    /**
     * Requested by the EZSP watchdog after too many failures, or by UART layer after port closed unexpectedly.
     * Tries to stop the layers below and startup again.
     * @returns
     */
    reset(): Promise<void>;
    private onEzspReset;
    private onEzspClose;
    stop(emitClose?: boolean): Promise<void>;
    startup(): Promise<TsType.StartResult>;
    private needsToBeInitialised;
    private formNetwork;
    private handleFrame;
    private handleRouteRecord;
    private handleRouteError;
    private handleNetworkStatus;
    private handleNodeLeft;
    private resetMfgId;
    handleNodeJoined(nwk: number, ieee: EmberEUI64 | number[]): void;
    setNode(nwk: number, ieee: EmberEUI64 | number[]): void;
    request(nwk: number | EmberEUI64, apsFrame: EmberApsFrame, data: Buffer, extendedTimeout?: boolean): Promise<boolean>;
    mrequest(apsFrame: EmberApsFrame, data: Buffer, timeout?: number): Promise<boolean>;
    rawrequest(rawFrame: EmberRawFrame, data: Buffer, timeout?: number): Promise<boolean>;
    ieeerawrequest(rawFrame: EmberIeeeRawFrame, data: Buffer, timeout?: number): Promise<boolean>;
    brequest(destination: number, apsFrame: EmberApsFrame, data: Buffer): Promise<boolean>;
    private nextTransactionID;
    makeApsFrame(clusterId: number, disableResponse: boolean): EmberApsFrame;
    makeEmberRawFrame(): EmberRawFrame;
    makeEmberIeeeRawFrame(): EmberIeeeRawFrame;
    zdoRequest(networkAddress: number, requestCmd: EmberZDOCmd, responseCmd: EmberZDOCmd, params: ParamsDesc): Promise<EZSPZDOResponseFrameData>;
    networkIdToEUI64(nwk: number): Promise<EmberEUI64>;
    preJoining(seconds: number): Promise<void>;
    permitJoining(seconds: number): Promise<EZSPFrameData>;
    makeZDOframe(name: string | number, params: ParamsDesc): Buffer;
    addEndpoint({ endpoint, profileId, deviceId, appFlags, inputClusters, outputClusters }: AddEndpointParameters): Promise<void>;
    waitFor(address: number, clusterId: number, sequence: number, timeout?: number): {
        start: () => {
            promise: Promise<EmberFrame>;
            ID: number;
        };
        ID: number;
    };
    private waitressTimeoutFormatter;
    private waitressValidator;
    setRadioPower(value: number): Promise<EZSPFrameData>;
    setChannel(channel: number): Promise<EZSPFrameData>;
    addTransientLinkKey(partner: EmberEUI64, transientKey: EmberKeyData): Promise<EZSPFrameData>;
    addInstallCode(ieeeAddress: string, key: Buffer): Promise<void>;
    getKey(keyType: EmberKeyType): Promise<EZSPFrameData>;
    getNetworkKeyInfo(): Promise<EZSPFrameData>;
    private needsToBeRestore;
}
export {};
//# sourceMappingURL=driver.d.ts.map