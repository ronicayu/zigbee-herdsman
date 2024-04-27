import { Driver } from '../driver';
import * as Models from "../../../models";
export declare class EZSPAdapterBackup {
    private driver;
    private defaultPath;
    constructor(driver: Driver, path: string);
    createBackup(): Promise<Models.Backup>;
    /**
     * Loads currently stored backup and returns it in internal backup model.
     */
    getStoredBackup(): Promise<Models.Backup>;
}
//# sourceMappingURL=backup.d.ts.map