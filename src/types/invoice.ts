import { Schema } from "mongoose";
import { ISalesDocument } from "./sales";

export interface IInvoice extends ISalesDocument {
    invoiceNo: string;
    paymentStatus: 'paid' | 'unpaid' | 'partial' | 'due';
    payType: 'cash' | 'bank';
    dueAmount: number;
    paidAmount: number;
    balanceAmount: number;
    accountLedgerId?: Schema.Types.ObjectId;
    createdFrom: 'sales-order' | 'delivery-challan';
}