"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseEntity_1 = require("../repository/BaseEntity");
const selectionSet_1 = require("./selectionSet");
class MagnusBase extends BaseEntity_1.BaseEntity {
    createWhere({ where, relations, select }) {
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
}
exports.MagnusBase = MagnusBase;
//# sourceMappingURL=base.js.map