import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IAccount extends IBase {
  name: string;
  groupId: Schema.Types.ObjectId;
  openingBalance: number;
  currentBalance: number;
  type: "bank" | "cash" | "other";
}

export interface IAccountGroup extends IBase {
  name: string;
  groupLevel: number;
  parentGroupId?: Schema.Types.ObjectId;
  nature: "assets" | "liabilities" | "income" | "expenses";
}
