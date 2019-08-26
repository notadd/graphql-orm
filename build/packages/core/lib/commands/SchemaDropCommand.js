"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const ConnectionOptionsReader_1 = require("../connection/ConnectionOptionsReader");
const chalk = require("chalk");
/**
 * Drops all tables of the database from the given connection.
 */
class SchemaDropCommand {
    constructor() {
        this.command = "schema:drop";
        this.describe = "Drops all tables in the database on your default connection. " +
            "To drop table of a concrete connection's database use -c option.";
    }
    builder(args) {
        return args
            .option("c", {
            alias: "connection",
            default: "default",
            describe: "Name of the connection on which to drop all tables."
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
            await connection.dropDatabase();
            await connection.close();
            console.log(chalk.green("Database schema has been successfully dropped."));
        }
        catch (err) {
            if (connection)
                await connection.close();
            console.log(chalk.black.bgRed("Error during schema drop:"));
            console.error(err);
            process.exit(1);
        }
    }
}
exports.SchemaDropCommand = SchemaDropCommand;
