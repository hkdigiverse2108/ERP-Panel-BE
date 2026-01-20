import mongoose, { Schema } from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { IAccountGroup } from "../../types";
import { ACCOUNT_NATURE } from "../../common";

const accountGroupSchema = new Schema<IAccountGroup>(
  {
    ...baseCommonFields,
    name: { type: String, required: true },
    parentGroupId: { type: Schema.Types.ObjectId, ref: "accountGroup" },
    nature: { type: String, enum: Object.values(ACCOUNT_NATURE), default: ACCOUNT_NATURE.ASSETS },
    groupLevel: { type: Number },
  },
  baseSchemaOptions,
);

export const accountGroupModel = mongoose.model<IAccountGroup>("accountGroup", accountGroupSchema);
