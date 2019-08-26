"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Thrown when ORM cannot get column's type automatically.
 * Basically, when reflect-metadata is not available or tsconfig is not properly setup.
 */
class ColumnTypeUndefinedError extends Error {
    constructor(object, propertyName) {
        super();
        this.name = "ColumnTypeUndefinedError";
        Object.setPrototypeOf(this, ColumnTypeUndefinedError.prototype);
        this.message = `Column type for ${object.constructor.name}#${propertyName} is not defined and cannot be guessed. ` +
            `Make sure you have turned on an "emitDecoratorMetadata": true option in tsconfig.json. ` +
            `Also make sure you have imported "reflect-metadata" on top of the main entry file in your application (before any entity imported).` +
            `If you are using JavaScript instead of TypeScript you must explicitly provide a column type.`;
    }
}
exports.ColumnTypeUndefinedError = ColumnTypeUndefinedError;
