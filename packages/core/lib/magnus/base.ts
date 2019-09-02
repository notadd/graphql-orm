import { BaseEntity } from "../repository/BaseEntity";
import { SelectionSet } from "./selectionSet";

export class MagnusBase extends BaseEntity {
    static createWhere(where: any) {
        return SelectionSet.createWhere(where)
    }

    callgraphql() {
        Object.keys(this).map(key => {
            let item = this[key]
            if (typeof item === 'function') {
                this[key] = (variables, context, info) => {
                    console.log({
                        variables,
                        context,
                        info
                    })
                }
            }
        })
    }

    call(name: string, args: any[]) { }
}