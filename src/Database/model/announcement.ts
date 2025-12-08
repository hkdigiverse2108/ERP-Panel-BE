import mongoose, { Schema } from "mongoose";
import { IBase } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";

export interface IAnnouncement extends IBase {
  version: string;
  desc: [string];
  link?: string;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    ...baseSchemaFields,
    version: { type: String },
    desc: { type: [String] },
    link: { type: String, defualt: null },
  },

  baseSchemaOptions
);

export const announcementModel = mongoose.model<IAnnouncement>(
  "announcement",
  announcementSchema
);
