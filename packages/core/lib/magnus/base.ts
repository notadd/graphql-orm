import { BaseEntity } from "../repository/BaseEntity";
import { SelectionSet } from "./selectionSet";

export class MagnusBase extends BaseEntity {
    static createWhere(where: any) {
        return SelectionSet.createWhere(where)
    }
}