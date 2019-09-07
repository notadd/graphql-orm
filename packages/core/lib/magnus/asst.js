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
class CompilerVisitor {
    visit(item, action) {
        if (Array.isArray(item)) {
            return this.visitArrayAst(new ArrayAst(), { item, action });
        }
        else if (typeof item === 'object') {
            return this.visitObjectAst(new ObjectAst(), { item, action });
        }
        else if (typeof item === 'function') {
            return this.visitCallAst(new CallAst(), { item, action });
        }
        else {
            return this.visitOtherAst(new OtherAst(), { item, action });
        }
    }
    visitArrayAst(ast, context) {
        ast.action = context.action;
        ast.item = context.item;
        ast.list = context.item.map(it => {
            return this.visit(it, ast.action);
        });
        return ast;
    }
    visitObjectAst(ast, context) {
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