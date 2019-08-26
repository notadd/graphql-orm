"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FindOperator_1 = require("../find-options/FindOperator");
function isFieldNode(obj) {
    return obj.kind === 'Field';
}
exports.isFieldNode = isFieldNode;
function isFragmentSpreadNode(obj) {
    return obj.kind === 'FragmentSpread';
}
exports.isFragmentSpreadNode = isFragmentSpreadNode;
function isInlineFragmentNode(obj) {
    return obj.kind === 'InlineFragment';
}
exports.isInlineFragmentNode = isInlineFragmentNode;
function isVariableNode(obj) {
    return obj.kind === 'Variable';
}
exports.isVariableNode = isVariableNode;
function isIntValueNode(obj) {
    return obj.kind === 'IntValue';
}
exports.isIntValueNode = isIntValueNode;
function isFloatValueNode(obj) {
    return obj.kind === 'FloatValue';
}
exports.isFloatValueNode = isFloatValueNode;
function isStringValueNode(obj) {
    return obj.kind === 'StringValue';
}
exports.isStringValueNode = isStringValueNode;
function isBooleanValueNode(obj) {
    return obj.kind === 'BooleanValue';
}
exports.isBooleanValueNode = isBooleanValueNode;
function isNullValueNode(obj) {
    return obj.kind === 'NullValue';
}
exports.isNullValueNode = isNullValueNode;
function isEnumValueNode(obj) {
    return obj.kind === 'EnumValue';
}
exports.isEnumValueNode = isEnumValueNode;
function isListValueNode(obj) {
    return obj.kind === 'ListValue';
}
exports.isListValueNode = isListValueNode;
function isObjectValueNode(obj) {
    return obj.kind === 'ObjectValue';
}
exports.isObjectValueNode = isObjectValueNode;
class SelectionSet {
    constructor(info, variables, enums, level = 0, parent) {
        this.children = [];
        this.level = 0;
        this.arguments = {};
        this.selections = [];
        this.relations = [];
        this.actions = [];
        this.info = info;
        const name = info.name.value;
        const alias = info.alias ? info.alias.value : undefined;
        this.name = name;
        this.parent = parent;
        this.level = level;
        this.alias = alias;
        this.variables = variables;
        this.enums = enums;
    }
    onInit() {
        const args = this.info.arguments;
        console.log({
            name: this.name,
            entities: this.entities,
            handlers: this.handlers
        });
        const type = this.handlers[this.operation][this.name][5];
        this.types = this.entities[type];
        console.log({ types: this.types });
        if (args && args.length > 0) {
            if (this.types) {
                this.types.find(type => type.name === this.name);
            }
            args.map((arg, index) => {
                const name = arg.name.value;
                if (isVariableNode(arg.value)) {
                    this.arguments[name] = this.variables[arg.value.name.value];
                }
                else if (isIntValueNode(arg.value)) {
                    this.arguments[name] = arg.value.value;
                }
                else if (isFloatValueNode(arg.value)) {
                    this.arguments[name] = arg.value.value;
                }
                else if (isStringValueNode(arg.value)) {
                    this.arguments[name] = arg.value.value;
                }
                else if (isBooleanValueNode(arg.value)) {
                    this.arguments[name] = arg.value.value;
                }
                else if (isNullValueNode(arg.value)) {
                    this.arguments[name] = null;
                }
                else if (isEnumValueNode(arg.value)) {
                    this.arguments[name] = undefined;
                }
                else if (isListValueNode(arg.value)) {
                    this.arguments[name] = arg.value.values.map(value => this.createValue(value));
                }
                else {
                    let res = {};
                    arg.value.fields.map(field => {
                        res[field.name.value] = this.createValue(field.value);
                    });
                    this.arguments[name] = res;
                }
            });
        }
        if (this.info && this.info.selectionSet) {
            this.info.selectionSet.selections && this.info.selectionSet.selections.map(selection => {
                if (isFieldNode(selection)) {
                    this.create(selection, this.variables, this.enums);
                }
                else if (isFragmentSpreadNode(selection)) { }
                else { }
            });
        }
    }
    createValue(val) {
        if (isVariableNode(val)) {
            return this.variables[val.name.value];
        }
        else if (isIntValueNode(val)) {
            return val.value;
        }
        else if (isFloatValueNode(val)) {
            return val.value;
        }
        else if (isStringValueNode(val)) {
            return val.value;
        }
        else if (isBooleanValueNode(val)) {
            return val.value;
        }
        else if (isNullValueNode(val)) {
            return null;
        }
        else if (isEnumValueNode(val)) {
            return undefined;
        }
        else if (isListValueNode(val)) {
            return val.values.map(value => this.createValue(value));
        }
        else {
            let res = {};
            val.fields.map(field => {
                res[field.name.value] = this.createValue(field.value);
            });
            return res;
        }
    }
    getTop() {
        if (this.parent)
            return this.parent.getTop();
        return this;
    }
    addSelect(name) {
        if (this.parent) {
            this.parent.addSelect(name);
            const item = this.parent.selections.find(re => re === name);
            if (!item) {
                this.parent.selections.push(name);
            }
        }
    }
    addRelation(name) {
        if (this.parent) {
            this.parent.addRelation(`${this.parent.name}.${name}`);
            const item = this.parent.relations.find(re => re === name);
            if (!item) {
                this.parent.relations.push(name);
            }
        }
    }
    addAction(name) {
        if (this.parent) {
            this.parent.addAction(`${this.parent.name}.${name}`);
            const item = this.parent.actions.find(re => re.name === name);
            if (!item) {
                this.parent.actions.push({ name, args: this.arguments });
            }
        }
    }
    hasChildren() {
        return this.children.length > 0;
    }
    getPath() {
        let paths = [];
        if (this.parent) {
            paths.push(...this.parent.getPath());
        }
        paths.push(this.name);
        return paths;
    }
    toRelation() {
        if (this.hasChildren()) {
            if (Object.keys(this.arguments).length === 0) {
                this.addRelation(this.name);
            }
            else {
                this.addAction(this.name);
            }
        }
        else {
            if (Object.keys(this.arguments).length === 0) {
                this.addSelect(this.name);
            }
            else {
                this.addAction(this.name);
            }
        }
    }
    toRelations() {
        this.toRelation();
        this.children.map(child => child.toRelations());
    }
    create(field, variables, enums = {}) {
        const set = new SelectionSet(field, variables, enums, this.level + 1, this);
        set.entities = this.entities;
        set.handlers = this.handlers;
        set.operation = this.operation;
        set.onInit();
        this.children.push(set);
    }
    toTypeorm() {
        return {
            alias: this.alias,
            name: this.name,
            select: this.selections,
            relations: this.relations,
            actions: this.actions
        };
    }
    static fromOperationDefinitionNode(operation, variables, enums = {}) {
        return operation.selectionSet.selections.map(selection => {
            if (isFieldNode(selection)) {
                const set = SelectionSet.fromJson(selection, variables, enums);
                set.onInit();
                return set.toTypeorm();
            }
            else if (isFragmentSpreadNode(selection)) {
            }
            else { }
        }).filter(res => !!res);
    }
    static fromJson(field, variables, enums) {
        const set = new SelectionSet(field, variables, enums);
        set.onInit();
        set.toRelations();
        return set;
    }
    static fromGraphql(info, enums = {}, entities, handlers) {
        return info.fieldNodes.map(it => {
            const set = new SelectionSet(it, info.variableValues, enums);
            set.entities = entities;
            set.handlers = handlers;
            set.operation = info.operation.operation;
            set.onInit();
            set.toRelations();
            return set;
        });
    }
    /**
     * 创建where
     * "lessThan"
    | "lessThanOrEqual"
    | "moreThan"
    | "moreThanOrEqual"
    | "equal"
    | "between"
    | "in"
    | "any"
    | "isNull"
    | "like"
    | "raw";
     */
    static createWhere(where) {
        if (Array.isArray(where)) {
            return where;
        }
        else if (typeof where === 'object') {
            let res = {};
            Object.keys(where).map(key => {
                let item = where[key];
                const keys = key.split('_');
                if (keys.length === 1) {
                    res[keys[0]] = this.createWhere(item);
                }
                else {
                    const [column, action] = keys;
                    if (Array.isArray(item)) {
                        res[column] = new FindOperator_1.FindOperator(action, this.createWhere(item), true, true);
                    }
                }
            });
            return res;
        }
        else {
            return new FindOperator_1.FindOperator('equal', where, true, true);
        }
    }
}
exports.SelectionSet = SelectionSet;
//# sourceMappingURL=selectionSet.js.map