import { Document, Schema } from "mongoose";

export interface IBase extends Document {
  companyId: Schema.Types.ObjectId;
  branchId?: Schema.Types.ObjectId;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  isDeleted: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransactionSummary {
  flatDiscount?: number;
  grossAmount?: number;
  discountAmount?: number;
  taxableAmount?: number;
  taxAmount?: number;
  roundOff?: number;
  netAmount?: number;
}
