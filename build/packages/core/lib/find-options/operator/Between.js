"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FindOperator_1 = require("../FindOperator");
/**
 * Find Options Operator.
 * Example: { someField: Between(x, y) }
 */
function Between(from, to) {
    return new FindOperator_1.FindOperator("between", [from, to], true, true);
}
exports.Between = Between;
