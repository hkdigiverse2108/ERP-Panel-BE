import { Schema } from "mongoose";
import { IBase, ITransactionSummary } from "./base";
import { SUPPLIER_BILL_STATUS, SUPPLIER_PAYMENT_STATUS } from "../common";

export interface ISupplierBillItem {
  productId: Schema.Types.ObjectId;
  qty: number;
  freeQty?: number;
  mrp?: number;
  sellingPrice?: number;
  unitCost?: number;
  discount1?: number;
  discount2?: number;
  taxAmount?: number;
  landingCost?: number;
  margin?: number;
  total?: number;
}

export interface ISupplierBillReturnItem {
  productId: Schema.Types.ObjectId;
  qty: number;
  unitCost?: number;
  discount1?: number;
  discount2?: number;
  tax?: number;
  landingCost?: number;
  total?: number;
}

export interface IAdditionalCharge {
  chargeId: Schema.Types.ObjectId;
  taxId?: Schema.Types.ObjectId;
  amount?: number;
  totalAmount?: number;
}

export interface ISupplierBill extends IBase {
  supplierId: Schema.Types.ObjectId;
  supplierBillNo?: string;
  referenceBillNo?: string;
  supplierBillDate?: Date;

  paymentTerm?: string;
  dueDate?: Date;

  reverseCharge?: boolean;
  shippingDate?: Date;

  taxType?: string;
  invoiceAmount?: string;

  productDetails?: {
    item: ISupplierBillItem[];
    totalQty?: number;
    totalTax?: number;
    total?: number;
  };

  returnProductDetails?: {
    item: ISupplierBillReturnItem[];
    totalQty?: number;
    total?: number;
    summary?: ITransactionSummary;
  };

  additionalCharges?: {
    item: IAdditionalCharge[];
    total?: number;
  };

  termsAndConditionIds?: Schema.Types.ObjectId[];
  notes?: string;

  summary?: ITransactionSummary;

  paidAmount?: number;
  balanceAmount?: number;

  paymentStatus?: (typeof SUPPLIER_PAYMENT_STATUS)[keyof typeof SUPPLIER_PAYMENT_STATUS];
  status?: (typeof SUPPLIER_BILL_STATUS)[keyof typeof SUPPLIER_BILL_STATUS];
}
