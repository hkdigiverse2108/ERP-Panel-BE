import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IBankTransaction extends IBase {
    voucherNo: string;
    transactionDate: Date;
    transactionType: "deposit" | "withdrawal" | "transfer";
    fromAccount: Schema.Types.ObjectId;
    toAccount: Schema.Types.ObjectId;
    amount: number;
    description: string;
}
