import { IBase } from "./base";

export interface IDepartment extends IBase {
    name: string;
    code?: string;
}