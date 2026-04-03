import { IBase } from "./base";

export interface IPrefix extends IBase {
    prefixType: string; // From PREFIX_MODULES enum
    prefix: string;
    sequenceNumber: number; // For starting number
    currentNumber: number;  // For live sequence
    history: {
        financialYear: string;
        lastNumber: number;
        resetDate: Date;
    }[];
}