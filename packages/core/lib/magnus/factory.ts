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
async function createArrayCall(item: any[], parent: any, path: string, action: SelectionSet) {
    return await Promise.all(item.map((it, index) => {
        if (Array.isArray(it)) {
            return createArrayCall(it, item, path, action);
        }
        else if (typeof it === 'function') {
            return createFunc(it, item, path, action);
        }
        else {
            return createCall(it, item, path, action);
        }
    }));
}
async function createCall(item: any, parent: any, path: string, action: SelectionSet) {
    const actionPaths = action.getPath().join('.').replace(`${path}.`, ``).split('.').reverse();
    const actionPath = actionPaths.pop();
    if (actionPath) {
        const it = item[actionPath];
        if (Array.isArray(it)) {
            item[actionPath] = await createArrayCall(it, item, `${path}.${actionPath}`, action);
        }
        else if (typeof it === 'function') {
            item[actionPath] = await createFunc(it, item, `${path}.${actionPath}`, action);
        }
        else {
            item[actionPath] = await createCall(it, item, `${path}.${actionPath}`, action);
        }
    }
    return item;
}
async function createFunc(item: any, parent: any, path: string, action: SelectionSet) {
    const args = action.getArguments();
    return await item.bind(parent)(...args)
}
/**
 * 创建并修改
 */
async function callFn(item: any, set: SelectionSet) {
    const actions = set.getActions();
    const path = set.getPath().join('.');
    if (actions) {
        actions.map(async (action) => {
            if (Array.isArray(item)) {
                await createArrayCall(item, item, path, action);
            }
            else if (typeof item === 'function') {
                await createFunc(item, item, path, action);
            }
            else {
                await createCall(item, item, path, action);
            }
        });
    };
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
                const resolver: MagnusResolver = async (
                    source: any,
                    variables: any,
                    context: any,
                    info: GraphQLResolveInfo
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
                    await Promise.all(
                        sets.map(async set => {
                            const _arguments = set.getArguments();
                            const result = await controller[methodName](..._arguments);
                            results[set.name] = await callFn(result, set);
                        })
                    );
                    return results[fieldName];
                };
                item[fieldName] = resolver;
            }
        });
        obj[`${upperFirst(operation)}`] = item;
    });
    return obj;
}
