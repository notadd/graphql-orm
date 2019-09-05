interface FactoryOptions {
    enums?: any;
    entities: any;
    decorators: any;
    createSet: any;
}
export declare class EntityFactory {
    private options;
    constructor(options: FactoryOptions);
    create<T extends object>(instance: T, name: string): T;
}
export {};
