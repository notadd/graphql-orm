"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Syntax sugar.
 * Allows to use brackets in WHERE expressions for better syntax.
 */
class Brackets {
    /**
     * Given WHERE query builder that will build a WHERE expression that will be taken into brackets.
     */
    constructor(whereFactory) {
        this.whereFactory = whereFactory;
    }
}
exports.Brackets = Brackets;
//# sourceMappingURL=Brackets.js.map