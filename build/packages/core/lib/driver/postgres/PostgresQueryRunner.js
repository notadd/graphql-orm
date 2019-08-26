"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../../");
const QueryFailedError_1 = require("../../error/QueryFailedError");
const QueryRunnerAlreadyReleasedError_1 = require("../../error/QueryRunnerAlreadyReleasedError");
const TransactionAlreadyStartedError_1 = require("../../error/TransactionAlreadyStartedError");
const TransactionNotStartedError_1 = require("../../error/TransactionNotStartedError");
const BaseQueryRunner_1 = require("../../query-runner/BaseQueryRunner");
const Table_1 = require("../../schema-builder/table/Table");
const TableCheck_1 = require("../../schema-builder/table/TableCheck");
const TableColumn_1 = require("../../schema-builder/table/TableColumn");
const TableExclusion_1 = require("../../schema-builder/table/TableExclusion");
const TableForeignKey_1 = require("../../schema-builder/table/TableForeignKey");
const TableIndex_1 = require("../../schema-builder/table/TableIndex");
const TableUnique_1 = require("../../schema-builder/table/TableUnique");
const View_1 = require("../../schema-builder/view/View");
const Broadcaster_1 = require("../../subscriber/Broadcaster");
const OrmUtils_1 = require("../../util/OrmUtils");
const Query_1 = require("../Query");
/**
 * Runs queries on a single postgres database connection.
 */
