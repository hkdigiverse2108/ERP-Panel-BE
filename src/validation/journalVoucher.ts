import Joi from "joi";
import { objectId } from "./common";
import { JOURNAL_VOUCHER_STATUS } from "../common";

const journalVoucherEntrySchema = Joi.object().keys({
    accountId: objectId().required(),
    debit: Joi.number().default(0),
    credit: Joi.number().default(0),
    description: Joi.string().optional(),
});

export const createJournalVoucherSchema = Joi.object().keys({
    companyId: objectId().optional(),
    date: Joi.date().required(),
    description: Joi.string().optional(),
    entries: Joi.array().items(journalVoucherEntrySchema).min(2).required(),
    totalDebit: Joi.number().default(0),
    totalCredit: Joi.number().default(0),
    status: Joi.string().valid(...Object.values(JOURNAL_VOUCHER_STATUS)).default(JOURNAL_VOUCHER_STATUS.DRAFT),
});

export const updateJournalVoucherSchema = Joi.object().keys({
    companyId: objectId().optional(),
    journalVoucherId: objectId().required(),
    paymentNo: Joi.string().optional(),
    date: Joi.date().optional(),
    description: Joi.string().optional(),
    entries: Joi.array().items(journalVoucherEntrySchema).min(2).optional(),
    totalDebit: Joi.number().default(0),
    totalCredit: Joi.number().default(0),
    status: Joi.string().valid(...Object.values(JOURNAL_VOUCHER_STATUS)).default(JOURNAL_VOUCHER_STATUS.DRAFT),
});

export const deleteJournalVoucherSchema = Joi.object().keys({
    id: objectId().required(),
});

export const getJournalVoucherSchema = Joi.object().keys({
    id: objectId().required(),
});