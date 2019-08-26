"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const QueryRunnerAlreadyReleasedError_1 = require("../../error/QueryRunnerAlreadyReleasedError");
const QueryFailedError_1 = require("../../error/QueryFailedError");
const AbstractSqliteQueryRunner_1 = require("../sqlite-abstract/AbstractSqliteQueryRunner");
const TransactionAlreadyStartedError_1 = require("../../error/TransactionAlreadyStartedError");
const TransactionNotStartedError_1 = require("../../error/TransactionNotStartedError");
const Broadcaster_1 = require("../../subscriber/Broadcaster");
/**
 * Runs queries on a single sqlite database connection.
 */
class ExpoQueryRunner extends AbstractSqliteQueryRunner_1.AbstractSqliteQueryRunner {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(driver) {
        super();
        this.driver = driver;
        this.connection = driver.connection;
        this.broadcaster = new Broadcaster_1.Broadcaster(this);
    }
    /**
     * Starts transaction. Within Expo, all database operations happen in a
     * transaction context, so issuing a `BEGIN TRANSACTION` command is
     * redundant and will result in the following error:
     *
     * `Error: Error code 1: cannot start a transaction within a transaction`
     *
     * Instead, we keep track of a `Transaction` object in `this.transaction`
     * and continue using the same object until we wish to commit the
     * transaction.
     */
    async startTransaction() {
        if (this.isTransactionActive && typeof this.transaction !== "undefined")
            throw new TransactionAlreadyStartedError_1.TransactionAlreadyStartedError();
        this.isTransactionActive = true;
    }
    /**
     * Commits transaction.
     * Error will be thrown if transaction was not started.
     * Since Expo will automatically commit the transaction once all the
     * callbacks of the transaction object have been completed, "committing" a
     * transaction in this driver's context means that we delete the transaction
     * object and set the stage for the next transaction.
     */
    async commitTransaction() {
        if (!this.isTransactionActive && typeof this.transaction === "undefined")
            throw new TransactionNotStartedError_1.TransactionNotStartedError();
        this.isTransactionActive = false;
        this.transaction = undefined;
    }
    /**
     * Rollbacks transaction.
     * Error will be thrown if transaction was not started.
     * This method's functionality is identical to `commitTransaction()` because
     * the transaction lifecycle is handled within the Expo transaction object.
     * Issuing separate statements for `COMMIT` or `ROLLBACK` aren't necessary.
     */
    async rollbackTransaction() {
        if (!this.isTransactionActive && typeof this.transaction === "undefined")
            throw new TransactionNotStartedError_1.TransactionNotStartedError();
        this.isTransactionActive = false;
        this.transaction = undefined;
    }
    /**
     * Executes a given SQL query.
     */
    query(query, parameters) {
        if (this.isReleased)
            throw new QueryRunnerAlreadyReleasedError_1.QueryRunnerAlreadyReleasedError();
        return new Promise(async (ok, fail) => {
            const databaseConnection = await this.connect();
            this.driver.connection.logger.logQuery(query, parameters, this);
            const queryStartTime = +new Date();
            // All Expo SQL queries are executed in a transaction context
            databaseConnection.transaction((transaction) => {
                if (typeof this.transaction === "undefined") {
                    this.startTransaction();
                    this.transaction = transaction;
                }
                this.transaction.executeSql(query, parameters, (t, result) => {
                    // log slow queries if maxQueryExecution time is set
                    const maxQueryExecutionTime = this.driver.connection.options.maxQueryExecutionTime;
                    const queryEndTime = +new Date();
                    const queryExecutionTime = queryEndTime - queryStartTime;
                    if (maxQueryExecutionTime && queryExecutionTime > maxQueryExecutionTime) {
                        this.driver.connection.logger.logQuerySlow(queryExecutionTime, query, parameters, this);
                    }
                    // return id of inserted row, if query was insert statement.
                    if (query.substr(0, 11) === "INSERT INTO") {
                        ok(result.insertId);
                    }
                    else {
                        let resultSet = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            resultSet.push(result.rows.item(i));
                        }
                        ok(resultSet);
                    }
                }, (t, err) => {
                    this.driver.connection.logger.logQueryError(err, query, parameters, this);
                    fail(new QueryFailedError_1.QueryFailedError(query, parameters, err));
                });
            }, (err) => {
                this.rollbackTransaction();
            }, () => {
                this.isTransactionActive = false;
                this.transaction = undefined;
            });
        });
    }
}
exports.ExpoQueryRunner = ExpoQueryRunner;
//# sourceMappingURL=ExpoQueryRunner.js.map