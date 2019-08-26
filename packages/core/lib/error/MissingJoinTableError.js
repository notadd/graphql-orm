"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 */
class MissingJoinTableError extends Error {
    constructor(entityMetadata, relation) {
        super();
        this.name = "MissingJoinTableError";
        Object.setPrototypeOf(this, MissingJoinTableError.prototype);
        if (relation.inverseRelation) {
            this.message = `JoinTable is missing on both sides of ${entityMetadata.name}#${relation.propertyName} and ` +
                `${relation.inverseEntityMetadata.name}#${relation.inverseRelation.propertyName} many-to-many relationship. ` +
                `You need to put decorator decorator on one of the sides.`;
        }
        else {
            this.message = `JoinTable is missing on ${entityMetadata.name}#${relation.propertyName} many-to-many relationship. ` +
                `You need to put JoinTable decorator on it.`;
        }
    }
}
exports.MissingJoinTableError = MissingJoinTableError;
//# sourceMappingURL=MissingJoinTableError.js.map