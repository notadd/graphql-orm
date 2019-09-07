import { GraphQLResolveInfo, FieldNode } from "graphql";
import { CreateWhere } from "./createWhere";
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
    parent?: SelectionSet;
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
    getRelations(parent?: string, relations?: any[]): any[];
    getSelection(res?: SelectionSet): SelectionSet;
    getSelections(selections?: any[]): any[];
    private getAction;
    getActions(actions?: SelectionSet[]): SelectionSet[];
    constructor(info: FieldNode, variables: any, level?: number, parent?: SelectionSet);
    static info: any;
    static enums: any;
    static entities: any;
    static handlers: any;
    static decorators: any;
    static context: any;
    static source: any;
    static variables: any;
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
    private create;
    private createValue;
    private createArgument;
    parameters: any[];
    setMember(param: any): void;
    private getCurrentEntity;
    private getFullName;
    isEntity: boolean;
    findCurrentEntity(type: any): any;
    private handlerType;
    toString(set?: SelectionSet): any;
    getPath(): string[];
    getTop(): SelectionSet;
}
