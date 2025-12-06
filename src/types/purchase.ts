import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IPurchaseDocument extends IBase {
    documentNo: string;
    date: Date;
    dueDate?: Date;
    supplierId: Schema.Types.ObjectId;
    supplierName: string;

    items: any[];

    grossAmount: number;
    discountAmount: number;
    taxAmount: number;
    roundOff: number;
    netAmount: number;

    notes?: string;
    status: string;
}

export interface IPurchaseOrder extends IPurchaseDocument {
    supplyDate?: Date;
}