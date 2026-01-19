import { Schema } from "mongoose";
import { IBase } from "./base";
import { ORDER_STATUS, TAX_TYPE } from "../common";

export interface IPurchaseItem {
  productId: Schema.Types.ObjectId;
  qty: number;
  uom?: string;
  unitCost?: number;
  tax?: string;
  landingCost?: string;
  margin?: string;
  total?: number;
}

export interface IPurchaseDocument extends IBase {
  supplierId: Schema.Types.ObjectId;

  orderDate: Date;
  orderNo?: string;
  shippingDate?: Date;
  shippingNote?: string;

  taxType?: (typeof TAX_TYPE)[keyof typeof TAX_TYPE];

  items: IPurchaseItem[];

  finalQty?: string;
  finalTax?: string;
  finalTotal?: string;

  flatDiscount?: number;
  grossAmount?: number;
  discountAmount?: number;
  taxableAmount?: number;
  tax?: number;
  roundOff?: number;
  netAmount?: number;

  notes?: string;
  status?: (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
}

// export interface IPurchaseDocument extends IBase {
//   documentNo: string;
//   date: Date;
//   dueDate?: Date;
//   supplierId: Schema.Types.ObjectId;
//   supplierName: string;

//   items: any[];

//   grossAmount: number;
//   discountAmount: number;
//   taxAmount: number;
//   roundOff: number;
//   netAmount: number;

//   notes?: string;
//   status: string;
// }

export interface IPurchaseOrder extends IPurchaseDocument {
  supplyDate?: Date;
}
