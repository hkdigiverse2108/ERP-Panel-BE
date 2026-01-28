import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IStockVerificationItem {
  productId: Schema.Types.ObjectId;
  batchNo?: string;
  landingCost?: number;
  price?: number;
  mrp?: number;
  sellingPrice?: number;
  unit?: string;
  systemQty: number;
  physicalQty: number;
  differenceQty: number;
  approvedQty?: number;
  differenceAmount: number;
}

export interface IStockVerification extends IBase {
  stockVerificationNo: string;
  verificationDate: Date;
  departmentId?: Schema.Types.ObjectId;
  categoryId?: Schema.Types.ObjectId;
  brandId?: Schema.Types.ObjectId;
  remark?: string;
  items: IStockVerificationItem[];
  totalProducts: number;
  totalPhysicalQty: number;
  totalDifferenceAmount: number;
  totalApprovedQty?: number;
  status: "pending" | "approved" | "rejected";
}
