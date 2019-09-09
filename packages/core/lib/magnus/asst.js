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
    visit(item, action, parent = undefined) {
        if (Array.isArray(item)) {
            return this.visitArrayAst(new ArrayAst(), { item, action, parent });
        }
        else if (typeof item === "object") {
            return this.visitObjectAst(new ObjectAst(), {
                item,
                action,
                parent
            });
        }
        else if (typeof item === "function") {
            return this.visitCallAst(new CallAst(), { item, action, parent });
        }
        else {
            return this.visitOtherAst(new OtherAst(), { item, action, parent });
        }
    }
    visitArrayAst(ast, context) {
        ast.parent = context.parent;
        ast.action = context.action;
        ast.item = context.item;
        ast.name = ast.action.name;
        ast.list = context.item.map(it => {
            return this.visit(it, ast.action, context.item);
        });
        return ast;
    }
    visitObjectAst(ast, context) {
        ast.parent = context.parent;
        ast.action = context.action;
        ast.item = context.item;
        ast.name = ast.action.name;
        if (context.action.children) {
            ast.fields = context.action.children
                .map(action => {
                let it = context.item[action.name];
                if (it) {
                    return this.visit(it, action, context.item);
                }
            })
                .filter(it => !!it);
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
        ast.parent = context.parent;
        return ast;
    }
    visitCallAst(ast, context) {
        ast.parent = context.parent;
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
        return ast.list.map(it => it.visit(this, it));
    }
    visitObjectAst(ast, context) {
        if (ast.fields.length > 0) {
            let res = {};
            ast.fields.map(field => {
                res[field.name] = field.visit(this, field.res);
            });
            return res;
        }
        return ast.item;
    }
    visitOtherAst(ast, context) {
        return ast.item;
    }
    visitCallAst(ast, parent) {
        if (ast.action.parent) {
            return async (variables, context, info) => {
                const action = ast.action;
                const args = action.getArguments(variables);
                const lists = await ast.item.bind(ast.parent)(...args);
                return lists;
            };
        }
        return ast.item;
    }
}
exports.ParseVisitor = ParseVisitor;
//# sourceMappingURL=asst.js.map