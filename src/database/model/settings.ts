import mongoose from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { ISettings } from "../../types/settings";

const settingsLinkSchema = new mongoose.Schema({
    title: { type: String, required: true },
    link: { type: String, required: true },
    icon: { type: String, required: true },
    isActive: { type: Boolean, default: true }
});

const settingsSchema = new mongoose.Schema<ISettings>(
    {
        logo: { type: String },
        favicon: { type: String },
        themeImage: { type: String },
        phoneNo: {
            countryCode: { type: String },
            phoneNo: { type: Number },
        },
        email: { type: String },
        address: { type: String },
        workingHours: {
            startTime: { type: String }, // "09:00"
            endTime: { type: String },   // "21:00"
            timezone: { type: String, default: "IST" }
        },
        links: { type: [settingsLinkSchema], default: [] },
        ...baseCommonFields,
    },
    baseSchemaOptions,
);

export const settingsModel = mongoose.model<ISettings>("settings", settingsSchema);
