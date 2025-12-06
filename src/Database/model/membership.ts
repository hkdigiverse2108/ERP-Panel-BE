import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IMembership } from "../../types";

const membershipSchema = new Schema<IMembership>({
    ...baseSchemaFields,
    name: { type: String, required: true },
    days: { type: Number, required: true },
    amount: { type: Number, required: true },
    description: { type: String }
}, baseSchemaOptions);

export const membershipModel = mongoose.model<IMembership>('membership', membershipSchema);