import mongoose from "mongoose"
import { baseSchemaFields, baseSchemaOptions } from "./base"

const posCreditNoteSchema = new mongoose.Schema(
    {
        creditNoteNo: { type: String, index: true },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: "contact", default: null },
        returnPosOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "return-pos-order", default: null },

        totalAmount: { type: Number, },
        creditsUsed: { type: Number, default: 0 },
        creditsRemaining: { type: Number, },

        notes: { type: String },

        ...baseSchemaFields
    },
    baseSchemaOptions
)

export const posCreditNoteModel = mongoose.model("pos-credit-note", posCreditNoteSchema)