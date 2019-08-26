"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const cli_highlight_1 = require("cli-highlight");
var fs_1 = require("fs");
exports.ReadStream = fs_1.ReadStream;
var events_1 = require("events");
exports.EventEmitter = events_1.EventEmitter;
var stream_1 = require("stream");
exports.Readable = stream_1.Readable;
exports.Writable = stream_1.Writable;
const chalk = require("chalk");
/**
 * Platform-specific tools.
 */
class PlatformTools {
    /**
     * Gets global variable where global stuff can be stored.
     */
    static getGlobalVariable() {
        return global;
    }
    /**
     * Loads ("require"-s) given file or package.
     * This operation only supports on node platform
     */
    static load(name) {
        // if name is not absolute or relative, then try to load package from the node_modules of the directory we are currently in
        // this is useful when we are using typeorm package globally installed and it accesses drivers
        // that are not installed globally
        try {
            // switch case to explicit require statements for webpack compatibility.
            switch (name) {
                /**
                * mongodb
                */
                case "mongodb":
                    return require("mongodb");
                /**
                * mysql
                */
                case "mysql":
                    return require("mysql");
                case "mysql2":
                    return require("mysql2");
                /**
                * oracle
                */
                case "oracledb":
                    return require("oracledb");
                /**
                * postgres
                */
                case "pg":
                    return require("pg");
                case "pg-native":
                    return require("pg-native");
                case "pg-query-stream":
                    return require("pg-query-stream");
                /**
                * redis
                */
                case "redis":
                    return require("redis");
                /**
                 * ioredis
                 */
                case "ioredis":
                case "ioredis/cluster":
                    return require("ioredis");
                /**
                * sqlite
                */
                case "sqlite3":
                    return require("sqlite3");
                /**
                * sql.js
                */
                case "sql.js":
                    return require("sql.js");
                /**
                * sqlserver
                */
                case "mssql":
                    return require("mssql");
                /**
                * other modules
                */
                case "mkdirp":
                    return require("mkdirp");
                case "path":
                    return require("path");
                case "debug":
                    return require("debug");
                case "app-root-path":
                    return require("app-root-path");
                case "glob":
                    return require("glob");
                /**
                * default
                */
                default:
                    return require(name);
            }
        }
        catch (err) {
            if (!path.isAbsolute(name) && name.substr(0, 2) !== "./" && name.substr(0, 3) !== "../") {
                return require(path.resolve(process.cwd() + "/node_modules/" + name));
            }
            throw err;
        }
    }
    /**
     * Normalizes given path. Does "path.normalize".
     */
    static pathNormalize(pathStr) {
        return path.normalize(pathStr);
    }
    /**
     * Gets file extension. Does "path.extname".
     */
    static pathExtname(pathStr) {
        return path.extname(pathStr);
    }
    /**
     * Resolved given path. Does "path.resolve".
     */
    static pathResolve(pathStr) {
        return path.resolve(pathStr);
    }
    /**
     * Synchronously checks if file exist. Does "fs.existsSync".
     */
    static fileExist(pathStr) {
        return fs.existsSync(pathStr);
    }
    static readFileSync(filename) {
        return fs.readFileSync(filename);
    }
    static appendFileSync(filename, data) {
        fs.appendFileSync(filename, data);
    }
    static async writeFile(path, data) {
        return new Promise((ok, fail) => {
            fs.writeFile(path, data, (err) => {
                if (err)
                    fail(err);
                ok();
            });
        });
    }
    /**
     * Gets environment variable.
     */
    static getEnvVariable(name) {
        return process.env[name];
    }
    /**
     * Highlights sql string to be print in the console.
     */
    static highlightSql(sql) {
        const theme = {
            "keyword": chalk.blueBright,
            "literal": chalk.blueBright,
            "string": chalk.white,
            "type": chalk.magentaBright,
            "built_in": chalk.magentaBright,
            "comment": chalk.gray,
        };
        return cli_highlight_1.highlight(sql, { theme: theme, language: "sql" });
    }
    /**
     * Highlights json string to be print in the console.
     */
    static highlightJson(json) {
        return cli_highlight_1.highlight(json, { language: "json" });
    }
    /**
     * Logging functions needed by AdvancedConsoleLogger
     */
    static logInfo(prefix, info) {
        console.log(chalk.gray.underline(prefix), info);
    }
    static logError(prefix, error) {
        console.log(chalk.underline.red(prefix), error);
    }
    static logWarn(prefix, warning) {
        console.log(chalk.underline.yellow(prefix), warning);
    }
    static log(message) {
        console.log(chalk.underline(message));
    }
    static warn(message) {
        return chalk.yellow(message);
    }
}
/**
 * Type of the currently running platform.
 */
PlatformTools.type = "node";
exports.PlatformTools = PlatformTools;
