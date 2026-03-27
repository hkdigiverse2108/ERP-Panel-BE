import { PrefixModel } from "../database";
import { PREFIX_MODULES } from "../common";
import { IPrefix } from "../types";

interface PrefixOptions {
  companyId: string;
  prefixType: string;
}

/**
 * Generates a dynamic document number based on company-specific or global prefix settings.
 * It atomically increments the sequence number to prevent duplicates in high-concurrency.
 * 
 * @param {PrefixOptions} options - Contains companyId and the type of module (from PREFIX_MODULES enum)
 * @returns {Promise<string>} The generated document number (e.g., "INV-101")
 */
export const getAndIncrementPrefix = async ({ companyId, prefixType }: PrefixOptions): Promise<string> => {
  const companyFilter: any = { companyId: companyId as any, prefixType, isDeleted: false };

  // 1. Try to find the correct prefix string (Company-specific -> Global Template -> Default)
  let prefixDoc = await PrefixModel.findOne(companyFilter).lean();
  let prefixString = prefixDoc?.prefix;

  if (!prefixString) {
    const globalTemplate = await PrefixModel.findOne({ companyId: null as any, prefixType, isDeleted: false }).lean();
    prefixString = globalTemplate?.prefix || String(prefixType).toUpperCase().substring(0, 3);
  }

  // 2. Atomically increment (or create) the company-specific record
  // This ensures each company has its own isolated sequence.
  const updatedDoc = await PrefixModel.findOneAndUpdate(
    companyFilter,
    {
      $inc: { sequenceNumber: 1 },
      $setOnInsert: {
        prefix: prefixString,
        companyId: companyId as any,
        prefixType,
        isDeleted: false,
        isActive: true,
      },
    },
    { upsert: true, new: false, setDefaultsOnInsert: true }
  ).lean();

  // 3. Return the formatted document number
  // If updatedDoc is null, it means a new record was inserted (sequenceNumber is now 2 in DB, first was 1)
  const sequenceNumber = updatedDoc ? (updatedDoc.sequenceNumber ?? 1) : 1;

  return `${prefixString}-${sequenceNumber}`;
};
