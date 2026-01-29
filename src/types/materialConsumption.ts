import { Schema } from "mongoose";

export interface IMaterialConsumption {
  consumptionNo?: string;
  consumptionDate: Date;
  userId?: Schema.Types.ObjectId;
  branchId?: Schema.Types.ObjectId;
  consumptionType: string;
  remark?: string;
  items: {
    productId: Schema.Types.ObjectId;
    qty: number;
    price: number;
    totalPrice: number;
  }[];
  totalQty: number;
  totalAmount: number;
}
