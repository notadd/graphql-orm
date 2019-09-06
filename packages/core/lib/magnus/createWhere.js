"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FindOperator_1 = require("../find-options/FindOperator");
class CreateWhere {
    static appentWhereToQb(qb, where, type = 'default') {
        const { AND, OR, ...options } = where;
        if (AND) {
            AND.map(and => this.appentWhereToQb(qb, and, "and"));
        }
        if (OR) {
            OR.map(and => this.appentWhereToQb(qb, and, "or"));
        }
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
    static createWhere(where) {
        return (qb) => {
            this.appentWhereToQb(qb, where);
        };
        if (!where)
            return where;
        if (Array.isArray(where)) {
            return where;
        }
        else if (typeof where === "object") {
            let res = {};
            Object.keys(where).map(key => {
                let item = where[key];
                const keys = key.split("_");
                if (keys.length === 1) {
                    res[keys[0]] = this.createWhere(item);
                }
                else {
                    const [column, action] = keys;
                    let operator = `equal`;
                    const act = action.toLocaleLowerCase();
                    switch (act) {
                        case "not":
                        case "Not":
                            operator = "not";
                            break;
                        case "lt":
                        case "Lt":
                            operator = "lessThan";
                            break;
                        case "lte":
                        case "Lte":
                            operator = "lessThanOrEqual";
                            break;
                        case "gt":
                        case "Gt":
                            operator = "moreThan";
                            break;
                        case "gte":
                        case "Gte":
                            operator = "moreThanOrEqual";
                            break;
                        case "like":
                        case "Like":
                            operator = "like";
                            break;
                        case "between":
                        case "Between":
                            operator = "between";
                            break;
                        case "in":
                        case "In":
                            operator = "in";
                            break;
                        case "any":
                        case "Any":
                            operator = "any";
                            break;
                        case "isNull":
                        case "isnull":
                        case "IsNull":
                            operator = "isNull";
                            break;
                        case "raw":
                        case "Raw":
                            operator = "raw";
                            break;
                        default:
                            operator = "equal";
                            break;
                    }
                    if (Array.isArray(item)) {
                        res[column] = new FindOperator_1.FindOperator(operator, this.createWhere(item), true, true);
                    }
                    else {
                        res[column] = new FindOperator_1.FindOperator(operator, this.createWhere(item), true, false);
                    }
                }
            });
            return res;
        }
        else {
            return new FindOperator_1.FindOperator("equal", where, true, false);
        }
    }
}
exports.CreateWhere = CreateWhere;
//# sourceMappingURL=createWhere.js.map