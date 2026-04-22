import { companyModel, userModel, branchModel, InvoiceModel, SalesOrderModel, purchaseOrderModel, deliveryChallanModel, EstimateModel, supplierBillModel, adjustmentNoteModel, voucherModel, ExpenseModel, productModel, contactModel, materialConsumptionModel, PosOrderModel, stockModel, PrefixModel, stockVerificationModel, materialInwardModel, productRequestModel, billOfLiveProductModel, PosPaymentModel, PosCashRegisterModel, PosCashControlModel, returnPosOrderModel, posCreditNoteModel, BankTransactionModel, feedbackModel, additionalChargeModel, termsConditionModel, discountModel, couponModel, loyaltyPointsModel, bankModel, materialModel, callRequestModel, ConsumptionTypeModel, brandModel, categoryModel, taxModel, companyDriveModel, departmentModel, loyaltyModel, membershipModel, notificationModel, recipeModel, salesCreditNoteModel, purchaseDebitNoteModel, settingsModel, paymentTermsModel, CashControlModel } from "../database";
import { createOne, updateData } from "./databaseServices";

/**
 * Migration Function: Creates Head Branches for existing companies and
 * links all legacy transactional data to that new branch.
 */
export const patchHeadBranchesForAllCompanies = async (userId: string | null = null) => {
  try {
    // Fetch all active companies to ensure we fix any duplicate head branches across the entire system
    const companies: any[] = await companyModel.find({ isDeleted: false });
    console.log(`Found ${companies.length} active companies to verify/patch.`);

    for (const companyRecord of companies) {
      const company = companyRecord as any;
      console.log(`Patching Company: ${company.name} (${company._id})`);

      // 1. Resolve which branch will be the "Head Branch"
      // Fetch ALL head branches for this company, sorted by oldest first
      const existingHeadBranches = await branchModel.find({ companyId: company._id, isHeadBranch: true, isDeleted: false }).sort({ createdAt: 1, _id: 1 });

      let headBranch: any = null;

      if (existingHeadBranches.length > 0) {
        headBranch = existingHeadBranches[0];
        console.log(` - Found existing head branch for ${company.name}: ${headBranch.name} (${headBranch._id})`);

        // If there are multiple head branches due to a previous bug, revert the extra ones
        if (existingHeadBranches.length > 1) {
          console.warn(`   -> WARNING: Found ${existingHeadBranches.length} head branches for ${company.name}. Reverting extras.`);
          const duplicateIds = existingHeadBranches.slice(1).map((b: any) => b._id);
          await branchModel.updateMany({ _id: { $in: duplicateIds } }, { isHeadBranch: false });
        }
      } else {
        // 2. Pick the oldest ("First") branch if no head branch exists
        // Using deterministic sort (_id: 1) prevents race condition from updating different branches concurrently
        const oldestBranch: any = await branchModel.findOne({ companyId: company._id, isDeleted: false }).sort({ createdAt: 1, _id: 1 });

        if (oldestBranch) {
          console.log(` - Promoting oldest branch to head for ${company.name}: ${oldestBranch.name} (${oldestBranch._id})`);
          await updateData(branchModel, { _id: oldestBranch._id }, { isHeadBranch: true }, {});
          headBranch = oldestBranch;
        } else {
          // 3. Create a brand new Head Branch as a last resort (zero branches exist)
          console.log(` - Creating brand new head branch for ${company.name}...`);
          const branchPayload: any = {
            companyId: company._id,
            name: `${company.name || company.displayName || "Head Branch"}`,
            displayName: company.displayName,
            contactName: company.contactName,
            email: company.email,
            phoneNo: company.phoneNo,
            address: company.address,
            isHeadBranch: true,
            createdBy: userId,
            updatedBy: userId,
          };

          headBranch = await createOne(branchModel, branchPayload);
        }
      }

      if (!headBranch) {
        console.error(`Failed to resolve/create head branch for company: ${company.name}`);
        continue;
      }

      // 2. Link company to Head Branch
      await updateData(companyModel, { _id: company._id }, { headBranchId: headBranch._id }, {});

      // 3. Update legacy data where branchId is null/missing
      const branchId = headBranch._id;
      const filter = { companyId: company._id, branchId: { $in: [null, undefined] } };
      const update = { branchId };

      console.log(` - Linking legacy transactional data for ${company.name}...`);

      const modelsToUpdate = [userModel, InvoiceModel, SalesOrderModel, purchaseOrderModel, deliveryChallanModel, EstimateModel, supplierBillModel, adjustmentNoteModel, voucherModel, ExpenseModel, materialConsumptionModel, PosOrderModel, stockModel, PrefixModel, stockVerificationModel, materialInwardModel, productRequestModel, billOfLiveProductModel, PosPaymentModel, PosCashRegisterModel, PosCashControlModel, returnPosOrderModel, posCreditNoteModel, BankTransactionModel, feedbackModel, additionalChargeModel, termsConditionModel, discountModel, couponModel, loyaltyPointsModel, bankModel, materialModel, callRequestModel, ConsumptionTypeModel, brandModel, categoryModel, taxModel, companyDriveModel, departmentModel, loyaltyModel, membershipModel, notificationModel, recipeModel, salesCreditNoteModel, purchaseDebitNoteModel, paymentTermsModel, CashControlModel];
      for (const modelRef of modelsToUpdate) {
        let model = modelRef as any;
        try {
          if (model) {
            const result = await model.updateMany(filter, update);
            console.log(`   - ${model.modelName}: Updated ${result.modifiedCount} records.`);
          }
        } catch (mErr: any) {
          console.warn(`   - Error updating model ${model?.modelName}:`, mErr.message);
        }
      }

      console.log(`Successfully patched company: ${company.name}\n`);
    }

    console.log("Migration completed.");
    return { success: true, message: "Migration completed successfully." };
  } catch (error: any) {
    console.error("Migration fatal error:", error);
    return { success: false, message: error.message };
  }
};
