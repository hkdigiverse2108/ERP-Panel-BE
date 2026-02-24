import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IJournalVoucherEntry {
    accountId: Schema.Types.ObjectId;
    debit: number;
    credit: number;
    description?: string;
}

export interface IJournalVoucher extends IBase {
    paymentNo: string;
    date: Date;
    description?: string;
    entries: IJournalVoucherEntry[];
    totalDebit: number;
    totalCredit: number;
    status: 'draft' | 'posted';
}