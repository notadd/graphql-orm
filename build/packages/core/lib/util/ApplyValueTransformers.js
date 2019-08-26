"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ApplyValueTransformers {
    static transformFrom(transformer, databaseValue) {
        if (Array.isArray(transformer)) {
            const reverseTransformers = transformer.slice().reverse();
            return reverseTransformers.reduce((transformedValue, _transformer) => {
                return _transformer.from(transformedValue);
            }, databaseValue);
        }
        return transformer.from(databaseValue);
    }
    static transformTo(transformer, entityValue) {
        if (Array.isArray(transformer)) {
            return transformer.reduce((transformedValue, _transformer) => {
                return _transformer.to(transformedValue);
            }, entityValue);
        }
        return transformer.to(entityValue);
    }
}
exports.ApplyValueTransformers = ApplyValueTransformers;
