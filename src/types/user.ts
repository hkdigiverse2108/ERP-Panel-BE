import { IBase } from "./base";
import { IPermissions } from "./permission";

export interface IUser extends IBase {
  fullName?: string;
  email?: string;
  phoneNo?: string;
  profileImage?: string;
  //   isActive?: boolean;
  password?: string;
  role?: "admin" | "superAdmin" | "user";
  permissions: IPermissions;
}
