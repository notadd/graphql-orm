"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const mkdirp = require("mkdirp");
/**
 * Command line utils functions.
 */
class CommandUtils {
    /**
     * Creates directories recursively.
     */
    static createDirectories(directory) {
        return new Promise((ok, fail) => mkdirp(directory, (err) => err ? fail(err) : ok()));
    }
    /**
     * Creates a file with the given content in the given path.
     */
    static async createFile(filePath, content, override = true) {
        await CommandUtils.createDirectories(path.dirname(filePath));
        return new Promise((ok, fail) => {
            if (override === false && fs.existsSync(filePath))
                return ok();
            fs.writeFile(filePath, content, err => err ? fail(err) : ok());
        });
    }
    /**
     * Reads everything from a given file and returns its content as a string.
     */
    static async readFile(filePath) {
        return new Promise((ok, fail) => {
            fs.readFile(filePath, (err, data) => err ? fail(err) : ok(data.toString()));
        });
    }
    static async fileExists(filePath) {
        return fs.existsSync(filePath);
    }
}
exports.CommandUtils = CommandUtils;
