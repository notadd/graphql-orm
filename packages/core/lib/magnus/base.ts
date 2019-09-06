import { BaseEntity } from "../repository/BaseEntity";
import { SelectionSet } from "./selectionSet";
import { getRepository } from "..";

export class MagnusBase extends BaseEntity {
  static createWhere(where: any) {
    const qb = this.createQueryBuilder();
    qb.expressionMap.wheres;
    getRepository("").find();
    return SelectionSet.createWhere(where);
  }
}
