"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Thrown when user tries to execute operation that requires connection to be established.
 */
class ConnectionIsNotSetError extends Error {
    constructor(dbType) {
        super();
        this.name = "ConnectionIsNotSetError";
        Object.setPrototypeOf(this, ConnectionIsNotSetError.prototype);
        this.message = `Connection with ${dbType} database is not established. Check connection configuration.`;
    }
}
exports.ConnectionIsNotSetError = ConnectionIsNotSetError;
