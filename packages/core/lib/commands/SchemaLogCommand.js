"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const ConnectionOptionsReader_1 = require("../connection/ConnectionOptionsReader");
const cli_highlight_1 = require("cli-highlight");
const chalk = require("chalk");
/**
 * Shows sql to be executed by schema:sync command.
 */
class SchemaLogCommand {
    constructor() {
        this.command = "schema:log";
        this.describe = "Shows sql to be executed by schema:sync command. It shows sql log only for your default connection. " +
            "To run update queries on a concrete connection use -c option.";
    }
    builder(args) {
        return args
            .option("c", {
            alias: "connection",
            default: "default",
            describe: "Name of the connection of which schema sync log should be shown."
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
                logging: false
            });
            connection = await index_1.createConnection(connectionOptions);
            const sqlInMemory = await connection.driver.createSchemaBuilder().log();
            if (sqlInMemory.upQueries.length === 0) {
                console.log(chalk.yellow("Your schema is up to date - there are no queries to be executed by schema syncronization."));
            }
            else {
                const lengthSeparators = String(sqlInMemory.upQueries.length).split("").map(char => "-").join("");
                console.log(chalk.yellow("---------------------------------------------------------------" + lengthSeparators));
                console.log(chalk.yellow.bold(`-- Schema syncronization will execute following sql queries (${chalk.white(sqlInMemory.upQueries.length)}):`));
                console.log(chalk.yellow("---------------------------------------------------------------" + lengthSeparators));
                sqlInMemory.upQueries.forEach(upQuery => {
                    let sqlString = upQuery.query;
                    sqlString = sqlString.trim();
                    sqlString = sqlString.substr(-1) === ";" ? sqlString : sqlString + ";";
                    console.log(cli_highlight_1.highlight(sqlString));
                });
            }
            await connection.close();
        }
        catch (err) {
            if (connection)
                console.log(chalk.black.bgRed("Error during schema synchronization:"));
            console.error(err);
            process.exit(1);
        }
    }
}
exports.SchemaLogCommand = SchemaLogCommand;
//# sourceMappingURL=SchemaLogCommand.js.map