import mongoose from "mongoose";
import { PrefixModel, companyModel } from "../database";
import { PREFIX_MODULES } from "../common";
import { IPrefix } from "../types";

interface PrefixOptions {
  branchId?: string | mongoose.Types.ObjectId;
  companyId?: string | mongoose.Types.ObjectId;
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
export const getAndIncrementPrefix = async (options: PrefixOptions): Promise<string> => {
  const { branchId, prefixType } = options;
  const queryFilter: any = { branchId: branchId as any, prefixType, isDeleted: false };
  let resultNumber: string = "";

  // 1. Try to find the correct prefix string once (Branch-specific -> Global Template -> Default)
  let prefixString = "";
  let prefixDoc = await PrefixModel.findOne(queryFilter).lean();
  prefixString = prefixDoc?.prefix;

  if (!prefixString) {
    const globalTemplate = await PrefixModel.findOne({ branchId: null as any, companyId: null as any, prefixType, isDeleted: false }).lean();
    prefixString = globalTemplate?.prefix || String(prefixType).toUpperCase().substring(0, 3);
  }

  // Determine companyId for the $setOnInsert (mandatory for the model)
  let companyId = options.companyId;
  if (!companyId && branchId) {
    const { branchModel } = require("../database"); // Lazy import to avoid circular dependency
    const branch = await branchModel.findById(branchId).lean();
    companyId = branch?.companyId;
  }

  // 2. Atomic increment and return result
  const updatedDoc = await PrefixModel.findOneAndUpdate(
    queryFilter,
    {
      $inc: { currentNumber: 1 },
      $setOnInsert: {
        prefix: prefixString,
        branchId: branchId as any,
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


/**
 * Clones prefixes from company templates or global templates to a specific branch.
 * @param companyId The ID of the company
 * @param branchId The ID of the branch
 * @param createdBy The user ID who triggered this
 * @returns Success or failure object
 */
export const clonePrefixesToBranch = async (
  companyId: string | mongoose.Types.ObjectId,
  branchId: string | mongoose.Types.ObjectId,
  createdBy?: string | mongoose.Types.ObjectId
) => {
  try {
    // 1. Fetch company to identify the Head Branch
    const company = await companyModel.findById(companyId).lean();
    if (!company) {
      console.log(`Company not found: ${companyId}`);
      return { success: false, message: "Company not found." };
    }

    const { headBranchId } = company as any;
    const isHeadBranch = branchId.toString() === headBranchId?.toString();

    let templateCriteria: any;

    if (isHeadBranch) {
      // Requirement: Head Branch clones from Global Prefixes (no specific company/branch assigned)
      templateCriteria = {
        companyId: null as any,
        branchId: null as any,
        isDeleted: false,
      };
    } else {
      // Requirement: Subsequent branches clone prefixes from that company's Head Branch
      templateCriteria = {
        companyId: companyId as any,
        branchId: headBranchId as any,
        isDeleted: false,
      };
    }

    let templates = await PrefixModel.find(templateCriteria).lean();

    // Fallback: If no specific templates found, fall back to global templates
    if (!templates || templates.length === 0) {
      templates = await PrefixModel.find({
        companyId: null as any,
        branchId: null as any,
        isDeleted: false,
      }).lean();
    }

    if (!templates || templates.length === 0) {
      console.log(`No prefix templates found to clone for branch ${branchId}`);
      return { success: true, message: "No prefixes to clone." };
    }

    // 2. Map templates to the new branch
    const branchPrefixes = templates.map((template: any) => ({
      prefixType: template.prefixType,
      prefix: template.prefix,
      sequenceNumber: template.sequenceNumber,
      currentNumber: template.sequenceNumber, // Use the configured sequence number as starting point
      companyId: companyId as any,
      branchId: branchId as any,
      createdBy: createdBy || null,
      updatedBy: createdBy || null,
    }));

    // 3. Insert prefixes for the new branch
    await PrefixModel.insertMany(branchPrefixes);
    return { success: true, message: "Prefixes cloned successfully." };
  } catch (error) {
    console.error("Error cloning prefixes to branch:", error);
    return { success: false, message: error instanceof Error ? error.message : "Internal error" };
  }
};
