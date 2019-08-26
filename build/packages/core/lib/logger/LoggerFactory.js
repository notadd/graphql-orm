"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SimpleConsoleLogger_1 = require("./SimpleConsoleLogger");
const AdvancedConsoleLogger_1 = require("./AdvancedConsoleLogger");
const FileLogger_1 = require("./FileLogger");
const DebugLogger_1 = require("./DebugLogger");
/**
 * Helps to create logger instances.
 */
class LoggerFactory {
    /**
     * Creates a new logger depend on a given connection's driver.
     */
    create(logger, options) {
        if (logger instanceof Object)
            return logger;
        if (logger) {
            switch (logger) {
                case "simple-console":
                    return new SimpleConsoleLogger_1.SimpleConsoleLogger(options);
                case "file":
                    return new FileLogger_1.FileLogger(options);
                case "advanced-console":
                    return new AdvancedConsoleLogger_1.AdvancedConsoleLogger(options);
                case "debug":
                    return new DebugLogger_1.DebugLogger();
            }
        }
        return new AdvancedConsoleLogger_1.AdvancedConsoleLogger(options);
    }
}
exports.LoggerFactory = LoggerFactory;
