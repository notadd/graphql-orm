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

export class DocumentAst extends Ast {
    actions: any[] = [];
    visit(visitor: AstVisitor, context: any): any {
        return visitor.visitDocumentAst(this, context)
    }
}

export interface AstVisitor {
    visitArrayAst(ast: ArrayAst, context: any): any;
    visitObjectAst(ast: ObjectAst, context: any): any;
    visitOtherAst(ast: OtherAst, context: any): any;
    visitCallAst(ast: CallAst, context: any): any;
    visitDocumentAst(ast: DocumentAst, context: any): any;
}

interface CompilerContext {
    item: any;
    action: SelectionSet
}

export class CompilerVisitor implements AstVisitor {
    create(item: any, set: SelectionSet) {
        const actions = set.getActions();
        return actions.map(action => {
            if (Array.isArray(it)) {
                return this.visitArrayAst(new ArrayAst(), { item, action })
            } else if (typeof it === 'object') {
                return this.visitObjectAst(new ObjectAst(), { item, action })
            } else if (typeof it === 'function') {
                return this.visitCallAst(new CallAst(), { item, action })
            } else {
                return this.visitObjectAst(new ObjectAst(), { item, action })
            }
        });
    }
    visitDocumentAst(ast: DocumentAst, context: CompilerContext) {
        ast.item = context.item;
        ast.action = context.action;
        const actions = ast.action.getActions();
        ast.actions = actions.map(action => {
            if (Array.isArray(ast.item)) {
                return this.visitArrayAst(new ArrayAst(), { item: ast.item, action })
            } else if (typeof ast.item === 'object') {
                return this.visitObjectAst(new ObjectAst(), { item: ast.item, action })
            } else if (typeof ast.item === 'function') {
                return this.visitCallAst(new CallAst(), { item: ast.item, action })
            } else {
                return this.visitOtherAst(new OtherAst(), { item: ast.item, action })
            }
        });
        return ast;
    }
    visitArrayAst(ast: ArrayAst, context: CompilerContext): any {
        ast.action = context.action;
        ast.item = context.item;
        ast.list = context.item.map(it => {
            return this.visitDocumentAst(new DocumentAst(), {
                item: it,
                action: ast.action
            });
        });
        return ast;
    }
    visitObjectAst(ast: ObjectAst, context: CompilerContext): any {
        ast.action = context.action;
        ast.item = context.item;
        ast.fields = Object.keys(ast.item).map(key => {
            let it = ast.item[key]
            return {
                name: key,
                node: this.visitDocumentAst(new DocumentAst(), {
                    item: it,
                    action: ast.action
                })
            }
        });
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