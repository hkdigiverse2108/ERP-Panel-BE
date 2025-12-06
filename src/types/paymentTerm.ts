import { IBase } from "./base";

export interface IPaymentTerm extends IBase {
    name: string;
    days: number;
}