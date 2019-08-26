"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../../");
const EventListenerTypes_1 = require("../../metadata/types/EventListenerTypes");
/**
 * Calls a method on which this decorator is applied after entity is loaded.
 */
function AfterLoad() {
    return function (object, propertyName) {
        __1.getMetadataArgsStorage().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName,
            type: EventListenerTypes_1.EventListenerTypes.AFTER_LOAD
        });
    };
}
exports.AfterLoad = AfterLoad;
//# sourceMappingURL=AfterLoad.js.map