import mongoose from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { IConsumptionType } from "../../types";

const consumptionTypeSchema = new mongoose.Schema<IConsumptionType>(
    {
        name: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
        companyId: { type: mongoose.Schema.Types.ObjectId, ref: "company", index: true },
        ...baseCommonFields,
    },
    baseSchemaOptions,
);

export const ConsumptionTypeModel = mongoose.model<IConsumptionType>("consumption-type", consumptionTypeSchema);