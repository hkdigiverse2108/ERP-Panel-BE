import { Document } from "mongoose";

export interface ISettingsLink {
    title: string;
    link: string;
    icon: string;
    isActive: boolean;
}

export interface ISettings extends Document {
    logo?: string;
    favicon?: string;
    themeImage?: string;
    phoneNo?: {
        countryCode: string;
        phoneNo: number;
    };
    email?: string;
    address?: string;
    workingHours?: {
        startTime: string;
        endTime: string;
        timezone: string;
    }
    links: ISettingsLink[];
}
