"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Thrown when circular relations detected with nullable set to false.
 */
class CircularRelationsError extends Error {
    constructor(path) {
        super();
        this.name = "CircularRelationsError";
        Object.setPrototypeOf(this, CircularRelationsError.prototype);
        this.message = `Circular relations detected: ${path}. To resolve this issue you need to set nullable: false somewhere in this dependency structure.`;
    }
}
exports.CircularRelationsError = CircularRelationsError;
