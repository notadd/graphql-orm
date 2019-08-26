import { GraphQLResolveInfo } from 'graphql';
import { HandlerDefMap, MagnusBase } from '@notadd/magnus-core';
import { upperFirst } from 'lodash';
import { SelectionSet } from './selectionSet'
interface MagnusFieldResolver {
    (source: any, variables: any, info: GraphQLResolveInfo): any
}
interface MagnusFieldResolvers {
    [key: string]: MagnusFieldResolver | any;
}
type MagnusFields = MagnusFieldResolvers | string | number | undefined | any;
interface MagnusResolver {
    (source: any, variables: any, context: any, info: GraphQLResolveInfo): MagnusFields
}
interface MagnusResolvers {
    [key: string]: MagnusResolver | MagnusResolvers;
}
interface GetController {
    (name: string): MagnusBase;
}
export const decoratorsMap = {
    Info: (data: any, source: any, variables: any, context: any, info: any) => info,
    Source: (data: any, source: any, variables: any, context: any, info: any) => source,
    Context: (data: any, source: any, variables: any, context: any, info: any) => context,
};
export function createResolvers(metadata: HandlerDefMap, decorators: any, getController: GetController): MagnusResolvers {
    const obj: MagnusResolvers = {};
    decorators = {
        ...decoratorsMap,
        ...decorators
    }
    Object.keys(metadata).map(operation => {
        const items = metadata[operation] || [];
        const item = {};
        items.forEach(it => {
            const [fieldName, className, tableName, methodName, argsDef] = it;
            const controller = getController(className);
            if (controller) {
                const resolver: MagnusResolver = async (source: any, variables: any, context: any, info: GraphQLResolveInfo) => {
                    const sets = SelectionSet.fromGraphql(info);
                    controller.tablename = tableName;
                    argsDef.map(arg => {
                        const { name, type, index, decorator } = arg;
                        params[index] = variables[name]
                        if (decorator.length > 0) {
                            decorator.map(dec => {
                                if (decorators[dec]) {
                                    params[index] = decorators[dec](
                                        params[index], source, variables, context, info
                                    )
                                }
                            })
                        }
                    })
                    const params = new Array(argsDef.length)
                    const results = {};
                    await Promise.all(sets.map(async set => {
                        const config = set.toTypeorm();
                        const result = await controller[methodName](...params);
                        // 赋值
                        if (config.actions && config.actions.length > 0) {
                            config.actions.map(async action => {
                                if (Array.isArray(result)) {
                                    await Promise.all(result.map(async res => {
                                        res[action.name] = await res[action.name](action.args)
                                    }));
                                } else {
                                    result[action.name] = await result[action.name](action.args)
                                }
                            })
                        }
                        results[config.name] = result;
                    }))
                    return results;
                }
                item[fieldName] = resolver;
            }
        })
        obj[`${upperFirst(operation)}`] = item;
    })
    return obj;
}
