import { IBase } from "./base";

export interface IDiscount extends IBase {
    title: string;
    validFrom: Date;
    validTo: Date;
    discountType: 'percentage' | 'flat';
    discountValue: number;
    status: 'active' | 'inactive';
}