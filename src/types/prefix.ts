import { IBase } from "./base";

export interface IPrefix extends IBase {
    module: string; // Invoice, PO, SO, etc.
    prefix: string;
    startNumber: number;
    currentNumber: number;
}