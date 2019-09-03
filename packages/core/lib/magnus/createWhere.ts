import { FindOperatorType } from "../find-options/FindOperatorType";
import { FindOperator } from "../find-options/FindOperator";

function createWhere(where: any) {
    const cache: Map<string, Set<any>> = new Map();
    if (typeof where === 'object') {
        Object.keys(where).map(key => {
            const value = where[key];
            const keys = key.split("_");
            const [column, action] = keys;
            let items = cache.get(column);
            if (!items) {
                items = new Set();
            }
            if (!action) {
                items!.add(
                    new FindOperator('equal', value)
                )
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
                        let [start, end] = value;
                        return items!.add(new FindOperator('between', [start, end], false, true));
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
                if (Array.isArray(value)) {
                    items!.add(
                        new FindOperator(operator, value, true, true)
                    )
                } else {
                    items!.add(
                        new FindOperator(operator, value, true, false)
                    )
                }
            }
            cache.set(column, items!)
        })
    }
    const result: any = [];
    cache.forEach((ca, key) => {
        ca.forEach(it => {
            result.push({
                [`${key}`]: it
            })
        })
    })
    return result;
}
export class CreateWhere {
    static createWhere(where: any) {
        if (Array.isArray(where)) {
            return where.map(w => createWhere(w));
        } else {
            return createWhere(where)
        }
    }
}
