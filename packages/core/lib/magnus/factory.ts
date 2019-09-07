import { GraphQLResolveInfo } from "graphql";
import { MagnusBase } from "@notadd/magnus-core";
import { upperFirst } from "lodash";
import { SelectionSet } from "./selectionSet";
interface MagnusFieldResolver {
    (source: any, variables: any, info: GraphQLResolveInfo): any;
}
interface MagnusFieldResolvers {
    [key: string]: MagnusFieldResolver | any;
}
type MagnusFields = MagnusFieldResolvers | string | number | undefined | any;
interface MagnusResolver {
    (
        source: any,
        variables: any,
        context: any,
        info: GraphQLResolveInfo
    ): MagnusFields;
}
interface MagnusResolvers {
    [key: string]: MagnusResolver | MagnusResolvers;
}
interface GetController {
    (name: string): MagnusBase;
}
import { Selection, Relation, GetSelectionSet } from "./decorator";
export const decoratorsMap = {
    Selection,
    Relation,
    GetSelectionSet
};
import { Metadatas, HandlerDefMap } from "./types";
function createArrayCall(
    item: any[],
    parent: any,
    path: string,
    action: SelectionSet
) {
    if (item && item.length > 0)
        return item.map((it, index) => {
            if (Array.isArray(it) && it.length > 0) {
                return createArrayCall(it, item, path, action);
            } else if (typeof it === "function") {
                return createFunc(it, item, path, action);
            } else if (it) {
                return createCall(it, item, path, action);
            }
        })
    return item;
}
function createCall(
    item: any,
    parent: any,
    path: string,
    action: SelectionSet
) {
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
            if (Array.isArray(it) && it.length > 0) {
                item[actionPath] = createArrayCall(
                    it,
                    item,
                    `${path}.${actionPath}`,
                    action
                );
            } else if (typeof it === "function") {
                item[actionPath] = createFunc(
                    it,
                    item,
                    `${path}.${actionPath}`,
                    action
                );
            } else if (it) {
                item[actionPath] = createCall(
                    it,
                    item,
                    `${path}.${actionPath}`,
                    action
                );
            }
        }
        return item;
    }
    return item;
}
function createFunc(
    item: any,
    parent: any,
    path: string,
    action: SelectionSet
) {
    if (item) {
        const args = action.getArguments();
        return async () => await item.bind(parent)(...args);
    }
    return item;
}
/**
 * 创建并修改
 */
function callFn(item: any, set: SelectionSet) {
    const actions = set.getActions();
    const path = set.getPath().join(".");
    if (actions) {
        actions.map(action => {
            if (Array.isArray(item) && item.length > 0) {
                createArrayCall(item, item, path, action);
            } else if (typeof item === "function") {
                createFunc(item, item, path, action);
            } else if (item) {
                createCall(item, item, path, action);
            }
        });
    }
    return item;
}

export function createResolvers(
    handlers: HandlerDefMap,
    entity: Metadatas,
    decorators: any,
    getController: GetController
): MagnusResolvers {
    const obj: MagnusResolvers = {};
    decorators = {
        ...decoratorsMap,
        ...decorators
    };
    Object.keys(handlers).map(operation => {
        const items = handlers[operation] || [];
        const item = {};
        items.forEach(it => {
            const [fieldName, className, tableName, methodName, argsDef] = it;
            const controller = getController(className);
            if (controller) {
                const resolver = async (
                    source: any,
                    variables: any,
                    context: any,
                    info: any
                ) => {
                    const sets = SelectionSet.fromGraphql({
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
                    await Promise.all(sets.map(async set => {
                        const _arguments = set.getArguments();
                        const result = await controller[methodName](..._arguments);
                        results[set.name] = callFn(result, set);
                        set.getActions();
                        // Departments 
                        debugger;
                    }));
                    return results[fieldName];
                };
                item[fieldName] = resolver;
            }
        });
        obj[`${upperFirst(operation)}`] = item;
    });
    return obj;
}
