import mongoose, { Schema } from "mongoose";
import { EMPLOYEE_STATUS } from "../../common";
import { IEmployee } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const employeeSchema = new Schema<IEmployee>({
    ...baseSchemaFields,
    name: { type: String, required: true },
    mobileNo: { type: String, required: true },
    email: { type: String, unique: true, default: null },
    designation: { type: String },
    role: { type: Schema.Types.ObjectId, ref: 'role', default: null },
    username: { type: String },
    password: { type: String },
    status: { type: String, enum: EMPLOYEE_STATUS, default: 'active' },
    panNumber: { type: String },
    address: {
        address: { type: String },
        country: { type: String, required: true },
        state: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String },
    },
    bankDetiails: {
        bankHolderName: { type: String },
        bankName: { type: String },
        branch: { type: String },
        accountNumber: { type: String },
        IFSCCode: { type: String },
        swiftCode: { type: String },
    },
    wages: { type: Number },
    commission: { type: Number },
    extraWages: { type: Number },
    target: { type: Number },
}, baseSchemaOptions);

export const employeeModel = mongoose.model<IEmployee>('employee', employeeSchema);