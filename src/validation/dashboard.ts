import Joi from "joi";
import { CUSTOMER_CATEGORY_ENUM, CUSTOMER_TYPE } from "../common";
import { objectId } from "./common";

export const getCategoryWiseCustomersSchema = Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    companyFilter: objectId().optional(),
    companyId: objectId().optional(),
    typeFilter: Joi.string()
        .valid("all", ...Object.values(CUSTOMER_CATEGORY_ENUM))
        .optional(),
    customerTypeFilter: Joi.string()
        .valid(...Object.values(CUSTOMER_TYPE))
        .optional(),
    customerFilter: objectId().optional(),
});


