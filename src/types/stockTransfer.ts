import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IStockTransfer extends IBase {
  transferNo: string;
  requestedByBranchId: Schema.Types.ObjectId;
  requestedToBranchId: Schema.Types.ObjectId;
  status: "pending" | "approved" | "partially_approved" | "rejected" | "completed" | "cancelled";
  items: {
    productId: Schema.Types.ObjectId;
    price: number;
    requestedQty: number;
    approvedQty: number;
    receivedQty: number;
  }[];
  requestNote?: string;
  approvalNote?: string;
  receiptNote?: string;
  approvedBy?: Schema.Types.ObjectId;
  approvedAt?: Date;
  receivedBy?: Schema.Types.ObjectId;
  receivedAt?: Date;
}
