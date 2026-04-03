import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IPrefix } from "../../types";

import { PREFIX_MODULES } from "../../common";

const prefixSchema = new Schema<IPrefix>({
    ...baseSchemaFields,
    prefixType: { type: String, required: true, enum: Object.values(PREFIX_MODULES) },
    prefix: { type: String, required: true },
    sequenceNumber: { type: Number, default: 1 }, // Default Start Number
    currentNumber: { type: Number, default: 1 },  // Incrementing/Live Number
    history: [
        {
            financialYear: { type: String },
            lastNumber: { type: Number },
            resetDate: { type: Date, default: Date.now },
        },
    ],
}, baseSchemaOptions);

export const PrefixModel = mongoose.model<IPrefix>('prefix', prefixSchema);