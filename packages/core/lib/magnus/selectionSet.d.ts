import { SelectionNode, GraphQLResolveInfo, ListValueNode, EnumValueNode, NullValueNode, BooleanValueNode, StringValueNode, FloatValueNode, IntValueNode, ValueNode, VariableNode, OperationDefinitionNode, FieldNode, FragmentSpreadNode, InlineFragmentNode } from 'graphql';
export declare function isFieldNode(obj: SelectionNode): obj is FieldNode;
export declare function isFragmentSpreadNode(obj: SelectionNode): obj is FragmentSpreadNode;
export declare function isInlineFragmentNode(obj: SelectionNode): obj is InlineFragmentNode;
export declare function isVariableNode(obj: ValueNode): obj is VariableNode;
export declare function isIntValueNode(obj: ValueNode): obj is IntValueNode;
export declare function isFloatValueNode(obj: ValueNode): obj is FloatValueNode;
export declare function isStringValueNode(obj: ValueNode): obj is StringValueNode;
export declare function isBooleanValueNode(obj: ValueNode): obj is BooleanValueNode;
export declare function isNullValueNode(obj: ValueNode): obj is NullValueNode;
export declare function isEnumValueNode(obj: ValueNode): obj is EnumValueNode;
export declare function isListValueNode(obj: ValueNode): obj is ListValueNode;
export declare function isObjectValueNode(obj: ValueNode): obj is ListValueNode;
import { Metadatas, HandlerDefMap } from './types';
export declare class SelectionSet {
    parent: SelectionSet;
    children: SelectionSet[];
    name: string;
    alias: string;
    level: number;
    variables: any;
    enums: any;
    arguments: any;
    selections: string[];
    relations: string[];
    actions: {
        name: string;
        args: any;
    }[];
    constructor(info: FieldNode, variables: any, enums: any, level?: number, parent?: SelectionSet);
    createValue(val: ValueNode): any;
    getTop(): SelectionSet;
    addSelect(name: string): void;
    addRelation(name: string): void;
    addAction(name: string): void;
    hasChildren(): boolean;
    getPath(): any[];
    toRelation(): void;
    toRelations(): void;
    create(field: any, variables: any, enums?: any): void;
    toTypeorm(): {
        alias: string;
        name: string;
        select: string[];
        relations: string[];
        actions: {
            name: string;
            args: any;
        }[];
    };
    static fromOperationDefinitionNode(operation: OperationDefinitionNode, variables: any, enums?: any): {
        alias: string;
        name: string;
        select: string[];
        relations: string[];
        actions: {
            name: string;
            args: any;
        }[];
    }[];
    static fromJson(field: FieldNode, variables: any, enums: any): SelectionSet;
    static fromGraphql(info: GraphQLResolveInfo, enums: any, entities: Metadatas, handlers: HandlerDefMap): SelectionSet[];
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
    static createWhere(where: any): {};
}
