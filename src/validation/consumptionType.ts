import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const createConsumptionTypeSchema = Joi.object({
    ...baseApiSchema,
    name: Joi.string().required(),
});

export const updateConsumptionTypeSchema = Joi.object({
    ...baseApiSchema,
    consumptionTypeId: objectId().required(),
    name: Joi.string().optional(),
});

export const getConsumptionTypeSchema = Joi.object({
    id: objectId().required(),
});

export const deleteConsumptionTypeSchema = Joi.object({
    id: objectId().required(),
});