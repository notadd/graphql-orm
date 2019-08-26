import { SelectionNode, GraphQLResolveInfo, ListValueNode, EnumValueNode, NullValueNode, BooleanValueNode, StringValueNode, FloatValueNode, IntValueNode, SelectionSetNode, ValueNode, ArgumentNode, VariableNode, OperationDefinitionNode, FieldNode, FragmentSpreadNode, InlineFragmentNode } from 'graphql';
import { FindOperator } from '../find-options/FindOperator';
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
export function isBooleanValueNode(obj: ValueNode): obj is BooleanValueNode {
    return obj.kind === 'BooleanValue'
}
export function isNullValueNode(obj: ValueNode): obj is NullValueNode {
    return obj.kind === 'NullValue'
}
export function isEnumValueNode(obj: ValueNode): obj is EnumValueNode {
    return obj.kind === 'EnumValue'
}
export function isListValueNode(obj: ValueNode): obj is ListValueNode {
    return obj.kind === 'ListValue'
}
export function isObjectValueNode(obj: ValueNode): obj is ListValueNode {
    return obj.kind === 'ObjectValue'
}
import { Metadatas, Metadata, HandlerDefMap } from './types';

export class SelectionSet {
    parent: SelectionSet;
    children: SelectionSet[] = [];
    name: string;
    alias: string;
    level: number = 0;
    variables: any;
    enums: any;

    arguments: any = {};
    selections: string[] = [];
    relations: string[] = [];
    actions: { name: string, args: any }[] = [];
    operation: string;
    types: Metadata[];

    constructor(info: FieldNode, variables: any, enums: any, level: number = 0, parent?: SelectionSet) {
        const name = info.name.value;
        const alias = info.alias ? info.alias.value : undefined;
        const args = info.arguments;
        this.name = name;
        this.parent = parent;
        this.level = level;
        this.alias = alias;
        this.variables = variables;
        this.enums = enums;
        const type = this.handlers[this.operation][name][5];
        this.types = this.entities[type];
        console.log({ types: this.types })

        if (args && args.length > 0) {
            if (this.types) {
                this.types.find(type => type.name === this.name)
            }
            args.map((arg, index) => {
                const name = arg.name.value;
                if (isVariableNode(arg.value)) {
                    this.arguments[name] = variables[arg.value.name.value];
                } else if (isIntValueNode(arg.value)) {
                    this.arguments[name] = arg.value.value;
                } else if (isFloatValueNode(arg.value)) {
                    this.arguments[name] = arg.value.value;
                } else if (isStringValueNode(arg.value)) {
                    this.arguments[name] = arg.value.value;
                } else if (isBooleanValueNode(arg.value)) {
                    this.arguments[name] = arg.value.value;
                } else if (isNullValueNode(arg.value)) {
                    this.arguments[name] = null;
                } else if (isEnumValueNode(arg.value)) {
                    this.arguments[name] = undefined;
                } else if (isListValueNode(arg.value)) {
                    this.arguments[name] = arg.value.values.map(value => this.createValue(value))
                } else {
                    let res = {};
                    arg.value.fields.map(field => {
                        res[field.name.value] = this.createValue(field.value)
                    });
                    this.arguments[name] = res;
                }
            })
        }
        if (info && info.selectionSet) {
            info.selectionSet.selections && info.selectionSet.selections.map(selection => {
                if (isFieldNode(selection)) {
                    this.create(selection, variables, enums)
                } else if (isFragmentSpreadNode(selection)) { }
                else { }
            })
        }
    }

    createValue(val: ValueNode) {
        if (isVariableNode(val)) {
            return this.variables[val.name.value];
        } else if (isIntValueNode(val)) {
            return val.value;
        } else if (isFloatValueNode(val)) {
            return val.value;
        } else if (isStringValueNode(val)) {
            return val.value;
        } else if (isBooleanValueNode(val)) {
            return val.value;
        } else if (isNullValueNode(val)) {
            return null;
        } else if (isEnumValueNode(val)) {
            return undefined;
        } else if (isListValueNode(val)) {
            return val.values.map(value => this.createValue(value))
        } else {
            let res = {};
            val.fields.map(field => {
                res[field.name.value] = this.createValue(field.value)
            });
            return res;
        }
    }

