import { FindOperatorType } from "../find-options/FindOperatorType";
import { FindOperator } from "../find-options/FindOperator";

export class CreateWhere {
    static createWhere(where: any) {
        if (Array.isArray(where)) {
            return where;
        } else if (typeof where === "object") {
            let res = {};
            Object.keys(where).map(key => {
                let item = where[key];
                const keys = key.split("_");
                if (keys.length === 1) {
                    res[keys[0]] = this.createWhere(item);
                } else {
                    const [column, action] = keys;
                    let operator: FindOperatorType = `equal`;
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
                        res[column] = new FindOperator(
                            operator,
                            this.createWhere(item),
                            true,
                            true
                        );
                    } else {
                        res[column] = new FindOperator(
                            operator,
                            this.createWhere(item),
                            true,
                            false
                        );
                    }
                }
            });
            return res;
        } else {
            return new FindOperator("equal", where, true, false);
        }
    }
}