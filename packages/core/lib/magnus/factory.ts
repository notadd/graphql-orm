import { GraphQLResolveInfo } from "graphql";
import { PubSub } from 'graphql-subscriptions';
import { MagnusBase } from "@notadd/magnus-core";
import { upperFirst } from "lodash";
import { SelectionSet } from "./selectionSet";
import { CompilerVisitor, ParseVisitor } from "./asst";
import { scalars } from "@notadd/magnus-graphql";
import { isObservable } from 'rxjs';
export function isPromise(val: any): val is Promise<any> {
    return typeof val.then === 'function';
}
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
import { withFilter } from 'graphql-subscriptions';
export function createResolvers(
    handlers: HandlerDefMap,
    entity: Metadatas,
    decorators: any,
    preHandler: any,
    afterHandler: any,
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
                if (operation === 'subscription') {
                    item[fieldName] = {
                        subscribe: (source, variables, context, info) => {
                            const name = `${className}${fieldName}`
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
                            sets.map(async set => {
                                const _arguments = set.getArguments(variables);
                                if (preHandler && context.isBrowser) {
                                    const res = await preHandler(set);
                                    if (!res) {
                                        return;
                                    }
                                }
                                const result = await controller[methodName](..._arguments);
                                if (isObservable(result)) {
                                    result.subscribe(res => {
                                        context.pubsub.publish(name, { [`${fieldName}`]: res })
                                    });
                                } else if (isPromise(result)) {
                                    result.then(res => {
                                        context.pubsub.publish(name, { [`${fieldName}`]: res })
                                    })
                                } else {
                                    context.pubsub.publish(name, { [`${fieldName}`]: result })
                                }
                            });
                            return context.pubsub.asyncIterator(name)
                        }
                    }
                } else {
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
                        let results = {};
                        await Promise.all(
                            sets.map(async set => {
                                const _arguments = set.getArguments(variables);
                                if (preHandler && context.isBrowser) {
                                    const res = await preHandler(set);
                                    if (!res) {
                                        return;
                                    }
                                }
                                const result = await controller[methodName](..._arguments);
                                const visitor = new CompilerVisitor();
                                const parse = new ParseVisitor();
                                const list = visitor.visit(result, set);
                                const res = list.visit(parse, result);
                                if (isObservable(result)) {
                                    const pubsub = new PubSub();
                                    result.subscribe(res => {
                                        pubsub.publish(set.name, res)
                                    });
                                    results[set.name] = pubsub.asyncIterator(set.name);
                                } else {
                                    if (afterHandler) {
                                        results[set.name] = await afterHandler(set, res)
                                    } else {
                                        results[set.name] = res;
                                    }
                                }
                            })
                        );
                        return results[fieldName];
                    };
                    item[fieldName] = resolver;
                }

            }
        });
        obj[`${upperFirst(operation)}`] = item;
    });
    return {
        ...(scalars as any),
        ...obj
    };
}
