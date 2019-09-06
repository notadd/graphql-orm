interface FactoryOptions {
    enums?: any;
    entities: any;
    decorators: any;
    set: any;
}
export declare class EntityFactory {
    private options;
    constructor(options: FactoryOptions);
    create<T extends object>(instance: T, path: string, name: string): T;
}
export {};
