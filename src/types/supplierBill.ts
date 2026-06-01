import { Schema } from "mongoose";
import { IBase, ITransactionSummary } from "./base";
import { SUPPLIER_BILL_STATUS, SUPPLIER_PAYMENT_STATUS } from "../common";

export interface ISupplierBillItem {
  productId: Schema.Types.ObjectId;
  variantId?: Schema.Types.ObjectId;
  qty: number;
  freeQty?: number;
  uomId?: Schema.Types.ObjectId;
  unit?: string;
  unitCost?: number;
  mrp?: number;
  sellingPrice?: number;
  discount1?: number;
  discount2?: number;
  taxable?: number;
  taxId?: Schema.Types.ObjectId;
  tax?: string;
  landingCost?: number;
  margin?: number;
  total?: number;
}

export interface ISupplierBillReturnItem {
  productId: Schema.Types.ObjectId;
  variantId?: Schema.Types.ObjectId;
  qty: number;
  uomId?: Schema.Types.ObjectId;
  unit?: string;
  unitCost?: number;
  discount1?: number;
  discount2?: number;
  taxable?: number;
  taxId?: Schema.Types.ObjectId;
  tax?: string;
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
  placeOfSupply?: string;
  gstIn?: string;
  billingAddress?: Schema.Types.ObjectId;

  paymentTermsId?: Schema.Types.ObjectId;
  dueDate?: Date;

  reverseCharge?: boolean;
  shippingDate?: Date;

  taxType?: string;
  invoiceAmount?: string;

  productDetails?: ISupplierBillItem[];

  returnProductDetails?: {
    item: ISupplierBillReturnItem[];
    summary?: ITransactionSummary;
  };

  additionalCharges?: IAdditionalCharge[];

  termsAndConditionIds?: Schema.Types.ObjectId[];
  notes?: string;

  summary?: ITransactionSummary;

  paidAmount?: number;
  balanceAmount?: number;

  paymentStatus?: (typeof SUPPLIER_PAYMENT_STATUS)[keyof typeof SUPPLIER_PAYMENT_STATUS];
  status?: (typeof SUPPLIER_BILL_STATUS)[keyof typeof SUPPLIER_BILL_STATUS];
}
