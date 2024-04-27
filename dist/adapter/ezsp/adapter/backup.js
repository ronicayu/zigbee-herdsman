"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EZSPAdapterBackup = void 0;
const types_1 = require("../driver/types");
const utils_1 = require("../driver/utils");
const mz_1 = require("mz");
const utils_2 = require("../../../utils");
const logger_1 = require("../../../utils/logger");
const NS = 'zh:ezsp:backup';
class EZSPAdapterBackup {
    driver;
    defaultPath;
    constructor(driver, path) {
        this.driver = driver;
        this.defaultPath = path;
    }
    async createBackup() {
        logger_1.logger.debug("creating backup", NS);
        const version = await this.driver.ezsp.version();
        const linkResult = await this.driver.getKey(types_1.EmberKeyType.TRUST_CENTER_LINK_KEY);
        const netParams = await this.driver.ezsp.execCommand('getNetworkParameters');
        const networkParams = netParams.parameters;
        const netResult = await this.driver.getKey(types_1.EmberKeyType.CURRENT_NETWORK_KEY);
        let tclKey = null;
        let netKey = null;
        let netKeySequenceNumber = 0;
        let netKeyFrameCounter = 0;
        if (version < 13) {
            tclKey = Buffer.from(linkResult.keyStruct.key.contents);
            netKey = Buffer.from(netResult.keyStruct.key.contents);
            netKeySequenceNumber = netResult.keyStruct.sequenceNumber;
            netKeyFrameCounter = netResult.keyStruct.outgoingFrameCounter;
        }
        else {
            tclKey = Buffer.from(linkResult.keyData.contents);
            netKey = Buffer.from(netResult.keyData.contents);
            // get rest of info from second cmd in EZSP 13+
            const netKeyInfoResult = await this.driver.getNetworkKeyInfo();
            const networkKeyInfo = netKeyInfoResult.networkKeyInfo;
            netKeySequenceNumber = networkKeyInfo.networkKeySequenceNumber;
            netKeyFrameCounter = networkKeyInfo.networkKeyFrameCounter;
        }
        const ieee = (await this.driver.ezsp.execCommand('getEui64')).eui64;
        /* return backup structure */
        /* istanbul ignore next */
        return {
            ezsp: {
                version: version,
                hashed_tclk: tclKey,
            },
            networkOptions: {
                panId: networkParams.panId,
                extendedPanId: Buffer.from(networkParams.extendedPanId),
                channelList: (0, utils_1.channelsMask2list)(networkParams.channels),
                networkKey: netKey,
                networkKeyDistribute: true,
            },
            logicalChannel: networkParams.radioChannel,
            networkKeyInfo: {
                sequenceNumber: netKeySequenceNumber,
                frameCounter: netKeyFrameCounter
            },
            securityLevel: 5,
            networkUpdateId: networkParams.nwkUpdateId,
            coordinatorIeeeAddress: ieee,
            devices: []
        };
    }
    /**
     * Loads currently stored backup and returns it in internal backup model.
     */
    async getStoredBackup() {
        try {
            await mz_1.fs.access(this.defaultPath);
        }
        catch (error) {
            return null;
        }
        let data;
        try {
            data = JSON.parse((await mz_1.fs.readFile(this.defaultPath)).toString());
        }
        catch (error) {
            throw new Error('Coordinator backup is corrupted');
        }
        if (data.metadata?.format === "zigpy/open-coordinator-backup" && data.metadata?.version) {
            if (data.metadata?.version !== 1) {
                throw new Error(`Unsupported open coordinator backup version (version=${data.metadata?.version})`);
            }
            if (!data.metadata.internal?.ezspVersion) {
                throw new Error(`This open coordinator backup format not for EZSP adapter`);
            }
            return utils_2.BackupUtils.fromUnifiedBackup(data);
        }
        else {
            throw new Error("Unknown backup format");
        }
    }
}
exports.EZSPAdapterBackup = EZSPAdapterBackup;
//# sourceMappingURL=backup.js.map