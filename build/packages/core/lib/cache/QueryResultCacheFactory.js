"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RedisQueryResultCache_1 = require("./RedisQueryResultCache");
const DbQueryResultCache_1 = require("./DbQueryResultCache");
/**
 * Caches query result into Redis database.
 */
class QueryResultCacheFactory {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        this.connection = connection;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a new query result cache based on connection options.
     */
    create() {
        if (!this.connection.options.cache)
            throw new Error(`To use cache you need to enable it in connection options by setting cache: true or providing some caching options. Example: { host: ..., username: ..., cache: true }`);
        if (this.connection.options.cache.type === "redis")
            return new RedisQueryResultCache_1.RedisQueryResultCache(this.connection, "redis");
        if (this.connection.options.cache.type === "ioredis")
            return new RedisQueryResultCache_1.RedisQueryResultCache(this.connection, "ioredis");
        if (this.connection.options.cache.type === "ioredis/cluster")
            return new RedisQueryResultCache_1.RedisQueryResultCache(this.connection, "ioredis/cluster");
        return new DbQueryResultCache_1.DbQueryResultCache(this.connection);
    }
}
exports.QueryResultCacheFactory = QueryResultCacheFactory;
