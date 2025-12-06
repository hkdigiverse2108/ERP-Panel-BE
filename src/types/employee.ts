import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IEmployee extends IBase {
    name: string;
    mobileNo: string;
    email?: string;
    designation?: string;
    roleId: Schema.Types.ObjectId;
    branchId: Schema.Types.ObjectId; // Assigned Branch

    username?: string;
    password?: string; // Hashed

    status: 'active' | 'inactive';
}