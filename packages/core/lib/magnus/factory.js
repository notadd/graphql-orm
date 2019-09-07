"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const selectionSet_1 = require("./selectionSet");
const decorator_1 = require("./decorator");
exports.decoratorsMap = {
    Selection: decorator_1.Selection,
    Relation: decorator_1.Relation,
    GetSelectionSet: decorator_1.GetSelectionSet
};
function createArrayCall(item, parent, path, action) {
    if (item && item.length > 0)
        return item.map((it, index) => {
            if (Array.isArray(it)) {
                return createArrayCall(it, item, path, action);
            }
            else if (typeof it === "function") {
                return createFunc(it, item, path, action);
            }
            else {
                return createCall(it, item, path, action);
            }
        });
    return item;
}
function createCall(item, parent, path, action) {
    if (item) {
        const actionPaths = action
            .getPath()
            .join(".")
            .replace(`${path}.`, ``)
            .split(".")
            .reverse();
        const actionPath = actionPaths.pop();
        if (actionPath) {
            const it = item[actionPath];
            if (Array.isArray(it)) {
                item[actionPath] = createArrayCall(it, item, `${path}.${actionPath}`, action);
            }
            else if (typeof it === "function") {
                item[actionPath] = createFunc(it, item, `${path}.${actionPath}`, action);
            }
            else {
                item[actionPath] = createCall(it, item, `${path}.${actionPath}`, action);
            }
        }
        return item;
    }
    return item;
}
function createFunc(item, parent, path, action) {
    if (item) {
        const args = action.getArguments();
        return async () => await item.bind(parent)(...args);
    }
    return item;
}
/**
 * 创建并修改
 */
function callFn(item, set) {
    const actions = set.getActions();
    const path = set.getPath().join(".");
    if (actions) {
        actions.map(action => {
            if (Array.isArray(item)) {
                createArrayCall(item, item, path, action);
            }
            else if (typeof item === "function") {
                createFunc(item, item, path, action);
            }
            else {
                createCall(item, item, path, action);
            }
        });
    }
    return item;
}
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
                        const _arguments = set.getArguments();
                        const result = await controller[methodName](..._arguments);
                        results[set.name] = callFn(result, set);
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