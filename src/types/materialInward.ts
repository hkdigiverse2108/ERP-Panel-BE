import { Schema } from "mongoose";
import { IPurchaseDocument } from "./purchase";

export interface IMaterialInward extends IPurchaseDocument {
  purchaseOrderId?: Schema.Types.ObjectId;
}