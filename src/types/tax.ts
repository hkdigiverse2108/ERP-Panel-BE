import { IBase } from "./base";

export interface ITax extends IBase {
    name: string;
    percentage: number;
    type: string; // IGST, CGST, SGST
}