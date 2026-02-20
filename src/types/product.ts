import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IProduct extends IBase {
  // Basic Info
  itemCode?: string;
  name: string;
  printName?: string;

  // Classification
  categoryId?: Schema.Types.ObjectId;
  subCategoryId?: Schema.Types.ObjectId;
  brandId?: Schema.Types.ObjectId;
  subBrandId?: Schema.Types.ObjectId;

  // Product Type
  productType: "finished" | "raw_material" | "semi_finished" | "service" | "non_inventory";

  // Units & Quantity
  uomId: Schema.Types.ObjectId;
  netWeight?: number;
  masterQty?: number;
  minimumQty?: number;
  openingQty?: number;

  // Pricing Details
  purchasePrice?: number;
  landingCost?: number;
  mrp?: number;
  sellingPrice?: number;
  sellingDiscount?: number;
  sellingMargin?: number;
  retailerDiscount?: number;
  retailerPrice?: number;
  retailerMargin?: number;
  wholesalerDiscount?: number;
  wholesalerPrice?: number;
  wholesalerMargin?: number;
  onlinePrice?: number;

  // Tax
  hsnCode?: string;
  sku?: string;
  // purchaseTaxId?: Schema.Types.ObjectId;
  // salesTaxId?: Schema.Types.ObjectId;
  // isPurchaseTaxIncluding: boolean;
  // isSalesTaxIncluding: boolean;
  cessPercentage?: number;

  // Inventory & Batch Control
  manageMultipleBatch: boolean;
  hasExpiry: boolean;
  isExpiryProductSaleable?: boolean;

  //  Expiry (NEW – Meaningful & Final)
  expiryDays?: number; // shelf life in days
  calculateExpiryOn?: "MFG" | "EXP";
  expiryReferenceDate?: Date; // MFG date or EXP date
  calculatedExpiryDate?: Date; // backend calculated final expiry

  // Product Details
  description?: string;
  shortDescription?: string;
  ingredients?: string;
  nutrition?: { name: string; value: string }[];
  stockIds?: { name: string; value: string }[];

  // Media
  images?: string[];

  // Misc
  additionalInfo?: string;
  
  // departmentId?: Schema.Types.ObjectId; //  Commented in schema
  // image?: string; //  single image not used
  // netWeightUnit?: string; //  Commented in schema
  //  Old expiry fields (deprecated)
  // expiryType?: "MFG" | "EXP";
  // mfgDate?: Date;
  // slug?: string; //  Not in schema
  // autoGenerateItemCode?: boolean; //  Not in schema
  // Status
  // status?: "active" | "inactive"; //  Commented in schema
}
