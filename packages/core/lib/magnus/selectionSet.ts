import {
  SelectionNode,
  GraphQLResolveInfo,
  ListValueNode,
  EnumValueNode,
  NullValueNode,
  BooleanValueNode,
  StringValueNode,
  FloatValueNode,
  IntValueNode,
  ValueNode,
  VariableNode,
  OperationDefinitionNode,
  FieldNode,
  FragmentSpreadNode,
  InlineFragmentNode
} from "graphql";
import { FindOperator } from "../find-options/FindOperator";
export function isFieldNode(obj: SelectionNode): obj is FieldNode {
  return obj.kind === "Field";
}
export function isFragmentSpreadNode(
  obj: SelectionNode
): obj is FragmentSpreadNode {
  return obj.kind === "FragmentSpread";
}
export function isInlineFragmentNode(
  obj: SelectionNode
): obj is InlineFragmentNode {
  return obj.kind === "InlineFragment";
}
export function isVariableNode(obj: ValueNode): obj is VariableNode {
  return obj.kind === "Variable";
}
export function isIntValueNode(obj: ValueNode): obj is IntValueNode {
  return obj.kind === "IntValue";
}
export function isFloatValueNode(obj: ValueNode): obj is FloatValueNode {
  return obj.kind === "FloatValue";
}
export function isStringValueNode(obj: ValueNode): obj is StringValueNode {
  return obj.kind === "StringValue";
}
export function isBooleanValueNode(obj: ValueNode): obj is BooleanValueNode {
  return obj.kind === "BooleanValue";
}
export function isNullValueNode(obj: ValueNode): obj is NullValueNode {
  return obj.kind === "NullValue";
}
export function isEnumValueNode(obj: ValueNode): obj is EnumValueNode {
  return obj.kind === "EnumValue";
}
export function isListValueNode(obj: ValueNode): obj is ListValueNode {
  return obj.kind === "ListValue";
}
export function isObjectValueNode(obj: ValueNode): obj is ListValueNode {
  return obj.kind === "ObjectValue";
}
import { Metadatas, Metadata, HandlerDefMap } from "./types";
import { FindOperatorType } from "../find-options/FindOperatorType";

export class SelectionSet {
  parent?: SelectionSet;
  children: SelectionSet[] = [];
  name: string;
  /**
   * 路径
   */
  path: string;
  alias?: string;
  level: number = 0;
  variables: any;
  enums: any;

