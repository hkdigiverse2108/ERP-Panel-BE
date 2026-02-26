import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { REDEEM_CREDIT_TYPE } from "../common";

export const deletePosCreditNoteSchema = Joi.object({
  id: objectId().required(),
});

export const checkRedeemCreditSchema = Joi.object().keys({
  code: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(REDEEM_CREDIT_TYPE))
    .required(),
  customerId: objectId().optional().allow(null),
});

export const getPosCreditNoteSchema = Joi.object({
  id: objectId().required(),
});


export const refundPosCreditSchema = Joi.object({
  posCreditNoteId: objectId().required(),
  refundViaCash: Joi.number().min(0).default(0).optional(),
  refundViaBank: Joi.number().min(0).default(0).optional(),
  bankAccountId: objectId().optional().allow(null),
  refundDescription: Joi.string().optional().allow("", null),
});

export const getCreditNoteDropdownSchema = Joi.object({
  customerFilter: objectId().optional().allow(null, ""),
  typeFilter: Joi.string()
    .required()
    .valid(...Object.values(REDEEM_CREDIT_TYPE)),
  companyFilter: objectId().optional().allow(null, ""),
});
