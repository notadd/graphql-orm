import { FindManyOptions } from "./FindManyOptions";
import { FindOneOptions } from "./FindOneOptions";
import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
import { FindRelationsNotFoundError } from "../error/FindRelationsNotFoundError";
import { EntityMetadata } from "../metadata/EntityMetadata";
import { shorten } from "../util/StringUtils";

/**
 * Utilities to work with FindOptions.
 */
export class FindOptionsUtils {

    // -------------------------------------------------------------------------
    // Public Static Methods
    // -------------------------------------------------------------------------

    /**
     * Checks if given object is really instance of FindOneOptions interface.
     */
    static isFindOneOptions(obj: any): obj is FindOneOptions<any> {
        const possibleOptions: FindOneOptions<any> = obj;
        return possibleOptions &&
            (
                possibleOptions.select instanceof Array ||
                possibleOptions.where instanceof Object ||
                typeof possibleOptions.where === "string" ||
                possibleOptions.relations instanceof Array ||
                possibleOptions.join instanceof Object ||
                possibleOptions.order instanceof Object ||
                possibleOptions.cache instanceof Object ||
                typeof possibleOptions.cache === "boolean" ||
                typeof possibleOptions.cache === "number" ||
                possibleOptions.lock instanceof Object ||
                possibleOptions.loadRelationIds instanceof Object ||
                typeof possibleOptions.loadRelationIds === "boolean" ||
                typeof possibleOptions.loadEagerRelations === "boolean"
            );
    }

    /**
     * Checks if given object is really instance of FindManyOptions interface.
     */
    static isFindManyOptions(obj: any): obj is FindManyOptions<any> {
        const possibleOptions: FindManyOptions<any> = obj;
        return possibleOptions && (
            this.isFindOneOptions(possibleOptions) ||
            typeof (possibleOptions as FindManyOptions<any>).skip === "number" ||
            typeof (possibleOptions as FindManyOptions<any>).take === "number" ||
            typeof (possibleOptions as FindManyOptions<any>).skip === "string" ||
            typeof (possibleOptions as FindManyOptions<any>).take === "string"
        );
    }

    /**
     * Checks if given object is really instance of FindOptions interface.
     */
    static extractFindManyOptionsAlias(object: any): string | undefined {
        if (this.isFindManyOptions(object) && object.join)
            return object.join.alias;

        return undefined;
    }

    /**
     * Applies give find many options to the given query builder.
     */
    static applyFindManyOptionsOrConditionsToQueryBuilder<T>(qb: SelectQueryBuilder<T>, options: FindManyOptions<T> | Partial<T> | undefined): SelectQueryBuilder<T> {
        if (this.isFindManyOptions(options)) {
            return this.applyOptionsToQueryBuilder(qb, options);
        }
        if (options) {
            return qb.where(options);
        }
        return qb;
    }

