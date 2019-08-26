"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 */
class MissingPrimaryColumnError extends Error {
    constructor(entityMetadata) {
        super();
        this.name = "MissingPrimaryColumnError";
        Object.setPrototypeOf(this, MissingPrimaryColumnError.prototype);
        this.message = `Entity "${entityMetadata.name}" does not have a primary column. Primary column is required to ` +
            `have in all your entities. Use @PrimaryColumn decorator to add a primary column to your entity.`;
    }
}
exports.MissingPrimaryColumnError = MissingPrimaryColumnError;
