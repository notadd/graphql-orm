import { SelectionSet } from './selectionSet';
import { GraphQLResolveInfo } from 'graphql';
export abstract class Ast {
	action: SelectionSet;
	item: any;
	path: string;
	name: string;
	parent: any;
	abstract visit(visitor: AstVisitor, context: any): any;
}

export class ArrayAst extends Ast {
	list: any[] = [];
	visit(visitor: AstVisitor, context: any): any {
		return visitor.visitArrayAst(this, context);
	}
}
export class ObjectAst extends Ast {
	fields: any[] = [];
	visit(visitor: AstVisitor, context: any): any {
		return visitor.visitObjectAst(this, context);
	}
}
export class OtherAst extends Ast {
	visit(visitor: AstVisitor, context: any): any {
		return visitor.visitOtherAst(this, context);
	}
}
export class CallAst extends Ast {
	visit(visitor: AstVisitor, context: any): any {
		return visitor.visitCallAst(this, context);
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
	action: SelectionSet;
	parent: any;
}

export class CompilerVisitor implements AstVisitor {
	visit(item: any, action: SelectionSet, parent: any = undefined) {
		if (Array.isArray(item)) {
			return this.visitArrayAst(new ArrayAst(), { item, action, parent });
		} else if (typeof item === 'object') {
			return this.visitObjectAst(new ObjectAst(), {
				item,
				action,
				parent
			});
		} else if (typeof item === 'function') {
			return this.visitCallAst(new CallAst(), { item, action, parent });
		} else {
			return this.visitOtherAst(new OtherAst(), { item, action, parent });
		}
	}
	visitArrayAst(ast: ArrayAst, context: CompilerContext): any {
		ast.parent = context.parent;
		ast.action = context.action;
		ast.item = context.item;
		ast.name = ast.action.name;
		ast.list = context.item.map(it => {
			return this.visit(it, ast.action, context.item);
		});
		return ast;
	}
	visitObjectAst(ast: ObjectAst, context: CompilerContext): any {
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
		} else {
			ast.fields = [];
		}
		return ast;
	}
	visitOtherAst(ast: OtherAst, context: CompilerContext): any {
		ast.action = context.action;
		ast.item = context.item;
		ast.name = ast.action.name;
		ast.parent = context.parent;
		return ast;
	}
	visitCallAst(ast: CallAst, context: CompilerContext): any {
		ast.parent = context.parent;
		ast.action = context.action;
		ast.item = context.item;
		ast.name = ast.action.name;
		return ast;
	}
}

export class ParseVisitor implements AstVisitor {
	visit(node: Ast, context: any) {
		return node.visit(this, context);
	}
	visitArrayAst(ast: ArrayAst, context: any): any {
		return ast.list.map(it => it.visit(this, it));
	}
	visitObjectAst(ast: ObjectAst, context: any): any {
		let res: any = {};
		ast.fields.map(field => {
			res[field.name] = field.visit(this, field.res);
		});
		return res;
	}
	visitOtherAst(ast: OtherAst, context: any): any {
		return ast.item;
	}
	visitCallAst(ast: CallAst, parent: any): any {
		if (ast.action.parent) {
			return async (variables: any, context: any, info: GraphQLResolveInfo) => {
				const action = ast.action;
				const args = action.getArguments(variables);
				const lists = await ast.item.bind(ast.parent)(...args);
				return lists;
			};
		}
		return ast.item;
	}
}
