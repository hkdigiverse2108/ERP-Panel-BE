import mongoose from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { IReportFormat } from "../../types/reportFormat";

const formatSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isSystemDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { _id: true },
);

const reportFormatSchema = new mongoose.Schema<IReportFormat>(
  {
    type: { type: String, required: true, unique: true },
    formats: [formatSchema],
    isActive: { type: Boolean, default: true },
    ...baseCommonFields,
  },
  baseSchemaOptions,
);

export const reportFormatModel = mongoose.model<IReportFormat>("report-format", reportFormatSchema);
