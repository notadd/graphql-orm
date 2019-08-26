"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
/**
 * Thrown when repository for the given class is not found.
 */
class RepositoryNotTreeError extends Error {
    constructor(target) {
        super();
        this.name = "RepositoryNotTreeError";
        Object.setPrototypeOf(this, RepositoryNotTreeError.prototype);
        let targetName;
        if (target instanceof index_1.EntitySchema) {
            targetName = target.options.name;
        }
        else if (typeof target === "function") {
            targetName = target.name;
        }
        else {
            targetName = target;
        }
        this.message = `Repository of the "${targetName}" class is not a TreeRepository. Try to apply @Tree decorator on your entity.`;
    }
}
exports.RepositoryNotTreeError = RepositoryNotTreeError;
