import Joi from "joi";
import { objectId } from "./common";
import { EXPENSEDATA_TYPE } from "../common";

export const addSalarySchema = Joi.object().keys({
    amount: Joi.number().required(),
    companyId: objectId().optional(),
    file: Joi.string().optional().allow("", null),
    description: Joi.string().optional().allow("", null),
    partyId: objectId().required(), // Employee ID
    type: Joi.string().valid(...Object.values(EXPENSEDATA_TYPE)).default(EXPENSEDATA_TYPE.EXPENSE),
    incentive: Joi.number().default(0).optional(),
    fromDate: Joi.date().required(),
    toDate: Joi.date().required(),
    total: Joi.number().required(),
});

export const editSalarySchema = Joi.object().keys({
    salaryId: objectId().required(),
    companyId: objectId().optional(),
    amount: Joi.number().optional(),
    file: Joi.string().optional().allow("", null),
    description: Joi.string().optional().allow("", null),
    partyId: objectId().optional(),
    type: Joi.string().valid(...Object.values(EXPENSEDATA_TYPE)).optional(),
    incentive: Joi.number().optional(),
    fromDate: Joi.date().optional(),
    toDate: Joi.date().optional(),
    total: Joi.number().optional(),
});

export const deleteSalarySchema = Joi.object().keys({
    id: objectId().required(),
});

export const getSalarySchema = Joi.object().keys({
    id: objectId().required(),
});