  arguments: any[] = [];
  selections: string[] = [];
  relations: string[] = [];
  actions: { name: string; args: any; path: string }[] = [];
  operation: string;
  types: any[];
  info: FieldNode;
  constructor(
    info: FieldNode,
    variables: any,
    enums: any,
    level: number = 0,
    parent?: SelectionSet
  ) {
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
  decorators: any = {};
  source: any;
  context: any;
  methods: Metadata[] = [];
  findParams(name: string): Metadata | undefined {
    if (this.parent) {
      this.parent.methods = this.parent.methods || [];
      const item = this.parent.methods.find(it => it.name === name);
      if (item) return item;
      return this.parent.findParams(name);
    }
  }
  type: string;
  currentEntity: string;
  relation: string;
  getCurrentEntity() {
    if (this.currentEntity) {
      if (this.isEntity) {
        return this.currentEntity;
      }
    }
    if (this.parent) return this.parent.getCurrentEntity();
  }
  setRelation(name: string) {
    const relation = this.getRelation();
    if (relation) {
      this.relation = `${relation}.${name}`;
    } else {
      this.relation = name;
    }
  }
  getRelation() {
    if (!this.isAction) {
      return;
    }
    if (this.relation) return this.relation;
    if (this.parent) return this.parent.getRelation();
  }
  isAction: boolean = false;
  isEntity: boolean = false;
  typeArgument: any;
  handlerEntity(type: any) {
    if (!type) {
      return;
    }
    this.type = type.type;
    this.currentEntity = type.fullName.replace(type.type, "");
    if (this.entities[this.type]) {
      this.methods = this.entities[this.type];
    } else {
      this.isEntity = true;
      this.methods = this.entities[this.getCurrentEntity()];
    }
    if (type.typeArguments && type.typeArguments.length > 0) {
      this.typeArgument = type.typeArguments[0];
    }
  }
  onInit() {
    const args = this.info.arguments;
    let types = [];
    if (this.parent) {
      const param = this.parent.methods.find(
        method => method.name === this.name
      );
      if (param) {
        if (param.parameters) {
          types = param.parameters;
        }
        this.handlerEntity(param.entity);
        if (param.decorators.includes("ResolveProperty")) {
          this.isAction = true;
          this.addAction(this.getPath().join("."));
        } else if (param.decorators.includes("ManyToMany")) {
          this.setRelation(param.name);
          this.addRelation();
        } else if (param.decorators.includes("ManyToOne")) {
          this.setRelation(param.name);
          this.addRelation();
        } else if (param.decorators.includes("TreeParent")) {
          this.setRelation(param.name);
          this.addRelation();
        } else if (param.decorators.includes("TreeChildren")) {
          this.setRelation(param.name);
          this.addRelation();
        } else if (param.decorators.includes("OneToMany")) {
          this.setRelation(param.name);
          this.addRelation();
        } else if (param.decorators.includes("OneToOne")) {
          this.setRelation(param.name);
          this.addRelation();
        } else {
          const rel = this.getRelation();
          if (!rel) {
            this.addSelect(param.name);
          } else {
            // this.addSelect(`${rel}.${param.name}`);
          }
        }
        types = param.parameters || [];
      }
    } else {
      const item = this.handlers[this.operation].find(
        it => it[0] === this.name
      );
      if (item) {
        const type = item[5];
        types = item[4] || [];
        if (type && !this.type) {
          this.handlerEntity(type);
        }
      }
    }
    this.arguments = new Array(types.length);
    if (args && args.length > 0) {
      const params = {};
      args.map((arg, index) => {
        const name = arg.name.value;
        if (isVariableNode(arg.value)) {
          params[name] = this.variables[arg.name.value];
        } else if (isIntValueNode(arg.value)) {
          params[name] = parseInt(arg.value.value, 10);
        } else if (isFloatValueNode(arg.value)) {
          params[name] = parseFloat(arg.value.value);
        } else if (isStringValueNode(arg.value)) {
          params[name] = arg.value.value;
        } else if (isBooleanValueNode(arg.value)) {
          params[name] = !!arg.value.value;
        } else if (isNullValueNode(arg.value)) {
          params[name] = null;
        } else if (isEnumValueNode(arg.value)) {
          params[name] = undefined;
        } else if (isListValueNode(arg.value)) {
          params[name] = arg.value.values.map(value => this.createValue(value));
        } else {
          let res = {};
          arg.value.fields.map(field => {
            res[field.name.value] = this.createValue(field.value);
          });
          params[name] = res;
        }
      });
      types.map((t, index) => {
        this.arguments[index] = params[t.name];
        if (t.decorator && t.decorator.length > 0) {
          t.decorator.map(dec => {
            if (this.decorators[dec]) {
              this.arguments[index] = this.decorators[dec]()()(
                this.arguments[index],
                this
              );
            }
          });
        }
      });
    }
    if (this.info && this.info.selectionSet) {
      this.info.selectionSet.selections &&
        this.info.selectionSet.selections.map(selection => {
          if (isFieldNode(selection)) {
            this.create(selection, this.variables, this.enums);
          } else if (isFragmentSpreadNode(selection)) {
          } else {
          }
        });
    }
  }

  createValue(val: ValueNode) {
    if (isVariableNode(val)) {
      return this.variables[val.name.value];
    } else if (isIntValueNode(val)) {
      return val.value;
    } else if (isFloatValueNode(val)) {
      return val.value;
    } else if (isStringValueNode(val)) {
      return val.value;
    } else if (isBooleanValueNode(val)) {
      return val.value;
    } else if (isNullValueNode(val)) {
      return null;
    } else if (isEnumValueNode(val)) {
      return undefined;
    } else if (isListValueNode(val)) {
      return val.values.map(value => this.createValue(value));
    } else {
      let res = {};
      val.fields.map(field => {
        res[field.name.value] = this.createValue(field.value);
      });
      return res;
    }
  }

  getTop(): SelectionSet {
    if (this.parent) return this.parent.getTop();
    return this;
  }

  addSelect(name: string): void {
    if (this.parent) {
      this.parent.addSelect(name);
      const item = this.parent.selections.find(re => re === name);
      if (!item) {
        this.parent.selections.push(name);
      }
    }
  }
  addRelation(name?: string): void {
    const relation = this.getRelation();
    if (this.parent) {
      if (name || this.relation) {
        this.parent.addRelation(name || `${this.relation}`);
      }
      if (name) {
        const item = this.parent.relations.find(re => re === name);
        if (!item) {
          this.parent.relations.push(name);
        }
      }
    }
  }

  addAction(name: string) {
    if (this.parent) {
      this.parent.addAction(`${this.parent.name}.${name}`);
      const item = this.parent.actions.find(re => re.name === name);
      if (!item) {
        this.parent.actions.push({
          name: this.name,
          args: this.arguments,
          path: name
        });
      }
    }
  }

  hasChildren(): boolean {
    return this.children.length > 0;
  }

  getPath() {
    let paths: string[] = [];
    if (this.parent) {
      paths.push(...this.parent.getPath());
    }
    paths.push(this.name);
    return paths;
  }
  toRelation() {
    if (this.hasChildren()) {
      if (Object.keys(this.arguments).length > 0) {
        this.addAction(this.name);
      }
    } else {
      if (Object.keys(this.arguments).length > 0) {
        this.addAction(this.name);
      }
    }
  }

  toRelations() {
    this.toRelation();
    this.children.map(child => child.toRelations());
  }

  create(field: any, variables: any, enums: any = {}) {
    const set = new SelectionSet(field, variables, enums, this.level + 1, this);
    set.entities = this.entities;
    set.handlers = this.handlers;
    set.operation = this.operation;
    set.context = this.context;
    set.variables = this.variables;
    set.source = this.source;
    set.decorators = this.decorators;
    if (this.typeArgument) {
      set.handlerEntity(this.typeArgument);
    }
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

  static fromOperationDefinitionNode(
    operation: OperationDefinitionNode,
    variables: any,
    enums: any = {}
  ) {
    return operation.selectionSet.selections
      .map(selection => {
        if (isFieldNode(selection)) {
          const set = SelectionSet.fromJson(selection, variables, enums);
          set.onInit();
          return set.toTypeorm();
        } else if (isFragmentSpreadNode(selection)) {
        } else {
        }
      })
      .filter(res => !!res);
  }

  static fromJson(field: FieldNode, variables: any, enums: any) {
    const set = new SelectionSet(field, variables, enums);
    set.onInit();
    set.toRelations();
    return set;
  }
  entities: Metadatas;
  handlers: HandlerDefMap;
  static fromGraphql({
    info,
    enums,
    entities,
    handlers,
    decorators,
    context,
    source,
    variables
  }: {
    info: GraphQLResolveInfo;
    enums?: any;
    entities?: any;
    handlers?: any;
    decorators?: any;
    context?: any;
    source?: any;
    variables?: any;
  }) {
    return info.fieldNodes.map(it => {
      const set = new SelectionSet(it, info.variableValues, enums);
      set.entities = entities || {};
      set.handlers = handlers || {};
      set.decorators = decorators || {};
      set.operation = info.operation.operation;
      set.context = context || {};
      set.source = source || {};
      set.variables = variables || {};
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
  static createWhere(where: any) {
    if (Array.isArray(where)) {
      return where;
    } else if (typeof where === "object") {
      let res = {};
      Object.keys(where).map(key => {
        let item = where[key];
        const keys = key.split("_");
        if (keys.length === 1) {
          res[keys[0]] = this.createWhere(item);
        } else {
          const [column, action] = keys;
          let operator: FindOperatorType = `equal`;
          const act = action.toLocaleLowerCase();
          switch (act) {
            case "not":
            case "Not":
              operator = "not";
              break;
            case "lt":
            case "Lt":
              operator = "lessThan";
              break;
            case "lte":
            case "Lte":
              operator = "lessThanOrEqual";
              break;
            case "gt":
            case "Gt":
              operator = "moreThan";
              break;
            case "gte":
            case "Gte":
              operator = "moreThanOrEqual";
              break;
            case "like":
            case "Like":
              operator = "like";
              break;
            case "between":
            case "Between":
              operator = "between";
              break;
            case "in":
            case "In":
              operator = "in";
              break;
            case "any":
            case "Any":
              operator = "any";
              break;
            case "isNull":
            case "isnull":
            case "IsNull":
              operator = "isNull";
              break;
            case "raw":
            case "Raw":
              operator = "raw";
              break;
            default:
              operator = "equal";
              break;
          }
          if (Array.isArray(item)) {
            res[column] = new FindOperator(
              operator,
              this.createWhere(item),
              true,
              true
            );
          } else {
            res[column] = new FindOperator(
              operator,
              this.createWhere(item),
              true,
              false
            );
          }
        }
      });
      return res;
    } else {
      return new FindOperator("equal", where, true, false);
    }
  }
}
