"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Multicast = void 0;
/* istanbul ignore file */
const logger_1 = require("../../../utils/logger");
const types_1 = require("./types");
const named_1 = require("./types/named");
const struct_1 = require("./types/struct");
const NS = 'zh:ezsp:cast';
class Multicast {
    TABLE_SIZE = 16;
    driver;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    _multicast;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    _available;
    constructor(driver) {
        this.driver = driver;
        this._multicast = {};
        this._available = [];
    }
    async _initialize() {
        const size = await this.driver.ezsp.getConfigurationValue(types_1.EzspConfigId.CONFIG_MULTICAST_TABLE_SIZE);
        for (let i = 0; i < size; i++) {
            const entry = await this.driver.ezsp.getMulticastTableEntry(i);
            logger_1.logger.debug(`MulticastTableEntry[${i}] = ${entry}`, NS);
            if (entry.endpoint !== 0) {
                this._multicast[entry.multicastId] = [entry, i];
            }
            else {
                this._available.push(i);
            }
        }
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    async startup(enpoints) {
        await this._initialize();
        for (const ep of enpoints) {
            if (!ep.id)
                continue;
            for (const group_id of ep.member_of) {
                await this.subscribe(group_id, ep.id);
            }
        }
    }
    async subscribe(group_id, endpoint) {
        if (this._multicast.hasOwnProperty(group_id)) {
            logger_1.logger.debug(`${group_id} is already subscribed`, NS);
            return named_1.EmberStatus.SUCCESS;
        }
        try {
            const idx = this._available.pop();
            const entry = new struct_1.EmberMulticastTableEntry();
            entry.endpoint = endpoint;
            entry.multicastId = group_id;
            entry.networkIndex = 0;
            const status = await this.driver.ezsp.setMulticastTableEntry(idx, entry);
            if (status !== named_1.EmberStatus.SUCCESS) {
                logger_1.logger.error(`Set MulticastTableEntry #${idx} for ${entry.multicastId} multicast id: ${status}`, NS);
                this._available.push(idx);
                return status;
            }
            this._multicast[entry.multicastId] = [entry, idx];
            logger_1.logger.debug(`Set MulticastTableEntry #${idx} for ${entry.multicastId} multicast id: ${status}`, NS);
            return status;
        }
        catch (e) {
            logger_1.logger.error("No more available slots MulticastId subscription", NS);
            return named_1.EmberStatus.INDEX_OUT_OF_RANGE;
        }
    }
}
exports.Multicast = Multicast;
//# sourceMappingURL=multicast.js.map