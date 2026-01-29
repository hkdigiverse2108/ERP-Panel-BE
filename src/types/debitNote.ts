import { Schema } from "mongoose";

export interface IDebitNote {
  voucherNumber: string;
  date: Date;
  fromAccountId: Schema.Types.ObjectId;
  toAccountId: Schema.Types.ObjectId;
  amount: number;
  description?: string;
}
