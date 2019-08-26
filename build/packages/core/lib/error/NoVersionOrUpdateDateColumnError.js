"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Thrown when an entity does not have no version and no update date column.
 */
class NoVersionOrUpdateDateColumnError extends Error {
    constructor(entity) {
        super();
        this.name = "NoVersionOrUpdateDateColumnError";
        Object.setPrototypeOf(this, NoVersionOrUpdateDateColumnError.prototype);
        this.message = `Entity ${entity} does not have version or update date columns.`;
    }
}
exports.NoVersionOrUpdateDateColumnError = NoVersionOrUpdateDateColumnError;
