import mongoose from "mongoose";
import { companyModel, paymentTermsModel } from "../../database";

/**
 * Fetches the global default payment-terms and inserts them for the newly created company.
 * @param companyId The ID of the newly created company
 * @param createdBy The user ID who created the company (optional)
 * @param session Optional Mongoose session for transaction support
 * @returns Object indicating success or failure, and message
 */
export const cloneDefaultPaymentTermsToCompany = async (
    companyId: string | mongoose.Types.ObjectId,
    createdBy?: string | mongoose.Types.ObjectId,
    session?: mongoose.ClientSession
) => {
    try {
        // Fetch global defaults (isDefault: true, no companyId)
        const defaultTerms = await paymentTermsModel.find({
            isDefault: true,
            companyId: null,
            isDeleted: false,
            isActive: true,
        }).session(session || null).lean();

        if (!defaultTerms || defaultTerms.length === 0) {
            return { success: true, message: "No global default payment terms found to clone." };
        }

        // Use bulkWrite with upsert to avoid duplicate entries if called multiple times or concurrently
        const bulkOps = defaultTerms.map((term: any) => {
            const { _id, createdAt, updatedAt, ...rest } = term;
            return {
                updateOne: {
                    filter: { name: term.name, companyId },
                    update: {
                        $setOnInsert: {
                            ...rest,
                            companyId,
                            isDefault: false,
                            createdBy: createdBy || term.createdBy,
                            updatedBy: createdBy || term.updatedBy,
                        }
                    },
                    upsert: true
                }
            };
        });

        await paymentTermsModel.bulkWrite(bulkOps as any, { session: session || undefined });

        return { success: true, message: "Default payment terms cloned successfully." };
    } catch (error) {
        console.error("Error cloning default payment terms to company:", error);
        return { success: false, message: error instanceof Error ? error.message : "Internal server error during cloning." };
    }
};

/**
 * Propagates a newly created global default payment-term to all existing companies.
 * @param paymentTermId The ID of the newly created global default payment term
 * @param createdBy The user ID who created the term (optional)
 * @param session Optional Mongoose session for transaction support
 * @returns Object indicating success or failure
 */
export const propagateDefaultPaymentTermToAllCompanies = async (
    paymentTermId: string | mongoose.Types.ObjectId,
    createdBy?: string | mongoose.Types.ObjectId,
    session?: mongoose.ClientSession
) => {
    try {
        const globalTerm = await paymentTermsModel.findOne({
            _id: paymentTermId,
            isDefault: true,
            isDeleted: false,
        }).session(session || null).lean();

        if (!globalTerm || globalTerm.companyId) {
            return { success: false, message: "Payment term is not a global default." };
        }

        // Fetch all active companies
        const companies = await companyModel.find({ isDeleted: false, isActive: true })
            .select('_id')
            .session(session || null)
            .lean();

        if (!companies || companies.length === 0) {
            return { success: true, message: "No companies found to propagate." };
        }

        const { _id, createdAt, updatedAt, ...rest } = globalTerm as any;

        const bulkOps = companies.map(company => ({
            updateOne: {
                filter: { name: globalTerm.name, companyId: company._id },
                update: {
                    $setOnInsert: {
                        ...rest,
                        companyId: company._id,
                        isDefault: false,
                        createdBy: createdBy || globalTerm.createdBy,
                        updatedBy: createdBy || globalTerm.updatedBy,
                    }
                },
                upsert: true
            }
        }));

        await paymentTermsModel.bulkWrite(bulkOps as any, { session: session || undefined });

        return { success: true, message: "Global payment term propagated to all companies." };
    } catch (error) {
        console.error("Error propagating global payment term:", error);
        return { success: false, message: error instanceof Error ? error.message : "Internal server error during propagation." };
    }
};
