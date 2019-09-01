import { GraphQLResolveInfo, FieldNode, ValueNode } from "graphql";
import { CreateWhere } from './createWhere';
export declare class SelectionSet extends CreateWhere {
    /**
     * 全局参数
     */
    private enums;
    private entities;
    private handlers;
    private decorators;
    private operation;
    context: any;
    source: any;
    private variables;
    name: string;
    private parent;
    private children;
    info: FieldNode;
    private level;
    private alias;
    /**
     * 结果
     */
    private members;
    private currentEntity;
    private fullName;
    /**
     * 类型
     */
    private type;
    /**
     * 查找relations
     */
    getRelations(parent?: string, relations?: string[]): string[];
    getSelection(res?: SelectionSet): SelectionSet;
    getSelections(selections?: string[]): string[];
    getAction(res?: SelectionSet): SelectionSet;
    getActions(actions?: any[], skipSelf?: boolean): any[];
    constructor(info: FieldNode, variables: any, level?: number, parent?: SelectionSet);
    static fromGraphql({ info, enums, entities, handlers, decorators, context, source, variables }: {
        info: GraphQLResolveInfo;
        enums?: any;
        entities?: any;
        handlers?: any;
        decorators?: any;
        context?: any;
        source?: any;
        variables?: any;
    }): SelectionSet[];
    getArguments(): any[];
    onInit(): void;
    create(field: FieldNode, variables: any): void;
    createValue(val: ValueNode): any;
    createArgument(arg: any): any;
    parameters: any[];
    setMember(param: any): void;
    getCurrentEntity(): any;
    getFullName(): any;
    isEntity: boolean;
    handlerType(type: any): void;
    toString(set?: SelectionSet): any;
    readonly typeorm: {
        alias: string;
        name: string;
        select: string[];
        relations: string[];
        actions: any[];
        path: string;
        arguments: any[];
    };
    getPath(): string[];
    getTop(): SelectionSet;
}
