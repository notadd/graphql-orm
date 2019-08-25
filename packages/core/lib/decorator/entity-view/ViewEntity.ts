import {getMetadataArgsStorage} from "../../";
import {TableMetadataArgs} from "../../metadata-args/TableMetadataArgs";
import {ViewEntityOptions} from "../options/ViewEntityOptions";

/**
 * This decorator is used to mark classes that will be an entity view.
 * Database schema will be created for all classes decorated with it, and Repository can be retrieved and used for it.
 */
export function ViewEntity(options?: ViewEntityOptions): Function;

/**
 * This decorator is used to mark classes that will be an entity view.
 * Database schema will be created for all classes decorated with it, and Repository can be retrieved and used for it.
 */
export function ViewEntity(name?: string, options?: ViewEntityOptions): Function;

/**
 * This decorator is used to mark classes that will be an entity view.
 * Database schema will be created for all classes decorated with it, and Repository can be retrieved and used for it.
 */
export function ViewEntity(nameOrOptions?: string|ViewEntityOptions, maybeOptions?: ViewEntityOptions): Function {
    const options = (typeof nameOrOptions === "object" ? nameOrOptions as ViewEntityOptions : maybeOptions) || {};
    const name = typeof nameOrOptions === "string" ? nameOrOptions : options.name;

    return function (target: Function) {
        getMetadataArgsStorage().tables.push({
            target: target,
            name: name,
            expression: options.expression,
            type: "view",
            database: options.database ? options.database : undefined,
            schema: options.schema ? options.schema : undefined,
        } as TableMetadataArgs);
    };
}
