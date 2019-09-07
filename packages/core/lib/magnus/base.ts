import { BaseEntity } from "../repository/BaseEntity";
import { SelectionSet } from "./selectionSet";
interface Type<T> extends Function {
    new(...args: any[]): T;
}
export class MagnusBase extends BaseEntity {
    createWhere({ where, relations, select }) {
        const _where: any = {};
        if (where) {
            _where.where = SelectionSet.createWhere(where)
        }
        if (relations) {
            _where.relations = relations;
        }
        if (select) {
            _where.select = select;
        }
        return _where;
    }
}
