import mongoose, { Schema } from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { IAccountGroup } from "../../types";
import { ACCOUNT_GROUP_TYPE } from "../../common";

const accountGroupSchema = new Schema<IAccountGroup>(
  {
    ...baseCommonFields,
    name: { type: String, required: true },
    parentGroupId: { type: Schema.Types.ObjectId, ref: "account-group" },
    nature: { type: String, enum: Object.values(ACCOUNT_GROUP_TYPE), default: ACCOUNT_GROUP_TYPE.ASSETS },
    groupLevel: { type: Number },
  },
  baseSchemaOptions,
);

export const accountGroupModel = mongoose.model<IAccountGroup>("account-group", accountGroupSchema);
