"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RawSqlResultsToEntityTransformer_1 = require("./transformer/RawSqlResultsToEntityTransformer");
const SqlServerDriver_1 = require("../driver/sqlserver/SqlServerDriver");
const PessimisticLockTransactionRequiredError_1 = require("../error/PessimisticLockTransactionRequiredError");
const NoVersionOrUpdateDateColumnError_1 = require("../error/NoVersionOrUpdateDateColumnError");
const OptimisticLockVersionMismatchError_1 = require("../error/OptimisticLockVersionMismatchError");
const OptimisticLockCanNotBeUsedError_1 = require("../error/OptimisticLockCanNotBeUsedError");
const JoinAttribute_1 = require("./JoinAttribute");
const RelationIdAttribute_1 = require("./relation-id/RelationIdAttribute");
const RelationCountAttribute_1 = require("./relation-count/RelationCountAttribute");
const RelationIdLoader_1 = require("./relation-id/RelationIdLoader");
const RelationIdMetadataToAttributeTransformer_1 = require("./relation-id/RelationIdMetadataToAttributeTransformer");
const RelationCountLoader_1 = require("./relation-count/RelationCountLoader");
const RelationCountMetadataToAttributeTransformer_1 = require("./relation-count/RelationCountMetadataToAttributeTransformer");
const QueryBuilder_1 = require("./QueryBuilder");
const LockNotSupportedOnGivenDriverError_1 = require("../error/LockNotSupportedOnGivenDriverError");
const MysqlDriver_1 = require("../driver/mysql/MysqlDriver");
const PostgresDriver_1 = require("../driver/postgres/PostgresDriver");
const OracleDriver_1 = require("../driver/oracle/OracleDriver");
const AbstractSqliteDriver_1 = require("../driver/sqlite-abstract/AbstractSqliteDriver");
const OffsetWithoutLimitNotSupportedError_1 = require("../error/OffsetWithoutLimitNotSupportedError");
const BroadcasterResult_1 = require("../subscriber/BroadcasterResult");
const ObjectUtils_1 = require("../util/ObjectUtils");
const DriverUtils_1 = require("../driver/DriverUtils");
/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
class SelectQueryBuilder extends QueryBuilder_1.QueryBuilder {
    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------
    /**
     * Gets generated sql query without parameters being replaced.
     */
    getQuery() {
        let sql = this.createSelectExpression();
        sql += this.createJoinExpression();
        sql += this.createWhereExpression();
        sql += this.createGroupByExpression();
        sql += this.createHavingExpression();
        sql += this.createOrderByExpression();
        sql += this.createLimitOffsetExpression();
        sql += this.createLockExpression();
        sql = sql.trim();
        if (this.expressionMap.subQuery)
            sql = "(" + sql + ")";
        return sql;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a subquery - query that can be used inside other queries.
     */
    subQuery() {
        const qb = this.createQueryBuilder();
        qb.expressionMap.subQuery = true;
        qb.expressionMap.parentQueryBuilder = this;
        return qb;
    }
    /**
     * Creates SELECT query and selects given data.
     * Replaces all previous selections if they exist.
     */
    select(selection, selectionAliasName) {
        this.expressionMap.queryType = "select";
        if (selection instanceof Array) {
            this.expressionMap.selects = selection.map(selection => ({ selection: selection }));
        }
        else if (selection instanceof Function) {
            const subQueryBuilder = selection(this.subQuery());
            this.setParameters(subQueryBuilder.getParameters());
            this.expressionMap.selects.push({ selection: subQueryBuilder.getQuery(), aliasName: selectionAliasName });
        }
        else if (selection) {
            this.expressionMap.selects = [{ selection: selection, aliasName: selectionAliasName }];
        }
        return this;
    }
    /**
     * Adds new selection to the SELECT query.
     */
    addSelect(selection, selectionAliasName) {
        if (!selection)
            return this;
        if (selection instanceof Array) {
            this.expressionMap.selects = this.expressionMap.selects.concat(selection.map(selection => ({ selection: selection })));
        }
        else if (selection instanceof Function) {
            const subQueryBuilder = selection(this.subQuery());
            this.setParameters(subQueryBuilder.getParameters());
            this.expressionMap.selects.push({ selection: subQueryBuilder.getQuery(), aliasName: selectionAliasName });
        }
        else if (selection) {
            this.expressionMap.selects.push({ selection: selection, aliasName: selectionAliasName });
        }
        return this;
    }
    /**
     * Sets whether the selection is DISTINCT.
     */
    distinct(distinct = true) {
        this.expressionMap.selectDistinct = distinct;
        return this;
    }
    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     * Removes all previously set from-s.
     */
    from(entityTarget, aliasName) {
        const mainAlias = this.createFromAlias(entityTarget, aliasName);
        this.expressionMap.setMainAlias(mainAlias);
        return this;
    }
    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    addFrom(entityTarget, aliasName) {
        const alias = this.createFromAlias(entityTarget, aliasName);
        if (!this.expressionMap.mainAlias)
            this.expressionMap.setMainAlias(alias);
        return this;
    }
    /**
     * INNER JOINs (without selection).
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoin(entityOrProperty, alias, condition = "", parameters) {
        this.join("INNER", entityOrProperty, alias, condition, parameters);
        return this;
    }
    /**
     * LEFT JOINs (without selection).
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoin(entityOrProperty, alias, condition = "", parameters) {
        this.join("LEFT", entityOrProperty, alias, condition, parameters);
        return this;
    }
    /**
     * INNER JOINs and adds all selection properties to SELECT.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndSelect(entityOrProperty, alias, condition = "", parameters) {
        this.addSelect(alias);
        this.innerJoin(entityOrProperty, alias, condition, parameters);
        return this;
    }
    /**
     * LEFT JOINs and adds all selection properties to SELECT.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndSelect(entityOrProperty, alias, condition = "", parameters) {
        this.addSelect(alias);
        this.leftJoin(entityOrProperty, alias, condition, parameters);
        return this;
    }
    /**
     * INNER JOINs, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapMany(mapToProperty, entityOrProperty, alias, condition = "", parameters) {
        this.addSelect(alias);
        this.join("INNER", entityOrProperty, alias, condition, parameters, mapToProperty, true);
        return this;
    }
    /**
     * INNER JOINs, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapOne(mapToProperty, entityOrProperty, alias, condition = "", parameters) {
        this.addSelect(alias);
        this.join("INNER", entityOrProperty, alias, condition, parameters, mapToProperty, false);
        return this;
    }
    /**
     * LEFT JOINs, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapMany(mapToProperty, entityOrProperty, alias, condition = "", parameters) {
        this.addSelect(alias);
        this.join("LEFT", entityOrProperty, alias, condition, parameters, mapToProperty, true);
        return this;
    }
    /**
     * LEFT JOINs, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapOne(mapToProperty, entityOrProperty, alias, condition = "", parameters) {
        this.addSelect(alias);
        this.join("LEFT", entityOrProperty, alias, condition, parameters, mapToProperty, false);
        return this;
    }
    /**
     * LEFT JOINs relation id and maps it into some entity's property.
     * Optionally, you can add condition and parameters used in condition.
     */
    loadRelationIdAndMap(mapToProperty, relationName, aliasNameOrOptions, queryBuilderFactory) {
        const relationIdAttribute = new RelationIdAttribute_1.RelationIdAttribute(this.expressionMap);
        relationIdAttribute.mapToProperty = mapToProperty;
        relationIdAttribute.relationName = relationName;
        if (typeof aliasNameOrOptions === "string")
            relationIdAttribute.alias = aliasNameOrOptions;
        if (aliasNameOrOptions instanceof Object && aliasNameOrOptions.disableMixedMap)
            relationIdAttribute.disableMixedMap = true;
        relationIdAttribute.queryBuilderFactory = queryBuilderFactory;
        this.expressionMap.relationIdAttributes.push(relationIdAttribute);
        if (relationIdAttribute.relation.junctionEntityMetadata) {
            this.expressionMap.createAlias({
                type: "other",
                name: relationIdAttribute.junctionAlias,
                metadata: relationIdAttribute.relation.junctionEntityMetadata
            });
        }
        return this;
    }
    /**
     * Counts number of entities of entity's relation and maps the value into some entity's property.
     * Optionally, you can add condition and parameters used in condition.
     */
    loadRelationCountAndMap(mapToProperty, relationName, aliasName, queryBuilderFactory) {
        const relationCountAttribute = new RelationCountAttribute_1.RelationCountAttribute(this.expressionMap);
        relationCountAttribute.mapToProperty = mapToProperty;
        relationCountAttribute.relationName = relationName;
        relationCountAttribute.alias = aliasName;
        relationCountAttribute.queryBuilderFactory = queryBuilderFactory;
        this.expressionMap.relationCountAttributes.push(relationCountAttribute);
        this.expressionMap.createAlias({
            type: "other",
            name: relationCountAttribute.junctionAlias
        });
        if (relationCountAttribute.relation.junctionEntityMetadata) {
            this.expressionMap.createAlias({
                type: "other",
                name: relationCountAttribute.junctionAlias,
                metadata: relationCountAttribute.relation.junctionEntityMetadata
            });
        }
        return this;
    }
    /**
     * Loads all relation ids for all relations of the selected entity.
     * All relation ids will be mapped to relation property themself.
     * If array of strings is given then loads only relation ids of the given properties.
     */
    loadAllRelationIds(options) {
        this.expressionMap.mainAlias.metadata.relations.forEach(relation => {
            if (options !== undefined && options.relations !== undefined && options.relations.indexOf(relation.propertyPath) === -1)
                return;
            this.loadRelationIdAndMap(this.expressionMap.mainAlias.name + "." + relation.propertyPath, this.expressionMap.mainAlias.name + "." + relation.propertyPath, options);
        });
        return this;
    }
    /**
     * Sets WHERE condition in the query builder.
     * If you had previously WHERE expression defined,
     * calling this function will override previously set WHERE conditions.
     * Additionally you can add parameters used in where expression.
     */
    where(where, parameters) {
        this.expressionMap.wheres = []; // don't move this block below since computeWhereParameter can add where expressions
        const condition = this.computeWhereParameter(where);
        if (condition)
            this.expressionMap.wheres = [{ type: "simple", condition: condition }];
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Adds new AND WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    andWhere(where, parameters) {
        this.expressionMap.wheres.push({ type: "and", condition: this.computeWhereParameter(where) });
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Adds new OR WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    orWhere(where, parameters) {
        this.expressionMap.wheres.push({ type: "or", condition: this.computeWhereParameter(where) });
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Adds new AND WHERE with conditions for the given ids.
     *
     * Ids are mixed.
     * It means if you have single primary key you can pass a simple id values, for example [1, 2, 3].
     * If you have multiple primary keys you need to pass object with property names and values specified,
     * for example [{ firstId: 1, secondId: 2 }, { firstId: 2, secondId: 3 }, ...]
     */
    whereInIds(ids) {
        return this.where(this.createWhereIdsExpression(ids));
    }
    /**
     * Adds new AND WHERE with conditions for the given ids.
     *
     * Ids are mixed.
     * It means if you have single primary key you can pass a simple id values, for example [1, 2, 3].
     * If you have multiple primary keys you need to pass object with property names and values specified,
     * for example [{ firstId: 1, secondId: 2 }, { firstId: 2, secondId: 3 }, ...]
     */
    andWhereInIds(ids) {
        return this.andWhere(this.createWhereIdsExpression(ids));
    }
    /**
     * Adds new OR WHERE with conditions for the given ids.
     *
     * Ids are mixed.
     * It means if you have single primary key you can pass a simple id values, for example [1, 2, 3].
     * If you have multiple primary keys you need to pass object with property names and values specified,
     * for example [{ firstId: 1, secondId: 2 }, { firstId: 2, secondId: 3 }, ...]
     */
    orWhereInIds(ids) {
        return this.orWhere(this.createWhereIdsExpression(ids));
    }
    /**
     * Sets HAVING condition in the query builder.
     * If you had previously HAVING expression defined,
     * calling this function will override previously set HAVING conditions.
     * Additionally you can add parameters used in where expression.
     */
    having(having, parameters) {
        this.expressionMap.havings.push({ type: "simple", condition: having });
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Adds new AND HAVING condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    andHaving(having, parameters) {
        this.expressionMap.havings.push({ type: "and", condition: having });
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Adds new OR HAVING condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    orHaving(having, parameters) {
        this.expressionMap.havings.push({ type: "or", condition: having });
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Sets GROUP BY condition in the query builder.
     * If you had previously GROUP BY expression defined,
     * calling this function will override previously set GROUP BY conditions.
     */
    groupBy(groupBy) {
        if (groupBy) {
            this.expressionMap.groupBys = [groupBy];
        }
        else {
            this.expressionMap.groupBys = [];
        }
        return this;
    }
    /**
     * Adds GROUP BY condition in the query builder.
     */
    addGroupBy(groupBy) {
        this.expressionMap.groupBys.push(groupBy);
        return this;
    }
    /**
     * Sets ORDER BY condition in the query builder.
     * If you had previously ORDER BY expression defined,
     * calling this function will override previously set ORDER BY conditions.
     */
    orderBy(sort, order = "ASC", nulls) {
        if (order !== undefined && order !== "ASC" && order !== "DESC")
            throw new Error(`SelectQueryBuilder.addOrderBy "order" can accept only "ASC" and "DESC" values.`);
        if (nulls !== undefined && nulls !== "NULLS FIRST" && nulls !== "NULLS LAST")
            throw new Error(`SelectQueryBuilder.addOrderBy "nulls" can accept only "NULLS FIRST" and "NULLS LAST" values.`);
        if (sort) {
            if (sort instanceof Object) {
                this.expressionMap.orderBys = sort;
            }
            else {
                if (nulls) {
                    this.expressionMap.orderBys = { [sort]: { order, nulls } };
                }
                else {
                    this.expressionMap.orderBys = { [sort]: order };
                }
            }
        }
        else {
            this.expressionMap.orderBys = {};
        }
        return this;
    }
    /**
     * Adds ORDER BY condition in the query builder.
     */
    addOrderBy(sort, order = "ASC", nulls) {
        if (order !== undefined && order !== "ASC" && order !== "DESC")
            throw new Error(`SelectQueryBuilder.addOrderBy "order" can accept only "ASC" and "DESC" values.`);
        if (nulls !== undefined && nulls !== "NULLS FIRST" && nulls !== "NULLS LAST")
            throw new Error(`SelectQueryBuilder.addOrderBy "nulls" can accept only "NULLS FIRST" and "NULLS LAST" values.`);
        if (nulls) {
            this.expressionMap.orderBys[sort] = { order, nulls };
        }
        else {
            this.expressionMap.orderBys[sort] = order;
        }
        return this;
    }
    /**
     * Set's LIMIT - maximum number of rows to be selected.
     * NOTE that it may not work as you expect if you are using joins.
     * If you want to implement pagination, and you are having join in your query,
     * then use instead take method instead.
     */
    limit(limit) {
        this.expressionMap.limit = this.normalizeNumber(limit);
        if (this.expressionMap.limit !== undefined && isNaN(this.expressionMap.limit))
            throw new Error(`Provided "limit" value is not a number. Please provide a numeric value.`);
        return this;
    }
    /**
     * Set's OFFSET - selection offset.
     * NOTE that it may not work as you expect if you are using joins.
     * If you want to implement pagination, and you are having join in your query,
     * then use instead skip method instead.
     */
    offset(offset) {
        this.expressionMap.offset = this.normalizeNumber(offset);
        if (this.expressionMap.offset !== undefined && isNaN(this.expressionMap.offset))
            throw new Error(`Provided "offset" value is not a number. Please provide a numeric value.`);
        return this;
    }
    /**
     * Sets maximal number of entities to take.
     */
    take(take) {
        this.expressionMap.take = this.normalizeNumber(take);
        if (this.expressionMap.take !== undefined && isNaN(this.expressionMap.take))
            throw new Error(`Provided "take" value is not a number. Please provide a numeric value.`);
        return this;
    }
    /**
     * Sets number of entities to skip.
     */
    skip(skip) {
        this.expressionMap.skip = this.normalizeNumber(skip);
        if (this.expressionMap.skip !== undefined && isNaN(this.expressionMap.skip))
            throw new Error(`Provided "skip" value is not a number. Please provide a numeric value.`);
        return this;
    }
    /**
     * Sets locking mode.
     */
    setLock(lockMode, lockVersion) {
        this.expressionMap.lockMode = lockMode;
        this.expressionMap.lockVersion = lockVersion;
        return this;
    }
    /**
     * Gets first raw result returned by execution of generated query builder sql.
     */
    async getRawOne() {
        return (await this.getRawMany())[0];
    }
    /**
     * Gets all raw results returned by execution of generated query builder sql.
     */
    async getRawMany() {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError_1.OptimisticLockCanNotBeUsedError();
        this.expressionMap.queryEntity = false;
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs = false;
        try {
            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            const results = await this.loadRawResults(queryRunner);
            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
            }
            return results;
        }
        catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw error;
        }
        finally {
            if (queryRunner !== this.queryRunner) { // means we created our own query runner
                await queryRunner.release();
            }
        }
    }
    /**
     * Executes sql generated by query builder and returns object with raw results and entities created from them.
     */
    async getRawAndEntities() {
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs = false;
        try {
            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            this.expressionMap.queryEntity = true;
            const results = await this.executeEntitiesAndRawResults(queryRunner);
            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
            }
            return results;
        }
        catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw error;
        }
        finally {
            if (queryRunner !== this.queryRunner) // means we created our own query runner
                await queryRunner.release();
        }
    }
    /**
     * Gets single entity returned by execution of generated query builder sql.
     */
    async getOne() {
        const results = await this.getRawAndEntities();
        const result = results.entities[0];
        if (result && this.expressionMap.lockMode === "optimistic" && this.expressionMap.lockVersion) {
            const metadata = this.expressionMap.mainAlias.metadata;
            if (this.expressionMap.lockVersion instanceof Date) {
                const actualVersion = metadata.updateDateColumn.getEntityValue(result); // what if columns arent set?
                if (actualVersion.getTime() !== this.expressionMap.lockVersion.getTime())
                    throw new OptimisticLockVersionMismatchError_1.OptimisticLockVersionMismatchError(metadata.name, this.expressionMap.lockVersion, actualVersion);
            }
            else {
                const actualVersion = metadata.versionColumn.getEntityValue(result); // what if columns arent set?
                if (actualVersion !== this.expressionMap.lockVersion)
                    throw new OptimisticLockVersionMismatchError_1.OptimisticLockVersionMismatchError(metadata.name, this.expressionMap.lockVersion, actualVersion);
            }
        }
        return result;
    }
    /**
     * Gets entities returned by execution of generated query builder sql.
     */
    async getMany() {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError_1.OptimisticLockCanNotBeUsedError();
        const results = await this.getRawAndEntities();
        return results.entities;
    }
    /**
     * Gets count - number of entities selected by sql generated by this query builder.
     * Count excludes all limitations set by setFirstResult and setMaxResults methods call.
     */
    async getCount() {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError_1.OptimisticLockCanNotBeUsedError();
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs = false;
        try {
            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            this.expressionMap.queryEntity = false;
            const results = await this.executeCountQuery(queryRunner);
            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
            }
            return results;
        }
        catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw error;
        }
        finally {
            if (queryRunner !== this.queryRunner) // means we created our own query runner
                await queryRunner.release();
        }
    }
    /**
     * Executes built SQL query and returns entities and overall entities count (without limitation).
     * This method is useful to build pagination.
     */
    async getManyAndCount() {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError_1.OptimisticLockCanNotBeUsedError();
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs = false;
        try {
            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            this.expressionMap.queryEntity = true;
            const entitiesAndRaw = await this.executeEntitiesAndRawResults(queryRunner);
            this.expressionMap.queryEntity = false;
            const count = await this.executeCountQuery(queryRunner);
            const results = [entitiesAndRaw.entities, count];
            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
            }
            return results;
        }
        catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw error;
        }
        finally {
            if (queryRunner !== this.queryRunner) // means we created our own query runner
                await queryRunner.release();
        }
    }
    /**
     * Executes built SQL query and returns raw data stream.
     */
    async stream() {
        this.expressionMap.queryEntity = false;
        const [sql, parameters] = this.getQueryAndParameters();
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs = false;
        try {
            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            const releaseFn = () => {
                if (queryRunner !== this.queryRunner) // means we created our own query runner
                    return queryRunner.release();
                return;
            };
            const results = queryRunner.stream(sql, parameters, releaseFn, releaseFn);
            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
            }
            return results;
        }
        catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw error;
        }
        finally {
            if (queryRunner !== this.queryRunner) // means we created our own query runner
                await queryRunner.release();
        }
    }
    /**
     * Enables or disables query result caching.
     */
    cache(enabledOrMillisecondsOrId, maybeMilliseconds) {
        if (typeof enabledOrMillisecondsOrId === "boolean") {
            this.expressionMap.cache = enabledOrMillisecondsOrId;
        }
        else if (typeof enabledOrMillisecondsOrId === "number") {
            this.expressionMap.cache = true;
            this.expressionMap.cacheDuration = enabledOrMillisecondsOrId;
        }
        else if (typeof enabledOrMillisecondsOrId === "string" || typeof enabledOrMillisecondsOrId === "number") {
            this.expressionMap.cache = true;
            this.expressionMap.cacheId = enabledOrMillisecondsOrId;
        }
        if (maybeMilliseconds) {
            this.expressionMap.cacheDuration = maybeMilliseconds;
        }
        return this;
    }
    /**
     * Sets extra options that can be used to configure how query builder works.
     */
    setOption(option) {
        this.expressionMap.options.push(option);
        return this;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    join(direction, entityOrProperty, aliasName, condition, parameters, mapToProperty, isMappingMany) {
        this.setParameters(parameters || {});
        const joinAttribute = new JoinAttribute_1.JoinAttribute(this.connection, this.expressionMap);
        joinAttribute.direction = direction;
        joinAttribute.mapToProperty = mapToProperty;
        joinAttribute.isMappingMany = isMappingMany;
        joinAttribute.entityOrProperty = entityOrProperty; // relationName
        joinAttribute.condition = condition; // joinInverseSideCondition
        // joinAttribute.junctionAlias = joinAttribute.relation.isOwning ? parentAlias + "_" + destinationTableAlias : destinationTableAlias + "_" + parentAlias;
        this.expressionMap.joinAttributes.push(joinAttribute);
        if (joinAttribute.metadata) {
            // todo: find and set metadata right there?
            joinAttribute.alias = this.expressionMap.createAlias({
                type: "join",
                name: aliasName,
                metadata: joinAttribute.metadata
            });
            if (joinAttribute.relation && joinAttribute.relation.junctionEntityMetadata) {
                this.expressionMap.createAlias({
                    type: "join",
                    name: joinAttribute.junctionAlias,
                    metadata: joinAttribute.relation.junctionEntityMetadata
                });
            }
        }
        else {
            let subQuery = "";
            if (entityOrProperty instanceof Function) {
                const subQueryBuilder = entityOrProperty(this.subQuery());
                this.setParameters(subQueryBuilder.getParameters());
                subQuery = subQueryBuilder.getQuery();
            }
            else {
                subQuery = entityOrProperty;
            }
            const isSubQuery = entityOrProperty instanceof Function || entityOrProperty.substr(0, 1) === "(" && entityOrProperty.substr(-1) === ")";
            joinAttribute.alias = this.expressionMap.createAlias({
                type: "join",
                name: aliasName,
                tablePath: isSubQuery === false ? entityOrProperty : undefined,
                subQuery: isSubQuery === true ? subQuery : undefined,
            });
        }
    }
    /**
     * Creates "SELECT FROM" part of SQL query.
     */
    createSelectExpression() {
        if (!this.expressionMap.mainAlias)
            throw new Error("Cannot build query because main alias is not set (call qb#from method)");
        // todo throw exception if selects or from is missing
        const allSelects = [];
        const excludedSelects = [];
        if (this.expressionMap.mainAlias.hasMetadata) {
            const metadata = this.expressionMap.mainAlias.metadata;
            allSelects.push(...this.buildEscapedEntityColumnSelects(this.expressionMap.mainAlias.name, metadata));
            excludedSelects.push(...this.findEntityColumnSelects(this.expressionMap.mainAlias.name, metadata));
        }
        // add selects from joins
        this.expressionMap.joinAttributes
            .forEach(join => {
            if (join.metadata) {
                allSelects.push(...this.buildEscapedEntityColumnSelects(join.alias.name, join.metadata));
                excludedSelects.push(...this.findEntityColumnSelects(join.alias.name, join.metadata));
            }
            else {
                const hasMainAlias = this.expressionMap.selects.some(select => select.selection === join.alias.name);
                if (hasMainAlias) {
                    allSelects.push({ selection: this.escape(join.alias.name) + ".*" });
                    const excludedSelect = this.expressionMap.selects.find(select => select.selection === join.alias.name);
                    excludedSelects.push(excludedSelect);
                }
            }
        });
        // add all other selects
        this.expressionMap.selects
            .filter(select => excludedSelects.indexOf(select) === -1)
            .forEach(select => allSelects.push({ selection: this.replacePropertyNames(select.selection), aliasName: select.aliasName }));
        // if still selection is empty, then simply set it to all (*)
        if (allSelects.length === 0)
            allSelects.push({ selection: "*" });
        let lock = "";
        if (this.connection.driver instanceof SqlServerDriver_1.SqlServerDriver) {
            switch (this.expressionMap.lockMode) {
                case "pessimistic_read":
                    lock = " WITH (HOLDLOCK, ROWLOCK)";
                    break;
                case "pessimistic_write":
                    lock = " WITH (UPDLOCK, ROWLOCK)";
                    break;
                case "dirty_read":
                    lock = " WITH (NOLOCK)";
                    break;
            }
        }
        // create a selection query
        const froms = this.expressionMap.aliases
            .filter(alias => alias.type === "from" && (alias.tablePath || alias.subQuery))
            .map(alias => {
            if (alias.subQuery)
                return alias.subQuery + " " + this.escape(alias.name);
            return this.getTableName(alias.tablePath) + " " + this.escape(alias.name);
        });
        const select = "SELECT " + (this.expressionMap.selectDistinct ? "DISTINCT " : "");
        const selection = allSelects.map(select => select.selection + (select.aliasName ? " AS " + this.escape(select.aliasName) : "")).join(", ");
        return select + selection + " FROM " + froms.join(", ") + lock;
    }
    /**
     * Creates "JOIN" part of SQL query.
     */
    createJoinExpression() {
        // examples:
        // select from owning side
        // qb.select("post")
        //     .leftJoinAndSelect("post.category", "category");
        // select from non-owning side
        // qb.select("category")
        //     .leftJoinAndSelect("category.post", "post");
        const joins = this.expressionMap.joinAttributes.map(joinAttr => {
            const relation = joinAttr.relation;
            const destinationTableName = joinAttr.tablePath;
            const destinationTableAlias = joinAttr.alias.name;
            const appendedCondition = joinAttr.condition ? " AND (" + joinAttr.condition + ")" : "";
            const parentAlias = joinAttr.parentAlias;
            // if join was build without relation (e.g. without "post.category") then it means that we have direct
            // table to join, without junction table involved. This means we simply join direct table.
            if (!parentAlias || !relation) {
                const destinationJoin = joinAttr.alias.subQuery ? joinAttr.alias.subQuery : this.getTableName(destinationTableName);
                return " " + joinAttr.direction + " JOIN " + destinationJoin + " " + this.escape(destinationTableAlias) +
                    (joinAttr.condition ? " ON " + this.replacePropertyNames(joinAttr.condition) : "");
            }
            // if real entity relation is involved
            if (relation.isManyToOne || relation.isOneToOneOwner) {
                // JOIN `category` `category` ON `category`.`id` = `post`.`categoryId`
                const condition = relation.joinColumns.map(joinColumn => {
                    return destinationTableAlias + "." + joinColumn.referencedColumn.propertyPath + "=" +
                        parentAlias + "." + relation.propertyPath + "." + joinColumn.referencedColumn.propertyPath;
                }).join(" AND ");
                return " " + joinAttr.direction + " JOIN " + this.getTableName(destinationTableName) + " " + this.escape(destinationTableAlias) + " ON " + this.replacePropertyNames(condition + appendedCondition);
            }
            else if (relation.isOneToMany || relation.isOneToOneNotOwner) {
                // JOIN `post` `post` ON `post`.`categoryId` = `category`.`id`
                const condition = relation.inverseRelation.joinColumns.map(joinColumn => {
                    return destinationTableAlias + "." + relation.inverseRelation.propertyPath + "." + joinColumn.referencedColumn.propertyPath + "=" +
                        parentAlias + "." + joinColumn.referencedColumn.propertyPath;
                }).join(" AND ");
                return " " + joinAttr.direction + " JOIN " + this.getTableName(destinationTableName) + " " + this.escape(destinationTableAlias) + " ON " + this.replacePropertyNames(condition + appendedCondition);
            }
            else { // means many-to-many
                const junctionTableName = relation.junctionEntityMetadata.tablePath;
                const junctionAlias = joinAttr.junctionAlias;
                let junctionCondition = "", destinationCondition = "";
                if (relation.isOwning) {
                    junctionCondition = relation.joinColumns.map(joinColumn => {
                        // `post_category`.`postId` = `post`.`id`
                        return junctionAlias + "." + joinColumn.propertyPath + "=" + parentAlias + "." + joinColumn.referencedColumn.propertyPath;
                    }).join(" AND ");
                    destinationCondition = relation.inverseJoinColumns.map(joinColumn => {
                        // `category`.`id` = `post_category`.`categoryId`
                        return destinationTableAlias + "." + joinColumn.referencedColumn.propertyPath + "=" + junctionAlias + "." + joinColumn.propertyPath;
                    }).join(" AND ");
                }
                else {
                    junctionCondition = relation.inverseRelation.inverseJoinColumns.map(joinColumn => {
                        // `post_category`.`categoryId` = `category`.`id`
                        return junctionAlias + "." + joinColumn.propertyPath + "=" + parentAlias + "." + joinColumn.referencedColumn.propertyPath;
                    }).join(" AND ");
                    destinationCondition = relation.inverseRelation.joinColumns.map(joinColumn => {
                        // `post`.`id` = `post_category`.`postId`
                        return destinationTableAlias + "." + joinColumn.referencedColumn.propertyPath + "=" + junctionAlias + "." + joinColumn.propertyPath;
                    }).join(" AND ");
                }
                return " " + joinAttr.direction + " JOIN " + this.getTableName(junctionTableName) + " " + this.escape(junctionAlias) + " ON " + this.replacePropertyNames(junctionCondition) +
                    " " + joinAttr.direction + " JOIN " + this.getTableName(destinationTableName) + " " + this.escape(destinationTableAlias) + " ON " + this.replacePropertyNames(destinationCondition + appendedCondition);
            }
        });
        return joins.join(" ");
    }
    /**
     * Creates "GROUP BY" part of SQL query.
     */
    createGroupByExpression() {
        if (!this.expressionMap.groupBys || !this.expressionMap.groupBys.length)
            return "";
        return " GROUP BY " + this.replacePropertyNames(this.expressionMap.groupBys.join(", "));
    }
    /**
     * Creates "ORDER BY" part of SQL query.
     */
    createOrderByExpression() {
        const orderBys = this.expressionMap.allOrderBys;
        if (Object.keys(orderBys).length > 0)
            return " ORDER BY " + Object.keys(orderBys)
                .map(columnName => {
                if (typeof orderBys[columnName] === "string") {
                    return this.replacePropertyNames(columnName) + " " + orderBys[columnName];
                }
                else {
                    return this.replacePropertyNames(columnName) + " " + orderBys[columnName].order + " " + orderBys[columnName].nulls;
                }
            })
                .join(", ");
        return "";
    }
    /**
     * Creates "LIMIT" and "OFFSET" parts of SQL query.
     */
    createLimitOffsetExpression() {
        // in the case if nothing is joined in the query builder we don't need to make two requests to get paginated results
        // we can use regular limit / offset, that's why we add offset and limit construction here based on skip and take values
        let offset = this.expressionMap.offset, limit = this.expressionMap.limit;
        if (!offset && !limit && this.expressionMap.joinAttributes.length === 0) {
            offset = this.expressionMap.skip;
            limit = this.expressionMap.take;
        }
        if (this.connection.driver instanceof SqlServerDriver_1.SqlServerDriver) {
            // Due to a limitation in SQL Server's parser implementation it does not support using
            // OFFSET or FETCH NEXT without an ORDER BY clause being provided. In cases where the
            // user does not request one we insert a dummy ORDER BY that does nothing and should
            // have no effect on the query planner or on the order of the results returned.
            // https://dba.stackexchange.com/a/193799
            let prefix = "";
            if ((limit || offset) && Object.keys(this.expressionMap.allOrderBys).length <= 0) {
                prefix = " ORDER BY (SELECT NULL)";
            }
            if (limit && offset)
                return prefix + " OFFSET " + offset + " ROWS FETCH NEXT " + limit + " ROWS ONLY";
            if (limit)
                return prefix + " OFFSET 0 ROWS FETCH NEXT " + limit + " ROWS ONLY";
            if (offset)
                return prefix + " OFFSET " + offset + " ROWS";
        }
        else if (this.connection.driver instanceof MysqlDriver_1.MysqlDriver) {
            if (limit && offset)
                return " LIMIT " + limit + " OFFSET " + offset;
            if (limit)
                return " LIMIT " + limit;
            if (offset)
                throw new OffsetWithoutLimitNotSupportedError_1.OffsetWithoutLimitNotSupportedError("MySQL");
        }
        else if (this.connection.driver instanceof AbstractSqliteDriver_1.AbstractSqliteDriver) {
            if (limit && offset)
                return " LIMIT " + limit + " OFFSET " + offset;
            if (limit)
                return " LIMIT " + limit;
            if (offset)
                return " LIMIT -1 OFFSET " + offset;
        }
        else if (this.connection.driver instanceof OracleDriver_1.OracleDriver) {
            if (limit && offset)
                return " OFFSET " + offset + " ROWS FETCH NEXT " + limit + " ROWS ONLY";
            if (limit)
                return " FETCH NEXT " + limit + " ROWS ONLY";
            if (offset)
                return " OFFSET " + offset + " ROWS";
        }
        else {
            if (limit && offset)
                return " LIMIT " + limit + " OFFSET " + offset;
            if (limit)
                return " LIMIT " + limit;
            if (offset)
                return " OFFSET " + offset;
        }
        return "";
    }
    /**
     * Creates "LOCK" part of SQL query.
     */
    createLockExpression() {
        const driver = this.connection.driver;
        switch (this.expressionMap.lockMode) {
            case "pessimistic_read":
                if (driver instanceof MysqlDriver_1.MysqlDriver) {
                    return " LOCK IN SHARE MODE";
                }
                else if (driver instanceof PostgresDriver_1.PostgresDriver) {
                    return " FOR SHARE";
                }
                else if (driver instanceof OracleDriver_1.OracleDriver) {
                    return " FOR UPDATE";
                }
                else if (driver instanceof SqlServerDriver_1.SqlServerDriver) {
                    return "";
                }
                else {
                    throw new LockNotSupportedOnGivenDriverError_1.LockNotSupportedOnGivenDriverError();
                }
            case "pessimistic_write":
                if (driver instanceof MysqlDriver_1.MysqlDriver || driver instanceof PostgresDriver_1.PostgresDriver || driver instanceof OracleDriver_1.OracleDriver) {
                    return " FOR UPDATE";
                }
                else if (driver instanceof SqlServerDriver_1.SqlServerDriver) {
                    return "";
                }
                else {
                    throw new LockNotSupportedOnGivenDriverError_1.LockNotSupportedOnGivenDriverError();
                }
            default:
                return "";
        }
    }
    /**
     * Creates "HAVING" part of SQL query.
     */
    createHavingExpression() {
        if (!this.expressionMap.havings || !this.expressionMap.havings.length)
            return "";
        const conditions = this.expressionMap.havings.map((having, index) => {
            switch (having.type) {
                case "and":
                    return (index > 0 ? "AND " : "") + this.replacePropertyNames(having.condition);
                case "or":
                    return (index > 0 ? "OR " : "") + this.replacePropertyNames(having.condition);
                default:
                    return this.replacePropertyNames(having.condition);
            }
        }).join(" ");
        if (!conditions.length)
            return "";
        return " HAVING " + conditions;
    }
    buildEscapedEntityColumnSelects(aliasName, metadata) {
        const hasMainAlias = this.expressionMap.selects.some(select => select.selection === aliasName);
        const columns = [];
        if (hasMainAlias) {
            columns.push(...metadata.columns.filter(column => column.isSelect === true));
        }
        columns.push(...metadata.columns.filter(column => {
            return this.expressionMap.selects.some(select => select.selection === aliasName + "." + column.propertyPath);
        }));
        // if user used partial selection and did not select some primary columns which are required to be selected
        // we select those primary columns and mark them as "virtual". Later virtual column values will be removed from final entity
        // to make entity contain exactly what user selected
        if (columns.length === 0) // however not in the case when nothing (even partial) was selected from this target (for example joins without selection)
            return [];
        const nonSelectedPrimaryColumns = this.expressionMap.queryEntity ? metadata.primaryColumns.filter(primaryColumn => columns.indexOf(primaryColumn) === -1) : [];
        const allColumns = [...columns, ...nonSelectedPrimaryColumns];
        return allColumns.map(column => {
            const selection = this.expressionMap.selects.find(select => select.selection === aliasName + "." + column.propertyPath);
            let selectionPath = this.escape(aliasName) + "." + this.escape(column.databaseName);
            if (this.connection.driver.spatialTypes.indexOf(column.type) !== -1) {
                if (this.connection.driver instanceof MysqlDriver_1.MysqlDriver)
                    selectionPath = `AsText(${selectionPath})`;
                if (this.connection.driver instanceof PostgresDriver_1.PostgresDriver)
                    // cast to JSON to trigger parsing in the driver
                    selectionPath = `ST_AsGeoJSON(${selectionPath})::json`;
                if (this.connection.driver instanceof SqlServerDriver_1.SqlServerDriver)
                    selectionPath = `${selectionPath}.ToString()`;
            }
            return {
                selection: selectionPath,
                aliasName: selection && selection.aliasName ? selection.aliasName : DriverUtils_1.DriverUtils.buildColumnAlias(this.connection.driver, aliasName, column.databaseName),
                // todo: need to keep in mind that custom selection.aliasName breaks hydrator. fix it later!
                virtual: selection ? selection.virtual === true : (hasMainAlias ? false : true),
            };
        });
    }
    findEntityColumnSelects(aliasName, metadata) {
        const mainSelect = this.expressionMap.selects.find(select => select.selection === aliasName);
        if (mainSelect)
            return [mainSelect];
        return this.expressionMap.selects.filter(select => {
            return metadata.columns.some(column => select.selection === aliasName + "." + column.propertyPath);
        });
    }
    async executeCountQuery(queryRunner) {
        const mainAlias = this.expressionMap.mainAlias.name; // todo: will this work with "fromTableName"?
        const metadata = this.expressionMap.mainAlias.metadata;
        const distinctAlias = this.escape(mainAlias);
        let countSql = "";
        if (metadata.hasMultiplePrimaryKeys) {
            if (this.connection.driver instanceof AbstractSqliteDriver_1.AbstractSqliteDriver) {
                countSql = `COUNT(DISTINCT(` + metadata.primaryColumns.map((primaryColumn, index) => {
                    const propertyName = this.escape(primaryColumn.databaseName);
                    return `${distinctAlias}.${propertyName}`;
                }).join(" || ") + ")) as \"cnt\"";
            }
            else {
                countSql = `COUNT(DISTINCT(CONCAT(` + metadata.primaryColumns.map((primaryColumn, index) => {
                    const propertyName = this.escape(primaryColumn.databaseName);
                    return `${distinctAlias}.${propertyName}`;
                }).join(", ") + "))) as \"cnt\"";
            }
        }
        else {
            countSql = `COUNT(DISTINCT(` + metadata.primaryColumns.map((primaryColumn, index) => {
                const propertyName = this.escape(primaryColumn.databaseName);
                return `${distinctAlias}.${propertyName}`;
            }).join(", ") + ")) as \"cnt\"";
        }
        const results = await this.clone()
            .orderBy()
            .groupBy()
            .offset(undefined)
            .limit(undefined)
            .skip(undefined)
            .take(undefined)
            .select(countSql)
            .setOption("disable-global-order")
            .loadRawResults(queryRunner);
        if (!results || !results[0] || !results[0]["cnt"])
            return 0;
        return parseInt(results[0]["cnt"]);
    }
    /**
     * Executes sql generated by query builder and returns object with raw results and entities created from them.
     */
    async executeEntitiesAndRawResults(queryRunner) {
        if (!this.expressionMap.mainAlias)
            throw new Error(`Alias is not set. Use "from" method to set an alias.`);
        if ((this.expressionMap.lockMode === "pessimistic_read" || this.expressionMap.lockMode === "pessimistic_write") && !queryRunner.isTransactionActive)
            throw new PessimisticLockTransactionRequiredError_1.PessimisticLockTransactionRequiredError();
        if (this.expressionMap.lockMode === "optimistic") {
            const metadata = this.expressionMap.mainAlias.metadata;
            if (!metadata.versionColumn && !metadata.updateDateColumn)
                throw new NoVersionOrUpdateDateColumnError_1.NoVersionOrUpdateDateColumnError(metadata.name);
        }
        const relationIdLoader = new RelationIdLoader_1.RelationIdLoader(this.connection, queryRunner, this.expressionMap.relationIdAttributes);
        const relationCountLoader = new RelationCountLoader_1.RelationCountLoader(this.connection, queryRunner, this.expressionMap.relationCountAttributes);
        const relationIdMetadataTransformer = new RelationIdMetadataToAttributeTransformer_1.RelationIdMetadataToAttributeTransformer(this.expressionMap);
        relationIdMetadataTransformer.transform();
        const relationCountMetadataTransformer = new RelationCountMetadataToAttributeTransformer_1.RelationCountMetadataToAttributeTransformer(this.expressionMap);
        relationCountMetadataTransformer.transform();
        let rawResults = [], entities = [];
        // for pagination enabled (e.g. skip and take) its much more complicated - its a special process
        // where we make two queries to find the data we need
        // first query find ids in skip and take range
        // and second query loads the actual data in given ids range
        if ((this.expressionMap.skip || this.expressionMap.take) && this.expressionMap.joinAttributes.length > 0) {
            // we are skipping order by here because its not working in subqueries anyway
            // to make order by working we need to apply it on a distinct query
            const [selects, orderBys] = this.createOrderByCombinedWithSelectExpression("distinctAlias");
            const metadata = this.expressionMap.mainAlias.metadata;
            const mainAliasName = this.expressionMap.mainAlias.name;
            const querySelects = metadata.primaryColumns.map(primaryColumn => {
                const distinctAlias = this.escape("distinctAlias");
                const columnAlias = this.escape(DriverUtils_1.DriverUtils.buildColumnAlias(this.connection.driver, mainAliasName, primaryColumn.databaseName));
                if (!orderBys[columnAlias]) // make sure we aren't overriding user-defined order in inverse direction
                    orderBys[columnAlias] = "ASC";
                return `${distinctAlias}.${columnAlias} as "ids_${DriverUtils_1.DriverUtils.buildColumnAlias(this.connection.driver, mainAliasName, primaryColumn.databaseName)}"`;
            });
            rawResults = await new SelectQueryBuilder(this.connection, queryRunner)
                .select(`DISTINCT ${querySelects.join(", ")}`)
                .addSelect(selects)
                .from(`(${this.clone().orderBy().getQuery()})`, "distinctAlias")
                .offset(this.expressionMap.skip)
                .limit(this.expressionMap.take)
                .orderBy(orderBys)
                .cache(this.expressionMap.cache ? this.expressionMap.cache : this.expressionMap.cacheId, this.expressionMap.cacheDuration)
                .setParameters(this.getParameters())
                .setNativeParameters(this.expressionMap.nativeParameters)
                .getRawMany();
            if (rawResults.length > 0) {
                let condition = "";
                const parameters = {};
                if (metadata.hasMultiplePrimaryKeys) {
                    condition = rawResults.map((result, index) => {
                        return metadata.primaryColumns.map(primaryColumn => {
                            parameters[`ids_${index}_${primaryColumn.databaseName}`] = result[`ids_${mainAliasName}_${primaryColumn.databaseName}`];
                            return `${mainAliasName}.${primaryColumn.propertyPath}=:ids_${index}_${primaryColumn.databaseName}`;
                        }).join(" AND ");
                    }).join(" OR ");
                }
                else {
                    const ids = rawResults.map(result => result["ids_" + DriverUtils_1.DriverUtils.buildColumnAlias(this.connection.driver, mainAliasName, metadata.primaryColumns[0].databaseName)]);
                    const areAllNumbers = ids.every((id) => typeof id === "number");
                    if (areAllNumbers) {
                        // fixes #190. if all numbers then its safe to perform query without parameter
                        condition = `${mainAliasName}.${metadata.primaryColumns[0].propertyPath} IN (${ids.join(", ")})`;
                    }
                    else {
                        parameters["ids"] = ids;
                        condition = mainAliasName + "." + metadata.primaryColumns[0].propertyPath + " IN (:...ids)";
                    }
                }
                rawResults = await this.clone()
                    .mergeExpressionMap({ extraAppendedAndWhereCondition: condition })
                    .setParameters(parameters)
                    .loadRawResults(queryRunner);
            }
        }
        else {
            rawResults = await this.loadRawResults(queryRunner);
        }
        if (rawResults.length > 0) {
            // transform raw results into entities
            const rawRelationIdResults = await relationIdLoader.load(rawResults);
            const rawRelationCountResults = await relationCountLoader.load(rawResults);
            const transformer = new RawSqlResultsToEntityTransformer_1.RawSqlResultsToEntityTransformer(this.expressionMap, this.connection.driver, rawRelationIdResults, rawRelationCountResults, this.queryRunner);
            entities = transformer.transform(rawResults, this.expressionMap.mainAlias);
            // broadcast all "after load" events
            if (this.expressionMap.callListeners === true && this.expressionMap.mainAlias.hasMetadata) {
                const broadcastResult = new BroadcasterResult_1.BroadcasterResult();
                queryRunner.broadcaster.broadcastLoadEventsForAll(broadcastResult, this.expressionMap.mainAlias.metadata, entities);
                if (broadcastResult.promises.length > 0)
                    await Promise.all(broadcastResult.promises);
            }
        }
        return {
            raw: rawResults,
            entities: entities,
        };
    }
    createOrderByCombinedWithSelectExpression(parentAlias) {
        // if table has a default order then apply it
        const orderBys = this.expressionMap.allOrderBys;
        const selectString = Object.keys(orderBys)
            .map(orderCriteria => {
            if (orderCriteria.indexOf(".") !== -1) {
                const [aliasName, propertyPath] = orderCriteria.split(".");
                const alias = this.expressionMap.findAliasByName(aliasName);
                const column = alias.metadata.findColumnWithPropertyName(propertyPath);
                return this.escape(parentAlias) + "." + this.escape(DriverUtils_1.DriverUtils.buildColumnAlias(this.connection.driver, aliasName, column.databaseName));
            }
            else {
                if (this.expressionMap.selects.find(select => select.selection === orderCriteria || select.aliasName === orderCriteria))
                    return this.escape(parentAlias) + "." + orderCriteria;
                return "";
            }
        })
            .join(", ");
        const orderByObject = {};
        Object.keys(orderBys).forEach(orderCriteria => {
            if (orderCriteria.indexOf(".") !== -1) {
                const [aliasName, propertyPath] = orderCriteria.split(".");
                const alias = this.expressionMap.findAliasByName(aliasName);
                const column = alias.metadata.findColumnWithPropertyName(propertyPath);
                orderByObject[this.escape(parentAlias) + "." + this.escape(DriverUtils_1.DriverUtils.buildColumnAlias(this.connection.driver, aliasName, column.databaseName))] = orderBys[orderCriteria];
            }
            else {
                if (this.expressionMap.selects.find(select => select.selection === orderCriteria || select.aliasName === orderCriteria)) {
                    orderByObject[this.escape(parentAlias) + "." + orderCriteria] = orderBys[orderCriteria];
                }
                else {
                    orderByObject[orderCriteria] = orderBys[orderCriteria];
                }
            }
        });
        return [selectString, orderByObject];
    }
    /**
     * Loads raw results from the database.
     */
    async loadRawResults(queryRunner) {
        const [sql, parameters] = this.getQueryAndParameters();
        const queryId = sql + " -- PARAMETERS: " + JSON.stringify(parameters);
        const cacheOptions = typeof this.connection.options.cache === "object" ? this.connection.options.cache : {};
        let savedQueryResultCacheOptions = undefined;
        if (this.connection.queryResultCache && (this.expressionMap.cache || cacheOptions.alwaysEnabled)) {
            savedQueryResultCacheOptions = await this.connection.queryResultCache.getFromCache({
                identifier: this.expressionMap.cacheId,
                query: queryId,
                duration: this.expressionMap.cacheDuration || cacheOptions.duration || 1000
            }, queryRunner);
            if (savedQueryResultCacheOptions && !this.connection.queryResultCache.isExpired(savedQueryResultCacheOptions))
                return JSON.parse(savedQueryResultCacheOptions.result);
        }
        const results = await queryRunner.query(sql, parameters);
        if (this.connection.queryResultCache && (this.expressionMap.cache || cacheOptions.alwaysEnabled)) {
            await this.connection.queryResultCache.storeInCache({
                identifier: this.expressionMap.cacheId,
                query: queryId,
                time: new Date().getTime(),
                duration: this.expressionMap.cacheDuration || cacheOptions.duration || 1000,
                result: JSON.stringify(results)
            }, savedQueryResultCacheOptions, queryRunner);
        }
        return results;
    }
    /**
     * Merges into expression map given expression map properties.
     */
    mergeExpressionMap(expressionMap) {
        ObjectUtils_1.ObjectUtils.assign(this.expressionMap, expressionMap);
        return this;
    }
    /**
     * Normalizes a give number - converts to int if possible.
     */
    normalizeNumber(num) {
        if (typeof num === "number" || num === undefined || num === null)
            return num;
        return Number(num);
    }
    /**
     * Creates a query builder used to execute sql queries inside this query builder.
     */
    obtainQueryRunner() {
        return this.queryRunner || this.connection.createQueryRunner("slave");
    }
}
exports.SelectQueryBuilder = SelectQueryBuilder;
//# sourceMappingURL=SelectQueryBuilder.js.map