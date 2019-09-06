import { GraphQLResolveInfo, FieldNode, ValueNode } from "graphql";
import {
  isFieldNode,
  isFragmentSpreadNode,
  isVariableNode,
  isIntValueNode,
  isFloatValueNode,
  isStringValueNode,
  isBooleanValueNode,
  isNullValueNode,
  isEnumValueNode,
  isListValueNode
} from "./utils";
import { CreateWhere } from "./createWhere";
import { EntityFactory } from "./entityFactory";

export class SelectionSet extends CreateWhere {
  /**
   * 全局参数
   */
  private enums: any;
  private entities: any;
  private handlers: any;
  private decorators: any;
  private operation: any;
  context: any;
  source: any;
  private variables: any;

  name: string;
  parent?: SelectionSet;
  private children: SelectionSet[] = [];

  info: FieldNode;
  private level: number;
  private alias: string;

  /**
   * 结果
   */

  private members: any[] = [];
  private currentEntity: string;
  private fullName: string;

  /**
   * 类型
   */
  private type: "select" | "action" | "relation" | "code" = "code";

  /**
   * 查找relations
   */
  getRelations(parent: string = "", relations: any[] = []) {
    if (this.type === "relation") {
      if (parent.length > 0) {
        parent = `${parent}.${this.name}`;
      } else {
        parent = this.name;
      }
      relations.push(parent);
    }
    if (this.children) {
      this.children.map(child => {
        child.getRelations(parent, relations);
      });
    }
    return relations;
  }
  getSelection(res?: SelectionSet) {
    if (this.type === "select") {
      res = res || this.parent;
      return res;
    }
    this.children.map(child => (res = child.getSelection(res)));
    return res;
  }
  getSelections(selections: any[] = []) {
    let selection = this.getSelection();
    if (selection) {
      selection.children.map(child => {
        if (child.type === "select") {
          selections.push(child.name);
        }
      });
    }
    return selections;
  }

  private getAction(res?: SelectionSet) {
    if (this.type === "action") {
      res = res || this.parent;
      return res;
    }
    this.children.map(child => (res = child.getAction(res)));
    return res;
  }

