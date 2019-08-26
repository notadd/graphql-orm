"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 */
class UsingJoinTableIsNotAllowedError extends Error {
    constructor(entityMetadata, relation) {
        super();
        this.name = "UsingJoinTableIsNotAllowedError";
        Object.setPrototypeOf(this, UsingJoinTableIsNotAllowedError.prototype);
        this.message = `Using JoinTable on ${entityMetadata.name}#${relation.propertyName} is wrong. ` +
            `${entityMetadata.name}#${relation.propertyName} has ${relation.relationType} relation, ` +
            `however you can use JoinTable only on many-to-many relations.`;
    }
}
exports.UsingJoinTableIsNotAllowedError = UsingJoinTableIsNotAllowedError;
//# sourceMappingURL=UsingJoinTableIsNotAllowedError.js.map