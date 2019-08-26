"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ConnectionOptionsReader_1 = require("../connection/ConnectionOptionsReader");
const CommandUtils_1 = require("./CommandUtils");
const index_1 = require("../index");
const MysqlDriver_1 = require("../driver/mysql/MysqlDriver");
const StringUtils_1 = require("../util/StringUtils");
const chalk = require("chalk");
/**
 * Generates a new migration file with sql needs to be executed to update schema.
 */
class MigrationGenerateCommand {
    constructor() {
        this.command = "migration:generate";
        this.describe = "Generates a new migration file with sql needs to be executed to update schema.";
        this.aliases = "migrations:generate";
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
        if (args._[0] === "migrations:generate") {
            console.log("'migrations:generate' is deprecated, please use 'migration:generate' instead");
        }
        const timestamp = new Date().getTime();
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
            const upSqls = [], downSqls = [];
            // mysql is exceptional here because it uses ` character in to escape names in queries, that's why for mysql
            // we are using simple quoted string instead of template string syntax
            if (connection.driver instanceof MysqlDriver_1.MysqlDriver) {
                sqlInMemory.upQueries.forEach(upQuery => {
                    upSqls.push("        await queryRunner.query(\"" + upQuery.query.replace(new RegExp(`"`, "g"), `\\"`) + "\");");
                });
                sqlInMemory.downQueries.forEach(downQuery => {
                    downSqls.push("        await queryRunner.query(\"" + downQuery.query.replace(new RegExp(`"`, "g"), `\\"`) + "\");");
                });
            }
            else {
                sqlInMemory.upQueries.forEach(upQuery => {
                    upSqls.push("        await queryRunner.query(`" + upQuery.query.replace(new RegExp("`", "g"), "\\`") + "`);");
                });
                sqlInMemory.downQueries.forEach(downQuery => {
                    downSqls.push("        await queryRunner.query(`" + downQuery.query.replace(new RegExp("`", "g"), "\\`") + "`);");
                });
            }
            if (upSqls.length) {
                if (args.name) {
                    const fileContent = MigrationGenerateCommand.getTemplate(args.name, timestamp, upSqls, downSqls.reverse());
                    const path = process.cwd() + "/" + (directory ? (directory + "/") : "") + filename;
                    await CommandUtils_1.CommandUtils.createFile(path, fileContent);
                    console.log(chalk.green(`Migration ${chalk.blue(path)} has been generated successfully.`));
                }
                else {
                    console.log(chalk.yellow("Please specify migration name"));
                }
            }
            else {
                console.log(chalk.yellow(`No changes in database schema were found - cannot generate a migration. To create a new empty migration use "typeorm migration:create" command`));
            }
            await connection.close();
        }
        catch (err) {
            if (connection)
                await connection.close();
            console.log(chalk.black.bgRed("Error during migration generation:"));
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
    static getTemplate(name, timestamp, upSqls, downSqls) {
        return `import {MigrationInterface, QueryRunner} from "typeorm";

export class ${StringUtils_1.camelCase(name, true)}${timestamp} implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
${upSqls.join(`
`)}
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
${downSqls.join(`
`)}
    }

}
`;
    }
}
exports.MigrationGenerateCommand = MigrationGenerateCommand;
//# sourceMappingURL=MigrationGenerateCommand.js.map