import mongoose from "mongoose"
import { baseSchemaFields, baseSchemaOptions } from "./base"
import { POS_CREDIT_NOTE_STATUS } from "../../common"

const posCreditNoteSchema = new mongoose.Schema(
    {
        creditNoteNo: { type: String, index: true },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: "contact", default: null },
        returnPosOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "return-pos-order", default: null },

        totalAmount: { type: Number, },
        creditsUsed: { type: Number, default: 0 },
        creditsRemaining: { type: Number, },

        notes: { type: String },
        status: { type: String, enum: POS_CREDIT_NOTE_STATUS, default: POS_CREDIT_NOTE_STATUS.AVAILABLE },

        ...baseSchemaFields
    },
    baseSchemaOptions
)

export const posCreditNoteModel = mongoose.model("pos-credit-note", posCreditNoteSchema)