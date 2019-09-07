import { SelectionSet } from './selectionSet';
export { createResolvers } from './factory';
export * from './selectionSet';
export * from './decorator';
export { MagnusBase } from './base';
export interface ITypeorm {
    alias: string;
    name: string;
    select: any[];
    relations: any[];
    actions: SelectionSet[];
    path: string;
    arguments: any[];
}
