/// <reference types="node" />
import { FrameControl } from './definition';
import BuffaloZcl from './buffaloZcl';
declare class ZclHeader {
    readonly frameControl: FrameControl;
    readonly manufacturerCode: number | null;
    readonly transactionSequenceNumber: number;
    readonly commandIdentifier: number;
    constructor(frameControl: FrameControl, manufacturerCode: number | null, transactionSequenceNumber: number, commandIdentifier: number);
    /** Returns the amount of bytes used by this header */
    get length(): number;
    get isGlobal(): boolean;
    get isSpecific(): boolean;
    write(buffalo: BuffaloZcl): void;
    static fromBuffer(buffer: Buffer): ZclHeader | undefined;
}
export default ZclHeader;
//# sourceMappingURL=zclHeader.d.ts.map