class PostgresQueryRunner extends BaseQueryRunner_1.BaseQueryRunner {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(driver, mode = "master") {
        super();
        this.driver = driver;
        this.connection = driver.connection;
        this.mode = mode;
        this.broadcaster = new Broadcaster_1.Broadcaster(this);
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates/uses database connection from the connection pool to perform further operations.
     * Returns obtained database connection.
     */
    connect() {
        if (this.databaseConnection)
            return Promise.resolve(this.databaseConnection);
        if (this.databaseConnectionPromise)
            return this.databaseConnectionPromise;
        if (this.mode === "slave" && this.driver.isReplicated) {
            this.databaseConnectionPromise = this.driver.obtainSlaveConnection().then(([connection, release]) => {
                this.driver.connectedQueryRunners.push(this);
                this.databaseConnection = connection;
                this.releaseCallback = release;
                return this.databaseConnection;
            });
        }
        else { // master
            this.databaseConnectionPromise = this.driver.obtainMasterConnection().then(([connection, release]) => {
                this.driver.connectedQueryRunners.push(this);
                this.databaseConnection = connection;
                this.releaseCallback = release;
                return this.databaseConnection;
            });
        }
        return this.databaseConnectionPromise;
    }
    /**
     * Releases used database connection.
     * You cannot use query runner methods once its released.
     */
    release() {
        this.isReleased = true;
        if (this.releaseCallback)
            this.releaseCallback();
        const index = this.driver.connectedQueryRunners.indexOf(this);
        if (index !== -1)
            this.driver.connectedQueryRunners.splice(index);
        return Promise.resolve();
    }
    /**
     * Starts transaction.
     */
    async startTransaction(isolationLevel) {
        if (this.isTransactionActive)
            throw new TransactionAlreadyStartedError_1.TransactionAlreadyStartedError();
        this.isTransactionActive = true;
        await this.query("START TRANSACTION");
        if (isolationLevel) {
            await this.query("SET TRANSACTION ISOLATION LEVEL " + isolationLevel);
        }
    }
    /**
     * Commits transaction.
     * Error will be thrown if transaction was not started.
     */
    async commitTransaction() {
        if (!this.isTransactionActive)
            throw new TransactionNotStartedError_1.TransactionNotStartedError();
        await this.query("COMMIT");
        this.isTransactionActive = false;
    }
    /**
     * Rollbacks transaction.
     * Error will be thrown if transaction was not started.
     */
    async rollbackTransaction() {
        if (!this.isTransactionActive)
            throw new TransactionNotStartedError_1.TransactionNotStartedError();
        await this.query("ROLLBACK");
        this.isTransactionActive = false;
    }
    /**
     * Executes a given SQL query.
     */
    query(query, parameters) {
        if (this.isReleased)
            throw new QueryRunnerAlreadyReleasedError_1.QueryRunnerAlreadyReleasedError();
        return new Promise(async (ok, fail) => {
            try {
                const databaseConnection = await this.connect();
                this.driver.connection.logger.logQuery(query, parameters, this);
                const queryStartTime = +new Date();
                databaseConnection.query(query, parameters, (err, result) => {
                    // log slow queries if maxQueryExecution time is set
                    const maxQueryExecutionTime = this.driver.connection.options.maxQueryExecutionTime;
                    const queryEndTime = +new Date();
                    const queryExecutionTime = queryEndTime - queryStartTime;
                    if (maxQueryExecutionTime && queryExecutionTime > maxQueryExecutionTime)
                        this.driver.connection.logger.logQuerySlow(queryExecutionTime, query, parameters, this);
                    if (err) {
                        this.driver.connection.logger.logQueryError(err, query, parameters, this);
                        fail(new QueryFailedError_1.QueryFailedError(query, parameters, err));
                    }
                    else {
                        switch (result.command) {
                            case "DELETE":
                                // for DELETE query additionally return number of affected rows
                                ok([result.rows, result.rowCount]);
                                break;
                            default:
                                ok(result.rows);
                        }
                    }
                });
            }
            catch (err) {
                fail(err);
            }
        });
    }
    /**
     * Returns raw data stream.
     */
    stream(query, parameters, onEnd, onError) {
        const QueryStream = this.driver.loadStreamDependency();
        if (this.isReleased)
            throw new QueryRunnerAlreadyReleasedError_1.QueryRunnerAlreadyReleasedError();
        return new Promise(async (ok, fail) => {
            try {
                const databaseConnection = await this.connect();
                this.driver.connection.logger.logQuery(query, parameters, this);
                const stream = databaseConnection.query(new QueryStream(query, parameters));
                if (onEnd)
                    stream.on("end", onEnd);
                if (onError)
                    stream.on("error", onError);
                ok(stream);
            }
            catch (err) {
                fail(err);
            }
        });
    }
    /**
     * Returns all available database names including system databases.
     */
    async getDatabases() {
        return Promise.resolve([]);
    }
    /**
     * Returns all available schema names including system schemas.
     * If database parameter specified, returns schemas of that database.
     */
    async getSchemas(database) {
        return Promise.resolve([]);
    }
    /**
     * Checks if database with the given name exist.
     */
    async hasDatabase(database) {
        return Promise.resolve(false);
    }
    /**
     * Checks if schema with the given name exist.
     */
    async hasSchema(schema) {
        const result = await this.query(`SELECT * FROM "information_schema"."schemata" WHERE "schema_name" = '${schema}'`);
        return result.length ? true : false;
    }
    /**
     * Checks if table with the given name exist in the database.
     */
    async hasTable(tableOrName) {
        const parsedTableName = this.parseTableName(tableOrName);
        const sql = `SELECT * FROM "information_schema"."tables" WHERE "table_schema" = ${parsedTableName.schema} AND "table_name" = ${parsedTableName.tableName}`;
        const result = await this.query(sql);
        return result.length ? true : false;
    }
    /**
     * Checks if column with the given name exist in the given table.
     */
    async hasColumn(tableOrName, columnName) {
        const parsedTableName = this.parseTableName(tableOrName);
        const sql = `SELECT * FROM "information_schema"."columns" WHERE "table_schema" = ${parsedTableName.schema} AND "table_name" = ${parsedTableName.tableName} AND "column_name" = '${columnName}'`;
        const result = await this.query(sql);
        return result.length ? true : false;
    }
    /**
     * Creates a new database.
     * Postgres does not supports database creation inside a transaction block.
     */
    async createDatabase(database, ifNotExist) {
        await Promise.resolve();
    }
    /**
     * Drops database.
     * Postgres does not supports database drop inside a transaction block.
     */
    async dropDatabase(database, ifExist) {
        return Promise.resolve();
    }
    /**
     * Creates a new table schema.
     */
    async createSchema(schema, ifNotExist) {
        const up = ifNotExist ? `CREATE SCHEMA IF NOT EXISTS "${schema}"` : `CREATE SCHEMA "${schema}"`;
        const down = `DROP SCHEMA "${schema}" CASCADE`;
        await this.executeQueries(new Query_1.Query(up), new Query_1.Query(down));
    }
    /**
     * Drops table schema.
     */
    async dropSchema(schemaPath, ifExist, isCascade) {
        const schema = schemaPath.indexOf(".") === -1 ? schemaPath : schemaPath.split(".")[0];
        const up = ifExist ? `DROP SCHEMA IF EXISTS "${schema}" ${isCascade ? "CASCADE" : ""}` : `DROP SCHEMA "${schema}" ${isCascade ? "CASCADE" : ""}`;
        const down = `CREATE SCHEMA "${schema}"`;
        await this.executeQueries(new Query_1.Query(up), new Query_1.Query(down));
    }
    /**
     * Creates a new table.
     */
    async createTable(table, ifNotExist = false, createForeignKeys = true, createIndices = true) {
        if (ifNotExist) {
            const isTableExist = await this.hasTable(table);
            if (isTableExist)
                return Promise.resolve();
        }
        const upQueries = [];
        const downQueries = [];
        // if table have column with ENUM type, we must create this type in postgres.
        await Promise.all(table.columns
            .filter(column => column.type === "enum" || column.type === "simple-enum")
            .map(async (column) => {
            const hasEnum = await this.hasEnumType(table, column);
            // TODO: Should also check if values of existing type matches expected ones
            if (!hasEnum) {
                upQueries.push(this.createEnumTypeSql(table, column));
                downQueries.push(this.dropEnumTypeSql(table, column));
            }
            return Promise.resolve();
        }));
        upQueries.push(this.createTableSql(table, createForeignKeys));
        downQueries.push(this.dropTableSql(table));
        // if createForeignKeys is true, we must drop created foreign keys in down query.
        // createTable does not need separate method to create foreign keys, because it create fk's in the same query with table creation.
        if (createForeignKeys)
            table.foreignKeys.forEach(foreignKey => downQueries.push(this.dropForeignKeySql(table, foreignKey)));
        if (createIndices) {
            table.indices.forEach(index => {
                // new index may be passed without name. In this case we generate index name manually.
                if (!index.name)
                    index.name = this.connection.namingStrategy.indexName(table.name, index.columnNames, index.where);
                upQueries.push(this.createIndexSql(table, index));
                downQueries.push(this.dropIndexSql(table, index));
            });
        }
        await this.executeQueries(upQueries, downQueries);
    }
    /**
     * Drops the table.
     */
    async dropTable(target, ifExist, dropForeignKeys = true, dropIndices = true) {
        // to perform drop queries for foreign keys and indices.
        if (ifExist) {
            const isTableExist = await this.hasTable(target);
            if (!isTableExist)
                return Promise.resolve();
        }
        // if dropTable called with dropForeignKeys = true, we must create foreign keys in down query.
        const createForeignKeys = dropForeignKeys;
        const tableName = target instanceof Table_1.Table ? target.name : target;
        const table = await this.getCachedTable(tableName);
        const upQueries = [];
        const downQueries = [];
        if (dropIndices) {
            table.indices.forEach(index => {
                upQueries.push(this.dropIndexSql(table, index));
                downQueries.push(this.createIndexSql(table, index));
            });
        }
        if (dropForeignKeys)
            table.foreignKeys.forEach(foreignKey => upQueries.push(this.dropForeignKeySql(table, foreignKey)));
        upQueries.push(this.dropTableSql(table));
        downQueries.push(this.createTableSql(table, createForeignKeys));
        await this.executeQueries(upQueries, downQueries);
    }
    /**
     * Creates a new view.
     */
    async createView(view) {
        const upQueries = [];
        const downQueries = [];
        upQueries.push(this.createViewSql(view));
        upQueries.push(await this.insertViewDefinitionSql(view));
        downQueries.push(this.dropViewSql(view));
        downQueries.push(await this.deleteViewDefinitionSql(view));
        await this.executeQueries(upQueries, downQueries);
    }
    /**
     * Drops the view.
     */
    async dropView(target) {
        const viewName = target instanceof View_1.View ? target.name : target;
        const view = await this.getCachedView(viewName);
        const upQueries = [];
        const downQueries = [];
        upQueries.push(await this.deleteViewDefinitionSql(view));
        upQueries.push(this.dropViewSql(view));
        downQueries.push(await this.insertViewDefinitionSql(view));
        downQueries.push(this.createViewSql(view));
        await this.executeQueries(upQueries, downQueries);
    }
    /**
     * Renames the given table.
     */
    async renameTable(oldTableOrName, newTableName) {
        const upQueries = [];
        const downQueries = [];
        const oldTable = oldTableOrName instanceof Table_1.Table ? oldTableOrName : await this.getCachedTable(oldTableOrName);
        const newTable = oldTable.clone();
        const oldTableName = oldTable.name.indexOf(".") === -1 ? oldTable.name : oldTable.name.split(".")[1];
        const schemaName = oldTable.name.indexOf(".") === -1 ? undefined : oldTable.name.split(".")[0];
        newTable.name = schemaName ? `${schemaName}.${newTableName}` : newTableName;
        upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(oldTable)} RENAME TO "${newTableName}"`));
        downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME TO "${oldTableName}"`));
        // rename column primary key constraint
        if (newTable.primaryColumns.length > 0) {
            const columnNames = newTable.primaryColumns.map(column => column.name);
            const oldPkName = this.connection.namingStrategy.primaryKeyName(oldTable, columnNames);
            const newPkName = this.connection.namingStrategy.primaryKeyName(newTable, columnNames);
            upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME CONSTRAINT "${oldPkName}" TO "${newPkName}"`));
            downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME CONSTRAINT "${newPkName}" TO "${oldPkName}"`));
        }
        // rename unique constraints
        newTable.uniques.forEach(unique => {
            // build new constraint name
            const newUniqueName = this.connection.namingStrategy.uniqueConstraintName(newTable, unique.columnNames);
            // build queries
            upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME CONSTRAINT "${unique.name}" TO "${newUniqueName}"`));
            downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME CONSTRAINT "${newUniqueName}" TO "${unique.name}"`));
            // replace constraint name
            unique.name = newUniqueName;
        });
        // rename index constraints
        newTable.indices.forEach(index => {
            // build new constraint name
            const schema = this.extractSchema(newTable);
            const newIndexName = this.connection.namingStrategy.indexName(newTable, index.columnNames, index.where);
            // build queries
            const up = schema ? `ALTER INDEX "${schema}"."${index.name}" RENAME TO "${newIndexName}"` : `ALTER INDEX "${index.name}" RENAME TO "${newIndexName}"`;
            const down = schema ? `ALTER INDEX "${schema}"."${newIndexName}" RENAME TO "${index.name}"` : `ALTER INDEX "${newIndexName}" RENAME TO "${index.name}"`;
            upQueries.push(new Query_1.Query(up));
            downQueries.push(new Query_1.Query(down));
            // replace constraint name
            index.name = newIndexName;
        });
        // rename foreign key constraints
        newTable.foreignKeys.forEach(foreignKey => {
            // build new constraint name
            const newForeignKeyName = this.connection.namingStrategy.foreignKeyName(newTable, foreignKey.columnNames);
            // build queries
            upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME CONSTRAINT "${foreignKey.name}" TO "${newForeignKeyName}"`));
            downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME CONSTRAINT "${newForeignKeyName}" TO "${foreignKey.name}"`));
            // replace constraint name
            foreignKey.name = newForeignKeyName;
        });
        // rename ENUM types
        const enumColumns = newTable.columns.filter(column => column.type === "enum" || column.type === "simple-enum");
        for (let column of enumColumns) {
            const oldEnumType = await this.getEnumTypeName(oldTable, column);
            upQueries.push(new Query_1.Query(`ALTER TYPE "${oldEnumType.enumTypeSchema}"."${oldEnumType.enumTypeName}" RENAME TO ${this.buildEnumName(newTable, column, false)}`));
            downQueries.push(new Query_1.Query(`ALTER TYPE ${this.buildEnumName(newTable, column)} RENAME TO "${oldEnumType.enumTypeName}"`));
        }
        await this.executeQueries(upQueries, downQueries);
    }
    /**
     * Creates a new column from the column in the table.
     */
    async addColumn(tableOrName, column) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        const clonedTable = table.clone();
        const upQueries = [];
        const downQueries = [];
        if (column.type === "enum" || column.type === "simple-enum") {
            const hasEnum = await this.hasEnumType(table, column);
            if (!hasEnum) {
                upQueries.push(this.createEnumTypeSql(table, column));
                downQueries.push(this.dropEnumTypeSql(table, column));
            }
        }
        upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD ${this.buildCreateColumnSql(table, column)}`));
        downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP COLUMN "${column.name}"`));
        // create or update primary key constraint
        if (column.isPrimary) {
            const primaryColumns = clonedTable.primaryColumns;
            // if table already have primary key, me must drop it and recreate again
            if (primaryColumns.length > 0) {
                const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, primaryColumns.map(column => column.name));
                const columnNames = primaryColumns.map(column => `"${column.name}"`).join(", ");
                upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));
                downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
            }
            primaryColumns.push(column);
            const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, primaryColumns.map(column => column.name));
            const columnNames = primaryColumns.map(column => `"${column.name}"`).join(", ");
            upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
            downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));
        }
        // create column index
        const columnIndex = clonedTable.indices.find(index => index.columnNames.length === 1 && index.columnNames[0] === column.name);
        if (columnIndex) {
            upQueries.push(this.createIndexSql(table, columnIndex));
            downQueries.push(this.dropIndexSql(table, columnIndex));
        }
        // create unique constraint
        if (column.isUnique) {
            const uniqueConstraint = new TableUnique_1.TableUnique({
                name: this.connection.namingStrategy.uniqueConstraintName(table.name, [column.name]),
                columnNames: [column.name]
            });
            clonedTable.uniques.push(uniqueConstraint);
            upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${uniqueConstraint.name}" UNIQUE ("${column.name}")`));
            downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${uniqueConstraint.name}"`));
        }
        await this.executeQueries(upQueries, downQueries);
        clonedTable.addColumn(column);
        this.replaceCachedTable(table, clonedTable);
    }
    /**
     * Creates a new columns from the column in the table.
     */
    async addColumns(tableOrName, columns) {
        await __1.PromiseUtils.runInSequence(columns, column => this.addColumn(tableOrName, column));
    }
    /**
     * Renames column in the given table.
     */
    async renameColumn(tableOrName, oldTableColumnOrName, newTableColumnOrName) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        const oldColumn = oldTableColumnOrName instanceof TableColumn_1.TableColumn ? oldTableColumnOrName : table.columns.find(c => c.name === oldTableColumnOrName);
        if (!oldColumn)
            throw new Error(`Column "${oldTableColumnOrName}" was not found in the "${table.name}" table.`);
        let newColumn;
        if (newTableColumnOrName instanceof TableColumn_1.TableColumn) {
            newColumn = newTableColumnOrName;
        }
        else {
            newColumn = oldColumn.clone();
            newColumn.name = newTableColumnOrName;
        }
        return this.changeColumn(table, oldColumn, newColumn);
    }
    /**
     * Changes a column in the table.
     */
    async changeColumn(tableOrName, oldTableColumnOrName, newColumn) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        let clonedTable = table.clone();
        const upQueries = [];
        const downQueries = [];
        const oldColumn = oldTableColumnOrName instanceof TableColumn_1.TableColumn
            ? oldTableColumnOrName
            : table.columns.find(column => column.name === oldTableColumnOrName);
        if (!oldColumn)
            throw new Error(`Column "${oldTableColumnOrName}" was not found in the "${table.name}" table.`);
        if (oldColumn.type !== newColumn.type || oldColumn.length !== newColumn.length) {
            // To avoid data conversion, we just recreate column
            await this.dropColumn(table, oldColumn);
            await this.addColumn(table, newColumn);
            // update cloned table
            clonedTable = table.clone();
        }
        else {
            if (oldColumn.name !== newColumn.name) {
                // rename column
                upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} RENAME COLUMN "${oldColumn.name}" TO "${newColumn.name}"`));
                downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} RENAME COLUMN "${newColumn.name}" TO "${oldColumn.name}"`));
                // rename ENUM type
                if (oldColumn.type === "enum" || oldColumn.type === "simple-enum") {
                    const oldEnumType = await this.getEnumTypeName(table, oldColumn);
                    upQueries.push(new Query_1.Query(`ALTER TYPE "${oldEnumType.enumTypeSchema}"."${oldEnumType.enumTypeName}" RENAME TO ${this.buildEnumName(table, newColumn, false)}`));
                    downQueries.push(new Query_1.Query(`ALTER TYPE ${this.buildEnumName(table, newColumn)} RENAME TO "${oldEnumType.enumTypeName}"`));
                }
                // rename column primary key constraint
                if (oldColumn.isPrimary === true) {
                    const primaryColumns = clonedTable.primaryColumns;
                    // build old primary constraint name
                    const columnNames = primaryColumns.map(column => column.name);
                    const oldPkName = this.connection.namingStrategy.primaryKeyName(clonedTable, columnNames);
                    // replace old column name with new column name
                    columnNames.splice(columnNames.indexOf(oldColumn.name), 1);
                    columnNames.push(newColumn.name);
                    // build new primary constraint name
                    const newPkName = this.connection.namingStrategy.primaryKeyName(clonedTable, columnNames);
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${oldPkName}" TO "${newPkName}"`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${newPkName}" TO "${oldPkName}"`));
                }
                // rename column sequence
                if (oldColumn.isGenerated === true && newColumn.generationStrategy === "increment") {
                    const schema = this.extractSchema(table);
                    // building sequence name. Sequence without schema needed because it must be supplied in RENAME TO without
                    // schema name, but schema needed in ALTER SEQUENCE argument.
                    const seqName = this.buildSequenceName(table, oldColumn.name, undefined, true, true);
                    const newSeqName = this.buildSequenceName(table, newColumn.name, undefined, true, true);
                    const up = schema ? `ALTER SEQUENCE "${schema}"."${seqName}" RENAME TO "${newSeqName}"` : `ALTER SEQUENCE "${seqName}" RENAME TO "${newSeqName}"`;
                    const down = schema ? `ALTER SEQUENCE "${schema}"."${newSeqName}" RENAME TO "${seqName}"` : `ALTER SEQUENCE "${newSeqName}" RENAME TO "${seqName}"`;
                    upQueries.push(new Query_1.Query(up));
                    downQueries.push(new Query_1.Query(down));
                }
                // rename unique constraints
                clonedTable.findColumnUniques(oldColumn).forEach(unique => {
                    // build new constraint name
                    unique.columnNames.splice(unique.columnNames.indexOf(oldColumn.name), 1);
                    unique.columnNames.push(newColumn.name);
                    const newUniqueName = this.connection.namingStrategy.uniqueConstraintName(clonedTable, unique.columnNames);
                    // build queries
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${unique.name}" TO "${newUniqueName}"`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${newUniqueName}" TO "${unique.name}"`));
                    // replace constraint name
                    unique.name = newUniqueName;
                });
                // rename index constraints
                clonedTable.findColumnIndices(oldColumn).forEach(index => {
                    // build new constraint name
                    index.columnNames.splice(index.columnNames.indexOf(oldColumn.name), 1);
                    index.columnNames.push(newColumn.name);
                    const schema = this.extractSchema(table);
                    const newIndexName = this.connection.namingStrategy.indexName(clonedTable, index.columnNames, index.where);
                    // build queries
                    const up = schema ? `ALTER INDEX "${schema}"."${index.name}" RENAME TO "${newIndexName}"` : `ALTER INDEX "${index.name}" RENAME TO "${newIndexName}"`;
                    const down = schema ? `ALTER INDEX "${schema}"."${newIndexName}" RENAME TO "${index.name}"` : `ALTER INDEX "${newIndexName}" RENAME TO "${index.name}"`;
                    upQueries.push(new Query_1.Query(up));
                    downQueries.push(new Query_1.Query(down));
                    // replace constraint name
                    index.name = newIndexName;
                });
                // rename foreign key constraints
                clonedTable.findColumnForeignKeys(oldColumn).forEach(foreignKey => {
                    // build new constraint name
                    foreignKey.columnNames.splice(foreignKey.columnNames.indexOf(oldColumn.name), 1);
                    foreignKey.columnNames.push(newColumn.name);
                    const newForeignKeyName = this.connection.namingStrategy.foreignKeyName(clonedTable, foreignKey.columnNames);
                    // build queries
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${foreignKey.name}" TO "${newForeignKeyName}"`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${newForeignKeyName}" TO "${foreignKey.name}"`));
                    // replace constraint name
                    foreignKey.name = newForeignKeyName;
                });
                // rename old column in the Table object
                const oldTableColumn = clonedTable.columns.find(column => column.name === oldColumn.name);
                clonedTable.columns[clonedTable.columns.indexOf(oldTableColumn)].name = newColumn.name;
                oldColumn.name = newColumn.name;
            }
            if (newColumn.precision !== oldColumn.precision || newColumn.scale !== oldColumn.scale) {
                upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" TYPE ${this.driver.createFullType(newColumn)}`));
                downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" TYPE ${this.driver.createFullType(oldColumn)}`));
            }
            if ((newColumn.type === "enum" || newColumn.type === "simple-enum")
                && (oldColumn.type === "enum" || oldColumn.type === "simple-enum")
                && !OrmUtils_1.OrmUtils.isArraysEqual(newColumn.enum, oldColumn.enum)) {
                const enumName = this.buildEnumName(table, newColumn);
                const arraySuffix = newColumn.isArray ? "[]" : "";
                const oldEnumName = this.buildEnumName(table, newColumn, true, false, true);
                const oldEnumNameWithoutSchema = this.buildEnumName(table, newColumn, false, false, true);
                const enumTypeBeforeColumnChange = await this.getEnumTypeName(table, oldColumn);
                // rename old ENUM
                upQueries.push(new Query_1.Query(`ALTER TYPE "${enumTypeBeforeColumnChange.enumTypeSchema}"."${enumTypeBeforeColumnChange.enumTypeName}" RENAME TO ${oldEnumNameWithoutSchema}`));
                downQueries.push(new Query_1.Query(`ALTER TYPE ${oldEnumName} RENAME TO  "${enumTypeBeforeColumnChange.enumTypeName}"`));
                // create new ENUM
                upQueries.push(this.createEnumTypeSql(table, newColumn));
                downQueries.push(this.dropEnumTypeSql(table, oldColumn));
                // if column have default value, we must drop it to avoid issues with type casting
                if (newColumn.default !== null && newColumn.default !== undefined) {
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" DROP DEFAULT`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" SET DEFAULT ${newColumn.default}`));
                }
                // build column types
                const upType = `${enumName}${arraySuffix} USING "${newColumn.name}"::"text"::${enumName}${arraySuffix}`;
                const downType = `${oldEnumName}${arraySuffix} USING "${newColumn.name}"::"text"::${oldEnumName}${arraySuffix}`;
                // update column to use new type
                upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" TYPE ${upType}`));
                downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" TYPE ${downType}`));
                // if column have default value and we dropped it before, we must bring it back
                if (newColumn.default !== null && newColumn.default !== undefined) {
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" SET DEFAULT ${newColumn.default}`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" DROP DEFAULT`));
                }
                // remove old ENUM
                upQueries.push(this.dropEnumTypeSql(table, newColumn, oldEnumName));
                downQueries.push(this.createEnumTypeSql(table, oldColumn, oldEnumName));
            }
            if (oldColumn.isNullable !== newColumn.isNullable) {
                if (newColumn.isNullable) {
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${oldColumn.name}" DROP NOT NULL`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${oldColumn.name}" SET NOT NULL`));
                }
                else {
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${oldColumn.name}" SET NOT NULL`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${oldColumn.name}" DROP NOT NULL`));
                }
            }
            if (oldColumn.comment !== newColumn.comment) {
                upQueries.push(new Query_1.Query(`COMMENT ON COLUMN ${this.escapePath(table)}."${oldColumn.name}" IS '${newColumn.comment}'`));
                downQueries.push(new Query_1.Query(`COMMENT ON COLUMN ${this.escapePath(table)}."${newColumn.name}" IS '${oldColumn.comment}'`));
            }
            if (newColumn.isPrimary !== oldColumn.isPrimary) {
                const primaryColumns = clonedTable.primaryColumns;
                // if primary column state changed, we must always drop existed constraint.
                if (primaryColumns.length > 0) {
                    const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, primaryColumns.map(column => column.name));
                    const columnNames = primaryColumns.map(column => `"${column.name}"`).join(", ");
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
                }
                if (newColumn.isPrimary === true) {
                    primaryColumns.push(newColumn);
                    // update column in table
                    const column = clonedTable.columns.find(column => column.name === newColumn.name);
                    column.isPrimary = true;
                    const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, primaryColumns.map(column => column.name));
                    const columnNames = primaryColumns.map(column => `"${column.name}"`).join(", ");
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));
                }
                else {
                    const primaryColumn = primaryColumns.find(c => c.name === newColumn.name);
                    primaryColumns.splice(primaryColumns.indexOf(primaryColumn), 1);
                    // update column in table
                    const column = clonedTable.columns.find(column => column.name === newColumn.name);
                    column.isPrimary = false;
                    // if we have another primary keys, we must recreate constraint.
                    if (primaryColumns.length > 0) {
                        const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, primaryColumns.map(column => column.name));
                        const columnNames = primaryColumns.map(column => `"${column.name}"`).join(", ");
                        upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
                        downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));
                    }
                }
            }
            if (newColumn.isUnique !== oldColumn.isUnique) {
                if (newColumn.isUnique === true) {
                    const uniqueConstraint = new TableUnique_1.TableUnique({
                        name: this.connection.namingStrategy.uniqueConstraintName(table.name, [newColumn.name]),
                        columnNames: [newColumn.name]
                    });
                    clonedTable.uniques.push(uniqueConstraint);
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${uniqueConstraint.name}" UNIQUE ("${newColumn.name}")`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${uniqueConstraint.name}"`));
                }
                else {
                    const uniqueConstraint = clonedTable.uniques.find(unique => {
                        return unique.columnNames.length === 1 && !!unique.columnNames.find(columnName => columnName === newColumn.name);
                    });
                    clonedTable.uniques.splice(clonedTable.uniques.indexOf(uniqueConstraint), 1);
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${uniqueConstraint.name}"`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${uniqueConstraint.name}" UNIQUE ("${newColumn.name}")`));
                }
            }
            if (oldColumn.isGenerated !== newColumn.isGenerated && newColumn.generationStrategy !== "uuid") {
                if (newColumn.isGenerated === true) {
                    upQueries.push(new Query_1.Query(`CREATE SEQUENCE ${this.buildSequenceName(table, newColumn)} OWNED BY ${this.escapePath(table)}."${newColumn.name}"`));
                    downQueries.push(new Query_1.Query(`DROP SEQUENCE ${this.buildSequenceName(table, newColumn)}`));
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" SET DEFAULT nextval('${this.buildSequenceName(table, newColumn, undefined, true)}')`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" DROP DEFAULT`));
                }
                else {
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" DROP DEFAULT`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" SET DEFAULT nextval('${this.buildSequenceName(table, newColumn, undefined, true)}')`));
                    upQueries.push(new Query_1.Query(`DROP SEQUENCE ${this.buildSequenceName(table, newColumn)}`));
                    downQueries.push(new Query_1.Query(`CREATE SEQUENCE ${this.buildSequenceName(table, newColumn)} OWNED BY ${this.escapePath(table)}."${newColumn.name}"`));
                }
            }
            if (newColumn.default !== oldColumn.default) {
                if (newColumn.default !== null && newColumn.default !== undefined) {
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" SET DEFAULT ${newColumn.default}`));
                    if (oldColumn.default !== null && oldColumn.default !== undefined) {
                        downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" SET DEFAULT ${oldColumn.default}`));
                    }
                    else {
                        downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" DROP DEFAULT`));
                    }
                }
                else if (oldColumn.default !== null && oldColumn.default !== undefined) {
                    upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" DROP DEFAULT`));
                    downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" SET DEFAULT ${oldColumn.default}`));
                }
            }
            if ((newColumn.spatialFeatureType || "").toLowerCase() !== (oldColumn.spatialFeatureType || "").toLowerCase() || newColumn.srid !== oldColumn.srid) {
                upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" TYPE ${this.driver.createFullType(newColumn)}`));
                downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" TYPE ${this.driver.createFullType(oldColumn)}`));
            }
        }
        await this.executeQueries(upQueries, downQueries);
        this.replaceCachedTable(table, clonedTable);
    }
    /**
     * Changes a column in the table.
     */
    async changeColumns(tableOrName, changedColumns) {
        await __1.PromiseUtils.runInSequence(changedColumns, changedColumn => this.changeColumn(tableOrName, changedColumn.oldColumn, changedColumn.newColumn));
    }
    /**
     * Drops column in the table.
     */
    async dropColumn(tableOrName, columnOrName) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        const column = columnOrName instanceof TableColumn_1.TableColumn ? columnOrName : table.findColumnByName(columnOrName);
        if (!column)
            throw new Error(`Column "${columnOrName}" was not found in table "${table.name}"`);
        const clonedTable = table.clone();
        const upQueries = [];
        const downQueries = [];
        // drop primary key constraint
        if (column.isPrimary) {
            const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, clonedTable.primaryColumns.map(column => column.name));
            const columnNames = clonedTable.primaryColumns.map(primaryColumn => `"${primaryColumn.name}"`).join(", ");
            upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(clonedTable)} DROP CONSTRAINT "${pkName}"`));
            downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(clonedTable)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
            // update column in table
            const tableColumn = clonedTable.findColumnByName(column.name);
            tableColumn.isPrimary = false;
            // if primary key have multiple columns, we must recreate it without dropped column
            if (clonedTable.primaryColumns.length > 0) {
                const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, clonedTable.primaryColumns.map(column => column.name));
                const columnNames = clonedTable.primaryColumns.map(primaryColumn => `"${primaryColumn.name}"`).join(", ");
                upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(clonedTable)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
                downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(clonedTable)} DROP CONSTRAINT "${pkName}"`));
            }
        }
        // drop column index
        const columnIndex = clonedTable.indices.find(index => index.columnNames.length === 1 && index.columnNames[0] === column.name);
        if (columnIndex) {
            clonedTable.indices.splice(clonedTable.indices.indexOf(columnIndex), 1);
            upQueries.push(this.dropIndexSql(table, columnIndex));
            downQueries.push(this.createIndexSql(table, columnIndex));
        }
        // drop column check
        const columnCheck = clonedTable.checks.find(check => !!check.columnNames && check.columnNames.length === 1 && check.columnNames[0] === column.name);
        if (columnCheck) {
            clonedTable.checks.splice(clonedTable.checks.indexOf(columnCheck), 1);
            upQueries.push(this.dropCheckConstraintSql(table, columnCheck));
            downQueries.push(this.createCheckConstraintSql(table, columnCheck));
        }
        // drop column unique
        const columnUnique = clonedTable.uniques.find(unique => unique.columnNames.length === 1 && unique.columnNames[0] === column.name);
        if (columnUnique) {
            clonedTable.uniques.splice(clonedTable.uniques.indexOf(columnUnique), 1);
            upQueries.push(this.dropUniqueConstraintSql(table, columnUnique));
            downQueries.push(this.createUniqueConstraintSql(table, columnUnique));
        }
        upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP COLUMN "${column.name}"`));
        downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD ${this.buildCreateColumnSql(table, column)}`));
        // drop enum type
        if (column.type === "enum" || column.type === "simple-enum") {
            const hasEnum = await this.hasEnumType(table, column);
            if (hasEnum) {
                const enumType = await this.getEnumTypeName(table, column);
                const escapedEnumName = `"${enumType.enumTypeSchema}"."${enumType.enumTypeName}"`;
                upQueries.push(this.dropEnumTypeSql(table, column, escapedEnumName));
                downQueries.push(this.createEnumTypeSql(table, column, escapedEnumName));
            }
        }
        await this.executeQueries(upQueries, downQueries);
        clonedTable.removeColumn(column);
        this.replaceCachedTable(table, clonedTable);
    }
    /**
     * Drops the columns in the table.
     */
    async dropColumns(tableOrName, columns) {
        await __1.PromiseUtils.runInSequence(columns, column => this.dropColumn(tableOrName, column));
    }
    /**
     * Creates a new primary key.
     */
    async createPrimaryKey(tableOrName, columnNames) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        const clonedTable = table.clone();
        const up = this.createPrimaryKeySql(table, columnNames);
        // mark columns as primary, because dropPrimaryKeySql build constraint name from table primary column names.
        clonedTable.columns.forEach(column => {
            if (columnNames.find(columnName => columnName === column.name))
                column.isPrimary = true;
        });
        const down = this.dropPrimaryKeySql(clonedTable);
        await this.executeQueries(up, down);
        this.replaceCachedTable(table, clonedTable);
    }
    /**
     * Updates composite primary keys.
     */
    async updatePrimaryKeys(tableOrName, columns) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        const clonedTable = table.clone();
        const columnNames = columns.map(column => column.name);
        const upQueries = [];
        const downQueries = [];
        // if table already have primary columns, we must drop them.
        const primaryColumns = clonedTable.primaryColumns;
        if (primaryColumns.length > 0) {
            const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, primaryColumns.map(column => column.name));
            const columnNamesString = primaryColumns.map(column => `"${column.name}"`).join(", ");
            upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));
            downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNamesString})`));
        }
        // update columns in table.
        clonedTable.columns
            .filter(column => columnNames.indexOf(column.name) !== -1)
            .forEach(column => column.isPrimary = true);
        const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, columnNames);
        const columnNamesString = columnNames.map(columnName => `"${columnName}"`).join(", ");
        upQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNamesString})`));
        downQueries.push(new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));
        await this.executeQueries(upQueries, downQueries);
        this.replaceCachedTable(table, clonedTable);
    }
    /**
     * Drops a primary key.
     */
    async dropPrimaryKey(tableOrName) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        const up = this.dropPrimaryKeySql(table);
        const down = this.createPrimaryKeySql(table, table.primaryColumns.map(column => column.name));
        await this.executeQueries(up, down);
        table.primaryColumns.forEach(column => {
            column.isPrimary = false;
        });
    }
    /**
     * Creates new unique constraint.
     */
    async createUniqueConstraint(tableOrName, uniqueConstraint) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        // new unique constraint may be passed without name. In this case we generate unique name manually.
        if (!uniqueConstraint.name)
            uniqueConstraint.name = this.connection.namingStrategy.uniqueConstraintName(table.name, uniqueConstraint.columnNames);
        const up = this.createUniqueConstraintSql(table, uniqueConstraint);
        const down = this.dropUniqueConstraintSql(table, uniqueConstraint);
        await this.executeQueries(up, down);
        table.addUniqueConstraint(uniqueConstraint);
    }
    /**
     * Creates new unique constraints.
     */
    async createUniqueConstraints(tableOrName, uniqueConstraints) {
        await __1.PromiseUtils.runInSequence(uniqueConstraints, uniqueConstraint => this.createUniqueConstraint(tableOrName, uniqueConstraint));
    }
    /**
     * Drops unique constraint.
     */
    async dropUniqueConstraint(tableOrName, uniqueOrName) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        const uniqueConstraint = uniqueOrName instanceof TableUnique_1.TableUnique ? uniqueOrName : table.uniques.find(u => u.name === uniqueOrName);
        if (!uniqueConstraint)
            throw new Error(`Supplied unique constraint was not found in table ${table.name}`);
        const up = this.dropUniqueConstraintSql(table, uniqueConstraint);
        const down = this.createUniqueConstraintSql(table, uniqueConstraint);
        await this.executeQueries(up, down);
        table.removeUniqueConstraint(uniqueConstraint);
    }
    /**
     * Drops unique constraints.
     */
    async dropUniqueConstraints(tableOrName, uniqueConstraints) {
        await __1.PromiseUtils.runInSequence(uniqueConstraints, uniqueConstraint => this.dropUniqueConstraint(tableOrName, uniqueConstraint));
    }
    /**
     * Creates new check constraint.
     */
    async createCheckConstraint(tableOrName, checkConstraint) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        // new unique constraint may be passed without name. In this case we generate unique name manually.
        if (!checkConstraint.name)
            checkConstraint.name = this.connection.namingStrategy.checkConstraintName(table.name, checkConstraint.expression);
        const up = this.createCheckConstraintSql(table, checkConstraint);
        const down = this.dropCheckConstraintSql(table, checkConstraint);
        await this.executeQueries(up, down);
        table.addCheckConstraint(checkConstraint);
    }
    /**
     * Creates new check constraints.
     */
    async createCheckConstraints(tableOrName, checkConstraints) {
        const promises = checkConstraints.map(checkConstraint => this.createCheckConstraint(tableOrName, checkConstraint));
        await Promise.all(promises);
    }
    /**
     * Drops check constraint.
     */
    async dropCheckConstraint(tableOrName, checkOrName) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        const checkConstraint = checkOrName instanceof TableCheck_1.TableCheck ? checkOrName : table.checks.find(c => c.name === checkOrName);
        if (!checkConstraint)
            throw new Error(`Supplied check constraint was not found in table ${table.name}`);
        const up = this.dropCheckConstraintSql(table, checkConstraint);
        const down = this.createCheckConstraintSql(table, checkConstraint);
        await this.executeQueries(up, down);
        table.removeCheckConstraint(checkConstraint);
    }
    /**
     * Drops check constraints.
     */
    async dropCheckConstraints(tableOrName, checkConstraints) {
        const promises = checkConstraints.map(checkConstraint => this.dropCheckConstraint(tableOrName, checkConstraint));
        await Promise.all(promises);
    }
    /**
     * Creates new exclusion constraint.
     */
    async createExclusionConstraint(tableOrName, exclusionConstraint) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        // new unique constraint may be passed without name. In this case we generate unique name manually.
        if (!exclusionConstraint.name)
            exclusionConstraint.name = this.connection.namingStrategy.exclusionConstraintName(table.name, exclusionConstraint.expression);
        const up = this.createExclusionConstraintSql(table, exclusionConstraint);
        const down = this.dropExclusionConstraintSql(table, exclusionConstraint);
        await this.executeQueries(up, down);
        table.addExclusionConstraint(exclusionConstraint);
    }
    /**
     * Creates new exclusion constraints.
     */
    async createExclusionConstraints(tableOrName, exclusionConstraints) {
        const promises = exclusionConstraints.map(exclusionConstraint => this.createExclusionConstraint(tableOrName, exclusionConstraint));
        await Promise.all(promises);
    }
    /**
     * Drops exclusion constraint.
     */
    async dropExclusionConstraint(tableOrName, exclusionOrName) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        const exclusionConstraint = exclusionOrName instanceof TableExclusion_1.TableExclusion ? exclusionOrName : table.exclusions.find(c => c.name === exclusionOrName);
        if (!exclusionConstraint)
            throw new Error(`Supplied exclusion constraint was not found in table ${table.name}`);
        const up = this.dropExclusionConstraintSql(table, exclusionConstraint);
        const down = this.createExclusionConstraintSql(table, exclusionConstraint);
        await this.executeQueries(up, down);
        table.removeExclusionConstraint(exclusionConstraint);
    }
    /**
     * Drops exclusion constraints.
     */
    async dropExclusionConstraints(tableOrName, exclusionConstraints) {
        const promises = exclusionConstraints.map(exclusionConstraint => this.dropExclusionConstraint(tableOrName, exclusionConstraint));
        await Promise.all(promises);
    }
    /**
     * Creates a new foreign key.
     */
    async createForeignKey(tableOrName, foreignKey) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        // new FK may be passed without name. In this case we generate FK name manually.
        if (!foreignKey.name)
            foreignKey.name = this.connection.namingStrategy.foreignKeyName(table.name, foreignKey.columnNames);
        const up = this.createForeignKeySql(table, foreignKey);
        const down = this.dropForeignKeySql(table, foreignKey);
        await this.executeQueries(up, down);
        table.addForeignKey(foreignKey);
    }
    /**
     * Creates a new foreign keys.
     */
    async createForeignKeys(tableOrName, foreignKeys) {
        await __1.PromiseUtils.runInSequence(foreignKeys, foreignKey => this.createForeignKey(tableOrName, foreignKey));
    }
    /**
     * Drops a foreign key from the table.
     */
    async dropForeignKey(tableOrName, foreignKeyOrName) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        const foreignKey = foreignKeyOrName instanceof TableForeignKey_1.TableForeignKey ? foreignKeyOrName : table.foreignKeys.find(fk => fk.name === foreignKeyOrName);
        if (!foreignKey)
            throw new Error(`Supplied foreign key was not found in table ${table.name}`);
        const up = this.dropForeignKeySql(table, foreignKey);
        const down = this.createForeignKeySql(table, foreignKey);
        await this.executeQueries(up, down);
        table.removeForeignKey(foreignKey);
    }
    /**
     * Drops a foreign keys from the table.
     */
    async dropForeignKeys(tableOrName, foreignKeys) {
        await __1.PromiseUtils.runInSequence(foreignKeys, foreignKey => this.dropForeignKey(tableOrName, foreignKey));
    }
    /**
     * Creates a new index.
     */
    async createIndex(tableOrName, index) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        // new index may be passed without name. In this case we generate index name manually.
        if (!index.name)
            index.name = this.connection.namingStrategy.indexName(table.name, index.columnNames, index.where);
        const up = this.createIndexSql(table, index);
        const down = this.dropIndexSql(table, index);
        await this.executeQueries(up, down);
        table.addIndex(index);
    }
    /**
     * Creates a new indices
     */
    async createIndices(tableOrName, indices) {
        await __1.PromiseUtils.runInSequence(indices, index => this.createIndex(tableOrName, index));
    }
    /**
     * Drops an index from the table.
     */
    async dropIndex(tableOrName, indexOrName) {
        const table = tableOrName instanceof Table_1.Table ? tableOrName : await this.getCachedTable(tableOrName);
        const index = indexOrName instanceof TableIndex_1.TableIndex ? indexOrName : table.indices.find(i => i.name === indexOrName);
        if (!index)
            throw new Error(`Supplied index was not found in table ${table.name}`);
        const up = this.dropIndexSql(table, index);
        const down = this.createIndexSql(table, index);
        await this.executeQueries(up, down);
        table.removeIndex(index);
    }
    /**
     * Drops an indices from the table.
     */
    async dropIndices(tableOrName, indices) {
        await __1.PromiseUtils.runInSequence(indices, index => this.dropIndex(tableOrName, index));
    }
    /**
     * Clears all table contents.
     * Note: this operation uses SQL's TRUNCATE query which cannot be reverted in transactions.
     */
    async clearTable(tableName) {
        await this.query(`TRUNCATE TABLE ${this.escapePath(tableName)}`);
    }
    /**
     * Removes all tables from the currently connected database.
     */
    async clearDatabase() {
        const schemas = [];
        this.connection.entityMetadatas
            .filter(metadata => metadata.schema)
            .forEach(metadata => {
            const isSchemaExist = !!schemas.find(schema => schema === metadata.schema);
            if (!isSchemaExist)
                schemas.push(metadata.schema);
        });
        schemas.push(this.driver.options.schema || "current_schema()");
        const schemaNamesString = schemas.map(name => {
            return name === "current_schema()" ? name : "'" + name + "'";
        }).join(", ");
        await this.startTransaction();
        try {
            const selectViewDropsQuery = `SELECT 'DROP VIEW IF EXISTS "' || schemaname || '"."' || viewname || '" CASCADE;' as "query" ` +
                `FROM "pg_views" WHERE "schemaname" IN (${schemaNamesString}) AND "viewname" NOT IN ('geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')`;
            const dropViewQueries = await this.query(selectViewDropsQuery);
            await Promise.all(dropViewQueries.map(q => this.query(q["query"])));
            // ignore spatial_ref_sys; it's a special table supporting PostGIS
            // TODO generalize this as this.driver.ignoreTables
            const selectTableDropsQuery = `SELECT 'DROP TABLE IF EXISTS "' || schemaname || '"."' || tablename || '" CASCADE;' as "query" FROM "pg_tables" WHERE "schemaname" IN (${schemaNamesString}) AND "tablename" NOT IN ('spatial_ref_sys')`;
            const dropTableQueries = await this.query(selectTableDropsQuery);
            await Promise.all(dropTableQueries.map(q => this.query(q["query"])));
            await this.dropEnumTypes(schemaNamesString);
            await this.commitTransaction();
        }
        catch (error) {
            try { // we throw original error even if rollback thrown an error
                await this.rollbackTransaction();
            }
            catch (rollbackError) { }
            throw error;
        }
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    async loadViews(viewNames) {
        const hasTable = await this.hasTable(this.getTypeormMetadataTableName());
        if (!hasTable)
            return Promise.resolve([]);
        const currentSchemaQuery = await this.query(`SELECT * FROM current_schema()`);
        const currentSchema = currentSchemaQuery[0]["current_schema"];
        const viewsCondition = viewNames.map(viewName => {
            let [schema, name] = viewName.split(".");
            if (!name) {
                name = schema;
                schema = this.driver.options.schema || currentSchema;
            }
            return `("t"."schema" = '${schema}' AND "t"."name" = '${name}')`;
        }).join(" OR ");
        const query = `SELECT "t".*, "v"."check_option" FROM ${this.escapePath(this.getTypeormMetadataTableName())} "t" ` +
            `INNER JOIN "information_schema"."views" "v" ON "v"."table_schema" = "t"."schema" AND "v"."table_name" = "t"."name" WHERE "t"."type" = 'VIEW' ${viewsCondition ? `AND (${viewsCondition})` : ""}`;
        const dbViews = await this.query(query);
        return dbViews.map((dbView) => {
            const view = new View_1.View();
            const schema = dbView["schema"] === currentSchema && !this.driver.options.schema ? undefined : dbView["schema"];
            view.name = this.driver.buildTableName(dbView["name"], schema);
            view.expression = dbView["value"];
            return view;
        });
    }
    /**
     * Loads all tables (with given names) from the database and creates a Table from them.
     */
    async loadTables(tableNames) {
        // if no tables given then no need to proceed
        if (!tableNames || !tableNames.length)
            return [];
        const currentSchemaQuery = await this.query(`SELECT * FROM current_schema()`);
        const currentSchema = currentSchemaQuery[0]["current_schema"];
        const tablesCondition = tableNames.map(tableName => {
            let [schema, name] = tableName.split(".");
            if (!name) {
                name = schema;
                schema = this.driver.options.schema || currentSchema;
            }
            return `("table_schema" = '${schema}' AND "table_name" = '${name}')`;
        }).join(" OR ");
        const tablesSql = `SELECT * FROM "information_schema"."tables" WHERE ` + tablesCondition;
        const columnsSql = `SELECT *, ('"' || "udt_schema" || '"."' || "udt_name" || '"')::"regtype" AS "regtype" FROM "information_schema"."columns" WHERE ` + tablesCondition;
        const constraintsCondition = tableNames.map(tableName => {
            let [schema, name] = tableName.split(".");
            if (!name) {
                name = schema;
                schema = this.driver.options.schema || currentSchema;
            }
            return `("ns"."nspname" = '${schema}' AND "t"."relname" = '${name}')`;
        }).join(" OR ");
        const constraintsSql = `SELECT "ns"."nspname" AS "table_schema", "t"."relname" AS "table_name", "cnst"."conname" AS "constraint_name", ` +
            `CASE "cnst"."contype" WHEN 'x' THEN pg_get_constraintdef("cnst"."oid", true) ELSE "cnst"."consrc" END AS "expression", ` +
            `CASE "cnst"."contype" WHEN 'p' THEN 'PRIMARY' WHEN 'u' THEN 'UNIQUE' WHEN 'c' THEN 'CHECK' WHEN 'x' THEN 'EXCLUDE' END AS "constraint_type", "a"."attname" AS "column_name" ` +
            `FROM "pg_constraint" "cnst" ` +
            `INNER JOIN "pg_class" "t" ON "t"."oid" = "cnst"."conrelid" ` +
            `INNER JOIN "pg_namespace" "ns" ON "ns"."oid" = "cnst"."connamespace" ` +
            `LEFT JOIN "pg_attribute" "a" ON "a"."attrelid" = "cnst"."conrelid" AND "a"."attnum" = ANY ("cnst"."conkey") ` +
            `WHERE "t"."relkind" = 'r' AND (${constraintsCondition})`;
        const indicesSql = `SELECT "ns"."nspname" AS "table_schema", "t"."relname" AS "table_name", "i"."relname" AS "constraint_name", "a"."attname" AS "column_name", ` +
            `CASE "ix"."indisunique" WHEN 't' THEN 'TRUE' ELSE'FALSE' END AS "is_unique", pg_get_expr("ix"."indpred", "ix"."indrelid") AS "condition", ` +
            `"types"."typname" AS "type_name" ` +
            `FROM "pg_class" "t" ` +
            `INNER JOIN "pg_index" "ix" ON "ix"."indrelid" = "t"."oid" ` +
            `INNER JOIN "pg_attribute" "a" ON "a"."attrelid" = "t"."oid"  AND "a"."attnum" = ANY ("ix"."indkey") ` +
            `INNER JOIN "pg_namespace" "ns" ON "ns"."oid" = "t"."relnamespace" ` +
            `INNER JOIN "pg_class" "i" ON "i"."oid" = "ix"."indexrelid" ` +
            `INNER JOIN "pg_type" "types" ON "types"."oid" = "a"."atttypid" ` +
            `LEFT JOIN "pg_constraint" "cnst" ON "cnst"."conname" = "i"."relname" ` +
            `WHERE "t"."relkind" = 'r' AND "cnst"."contype" IS NULL AND (${constraintsCondition})`;
        const foreignKeysCondition = tableNames.map(tableName => {
            let [schema, name] = tableName.split(".");
            if (!name) {
                name = schema;
                schema = this.driver.options.schema || currentSchema;
            }
            return `("ns"."nspname" = '${schema}' AND "cl"."relname" = '${name}')`;
        }).join(" OR ");
        const foreignKeysSql = `SELECT "con"."conname" AS "constraint_name", "con"."nspname" AS "table_schema", "con"."relname" AS "table_name", "att2"."attname" AS "column_name", ` +
            `"ns"."nspname" AS "referenced_table_schema", "cl"."relname" AS "referenced_table_name", "att"."attname" AS "referenced_column_name", "con"."confdeltype" AS "on_delete", ` +
            `"con"."confupdtype" AS "on_update", "con"."condeferrable" AS "deferrable", "con"."condeferred" AS "deferred" ` +
            `FROM ( ` +
            `SELECT UNNEST ("con1"."conkey") AS "parent", UNNEST ("con1"."confkey") AS "child", "con1"."confrelid", "con1"."conrelid", "con1"."conname", "con1"."contype", "ns"."nspname", ` +
            `"cl"."relname", "con1"."condeferrable", ` +
            `CASE WHEN "con1"."condeferred" THEN 'INITIALLY DEFERRED' ELSE 'INITIALLY IMMEDIATE' END as condeferred, ` +
            `CASE "con1"."confdeltype" WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END as "confdeltype", ` +
            `CASE "con1"."confupdtype" WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END as "confupdtype" ` +
            `FROM "pg_class" "cl" ` +
            `INNER JOIN "pg_namespace" "ns" ON "cl"."relnamespace" = "ns"."oid" ` +
            `INNER JOIN "pg_constraint" "con1" ON "con1"."conrelid" = "cl"."oid" ` +
            `WHERE "con1"."contype" = 'f' AND (${foreignKeysCondition}) ` +
            `) "con" ` +
            `INNER JOIN "pg_attribute" "att" ON "att"."attrelid" = "con"."confrelid" AND "att"."attnum" = "con"."child" ` +
            `INNER JOIN "pg_class" "cl" ON "cl"."oid" = "con"."confrelid" ` +
            `INNER JOIN "pg_namespace" "ns" ON "cl"."relnamespace" = "ns"."oid" ` +
            `INNER JOIN "pg_attribute" "att2" ON "att2"."attrelid" = "con"."conrelid" AND "att2"."attnum" = "con"."parent"`;
        const [dbTables, dbColumns, dbConstraints, dbIndices, dbForeignKeys] = await Promise.all([
            this.query(tablesSql),
            this.query(columnsSql),
            this.query(constraintsSql),
            this.query(indicesSql),
            this.query(foreignKeysSql),
        ]);
        // if tables were not found in the db, no need to proceed
        if (!dbTables.length)
            return [];
        // create tables for loaded tables
        return Promise.all(dbTables.map(async (dbTable) => {
            const table = new Table_1.Table();
            // We do not need to join schema name, when database is by default.
            // In this case we need local variable `tableFullName` for below comparision.
            const schema = dbTable["table_schema"] === currentSchema && !this.driver.options.schema ? undefined : dbTable["table_schema"];
            table.name = this.driver.buildTableName(dbTable["table_name"], schema);
            const tableFullName = this.driver.buildTableName(dbTable["table_name"], dbTable["table_schema"]);
            // create columns from the loaded columns
            table.columns = await Promise.all(dbColumns
                .filter(dbColumn => this.driver.buildTableName(dbColumn["table_name"], dbColumn["table_schema"]) === tableFullName)
                .map(async (dbColumn) => {
                const columnConstraints = dbConstraints.filter(dbConstraint => {
                    return this.driver.buildTableName(dbConstraint["table_name"], dbConstraint["table_schema"]) === tableFullName && dbConstraint["column_name"] === dbColumn["column_name"];
                });
                const tableColumn = new TableColumn_1.TableColumn();
                tableColumn.name = dbColumn["column_name"];
                tableColumn.type = dbColumn["regtype"].toLowerCase();
                if (tableColumn.type === "numeric" || tableColumn.type === "decimal" || tableColumn.type === "float") {
                    // If one of these properties was set, and another was not, Postgres sets '0' in to unspecified property
                    // we set 'undefined' in to unspecified property to avoid changing column on sync
                    if (dbColumn["numeric_precision"] !== null && !this.isDefaultColumnPrecision(table, tableColumn, dbColumn["numeric_precision"])) {
                        tableColumn.precision = dbColumn["numeric_precision"];
                    }
                    else if (dbColumn["numeric_scale"] !== null && !this.isDefaultColumnScale(table, tableColumn, dbColumn["numeric_scale"])) {
                        tableColumn.precision = undefined;
                    }
                    if (dbColumn["numeric_scale"] !== null && !this.isDefaultColumnScale(table, tableColumn, dbColumn["numeric_scale"])) {
                        tableColumn.scale = dbColumn["numeric_scale"];
                    }
                    else if (dbColumn["numeric_precision"] !== null && !this.isDefaultColumnPrecision(table, tableColumn, dbColumn["numeric_precision"])) {
                        tableColumn.scale = undefined;
                    }
                }
                if (dbColumn["data_type"].toLowerCase() === "array") {
                    tableColumn.isArray = true;
                    const type = tableColumn.type.replace("[]", "");
                    tableColumn.type = this.connection.driver.normalizeType({ type: type });
                }
                if (tableColumn.type === "interval"
                    || tableColumn.type === "time without time zone"
                    || tableColumn.type === "time with time zone"
                    || tableColumn.type === "timestamp without time zone"
                    || tableColumn.type === "timestamp with time zone") {
                    tableColumn.precision = !this.isDefaultColumnPrecision(table, tableColumn, dbColumn["datetime_precision"]) ? dbColumn["datetime_precision"] : undefined;
                }
                if (tableColumn.type.indexOf("enum") !== -1) {
                    tableColumn.type = "enum";
                    const sql = `SELECT "e"."enumlabel" AS "value" FROM "pg_enum" "e" ` +
                        `INNER JOIN "pg_type" "t" ON "t"."oid" = "e"."enumtypid" ` +
                        `INNER JOIN "pg_namespace" "n" ON "n"."oid" = "t"."typnamespace" ` +
                        `WHERE "n"."nspname" = '${dbTable["table_schema"]}' AND "t"."typname" = '${this.buildEnumName(table, tableColumn.name, false, true)}'`;
                    const results = await this.query(sql);
                    tableColumn.enum = results.map(result => result["value"]);
                }
                if (tableColumn.type === "geometry") {
                    const geometryColumnSql = `SELECT * FROM (
                        SELECT
                          "f_table_schema" "table_schema",
                          "f_table_name" "table_name",
                          "f_geometry_column" "column_name",
                          "srid",
                          "type"
                        FROM "geometry_columns"
                      ) AS _
                      WHERE ${tablesCondition} AND "column_name" = '${tableColumn.name}'`;
                    const results = await this.query(geometryColumnSql);
                    tableColumn.spatialFeatureType = results[0].type;
                    tableColumn.srid = results[0].srid;
                }
                if (tableColumn.type === "geography") {
                    const geographyColumnSql = `SELECT * FROM (
                        SELECT
                          "f_table_schema" "table_schema",
                          "f_table_name" "table_name",
                          "f_geography_column" "column_name",
                          "srid",
                          "type"
                        FROM "geography_columns"
                      ) AS _
                      WHERE ${tablesCondition} AND "column_name" = '${tableColumn.name}'`;
                    const results = await this.query(geographyColumnSql);
                    tableColumn.spatialFeatureType = results[0].type;
                    tableColumn.srid = results[0].srid;
                }
                // check only columns that have length property
                if (this.driver.withLengthColumnTypes.indexOf(tableColumn.type) !== -1 && dbColumn["character_maximum_length"]) {
                    const length = dbColumn["character_maximum_length"].toString();
                    tableColumn.length = !this.isDefaultColumnLength(table, tableColumn, length) ? length : "";
                }
                tableColumn.isNullable = dbColumn["is_nullable"] === "YES";
                tableColumn.isPrimary = !!columnConstraints.find(constraint => constraint["constraint_type"] === "PRIMARY");
                const uniqueConstraint = columnConstraints.find(constraint => constraint["constraint_type"] === "UNIQUE");
                const isConstraintComposite = uniqueConstraint
                    ? !!dbConstraints.find(dbConstraint => dbConstraint["constraint_type"] === "UNIQUE"
                        && dbConstraint["constraint_name"] === uniqueConstraint["constraint_name"]
                        && dbConstraint["column_name"] !== dbColumn["column_name"])
                    : false;
                tableColumn.isUnique = !!uniqueConstraint && !isConstraintComposite;
                if (dbColumn["column_default"] !== null && dbColumn["column_default"] !== undefined) {
                    if (dbColumn["column_default"].replace(/"/gi, "") === `nextval('${this.buildSequenceName(table, dbColumn["column_name"], currentSchema, true)}'::regclass)`) {
                        tableColumn.isGenerated = true;
                        tableColumn.generationStrategy = "increment";
                    }
                    else if (dbColumn["column_default"] === "gen_random_uuid()" || /^uuid_generate_v\d\(\)/.test(dbColumn["column_default"])) {
                        tableColumn.isGenerated = true;
                        tableColumn.generationStrategy = "uuid";
                    }
                    else {
                        tableColumn.default = dbColumn["column_default"].replace(/::.*/, "");
                    }
                }
                tableColumn.comment = ""; // dbColumn["COLUMN_COMMENT"];
                if (dbColumn["character_set_name"])
                    tableColumn.charset = dbColumn["character_set_name"];
                if (dbColumn["collation_name"])
                    tableColumn.collation = dbColumn["collation_name"];
                return tableColumn;
            }));
            // find unique constraints of table, group them by constraint name and build TableUnique.
            const tableUniqueConstraints = OrmUtils_1.OrmUtils.uniq(dbConstraints.filter(dbConstraint => {
                return this.driver.buildTableName(dbConstraint["table_name"], dbConstraint["table_schema"]) === tableFullName
                    && dbConstraint["constraint_type"] === "UNIQUE";
            }), dbConstraint => dbConstraint["constraint_name"]);
            table.uniques = tableUniqueConstraints.map(constraint => {
                const uniques = dbConstraints.filter(dbC => dbC["constraint_name"] === constraint["constraint_name"]);
                return new TableUnique_1.TableUnique({
                    name: constraint["constraint_name"],
                    columnNames: uniques.map(u => u["column_name"])
                });
            });
            // find check constraints of table, group them by constraint name and build TableCheck.
            const tableCheckConstraints = OrmUtils_1.OrmUtils.uniq(dbConstraints.filter(dbConstraint => {
                return this.driver.buildTableName(dbConstraint["table_name"], dbConstraint["table_schema"]) === tableFullName
                    && dbConstraint["constraint_type"] === "CHECK";
            }), dbConstraint => dbConstraint["constraint_name"]);
            table.checks = tableCheckConstraints.map(constraint => {
                const checks = dbConstraints.filter(dbC => dbC["constraint_name"] === constraint["constraint_name"]);
                return new TableCheck_1.TableCheck({
                    name: constraint["constraint_name"],
                    columnNames: checks.map(c => c["column_name"]),
                    expression: constraint["expression"] // column names are not escaped, may cause problems
                });
            });
            // find exclusion constraints of table, group them by constraint name and build TableExclusion.
            const tableExclusionConstraints = OrmUtils_1.OrmUtils.uniq(dbConstraints.filter(dbConstraint => {
                return this.driver.buildTableName(dbConstraint["table_name"], dbConstraint["table_schema"]) === tableFullName
                    && dbConstraint["constraint_type"] === "EXCLUDE";
            }), dbConstraint => dbConstraint["constraint_name"]);
            table.exclusions = tableExclusionConstraints.map(constraint => {
                return new TableExclusion_1.TableExclusion({
                    name: constraint["constraint_name"],
                    expression: constraint["expression"].substring(8) // trim EXCLUDE from start of expression
                });
            });
            // find foreign key constraints of table, group them by constraint name and build TableForeignKey.
            const tableForeignKeyConstraints = OrmUtils_1.OrmUtils.uniq(dbForeignKeys.filter(dbForeignKey => {
                return this.driver.buildTableName(dbForeignKey["table_name"], dbForeignKey["table_schema"]) === tableFullName;
            }), dbForeignKey => dbForeignKey["constraint_name"]);
            table.foreignKeys = tableForeignKeyConstraints.map(dbForeignKey => {
                const foreignKeys = dbForeignKeys.filter(dbFk => dbFk["constraint_name"] === dbForeignKey["constraint_name"]);
                // if referenced table located in currently used schema, we don't need to concat schema name to table name.
                const schema = dbForeignKey["referenced_table_schema"] === currentSchema ? undefined : dbTable["referenced_table_schema"];
                const referencedTableName = this.driver.buildTableName(dbForeignKey["referenced_table_name"], schema);
                return new TableForeignKey_1.TableForeignKey({
                    name: dbForeignKey["constraint_name"],
                    columnNames: foreignKeys.map(dbFk => dbFk["column_name"]),
                    referencedTableName: referencedTableName,
                    referencedColumnNames: foreignKeys.map(dbFk => dbFk["referenced_column_name"]),
                    onDelete: dbForeignKey["on_delete"],
                    onUpdate: dbForeignKey["on_update"],
                    deferrable: dbForeignKey["deferrable"] ? dbForeignKey["deferred"] : undefined,
                });
            });
            // find index constraints of table, group them by constraint name and build TableIndex.
            const tableIndexConstraints = OrmUtils_1.OrmUtils.uniq(dbIndices.filter(dbIndex => {
                return this.driver.buildTableName(dbIndex["table_name"], dbIndex["table_schema"]) === tableFullName;
            }), dbIndex => dbIndex["constraint_name"]);
            table.indices = tableIndexConstraints.map(constraint => {
                const indices = dbIndices.filter(index => {
                    return index["table_schema"] === constraint["table_schema"]
                        && index["table_name"] === constraint["table_name"]
                        && index["constraint_name"] === constraint["constraint_name"];
                });
                return new TableIndex_1.TableIndex({
                    table: table,
                    name: constraint["constraint_name"],
                    columnNames: indices.map(i => i["column_name"]),
                    isUnique: constraint["is_unique"] === "TRUE",
                    where: constraint["condition"],
                    isSpatial: indices.every(i => this.driver.spatialTypes.indexOf(i["type_name"]) >= 0),
                    isFulltext: false
                });
            });
            return table;
        }));
    }
    /**
     * Builds create table sql.
     */
    createTableSql(table, createForeignKeys) {
        const columnDefinitions = table.columns.map(column => this.buildCreateColumnSql(table, column)).join(", ");
        let sql = `CREATE TABLE ${this.escapePath(table)} (${columnDefinitions}`;
        table.columns
            .filter(column => column.isUnique)
            .forEach(column => {
            const isUniqueExist = table.uniques.some(unique => unique.columnNames.length === 1 && unique.columnNames[0] === column.name);
            if (!isUniqueExist)
                table.uniques.push(new TableUnique_1.TableUnique({
                    name: this.connection.namingStrategy.uniqueConstraintName(table.name, [column.name]),
                    columnNames: [column.name]
                }));
        });
        if (table.uniques.length > 0) {
            const uniquesSql = table.uniques.map(unique => {
                const uniqueName = unique.name ? unique.name : this.connection.namingStrategy.uniqueConstraintName(table.name, unique.columnNames);
                const columnNames = unique.columnNames.map(columnName => `"${columnName}"`).join(", ");
                return `CONSTRAINT "${uniqueName}" UNIQUE (${columnNames})`;
            }).join(", ");
            sql += `, ${uniquesSql}`;
        }
        if (table.checks.length > 0) {
            const checksSql = table.checks.map(check => {
                const checkName = check.name ? check.name : this.connection.namingStrategy.checkConstraintName(table.name, check.expression);
                return `CONSTRAINT "${checkName}" CHECK (${check.expression})`;
            }).join(", ");
            sql += `, ${checksSql}`;
        }
        if (table.exclusions.length > 0) {
            const exclusionsSql = table.exclusions.map(exclusion => {
                const exclusionName = exclusion.name ? exclusion.name : this.connection.namingStrategy.exclusionConstraintName(table.name, exclusion.expression);
                return `CONSTRAINT "${exclusionName}" EXCLUDE ${exclusion.expression}`;
            }).join(", ");
            sql += `, ${exclusionsSql}`;
        }
        if (table.foreignKeys.length > 0 && createForeignKeys) {
            const foreignKeysSql = table.foreignKeys.map(fk => {
                const columnNames = fk.columnNames.map(columnName => `"${columnName}"`).join(", ");
                if (!fk.name)
                    fk.name = this.connection.namingStrategy.foreignKeyName(table.name, fk.columnNames);
                const referencedColumnNames = fk.referencedColumnNames.map(columnName => `"${columnName}"`).join(", ");
                let constraint = `CONSTRAINT "${fk.name}" FOREIGN KEY (${columnNames}) REFERENCES ${this.escapePath(fk.referencedTableName)} (${referencedColumnNames})`;
                if (fk.onDelete)
                    constraint += ` ON DELETE ${fk.onDelete}`;
                if (fk.onUpdate)
                    constraint += ` ON UPDATE ${fk.onUpdate}`;
                if (fk.deferrable)
                    constraint += ` DEFERRABLE ${fk.deferrable}`;
                return constraint;
            }).join(", ");
            sql += `, ${foreignKeysSql}`;
        }
        const primaryColumns = table.columns.filter(column => column.isPrimary);
        if (primaryColumns.length > 0) {
            const primaryKeyName = this.connection.namingStrategy.primaryKeyName(table.name, primaryColumns.map(column => column.name));
            const columnNames = primaryColumns.map(column => `"${column.name}"`).join(", ");
            sql += `, CONSTRAINT "${primaryKeyName}" PRIMARY KEY (${columnNames})`;
        }
        sql += `)`;
        return new Query_1.Query(sql);
    }
    /**
     * Builds drop table sql.
     */
    dropTableSql(tableOrPath) {
        return new Query_1.Query(`DROP TABLE ${this.escapePath(tableOrPath)}`);
    }
    createViewSql(view) {
        if (typeof view.expression === "string") {
            return new Query_1.Query(`CREATE VIEW ${this.escapePath(view)} AS ${view.expression}`);
        }
        else {
            return new Query_1.Query(`CREATE VIEW ${this.escapePath(view)} AS ${view.expression(this.connection).getQuery()}`);
        }
    }
    async insertViewDefinitionSql(view) {
        const currentSchemaQuery = await this.query(`SELECT * FROM current_schema()`);
        const currentSchema = currentSchemaQuery[0]["current_schema"];
        const splittedName = view.name.split(".");
        let schema = this.driver.options.schema || currentSchema;
        let name = view.name;
        if (splittedName.length === 2) {
            schema = splittedName[0];
            name = splittedName[1];
        }
        const expression = typeof view.expression === "string" ? view.expression.trim() : view.expression(this.connection).getQuery();
        const [query, parameters] = this.connection.createQueryBuilder()
            .insert()
            .into(this.getTypeormMetadataTableName())
            .values({ type: "VIEW", schema: schema, name: name, value: expression })
            .getQueryAndParameters();
        return new Query_1.Query(query, parameters);
    }
    /**
     * Builds drop view sql.
     */
    dropViewSql(viewOrPath) {
        return new Query_1.Query(`DROP VIEW ${this.escapePath(viewOrPath)}`);
    }
    /**
     * Builds remove view sql.
     */
    async deleteViewDefinitionSql(viewOrPath) {
        const currentSchemaQuery = await this.query(`SELECT * FROM current_schema()`);
        const currentSchema = currentSchemaQuery[0]["current_schema"];
        const viewName = viewOrPath instanceof View_1.View ? viewOrPath.name : viewOrPath;
        const splittedName = viewName.split(".");
        let schema = this.driver.options.schema || currentSchema;
        let name = viewName;
        if (splittedName.length === 2) {
            schema = splittedName[0];
            name = splittedName[1];
        }
        const qb = this.connection.createQueryBuilder();
        const [query, parameters] = qb.delete()
            .from(this.getTypeormMetadataTableName())
            .where(`${qb.escape("type")} = 'VIEW'`)
            .andWhere(`${qb.escape("schema")} = :schema`, { schema })
            .andWhere(`${qb.escape("name")} = :name`, { name })
            .getQueryAndParameters();
        return new Query_1.Query(query, parameters);
    }
    /**
     * Extracts schema name from given Table object or table name string.
     */
    extractSchema(target) {
        const tableName = target instanceof Table_1.Table ? target.name : target;
        return tableName.indexOf(".") === -1 ? this.driver.options.schema : tableName.split(".")[0];
    }
    /**
     * Drops ENUM type from given schemas.
     */
    async dropEnumTypes(schemaNames) {
        const selectDropsQuery = `SELECT 'DROP TYPE IF EXISTS "' || n.nspname || '"."' || t.typname || '" CASCADE;' as "query" FROM "pg_type" "t" ` +
            `INNER JOIN "pg_enum" "e" ON "e"."enumtypid" = "t"."oid" ` +
            `INNER JOIN "pg_namespace" "n" ON "n"."oid" = "t"."typnamespace" ` +
            `WHERE "n"."nspname" IN (${schemaNames}) GROUP BY "n"."nspname", "t"."typname"`;
        const dropQueries = await this.query(selectDropsQuery);
        await Promise.all(dropQueries.map(q => this.query(q["query"])));
    }
    /**
     * Checks if enum with the given name exist in the database.
     */
    async hasEnumType(table, column) {
        const schema = this.parseTableName(table).schema;
        const enumName = this.buildEnumName(table, column, false, true);
        const sql = `SELECT "n"."nspname", "t"."typname" FROM "pg_type" "t" ` +
            `INNER JOIN "pg_namespace" "n" ON "n"."oid" = "t"."typnamespace" ` +
            `WHERE "n"."nspname" = ${schema} AND "t"."typname" = '${enumName}'`;
        const result = await this.query(sql);
        return result.length ? true : false;
    }
    /**
     * Builds create ENUM type sql.
     */
    createEnumTypeSql(table, column, enumName) {
        if (!enumName)
            enumName = this.buildEnumName(table, column);
        const enumValues = column.enum.map(value => `'${value}'`).join(", ");
        return new Query_1.Query(`CREATE TYPE ${enumName} AS ENUM(${enumValues})`);
    }
    /**
     * Builds create ENUM type sql.
     */
    dropEnumTypeSql(table, column, enumName) {
        if (!enumName)
            enumName = this.buildEnumName(table, column);
        return new Query_1.Query(`DROP TYPE ${enumName}`);
    }
    /**
     * Builds create index sql.
     */
    createIndexSql(table, index) {
        const columns = index.columnNames.map(columnName => `"${columnName}"`).join(", ");
        return new Query_1.Query(`CREATE ${index.isUnique ? "UNIQUE " : ""}INDEX "${index.name}" ON ${this.escapePath(table)} ${index.isSpatial ? "USING GiST " : ""}(${columns}) ${index.where ? "WHERE " + index.where : ""}`);
    }
    /**
     * Builds drop index sql.
     */
    dropIndexSql(table, indexOrName) {
        let indexName = indexOrName instanceof TableIndex_1.TableIndex ? indexOrName.name : indexOrName;
        const schema = this.extractSchema(table);
        return schema ? new Query_1.Query(`DROP INDEX "${schema}"."${indexName}"`) : new Query_1.Query(`DROP INDEX "${indexName}"`);
    }
    /**
     * Builds create primary key sql.
     */
    createPrimaryKeySql(table, columnNames) {
        const primaryKeyName = this.connection.namingStrategy.primaryKeyName(table.name, columnNames);
        const columnNamesString = columnNames.map(columnName => `"${columnName}"`).join(", ");
        return new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${primaryKeyName}" PRIMARY KEY (${columnNamesString})`);
    }
    /**
     * Builds drop primary key sql.
     */
    dropPrimaryKeySql(table) {
        const columnNames = table.primaryColumns.map(column => column.name);
        const primaryKeyName = this.connection.namingStrategy.primaryKeyName(table.name, columnNames);
        return new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${primaryKeyName}"`);
    }
    /**
     * Builds create unique constraint sql.
     */
    createUniqueConstraintSql(table, uniqueConstraint) {
        const columnNames = uniqueConstraint.columnNames.map(column => `"` + column + `"`).join(", ");
        return new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${uniqueConstraint.name}" UNIQUE (${columnNames})`);
    }
    /**
     * Builds drop unique constraint sql.
     */
    dropUniqueConstraintSql(table, uniqueOrName) {
        const uniqueName = uniqueOrName instanceof TableUnique_1.TableUnique ? uniqueOrName.name : uniqueOrName;
        return new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${uniqueName}"`);
    }
    /**
     * Builds create check constraint sql.
     */
    createCheckConstraintSql(table, checkConstraint) {
        return new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${checkConstraint.name}" CHECK (${checkConstraint.expression})`);
    }
    /**
     * Builds drop check constraint sql.
     */
    dropCheckConstraintSql(table, checkOrName) {
        const checkName = checkOrName instanceof TableCheck_1.TableCheck ? checkOrName.name : checkOrName;
        return new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${checkName}"`);
    }
    /**
     * Builds create exclusion constraint sql.
     */
    createExclusionConstraintSql(table, exclusionConstraint) {
        return new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${exclusionConstraint.name}" EXCLUDE ${exclusionConstraint.expression}`);
    }
    /**
     * Builds drop exclusion constraint sql.
     */
    dropExclusionConstraintSql(table, exclusionOrName) {
        const exclusionName = exclusionOrName instanceof TableExclusion_1.TableExclusion ? exclusionOrName.name : exclusionOrName;
        return new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${exclusionName}"`);
    }
    /**
     * Builds create foreign key sql.
     */
    createForeignKeySql(table, foreignKey) {
        const columnNames = foreignKey.columnNames.map(column => `"` + column + `"`).join(", ");
        const referencedColumnNames = foreignKey.referencedColumnNames.map(column => `"` + column + `"`).join(",");
        let sql = `ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${foreignKey.name}" FOREIGN KEY (${columnNames}) ` +
            `REFERENCES ${this.escapePath(foreignKey.referencedTableName)}(${referencedColumnNames})`;
        if (foreignKey.onDelete)
            sql += ` ON DELETE ${foreignKey.onDelete}`;
        if (foreignKey.onUpdate)
            sql += ` ON UPDATE ${foreignKey.onUpdate}`;
        if (foreignKey.deferrable)
            sql += ` DEFERRABLE ${foreignKey.deferrable}`;
        return new Query_1.Query(sql);
    }
    /**
     * Builds drop foreign key sql.
     */
    dropForeignKeySql(table, foreignKeyOrName) {
        const foreignKeyName = foreignKeyOrName instanceof TableForeignKey_1.TableForeignKey ? foreignKeyOrName.name : foreignKeyOrName;
        return new Query_1.Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${foreignKeyName}"`);
    }
    /**
     * Builds sequence name from given table and column.
     */
    buildSequenceName(table, columnOrName, currentSchema, disableEscape, skipSchema) {
        const columnName = columnOrName instanceof TableColumn_1.TableColumn ? columnOrName.name : columnOrName;
        let schema = undefined;
        let tableName = undefined;
        if (table.name.indexOf(".") === -1) {
            tableName = table.name;
        }
        else {
            schema = table.name.split(".")[0];
            tableName = table.name.split(".")[1];
        }
        if (schema && schema !== currentSchema && !skipSchema) {
            return disableEscape ? `${schema}.${tableName}_${columnName}_seq` : `"${schema}"."${tableName}_${columnName}_seq"`;
        }
        else {
            return disableEscape ? `${tableName}_${columnName}_seq` : `"${tableName}_${columnName}_seq"`;
        }
    }
    /**
     * Builds ENUM type name from given table and column.
     */
    buildEnumName(table, columnOrName, withSchema = true, disableEscape, toOld) {
        const columnName = columnOrName instanceof TableColumn_1.TableColumn ? columnOrName.name : columnOrName;
        const schema = table.name.indexOf(".") === -1 ? this.driver.options.schema : table.name.split(".")[0];
        const tableName = table.name.indexOf(".") === -1 ? table.name : table.name.split(".")[1];
        let enumName = schema && withSchema ? `${schema}.${tableName}_${columnName.toLowerCase()}_enum` : `${tableName}_${columnName.toLowerCase()}_enum`;
        if (toOld)
            enumName = enumName + "_old";
        return enumName.split(".").map(i => {
            return disableEscape ? i : `"${i}"`;
        }).join(".");
    }
    async getEnumTypeName(table, column) {
        const currentSchemaQuery = await this.query(`SELECT * FROM current_schema()`);
        const currentSchema = currentSchemaQuery[0]["current_schema"];
        let [schema, name] = table.name.split(".");
        if (!name) {
            name = schema;
            schema = this.driver.options.schema || currentSchema;
        }
        const result = await this.query(`SELECT "udt_schema", "udt_name" ` +
            `FROM "information_schema"."columns" WHERE "table_schema" = '${schema}' AND "table_name" = '${name}' AND "column_name"='${column.name}'`);
        return {
            enumTypeSchema: result[0]["udt_schema"],
            enumTypeName: result[0]["udt_name"]
        };
    }
    /**
     * Escapes given table or view path.
     */
    escapePath(target, disableEscape) {
        let tableName = target instanceof Table_1.Table || target instanceof View_1.View ? target.name : target;
        tableName = tableName.indexOf(".") === -1 && this.driver.options.schema ? `${this.driver.options.schema}.${tableName}` : tableName;
        return tableName.split(".").map(i => {
            return disableEscape ? i : `"${i}"`;
        }).join(".");
    }
    /**
     * Returns object with table schema and table name.
     */
    parseTableName(target) {
        const tableName = target instanceof Table_1.Table ? target.name : target;
        if (tableName.indexOf(".") === -1) {
            return {
                schema: this.driver.options.schema ? `'${this.driver.options.schema}'` : "current_schema()",
                tableName: `'${tableName}'`
            };
        }
        else {
            return {
                schema: `'${tableName.split(".")[0]}'`,
                tableName: `'${tableName.split(".")[1]}'`
            };
        }
    }
    /**
     * Builds a query for create column.
     */
    buildCreateColumnSql(table, column) {
        let c = "\"" + column.name + "\"";
        if (column.isGenerated === true && column.generationStrategy !== "uuid") {
            if (column.type === "integer" || column.type === "int" || column.type === "int4")
                c += " SERIAL";
            if (column.type === "smallint" || column.type === "int2")
                c += " SMALLSERIAL";
            if (column.type === "bigint" || column.type === "int8")
                c += " BIGSERIAL";
        }
        if (column.type === "enum" || column.type === "simple-enum") {
            c += " " + this.buildEnumName(table, column);
            if (column.isArray)
                c += " array";
        }
        else if (!column.isGenerated || column.type === "uuid") {
            c += " " + this.connection.driver.createFullType(column);
        }
        if (column.charset)
            c += " CHARACTER SET \"" + column.charset + "\"";
        if (column.collation)
            c += " COLLATE \"" + column.collation + "\"";
        if (column.isNullable !== true)
            c += " NOT NULL";
        if (column.default !== undefined && column.default !== null)
            c += " DEFAULT " + column.default;
        if (column.isGenerated && column.generationStrategy === "uuid" && !column.default)
            c += ` DEFAULT ${this.driver.uuidGenerator}`;
        return c;
    }
}
exports.PostgresQueryRunner = PostgresQueryRunner;
