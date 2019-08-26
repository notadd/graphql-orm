"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EntityManager_1 = require("./EntityManager");
const DocumentToEntityTransformer_1 = require("../query-builder/transformer/DocumentToEntityTransformer");
const FindOptionsUtils_1 = require("../find-options/FindOptionsUtils");
const PlatformTools_1 = require("../platform/PlatformTools");
const InsertResult_1 = require("../query-builder/result/InsertResult");
const UpdateResult_1 = require("../query-builder/result/UpdateResult");
const DeleteResult_1 = require("../query-builder/result/DeleteResult");
const BroadcasterResult_1 = require("../subscriber/BroadcasterResult");
/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 *
 * This implementation is used for MongoDB driver which has some specifics in its EntityManager.
 */
class MongoEntityManager extends EntityManager_1.EntityManager {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        super(connection);
    }
    // -------------------------------------------------------------------------
    // Overridden Properties
    // -------------------------------------------------------------------------
    /**
     * Gets query runner used to execute queries.
     */
    get queryRunner() {
        return this.connection.driver.queryRunner;
    }
    // -------------------------------------------------------------------------
    // Overridden Methods
    // -------------------------------------------------------------------------
    /**
     * Finds entities that match given find options or conditions.
     */
    async find(entityClassOrName, optionsOrConditions) {
        const query = this.convertFindManyOptionsOrConditionsToMongodbQuery(optionsOrConditions);
        const cursor = await this.createEntityCursor(entityClassOrName, query);
        if (FindOptionsUtils_1.FindOptionsUtils.isFindManyOptions(optionsOrConditions)) {
            if (optionsOrConditions.select)
                cursor.project(this.convertFindOptionsSelectToProjectCriteria(optionsOrConditions.select));
            if (optionsOrConditions.skip)
                cursor.skip(optionsOrConditions.skip);
            if (optionsOrConditions.take)
                cursor.limit(optionsOrConditions.take);
            if (optionsOrConditions.order)
                cursor.sort(this.convertFindOptionsOrderToOrderCriteria(optionsOrConditions.order));
        }
        return cursor.toArray();
    }
    /**
     * Finds entities that match given find options or conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    async findAndCount(entityClassOrName, optionsOrConditions) {
        const query = this.convertFindManyOptionsOrConditionsToMongodbQuery(optionsOrConditions);
        const cursor = await this.createEntityCursor(entityClassOrName, query);
        if (FindOptionsUtils_1.FindOptionsUtils.isFindManyOptions(optionsOrConditions)) {
            if (optionsOrConditions.select)
                cursor.project(this.convertFindOptionsSelectToProjectCriteria(optionsOrConditions.select));
            if (optionsOrConditions.skip)
                cursor.skip(optionsOrConditions.skip);
            if (optionsOrConditions.take)
                cursor.limit(optionsOrConditions.take);
            if (optionsOrConditions.order)
                cursor.sort(this.convertFindOptionsOrderToOrderCriteria(optionsOrConditions.order));
        }
        const [results, count] = await Promise.all([
            cursor.toArray(),
            this.count(entityClassOrName, query),
        ]);
        return [results, parseInt(count)];
    }
    /**
     * Finds entities by ids.
     * Optionally find options can be applied.
     */
    async findByIds(entityClassOrName, ids, optionsOrConditions) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        const query = this.convertFindManyOptionsOrConditionsToMongodbQuery(optionsOrConditions) || {};
        const objectIdInstance = PlatformTools_1.PlatformTools.load("mongodb").ObjectID;
        query["_id"] = {
            $in: ids.map(id => {
                if (id instanceof objectIdInstance)
                    return id;
                return id[metadata.objectIdColumn.propertyName];
            })
        };
        const cursor = await this.createEntityCursor(entityClassOrName, query);
        if (FindOptionsUtils_1.FindOptionsUtils.isFindManyOptions(optionsOrConditions)) {
            if (optionsOrConditions.select)
                cursor.project(this.convertFindOptionsSelectToProjectCriteria(optionsOrConditions.select));
            if (optionsOrConditions.skip)
                cursor.skip(optionsOrConditions.skip);
            if (optionsOrConditions.take)
                cursor.limit(optionsOrConditions.take);
            if (optionsOrConditions.order)
                cursor.sort(this.convertFindOptionsOrderToOrderCriteria(optionsOrConditions.order));
        }
        return await cursor.toArray();
    }
    /**
     * Finds first entity that matches given conditions and/or find options.
     */
    async findOne(entityClassOrName, optionsOrConditions, maybeOptions) {
        const objectIdInstance = PlatformTools_1.PlatformTools.load("mongodb").ObjectID;
        const id = (optionsOrConditions instanceof objectIdInstance) || typeof optionsOrConditions === "string" ? optionsOrConditions : undefined;
        const findOneOptionsOrConditions = (id ? maybeOptions : optionsOrConditions);
        const query = this.convertFindOneOptionsOrConditionsToMongodbQuery(findOneOptionsOrConditions) || {};
        if (id) {
            query["_id"] = (id instanceof objectIdInstance) ? id : new objectIdInstance(id);
        }
        const cursor = await this.createEntityCursor(entityClassOrName, query);
        if (FindOptionsUtils_1.FindOptionsUtils.isFindOneOptions(findOneOptionsOrConditions)) {
            if (findOneOptionsOrConditions.select)
                cursor.project(this.convertFindOptionsSelectToProjectCriteria(findOneOptionsOrConditions.select));
            if (findOneOptionsOrConditions.order)
                cursor.sort(this.convertFindOptionsOrderToOrderCriteria(findOneOptionsOrConditions.order));
        }
        // const result = await cursor.limit(1).next();
        const result = await cursor.limit(1).toArray();
        return result.length > 0 ? result[0] : undefined;
    }
    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     * You can execute bulk inserts using this method.
     */
    async insert(target, entity) {
        // todo: convert entity to its database name
        const result = new InsertResult_1.InsertResult();
        if (entity instanceof Array) {
            result.raw = await this.insertMany(target, entity);
            Object.keys(result.raw.insertedIds).forEach((key) => {
                let insertedId = result.raw.insertedIds[key];
                result.generatedMaps.push(this.connection.driver.createGeneratedMap(this.connection.getMetadata(target), insertedId));
                result.identifiers.push(this.connection.driver.createGeneratedMap(this.connection.getMetadata(target), insertedId));
            });
        }
        else {
            result.raw = await this.insertOne(target, entity);
            result.generatedMaps.push(this.connection.driver.createGeneratedMap(this.connection.getMetadata(target), result.raw.insertedId));
            result.identifiers.push(this.connection.driver.createGeneratedMap(this.connection.getMetadata(target), result.raw.insertedId));
        }
        return result;
    }
    /**
     * Updates entity partially. Entity can be found by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     */
    async update(target, criteria, partialEntity) {
        if (criteria instanceof Array) {
            await Promise.all(criteria.map(criteriaItem => {
                return this.update(target, criteriaItem, partialEntity);
            }));
        }
        else {
            const metadata = this.connection.getMetadata(target);
            await this.updateOne(target, this.convertMixedCriteria(metadata, criteria), { $set: partialEntity });
        }
        return new UpdateResult_1.UpdateResult();
    }
    /**
     * Deletes entities by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     */
    async delete(target, criteria) {
        if (criteria instanceof Array) {
            await Promise.all(criteria.map(criteriaItem => {
                return this.delete(target, criteriaItem);
            }));
        }
        else {
            await this.deleteOne(target, this.convertMixedCriteria(this.connection.getMetadata(target), criteria));
        }
        return new DeleteResult_1.DeleteResult();
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     */
    createCursor(entityClassOrName, query) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.cursor(metadata.tableName, query);
    }
    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     * This returns modified version of cursor that transforms each result into Entity model.
     */
    createEntityCursor(entityClassOrName, query) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        const cursor = this.createCursor(entityClassOrName, query);
        this.applyEntityTransformationToCursor(metadata, cursor);
        return cursor;
    }
    /**
     * Execute an aggregation framework pipeline against the collection.
     */
    aggregate(entityClassOrName, pipeline, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.aggregate(metadata.tableName, pipeline, options);
    }
    /**
     * Execute an aggregation framework pipeline against the collection.
     * This returns modified version of cursor that transforms each result into Entity model.
     */
    aggregateEntity(entityClassOrName, pipeline, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        const cursor = this.queryRunner.aggregate(metadata.tableName, pipeline, options);
        this.applyEntityTransformationToCursor(metadata, cursor);
        return cursor;
    }
    /**
     * Perform a bulkWrite operation without a fluent API.
     */
    bulkWrite(entityClassOrName, operations, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.bulkWrite(metadata.tableName, operations, options);
    }
    /**
     * Count number of matching documents in the db to a query.
     */
    count(entityClassOrName, query, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.count(metadata.tableName, query, options);
    }
    /**
     * Creates an index on the db and collection.
     */
    createCollectionIndex(entityClassOrName, fieldOrSpec, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.createCollectionIndex(metadata.tableName, fieldOrSpec, options);
    }
    /**
     * Creates multiple indexes in the collection, this method is only supported for MongoDB 2.6 or higher.
     * Earlier version of MongoDB will throw a command not supported error.
     * Index specifications are defined at http://docs.mongodb.org/manual/reference/command/createIndexes/.
     */
    createCollectionIndexes(entityClassOrName, indexSpecs) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.createCollectionIndexes(metadata.tableName, indexSpecs);
    }
    /**
     * Delete multiple documents on MongoDB.
     */
    deleteMany(entityClassOrName, query, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.deleteMany(metadata.tableName, query, options);
    }
    /**
     * Delete a document on MongoDB.
     */
    deleteOne(entityClassOrName, query, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.deleteOne(metadata.tableName, query, options);
    }
    /**
     * The distinct command returns returns a list of distinct values for the given key across a collection.
     */
    distinct(entityClassOrName, key, query, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.distinct(metadata.tableName, key, query, options);
    }
    /**
     * Drops an index from this collection.
     */
    dropCollectionIndex(entityClassOrName, indexName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.dropCollectionIndex(metadata.tableName, indexName, options);
    }
    /**
     * Drops all indexes from the collection.
     */
    dropCollectionIndexes(entityClassOrName) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.dropCollectionIndexes(metadata.tableName);
    }
    /**
     * Find a document and delete it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndDelete(entityClassOrName, query, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.findOneAndDelete(metadata.tableName, query, options);
    }
    /**
     * Find a document and replace it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndReplace(entityClassOrName, query, replacement, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.findOneAndReplace(metadata.tableName, query, replacement, options);
    }
    /**
     * Find a document and update it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndUpdate(entityClassOrName, query, update, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.findOneAndUpdate(metadata.tableName, query, update, options);
    }
    /**
     * Execute a geo search using a geo haystack index on a collection.
     */
    geoHaystackSearch(entityClassOrName, x, y, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.geoHaystackSearch(metadata.tableName, x, y, options);
    }
    /**
     * Execute the geoNear command to search for items in the collection.
     */
    geoNear(entityClassOrName, x, y, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.geoNear(metadata.tableName, x, y, options);
    }
    /**
     * Run a group command across a collection.
     */
    group(entityClassOrName, keys, condition, initial, reduce, finalize, command, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.group(metadata.tableName, keys, condition, initial, reduce, finalize, command, options);
    }
    /**
     * Retrieve all the indexes on the collection.
     */
    collectionIndexes(entityClassOrName) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.collectionIndexes(metadata.tableName);
    }
    /**
     * Retrieve all the indexes on the collection.
     */
    collectionIndexExists(entityClassOrName, indexes) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.collectionIndexExists(metadata.tableName, indexes);
    }
    /**
     * Retrieves this collections index info.
     */
    collectionIndexInformation(entityClassOrName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.collectionIndexInformation(metadata.tableName, options);
    }
    /**
     * Initiate an In order bulk write operation, operations will be serially executed in the order they are added, creating a new operation for each switch in types.
     */
    initializeOrderedBulkOp(entityClassOrName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.initializeOrderedBulkOp(metadata.tableName, options);
    }
    /**
     * Initiate a Out of order batch write operation. All operations will be buffered into insert/update/remove commands executed out of order.
     */
    initializeUnorderedBulkOp(entityClassOrName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.initializeUnorderedBulkOp(metadata.tableName, options);
    }
    /**
     * Inserts an array of documents into MongoDB.
     */
    insertMany(entityClassOrName, docs, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.insertMany(metadata.tableName, docs, options);
    }
    /**
     * Inserts a single document into MongoDB.
     */
    insertOne(entityClassOrName, doc, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.insertOne(metadata.tableName, doc, options);
    }
    /**
     * Returns if the collection is a capped collection.
     */
    isCapped(entityClassOrName) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.isCapped(metadata.tableName);
    }
    /**
     * Get the list of all indexes information for the collection.
     */
    listCollectionIndexes(entityClassOrName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.listCollectionIndexes(metadata.tableName, options);
    }
    /**
     * Run Map Reduce across a collection. Be aware that the inline option for out will return an array of results not a collection.
     */
    mapReduce(entityClassOrName, map, reduce, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.mapReduce(metadata.tableName, map, reduce, options);
    }
    /**
     * Return N number of parallel cursors for a collection allowing parallel reading of entire collection.
     * There are no ordering guarantees for returned results.
     */
    parallelCollectionScan(entityClassOrName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.parallelCollectionScan(metadata.tableName, options);
    }
    /**
     * Reindex all indexes on the collection Warning: reIndex is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
     */
    reIndex(entityClassOrName) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.reIndex(metadata.tableName);
    }
    /**
     * Reindex all indexes on the collection Warning: reIndex is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
     */
    rename(entityClassOrName, newName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.rename(metadata.tableName, newName, options);
    }
    /**
     * Replace a document on MongoDB.
     */
    replaceOne(entityClassOrName, query, doc, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.replaceOne(metadata.tableName, query, doc, options);
    }
    /**
     * Get all the collection statistics.
     */
    stats(entityClassOrName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.stats(metadata.tableName, options);
    }
    watch(entityClassOrName, pipeline, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.watch(metadata.tableName, pipeline, options);
    }
    /**
     * Update multiple documents on MongoDB.
     */
    updateMany(entityClassOrName, query, update, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.updateMany(metadata.tableName, query, update, options);
    }
    /**
     * Update a single document on MongoDB.
     */
    updateOne(entityClassOrName, query, update, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.queryRunner.updateOne(metadata.tableName, query, update, options);
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Converts FindManyOptions to mongodb query.
     */
    convertFindManyOptionsOrConditionsToMongodbQuery(optionsOrConditions) {
        if (!optionsOrConditions)
            return undefined;
        if (FindOptionsUtils_1.FindOptionsUtils.isFindManyOptions(optionsOrConditions))
            // If where condition is passed as a string which contains sql we have to ignore
            // as mongo is not a sql database
            return typeof optionsOrConditions.where === "string"
                ? {}
                : optionsOrConditions.where;
        return optionsOrConditions;
    }
    /**
     * Converts FindOneOptions to mongodb query.
     */
    convertFindOneOptionsOrConditionsToMongodbQuery(optionsOrConditions) {
        if (!optionsOrConditions)
            return undefined;
        if (FindOptionsUtils_1.FindOptionsUtils.isFindOneOptions(optionsOrConditions)) {
            return typeof optionsOrConditions.where === "string"
                ? {}
                : optionsOrConditions.where;
        }
        return optionsOrConditions;
    }
    /**
     * Converts FindOptions into mongodb order by criteria.
     */
    convertFindOptionsOrderToOrderCriteria(order) {
        return Object.keys(order).reduce((orderCriteria, key) => {
            switch (order[key]) {
                case "DESC":
                    orderCriteria[key] = -1;
                    break;
                case "ASC":
                    orderCriteria[key] = 1;
                    break;
                default:
                    orderCriteria[key] = order[key];
            }
            return orderCriteria;
        }, {});
    }
    /**
     * Converts FindOptions into mongodb select by criteria.
     */
    convertFindOptionsSelectToProjectCriteria(selects) {
        return selects.reduce((projectCriteria, key) => {
            projectCriteria[key.name] = 1;
            return projectCriteria;
        }, {});
    }
    /**
     * Ensures given id is an id for query.
     */
    convertMixedCriteria(metadata, idMap) {
        if (idMap instanceof Object) {
            return metadata.columns.reduce((query, column) => {
                const columnValue = column.getEntityValue(idMap);
                if (columnValue !== undefined)
                    query[column.databasePath] = columnValue;
                return query;
            }, {});
        }
        // means idMap is just object id
        const objectIdInstance = PlatformTools_1.PlatformTools.load("mongodb").ObjectID;
        return {
            "_id": (idMap instanceof objectIdInstance) ? idMap : new objectIdInstance(idMap)
        };
    }
    /**
     * Overrides cursor's toArray and next methods to convert results to entity automatically.
     */
    applyEntityTransformationToCursor(metadata, cursor) {
        const ParentCursor = PlatformTools_1.PlatformTools.load("mongodb").Cursor;
        const queryRunner = this.queryRunner;
        cursor.toArray = function (callback) {
            if (callback) {
                ParentCursor.prototype.toArray.call(this, (error, results) => {
                    if (error) {
                        callback(error, results);
                        return;
                    }
                    const transformer = new DocumentToEntityTransformer_1.DocumentToEntityTransformer();
                    const entities = transformer.transformAll(results, metadata);
                    // broadcast "load" events
                    const broadcastResult = new BroadcasterResult_1.BroadcasterResult();
                    queryRunner.broadcaster.broadcastLoadEventsForAll(broadcastResult, metadata, entities);
                    Promise.all(broadcastResult.promises).then(() => callback(error, entities));
                });
            }
            else {
                return ParentCursor.prototype.toArray.call(this).then((results) => {
                    const transformer = new DocumentToEntityTransformer_1.DocumentToEntityTransformer();
                    const entities = transformer.transformAll(results, metadata);
                    // broadcast "load" events
                    const broadcastResult = new BroadcasterResult_1.BroadcasterResult();
                    queryRunner.broadcaster.broadcastLoadEventsForAll(broadcastResult, metadata, entities);
                    return Promise.all(broadcastResult.promises).then(() => entities);
                });
            }
        };
        cursor.next = function (callback) {
            if (callback) {
                ParentCursor.prototype.next.call(this, (error, result) => {
                    if (error || !result) {
                        callback(error, result);
                        return;
                    }
                    const transformer = new DocumentToEntityTransformer_1.DocumentToEntityTransformer();
                    const entity = transformer.transform(result, metadata);
                    // broadcast "load" events
                    const broadcastResult = new BroadcasterResult_1.BroadcasterResult();
                    queryRunner.broadcaster.broadcastLoadEventsForAll(broadcastResult, metadata, [entity]);
                    Promise.all(broadcastResult.promises).then(() => callback(error, entity));
                });
            }
            else {
                return ParentCursor.prototype.next.call(this).then((result) => {
                    if (!result)
                        return result;
                    const transformer = new DocumentToEntityTransformer_1.DocumentToEntityTransformer();
                    const entity = transformer.transform(result, metadata);
                    // broadcast "load" events
                    const broadcastResult = new BroadcasterResult_1.BroadcasterResult();
                    queryRunner.broadcaster.broadcastLoadEventsForAll(broadcastResult, metadata, [entity]);
                    return Promise.all(broadcastResult.promises).then(() => entity);
                });
            }
        };
    }
}
exports.MongoEntityManager = MongoEntityManager;
