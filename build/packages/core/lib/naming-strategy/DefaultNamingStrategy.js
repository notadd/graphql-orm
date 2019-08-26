"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RandomGenerator_1 = require("../util/RandomGenerator");
const StringUtils_1 = require("../util/StringUtils");
const Table_1 = require("../schema-builder/table/Table");
/**
 * Naming strategy that is used by default.
 */
class DefaultNamingStrategy {
    /**
     * Normalizes table name.
     *
     * @param targetName Name of the target entity that can be used to generate a table name.
     * @param userSpecifiedName For example if user specified a table name in a decorator, e.g. @Entity("name")
     */
    tableName(targetName, userSpecifiedName) {
        return userSpecifiedName ? userSpecifiedName : StringUtils_1.snakeCase(targetName);
    }
    /**
     * Creates a table name for a junction table of a closure table.
     *
     * @param originalClosureTableName Name of the closure table which owns this junction table.
     */
    closureJunctionTableName(originalClosureTableName) {
        return originalClosureTableName + "_closure";
    }
    columnName(propertyName, customName, embeddedPrefixes) {
        if (embeddedPrefixes.length)
            return StringUtils_1.camelCase(embeddedPrefixes.join("_")) + (customName ? StringUtils_1.titleCase(customName) : StringUtils_1.titleCase(propertyName));
        return customName ? customName : propertyName;
    }
    relationName(propertyName) {
        return propertyName;
    }
    primaryKeyName(tableOrName, columnNames) {
        // sort incoming column names to avoid issue when ["id", "name"] and ["name", "id"] arrays
        const clonedColumnNames = [...columnNames];
        clonedColumnNames.sort();
        const tableName = tableOrName instanceof Table_1.Table ? tableOrName.name : tableOrName;
        const replacedTableName = tableName.replace(".", "_");
        const key = `${replacedTableName}_${clonedColumnNames.join("_")}`;
        return "PK_" + RandomGenerator_1.RandomGenerator.sha1(key).substr(0, 27);
    }
    uniqueConstraintName(tableOrName, columnNames) {
        // sort incoming column names to avoid issue when ["id", "name"] and ["name", "id"] arrays
        const clonedColumnNames = [...columnNames];
        clonedColumnNames.sort();
        const tableName = tableOrName instanceof Table_1.Table ? tableOrName.name : tableOrName;
        const replacedTableName = tableName.replace(".", "_");
        const key = `${replacedTableName}_${clonedColumnNames.join("_")}`;
        return "UQ_" + RandomGenerator_1.RandomGenerator.sha1(key).substr(0, 27);
    }
    relationConstraintName(tableOrName, columnNames, where) {
        // sort incoming column names to avoid issue when ["id", "name"] and ["name", "id"] arrays
        const clonedColumnNames = [...columnNames];
        clonedColumnNames.sort();
        const tableName = tableOrName instanceof Table_1.Table ? tableOrName.name : tableOrName;
        const replacedTableName = tableName.replace(".", "_");
        let key = `${replacedTableName}_${clonedColumnNames.join("_")}`;
        if (where)
            key += `_${where}`;
        return "REL_" + RandomGenerator_1.RandomGenerator.sha1(key).substr(0, 26);
    }
    defaultConstraintName(tableOrName, columnName) {
        const tableName = tableOrName instanceof Table_1.Table ? tableOrName.name : tableOrName;
        const replacedTableName = tableName.replace(".", "_");
        const key = `${replacedTableName}_${columnName}`;
        return "DF_" + RandomGenerator_1.RandomGenerator.sha1(key).substr(0, 27);
    }
    foreignKeyName(tableOrName, columnNames) {
        // sort incoming column names to avoid issue when ["id", "name"] and ["name", "id"] arrays
        const clonedColumnNames = [...columnNames];
        clonedColumnNames.sort();
        const tableName = tableOrName instanceof Table_1.Table ? tableOrName.name : tableOrName;
        const replacedTableName = tableName.replace(".", "_");
        const key = `${replacedTableName}_${clonedColumnNames.join("_")}`;
        return "FK_" + RandomGenerator_1.RandomGenerator.sha1(key).substr(0, 27);
    }
    indexName(tableOrName, columnNames, where) {
        // sort incoming column names to avoid issue when ["id", "name"] and ["name", "id"] arrays
        const clonedColumnNames = [...columnNames];
        clonedColumnNames.sort();
        const tableName = tableOrName instanceof Table_1.Table ? tableOrName.name : tableOrName;
        const replacedTableName = tableName.replace(".", "_");
        let key = `${replacedTableName}_${clonedColumnNames.join("_")}`;
        if (where)
            key += `_${where}`;
        return "IDX_" + RandomGenerator_1.RandomGenerator.sha1(key).substr(0, 26);
    }
    checkConstraintName(tableOrName, expression) {
        const tableName = tableOrName instanceof Table_1.Table ? tableOrName.name : tableOrName;
        const replacedTableName = tableName.replace(".", "_");
        const key = `${replacedTableName}_${expression}`;
        return "CHK_" + RandomGenerator_1.RandomGenerator.sha1(key).substr(0, 26);
    }
    exclusionConstraintName(tableOrName, expression) {
        const tableName = tableOrName instanceof Table_1.Table ? tableOrName.name : tableOrName;
        const replacedTableName = tableName.replace(".", "_");
        const key = `${replacedTableName}_${expression}`;
        return "XCL_" + RandomGenerator_1.RandomGenerator.sha1(key).substr(0, 26);
    }
    joinColumnName(relationName, referencedColumnName) {
        return StringUtils_1.camelCase(relationName + "_" + referencedColumnName);
    }
    joinTableName(firstTableName, secondTableName, firstPropertyName, secondPropertyName) {
        return StringUtils_1.snakeCase(firstTableName + "_" + firstPropertyName.replace(/\./gi, "_") + "_" + secondTableName);
    }
    joinTableColumnDuplicationPrefix(columnName, index) {
        return columnName + "_" + index;
    }
    joinTableColumnName(tableName, propertyName, columnName) {
        return StringUtils_1.camelCase(tableName + "_" + (columnName ? columnName : propertyName));
    }
    joinTableInverseColumnName(tableName, propertyName, columnName) {
        return this.joinTableColumnName(tableName, propertyName, columnName);
    }
    /**
     * Adds globally set prefix to the table name.
     * This method is executed no matter if prefix was set or not.
     * Table name is either user's given table name, either name generated from entity target.
     * Note that table name comes here already normalized by #tableName method.
     */
    prefixTableName(prefix, tableName) {
        return prefix + tableName;
    }
    eagerJoinRelationAlias(alias, propertyPath) {
        return alias + "_" + propertyPath.replace(".", "_");
    }
}
exports.DefaultNamingStrategy = DefaultNamingStrategy;
