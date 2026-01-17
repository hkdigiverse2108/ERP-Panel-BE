import { Schema } from "mongoose";

export interface ILocation {
  _id?: string;

  name: string;

  type: "country" | "state" | "city";

  parentId?: Schema.Types.ObjectId | null;

  code?: string;
}
