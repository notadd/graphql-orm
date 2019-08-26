"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const ConnectionOptionsReader_1 = require("../connection/ConnectionOptionsReader");
const process = __importStar(require("process"));
const chalk = require("chalk");
/**
 * Runs migration command.
 */
class MigrationShowCommand {
    constructor() {
        this.command = "migration:show";
        this.describe = "Show all migrations and whether they have been run or not";
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
                logging: ["query", "error", "schema"]
            });
            connection = await index_1.createConnection(connectionOptions);
            const unappliedMigrations = await connection.showMigrations();
            await connection.close();
            // return error code if there are unapplied migrations for CI
            process.exit(unappliedMigrations ? 1 : 0);
        }
        catch (err) {
            if (connection)
                await connection.close();
            console.log(chalk.black.bgRed("Error during migration show:"));
            console.error(err);
            process.exit(1);
        }
    }
}
exports.MigrationShowCommand = MigrationShowCommand;
//# sourceMappingURL=MigrationShowCommand.js.map