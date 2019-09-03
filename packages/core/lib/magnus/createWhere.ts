import { FindOperatorType } from "../find-options/FindOperatorType";
import { FindOperator } from "../find-options/FindOperator";
import { Brackets } from "../query-builder/Brackets";
import { WhereExpression } from "../query-builder/WhereExpression";

function createWhere(where: any): Brackets {
    const whereFactory = (qb: WhereExpression) => {
        if (typeof where === 'object') {
            Object.keys(where).map(key => {
                const value = where[key];
                const keys = key.split("_");
                const [column, action] = keys;
                if (!action) {
                    qb.where({
                        [`${column}`]: value
                    })
                } else {
                    const act = action.toLocaleLowerCase();
                    switch (act) {
                        case "not":
                        case "Not":
                            qb.where(`${column} != :${key}`, { [`${key}`]: value })
                            break;
                        case "lt":
                        case "Lt":
                            qb.where(`${column} < :${key}`, { [`${key}`]: value })
                            break;
                        case "lte":
                        case "Lte":
                            qb.where(`${column} <= :${key}`, { [`${key}`]: value })
                            break;
                        case "gt":
                        case "Gt":
                            qb.where(`${column} > :${key}`, { [`${key}`]: value })
                            break;
                        case "gte":
                        case "Gte":
                            qb.where(`${column} >= :${key}`, { [`${key}`]: value })
                            break;
                        case "like":
                        case "Like":
                            qb.where(`${column} like :${key}`, { [`${key}`]: value })
                            break;
                        case "between":
                        case "Between":
                            // operator = "between";
                            let [start, end] = value;
                            qb.where(`${column} >= :${column}_start`, { [`${column}_start`]: start })
                            qb.where(`${column} <= :${column}_end`, { [`${column}_end`]: end })
                        case "in":
                        case "In":
                            qb.where(`${column} in :${key}`, { [`${key}`]: value })
                            break;
                        default:
                            qb.where(`${column} = :${key}`, { [`${key}`]: value })
                            break;
                    }
                }
            })
        }
    }
    return new Brackets(whereFactory)
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
