import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IStockVerification extends IBase {
  companyId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  departmentId?: Schema.Types.ObjectId;
  categoryId?: Schema.Types.ObjectId;
  brandId?: Schema.Types.ObjectId;
  remark?: string;

  items: {
    productId: Schema.Types.ObjectId;
    batchId: Schema.Types.ObjectId;

    landingCost: number;
    price: number;
    mrp: number;
    sellingPrice: number;

    systemQty: number;
    physicalQty: number;

    differenceQty: number;
    differenceAmount: number;
  }[];
}
