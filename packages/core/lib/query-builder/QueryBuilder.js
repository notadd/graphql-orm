"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const QueryExpressionMap_1 = require("./QueryExpressionMap");
const Brackets_1 = require("./Brackets");
const EntityMetadata_1 = require("../metadata/EntityMetadata");
const SqljsDriver_1 = require("../driver/sqljs/SqljsDriver");
const SqlServerDriver_1 = require("../driver/sqlserver/SqlServerDriver");
const OracleDriver_1 = require("../driver/oracle/OracleDriver");
const __1 = require("../");
const FindOperator_1 = require("../find-options/FindOperator");
const In_1 = require("../find-options/operator/In");
// todo: completely cover query builder with tests
// todo: entityOrProperty can be target name. implement proper behaviour if it is.
// todo: check in persistment if id exist on object and throw exception (can be in partial selection?)
// todo: fix problem with long aliases eg getMaxIdentifierLength
// todo: fix replacing in .select("COUNT(post.id) AS cnt") statement
// todo: implement joinAlways in relations and relationId
// todo: finish partial selection
// todo: sugar methods like: .addCount and .selectCount, selectCountAndMap, selectSum, selectSumAndMap, ...
// todo: implement @Select decorator
// todo: add select and map functions
// todo: implement relation/entity loading and setting them into properties within a separate query
// .loadAndMap("post.categories", "post.categories", qb => ...)
// .loadAndMap("post.categories", Category, qb => ...)
/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
class QueryBuilder {
    /**
     * QueryBuilder can be initialized from given Connection and QueryRunner objects or from given other QueryBuilder.
     */
    constructor(connectionOrQueryBuilder, queryRunner) {
        if (connectionOrQueryBuilder instanceof QueryBuilder) {
            this.connection = connectionOrQueryBuilder.connection;
            this.queryRunner = connectionOrQueryBuilder.queryRunner;
            this.expressionMap = connectionOrQueryBuilder.expressionMap.clone();
        }
        else {
            this.connection = connectionOrQueryBuilder;
            this.queryRunner = queryRunner;
            this.expressionMap = new QueryExpressionMap_1.QueryExpressionMap(this.connection);
        }
    }
    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------
    /**
     * Gets the main alias string used in this query builder.
     */
    get alias() {
        if (!this.expressionMap.mainAlias)
            throw new Error(`Main alias is not set`); // todo: better exception
        return this.expressionMap.mainAlias.name;
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
        else if (selection) {
            this.expressionMap.selects = [{ selection: selection, aliasName: selectionAliasName }];
        }
        // loading it dynamically because of circular issue
        const SelectQueryBuilderCls = require("./SelectQueryBuilder").SelectQueryBuilder;
        if (this instanceof SelectQueryBuilderCls)
            return this;
        return new SelectQueryBuilderCls(this);
    }
    /**
     * Creates INSERT query.
     */
    insert() {
        this.expressionMap.queryType = "insert";
        // loading it dynamically because of circular issue
        const InsertQueryBuilderCls = require("./InsertQueryBuilder").InsertQueryBuilder;
        if (this instanceof InsertQueryBuilderCls)
            return this;
        return new InsertQueryBuilderCls(this);
    }
    /**
     * Creates UPDATE query and applies given update values.
     */
    update(entityOrTableNameUpdateSet, maybeUpdateSet) {
        const updateSet = maybeUpdateSet ? maybeUpdateSet : entityOrTableNameUpdateSet;
        entityOrTableNameUpdateSet = entityOrTableNameUpdateSet instanceof __1.EntitySchema ? entityOrTableNameUpdateSet.options.name : entityOrTableNameUpdateSet;
        if (entityOrTableNameUpdateSet instanceof Function || typeof entityOrTableNameUpdateSet === "string") {
            const mainAlias = this.createFromAlias(entityOrTableNameUpdateSet);
            this.expressionMap.setMainAlias(mainAlias);
        }
        this.expressionMap.queryType = "update";
        this.expressionMap.valuesSet = updateSet;
        // loading it dynamically because of circular issue
        const UpdateQueryBuilderCls = require("./UpdateQueryBuilder").UpdateQueryBuilder;
        if (this instanceof UpdateQueryBuilderCls)
            return this;
        return new UpdateQueryBuilderCls(this);
    }
    /**
     * Creates DELETE query.
     */
    delete() {
        this.expressionMap.queryType = "delete";
        // loading it dynamically because of circular issue
        const DeleteQueryBuilderCls = require("./DeleteQueryBuilder").DeleteQueryBuilder;
        if (this instanceof DeleteQueryBuilderCls)
            return this;
        return new DeleteQueryBuilderCls(this);
    }
    /**
     * Sets entity's relation with which this query builder gonna work.
     */
    relation(entityTargetOrPropertyPath, maybePropertyPath) {
        const entityTarget = arguments.length === 2 ? entityTargetOrPropertyPath : undefined;
        const propertyPath = arguments.length === 2 ? maybePropertyPath : entityTargetOrPropertyPath;
        this.expressionMap.queryType = "relation";
        this.expressionMap.relationPropertyPath = propertyPath;
        if (entityTarget) {
            const mainAlias = this.createFromAlias(entityTarget);
            this.expressionMap.setMainAlias(mainAlias);
        }
        // loading it dynamically because of circular issue
        const RelationQueryBuilderCls = require("./RelationQueryBuilder").RelationQueryBuilder;
        if (this instanceof RelationQueryBuilderCls)
            return this;
        return new RelationQueryBuilderCls(this);
    }
    /**
     * Checks if given relation or relations exist in the entity.
     * Returns true if relation exists, false otherwise.
     *
     * todo: move this method to manager? or create a shortcut?
     */
    hasRelation(target, relation) {
        const entityMetadata = this.connection.getMetadata(target);
        const relations = relation instanceof Array ? relation : [relation];
        return relations.every(relation => {
            return !!entityMetadata.findRelationWithPropertyPath(relation);
        });
    }
    /**
     * Sets parameter name and its value.
     */
    setParameter(key, value) {
        this.expressionMap.parameters[key] = value;
        return this;
    }
    /**
     * Adds all parameters from the given object.
     */
    setParameters(parameters) {
        // remove function parameters
        Object.keys(parameters).forEach(key => {
            if (parameters[key] instanceof Function) {
                throw new Error(`Function parameter isn't supported in the parameters. Please check "${key}" parameter.`);
            }
        });
        // set parent query builder parameters as well in sub-query mode
        if (this.expressionMap.parentQueryBuilder)
            this.expressionMap.parentQueryBuilder.setParameters(parameters);
        Object.keys(parameters).forEach(key => this.setParameter(key, parameters[key]));
        return this;
    }
    /**
     * Adds native parameters from the given object.
     */
    setNativeParameters(parameters) {
        // set parent query builder parameters as well in sub-query mode
        if (this.expressionMap.parentQueryBuilder)
            this.expressionMap.parentQueryBuilder.setNativeParameters(parameters);
        Object.keys(parameters).forEach(key => {
            this.expressionMap.nativeParameters[key] = parameters[key];
        });
        return this;
    }
    /**
     * Gets all parameters.
     */
    getParameters() {
        const parameters = Object.assign({}, this.expressionMap.parameters);
        // add discriminator column parameter if it exist
        if (this.expressionMap.mainAlias && this.expressionMap.mainAlias.hasMetadata) {
            const metadata = this.expressionMap.mainAlias.metadata;
            if (metadata.discriminatorColumn && metadata.parentEntityMetadata) {
                const values = metadata.childEntityMetadatas
                    .filter(childMetadata => childMetadata.discriminatorColumn)
                    .map(childMetadata => childMetadata.discriminatorValue);
                values.push(metadata.discriminatorValue);
                parameters["discriminatorColumnValues"] = values;
            }
        }
        return parameters;
    }
    /**
     * Prints sql to stdout using console.log.
     */
    printSql() {
        const [query, parameters] = this.getQueryAndParameters();
        this.connection.logger.logQuery(query, parameters);
        return this;
    }
    /**
     * Gets generated sql that will be executed.
     * Parameters in the query are escaped for the currently used driver.
     */
    getSql() {
        return this.getQueryAndParameters()[0];
    }
    /**
     * Gets query to be executed with all parameters used in it.
     */
    getQueryAndParameters() {
        // this execution order is important because getQuery method generates this.expressionMap.nativeParameters values
        const query = this.getQuery();
        const parameters = this.getParameters();
        return this.connection.driver.escapeQueryWithParameters(query, parameters, this.expressionMap.nativeParameters);
    }
    /**
     * Executes sql generated by query builder and returns raw database results.
     */
    async execute() {
        const [sql, parameters] = this.getQueryAndParameters();
        const queryRunner = this.obtainQueryRunner();
        try {
            return await queryRunner.query(sql, parameters); // await is needed here because we are using finally
        }
        finally {
            if (queryRunner !== this.queryRunner) { // means we created our own query runner
                await queryRunner.release();
            }
            if (this.connection.driver instanceof SqljsDriver_1.SqljsDriver) {
                await this.connection.driver.autoSave();
            }
        }
    }
    /**
     * Creates a completely new query builder.
     * Uses same query runner as current QueryBuilder.
     */
    createQueryBuilder() {
        return new this.constructor(this.connection, this.queryRunner);
    }
    /**
     * Clones query builder as it is.
     * Note: it uses new query runner, if you want query builder that uses exactly same query runner,
     * you can create query builder using its constructor, for example new SelectQueryBuilder(queryBuilder)
     * where queryBuilder is cloned QueryBuilder.
     */
    clone() {
        return new this.constructor(this);
    }
    /**
     * Disables escaping.
     */
    disableEscaping() {
        this.expressionMap.disableEscaping = false;
        return this;
    }
    /**
     * Escapes table name, column name or alias name using current database's escaping character.
     */
    escape(name) {
        if (!this.expressionMap.disableEscaping)
            return name;
        return this.connection.driver.escape(name);
    }
    /**
     * Sets or overrides query builder's QueryRunner.
     */
    setQueryRunner(queryRunner) {
        this.queryRunner = queryRunner;
        return this;
    }
    /**
     * Indicates if listeners and subscribers must be called before and after query execution.
     * Enabled by default.
     */
    callListeners(enabled) {
        this.expressionMap.callListeners = enabled;
        return this;
    }
    /**
     * If set to true the query will be wrapped into a transaction.
     */
    useTransaction(enabled) {
        this.expressionMap.useTransaction = enabled;
        return this;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Gets escaped table name with schema name if SqlServer driver used with custom
     * schema name, otherwise returns escaped table name.
     */
    getTableName(tablePath) {
        return tablePath.split(".")
            .map(i => {
            // this condition need because in SQL Server driver when custom database name was specified and schema name was not, we got `dbName..tableName` string, and doesn't need to escape middle empty string
            if (i === "")
                return i;
            return this.escape(i);
        }).join(".");
    }
    /**
     * Gets name of the table where insert should be performed.
     */
    getMainTableName() {
        if (!this.expressionMap.mainAlias)
            throw new Error(`Entity where values should be inserted is not specified. Call "qb.into(entity)" method to specify it.`);
        if (this.expressionMap.mainAlias.hasMetadata)
            return this.expressionMap.mainAlias.metadata.tablePath;
        return this.expressionMap.mainAlias.tablePath;
    }
    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    createFromAlias(entityTarget, aliasName) {
        // if table has a metadata then find it to properly escape its properties
        // const metadata = this.connection.entityMetadatas.find(metadata => metadata.tableName === tableName);
        if (this.connection.hasMetadata(entityTarget)) {
            const metadata = this.connection.getMetadata(entityTarget);
            return this.expressionMap.createAlias({
                type: "from",
                name: aliasName,
                metadata: this.connection.getMetadata(entityTarget),
                tablePath: metadata.tablePath
            });
        }
        else {
            let subQuery = "";
            if (entityTarget instanceof Function) {
                const subQueryBuilder = entityTarget(this.subQuery());
                this.setParameters(subQueryBuilder.getParameters());
                subQuery = subQueryBuilder.getQuery();
            }
            else {
                subQuery = entityTarget;
            }
            const isSubQuery = entityTarget instanceof Function || entityTarget.substr(0, 1) === "(" && entityTarget.substr(-1) === ")";
            return this.expressionMap.createAlias({
                type: "from",
                name: aliasName,
                tablePath: isSubQuery === false ? entityTarget : undefined,
                subQuery: isSubQuery === true ? subQuery : undefined,
            });
        }
    }
    /**
     * Replaces all entity's propertyName to name in the given statement.
     */
    replacePropertyNames(statement) {
        this.expressionMap.aliases.forEach(alias => {
            if (!alias.hasMetadata)
                return;
            const replaceAliasNamePrefix = this.expressionMap.aliasNamePrefixingEnabled ? alias.name + "\\." : "";
            const replacementAliasNamePrefix = this.expressionMap.aliasNamePrefixingEnabled ? this.escape(alias.name) + "." : "";
            alias.metadata.columns.forEach(column => {
                const expression = "([ =\(]|^.{0})" + replaceAliasNamePrefix + column.propertyPath + "([ =\)\,]|.{0}$)";
                statement = statement.replace(new RegExp(expression, "gm"), "$1" + replacementAliasNamePrefix + this.escape(column.databaseName) + "$2");
                const expression2 = "([ =\(]|^.{0})" + replaceAliasNamePrefix + column.propertyName + "([ =\)\,]|.{0}$)";
                statement = statement.replace(new RegExp(expression2, "gm"), "$1" + replacementAliasNamePrefix + this.escape(column.databaseName) + "$2");
            });
            alias.metadata.relations.forEach(relation => {
                [...relation.joinColumns, ...relation.inverseJoinColumns].forEach(joinColumn => {
                    const expression = "([ =\(]|^.{0})" + replaceAliasNamePrefix + relation.propertyPath + "\\." + joinColumn.referencedColumn.propertyPath + "([ =\)\,]|.{0}$)";
                    statement = statement.replace(new RegExp(expression, "gm"), "$1" + replacementAliasNamePrefix + this.escape(joinColumn.databaseName) + "$2"); // todo: fix relation.joinColumns[0], what if multiple columns
                });
                if (relation.joinColumns.length > 0) {
                    const expression = "([ =\(]|^.{0})" + replaceAliasNamePrefix + relation.propertyPath + "([ =\)\,]|.{0}$)";
                    statement = statement.replace(new RegExp(expression, "gm"), "$1" + replacementAliasNamePrefix + this.escape(relation.joinColumns[0].databaseName) + "$2"); // todo: fix relation.joinColumns[0], what if multiple columns
                }
            });
        });
        return statement;
    }
    /**
     * Creates "WHERE" expression.
     */
    createWhereExpression() {
        const conditions = this.createWhereExpressionString();
        if (this.expressionMap.mainAlias.hasMetadata) {
            const metadata = this.expressionMap.mainAlias.metadata;
            if (metadata.discriminatorColumn && metadata.parentEntityMetadata) {
                const column = this.expressionMap.aliasNamePrefixingEnabled
                    ? this.expressionMap.mainAlias.name + "." + metadata.discriminatorColumn.databaseName
                    : metadata.discriminatorColumn.databaseName;
                const condition = `${this.replacePropertyNames(column)} IN (:...discriminatorColumnValues)`;
                return ` WHERE ${conditions.length ? "(" + conditions + ") AND" : ""} ${condition}`;
            }
        }
        if (!conditions.length) // TODO copy in to discriminator condition
            return this.expressionMap.extraAppendedAndWhereCondition ? " WHERE " + this.replacePropertyNames(this.expressionMap.extraAppendedAndWhereCondition) : "";
        if (this.expressionMap.extraAppendedAndWhereCondition)
            return " WHERE (" + conditions + ") AND " + this.replacePropertyNames(this.expressionMap.extraAppendedAndWhereCondition);
        return " WHERE " + conditions;
    }
    /**
     * Creates "RETURNING" / "OUTPUT" expression.
     */
    createReturningExpression() {
        const columns = this.getReturningColumns();
        const driver = this.connection.driver;
        // also add columns we must auto-return to perform entity updation
        // if user gave his own returning
        if (typeof this.expressionMap.returning !== "string" &&
            this.expressionMap.extraReturningColumns.length > 0 &&
            driver.isReturningSqlSupported()) {
            columns.push(...this.expressionMap.extraReturningColumns.filter(column => {
                return columns.indexOf(column) === -1;
            }));
        }
        if (columns.length) {
            let columnsExpression = columns.map(column => {
                const name = this.escape(column.databaseName);
                if (driver instanceof SqlServerDriver_1.SqlServerDriver) {
                    if (this.expressionMap.queryType === "insert" || this.expressionMap.queryType === "update") {
                        return "INSERTED." + name;
                    }
                    else {
                        return this.escape(this.getMainTableName()) + "." + name;
                    }
                }
                else {
                    return name;
                }
            }).join(", ");
            if (driver instanceof OracleDriver_1.OracleDriver) {
                columnsExpression += " INTO " + columns.map(column => {
                    const parameterName = "output_" + column.databaseName;
                    this.expressionMap.nativeParameters[parameterName] = { type: driver.columnTypeToNativeParameter(column.type), dir: driver.oracle.BIND_OUT };
                    return this.connection.driver.createParameter(parameterName, Object.keys(this.expressionMap.nativeParameters).length);
                }).join(", ");
            }
            return columnsExpression;
        }
        else if (typeof this.expressionMap.returning === "string") {
            return this.expressionMap.returning;
        }
        return "";
    }
    /**
     * If returning / output cause is set to array of column names,
     * then this method will return all column metadatas of those column names.
     */
    getReturningColumns() {
        const columns = [];
        if (this.expressionMap.returning instanceof Array) {
            this.expressionMap.returning.forEach(columnName => {
                if (this.expressionMap.mainAlias.hasMetadata) {
                    columns.push(...this.expressionMap.mainAlias.metadata.findColumnsWithPropertyPath(columnName));
                }
            });
        }
        return columns;
    }
    /**
     * Concatenates all added where expressions into one string.
     */
    createWhereExpressionString() {
        return this.expressionMap.wheres.map((where, index) => {
            switch (where.type) {
                case "and":
                    return (index > 0 ? "AND " : "") + this.replacePropertyNames(where.condition);
                case "or":
                    return (index > 0 ? "OR " : "") + this.replacePropertyNames(where.condition);
                default:
                    return this.replacePropertyNames(where.condition);
            }
        }).join(" ");
    }
    /**
     * Creates "WHERE" expression and variables for the given "ids".
     */
    createWhereIdsExpression(ids) {
        const metadata = this.expressionMap.mainAlias.metadata;
        const normalized = (Array.isArray(ids) ? ids : [ids]).map(id => metadata.ensureEntityIdMap(id));
        // using in(...ids) for single primary key entities
        if (!metadata.hasMultiplePrimaryKeys
            && metadata.embeddeds.length === 0) {
            const primaryColumn = metadata.primaryColumns[0];
            // getEntityValue will try to transform `In`, it is a bug
            // todo: remove this transformer check after #2390 is fixed
            if (!primaryColumn.transformer) {
                return this.computeWhereParameter({
                    [primaryColumn.propertyName]: In_1.In(normalized.map(id => primaryColumn.getEntityValue(id, false)))
                });
            }
        }
        // create shortcuts for better readability
        const alias = this.expressionMap.aliasNamePrefixingEnabled ? this.escape(this.expressionMap.mainAlias.name) + "." : "";
        let parameterIndex = Object.keys(this.expressionMap.nativeParameters).length;
        const whereStrings = normalized.map((id, index) => {
            const whereSubStrings = [];
            metadata.primaryColumns.forEach((primaryColumn, secondIndex) => {
                const parameterName = "id_" + index + "_" + secondIndex;
                // whereSubStrings.push(alias + this.escape(primaryColumn.databaseName) + "=:id_" + index + "_" + secondIndex);
                whereSubStrings.push(alias + this.escape(primaryColumn.databaseName) + " = " + this.connection.driver.createParameter(parameterName, parameterIndex));
                this.expressionMap.nativeParameters[parameterName] = primaryColumn.getEntityValue(id, true);
                parameterIndex++;
            });
            return whereSubStrings.join(" AND ");
        });
        return whereStrings.length > 1
            ? "(" + whereStrings.map(whereString => "(" + whereString + ")").join(" OR ") + ")"
            : whereStrings[0];
    }
    /**
     * Computes given where argument - transforms to a where string all forms it can take.
     */
    computeWhereParameter(where) {
        if (typeof where === "string")
            return where;
        if (where instanceof Brackets_1.Brackets) {
            const whereQueryBuilder = this.createQueryBuilder();
            where.whereFactory(whereQueryBuilder);
            const whereString = whereQueryBuilder.createWhereExpressionString();
            this.setParameters(whereQueryBuilder.getParameters());
            return whereString ? "(" + whereString + ")" : "";
        }
        else if (where instanceof Function) {
            return where(this);
        }
        else if (where instanceof Object) {
            const wheres = where instanceof Array ? where : [where];
            let andConditions;
            let parameterIndex = Object.keys(this.expressionMap.nativeParameters).length;
            if (this.expressionMap.mainAlias.hasMetadata) {
                andConditions = wheres.map((where, whereIndex) => {
                    const propertyPaths = EntityMetadata_1.EntityMetadata.createPropertyPath(this.expressionMap.mainAlias.metadata, where);
                    return propertyPaths.map((propertyPath, propertyIndex) => {
                        const paths = propertyPath.split('_');
                        let options = `equal`;
                        let columnName = paths.join('_');
                        if (paths.length > 1) {
                            options = paths.pop();
                            columnName = paths.join('_');
                        }
                        const columns = this.expressionMap.mainAlias.metadata.findColumnsWithPropertyPath(columnName);
                        return columns.map((column, columnIndex) => {
                            const aliasPath = this.expressionMap.aliasNamePrefixingEnabled ? `${this.alias}.${columnName}` : column.propertyPath;
                            column.propertyName = propertyPath;
                            let parameterValue = column.getEntityValue(where, true);
                            column.propertyName = columnName;
                            const parameterName = "where_" + whereIndex + "_" + propertyIndex + "_" + columnIndex;
                            const parameterBaseCount = Object.keys(this.expressionMap.nativeParameters).filter(x => x.startsWith(parameterName)).length;
                            if (parameterValue === null) {
                                return `${aliasPath} IS NULL`;
                            }
                            else if (parameterValue instanceof FindOperator_1.FindOperator) {
                                let parameters = [];
                                if (parameterValue.useParameter) {
                                    const realParameterValues = parameterValue.multipleParameters ? parameterValue.value : [parameterValue.value];
                                    realParameterValues.forEach((realParameterValue, realParameterValueIndex) => {
                                        this.expressionMap.nativeParameters[parameterName + (parameterBaseCount + realParameterValueIndex)] = realParameterValue;
                                        parameterIndex++;
                                        parameters.push(this.connection.driver.createParameter(parameterName + (parameterBaseCount + realParameterValueIndex), parameterIndex - 1));
                                    });
                                }
                                return parameterValue.toSql(this.connection, aliasPath, parameters);
                            }
                            else {
                                if (options === 'equal') {
                                    this.expressionMap.nativeParameters[parameterName] = parameterValue;
                                    parameterIndex++;
                                    const parameter = this.connection.driver.createParameter(parameterName, parameterIndex - 1);
                                    return `${aliasPath} = ${parameter}`;
                                }
                                else if (["In", "Between", "Lt", "Lte", "Gt", "Gte", "Like"].includes(options)) {
                                    if (options === 'In') {
                                        if (parameterValue.length > 0) {
                                            parameterValue = new FindOperator_1.FindOperator('in', parameterValue, true, true);
                                        }
                                    }
                                    else if (options === 'Between') {
                                        parameterValue = new FindOperator_1.FindOperator('between', parameterValue, true, true);
                                    }
                                    else if (options === 'Lt') {
                                        parameterValue = new FindOperator_1.FindOperator('lessThan', parameterValue, true, false);
                                    }
                                    else if (options === 'Lte') {
                                        parameterValue = new FindOperator_1.FindOperator('lessThanOrEqual', parameterValue, true, false);
                                    }
                                    else if (options === 'Gt') {
                                        parameterValue = new FindOperator_1.FindOperator('moreThan', parameterValue, true, false);
                                    }
                                    else if (options === 'Gte') {
                                        parameterValue = new FindOperator_1.FindOperator('moreThanOrEqual', parameterValue, true, false);
                                    }
                                    else if (options === 'Like') {
                                        parameterValue = new FindOperator_1.FindOperator('like', parameterValue, true, false);
                                    }
                                    let parameters = [];
                                    if (parameterValue instanceof FindOperator_1.FindOperator) {
                                        if (parameterValue.useParameter) {
                                            const realParameterValues = parameterValue.multipleParameters
                                                ? parameterValue.value
                                                : [parameterValue.value];
                                            realParameterValues.forEach((realParameterValue, realParameterValueIndex) => {
                                                const key = `${parameterName}${parameterBaseCount}${realParameterValueIndex}`;
                                                this.expressionMap.nativeParameters[key] = realParameterValue;
                                                parameterIndex++;
                                                parameters.push(this.connection.driver.createParameter(key, parameterIndex - 1));
                                            });
                                        }
                                        return parameterValue.toSql(this.connection, aliasPath, parameters);
                                    }
                                }
                                else {
                                    debugger;
                                }
                            }
                        }).filter(expression => !!expression).join(" AND ");
                    }).filter(expression => !!expression).join(" AND ");
                });
            }
            else {
                andConditions = wheres.map((where, whereIndex) => {
                    return Object.keys(where).map((key, parameterIndex) => {
                        const parameterValue = where[key];
                        const aliasPath = this.expressionMap.aliasNamePrefixingEnabled ? `${this.alias}.${key}` : key;
                        if (parameterValue === null) {
                            return `${aliasPath} IS NULL`;
                        }
                        else {
                            const parameterName = "where_" + whereIndex + "_" + parameterIndex;
                            this.expressionMap.nativeParameters[parameterName] = parameterValue;
                            parameterIndex++;
                            return `${aliasPath} = ${this.connection.driver.createParameter(parameterName, parameterIndex - 1)}`;
                        }
                    }).join(" AND ");
                });
            }
            if (andConditions.length > 1)
                return andConditions.map(where => "(" + where + ")").join(" OR ");
            return andConditions.join("");
        }
        return "";
    }
    /**
     * Creates a query builder used to execute sql queries inside this query builder.
     */
    obtainQueryRunner() {
        return this.queryRunner || this.connection.createQueryRunner("master");
    }
}
exports.QueryBuilder = QueryBuilder;
//# sourceMappingURL=QueryBuilder.js.map