"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../../");
/**
 * Special decorator used to extract relation id into separate entity property.
 *
 * @experimental
 */
function RelationId(relation, alias, queryBuilderFactory) {
    return function (object, propertyName) {
        __1.getMetadataArgsStorage().relationIds.push({
            target: object.constructor,
            propertyName: propertyName,
            relation: relation,
            alias: alias,
            queryBuilderFactory: queryBuilderFactory
        });
    };
}
exports.RelationId = RelationId;
