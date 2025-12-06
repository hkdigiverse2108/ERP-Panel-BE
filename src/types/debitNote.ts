import { Schema } from "mongoose";
import { IPurchaseDocument } from "./purchase";

export interface IDebitNote extends IPurchaseDocument {
    supplierBillId?: Schema.Types.ObjectId;
    reason: string;
}