    /**
     * Applies give find options to the given query builder.
     */
    static applyOptionsToQueryBuilder<T>(qb: SelectQueryBuilder<T>, options: FindOneOptions<T> | FindManyOptions<T> | undefined): SelectQueryBuilder<T> {
        // if options are not set then simply return query builder. This is made for simplicity of usage.
        if (!options || (!this.isFindOneOptions(options) && !this.isFindManyOptions(options)))
            return qb;
        if (!qb.expressionMap.mainAlias || !qb.expressionMap.mainAlias.hasMetadata)
            return qb;
        const metadata = qb.expressionMap.mainAlias!.metadata;
        // apply all options from FindOptions
        if (options.select) {
            qb.select([]);
            options.select!.forEach(select => {
                if (!metadata.findColumnWithPropertyPath(String(select)))
                    throw new Error(`${select} column was not found in the ${metadata.name} entity.`);
                qb.addSelect(qb.alias + "." + select);
            });
        }

        if (options.where)
            qb.where(options.where);
        if ((options as FindManyOptions<T>).skip)
            qb.skip((options as FindManyOptions<T>).skip!);

        if ((options as FindManyOptions<T>).take)
            qb.take((options as FindManyOptions<T>).take!);

        if (options.order)
            Object.keys(options.order).forEach(key => {
                const order = ((options as FindOneOptions<T>).order as any)[key as any];
                if (!metadata.findColumnWithPropertyPath(key))
                    throw new Error(`${key} column was not found in the ${metadata.name} entity.`);
                switch (order) {
                    case 1:
                        qb.addOrderBy(qb.alias + "." + key, "ASC");
                        break;
                    case -1:
                        qb.addOrderBy(qb.alias + "." + key, "DESC");
                        break;
                    case "ASC":
                        qb.addOrderBy(qb.alias + "." + key, "ASC");
                        break;
                    case "DESC":
                        qb.addOrderBy(qb.alias + "." + key, "DESC");
                        break;
                }
            });
        if (options.relations) {
            const allRelations = options.relations.map(relation => relation);
            this.applyRelationsRecursively(qb, allRelations, qb.expressionMap.mainAlias!.name, qb.expressionMap.mainAlias!.metadata, "");
            if (allRelations.length > 0) {
                throw new FindRelationsNotFoundError(allRelations);
            }
        }
        if (options.join) {
            if (options.join.leftJoin)
                Object.keys(options.join.leftJoin).forEach(key => {
                    qb.leftJoin(options.join!.leftJoin![key], key);
                });
            if (options.join.innerJoin)
                Object.keys(options.join.innerJoin).forEach(key => {
                    qb.innerJoin(options.join!.innerJoin![key], key);
                });
            if (options.join.leftJoinAndSelect)
                Object.keys(options.join.leftJoinAndSelect).forEach(key => {
                    qb.leftJoinAndSelect(options.join!.leftJoinAndSelect![key], key);
                });
            if (options.join.innerJoinAndSelect) {
                Object.keys(options.join.innerJoinAndSelect).forEach(key => {
                    qb.innerJoinAndSelect(options.join!.innerJoinAndSelect![key], key);
                });
            }
        }
        if (options.cache) {
            if (options.cache instanceof Object) {
                const cache = options.cache as { id: any, milliseconds: number };
                qb.cache(cache.id, cache.milliseconds);
            } else {
                qb.cache(options.cache);
            }
        }
        if (options.lock) {
            if (options.lock.mode === "optimistic") {
                qb.setLock(options.lock.mode, options.lock.version as any);
            } else if (options.lock.mode === "pessimistic_read" || options.lock.mode === "pessimistic_write" || options.lock.mode === "dirty_read") {
                qb.setLock(options.lock.mode);
            }
        }
        if (options.loadRelationIds === true) {
            qb.loadAllRelationIds();
        } else if (options.loadRelationIds instanceof Object) {
            qb.loadAllRelationIds(options.loadRelationIds as any);
        }
        return qb;
    }

    // -------------------------------------------------------------------------
    // Protected Static Methods
    // -------------------------------------------------------------------------

    /**
     * Adds joins for all relations and sub-relations of the given relations provided in the find options.
     */
    protected static applyRelationsRecursively(qb: SelectQueryBuilder<any>, allRelations: any[], alias: string, metadata: EntityMetadata, prefix: string): void {
        // find all relations that match given prefix
        let matchedBaseRelations: string[] = [];
        if (prefix) {
            const regexp = new RegExp("^" + prefix.replace(".", "\\.") + "\\.");
            matchedBaseRelations = allRelations
                .filter(relation => relation.match(regexp))
                .map(relation => relation.replace(regexp, ""))
                .filter(relation => metadata.findRelationWithPropertyPath(relation));
        } else {
            matchedBaseRelations = allRelations.filter(relation => metadata.findRelationWithPropertyPath(relation));
        }

        // go through all matched relations and add join for them
        matchedBaseRelations.forEach(relation => {

            // generate a relation alias
            let relationAlias: string = alias + "__" + relation;
            // shorten it if needed by the driver
            if (qb.connection.driver.maxAliasLength && relationAlias.length > qb.connection.driver.maxAliasLength) {
                relationAlias = shorten(relationAlias);
            }

            // add a join for the found relation
            const selection = alias + "." + relation;
            qb.leftJoinAndSelect(selection, relationAlias);

            // join the eager relations of the found relation
            const relMetadata = metadata.relations.find(metadata => metadata.propertyName === relation);
            if (relMetadata) {
                this.joinEagerRelations(qb, relationAlias, relMetadata.inverseEntityMetadata);
            }

            // remove added relations from the allRelations array, this is needed to find all not found relations at the end
            allRelations.splice(allRelations.indexOf(prefix ? prefix + "." + relation : relation), 1);

            // try to find sub-relations
            const join = qb.expressionMap.joinAttributes.find(join => join.entityOrProperty === selection);
            this.applyRelationsRecursively(qb, allRelations, join!.alias.name, join!.metadata!, prefix ? prefix + "." + relation : relation);
        });
    }

    public static joinEagerRelations(qb: SelectQueryBuilder<any>, alias: string, metadata: EntityMetadata) {
        metadata.eagerRelations.forEach(relation => {
            const relationAlias = qb.connection.namingStrategy.eagerJoinRelationAlias(alias, relation.propertyPath);
            qb.leftJoinAndSelect(alias + "." + relation.propertyPath, relationAlias);
            this.joinEagerRelations(qb, relationAlias, relation.inverseEntityMetadata);
        });
    }

}
