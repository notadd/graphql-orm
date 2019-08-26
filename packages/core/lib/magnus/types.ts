export { HandlerDefMap } from '@notadd/magnus-core';
export interface Metadata {
    name: string;
    decorators: string[];
    entity: string;
    parameters: { name: string, index: number }[];
}
export interface Metadatas {
    [key: string]: Metadata[];
}