import mongoose from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { IReportFormat } from "../../types/reportFormat";

const reportFormatSchema = new mongoose.Schema<IReportFormat>(
  {
    type: { type: String, required: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isSystemDefault: { type: Boolean, default: false },
    ...baseCommonFields,
  },
  baseSchemaOptions,
);

export const reportFormatModel = mongoose.model<IReportFormat>("report-format", reportFormatSchema);
