"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const selectionSet_1 = require("./selectionSet");
function createWhere({ where, relations, select }) {
    const _where = {};
    if (where) {
        _where.where = selectionSet_1.SelectionSet.createWhere(where);
    }
    if (relations) {
        _where.relations = relations;
    }
    if (select) {
        _where.select = select;
    }
    return _where;
}
exports.createWhere = createWhere;
//# sourceMappingURL=base.js.map