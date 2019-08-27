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
exports.GetSelectionSet = () => () => (variable, that) => {
    if (that) {
        return that;
    }
};
//# sourceMappingURL=decorator.js.map