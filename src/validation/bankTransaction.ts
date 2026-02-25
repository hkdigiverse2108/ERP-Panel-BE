import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const addBankTransactionSchema = Joi.object().keys({
    transactionDate: Joi.date().iso().required(),
    transactionType: Joi.string().valid('deposit', 'withdrawal', 'transfer').required(),
    fromAccount: objectId().required(),
    toAccount: objectId().optional().allow(null, ""),
    amount: Joi.number().min(0).required(),
    description: Joi.string().trim().optional().allow(null, ""),
    ...baseApiSchema,
});

export const editBankTransactionSchema = Joi.object().keys({
    bankTransactionId: objectId().required(),
    voucherNo: Joi.string().trim().optional(),
    transactionDate: Joi.date().iso().optional(),
    transactionType: Joi.string().valid('deposit', 'withdrawal', 'transfer').optional(),
    fromAccount: objectId().optional(),
    toAccount: objectId().optional().allow(null, ""),
    amount: Joi.number().min(0).optional(),
    description: Joi.string().trim().optional().allow(null, ""),
    ...baseApiSchema,
});

export const getBankTransactionSchema = Joi.object().keys({
    id: objectId().required(),
});

export const deleteBankTransactionSchema = Joi.object().keys({
    id: objectId().required(),
});
