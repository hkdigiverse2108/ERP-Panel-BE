import Joi from "joi";
import { baseCompanyApiSchema, objectId } from "./common";

export const createConsumptionTypeSchema = Joi.object({
    ...baseCompanyApiSchema,
    name: Joi.string().required(),
});

export const updateConsumptionTypeSchema = Joi.object({
    ...baseCompanyApiSchema,
    consumptionTypeId: objectId().required(),
    name: Joi.string().optional(),
});

export const getConsumptionTypeSchema = Joi.object({
    id: objectId().required(),
});

export const deleteConsumptionTypeSchema = Joi.object({
    id: objectId().required(),
});