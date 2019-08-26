"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Broadcaster execution result - promises executed by operations and number of executed listeners and subscribers.
 */
class BroadcasterResult {
    constructor() {
        /**
         * Number of executed listeners and subscribers.
         */
        this.count = 0;
        /**
         * Promises returned by listeners and subscribers which needs to be awaited.
         */
        this.promises = [];
    }
}
exports.BroadcasterResult = BroadcasterResult;
