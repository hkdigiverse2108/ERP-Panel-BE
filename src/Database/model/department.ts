import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IDepartment } from "../../types";

const departmentSchema = new Schema<IDepartment>({
    ...baseSchemaFields,
    name: { type: String, required: true },
    code: { type: String }
}, baseSchemaOptions);

export const departmentModel = mongoose.model<IDepartment>('department', departmentSchema);