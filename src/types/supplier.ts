import { Schema } from "mongoose";
export interface ISupplierBill {
    purchaseOrderId?: Schema.Types.ObjectId;
    paymentStatus: 'paid' | 'unpaid' | 'partial';
    paidAmount: number;
    balanceAmount: number;
}