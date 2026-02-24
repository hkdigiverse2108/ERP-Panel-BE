import { apiResponse, HTTP_STATUS } from "../../common";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter } from "../../helper";
import { accountModel, JournalVoucherModel } from "../../database";
import { createJournalVoucherSchema, updateJournalVoucherSchema, deleteJournalVoucherSchema, getJournalVoucherSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

const generatePaymentNo = async (companyId): Promise<string> => {
    const count = await JournalVoucherModel.countDocuments({ companyId, isDeleted: false });
    const prefix = "JV";
    const number = String(count + 1).padStart(6, "0");
    return `${prefix}${number}`;
};

export const createJournalVoucher = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = createJournalVoucherSchema.validate(req.body);
        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        value.companyId = await checkCompany(user, value);
        if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

        const accountIds = value.entries.map(item => item.accountId);
        const duplicateAccounts = accountIds.filter((item, index) => accountIds.indexOf(item) !== index);
        if (duplicateAccounts.length > 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage("Duplicate Account"), {}, {}));
        }

        if (value.entries && value.entries.length > 0) {
            for (const item of value.entries) {
                if (!(await checkIdExist(accountModel, item?.accountId, "account", res))) return;
            }
        }

        if (value.companyId) { // Super Admin may optionally pass companyId
            value.paymentNo = await generatePaymentNo(value.companyId);
        } else {
            value.paymentNo = await generatePaymentNo(user?.companyId);
        }

        value.companyId = value.companyId || user?.companyId;
        value.createdBy = user?._id;
        value.updatedBy = user?._id;

        const response = await createOne(JournalVoucherModel, value);
        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
        }
        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Journal Voucher"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
}

export const updateJournalVoucher = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = updateJournalVoucherSchema.validate(req.body);
        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        value.companyId = await checkCompany(user, value);

        const isExist = await getFirstMatch(JournalVoucherModel, { _id: value?.journalVoucherId, isDeleted: false }, {}, {});
        if (!isExist) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Journal Voucher"), {}, {}));
        }

        if (value.entries && value.entries.length > 0) {
            for (const item of value.entries) {
                if (!(await checkIdExist(accountModel, item?.accountId, "account", res))) return;
            }
        }

        value.updatedBy = user?._id;

        const response = await updateData(JournalVoucherModel, { _id: value?.journalVoucherId }, value, {});
        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Journal Voucher"), {}, {}));
        }
        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Journal Voucher"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
}

export const deleteJournalVoucher = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = deleteJournalVoucherSchema.validate(req.params);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        if (!(await checkIdExist(JournalVoucherModel, value?.id, "Journal Voucher", res))) return;

        const payload = {
            isDeleted: true,
            updatedBy: user?._id || null,
        };

        const response = await updateData(JournalVoucherModel, { _id: new ObjectId(value?.id) }, payload, {});

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Journal Voucher"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Journal Voucher"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const getAllJournalVoucher = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;

        let { page, limit, search, status, startDate, endDate, activeFilter, companyFilter, accountFilter } = req.query;

        const companyId = await checkCompany(user, req.query);

        page = Number(page);
        limit = Number(limit);

        let criteria: any = { isDeleted: false };
        if (companyId) {
            criteria.companyId = companyId;
        }

        if (companyFilter) {
            criteria.companyId = companyFilter;
        }

        if (search) {
            criteria.$or = [
                { paymentNo: { $regex: search, $options: "si" } },
                { description: { $regex: search, $options: "si" } }
            ];
        }

        if (accountFilter) {
            criteria.entries.accountId = accountFilter;
        }

        if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

        if (status) {
            criteria.status = status;
        }

        applyDateFilter(criteria, startDate as string, endDate as string, "date");

        const options: any = {
            sort: { createdAt: -1 },
            populate: [
                { path: "entries.accountId", select: "name accountGroup" },
                { path: "companyId", select: "name" },
            ],
        };

        if (page && limit) {
            options.skip = (page - 1) * limit;
            options.limit = limit;
        }

        const response = await getDataWithSorting(JournalVoucherModel, criteria, {}, options);
        const totalData = await countData(JournalVoucherModel, criteria);

        const totalPages = limit ? Math.ceil(totalData / limit) || 1 : 1;

        const state = {
            page: page || 1,
            limit: limit || totalData,
            totalPages,
        };

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Journal Voucher"), { journalVoucher_data: response, totalData, state }, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const getOneJournalVoucher = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getJournalVoucherSchema.validate(req.params);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const response = await getFirstMatch(
            JournalVoucherModel,
            { _id: value?.id, isDeleted: false },
            {},
            {
                populate: [
                    { path: "entries.accountId", select: "name accountGroup" },
                    { path: "companyId", select: "name" },
                ],
            }
        );

        if (!response) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Journal Voucher"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Journal Voucher"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};