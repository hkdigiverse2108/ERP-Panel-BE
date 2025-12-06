import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IEmployee } from "../../types";
import { EMPLOYEE_STATUS } from "../../common";

const employeeSchema = new Schema<IEmployee>({
    ...baseSchemaFields,
    name: { type: String, required: true },
    mobileNo: { type: String, required: true },
    email: { type: String },
    designation: { type: String },
    roleId: { type: Schema.Types.ObjectId, ref: 'role', required: true }, // Role from Settings
    branchId: { type: Schema.Types.ObjectId, ref: 'branch', required: true },

    username: { type: String },
    password: { type: String },

    status: { type: String, enum: EMPLOYEE_STATUS, default: 'active' }
}, baseSchemaOptions);

export const employeeModel = mongoose.model<IEmployee>('employee', employeeSchema);