import { Schema } from "mongoose";
import { IPurchaseOrder } from "./purchase";

export interface IMaterialInward {
  purchaseOrderId?: Schema.Types.ObjectId;
}