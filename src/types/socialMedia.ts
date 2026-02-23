import { Document } from "mongoose";

export interface ISocialMediaLink {
    title: string;
    link: string;
    icon: string;
    status: boolean;
}

export interface ISocialMedia extends Document {
    links: ISocialMediaLink[];
    createdAt: Date;
    updatedAt: Date;
    createdBy?: any;
    updatedBy?: any;
}
