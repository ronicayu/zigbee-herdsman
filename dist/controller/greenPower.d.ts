/// <reference types="node" />
import { Adapter, Events as AdapterEvents } from '../adapter';
import * as Zcl from '../zcl';
import events from 'events';
declare class GreenPower extends events.EventEmitter {
    private adapter;
    constructor(adapter: Adapter);
    private encryptSecurityKey;
    private sendPairingCommand;
    onZclGreenPowerData(dataPayload: AdapterEvents.ZclPayload, frame: Zcl.ZclFrame): Promise<void>;
    permitJoin(time: number, networkAddress: number): Promise<void>;
}
export default GreenPower;
//# sourceMappingURL=greenPower.d.ts.map