import { apiResponse, HTTP_STATUS } from "../../common";
import { bankModel, BankTransactionModel } from "../../database";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, checkIdExist, checkCompany, generateSequenceNumber } from "../../helper";
import { addBankTransactionSchema, editBankTransactionSchema, getBankTransactionSchema, deleteBankTransactionSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addBankTransaction = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = addBankTransactionSchema.validate(req.body);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        if (value.fromAccount && !(await checkIdExist(bankModel, value.fromAccount, "bank", res))) return;
        if (value.toAccount && !(await checkIdExist(bankModel, value.toAccount, "bank", res))) return;

        value.companyId = await checkCompany(user, value);
        if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

        value.branchId = value.branchId || null;
        value.createdBy = user?._id || null;
        value.updatedBy = user?._id || null;

        const voucherNo = await generateSequenceNumber(
            { model: BankTransactionModel, prefix: "BT", fieldName: "BankVoucher", companyId: value.companyId }
        );
        value.voucherNo = voucherNo;

        const response = await createOne(BankTransactionModel, value);

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
        }

        return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Bank Transaction"), response, {}));
    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
    }
};

export const getBankTransactions = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const companyId = user?.companyId?._id;
        let { page, limit, search, transactionType, activeFilter, companyFilter } = req.query;

        page = Number(page) || 1;
        limit = Number(limit);

        let criteria: any = { isDeleted: false };

        if (companyId) {
            criteria.companyId = companyId;
        }

        if (companyFilter) {
            criteria.companyId = companyFilter;
        }

        if (search) {
            criteria.$or = [{ voucherNo: { $regex: search, $options: "si" } }];
        }

        if (transactionType) {
            criteria.transactionType = transactionType;
        }

        if (activeFilter) {
            criteria.isActive = activeFilter === "true" ? true : false;
        }

        const options = {
            sort: { createdAt: -1 },
            populate: [
                { path: "companyId", select: "displayName" },
                { path: "fromAccount", select: "name" },
                { path: "toAccount", select: "name" },
                { path: "createdBy", select: "fullName" },
                { path: "updatedBy", select: "fullName" },
            ],
            skip: (page - 1) * limit,
            limit
        };

        const [response, totalData] = await Promise.all([
            getDataWithSorting(BankTransactionModel, criteria, {}, options),
            countData(BankTransactionModel, criteria)
        ]);

        const totalPages = Math.ceil(totalData / limit) || 1;

        const state = { page, limit, totalPages };

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Bank Transactions"), { bankTransaction_data: response, totalData, state }, {}));
    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const getBankTransactionById = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getBankTransactionSchema.validate(req.params);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const response = await getFirstMatch(
            BankTransactionModel,
            { _id: value.id, isDeleted: false },
            {},
            {
                populate: [
                    { path: "companyId", select: "displayName" },
                    { path: "fromAccount", select: "name" },
                    { path: "toAccount", select: "name" },
                    { path: "createdBy", select: "fullName" },
                    { path: "updatedBy", select: "fullName" },
                ]
            }
        );

        if (!response) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Bank Transaction"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Bank Transaction"), response, {}));
    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const updateBankTransaction = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = editBankTransactionSchema.validate(req.body);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        if (value.fromAccount && !(await checkIdExist(bankModel, value.fromAccount, "bank", res))) return;
        if (value.toAccount && !(await checkIdExist(bankModel, value.toAccount, "bank", res))) return;

        const isExist = await getFirstMatch(BankTransactionModel, { _id: value.bankTransactionId, isDeleted: false }, {}, {});
        if (!isExist) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Bank Transaction"), {}, {}));
        }

        value.updatedBy = user?._id || null;

        const response = await updateData(BankTransactionModel, { _id: new ObjectId(value.bankTransactionId) }, value, {});

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Bank Transaction"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Bank Transaction"), response, {}));
    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const deleteBankTransaction = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = deleteBankTransactionSchema.validate(req.params);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const isExist = await getFirstMatch(BankTransactionModel, { _id: value.id, isDeleted: false }, {}, {});
        if (!isExist) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Bank Transaction"), {}, {}));
        }

        const payload = {
            isDeleted: true,
            updatedBy: user?._id || null,
        };

        const response = await updateData(BankTransactionModel, { _id: new ObjectId(value.id) }, payload, {});

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Bank Transaction"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Bank Transaction"), response, {}));
    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};
