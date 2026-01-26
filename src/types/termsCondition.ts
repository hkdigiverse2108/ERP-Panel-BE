import { IBase } from "./base";

export interface ITermsCondition extends IBase {
  termsCondition: string;
  isDefault?: boolean;
}
