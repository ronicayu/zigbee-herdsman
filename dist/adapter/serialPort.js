"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerialPort = void 0;
/* istanbul ignore file */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/semi */
// This file was copied from https://github.com/serialport/node-serialport/blob/master/packages/serialport/lib/serialport.ts.
const stream_1 = require("@serialport/stream");
const bindings_cpp_1 = require("@serialport/bindings-cpp");
const DetectedBinding = (0, bindings_cpp_1.autoDetect)();
class SerialPort extends stream_1.SerialPortStream {
    static list = DetectedBinding.list;
    static binding = DetectedBinding;
    constructor(options, openCallback) {
        const opts = {
            binding: DetectedBinding,
            ...options,
        };
        super(opts, openCallback);
    }
    async asyncOpen() {
        return new Promise((resolve, reject) => {
            this.open((err) => (err ? reject(err) : resolve()));
        });
    }
    async asyncClose() {
        return new Promise((resolve, reject) => {
            this.close((err) => (err ? reject(err) : resolve()));
        });
    }
    async asyncFlush() {
        return new Promise((resolve, reject) => {
            this.flush((err) => (err ? reject(err) : resolve()));
        });
    }
    async asyncFlushAndClose() {
        await this.asyncFlush();
        await this.asyncClose();
    }
    async asyncGet() {
        return new Promise((resolve, reject) => {
            this.get((err, options) => (err ? reject(err) : resolve(options)));
        });
    }
}
exports.SerialPort = SerialPort;
//# sourceMappingURL=serialPort.js.map