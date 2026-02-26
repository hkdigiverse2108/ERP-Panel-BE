import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { REDEEM_CREDIT_TYPE } from "../common";

export const deletePosCreditNoteSchema = Joi.object({
    id: objectId().required(),
});

export const checkRedeemCreditSchema = Joi.object().keys({
    code: Joi.string().required(),
    type: Joi.string().valid(...Object.values(REDEEM_CREDIT_TYPE)).required(),
    customerId: objectId().optional().allow(null),
});

export const getPosCreditNoteSchema = Joi.object({
    id: objectId().required(),
});

export const getAllPosCreditNoteSchema = Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).optional(),
    search: Joi.string().optional().allow("", null),
    customerId: objectId().optional().allow(null),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
});

export const redundPosCreditSchema = Joi.object({
    posCreditNoteId: objectId().required(),
    refundViaCash: Joi.number().min(0).default(0).optional(),
    refundViaBank: Joi.number().min(0).default(0).optional(),
    bankAccountId: objectId().optional().allow(null),
    refundDescription: Joi.string().optional().allow("", null),
});
