import { BaseEntity } from "../repository/BaseEntity";
import { SelectionSet } from './selectionSet'
import { GraphQLResolveInfo } from 'graphql'
export class MagnusBaseEntity extends BaseEntity {
    fromGraphql(
        info: GraphQLResolveInfo
    ) {
        const sets = SelectionSet.fromGraphql(info);
        return sets.map(set => set.toTypeorm())
    }
}
