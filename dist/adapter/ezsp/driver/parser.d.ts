/// <reference types="node" />
/// <reference types="node" />
import * as stream from 'stream';
export declare class Parser extends stream.Transform {
    private tail;
    private flagXONXOFF;
    constructor(flagXONXOFF?: boolean);
    _transform(chunk: Buffer, _: string, cb: () => void): void;
    private unstuff;
    reset(): void;
}
//# sourceMappingURL=parser.d.ts.map