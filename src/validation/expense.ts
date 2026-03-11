import Joi from "joi";
import { objectId } from "./common";
import { EXPENSEDATA_TYPE } from "../common";

export const addExpenseSchema = Joi.object().keys({
    companyId: objectId().optional(),
    amount: Joi.number().required(),
    file: Joi.string().optional().allow("", null),
    description: Joi.string().optional().allow("", null),
    partyId: objectId().optional().allow("", null),
    type: Joi.string().valid(...Object.values(EXPENSEDATA_TYPE)).required(),
    total: Joi.number().optional().allow(null),
});

export const editExpenseSchema = Joi.object().keys({
    companyId: objectId().optional(),
    expenseId: objectId().required(),
    amount: Joi.number().optional(),
    file: Joi.string().optional().allow("", null),
    description: Joi.string().optional().allow("", null),
    partyId: objectId().optional().allow("", null),
    type: Joi.string().valid(...Object.values(EXPENSEDATA_TYPE)).optional(),
    total: Joi.number().optional().allow(null),
});

export const deleteExpenseSchema = Joi.object().keys({
    id: objectId().required(),
});

export const getExpenseSchema = Joi.object().keys({
    id: objectId().required(),
});
