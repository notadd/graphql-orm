import { SelectionSet } from "./selectionSet";

export const Selection: any = () => () => (
    variable: any,
    that: SelectionSet
) => {
    if (that) {
        return that.selections
    }
}

export const Relation: any = () => () => (
    variable: any,
    that: SelectionSet
) => {
    if (that) {
        return that.relations
    }
}

export const GetSelectionSet: any = () => () => (
    variable: any,
    that: SelectionSet
) => {
    if (that) {
        return that
    }
}
