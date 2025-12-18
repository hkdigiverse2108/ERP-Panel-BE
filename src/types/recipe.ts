import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IRecipe extends IBase {
  recipeName: string;
  recipeDate: Date;
  recipeNo: string;

  recipeType: "assemble" | "unassemble";

  rawProducts: {
    itemCode?: string;
    productId: Schema.Types.ObjectId;
    mrp?: number;
    useQty: number;
  }[];

  finalProducts: {
    itemCode?: string;
    productId: Schema.Types.ObjectId;
    mrp?: number;
    qtyGenerate: number;
  }[];
  
  status: "active" | "inactive";
}
