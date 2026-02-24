import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { CASH_CONTROL_TYPE } from "../common";

export const addCashControlSchema = Joi.object({
    type: Joi.string()
        .valid(...Object.values(CASH_CONTROL_TYPE)),
    amount: Joi.number().min(1).required(),
    remark: Joi.string().optional().allow("", null),
    ...baseApiSchema,
});

export const editCashControlSchema = Joi.object({
    cashControlId: objectId().required(),
    type: Joi.string()
        .valid(...Object.values(CASH_CONTROL_TYPE))
        .optional(),
    amount: Joi.number().min(1).optional(),
    remark: Joi.string().optional().allow("", null),
    ...baseApiSchema,
});

export const getCashControlSchema = Joi.object({
    id: objectId().required(),
});

export const deleteCashControlSchema = Joi.object({
    id: objectId().required(),
});

export const getAllCashControlSchema = Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).optional(),
    search: Joi.string().optional().allow("", null),
    registerId: objectId().optional(),
    type: Joi.string()
        .valid(...Object.values(CASH_CONTROL_TYPE))
        .optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    companyFilter: objectId().optional(),
    branchFilter: objectId().optional(),
});

export const cashControlDropDownSchema = Joi.object({
    search: Joi.string().optional().allow("", null),
    branchId: objectId().optional(),
});
