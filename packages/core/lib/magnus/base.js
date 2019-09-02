"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseEntity_1 = require("../repository/BaseEntity");
const selectionSet_1 = require("./selectionSet");
class MagnusBase extends BaseEntity_1.BaseEntity {
    static createWhere(where) {
        return selectionSet_1.SelectionSet.createWhere(where);
    }
    callgraphql() {
        Object.keys(this).map(key => {
            let item = this[key];
            if (typeof item === 'function') {
                this[key] = (variables, context, info) => {
                    console.log({
                        variables,
                        context,
                        info
                    });
                };
            }
        });
    }
    call(name, args) { }
}
exports.MagnusBase = MagnusBase;
//# sourceMappingURL=base.js.map