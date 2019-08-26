"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * View in the database represented in this class.
 */
class View {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(options) {
        if (options) {
            this.name = options.name;
            this.expression = options.expression;
        }
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Clones this table to a new table with all properties cloned.
     */
    clone() {
        return new View({
            name: this.name,
            expression: this.expression,
        });
    }
    // -------------------------------------------------------------------------
    // Static Methods
    // -------------------------------------------------------------------------
    /**
     * Creates view from a given entity metadata.
     */
    static create(entityMetadata, driver) {
        const options = {
            name: driver.buildTableName(entityMetadata.tableName, entityMetadata.schema, entityMetadata.database),
            expression: entityMetadata.expression,
        };
        return new View(options);
    }
}
exports.View = View;
