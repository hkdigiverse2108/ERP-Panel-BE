import { IBase } from "./base";

export interface IPaymentTerms extends IBase {
    name: string;
    day: number;
    isDefault: boolean;
}