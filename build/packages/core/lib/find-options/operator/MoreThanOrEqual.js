"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FindOperator_1 = require("../FindOperator");
/**
 * Find Options Operator.
 * Example: { someField: MoreThanOrEqual(10) }
 */
function MoreThanOrEqual(value) {
    return new FindOperator_1.FindOperator("moreThanOrEqual", value);
}
exports.MoreThanOrEqual = MoreThanOrEqual;
