"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const ConnectionOptionsReader_1 = require("../connection/ConnectionOptionsReader");
const chalk = require("chalk");
/**
 * Synchronizes database schema with entities.
 */
class SchemaSyncCommand {
    constructor() {
        this.command = "schema:sync";
        this.describe = "Synchronizes your entities with database schema. It runs schema update queries on all connections you have. " +
            "To run update queries on a concrete connection use -c option.";
    }
    builder(args) {
        return args
            .option("c", {
            alias: "connection",
            default: "default",
            describe: "Name of the connection on which schema synchronization needs to to run."
        })
            .option("f", {
            alias: "config",
            default: "ormconfig",
            describe: "Name of the file with connection configuration."
        });
    }
    async handler(args) {
        let connection = undefined;
        try {
            const connectionOptionsReader = new ConnectionOptionsReader_1.ConnectionOptionsReader({
                root: process.cwd(),
                configName: args.config
            });
            const connectionOptions = await connectionOptionsReader.get(args.connection);
            Object.assign(connectionOptions, {
                synchronize: false,
                migrationsRun: false,
                dropSchema: false,
                logging: ["query", "schema"]
            });
            connection = await index_1.createConnection(connectionOptions);
            await connection.synchronize();
            await connection.close();
            console.log(chalk.green("Schema syncronization finished successfully."));
        }
        catch (err) {
            if (connection)
                await connection.close();
            console.log(chalk.black.bgRed("Error during schema synchronization:"));
            console.error(err);
            process.exit(1);
        }
    }
}
exports.SchemaSyncCommand = SchemaSyncCommand;
