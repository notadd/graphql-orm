"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EntityFactory {
    constructor(options) {
        this.options = options;
    }
    create(instance, name) {
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
            const options = this.options;
            return new Proxy(instance, {
                get(target, p, receiver) {
                    if (methods.includes(p)) {
                        return (variables, context, info) => {
                            const set = createSet(info.fieldNodes[0]);
                            const args = set.getArguments();
                            return target[p].bind(target)(...args);
                        };
                    }
                    else {
                        return target[p];
                    }
                }
            });
        }
        return instance;
    }
}
exports.EntityFactory = EntityFactory;
//# sourceMappingURL=entityFactory.js.map