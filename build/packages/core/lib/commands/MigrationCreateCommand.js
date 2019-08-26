"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ConnectionOptionsReader_1 = require("../connection/ConnectionOptionsReader");
const CommandUtils_1 = require("./CommandUtils");
const StringUtils_1 = require("../util/StringUtils");
const chalk = require("chalk");
/**
 * Creates a new migration file.
 */
class MigrationCreateCommand {
    constructor() {
        this.command = "migration:create";
        this.describe = "Creates a new migration file.";
        this.aliases = "migrations:create";
    }
    builder(args) {
        return args
            .option("c", {
            alias: "connection",
            default: "default",
            describe: "Name of the connection on which run a query."
        })
            .option("n", {
            alias: "name",
            describe: "Name of the migration class.",
            demand: true
        })
            .option("d", {
            alias: "dir",
            describe: "Directory where migration should be created."
        })
            .option("f", {
            alias: "config",
            default: "ormconfig",
            describe: "Name of the file with connection configuration."
        });
    }
    async handler(args) {
        if (args._[0] === "migrations:create") {
            console.log("'migrations:create' is deprecated, please use 'migration:create' instead");
        }
        try {
            const timestamp = new Date().getTime();
            const fileContent = MigrationCreateCommand.getTemplate(args.name, timestamp);
            const filename = timestamp + "-" + args.name + ".ts";
            let directory = args.dir;
            // if directory is not set then try to open tsconfig and find default path there
            if (!directory) {
                try {
                    const connectionOptionsReader = new ConnectionOptionsReader_1.ConnectionOptionsReader({
                        root: process.cwd(),
                        configName: args.config
                    });
                    const connectionOptions = await connectionOptionsReader.get(args.connection);
                    directory = connectionOptions.cli ? connectionOptions.cli.migrationsDir : undefined;
                }
                catch (err) { }
            }
            const path = process.cwd() + "/" + (directory ? (directory + "/") : "") + filename;
            await CommandUtils_1.CommandUtils.createFile(path, fileContent);
            console.log(`Migration ${chalk.blue(path)} has been generated successfully.`);
        }
        catch (err) {
            console.log(chalk.black.bgRed("Error during migration creation:"));
            console.error(err);
            process.exit(1);
        }
    }
    // -------------------------------------------------------------------------
    // Protected Static Methods
    // -------------------------------------------------------------------------
    /**
     * Gets contents of the migration file.
     */
    static getTemplate(name, timestamp) {
        return `import {MigrationInterface, QueryRunner} from "typeorm";

export class ${StringUtils_1.camelCase(name, true)}${timestamp} implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
    }

}
`;
    }
}
exports.MigrationCreateCommand = MigrationCreateCommand;
