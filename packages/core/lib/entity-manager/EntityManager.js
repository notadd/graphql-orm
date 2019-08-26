"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EntityNotFoundError_1 = require("../error/EntityNotFoundError");
const QueryRunnerProviderAlreadyReleasedError_1 = require("../error/QueryRunnerProviderAlreadyReleasedError");
const NoNeedToReleaseEntityManagerError_1 = require("../error/NoNeedToReleaseEntityManagerError");
const TreeRepository_1 = require("../repository/TreeRepository");
const Repository_1 = require("../repository/Repository");
const FindOptionsUtils_1 = require("../find-options/FindOptionsUtils");
const PlainObjectToNewEntityTransformer_1 = require("../query-builder/transformer/PlainObjectToNewEntityTransformer");
const PlainObjectToDatabaseEntityTransformer_1 = require("../query-builder/transformer/PlainObjectToDatabaseEntityTransformer");
const CustomRepositoryNotFoundError_1 = require("../error/CustomRepositoryNotFoundError");
const index_1 = require("../index");
const AbstractRepository_1 = require("../repository/AbstractRepository");
const CustomRepositoryCannotInheritRepositoryError_1 = require("../error/CustomRepositoryCannotInheritRepositoryError");
const MongoDriver_1 = require("../driver/mongodb/MongoDriver");
const RepositoryNotFoundError_1 = require("../error/RepositoryNotFoundError");
const RepositoryNotTreeError_1 = require("../error/RepositoryNotTreeError");
const RepositoryFactory_1 = require("../repository/RepositoryFactory");
const TreeRepositoryNotSupportedError_1 = require("../error/TreeRepositoryNotSupportedError");
const EntityPersistExecutor_1 = require("../persistence/EntityPersistExecutor");
const OracleDriver_1 = require("../driver/oracle/OracleDriver");
const ObjectUtils_1 = require("../util/ObjectUtils");
/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 */
class EntityManager {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection, queryRunner) {
        // -------------------------------------------------------------------------
        // Protected Properties
        // -------------------------------------------------------------------------
        /**
         * Once created and then reused by en repositories.
         */
        this.repositories = [];
        /**
         * Plain to object transformer used in create and merge operations.
         */
        this.plainObjectToEntityTransformer = new PlainObjectToNewEntityTransformer_1.PlainObjectToNewEntityTransformer();
        this.connection = connection;
        if (queryRunner) {
            this.queryRunner = queryRunner;
            // dynamic: this.queryRunner = manager;
            ObjectUtils_1.ObjectUtils.assign(this.queryRunner, { manager: this });
        }
    }
    /**
     * Wraps given function execution (and all operations made there) in a transaction.
     * All database operations must be executed using provided entity manager.
     */
    async transaction(isolationOrRunInTransaction, runInTransactionParam) {
        const isolation = typeof isolationOrRunInTransaction === "string" ? isolationOrRunInTransaction : undefined;
        const runInTransaction = typeof isolationOrRunInTransaction === "function" ? isolationOrRunInTransaction : runInTransactionParam;
        if (!runInTransaction) {
            throw new Error(`Transaction method requires callback in second paramter if isolation level is supplied.`);
        }
        if (this.connection.driver instanceof MongoDriver_1.MongoDriver)
            throw new Error(`Transactions aren't supported by MongoDB.`);
        if (this.queryRunner && this.queryRunner.isReleased)
            throw new QueryRunnerProviderAlreadyReleasedError_1.QueryRunnerProviderAlreadyReleasedError();
        if (this.queryRunner && this.queryRunner.isTransactionActive)
            throw new Error(`Cannot start transaction because its already started`);
        // if query runner is already defined in this class, it means this entity manager was already created for a single connection
        // if its not defined we create a new query runner - single connection where we'll execute all our operations
        const queryRunner = this.queryRunner || this.connection.createQueryRunner("master");
        try {
            if (isolation) {
                await queryRunner.startTransaction(isolation);
            }
            else {
                await queryRunner.startTransaction();
            }
            const result = await runInTransaction(queryRunner.manager);
            await queryRunner.commitTransaction();
            return result;
        }
        catch (err) {
            try { // we throw original error even if rollback thrown an error
                await queryRunner.rollbackTransaction();
            }
            catch (rollbackError) { }
            throw err;
        }
        finally {
            if (!this.queryRunner) // if we used a new query runner provider then release it
                await queryRunner.release();
        }
    }
    /**
     * Executes raw SQL query and returns raw database results.
     */
    async query(query, parameters) {
        return this.connection.query(query, parameters, this.queryRunner);
    }
    /**
     * Creates a new query builder that can be used to build a sql query.
     */
    createQueryBuilder(entityClass, alias, queryRunner) {
        if (alias) {
            return this.connection.createQueryBuilder(entityClass, alias, queryRunner || this.queryRunner);
        }
        else {
            return this.connection.createQueryBuilder(entityClass || queryRunner || this.queryRunner);
        }
    }
    /**
     * Checks if entity has an id by its Function type or schema name.
     */
    hasId(targetOrEntity, maybeEntity) {
        const target = arguments.length === 2 ? targetOrEntity : targetOrEntity.constructor;
        const entity = arguments.length === 2 ? maybeEntity : targetOrEntity;
        const metadata = this.connection.getMetadata(target);
        return metadata.hasId(entity);
    }
    /**
     * Gets entity mixed id.
     */
    getId(targetOrEntity, maybeEntity) {
        const target = arguments.length === 2 ? targetOrEntity : targetOrEntity.constructor;
        const entity = arguments.length === 2 ? maybeEntity : targetOrEntity;
        const metadata = this.connection.getMetadata(target);
        return metadata.getEntityIdMixedMap(entity);
    }
    /**
     * Creates a new entity instance or instances.
     * Can copy properties from the given object into new entities.
     */
    create(entityClass, plainObjectOrObjects) {
        const metadata = this.connection.getMetadata(entityClass);
        if (!plainObjectOrObjects)
            return metadata.create(this.queryRunner);
        if (plainObjectOrObjects instanceof Array)
            return plainObjectOrObjects.map(plainEntityLike => this.create(entityClass, plainEntityLike));
        const mergeIntoEntity = metadata.create(this.queryRunner);
        this.plainObjectToEntityTransformer.transform(mergeIntoEntity, plainObjectOrObjects, metadata, true);
        return mergeIntoEntity;
    }
    /**
     * Merges two entities into one new entity.
     */
    merge(entityClass, mergeIntoEntity, ...entityLikes) {
        const metadata = this.connection.getMetadata(entityClass);
        entityLikes.forEach(object => this.plainObjectToEntityTransformer.transform(mergeIntoEntity, object, metadata));
        return mergeIntoEntity;
    }
    /**
     * Creates a new entity from the given plan javascript object. If entity already exist in the database, then
     * it loads it (and everything related to it), replaces all values with the new ones from the given object
     * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
     * replaced from the new object.
     */
    async preload(entityClass, entityLike) {
        const metadata = this.connection.getMetadata(entityClass);
        const plainObjectToDatabaseEntityTransformer = new PlainObjectToDatabaseEntityTransformer_1.PlainObjectToDatabaseEntityTransformer(this.connection.manager);
        const transformedEntity = await plainObjectToDatabaseEntityTransformer.transform(entityLike, metadata);
        if (transformedEntity)
            return this.merge(entityClass, transformedEntity, entityLike);
        return undefined;
    }
    /**
     * Saves a given entity in the database.
     */
    save(targetOrEntity, maybeEntityOrOptions, maybeOptions) {
        // normalize mixed parameters
        let target = (arguments.length > 1 && (targetOrEntity instanceof Function || targetOrEntity instanceof index_1.EntitySchema || typeof targetOrEntity === "string")) ? targetOrEntity : undefined;
        const entity = target ? maybeEntityOrOptions : targetOrEntity;
        const options = target ? maybeOptions : maybeEntityOrOptions;
        if (target instanceof index_1.EntitySchema)
            target = target.options.name;
        // if user passed empty array of entities then we don't need to do anything
        if (entity instanceof Array && entity.length === 0)
            return Promise.resolve(entity);
        // execute save operation
        return new EntityPersistExecutor_1.EntityPersistExecutor(this.connection, this.queryRunner, "save", target, entity, options)
            .execute()
            .then(() => entity);
    }
    /**
     * Removes a given entity from the database.
     */
    remove(targetOrEntity, maybeEntityOrOptions, maybeOptions) {
        // normalize mixed parameters
        const target = (arguments.length > 1 && (targetOrEntity instanceof Function || typeof targetOrEntity === "string")) ? targetOrEntity : undefined;
        const entity = target ? maybeEntityOrOptions : targetOrEntity;
        const options = target ? maybeOptions : maybeEntityOrOptions;
        // if user passed empty array of entities then we don't need to do anything
        if (entity instanceof Array && entity.length === 0)
            return Promise.resolve(entity);
        // execute save operation
        return new EntityPersistExecutor_1.EntityPersistExecutor(this.connection, this.queryRunner, "remove", target, entity, options)
            .execute()
            .then(() => entity);
    }
    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     * You can execute bulk inserts using this method.
     */
    async insert(target, entity) {
        // TODO: Oracle does not support multiple values. Need to create another nice solution.
        if (this.connection.driver instanceof OracleDriver_1.OracleDriver && entity instanceof Array) {
            const results = await Promise.all(entity.map(entity => this.insert(target, entity)));
            return results.reduce((mergedResult, result) => Object.assign(mergedResult, result), {});
        }
        return this.createQueryBuilder()
            .insert()
            .into(target)
            .values(entity)
            .execute();
    }
    /**
     * Updates entity partially. Entity can be found by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    update(target, criteria, partialEntity) {
        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (criteria instanceof Array && criteria.length === 0)) {
            return Promise.reject(new Error(`Empty criteria(s) are not allowed for the update method.`));
        }
        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            criteria instanceof Array) {
            return this.createQueryBuilder()
                .update(target)
                .set(partialEntity)
                .whereInIds(criteria)
                .execute();
        }
        else {
            return this.createQueryBuilder()
                .update(target)
                .set(partialEntity)
                .where(criteria)
                .execute();
        }
    }
    /**
     * Deletes entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    delete(targetOrEntity, criteria) {
        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (criteria instanceof Array && criteria.length === 0)) {
            return Promise.reject(new Error(`Empty criteria(s) are not allowed for the delete method.`));
        }
        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            criteria instanceof Array) {
            return this.createQueryBuilder()
                .delete()
                .from(targetOrEntity)
                .whereInIds(criteria)
                .execute();
        }
        else {
            return this.createQueryBuilder()
                .delete()
                .from(targetOrEntity)
                .where(criteria)
                .execute();
        }
    }
    /**
     * Counts entities that match given find options or conditions.
     * Useful for pagination.
     */
    async count(entityClass, optionsOrConditions) {
        const metadata = this.connection.getMetadata(entityClass);
        const qb = this.createQueryBuilder(entityClass, FindOptionsUtils_1.FindOptionsUtils.extractFindManyOptionsAlias(optionsOrConditions) || metadata.name);
        return FindOptionsUtils_1.FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions).getCount();
    }
    /**
     * Finds entities that match given find options or conditions.
     */
    async find(entityClass, optionsOrConditions) {
        const metadata = this.connection.getMetadata(entityClass);
        const qb = this.createQueryBuilder(entityClass, FindOptionsUtils_1.FindOptionsUtils.extractFindManyOptionsAlias(optionsOrConditions) || metadata.name);
        if (!FindOptionsUtils_1.FindOptionsUtils.isFindManyOptions(optionsOrConditions) || optionsOrConditions.loadEagerRelations !== false)
            FindOptionsUtils_1.FindOptionsUtils.joinEagerRelations(qb, qb.alias, metadata);
        const db = FindOptionsUtils_1.FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions);
        console.log(db.getSql());
        return db.getMany();
    }
    /**
     * Finds entities that match given find options and conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    async findAndCount(entityClass, optionsOrConditions) {
        const metadata = this.connection.getMetadata(entityClass);
        const qb = this.createQueryBuilder(entityClass, FindOptionsUtils_1.FindOptionsUtils.extractFindManyOptionsAlias(optionsOrConditions) || metadata.name);
        if (!FindOptionsUtils_1.FindOptionsUtils.isFindManyOptions(optionsOrConditions) || optionsOrConditions.loadEagerRelations !== false) {
            FindOptionsUtils_1.FindOptionsUtils.joinEagerRelations(qb, qb.alias, metadata);
        }
        const item = FindOptionsUtils_1.FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions);
        return item.getManyAndCount();
    }
    /**
     * Finds entities with ids.
     * Optionally find options or conditions can be applied.
     */
    async findByIds(entityClass, ids, optionsOrConditions) {
        // if no ids passed, no need to execute a query - just return an empty array of values
        if (!ids.length)
            return Promise.resolve([]);
        const metadata = this.connection.getMetadata(entityClass);
        const qb = this.createQueryBuilder(entityClass, FindOptionsUtils_1.FindOptionsUtils.extractFindManyOptionsAlias(optionsOrConditions) || metadata.name);
        FindOptionsUtils_1.FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions);
        if (!FindOptionsUtils_1.FindOptionsUtils.isFindManyOptions(optionsOrConditions) || optionsOrConditions.loadEagerRelations !== false)
            FindOptionsUtils_1.FindOptionsUtils.joinEagerRelations(qb, qb.alias, metadata);
        return qb.andWhereInIds(ids).getMany();
    }
    /**
     * Finds first entity that matches given conditions.
     */
    async findOne(entityClass, idOrOptionsOrConditions, maybeOptions) {
        let findOptions = undefined;
        if (FindOptionsUtils_1.FindOptionsUtils.isFindOneOptions(idOrOptionsOrConditions)) {
            findOptions = idOrOptionsOrConditions;
        }
        else if (maybeOptions && FindOptionsUtils_1.FindOptionsUtils.isFindOneOptions(maybeOptions)) {
            findOptions = maybeOptions;
        }
        let options = undefined;
        if (idOrOptionsOrConditions instanceof Object && !FindOptionsUtils_1.FindOptionsUtils.isFindOneOptions(idOrOptionsOrConditions))
            options = idOrOptionsOrConditions;
        const metadata = this.connection.getMetadata(entityClass);
        let alias = metadata.name;
        if (findOptions && findOptions.join) {
            alias = findOptions.join.alias;
        }
        else if (maybeOptions && FindOptionsUtils_1.FindOptionsUtils.isFindOneOptions(maybeOptions) && maybeOptions.join) {
            alias = maybeOptions.join.alias;
        }
        const qb = this.createQueryBuilder(entityClass, alias);
        if (!findOptions || findOptions.loadEagerRelations !== false)
            FindOptionsUtils_1.FindOptionsUtils.joinEagerRelations(qb, qb.alias, qb.expressionMap.mainAlias.metadata);
        findOptions = {
            ...(findOptions || {}),
            take: 1,
        };
        FindOptionsUtils_1.FindOptionsUtils.applyOptionsToQueryBuilder(qb, findOptions);
        if (options) {
            qb.where(options);
        }
        else if (typeof idOrOptionsOrConditions === "string" || typeof idOrOptionsOrConditions === "number" || idOrOptionsOrConditions instanceof Date) {
            qb.andWhereInIds(metadata.ensureEntityIdMap(idOrOptionsOrConditions));
        }
        return qb.getOne();
    }
    /**
     * Finds first entity that matches given conditions or rejects the returned promise on error.
     */
    async findOneOrFail(entityClass, idOrOptionsOrConditions, maybeOptions) {
        return this.findOne(entityClass, idOrOptionsOrConditions, maybeOptions).then((value) => {
            if (value === undefined) {
                return Promise.reject(new EntityNotFoundError_1.EntityNotFoundError(entityClass, idOrOptionsOrConditions));
            }
            return Promise.resolve(value);
        });
    }
    /**
     * Clears all the data from the given table (truncates/drops it).
     *
     * Note: this method uses TRUNCATE and may not work as you expect in transactions on some platforms.
     * @see https://stackoverflow.com/a/5972738/925151
     */
    async clear(entityClass) {
        const metadata = this.connection.getMetadata(entityClass);
        const queryRunner = this.queryRunner || this.connection.createQueryRunner("master");
        try {
            return await queryRunner.clearTable(metadata.tablePath); // await is needed here because we are using finally
        }
        finally {
            if (!this.queryRunner)
                await queryRunner.release();
        }
    }
    /**
     * Increments some column by provided value of the entities matched given conditions.
     */
    async increment(entityClass, conditions, propertyPath, value) {
        const metadata = this.connection.getMetadata(entityClass);
        const column = metadata.findColumnWithPropertyPath(propertyPath);
        if (!column)
            throw new Error(`Column ${propertyPath} was not found in ${metadata.targetName} entity.`);
        if (isNaN(Number(value)))
            throw new Error(`Value "${value}" is not a number.`);
        // convert possible embeded path "social.likes" into object { social: { like: () => value } }
        const values = propertyPath
            .split(".")
            .reduceRight((value, key) => ({ [key]: value }), () => this.connection.driver.escape(column.databaseName) + " + " + value);
        return this
            .createQueryBuilder(entityClass, "entity")
            .update(entityClass)
            .set(values)
            .where(conditions)
            .execute();
    }
    /**
     * Decrements some column by provided value of the entities matched given conditions.
     */
    async decrement(entityClass, conditions, propertyPath, value) {
        const metadata = this.connection.getMetadata(entityClass);
        const column = metadata.findColumnWithPropertyPath(propertyPath);
        if (!column)
            throw new Error(`Column ${propertyPath} was not found in ${metadata.targetName} entity.`);
        if (isNaN(Number(value)))
            throw new Error(`Value "${value}" is not a number.`);
        // convert possible embeded path "social.likes" into object { social: { like: () => value } }
        const values = propertyPath
            .split(".")
            .reduceRight((value, key) => ({ [key]: value }), () => this.connection.driver.escape(column.databaseName) + " - " + value);
        return this
            .createQueryBuilder(entityClass, "entity")
            .update(entityClass)
            .set(values)
            .where(conditions)
            .execute();
    }
    /**
     * Gets repository for the given entity class or name.
     * If single database connection mode is used, then repository is obtained from the
     * repository aggregator, where each repository is individually created for this entity manager.
     * When single database connection is not used, repository is being obtained from the connection.
     */
    getRepository(target) {
        // throw exception if there is no repository with this target registered
        if (!this.connection.hasMetadata(target))
            throw new RepositoryNotFoundError_1.RepositoryNotFoundError(this.connection.name, target);
        // find already created repository instance and return it if found
        const metadata = this.connection.getMetadata(target);
        const repository = this.repositories.find(repository => repository.metadata === metadata);
        if (repository)
            return repository;
        // if repository was not found then create it, store its instance and return it
        const newRepository = new RepositoryFactory_1.RepositoryFactory().create(this, metadata, this.queryRunner);
        this.repositories.push(newRepository);
        return newRepository;
    }
    /**
     * Gets tree repository for the given entity class or name.
     * If single database connection mode is used, then repository is obtained from the
     * repository aggregator, where each repository is individually created for this entity manager.
     * When single database connection is not used, repository is being obtained from the connection.
     */
    getTreeRepository(target) {
        // tree tables aren't supported by some drivers (mongodb)
        if (this.connection.driver.treeSupport === false)
            throw new TreeRepositoryNotSupportedError_1.TreeRepositoryNotSupportedError(this.connection.driver);
        // check if repository is real tree repository
        const repository = this.getRepository(target);
        if (!(repository instanceof TreeRepository_1.TreeRepository))
            throw new RepositoryNotTreeError_1.RepositoryNotTreeError(target);
        return repository;
    }
    /**
     * Gets mongodb repository for the given entity class.
     */
    getMongoRepository(target) {
        return this.connection.getMongoRepository(target);
    }
    /**
     * Gets custom entity repository marked with @EntityRepository decorator.
     */
    getCustomRepository(customRepository) {
        const entityRepositoryMetadataArgs = index_1.getMetadataArgsStorage().entityRepositories.find(repository => {
            return repository.target === (customRepository instanceof Function ? customRepository : customRepository.constructor);
        });
        if (!entityRepositoryMetadataArgs)
            throw new CustomRepositoryNotFoundError_1.CustomRepositoryNotFoundError(customRepository);
        const entityMetadata = entityRepositoryMetadataArgs.entity ? this.connection.getMetadata(entityRepositoryMetadataArgs.entity) : undefined;
        const entityRepositoryInstance = new entityRepositoryMetadataArgs.target(this, entityMetadata);
        // NOTE: dynamic access to protected properties. We need this to prevent unwanted properties in those classes to be exposed,
        // however we need these properties for internal work of the class
        if (entityRepositoryInstance instanceof AbstractRepository_1.AbstractRepository) {
            if (!entityRepositoryInstance["manager"])
                entityRepositoryInstance["manager"] = this;
        }
        if (entityRepositoryInstance instanceof Repository_1.Repository) {
            if (!entityMetadata)
                throw new CustomRepositoryCannotInheritRepositoryError_1.CustomRepositoryCannotInheritRepositoryError(customRepository);
            entityRepositoryInstance["manager"] = this;
            entityRepositoryInstance["metadata"] = entityMetadata;
        }
        return entityRepositoryInstance;
    }
    /**
     * Releases all resources used by entity manager.
     * This is used when entity manager is created with a single query runner,
     * and this single query runner needs to be released after job with entity manager is done.
     */
    async release() {
        if (!this.queryRunner)
            throw new NoNeedToReleaseEntityManagerError_1.NoNeedToReleaseEntityManagerError();
        return this.queryRunner.release();
    }
}
exports.EntityManager = EntityManager;
//# sourceMappingURL=EntityManager.js.map