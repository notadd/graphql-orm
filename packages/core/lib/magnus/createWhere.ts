import { FindOperatorType } from "../find-options/FindOperatorType";
import { FindOperator } from "../find-options/FindOperator";
import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
import { FindManyOptions } from "../find-options/FindManyOptions";
/**
 * {
 *  id: 1,
 *  AND: [{
 *      "id_IN": [1]
 *  },{
 *      "id_IN": [2]
 *  }],
 *  OR: [{
 *      "id_IN": [3],
 * }]
 * }
 * where id === 1 AND (id in [1] and id in[2]) OR (id in [3])
 */
interface MagnusWhere {
  options: FindManyOptions<any> | Partial<any>;
  AND?: MagnusWhere[];
  OR?: MagnusWhere[];
}
export class CreateWhere {
  static appentWhereToQb(
    qb: SelectQueryBuilder<any>,
    where: MagnusWhere,
    type: "and" | "or"
  ) {
    const { AND, OR, options } = where;
    const condition = qb.computeWhereParameter(options);
    if (AND) {
      AND.map(and => this.appentWhereToQb(qb, and, "and"));
    }
    if (OR) {
      OR.map(and => this.appentWhereToQb(qb, and, "or"));
    }
    if (type === "and") {
      if (condition)
        qb.expressionMap.wheres.push({ type: "and", condition: condition });
    }
    if (type === "or") {
      qb.expressionMap.wheres.push({ type: "or", condition: condition });
    }
  }

  static createWhere(where: any): any {
    return (qb: SelectQueryBuilder<any>) => {};
    if (!where) return where;
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
