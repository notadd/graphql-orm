"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Selection = () => () => (variable, that) => {
    if (that) {
        return that.selections;
    }
};
exports.Relation = () => () => (variable, that) => {
    if (that) {
        return that.relations;
    }
};
//# sourceMappingURL=decorator.js.map