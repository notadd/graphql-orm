import { GraphQLResolveInfo } from "graphql";
import { MagnusBase } from "@notadd/magnus-core";
import { upperFirst } from "lodash";
import { SelectionSet } from "./selectionSet";
import { get, set } from "lodash";
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
export async function callActionByPath(data: any, action: any) {
  const actions = (action.path as string).split(".");
  actions.pop();
  const that = get(data, actions.join("."));
  const list = get(data, action.path);
  if (typeof list === "function") {
    const result = await list.bind(that)(...action.args);
    set(data, action.path, result);
  }
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
              const config = set.toTypeorm();
              const result = await controller[methodName](...set.arguments);
              // 赋值
              if (config.actions && config.actions.length > 0) {
                await Promise.all(
                  config.actions.map(action => callActionByPath(result, action))
                );
              }
              results[config.name] = result;
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
