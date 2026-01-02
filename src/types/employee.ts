import { Schema } from "mongoose";
import { IBase } from "./base";
import { IPermissions } from "./permission";

export interface IEmployee extends IBase {
    name: string;
    phoneNo: string;
    email?: string;
    designation?: string;
    role: Schema.Types.ObjectId;
    // branchId: Schema.Types.ObjectId; // Assigned Branch
    username?: string;
    password?: string; // Hashed
    status: 'active' | 'inactive';
    panNumber: string;
    address: {
        country: string;
        state: string;
        city: string;
        postalCode: string;
    };
    permissions: IPermissions
    bankDetails: {
        bankHolderName: string;
        name: string;
        branch: string;
        accountNumber: string;
        IFSCCode: string;
        swiftCode: string;
    };
    wages: number;
    commission: number;
    extraWages: number;
    target: number;
}