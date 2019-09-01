import { SelectionSet } from "./selectionSet";

export const Selection: any = () => () => (
    variable: any,
    that: SelectionSet
) => {
    if (that) {
        return that.getSelections()
    }
}

export const Relation: any = () => () => (
    variable: any,
    that: SelectionSet
) => {
    if (that) {
        return that.getRelations()
    }
}

export const Action: any = () => () => (
    variable: any,
    that: SelectionSet
) => {
    if (that) {
        return that.getActions()
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
