"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Thrown when same object is scheduled for remove and updation at the same time.
 */
class SubjectRemovedAndUpdatedError extends Error {
    constructor(subject) {
        super();
        this.name = "SubjectRemovedAndUpdatedError";
        Object.setPrototypeOf(this, SubjectRemovedAndUpdatedError.prototype);
        this.message = `Removed entity "${subject.metadata.name}" is also scheduled for update operation. ` +
            `Make sure you are not updating and removing same object (note that update or remove may be executed by cascade operations).`;
    }
}
exports.SubjectRemovedAndUpdatedError = SubjectRemovedAndUpdatedError;
