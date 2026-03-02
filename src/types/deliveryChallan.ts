import { Schema } from "mongoose";
import { ISalesDocument } from "./sales";

export interface IDeliveryChallan extends ISalesDocument {
    invoiceIds?: Schema.Types.ObjectId[] | null;
    salesOrderIds?: Schema.Types.ObjectId[] | null;
    deliveryChallanNo: string;
    createdFrom: string;
}