import { GraphQLResolveInfo } from "graphql";
import { MagnusBase } from "@notadd/magnus-core";
import { upperFirst } from "lodash";
import { SelectionSet } from "./selectionSet";
import { CompilerVisitor, ParseVisitor } from "./asst";
import { scalars } from "@notadd/magnus-graphql";
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
          await Promise.all(
            sets.map(async set => {
              const _arguments = set.getArguments(variables);
              const result = await controller[methodName](..._arguments);
              const visitor = new CompilerVisitor();
              const parse = new ParseVisitor();
              const list = visitor.visit(result, set);
              const res = list.visit(parse, result);
              results[set.name] = res;
            })
          );
          return results[fieldName];
        };
        item[fieldName] = resolver;
      }
    });
    obj[`${upperFirst(operation)}`] = item;
  });
  return {
    ...(scalars as any),
    ...obj
  };
}
