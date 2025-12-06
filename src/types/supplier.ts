import { Schema } from "mongoose";
import { IPurchaseDocument } from "./purchase";

export interface ISupplierBill extends IPurchaseDocument {
    purchaseOrderId?: Schema.Types.ObjectId;
    materialInwardId?: Schema.Types.ObjectId;
    paymentStatus: 'paid' | 'unpaid' | 'partial';
    paidAmount: number;
    balanceAmount: number;
}