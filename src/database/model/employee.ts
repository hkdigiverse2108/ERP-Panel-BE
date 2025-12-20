import mongoose, { Schema } from "mongoose";
import { EMPLOYEE_STATUS } from "../../common";
import { IEmployee } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import permissionsSchema from "./permissions";

const employeeSchema = new Schema<IEmployee>({
    ...baseSchemaFields,

    name: { type: String },
    mobileNo: { type: String },
    email: { type: String, default: null },  // removed unique
    designation: { type: String },

    companyId: { type: Schema.Types.ObjectId, ref: 'company', default: null },
    // branch: { type: Schema.Types.ObjectId, ref: 'branch', default: null },

    // role: { type: Schema.Types.ObjectId, ref: 'role', default: null },
    role: { type: String },
    username: { type: String },
    password: { type: String },

    status: { type: String, enum: EMPLOYEE_STATUS, default: 'active' },

    panNumber: { type: String },

    address: {
        address: { type: String },
        country: { type: String },
        state: { type: String },
        city: { type: String },
        postalCode: { type: Number },
    },

    bankDetails: {
        bankHolderName: { type: String },
        bankName: { type: String },
        branch: { type: String },
        accountNumber: { type: String },
        IFSCCode: { type: String },
        swiftCode: { type: String },
    },
    permissions: { type: permissionsSchema, default: {} },
    wages: { type: Number },
    commission: { type: Number },
    extraWages: { type: Number },
    target: { type: Number },

}, baseSchemaOptions);

export const employeeModel = mongoose.model<IEmployee>('employee', employeeSchema);
