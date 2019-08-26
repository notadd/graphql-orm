"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EntityManager_1 = require("./EntityManager");
const MongoEntityManager_1 = require("./MongoEntityManager");
const MongoDriver_1 = require("../driver/mongodb/MongoDriver");
const SqljsEntityManager_1 = require("./SqljsEntityManager");
const SqljsDriver_1 = require("../driver/sqljs/SqljsDriver");
/**
 * Helps to create entity managers.
 */
class EntityManagerFactory {
    /**
     * Creates a new entity manager depend on a given connection's driver.
     */
    create(connection, queryRunner) {
        if (connection.driver instanceof MongoDriver_1.MongoDriver)
            return new MongoEntityManager_1.MongoEntityManager(connection);
        if (connection.driver instanceof SqljsDriver_1.SqljsDriver)
            return new SqljsEntityManager_1.SqljsEntityManager(connection, queryRunner);
        return new EntityManager_1.EntityManager(connection, queryRunner);
    }
}
exports.EntityManagerFactory = EntityManagerFactory;
//# sourceMappingURL=EntityManagerFactory.js.map