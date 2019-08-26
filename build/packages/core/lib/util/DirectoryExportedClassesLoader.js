"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PlatformTools_1 = require("../platform/PlatformTools");
const index_1 = require("../index");
/**
 * Loads all exported classes from the given directory.
 */
function importClassesFromDirectories(logger, directories, formats = [".js", ".ts"]) {
    const logLevel = "info";
    const classesNotFoundMessage = "No classes were found using the provided glob pattern: ";
    const classesFoundMessage = "All classes found using provided glob pattern";
    function loadFileClasses(exported, allLoaded) {
        if (typeof exported === "function" || exported instanceof index_1.EntitySchema) {
            allLoaded.push(exported);
        }
        else if (Array.isArray(exported)) {
            exported.forEach((i) => loadFileClasses(i, allLoaded));
        }
        else if (typeof exported === "object" && exported !== null) {
            Object.keys(exported).forEach(key => loadFileClasses(exported[key], allLoaded));
        }
        return allLoaded;
    }
    const allFiles = directories.reduce((allDirs, dir) => {
        return allDirs.concat(PlatformTools_1.PlatformTools.load("glob").sync(PlatformTools_1.PlatformTools.pathNormalize(dir)));
    }, []);
    if (directories.length > 0 && allFiles.length === 0) {
        logger.log(logLevel, `${classesNotFoundMessage} "${directories}"`);
    }
    else if (allFiles.length > 0) {
        logger.log(logLevel, `${classesFoundMessage} "${directories}" : "${allFiles}"`);
    }
    const dirs = allFiles
        .filter(file => {
        const dtsExtension = file.substring(file.length - 5, file.length);
        return formats.indexOf(PlatformTools_1.PlatformTools.pathExtname(file)) !== -1 && dtsExtension !== ".d.ts";
    })
        .map(file => PlatformTools_1.PlatformTools.load(PlatformTools_1.PlatformTools.pathResolve(file)));
    return loadFileClasses(dirs, []);
}
exports.importClassesFromDirectories = importClassesFromDirectories;
/**
 * Loads all json files from the given directory.
 */
function importJsonsFromDirectories(directories, format = ".json") {
    const allFiles = directories.reduce((allDirs, dir) => {
        return allDirs.concat(PlatformTools_1.PlatformTools.load("glob").sync(PlatformTools_1.PlatformTools.pathNormalize(dir)));
    }, []);
    return allFiles
        .filter(file => PlatformTools_1.PlatformTools.pathExtname(file) === format)
        .map(file => PlatformTools_1.PlatformTools.load(PlatformTools_1.PlatformTools.pathResolve(file)));
}
exports.importJsonsFromDirectories = importJsonsFromDirectories;
