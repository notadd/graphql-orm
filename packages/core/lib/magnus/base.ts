import { SelectionSet } from "./selectionSet";

export function createWhere({ where, relations, select }) {
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
