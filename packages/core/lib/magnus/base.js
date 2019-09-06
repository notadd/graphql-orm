"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseEntity_1 = require("../repository/BaseEntity");
const selectionSet_1 = require("./selectionSet");
const __1 = require("..");
class MagnusBase extends BaseEntity_1.BaseEntity {
    static createWhere(where) {
        const qb = this.createQueryBuilder();
        qb.expressionMap.wheres;
        __1.getRepository("").find();
        return selectionSet_1.SelectionSet.createWhere(where);
    }
}
exports.MagnusBase = MagnusBase;
//# sourceMappingURL=base.js.map