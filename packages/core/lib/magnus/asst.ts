import { SelectionSet } from "./selectionSet";

export abstract class Ast {
    action: SelectionSet;
    item: any;
    parent: Ast;
    abstract visit(visitor: AstVisitor, context: any): any;
}

export class ArrayAst extends Ast {
    list: any[] = [];
    visit(visitor: AstVisitor, context: any): any {
        return visitor.visitArrayAst(this, context)
    }
}
export class ObjectAst extends Ast {
    fields: any[] = [];
    visit(visitor: AstVisitor, context: any): any {
        return visitor.visitObjectAst(this, context)
    }
}
export class OtherAst extends Ast {
    visit(visitor: AstVisitor, context: any): any {
        return visitor.visitOtherAst(this, context)
    }
}
export class CallAst extends Ast {
    visit(visitor: AstVisitor, context: any): any {
        return visitor.visitCallAst(this, context)
    }
}

export interface AstVisitor {
    visitArrayAst(ast: ArrayAst, context: any): any;
    visitObjectAst(ast: ObjectAst, context: any): any;
    visitOtherAst(ast: OtherAst, context: any): any;
    visitCallAst(ast: CallAst, context: any): any;
}

interface CompilerContext {
    item: any;
    action: SelectionSet
}

export class CompilerVisitor implements AstVisitor {
    visit(item: any, action: SelectionSet) {
        if (Array.isArray(item)) {
            return this.visitArrayAst(new ArrayAst(), { item, action })
        } else if (typeof item === 'object') {
            return this.visitObjectAst(new ObjectAst(), { item, action })
        } else if (typeof item === 'function') {
            return this.visitCallAst(new CallAst(), { item, action })
        } else {
            return this.visitOtherAst(new OtherAst(), { item, action })
        }
    }
    visitArrayAst(ast: ArrayAst, context: CompilerContext): any {
        ast.action = context.action;
        ast.item = context.item;
        ast.list = context.item.map(it => {
            return this.visit(it, ast.action);
        });
        return ast;
    }
    visitObjectAst(ast: ObjectAst, context: CompilerContext): any {
        ast.action = context.action;
        ast.item = context.item;
        if (ast.item)
            ast.fields = Object.keys(context.item).map(key => {
                let it = context.item[key];
                return {
                    name: key,
                    node: this.visit(it, ast.action)
                };
            });
        ast.fields = [];
        return ast;
    }
    visitOtherAst(ast: OtherAst, context: CompilerContext): any {
        ast.action = context.action;
        ast.item = context.item;
        return ast;
    }
    visitCallAst(ast: CallAst, context: CompilerContext): any {
        ast.action = context.action;
        ast.item = context.item;
        return ast;
    }
}