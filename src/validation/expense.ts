import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { EXPENSEDATA_TYPE } from "../common";

export const addExpenseSchema = Joi.object().keys({
    amount: Joi.number().required(),
    image: Joi.string().optional().allow("", null),
    description: Joi.string().optional().allow("", null),
    partyId: objectId().optional().allow("", null),
    type: Joi.string().valid(...Object.values(EXPENSEDATA_TYPE)).required(),
    total: Joi.number().optional().allow(null),
    fromDate: Joi.date(),
    ...baseApiSchema,
});

export const editExpenseSchema = Joi.object().keys({
    expenseId: objectId().required(),
    amount: Joi.number().optional(),
    image: Joi.string().optional().allow("", null),
    description: Joi.string().optional().allow("", null),
    partyId: objectId().optional().allow("", null),
    type: Joi.string().valid(...Object.values(EXPENSEDATA_TYPE)).optional(),
    total: Joi.number().optional().allow(null),
    fromDate: Joi.date(),
    ...baseApiSchema
});

export const deleteExpenseSchema = Joi.object().keys({
    id: objectId().required(),
});

export const getExpenseSchema = Joi.object().keys({
    id: objectId().required(),
});
