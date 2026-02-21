import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const deletePosCreditNoteSchema = Joi.object({
    id: objectId().required(),
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
