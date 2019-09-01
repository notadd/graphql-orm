"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const selectionSet_1 = require("./selectionSet");
const decorator_1 = require("./decorator");
exports.decoratorsMap = {
    Selection: decorator_1.Selection,
    Relation: decorator_1.Relation,
    GetSelectionSet: decorator_1.GetSelectionSet,
    Typeorm: decorator_1.Typeorm
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
                        const config = set.typeorm;
                        const result = await controller[methodName](...config.arguments);
                        results[config.name] = result;
                    }));
                    return results[fieldName];
                };
                item[fieldName] = resolver;
            }
        });
        obj[`${lodash_1.upperFirst(operation)}`] = item;
    });
    return obj;
}
exports.createResolvers = createResolvers;
//# sourceMappingURL=factory.js.map