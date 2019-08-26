"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Thrown when user tries to insert using QueryBuilder but do not specify what to insert.
 */
class InsertValuesMissingError extends Error {
    constructor() {
        super();
        this.name = "InsertValuesMissingError";
        Object.setPrototypeOf(this, InsertValuesMissingError.prototype);
        this.message = `Cannot perform insert query because values are not defined. Call "qb.values(...)" method to specify inserted values.`;
    }
}
exports.InsertValuesMissingError = InsertValuesMissingError;
