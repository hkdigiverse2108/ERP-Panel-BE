import mongoose from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IConsumptionType } from "../../types";

const consumptionTypeSchema = new mongoose.Schema<IConsumptionType>(
    {
        ...baseSchemaFields,
        name: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
    },
    baseSchemaOptions,
);

export const ConsumptionTypeModel = mongoose.model<IConsumptionType>("consumption-type", consumptionTypeSchema);