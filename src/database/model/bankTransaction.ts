import mongoose from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { BANK_TRANSACTION_TYPE } from "../../common";

const bankTransactionSchema = new mongoose.Schema(
    {
        ...baseSchemaFields,
        voucherNo: { type: String },
        transactionDate: { type: Date },
        transactionType: { type: String, enum: Object.values(BANK_TRANSACTION_TYPE) }, // deposit = Cash -> Bank, withdrawal = Bank -> Cash
        fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: "bank" }, // Main bank involved
        toAccount: { type: mongoose.Schema.Types.ObjectId, ref: "bank" }, // ONLY used if transactionType is "transfer" (Bank -> Bank)
        amount: { type: Number },
        description: { type: String },
    },
    baseSchemaOptions,
);


export const BankTransactionModel = mongoose.model("bank-transaction", bankTransactionSchema);