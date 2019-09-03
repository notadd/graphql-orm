import { FindOperatorType } from "../find-options/FindOperatorType";
import { FindOperator } from "../find-options/FindOperator";

export class CreateWhere {
    static createWhere(where: any) {
        if (!where) return where;
        if (Array.isArray(where)) {
            return where;
        } else if (typeof where === "object") {
            let res = {};
            Object.keys(where).map(key => {
                let item = where[key];
                const keys = key.split("_");
                const [column, action] = keys;
                if (keys.length === 1) {
                    res[column] = this.createWhere(item);
                } else {
                    let operator: FindOperatorType;
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
                            // operator = "between";
                            let [start, end] = item;
                            if (typeof start === 'string') {
                                start = new Date(start);
                                end = new Date(end)
                            }
                            res[column] = new FindOperator('between', [start, end], true, true)
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
                    if (operator)
                        res[column] = new FindOperator(
                            operator,
                            this.createWhere(item),
                            true,
                            true
                        );
                }
            });
            return res;
        } else {
            return new FindOperator("equal", where, true, false);
        }
    }
}
