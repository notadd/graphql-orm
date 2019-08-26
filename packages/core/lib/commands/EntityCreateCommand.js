"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ConnectionOptionsReader_1 = require("../connection/ConnectionOptionsReader");
const CommandUtils_1 = require("./CommandUtils");
const chalk = require("chalk");
/**
 * Generates a new entity.
 */
class EntityCreateCommand {
    constructor() {
        this.command = "entity:create";
        this.describe = "Generates a new entity.";
    }
    builder(args) {
        return args
            .option("c", {
            alias: "connection",
            default: "default",
            describe: "Name of the connection on which to run a query"
        })
            .option("n", {
            alias: "name",
            describe: "Name of the entity class.",
            demand: true
        })
            .option("d", {
            alias: "dir",
            describe: "Directory where entity should be created."
        })
            .option("f", {
            alias: "config",
            default: "ormconfig",
            describe: "Name of the file with connection configuration."
        });
    }
    async handler(args) {
        try {
            const fileContent = EntityCreateCommand.getTemplate(args.name);
            const filename = args.name + ".ts";
            let directory = args.dir;
            // if directory is not set then try to open tsconfig and find default path there
            if (!directory) {
                try {
                    const connectionOptionsReader = new ConnectionOptionsReader_1.ConnectionOptionsReader({
                        root: process.cwd(),
                        configName: args.config
                    });
                    const connectionOptions = await connectionOptionsReader.get(args.connection);
                    directory = connectionOptions.cli ? connectionOptions.cli.entitiesDir : undefined;
                }
                catch (err) { }
            }
            const path = process.cwd() + "/" + (directory ? (directory + "/") : "") + filename;
            const fileExists = await CommandUtils_1.CommandUtils.fileExists(path);
            if (fileExists) {
                throw `File ${chalk.blue(path)} already exists`;
            }
            await CommandUtils_1.CommandUtils.createFile(path, fileContent);
            console.log(chalk.green(`Entity ${chalk.blue(path)} has been created successfully.`));
        }
        catch (err) {
            console.log(chalk.black.bgRed("Error during entity creation:"));
            console.error(err);
            process.exit(1);
        }
    }
    // -------------------------------------------------------------------------
    // Protected Static Methods
    // -------------------------------------------------------------------------
    /**
     * Gets contents of the entity file.
     */
    static getTemplate(name) {
        return `import {Entity} from "typeorm";

@Entity()
export class ${name} {

}
`;
    }
}
exports.EntityCreateCommand = EntityCreateCommand;
//# sourceMappingURL=EntityCreateCommand.js.map