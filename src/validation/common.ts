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
  flatDiscount: Joi.number().optional(),
  grossAmount: Joi.number().optional(),
  discountAmount: Joi.number().optional(),
  taxableAmount: Joi.number().optional(),
  taxAmount: Joi.number().optional(),
  roundOff: Joi.number().optional(),
  netAmount: Joi.number().optional(),
});

export const commonAdditionalChargeSchema = Joi.object().keys({
  chargeId: objectId().required(),
  taxId: objectId().required(),
  amount: Joi.number().required(),
  totalAmount: Joi.number().required(),
});