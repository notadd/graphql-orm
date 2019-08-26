"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Connection_1 = require("../../connection/Connection");
/**
 * Organizes communication with MySQL DBMS.
 */
class AuroraDataApiConnection extends Connection_1.Connection {
    constructor(options, queryRunner) {
        super(options);
        this.queryRunnter = queryRunner;
    }
    createQueryRunner(mode = "master") {
        return this.queryRunnter;
    }
}
exports.AuroraDataApiConnection = AuroraDataApiConnection;
