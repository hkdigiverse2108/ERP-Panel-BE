import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { CASH_REGISTER_STATUS } from "../common";

const denominationSchema = Joi.object({
    currency: Joi.number().required(),
    count: Joi.number().min(0).required(),
    amount: Joi.number().min(0).required(),
});

export const addPosCashRegisterSchema = Joi.object({
    openingCash: Joi.number().min(0).required(),
    ...baseApiSchema,
});

export const editPosCashRegisterSchema = Joi.object({
    posCashRegisterId: objectId().required(),
    openingCash: Joi.number().min(0).optional(),
    cashPayment: Joi.number().min(0).optional(),
    chequePayment: Joi.number().min(0).optional(),
    cardPayment: Joi.number().min(0).optional(),
    bankPayment: Joi.number().min(0).optional(),
    upiPayment: Joi.number().min(0).optional(),
    salesReturn: Joi.number().min(0).optional(),
    cashRefund: Joi.number().min(0).optional(),
    bankRefund: Joi.number().min(0).optional(),
    creditAdvanceRedeemed: Joi.number().min(0).optional(),
    payLater: Joi.number().min(0).optional(),
    expense: Joi.number().min(0).optional(),
    purchasePayment: Joi.number().min(0).optional(),
    totalSales: Joi.number().min(0).optional(),
    denominations: Joi.array().items(denominationSchema).optional(),
    totalDenominationAmount: Joi.number().min(0).optional(),
    bankAccountId: objectId().optional().allow(null),
    bankTransferAmount: Joi.number().min(0).optional(),
    cashFlow: Joi.number().optional(),
    totalCashLeftInDrawer: Joi.number().min(0).optional(),
    physicalDrawerCash: Joi.number().min(0).optional(),
    closingNote: Joi.string().optional().allow("", null),
    status: Joi.string().valid(...Object.values(CASH_REGISTER_STATUS)).optional(),
    ...baseApiSchema,
});

export const getPosCashRegisterSchema = Joi.object({
    id: objectId().required(),
});

export const deletePosCashRegisterSchema = Joi.object({
    id: objectId().required(),
});

export const getAllPosCashRegisterSchema = Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).optional(),
    search: Joi.string().optional().allow("", null),
    branchFilter: objectId().optional(),
    statusFilter: Joi.string().valid(...Object.values(CASH_REGISTER_STATUS)).optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
});

export const posCashRegisterDropDownSchema = Joi.object({
    search: Joi.string().optional().allow("", null),
    branchId: objectId().optional(),
    status: Joi.string().valid(...Object.values(CASH_REGISTER_STATUS)).optional(),
});
