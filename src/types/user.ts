import { Schema } from "mongoose";
import { IBase } from "./base";
import { IPermissions } from "./permission";

export interface IUser extends IBase {
  fullName?: string;
  email?: string;
  phoneNo?: string;
  profileImage?: string;
  //isActive?: boolean;
  password?: string;
  showPassword?: string;
  role?: Schema.Types.ObjectId;

  userType: "user" | "employee" | "admin" | "superAdmin";

  permissions: IPermissions;

  username?: string;
  status: "active" | "inactive";
  panNumber: string;
  designation?: string;

  address: {
    country: string;
    state: string;
    city: string;
    pinCode: number;
  };
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
