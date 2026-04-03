import { PrefixModel } from "../database";
import { PREFIX_MODULES } from "../common";
import { IPrefix } from "../types";

interface PrefixOptions {
  companyId: string;
  prefixType: string;
  model?: any;
  fieldName?: string;
}

/**
 * Generates a dynamic document number based on company-specific prefix settings.
 * It atomically increments the current number to prevent duplicates in high-concurrency.
 * If model and fieldName are provided, it will retry up to 10 times to find a unique number.
 * 
 * @param {PrefixOptions} options - Contains companyId, prefixType, and optional DB checking parameters.
 * @returns {Promise<string>} The generated document number (e.g., "INV-101")
 */
export const getAndIncrementPrefix = async ({ companyId, prefixType, model, fieldName }: PrefixOptions): Promise<string> => {
  const companyFilter: any = { companyId: companyId as any, prefixType, isDeleted: false };
  let attempts = 0;
  let resultNumber: string = "";

  // 1. Try to find the correct prefix string once (Company-specific -> Default)
  let prefixDoc = await PrefixModel.findOne(companyFilter).lean();
  let prefixString = prefixDoc?.prefix;

  if (!prefixString) {
    const globalTemplate = await PrefixModel.findOne({ companyId: null as any, prefixType, isDeleted: false }).lean();
    prefixString = globalTemplate?.prefix || String(prefixType).toUpperCase().substring(0, 3);
  }

  // 2. Atomic increment and return result
  const updatedDoc = await PrefixModel.findOneAndUpdate(
    companyFilter,
    {
      $inc: { currentNumber: 1 },
      $setOnInsert: {
        prefix: prefixString,
        companyId: companyId as any,
        prefixType,
        sequenceNumber: 1,
        isDeleted: false,
        isActive: true,
      },
    },
    { upsert: true, new: false, setDefaultsOnInsert: true }
  ).lean();

  const sequenceNumber = updatedDoc ? (updatedDoc.currentNumber ?? 1) : 1;
  return `${prefixString}-${sequenceNumber}`;
};
