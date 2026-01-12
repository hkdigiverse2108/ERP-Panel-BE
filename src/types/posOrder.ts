import { Schema } from "mongoose";
import { IBase } from "./base";
import { ISalesDocument } from "./sales";

export interface IPosOrder extends IBase {
  orderNo: string;
  date: Date;
  tableNo?: string;
  customerId?: Schema.Types.ObjectId; // Optional customer
  customerName?: string;
  items: any[]; // Same as sales items
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  roundOff: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: "cash" | "card" | "upi" | "wallet" | "credit";
  paymentStatus: "paid" | "unpaid" | "partial";
  status: "pending" | "completed" | "hold" | "cancelled";
  holdDate?: Date;
  notes?: string;
  invoiceId?: Schema.Types.ObjectId; // Linked invoice
}
