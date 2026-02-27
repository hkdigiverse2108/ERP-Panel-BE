import Joi from "joi";
import mongoose from "mongoose";

export const objectId = () =>
  Joi.string()
    .custom((value, helpers) => {
      if (!mongoose?.Types.ObjectId.isValid(value)) {
        return helpers.error("any.invalid");
      }
      return value;
    }, "ObjectId Validation")
    .allow(null);

export const baseApiSchema = {
  companyId: objectId().optional().allow("", null),
  branchId: objectId().optional().allow("", null),
  isActive: Joi.boolean().optional(),
};

export const commonContactSchema = Joi.object().keys({
  countryCode: Joi.string().optional(),
  phoneNo: Joi.string()
    .pattern(/^\d{6,15}$/)
    .optional(),
});

export const transectionSummarySchema = Joi.object().keys({
  flatDiscount: Joi.number().default(0).optional(),
  grossAmount: Joi.number().default(0).optional(),
  discountAmount: Joi.number().default(0).optional(),
  taxableAmount: Joi.number().default(0).optional(),
  taxAmount: Joi.number().default(0).optional(),
  roundOff: Joi.number().default(0).optional(),
  netAmount: Joi.number().default(0).optional(),
});

export const commonAdditionalChargeSchema = Joi.object().keys({
  chargeId: objectId().required(),
  taxId: objectId().required(),
  amount: Joi.number().required(),
  totalAmount: Joi.number().required(),
});
