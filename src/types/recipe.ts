import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IRecipe extends IBase {
  name: string;
  date: Date;
  number: string;

  type: "assemble" | "unassemble";

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
