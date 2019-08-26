"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 */
class QueryRunnerAlreadyReleasedError extends Error {
    constructor() {
        super();
        this.name = "QueryRunnerAlreadyReleasedError";
        Object.setPrototypeOf(this, QueryRunnerAlreadyReleasedError.prototype);
        this.message = `Query runner already released. Cannot run queries anymore.`;
    }
}
exports.QueryRunnerAlreadyReleasedError = QueryRunnerAlreadyReleasedError;
