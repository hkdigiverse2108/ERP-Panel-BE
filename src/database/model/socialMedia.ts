import mongoose from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { ISocialMedia } from "../../types/socialMedia";

const socialMediaLinkSchema = new mongoose.Schema({
    title: { type: String, required: true },
    link: { type: String, required: true },
    icon: { type: String, required: true },
    status: { type: Boolean, default: true }
});

const socialMediaSchema = new mongoose.Schema<ISocialMedia>(
    {
        links: { type: [socialMediaLinkSchema], default: [] },
        ...baseCommonFields,
    },
    baseSchemaOptions,
);

export const socialMediaModel = mongoose.model<ISocialMedia>("socialMedia", socialMediaSchema);
