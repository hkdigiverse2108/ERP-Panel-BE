// import { Schema } from "mongoose";
// import { IBase } from "./base";

// export interface IJournalVoucherEntry {
//     // account reference removed
//     debit: number;
//     credit: number;
//     description?: string;
// }

// export interface IJournalVoucher extends IBase {
//     paymentNo: string;
//     date: Date;
//     description?: string;
//     entries: IJournalVoucherEntry[];
//     totalDebit: number;
//     totalCredit: number;
//     status: 'draft' | 'posted';
//     notes?: string;
// }