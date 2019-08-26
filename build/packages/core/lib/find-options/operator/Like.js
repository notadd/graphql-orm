"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FindOperator_1 = require("../FindOperator");
/**
 * Find Options Operator.
 * Example: { someField: Like("%some sting%") }
 */
function Like(value) {
    return new FindOperator_1.FindOperator("like", value);
}
exports.Like = Like;
