"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLogger = exports.logger = void 0;
exports.logger = {
    debug: (message, namespace) => console.debug(`${namespace}: ${message}`),
    info: (message, namespace) => console.info(`${namespace}: ${message}`),
    warning: (message, namespace) => console.warn(`${namespace}: ${message}`),
    error: (message, namespace) => console.error(`${namespace}: ${message}`),
};
function setLogger(l) {
    exports.logger = l;
}
exports.setLogger = setLogger;
//# sourceMappingURL=logger.js.map