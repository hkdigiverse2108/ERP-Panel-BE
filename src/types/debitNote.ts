import { Schema } from "mongoose";

export interface IDebitNote {
    supplierBillId?: Schema.Types.ObjectId;
    reason: string;
}