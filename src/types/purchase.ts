import { Schema } from "mongoose";
import { IBase, ITransectionSummary } from "./base";
import { ORDER_STATUS, TAX_TYPE } from "../common";

export interface IPurchaseItem {
  productId: Schema.Types.ObjectId;
  qty: number;
  uomId?: string;
  unitCost?: number;
  tax?: string;
  landingCost?: string;
  margin?: string;
  total?: number;
}

export interface IPurchaseOrder extends IBase {
  supplierId: Schema.Types.ObjectId;

  orderDate: Date;
  orderNo?: string;
  shippingDate?: Date;
  shippingNote?: string;

  taxType?: (typeof TAX_TYPE)[keyof typeof TAX_TYPE];

  items: IPurchaseItem[];

  termsAndConditionIds?: Schema.Types.ObjectId[];
  notes?: string;

  totalQty?: string;
  totalTax?: string;
  total?: string;

  summary?: ITransectionSummary;

  status?: (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
}
