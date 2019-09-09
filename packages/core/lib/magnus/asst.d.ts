import { SelectionSet } from "./selectionSet";
export declare abstract class Ast {
    action: SelectionSet;
    item: any;
    path: string;
    name: string;
    parent: any;
    abstract visit(visitor: AstVisitor, context: any): any;
}
export declare class ArrayAst extends Ast {
    list: any[];
    visit(visitor: AstVisitor, context: any): any;
}
export declare class ObjectAst extends Ast {
    fields: any[];
    visit(visitor: AstVisitor, context: any): any;
}
export declare class OtherAst extends Ast {
    visit(visitor: AstVisitor, context: any): any;
}
export declare class CallAst extends Ast {
    visit(visitor: AstVisitor, context: any): any;
}
export interface AstVisitor {
    visitArrayAst(ast: ArrayAst, context: any): any;
    visitObjectAst(ast: ObjectAst, context: any): any;
    visitOtherAst(ast: OtherAst, context: any): any;
    visitCallAst(ast: CallAst, context: any): any;
}
interface CompilerContext {
    item: any;
    action: SelectionSet;
    parent: any;
}
export declare class CompilerVisitor implements AstVisitor {
    visit(item: any, action: SelectionSet, parent?: any): any;
    visitArrayAst(ast: ArrayAst, context: CompilerContext): any;
    visitObjectAst(ast: ObjectAst, context: CompilerContext): any;
    visitOtherAst(ast: OtherAst, context: CompilerContext): any;
    visitCallAst(ast: CallAst, context: CompilerContext): any;
}
export declare class ParseVisitor implements AstVisitor {
    visit(node: Ast, context: any): any;
    visitArrayAst(ast: ArrayAst, context: any): any;
    visitObjectAst(ast: ObjectAst, context: any): any;
    visitOtherAst(ast: OtherAst, context: any): any;
    visitCallAst(ast: CallAst, parent: any): any;
}
export {};
