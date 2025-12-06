import { Schema } from "mongoose";
import { ISalesDocument } from "./sales";

export interface IInvoice extends ISalesDocument {
    salesOrderId?: Schema.Types.ObjectId;
    paymentStatus: 'paid' | 'unpaid' | 'partial';
    paidAmount: number;
    balanceAmount: number;
    salesManId?: Schema.Types.ObjectId;
}