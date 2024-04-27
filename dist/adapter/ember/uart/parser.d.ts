/// <reference types="node" />
/// <reference types="node" />
import { Transform, TransformCallback, TransformOptions } from "stream";
export declare class AshParser extends Transform {
    private buffer;
    constructor(opts?: TransformOptions);
    _transform(chunk: Buffer, encoding: BufferEncoding, cb: TransformCallback): void;
    _flush(cb: TransformCallback): void;
}
//# sourceMappingURL=parser.d.ts.map