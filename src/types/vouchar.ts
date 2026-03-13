import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IVoucher extends IBase {
  voucherNo: string;
  date: Date;
  type: "journal" | "payment" | "receipt" | "expense" | "contra";

  // For Payment/Receipt
  partyId?: Schema.Types.ObjectId; // Customer/Supplier
  // bankAccountId reference removed

  amount: number;

  // Journal Entries
  entries: {
    // account reference removed
    debit: number;
    credit: number;
  }[];

  notes?: string;
}