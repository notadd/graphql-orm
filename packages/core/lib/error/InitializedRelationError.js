"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Thrown when relation has array initialized which is forbidden my ORM.
 *
 * @see https://github.com/typeorm/typeorm/issues/1319
 * @see http://typeorm.io/#/relations-faq/avoid-relation-property-initializers
 */
class InitializedRelationError extends Error {
    constructor(relation) {
        super();
        Object.setPrototypeOf(this, InitializedRelationError.prototype);
        this.message = `Array initializations are not allowed in entity relations. ` +
            `Please remove array initialization (= []) from "${relation.entityMetadata.targetName}#${relation.propertyPath}". ` +
            `This is ORM requirement to make relations to work properly. Refer docs for more information.`;
    }
}
exports.InitializedRelationError = InitializedRelationError;
//# sourceMappingURL=InitializedRelationError.js.map