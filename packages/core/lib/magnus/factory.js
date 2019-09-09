"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const selectionSet_1 = require("./selectionSet");
const asst_1 = require("./asst");
const magnus_graphql_1 = require("@notadd/magnus-graphql");
const decorator_1 = require("./decorator");
exports.decoratorsMap = {
    Selection: decorator_1.Selection,
    Relation: decorator_1.Relation,
    GetSelectionSet: decorator_1.GetSelectionSet
};
function createResolvers(handlers, entity, decorators, getController) {
    const obj = {};
    decorators = {
        ...exports.decoratorsMap,
        ...decorators
    };
    Object.keys(handlers).map(operation => {
        const items = handlers[operation] || [];
        const item = {};
        items.forEach(it => {
            const [fieldName, className, tableName, methodName, argsDef] = it;
            const controller = getController(className);
            if (controller) {
                const resolver = async (source, variables, context, info) => {
                    const sets = selectionSet_1.SelectionSet.fromGraphql({
                        info: info,
                        enums: {},
                        entities: entity,
                        handlers,
                        decorators,
                        source,
                        variables,
                        context
                    });
                    controller.tablename = tableName;
                    const results = {};
                    await Promise.all(sets.map(async (set) => {
                        const _arguments = set.getArguments(variables);
                        const result = await controller[methodName](..._arguments);
                        const visitor = new asst_1.CompilerVisitor();
                        const parse = new asst_1.ParseVisitor();
                        const list = visitor.visit(result, set);
                        const res = list.visit(parse, result);
                        results[set.name] = res;
                    }));
                    return results[fieldName];
                };
                item[fieldName] = resolver;
            }
        });
        obj[`${lodash_1.upperFirst(operation)}`] = item;
    });
    return {
        ...magnus_graphql_1.scalars,
        ...obj
    };
}
exports.createResolvers = createResolvers;
//# sourceMappingURL=factory.js.map