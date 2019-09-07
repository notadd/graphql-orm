"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Ast {
}
exports.Ast = Ast;
class ArrayAst extends Ast {
    constructor() {
        super(...arguments);
        this.list = [];
    }
    visit(visitor, context) {
        return visitor.visitArrayAst(this, context);
    }
}
exports.ArrayAst = ArrayAst;
class ObjectAst extends Ast {
    constructor() {
        super(...arguments);
        this.fields = [];
    }
    visit(visitor, context) {
        return visitor.visitObjectAst(this, context);
    }
}
exports.ObjectAst = ObjectAst;
class OtherAst extends Ast {
    visit(visitor, context) {
        return visitor.visitOtherAst(this, context);
    }
}
exports.OtherAst = OtherAst;
class CallAst extends Ast {
    visit(visitor, context) {
        return visitor.visitCallAst(this, context);
    }
}
exports.CallAst = CallAst;
class DocumentAst extends Ast {
    constructor() {
        super(...arguments);
        this.actions = [];
    }
    visit(visitor, context) {
        return visitor.visitDocumentAst(this, context);
    }
}
exports.DocumentAst = DocumentAst;
class CompilerVisitor {
    create(item, set) {
        const actions = set.getActions();
        return actions.map(action => {
            if (Array.isArray(it)) {
                return this.visitArrayAst(new ArrayAst(), { item, action });
            }
            else if (typeof it === 'object') {
                return this.visitObjectAst(new ObjectAst(), { item, action });
            }
            else if (typeof it === 'function') {
                return this.visitCallAst(new CallAst(), { item, action });
            }
            else {
                return this.visitObjectAst(new ObjectAst(), { item, action });
            }
        });
    }
    visitDocumentAst(ast, context) {
        ast.item = context.item;
        ast.action = context.action;
        const actions = ast.action.getActions();
        ast.actions = actions.map(action => {
            if (Array.isArray(ast.item)) {
                return this.visitArrayAst(new ArrayAst(), { item: ast.item, action });
            }
            else if (typeof ast.item === 'object') {
                return this.visitObjectAst(new ObjectAst(), { item: ast.item, action });
            }
            else if (typeof ast.item === 'function') {
                return this.visitCallAst(new CallAst(), { item: ast.item, action });
            }
            else {
                return this.visitOtherAst(new OtherAst(), { item: ast.item, action });
            }
        });
        return ast;
    }
    visitArrayAst(ast, context) {
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
    visitObjectAst(ast, context) {
        ast.action = context.action;
        ast.item = context.item;
        ast.fields = Object.keys(ast.item).map(key => {
            let it = ast.item[key];
            return {
                name: key,
                node: this.visitDocumentAst(new DocumentAst(), {
                    item: it,
                    action: ast.action
                })
            };
        });
        return ast;
    }
    visitOtherAst(ast, context) {
        ast.action = context.action;
        ast.item = context.item;
        return ast;
    }
    visitCallAst(ast, context) {
        ast.action = context.action;
        ast.item = context.item;
        return ast;
    }
}
exports.CompilerVisitor = CompilerVisitor;
//# sourceMappingURL=asst.js.map