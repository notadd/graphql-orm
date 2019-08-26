"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const ConnectionOptionsReader_1 = require("../connection/ConnectionOptionsReader");
const chalk = require("chalk");
/**
 * Reverts last migration command.
 */
class MigrationRevertCommand {
    constructor() {
        this.command = "migration:revert";
        this.describe = "Reverts last executed migration.";
        this.aliases = "migrations:revert";
    }
    builder(args) {
        return args
            .option("c", {
            alias: "connection",
            default: "default",
            describe: "Name of the connection on which run a query."
        })
            .option("transaction", {
            alias: "t",
            default: "default",
            describe: "Indicates if transaction should be used or not for migration revert. Enabled by default."
        })
            .option("f", {
            alias: "config",
            default: "ormconfig",
            describe: "Name of the file with connection configuration."
        });
    }
    async handler(args) {
        if (args._[0] === "migrations:revert") {
            console.log("'migrations:revert' is deprecated, please use 'migration:revert' instead");
        }
        let connection = undefined;
        try {
            const connectionOptionsReader = new ConnectionOptionsReader_1.ConnectionOptionsReader({
                root: process.cwd(),
                configName: args.config
            });
            const connectionOptions = await connectionOptionsReader.get(args.connection);
            Object.assign(connectionOptions, {
                subscribers: [],
                synchronize: false,
                migrationsRun: false,
                dropSchema: false,
                logging: ["query", "error", "schema"]
            });
            connection = await index_1.createConnection(connectionOptions);
            const options = {
                transaction: args["t"] === "false" ? false : true
            };
            await connection.undoLastMigration(options);
            await connection.close();
        }
        catch (err) {
            if (connection)
                await connection.close();
            console.log(chalk.black.bgRed("Error during migration revert:"));
            console.error(err);
            process.exit(1);
        }
    }
}
exports.MigrationRevertCommand = MigrationRevertCommand;
//# sourceMappingURL=MigrationRevertCommand.js.map