import { IBase } from "./base";

export interface IPrefix extends IBase {
    prefixType: string; // From PREFIX_MODULES enum
    prefix: string;
    sequenceNumber: number;

    // startNumber: number;
    // currentNumber: number;
}