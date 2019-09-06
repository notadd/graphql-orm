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
export declare class CreateWhere {
    static appentWhereToQb(qb: SelectQueryBuilder<any>, where: MagnusWhere, type: "and" | "or"): void;
    static createWhere(where: any): any;
}
export {};
