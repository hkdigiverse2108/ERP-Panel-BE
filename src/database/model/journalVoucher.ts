import { baseSchemaFields, baseSchemaOptions } from "./base";
import mongoose, { Schema } from "mongoose";
import { IJournalVoucher } from "../../types";
import { JOURNAL_VOUCHER_STATUS } from "../../common";

const journalVoucherSchema = new Schema<IJournalVoucher>({
    ...baseSchemaFields,
    paymentNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    description: { type: String },
    entries: [
        {
            accountId: { type: Schema.Types.ObjectId, ref: 'account', required: true },
            debit: { type: Number, default: 0 },
            credit: { type: Number, default: 0 },
            description: { type: String }
        }
    ],
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    status: { type: String, enum: Object.values(JOURNAL_VOUCHER_STATUS), default: JOURNAL_VOUCHER_STATUS.DRAFT }
}, baseSchemaOptions);

export const JournalVoucherModel = mongoose.model<IJournalVoucher>('journal-voucher', journalVoucherSchema);
