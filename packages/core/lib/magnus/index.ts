import { SelectionNode, GraphQLResolveInfo, StringValueNode, FloatValueNode, IntValueNode, SelectionSetNode, ValueNode, ArgumentNode, VariableNode, OperationDefinitionNode, FieldNode, FragmentSpreadNode, InlineFragmentNode } from 'graphql';
export function isFieldNode(obj: SelectionNode): obj is FieldNode {
    return obj.kind === 'Field'
}
export function isFragmentSpreadNode(obj: SelectionNode): obj is FragmentSpreadNode {
    return obj.kind === 'FragmentSpread'
}
export function isInlineFragmentNode(obj: SelectionNode): obj is InlineFragmentNode {
    return obj.kind === 'InlineFragment'
}
export function isVariableNode(obj: ValueNode): obj is VariableNode {
    return obj.kind === 'Variable'
}
export function isIntValueNode(obj: ValueNode): obj is IntValueNode {
    return obj.kind === 'IntValue'
}
export function isFloatValueNode(obj: ValueNode): obj is FloatValueNode {
    return obj.kind === 'FloatValue'
}
export function isStringValueNode(obj: ValueNode): obj is StringValueNode {
    return obj.kind === 'StringValue'
}
export class SelectionSet {
    parent: SelectionSet;
    children: SelectionSet[] = [];
    name: string;
    alias: string;
    level: number = 0;

    arguments: any = {};
    selections: string[] = [];
    relations: string[] = [];
    actions: string[] = [];

    constructor(name: string, alias: string, obj: SelectionSetNode, args: ReadonlyArray<ArgumentNode>, variables: any = {}, level: number = 0, parent?: SelectionSet) {
        this.name = name;
        this.parent = parent;
        this.level = level;
        this.alias = alias;
        if (args) {
            args.map(arg => {
                const name = arg.name.value;
                if (isVariableNode(arg.value)) {
                    this.arguments[name] = variables[arg.value.name.value];
                } else if (isIntValueNode(arg.value)) {
                    this.arguments[name] = arg.value.value;
                } else if (isFloatValueNode(arg.value)) {
                    this.arguments[name] = arg.value.value;
                } else if (isStringValueNode(arg.value)) {
                    this.arguments[name] = arg.value.value;
                }
            })
        }
        if (obj) {
            obj.selections && obj.selections.map(selection => {
                if (isFieldNode(selection)) {
                    const name = selection.name.value;
                    const alias = selection.alias ? selection.alias.value : undefined;
                    this.create(name, alias, selection.selectionSet, selection.arguments, variables[name])
                } else if (isFragmentSpreadNode(selection)) { }
                else { }
            })
        }
    }

    getTop(): SelectionSet {
        if (this.parent) return this.parent.getTop();
        return this;
    }

    addSelect(name: string): void {
        const top = this.getTop();
        const item = top.selections.find(re => re === name)
        if (!item) {
            top.selections.push(name)
        }
    }

    addRelation(name: string): void {
        const top = this.getTop();
        const item = top.relations.find(re => re === name)
        if (!item) {
            top.relations.push(name)
        }
    }

    hasChildren(): boolean {
        return this.children.length > 0;
    }

    toRelation(): { name: string, alias: string }[] {
        let relation: { name: string, alias: string }[] = [];
        if (this.level !== 0) {
            if (this.parent) {
                relation.push(...this.parent.toRelation())
            }
            relation.push({
                name: this.name,
                alias: this.alias
            })
        }
        if (this.hasChildren() && this.arguments.length === 0) {
            if (relation.length > 0) {
                const name = relation.map(it => it.name).join('.');
                this.addRelation(name)
            }
        } else {
            if (relation.length === 1 && this.arguments.length === 0) {
                this.addSelect(this.name)
            }
        }
        return relation;
    }

    toRelations() {
        if (this.level === 0) {
            this.children.map(child => child.toRelations())
        } else {
            this.toRelation();
            this.children.map(child => child.toRelations());
        }
    }

    create(name: string, alias: string, obj: SelectionSetNode, args: ReadonlyArray<ArgumentNode>, variables: any) {
        this.children.push(new SelectionSet(name, alias, obj, args, variables, this.level + 1, this));
    }

    toTypeorm() {
        return {
            alias: this.alias,
            name: this.name,
            select: this.selections,
            relations: this.relations
        }
    }

    static fromOperationDefinitionNode(operation: OperationDefinitionNode, variables: any) {
        return operation.selectionSet.selections.map(selection => {
            if (isFieldNode(selection)) {
                const name = selection.name.value;
                const alias = selection.alias ? selection.alias.value : undefined;
                return SelectionSet.fromJson(name, alias, selection.selectionSet, selection.arguments!, variables).toTypeorm();
            } else if (isFragmentSpreadNode(selection)) {
            } else { }
        }).filter(res => !!res)
    }

    static fromJson(name: string, alias: string, obj: SelectionSetNode, args: ReadonlyArray<ArgumentNode>, variables: any) {
        const set = new SelectionSet(name, alias, obj, args, variables)
        set.toRelations();
        return set;
    }

    static fromGraphql(
        variables: any,
        info: GraphQLResolveInfo
    ) {
        return info.fieldNodes.map(it => {
            const name = it.name.value;
            const alias = it.alias ? it.alias.value : undefined;
            const set = new SelectionSet(name, alias, it.selectionSet, it.arguments, variables)
            set.toRelations();
            return set;
        })
    }
}