    getTop(): SelectionSet {
        if (this.parent) return this.parent.getTop();
        return this;
    }

    addSelect(name: string): void {
        if (this.parent) {
            this.parent.addSelect(name)
            const item = this.parent.selections.find(re => re === name)
            if (!item) {
                this.parent.selections.push(name)
            }
        }
    }

    addRelation(name: string): void {
        if (this.parent) {
            this.parent.addRelation(`${this.parent.name}.${name}`)
            const item = this.parent.relations.find(re => re === name)
            if (!item) {
                this.parent.relations.push(name)
            }
        }
    }

    addAction(name: string) {
        if (this.parent) {
            this.parent.addAction(`${this.parent.name}.${name}`)
            const item = this.parent.actions.find(re => re.name === name)
            if (!item) {
                this.parent.actions.push({ name, args: this.arguments })
            }
        }
    }

    hasChildren(): boolean {
        return this.children.length > 0;
    }

    getPath() {
        let paths = [];
        if (this.parent) {
            paths.push(...this.parent.getPath())
        }
        paths.push(this.name);
        return paths;
    }

    toRelation() {
        if (this.hasChildren()) {
            if (Object.keys(this.arguments).length === 0) {
                this.addRelation(this.name)
            } else {
                this.addAction(this.name)
            }
        } else {
            if (Object.keys(this.arguments).length === 0) {
                this.addSelect(this.name)
            } else {
                this.addAction(this.name)
            }
        }
    }

    toRelations() {
        this.toRelation();
        this.children.map(child => child.toRelations());
    }

    create(field: any, variables: any, enums: any = {}) {
        this.children.push(new SelectionSet(field, variables, enums, this.level + 1, this));
    }

    toTypeorm() {
        return {
            alias: this.alias,
            name: this.name,
            select: this.selections,
            relations: this.relations,
            actions: this.actions
        }
    }

    static fromOperationDefinitionNode(operation: OperationDefinitionNode, variables: any, enums: any = {}) {
        return operation.selectionSet.selections.map(selection => {
            if (isFieldNode(selection)) {
                return SelectionSet.fromJson(selection, variables, enums).toTypeorm();
            } else if (isFragmentSpreadNode(selection)) {
            } else { }
        }).filter(res => !!res)
    }

    static fromJson(field: FieldNode, variables: any, enums: any) {
        const set = new SelectionSet(field, variables, enums)
        set.toRelations();
        return set;
    }
    entities: Metadatas;
    handlers: HandlerDefMap;
    static fromGraphql(
        info: GraphQLResolveInfo,
        enums: any = {},
        entities: Metadatas,
        handlers: HandlerDefMap
    ) {
        return info.fieldNodes.map(it => {
            const set = new SelectionSet(it, info.variableValues, enums);
            set.entities = entities;
            set.handlers = handlers;
            set.operation = info.operation.name.value;
            set.toRelations();
            return set;
        })
    }
    /**
     * 创建where
     * "lessThan"
    | "lessThanOrEqual"
    | "moreThan"
    | "moreThanOrEqual"
    | "equal"
    | "between"
    | "in"
    | "any"
    | "isNull"
    | "like"
    | "raw";
     */
    static createWhere(where: any) {
        if (Array.isArray(where)) {
            return where;
        }
        else if (typeof where === 'object') {
            let res = {};
            Object.keys(where).map(key => {
                let item = where[key];
                const keys = key.split('_');
                if (keys.length === 1) {
                    res[keys[0]] = this.createWhere(item)
                } else {
                    const [column, action] = keys;
                    if (Array.isArray(item)) {
                        res[column] = new FindOperator(action as any, this.createWhere(item), true, true)
                    }
                }
            });
            return res;
        } else {
            return new FindOperator('equal', where, true, true)
        }
    }
}