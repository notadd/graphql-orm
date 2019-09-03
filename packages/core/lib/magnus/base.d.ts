import { BaseEntity } from "../repository/BaseEntity";
export declare class MagnusBase extends BaseEntity {
    static createWhere(where: any): import("..").Brackets | import("..").Brackets[];
    callgraphql(): void;
    call(name: string, args: any[]): void;
}
