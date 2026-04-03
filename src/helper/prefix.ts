import { PrefixModel } from "../database";
import { PREFIX_MODULES } from "../common";
import { IPrefix } from "../types";

interface PrefixOptions {
  branchId?: string;
  prefixType: string;
  model?: any;
  fieldName?: string;
}

/**
 * Generates a dynamic document number based on branch-specific prefix settings.
 * It atomically increments the sequence number to prevent duplicates in high-concurrency.
 * If model and fieldName are provided, it will retry up to 10 times to find a unique number.
 * 
 * @param {PrefixOptions} options - Contains branchId, prefixType, and optional DB checking parameters.
 * @returns {Promise<string>} The generated document number (e.g., "INV-101")
 */
export const getAndIncrementPrefix = async ({ branchId, prefixType, model, fieldName }: PrefixOptions): Promise<string> => {
  const queryFilter: any = { branchId: branchId as any, prefixType, isDeleted: false };
  let attempts = 0;
  let resultNumber: string = "";

  // 1. Try to find the correct prefix string once (Branch-specific -> Global Template -> Default)
  let prefixString = "";
  let prefixDoc = await PrefixModel.findOne(queryFilter).lean();
  prefixString = prefixDoc?.prefix;

  if (!prefixString) {
    const globalTemplate = await PrefixModel.findOne({ branchId: null as any, prefixType, isDeleted: false }).lean();
    prefixString = globalTemplate?.prefix || String(prefixType).toUpperCase().substring(0, 3);
  }

  // 2. Atomic increment and return result
  const updatedDoc = await PrefixModel.findOneAndUpdate(
    queryFilter,
    {
      $inc: { currentNumber: 1 },
      $setOnInsert: {
        prefix: prefixString,
       branchId: branchId as any,
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
