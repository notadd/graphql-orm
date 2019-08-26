"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ConnectionOptionsReader_1 = require("../connection/ConnectionOptionsReader");
const CommandUtils_1 = require("./CommandUtils");
const chalk = require("chalk");
/**
 * Generates a new subscriber.
 */
class SubscriberCreateCommand {
    constructor() {
        this.command = "subscriber:create";
        this.describe = "Generates a new subscriber.";
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
            describe: "Name of the subscriber class.",
            demand: true
        })
            .option("d", {
            alias: "dir",
            describe: "Directory where subscriber should be created."
        })
            .option("f", {
            alias: "config",
            default: "ormconfig",
            describe: "Name of the file with connection configuration."
        });
    }
    async handler(args) {
        try {
            const fileContent = SubscriberCreateCommand.getTemplate(args.name);
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
                    directory = connectionOptions.cli ? connectionOptions.cli.subscribersDir : undefined;
                }
                catch (err) { }
            }
            const path = process.cwd() + "/" + (directory ? (directory + "/") : "") + filename;
            await CommandUtils_1.CommandUtils.createFile(path, fileContent);
            console.log(chalk.green(`Subscriber ${chalk.blue(path)} has been created successfully.`));
        }
        catch (err) {
            console.log(chalk.black.bgRed("Error during subscriber creation:"));
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
        return `import {EventSubscriber, EntitySubscriberInterface} from "typeorm";

@EventSubscriber()
export class ${name} implements EntitySubscriberInterface<any> {

}
`;
    }
}
exports.SubscriberCreateCommand = SubscriberCreateCommand;
