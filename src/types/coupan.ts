import { IBase } from "./base";

export interface ICoupon extends IBase {
    code: string;
    description?: string;
    discountType: 'percentage' | 'flat';
    discountValue: number;
    minOrderValue?: number;
    maxDiscountAmount?: number;
    validFrom: Date;
    validTo: Date;
    usageLimit?: number;
    usedCount: number;
    status: 'active' | 'inactive';
}