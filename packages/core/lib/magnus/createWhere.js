"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CreateWhere {
    static appentWhereToQb(qb, where, type = 'default') {
        const { AND, OR, ...options } = where || {};
        if (AND) {
            AND.map(and => this.appentWhereToQb(qb, and, "and"));
        }
        if (OR) {
            OR.map(and => this.appentWhereToQb(qb, and, "or"));
        }
        if (options) {
            const condition = qb.computeWhereParameter(options);
            if (type === "and") {
                if (condition)
                    qb.expressionMap.wheres.push({ type: "and", condition: condition });
            }
            else if (type === "or") {
                if (condition)
                    qb.expressionMap.wheres.push({ type: "or", condition: condition });
            }
            else {
                if (condition)
                    qb.expressionMap.wheres.push({ type: "simple", condition: condition });
            }
        }
    }
    static createWhere(where) {
        return (qb) => {
            this.appentWhereToQb(qb, where);
        };
    }
}
exports.CreateWhere = CreateWhere;
//# sourceMappingURL=createWhere.js.map