  getActions(actions: SelectionSet[] = []) {
    let selection = this.getAction();
    if (selection) {
      selection.children.map(child => {
        if (child.type === "action") {
          actions.push(child);
        }
      });
    }
    return actions;
  }
  constructor(
    info: FieldNode,
    variables: any,
    level: number = 0,
    parent?: SelectionSet
  ) {
    super();
    this.info = info;
    const name = info.name.value;
    const alias = info.alias ? info.alias.value : undefined;
    this.name = name;
    if (parent) this.parent = parent;
    this.level = level;
    if (alias) this.alias = alias;
    this.variables = variables;
  }

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
      const set = new SelectionSet(it, info.variableValues);
      set.entities = entities || {};
      set.handlers = handlers || {};
      set.decorators = decorators || {};
      set.operation = info.operation.operation;
      set.context = context || {};
      set.source = source || {};
      set.variables = variables || {};
      set.enums = enums;
      set.onInit();
      return set;
    });
  }

  getArguments() {
    const args = this.info.arguments;
    const _arguments = new Array(this.parameters.length);
    if (this.parameters && this.parameters.length > 0) {
      const params = {};
      args &&
        args.map((arg, index) => {
          const name = arg.name.value;
          params[name] = this.createArgument(arg);
        });
      this.parameters.map((t, index) => {
        _arguments[index] = params[t.name];
        if (t.decorator && t.decorator.length > 0) {
          t.decorator.map(dec => {
            if (this.decorators[dec]) {
              _arguments[index] = this.decorators[dec]()()(
                _arguments[index],
                this
              );
            }
          });
        }
      });
    }
    return _arguments;
  }

  onInit() {
    if (this.parent) {
    } else {
      // 根元素
      let types = [];
      const root =
        this.handlers[this.operation] &&
        this.handlers[this.operation].find(it => it[0] === this.name);
      if (root) {
        const type = root[5];
        types = root[4] || [];
        this.parameters = types || [];
        this.handlerType(type);
      }
    }
    if (this.info && this.info.selectionSet) {
      this.info.selectionSet.selections &&
        this.info.selectionSet.selections.map(selection => {
          if (isFieldNode(selection)) {
            this.create(selection, this.variables);
          } else if (isFragmentSpreadNode(selection)) {
          } else {
          }
        });
    }
  }
  private create(field: FieldNode, variables: any) {
    const set = new SelectionSet(field, variables, this.level + 1, this);
    /**
     * 全局参数传递
     */
    set.entities = this.entities;
    set.handlers = this.handlers;
    set.operation = this.operation;
    set.context = this.context;
    set.variables = variables;
    set.source = this.source;
    set.decorators = this.decorators;
    set.enums = this.enums;
    /**
     * 构造必备信息
     */
    const member =
      this.members && this.members.find(member => member.name === set.name);
    if (member) {
      set.handlerType(member.entity);
      /**
       * set 的members中存在relations
       */
      set.setMember(member);
    }
    set.onInit();
    this.children.push(set);
    return set;
  }

  private createValue(val: ValueNode) {
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

  private createArgument(arg: any) {
    if (isVariableNode(arg.value)) {
      return this.variables[arg.name.value];
    } else if (isIntValueNode(arg.value)) {
      return parseInt(arg.value.value, 10);
    } else if (isFloatValueNode(arg.value)) {
      return parseFloat(arg.value.value);
    } else if (isStringValueNode(arg.value)) {
      return arg.value.value;
    } else if (isBooleanValueNode(arg.value)) {
      return !!arg.value.value;
    } else if (isNullValueNode(arg.value)) {
      return null;
    } else if (isEnumValueNode(arg.value)) {
      return undefined;
    } else if (isListValueNode(arg.value)) {
      return arg.value.values.map(value => this.createValue(value));
    } else {
      let res = {};
      arg.value.fields.map(field => {
        res[field.name.value] = this.createValue(field.value);
      });
      return res;
    }
  }
  parameters: any[] = [];
  setMember(param: any) {
    if (param.decorators.includes("ResolveProperty")) {
      this.parameters = param.parameters || [];
      this.type = "action";
    } else if (param.decorators.includes("ManyToMany")) {
      this.type = "relation";
    } else if (param.decorators.includes("ManyToOne")) {
      this.type = "relation";
    } else if (param.decorators.includes("TreeParent")) {
      this.type = "relation";
    } else if (param.decorators.includes("TreeChildren")) {
      this.type = "relation";
    } else if (param.decorators.includes("OneToMany")) {
      this.type = "relation";
    } else if (param.decorators.includes("OneToOne")) {
      this.type = "relation";
    } else if (param.decorators.includes("Column")) {
      this.type = "select";
    } else if (param.decorators.includes("UpdateDateColumn")) {
      this.type = "select";
    } else if (param.decorators.includes("CreateDateColumn")) {
      this.type = "select";
    } else if (param.decorators.includes("PrimaryGeneratedColumn")) {
      this.type = "select";
    } else if (param.decorators.includes("PrimaryColumn")) {
      this.type = "select";
    } else if (param.decorators.includes("ObjectIdColumn")) {
      this.type = "select";
    }
  }

  private getCurrentEntity() {
    if (this.currentEntity) {
      return this.currentEntity;
    }
    if (this.parent) {
      return this.parent.getCurrentEntity();
    }
  }
  private getFullName() {
    if (this.fullName) {
      return this.fullName;
    }
    if (this.parent) {
      return this.parent.getFullName();
    }
  }
  isEntity: boolean;
  findCurrentEntity(type: any) {
    if (type.isEntity) return type;
    const item =
      type.typeArguments &&
      type.typeArguments.find(type => this.findCurrentEntity(type));
    if (item) return item;
  }
  private handlerType(type: any) {
    const currentEntity = this.findCurrentEntity(type);
    if (currentEntity) this.fullName = currentEntity.currentEntity;
    if (typeof type === "object") {
      if (typeof type.type === "string") {
        if (type.isEntity) {
          this.isEntity = true;
          this.currentEntity = type.currentEntity;
          this.members = this.entities[this.currentEntity];
        } else {
          if (this.entities[type.type]) {
            this.members = this.entities[type.type];
          } else {
            this.members = this.entities[this.getFullName()];
          }
        }
      } else {
        this.handlerType(type.type);
      }
    } else if (type) {
    } else {
    }
  }
  toString(set?: SelectionSet) {
    let that = set || this;
    let space = ``;
    let child = ``;
    for (let i = 0; i < that.level; i++) {
      space += `\t`;
    }
    if (that.children && that.children.length > 0) {
      child += `${that.children.map(child => that.toString(child)).join("\n")}`;
    }
    if (child.length > 0) {
      return `${space}${that.name}:${this.currentEntity}{\n${that.children
        .map(child => that.toString(child))
        .join("\n")}\n${space}}`;
    }
    return `${space}${that.name}:${this.currentEntity}`;
  }
  getPath() {
    let paths: string[] = [];
    if (this.parent) {
      paths.push(...this.parent.getPath());
    }
    paths.push(this.name);
    return paths;
  }
  getTop(): SelectionSet {
    if (this.parent) return this.parent.getTop();
    return this;
  }
}
