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
    [key: string]: FindManyOptions<any> | Partial<any> | any;
    AND?: MagnusWhere[];
    OR?: MagnusWhere[];
}
export class CreateWhere {
    static appentWhereToQb(
        qb: SelectQueryBuilder<any>,
        where: MagnusWhere,
        type: "and" | "or" | 'default' = 'default'
    ) {
        const { AND, OR, ...options } = where || {} as any;
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
                    qb.andWhere(condition)
                // qb.expressionMap.wheres.push({ type: "and", condition: condition });
            }
            else if (type === "or") {
                if (condition)
                    qb.orWhere(condition)
                // qb.expressionMap.wheres.push({ type: "or", condition: condition });
            } else {
                if (condition)
                    qb.expressionMap.wheres.push({ type: "simple", condition: condition });
            }
        }
    }

    static createWhere(where: any): any {
        return (qb: any) => {
            if (where)
                this.appentWhereToQb(qb, where)
        }
    }
}
