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
  const filter: any = { companyId: companyId as any, prefixType, isDeleted: false };
  let prefixDoc = await PrefixModel.findOneAndUpdate(
    filter,
    { $inc: { sequenceNumber: 1 } },
    { new: false } // Returns the document BEFORE the increment (so we use the current number)
  ).lean();

  // 2. Fallback: If no company configuration exists, use the Global Template (Super Admin configuration)
  if (!prefixDoc) {
    const fallbackFilter: any = { companyId: null as any, prefixType, isDeleted: false };
    prefixDoc = await PrefixModel.findOneAndUpdate(
      fallbackFilter,
      { $inc: { sequenceNumber: 1 } },
      { new: false }
    ).lean();
  }

  // 3. Robustness check: If still not found (no template created), return a basic fallback
  if (!prefixDoc) {
    // This is an edge case that should be handled by seeding/setup
    const defaultPrefix = String(prefixType).toUpperCase().substring(0, 3);
    return `${defaultPrefix}-1`;
  }

  // 4. Return the formatted document number
  const prefix = prefixDoc.prefix || "";
  const sequenceNumber = prefixDoc.sequenceNumber || 1;
  
  return `${prefix}-${sequenceNumber}`;
};
