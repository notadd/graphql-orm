"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseEntity_1 = require("../repository/BaseEntity");
const selectionSet_1 = require("./selectionSet");
class MagnusBaseEntity extends BaseEntity_1.BaseEntity {
    fromGraphql(info) {
        const sets = selectionSet_1.SelectionSet.fromGraphql(info);
        return sets.map(set => set.toTypeorm());
    }
}
exports.MagnusBaseEntity = MagnusBaseEntity;
//# sourceMappingURL=base.js.map