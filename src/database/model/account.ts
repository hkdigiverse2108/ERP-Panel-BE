import mongoose, { Schema } from "mongoose";
import { IAccount } from "../../types";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { ACCOUNT_GROUP_TYPE, ACCOUNT_TYPE } from "../../common";

const accountSchema = new Schema<IAccount>({
    ...baseCommonFields,
    name: { type: String, required: true, index: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'account-group', required: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    nature: { type: String, enum: Object.values(ACCOUNT_GROUP_TYPE), default: ACCOUNT_GROUP_TYPE.ASSETS },
    type: { type: String, enum: Object.values(ACCOUNT_TYPE), default: ACCOUNT_TYPE.OTHER }
}, baseSchemaOptions);

export const accountModel = mongoose.model<IAccount>('account', accountSchema);
