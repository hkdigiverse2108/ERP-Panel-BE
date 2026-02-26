import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IDeliveryChallan extends IBase {
    invoiceIds?: Schema.Types.ObjectId[] | null;
    salesOrderIds?: Schema.Types.ObjectId[] | null;
    deliveryChallanNo: string;
    date: Date;
    customerId: Schema.Types.ObjectId;
    paymentTerms: Schema.Types.ObjectId;
    dueDate: Date;
    texType: string;
    items: any[];
    flatDiscount: boolean;
    flatDiscountPercent: number;
    flatDiscountAmount: number;
    grossAmount: number;
    discountAmount: number;
    taxAmount: number;
    roundOff: number;
    netAmount: number;
    notes?: string;
    status: string;
    reverseCharge: boolean;
    createdFrom: string;
    shippingAddress?: string;
    billingAddress?: string;
    shippingType: string;
}