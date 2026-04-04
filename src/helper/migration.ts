import { companyModel, branchModel, InvoiceModel, SalesOrderModel, purchaseOrderModel, deliveryChallanModel, EstimateModel, supplierBillModel, adjustmentNoteModel, voucherModel, ExpenseModel, productModel, contactModel, materialConsumptionModel, PosOrderModel, stockModel, PrefixModel, stockVerificationModel, materialInwardModel, productRequestModel, billOfLiveProductModel, PosPaymentModel, PosCashRegisterModel, PosCashControlModel, returnPosOrderModel, posCreditNoteModel, BankTransactionModel, feedbackModel, additionalChargeModel, termsConditionModel, discountModel, couponModel, loyaltyPointsModel, bankModel, materialModel, callRequestModel, ConsumptionTypeModel, brandModel, categoryModel, taxModel, companyDriveModel, departmentModel, loyaltyModel, membershipModel, notificationModel, recipeModel, salesCreditNoteModel, purchaseDebitNoteModel, settingsModel, paymentTermsModel, CashControlModel } from "../database";
import { createOne, updateData } from "./databaseServices";

/**
 * Migration Function: Creates Head Branches for existing companies and 
 * links all legacy transactional data to that new branch.
 */
export const patchHeadBranchesForAllCompanies = async (userId: string | null = null) => {
  try {
    const companies: any[] = await companyModel.find({ headBranchId: { $in: [null, undefined] }, isDeleted: false });
    console.log(`Found ${companies.length} companies missing a head branch.`);

    for (const companyRecord of companies) {
      const company = companyRecord as any;
      console.log(`Patching Company: ${company.name} (${company._id})`);

      // 1. Create a Head Branch for the company
      const branchPayload: any = {
        companyId: company._id,
        name: `${company.name} - Head Branch`,
        displayName: company.displayName,
        contactName: company.contactName,
        email: company.email,
        phoneNo: company.phoneNo,
        address: company.address,
        isHeadBranch: true,
        createdBy: userId,
        updatedBy: userId,
      };

      const headBranch: any = await createOne(branchModel, branchPayload);
      if (!headBranch) {
        console.error(`Failed to create head branch for company: ${company.name}`);
        continue;
      }

      // 2. Link company to Head Branch
      await updateData(companyModel, { _id: company._id }, { headBranchId: headBranch._id }, {});

      // 3. Update legacy data where branchId is null/missing
      const branchId = headBranch._id;
      const filter = { companyId: company._id, branchId: { $in: [null, undefined] } };
      const update = { branchId };

      console.log(` - Linking legacy transactional data for ${company.name}...`);
      
      const modelsToUpdate = [
        InvoiceModel,
        SalesOrderModel,
        purchaseOrderModel,
        deliveryChallanModel,
        EstimateModel,
        supplierBillModel,
        adjustmentNoteModel,
        voucherModel,
        ExpenseModel,
        productModel,
        contactModel,
        materialConsumptionModel,
        PosOrderModel,
        stockModel,
        PrefixModel,
        stockVerificationModel,
        materialInwardModel,
        productRequestModel,
        billOfLiveProductModel,
        PosPaymentModel,
        PosCashRegisterModel,
        PosCashControlModel,
        returnPosOrderModel,
        posCreditNoteModel,
        BankTransactionModel,
        feedbackModel,
        additionalChargeModel,
        termsConditionModel,
        discountModel,
        couponModel,
        loyaltyPointsModel,
        bankModel,
        materialModel,
        callRequestModel,
        ConsumptionTypeModel,
        brandModel,
        categoryModel,
        taxModel,
        companyDriveModel,
        departmentModel,
        loyaltyModel,
        membershipModel,
        notificationModel,
        recipeModel,
        salesCreditNoteModel,
        purchaseDebitNoteModel,
        settingsModel,
        paymentTermsModel,
        CashControlModel
      ];
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
