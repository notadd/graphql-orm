"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Selection = () => () => (variable, that) => {
    if (that) {
        return that.getSelections();
    }
};
exports.Relation = () => () => (variable, that) => {
    if (that) {
        return that.getRelations();
    }
};
exports.Action = () => () => (variable, that) => {
    if (that) {
        return that.getActions();
    }
};
exports.Typeorm = () => () => (variable, that) => {
    if (that) {
        return that.typeorm;
    }
};
exports.GetSelectionSet = () => () => (variable, that) => {
    if (that) {
        return that;
    }
};
//# sourceMappingURL=decorator.js.map