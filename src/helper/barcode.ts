import mongoose from "mongoose";
import { productModel } from "../database";

/**
 * Calculates the EAN-13 checksum digit for a given 12-digit string.
 * @param digits12 The 12-digit numeric string.
 * @returns The checksum digit (0-9).
 */
export const calculateEan13Checksum = (digits12: string): number => {
  if (digits12.length !== 12 || !/^\d+$/.test(digits12)) {
    throw new Error("Input must be a 12-digit numeric string");
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits12[i], 10);
    // EAN-13 weights: odd positions (1st, 3rd...) multiplied by 1, even positions (2nd, 4th...) by 3.
    // Since i is 0-indexed: index 0 (1st position) is multiplied by 1, index 1 (2nd position) is multiplied by 3.
    const weight = i % 2 === 0 ? 1 : 3;
    sum += digit * weight;
  }

  const checksum = (10 - (sum % 10)) % 10;
  return checksum;
};

/**
 * Generates a unique EAN-13 barcode that does not exist in the database.
 * Uses the private-use / internal prefix '200' followed by 9 random digits and the EAN-13 checksum.
 * @param companyId Optional company ID to scope the duplicate check.
 * @returns A unique 13-digit EAN-13 barcode string.
 */
export const generateUniqueEan13Barcode = async (
  companyId?: string | mongoose.Types.ObjectId,
  excludeBarcodes?: Set<string> | string[]
): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    attempts++;
    // Generate 9 random digits
    let randomDigits = "";
    for (let i = 0; i < 9; i++) {
      randomDigits += Math.floor(Math.random() * 10).toString();
    }

    // Prepend private in-store prefix '200' (making it 12 digits total)
    const digits12 = `200${randomDigits}`;
    const checksum = calculateEan13Checksum(digits12);
    const barcode = `${digits12}${checksum}`;

    // Skip if it is in the exclude list
    if (excludeBarcodes) {
      const shouldExclude = excludeBarcodes instanceof Set 
        ? excludeBarcodes.has(barcode) 
        : excludeBarcodes.includes(barcode);
      if (shouldExclude) {
        continue;
      }
    }

    // Check if it already exists in the database
    const criteria: any = {
      $or: [
        { barcode: barcode },
        { "variants.barcode": barcode }
      ],
      isDeleted: false
    };

    if (companyId) {
      criteria.companyId = companyId;
    }

    const exists = await productModel.findOne(criteria).lean();
    if (!exists) {
      return barcode;
    }
  }

  throw new Error("Failed to generate a unique EAN-13 barcode after maximum attempts");
};

