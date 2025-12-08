import mongoose, { Schema } from "mongoose";
import { IAccount } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { ACCOUNT_TYPE } from "../../common";



const accountSchema = new Schema<IAccount>({
    ...baseSchemaFields,
    name: { type: String, required: true, index: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'accountGroup', required: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    type: { type: String, enum: ACCOUNT_TYPE, default: 'other' }
}, baseSchemaOptions);

export const accountModel = mongoose.model<IAccount>('account', accountSchema);