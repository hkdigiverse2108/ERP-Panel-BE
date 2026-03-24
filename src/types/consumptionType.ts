import { IBase } from "./base";

export interface IConsumptionType extends IBase {
    name: string;
    isDefault: boolean;
}