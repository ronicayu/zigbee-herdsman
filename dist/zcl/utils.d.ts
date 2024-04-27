import { DataType } from './definition';
import { ClusterDefinition, ClusterName, CustomClusters } from './definition/tstype';
import * as TsType from './tstype';
declare function IsDataTypeAnalogOrDiscrete(dataType: DataType): 'ANALOG' | 'DISCRETE';
declare function createCluster(name: string, cluster: ClusterDefinition, manufacturerCode?: number): TsType.Cluster;
declare function getCluster(key: string | number, manufacturerCode: number | null, customClusters: CustomClusters): TsType.Cluster;
declare function getGlobalCommand(key: number | string): TsType.Command;
declare function isClusterName(name: string): name is ClusterName;
export { getCluster, getGlobalCommand, IsDataTypeAnalogOrDiscrete, createCluster, isClusterName, };
//# sourceMappingURL=utils.d.ts.map