import { GraphQLResolveInfo } from 'graphql';
import { HandlerDefMap, MagnusBase } from '@notadd/magnus-core';
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
    Info: (data: any, source: any, variables: any, context: any, info: any) => any;
    Source: (data: any, source: any, variables: any, context: any, info: any) => any;
    Context: (data: any, source: any, variables: any, context: any, info: any) => any;
};
export declare function createResolvers(metadata: HandlerDefMap, decorators: any, getController: GetController): MagnusResolvers;
export {};
