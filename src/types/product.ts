import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IProduct extends IBase {
    itemCode: string;
    barcode?: string;
    name: string;
    printName?: string;
    slug: string;

    // Classification
    categoryId: Schema.Types.ObjectId;
    subCategoryId?: Schema.Types.ObjectId;
    brandId?: Schema.Types.ObjectId;
    subBrandId?: Schema.Types.ObjectId;
    departmentId?: Schema.Types.ObjectId;

    // Type
    productType: 'finished' | 'raw_material' | 'semi_finished' | 'service' | 'non_inventory';

    // Units & Pricing
    uomId: Schema.Types.ObjectId;
    mrp: number;
    sellingPrice: number;
    purchasePrice?: number;
    landingCost?: number;

    // Tax
    hsnCode?: string;
    purchaseTaxId?: Schema.Types.ObjectId;
    salesTaxId?: Schema.Types.ObjectId;
    isPurchaseTaxInclusive: boolean;
    isSalesTaxInclusive: boolean;
    cessPercentage?: number;

    // Inventory Control
    manageBatch: boolean;
    hasExpiry: boolean;
    expiryDays?: number;
    expiryType?: 'MFG' | 'expiry';

    // Details
    description?: string;
    shortDescription?: string;
    netWeight?: number;
    nutritionInfo?: string;
    ingredients?: string;
    image?: string;

    status: 'active' | 'inactive';
}
