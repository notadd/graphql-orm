import { GraphQLResolveInfo } from 'graphql';
import { MagnusBase } from '@notadd/magnus-core';
interface MagnusFieldResolver {
    (source: any, variables: any, info: GraphQLResolveInfo): any;
}
interface MagnusFieldResolvers {
    [key: string]: MagnusFieldResolver | any;
}
declare type MagnusFields = MagnusFieldResolvers | string | number | undefined | any;
interface MagnusResolver {
    (source: any, variables: any, context: any, info: GraphQLResolveInfo): MagnusFields;
}
interface MagnusResolvers {
    [key: string]: MagnusResolver | MagnusResolvers;
}
interface GetController {
    (name: string): MagnusBase;
}
export declare const decoratorsMap: {
    Selection: any;
    Relation: any;
};
import { Metadatas, HandlerDefMap } from './types';
export declare function createResolvers(handlers: HandlerDefMap, entity: Metadatas, decorators: any, getController: GetController): MagnusResolvers;
export {};
