import { Schema } from "mongoose";
import { IPurchaseDocument } from "./purchase";

export interface IMaterialInward {
  purchaseOrderId?: Schema.Types.ObjectId;
}