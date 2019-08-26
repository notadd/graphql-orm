"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const selectionSet_1 = require("./selectionSet");
exports.decoratorsMap = {
    Info: (data, source, variables, context, info) => info,
    Source: (data, source, variables, context, info) => source,
    Context: (data, source, variables, context, info) => context,
};
function createResolvers(metadata, entity, decorators, getController) {
    const obj = {};
    decorators = {
        ...exports.decoratorsMap,
        ...decorators
    };
    Object.keys(metadata).map(operation => {
        const items = metadata[operation] || [];
        const item = {};
        items.forEach(it => {
            const [fieldName, className, tableName, methodName, argsDef] = it;
            const controller = getController(className);
            if (controller) {
                const resolver = async (source, variables, context, info) => {
                    const sets = selectionSet_1.SelectionSet.fromGraphql(info);
                    controller.tablename = tableName;
                    const params = new Array(argsDef.length);
                    const results = {};
                    argsDef.map(arg => {
                        const { name, type, index, decorator } = arg;
                        params[index] = variables[name];
                        if (decorator.length > 0) {
                            decorator.map(dec => {
                                if (decorators[dec]) {
                                    params[index] = decorators[dec](params[index], source, variables, context, info);
                                }
                            });
                        }
                    });
                    await Promise.all(sets.map(async (set) => {
                        const config = set.toTypeorm();
                        const result = await controller[methodName](...params);
                        console.log({ entity, config });
                        // const targetDef = entity[type].find(it => it.name === name);
                        // 赋值
                        if (config.actions && config.actions.length > 0) {
                            config.actions.map(async (action) => {
                                if (Array.isArray(result)) {
                                    await Promise.all(result.map(async (res) => {
                                        res[action.name] = await res[action.name](action.args);
                                    }));
                                }
                                else {
                                    result[action.name] = await result[action.name](action.args);
                                }
                            });
                        }
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