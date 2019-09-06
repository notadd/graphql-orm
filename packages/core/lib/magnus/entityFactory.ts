interface Member {
  name: string;
  decorators: string[];
  parameters: any[];
}
interface FactoryOptions {
  enums?: any;
  entities: any;
  decorators: any;
  createSet: any;
}
export class EntityFactory {
  constructor(private options: FactoryOptions) {}
  create<T extends object>(instance: T, name: string) {
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
          } else {
            return target[p];
          }
        }
      });
    }
    return instance;
  }
}
