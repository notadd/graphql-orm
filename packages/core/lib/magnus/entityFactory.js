"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
class EntityFactory {
    constructor(options) {
        this.options = options;
    }
    create(instance, path, name) {
        const members = this.options.entities[name];
        if (members) {
            const methods = members
                .map(member => {
                if (member.decorators.includes("ResolveProperty")) {
                    return member.name;
                }
            })
                .filter(it => !!it);
            const createSet = this.options.createSet;
            let target = lodash_1.get(instance, path);
            if (target) {
                if (Array.isArray(target)) {
                    lodash_1.set(instance, path, target.map(tar => {
                        return new Proxy(tar, {
                            get(target, p, receiver) {
                                if (methods.includes(p)) {
                                    return (variables, context, info) => {
                                        const set = createSet(info.fieldNodes[0]);
                                        const args = set.getArguments();
                                        const call = target[p].bind(target);
                                        return call(...args);
                                    };
                                }
                                else {
                                    return target[p];
                                }
                            }
                        });
                    }));
                }
                else {
                    lodash_1.set(instance, path, new Proxy(target, {
                        get(target, p, receiver) {
                            if (methods.includes(p)) {
                                return (variables, context, info) => {
                                    const set = createSet({ info, context });
                                    const args = set.getArguments();
                                    const call = target[p].bind(target);
                                    return call(...args);
                                };
                            }
                            else {
                                return target[p];
                            }
                        }
                    }));
                }
            }
        }
        return instance;
    }
}
exports.EntityFactory = EntityFactory;
//# sourceMappingURL=entityFactory.js.map