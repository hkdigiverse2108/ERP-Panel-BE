import { IBase } from "./base";

export interface IMembership extends IBase {
    name: string;
    days: number; // Validity in days
    amount: number; // Cost
    description?: string;
}