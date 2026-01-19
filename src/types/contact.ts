import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IContact extends IBase {
  firstName: string;
  lastName: string;
  companyCode?: string;
  // contactPerson?: string;
  creditAmount?: number;
  debitAmount?: number;
  email?: string;
  transporterId?: string;
  tanNo?: string;
  companyName: string;
  phoneNo?: string;
  panNo?: string;
  telephoneNo?: string;
  remarks?: string;
  whatsappNo?: string;
  productDetails?: [string];
  gstin?: string;
  dob?: Date;
  anniversaryDate?: Date;
  customerType?: "retailer" | "customer" | "wholesaler" | "merchant" | "other";
  supplierType?: "manufacturer" | "stockiest" | "trader" | "other";
  address: [
    {
      GSTType?: string;
      GSTIn: string;
      contactFirstName?: string;
      contactLastName?: string;
      contactCompanyName?: string;
      contactNo?: string;
      contactEmail?: string;
      addressLine1?: string;
      addressLine2?: string;
      state: string;
      city: string;
      country?: {
        id: string;
        name: string;
      };
      pinCode?: string;
    },
  ];
  bankDetails?: {
    IFSCCode: string;
    name: string;
    branch: string;
    accountNumber: string;
  };
  customerCategory: string;
  contactType: "customer" | "supplier" | "transporter" | "both";
  status: "active" | "inactive";

  paymentMode: string;
  paymentTerms: string;
  openingBalance: {
    debitBalance: string;
    creditBalance: string;
  };
  // CRM
  loyaltyPoints: number;
  membershipId?: Schema.Types.ObjectId;
}
