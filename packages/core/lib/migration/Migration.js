"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Represents entity of the migration in the database.
 */
class Migration {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(id, timestamp, name, instance) {
        this.id = id;
        this.timestamp = timestamp;
        this.name = name;
        this.instance = instance;
    }
}
exports.Migration = Migration;
//# sourceMappingURL=Migration.js.map