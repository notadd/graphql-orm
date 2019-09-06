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
async function createArrayCall(item, parent, path, action) {
    return await Promise.all(item.map((it, index) => {
        if (Array.isArray(it)) {
            return createArrayCall(it, item, path, action);
        }
        else if (typeof it === "function") {
            return createFunc(it, item, path, action);
        }
        else {
            return createCall(it, item, path, action);
        }
    }));
}
async function createCall(item, parent, path, action) {
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
            item[actionPath] = await createArrayCall(it, item, `${path}.${actionPath}`, action);
        }
        else if (typeof it === "function") {
            item[actionPath] = await createFunc(it, item, `${path}.${actionPath}`, action);
        }
        else {
            item[actionPath] = await createCall(it, item, `${path}.${actionPath}`, action);
        }
    }
    return item;
}
function createFunc(item, parent, path, action) {
    const args = action.getArguments();
    return async () => await item.bind(parent)(...args);
}
/**
 * 创建并修改
 */
async function callFn(item, set) {
    const actions = set.getActions();
    const path = set.getPath().join(".");
    if (actions) {
        actions.map(async (action) => {
            if (Array.isArray(item)) {
                await createArrayCall(item, item, path, action);
            }
            else if (typeof item === "function") {
                await createFunc(item, item, path, action);
            }
            else {
                await createCall(item, item, path, action);
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
                        const path = set
                            .getSelection()
                            .getPath()
                            .join(".")
                            .replace(`${set.getPath().join(".")}.`, "");
                        // set.entityFactory.create(result, path, tableName);
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