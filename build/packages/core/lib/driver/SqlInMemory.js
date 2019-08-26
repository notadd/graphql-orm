"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This class stores up and down queries needed for migrations functionality.
 */
class SqlInMemory {
    constructor() {
        this.upQueries = [];
        this.downQueries = [];
    }
}
exports.SqlInMemory = SqlInMemory;
