import { Schema } from "mongoose";

export interface IDebitNote {
    voucherNumber: string;
    date: Date;
    fromAccount: Schema.Types.ObjectId;
    toAccount: Schema.Types.ObjectId;
    amount: number;
    description?: string;
}