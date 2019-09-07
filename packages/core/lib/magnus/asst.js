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
        ast.name = ast.action.name;
        ast.list = context.item.map(it => {
            return this.visit(it, ast.action);
        });
        return ast;
    }
    visitObjectAst(ast, context) {
        ast.action = context.action;
        ast.item = context.item;
        ast.name = ast.action.name;
        if (context.action.children) {
            ast.fields = context.action.children.map(action => {
                let it = context.item[action.name];
                if (it) {
                    return this.visit(it, action);
                }
            }).filter(it => !!it);
        }
        else {
            ast.fields = [];
        }
        return ast;
    }
    visitOtherAst(ast, context) {
        ast.action = context.action;
        ast.item = context.item;
        ast.name = ast.action.name;
        return ast;
    }
    visitCallAst(ast, context) {
        ast.action = context.action;
        ast.item = context.item;
        ast.name = ast.action.name;
        return ast;
    }
}
exports.CompilerVisitor = CompilerVisitor;
class ParseVisitor {
    visit(node, context) {
        return node.visit(this, context);
    }
    visitArrayAst(ast, context) {
        return ast.list.map(it => it.visit(this, context));
    }
    visitObjectAst(ast, context) {
        let res = {};
        ast.fields.map(field => {
            res[field.name] = field.visit(this, context);
        });
        return res;
    }
    visitOtherAst(ast, context) {
        return ast.item;
    }
    visitCallAst(ast, context) {
        return (...args) => ast.item(...ast.action.getArguments());
    }
}
exports.ParseVisitor = ParseVisitor;
//# sourceMappingURL=asst.js.map