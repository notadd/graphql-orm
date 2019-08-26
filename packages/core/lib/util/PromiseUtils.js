"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Utils to help to work with Promise objects.
 */
class PromiseUtils {
    /**
     * Creates a new promise with resolved value used for lazy relations.
     */
    static create(value) {
        const promise = Promise.resolve(value);
        promise["__value__"] = value;
        return promise;
    }
    /**
     * If given value is a promise created by "create" method this method gets its value.
     * If given value is not a promise then given value is returned back.
     */
    static extractValue(object) {
        if (object instanceof Promise && object["__value__"])
            return object["__value__"];
        return object;
    }
    /**
     * Runs given callback that returns promise for each item in the given collection in order.
     * Operations executed after each other, right after previous promise being resolved.
     */
    static runInSequence(collection, callback) {
        const results = [];
        return collection.reduce((promise, item) => {
            return promise.then(() => {
                return callback(item);
            }).then(result => {
                results.push(result);
            });
        }, Promise.resolve()).then(() => {
            return results;
        });
    }
    /**
     * Returns a promise that is fulfilled with an array of promise state snapshots,
     * but only after all the original promises have settled, i.e. become either fulfilled or rejected.
     */
    static settle(promises) {
        return Promise.all(promises.map(p => Promise.resolve(p).then(v => ({
            state: "fulfilled",
            value: v,
        }), r => ({
            state: "rejected",
            reason: r,
        })))).then((results) => {
            const rejected = results.find(result => result.state === "rejected");
            if (rejected)
                return Promise.reject(rejected.reason);
            return results.map(result => result.value);
        });
    }
}
exports.PromiseUtils = PromiseUtils;
//# sourceMappingURL=PromiseUtils.js.map