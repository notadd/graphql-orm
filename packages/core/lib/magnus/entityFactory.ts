interface Member {
  name: string;
  decorators: string[];
  parameters: any[];
}
interface FactoryOptions {
  enums?: any;
  entities: any;
  decorators: any;
  set: any;
}
import { get, set } from "lodash";
export class EntityFactory {
  constructor(private options: FactoryOptions) {}
  create<T extends object>(instance: T, path: string, name: string) {
    const members = this.options.entities[name];
    if (members) {
      const methods = members
        .map(member => {
          if (member.decorators.includes("ResolveProperty")) {
            return member.name;
          }
        })
        .filter(it => !!it);
      let target = get(instance, path);
      if (target) {
        if (Array.isArray(target)) {
          set(
            instance,
            path,
            target.map(tar => {
              return new Proxy(tar, {
                get(target, p, receiver) {
                  if (methods.includes(p)) {
                    return (variables, context, info) => {
                      const set = this.options.set;
                      const args = set.getArguments();
                      const call = target[p].bind(target);
                      return call(...args);
                    };
                  } else {
                    return target[p];
                  }
                }
              });
            })
          );
        } else {
          set(
            instance,
            path,
            new Proxy(target, {
              get(target, p, receiver) {
                if (methods.includes(p)) {
                  return (variables, context, info) => {
                    const set = this.options.set;
                    const args = set.getArguments();
                    const call = target[p].bind(target);
                    return call(...args);
                  };
                } else {
                  return target[p];
                }
              }
            })
          );
        }
      }
    }
    return instance;
  }
}
