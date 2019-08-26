"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const ConnectionOptionsReader_1 = require("../connection/ConnectionOptionsReader");
const chalk = require("chalk");
/**
 * Clear cache command.
 */
class CacheClearCommand {
    constructor() {
        this.command = "cache:clear";
        this.describe = "Clears all data stored in query runner cache.";
    }
    builder(args) {
        return args
            .option("connection", {
            alias: "c",
            default: "default",
            describe: "Name of the connection on which run a query."
        })
            .option("config", {
            alias: "f",
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
                subscribers: [],
                synchronize: false,
                migrationsRun: false,
                dropSchema: false,
                logging: ["schema"]
            });
            connection = await index_1.createConnection(connectionOptions);
            if (!connection.queryResultCache) {
                console.log(chalk.black.bgRed("Cache is not enabled. To use cache enable it in connection configuration."));
                return;
            }
            await connection.queryResultCache.clear();
            console.log(chalk.green("Cache was successfully cleared"));
            if (connection)
                await connection.close();
        }
        catch (err) {
            if (connection)
                await connection.close();
            console.log(chalk.black.bgRed("Error during cache clear:"));
            console.error(err);
            process.exit(1);
        }
    }
}
exports.CacheClearCommand = CacheClearCommand;
//# sourceMappingURL=CacheClearCommand.js.map