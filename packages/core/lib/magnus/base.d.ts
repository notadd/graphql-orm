import { BaseEntity } from "../repository/BaseEntity";
import { GraphQLResolveInfo } from 'graphql';
export declare class MagnusBaseEntity extends BaseEntity {
    fromGraphql(info: GraphQLResolveInfo): {
        alias: string;
        name: string;
        select: string[];
        relations: string[];
        actions: {
            name: string;
            args: any;
        }[];
    }[];
}
