"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 */
class MetadataWithSuchNameAlreadyExistsError extends Error {
    constructor(metadataType, name) {
        super();
        this.name = "MetadataWithSuchNameAlreadyExistsError";
        Object.setPrototypeOf(this, MetadataWithSuchNameAlreadyExistsError.prototype);
        this.message = metadataType + " metadata with such name " + name + " already exists. " +
            "Do you apply decorator twice? Or maybe try to change a name?";
    }
}
exports.MetadataWithSuchNameAlreadyExistsError = MetadataWithSuchNameAlreadyExistsError;
