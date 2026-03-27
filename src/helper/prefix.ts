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
 * Generates a dynamic document number based on company-specific or global prefix settings.
 * It atomically increments the sequence number to prevent duplicates in high-concurrency.
 * If model and fieldName are provided, it will retry up to 10 times to find a unique number.
 * 
 * @param {PrefixOptions} options - Contains companyId, prefixType, and optional DB checking parameters.
 * @returns {Promise<string>} The generated document number (e.g., "INV-101")
 */
export const getAndIncrementPrefix = async ({ companyId, prefixType, model, fieldName }: PrefixOptions): Promise<string> => {
  const companyFilter: any = { companyId: companyId as any, prefixType, isDeleted: false };
  let attempts = 0;
  let resultNumber: string = "";

  // 1. Try to find the correct prefix string once (Company-specific -> Global Template -> Default)
  let prefixDoc = await PrefixModel.findOne(companyFilter).lean();
  let prefixString = prefixDoc?.prefix;

  if (!prefixString) {
    const globalTemplate = await PrefixModel.findOne({ companyId: null as any, prefixType, isDeleted: false }).lean();
    prefixString = globalTemplate?.prefix || String(prefixType).toUpperCase().substring(0, 3);
  }

  // 2. Loop to atomic increment and uniqueness check
  do {
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

    const sequenceNumber = updatedDoc ? (updatedDoc.sequenceNumber ?? 1) : 1;
    resultNumber = `${prefixString}-${sequenceNumber}`;

    if (!model || !fieldName) break;

    // 3. Uniqueness check
    const isExist = await model.findOne({ companyId: companyId as any, [fieldName]: resultNumber, isDeleted: false }).lean();
    if (!isExist) break;

    attempts++;
  } while (attempts < 10);

  return resultNumber;
};
