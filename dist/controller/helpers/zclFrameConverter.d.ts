import { ZclFrame } from '../../zcl';
import { CustomClusters } from '../../zcl/definition/tstype';
interface KeyValue {
    [s: string]: number | string;
}
declare function attributeKeyValue(frame: ZclFrame, deviceManufacturerID: number, customClusters: CustomClusters): KeyValue;
declare function attributeList(frame: ZclFrame, deviceManufacturerID: number, customClusters: CustomClusters): Array<string | number>;
export { attributeKeyValue, attributeList, };
//# sourceMappingURL=zclFrameConverter.d.ts.map