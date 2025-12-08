import { Schema } from "mongoose";
import { ISalesDocument } from "./sales";

export interface IDeliveryChallan extends ISalesDocument {
    invoiceId?: Schema.Types.ObjectId;
}