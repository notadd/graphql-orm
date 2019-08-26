"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PlatformTools_1 = require("../platform/PlatformTools");
/**
 * Performs logging of the events in TypeORM via debug library.
 */
class DebugLogger {
    constructor() {
        this.debug = PlatformTools_1.PlatformTools.load("debug");
        this.debugQueryLog = this.debug("typeorm:query:log");
        this.debugQueryError = this.debug("typeorm:query:error");
        this.debugQuerySlow = this.debug("typeorm:query:slow");
        this.debugSchemaBuild = this.debug("typeorm:schema");
        this.debugMigration = this.debug("typeorm:migration");
        this.debugLog = this.debug("typeorm:log");
        this.debugInfo = this.debug("typeorm:info");
        this.debugWarn = this.debug("typeorm:warn");
    }
    /**
     * Logs query and parameters used in it.
     */
    logQuery(query, parameters, queryRunner) {
        if (this.debugQueryLog.enabled) {
            this.debugQueryLog(PlatformTools_1.PlatformTools.highlightSql(query) + ";");
            if (parameters && parameters.length) {
                this.debugQueryLog("parameters:", parameters);
            }
        }
    }
    /**
     * Logs query that failed.
     */
    logQueryError(error, query, parameters, queryRunner) {
        if (this.debugQueryError.enabled) {
            this.debugQueryError(PlatformTools_1.PlatformTools.highlightSql(query) + ";");
            if (parameters && parameters.length) {
                this.debugQueryError("parameters:", parameters);
            }
            this.debugQueryError("error: ", error);
        }
    }
    /**
     * Logs query that is slow.
     */
    logQuerySlow(time, query, parameters, queryRunner) {
        if (this.debugQuerySlow.enabled) {
            this.debugQuerySlow(PlatformTools_1.PlatformTools.highlightSql(query) + ";");
            if (parameters && parameters.length) {
                this.debugQuerySlow("parameters:", parameters);
            }
            this.debugQuerySlow("execution time:", time);
        }
    }
    /**
     * Logs events from the schema build process.
     */
    logSchemaBuild(message, queryRunner) {
        if (this.debugSchemaBuild.enabled) {
            this.debugSchemaBuild(message);
        }
    }
    /**
     * Logs events from the migration run process.
     */
    logMigration(message, queryRunner) {
        if (this.debugMigration.enabled) {
            this.debugMigration(message);
        }
    }
    /**
     * Perform logging using given logger.
     * Log has its own level and message.
     */
    log(level, message, queryRunner) {
        switch (level) {
            case "log":
                if (this.debugLog.enabled) {
                    this.debugLog(message);
                }
                break;
            case "info":
                if (this.debugInfo.enabled) {
                    this.debugInfo(message);
                }
                break;
            case "warn":
                if (this.debugWarn.enabled) {
                    this.debugWarn(message);
                }
                break;
        }
    }
}
exports.DebugLogger = DebugLogger;
