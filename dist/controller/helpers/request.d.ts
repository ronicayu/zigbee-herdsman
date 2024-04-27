import { SendPolicy } from '../tstype';
import * as Zcl from '../../zcl';
declare class Request<Type = any> {
    static defaultSendPolicy: {
        [key: number]: SendPolicy;
    };
    private func;
    frame: Zcl.ZclFrame;
    expires: number;
    sendPolicy: SendPolicy;
    private resolveQueue;
    private rejectQueue;
    private lastError;
    constructor(func: (frame: Zcl.ZclFrame) => Promise<Type>, frame: Zcl.ZclFrame, timeout: number, sendPolicy?: SendPolicy, lastError?: Error, resolve?: (value: Type) => void, reject?: (error: Error) => void);
    moveCallbacks(from: Request<Type>): void;
    addCallbacks(resolve: (value: Type) => void, reject: (error: Error) => void): void;
    reject(error?: Error): void;
    resolve(value: Type): void;
    send(): Promise<Type>;
}
export default Request;
//# sourceMappingURL=request.d.ts.map