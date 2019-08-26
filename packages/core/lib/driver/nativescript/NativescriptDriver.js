"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AbstractSqliteDriver_1 = require("../sqlite-abstract/AbstractSqliteDriver");
const NativescriptQueryRunner_1 = require("./NativescriptQueryRunner");
const DriverOptionNotSetError_1 = require("../../error/DriverOptionNotSetError");
const DriverPackageNotInstalledError_1 = require("../../error/DriverPackageNotInstalledError");
/**
 * Organizes communication with sqlite DBMS within Nativescript.
 */
class NativescriptDriver extends AbstractSqliteDriver_1.AbstractSqliteDriver {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        super(connection);
        this.connection = connection;
        this.options = connection.options;
        this.database = this.options.database;
        this.driver = this.options.driver;
        // validate options to make sure everything is set
        if (!this.options.database) {
            throw new DriverOptionNotSetError_1.DriverOptionNotSetError("database");
        }
        // load sqlite package
        this.loadDependencies();
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Closes connection with database.
     */
    async disconnect() {
        return new Promise((ok, fail) => {
            this.queryRunner = undefined;
            this.databaseConnection.close().then(ok).catch(fail);
        });
    }
    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode = "master") {
        if (!this.queryRunner) {
            this.queryRunner = new NativescriptQueryRunner_1.NativescriptQueryRunner(this);
        }
        return this.queryRunner;
    }
    normalizeType(column) {
        if (column.type === Buffer) {
            return "blob";
        }
        return super.normalizeType(column);
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates connection with the database.
     */
    createDatabaseConnection() {
        return new Promise((ok, fail) => {
            const options = Object.assign({}, {
                name: this.options.database,
            }, this.options.extra || {});
            new this.sqlite(options.name, (err, db) => {
                if (err)
                    return fail(err);
                // use object mode to work with TypeORM
                db.resultType(this.sqlite.RESULTSASOBJECT);
                // we need to enable foreign keys in sqlite to make sure all foreign key related features
                // working properly. this also makes onDelete work with sqlite.
                db.execSQL(`PRAGMA foreign_keys = ON;`, [], (err, result) => {
                    if (err)
                        return fail(err);
                    // We are all set
                    ok(db);
                });
            });
        });
    }
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    loadDependencies() {
        this.sqlite = this.driver;
        if (!this.driver) {
            throw new DriverPackageNotInstalledError_1.DriverPackageNotInstalledError("Nativescript", "nativescript-sqlite");
        }
    }
}
exports.NativescriptDriver = NativescriptDriver;
//# sourceMappingURL=NativescriptDriver.js.map