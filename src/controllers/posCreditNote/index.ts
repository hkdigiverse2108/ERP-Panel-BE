import { posCreditNoteModel, PosPaymentModel } from "../../database";
import { apiResponse, HTTP_STATUS, REDEEM_CREDIT_TYPE, POS_PAYMENT_TYPE } from "../../common";
import {
    countData,
    getDataWithSorting,
    getFirstMatch,
    reqInfo,
    responseMessage,
    updateData
} from "../../helper";
import {
    getAllPosCreditNoteSchema,
    getPosCreditNoteSchema,
    deletePosCreditNoteSchema,
    checkRedeemCreditSchema
} from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const checkRedeemCredit = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = checkRedeemCreditSchema.validate(req.body);
        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const { code, type, customerId } = value;
        let redeemableAmount = 0;
        let data: any = null;

        if (type === REDEEM_CREDIT_TYPE.CREDIT_NOTE) {
            data = await getFirstMatch(posCreditNoteModel, { creditNoteNo: code, isDeleted: false }, {}, {});
            if (!data) {
                return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Credit Note not found", {}, {}));
            }
            if (customerId && data.customerId?.toString() !== customerId) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Credit Note does not belong to this customer", {}, {}));
            }
            redeemableAmount = data.creditsRemaining || 0;
        } else if (type === REDEEM_CREDIT_TYPE.ADVANCE_PAYMENT) {
            data = await getFirstMatch(PosPaymentModel, { paymentNo: code, paymentType: POS_PAYMENT_TYPE.ADVANCE, isDeleted: false }, {}, {});
            if (!data) {
                return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Advance Payment not found", {}, {}));
            }
            if (customerId && data.partyId?.toString() !== customerId) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Advance Payment does not belong to this customer", {}, {}));
            }
            console.log(data, "data");
            redeemableAmount = data.amount || 0;
        }

        if (redeemableAmount <= 0) {
            return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "No redeemable credit available", { redeemableAmount: 0 }, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Redeem credit verified successfully", { id: data._id, code: code, type: type, redeemableAmount: redeemableAmount }, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};


export const getAllPosCreditNote = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const companyId = user?.companyId?._id;

        const { error, value } = getAllPosCreditNoteSchema.validate(req.query);
        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        let { page = 1, limit = 10, search, customerId, startDate, endDate } = value;
        page = Number(page);
        limit = Number(limit);

        let criteria: any = { isDeleted: false };
        if (companyId) criteria.companyId = companyId;
        if (customerId) criteria.customerId = new ObjectId(customerId);

        if (search) {
            criteria.$or = [
                { creditNoteNo: { $regex: search, $options: "si" } },
                { notes: { $regex: search, $options: "si" } }
            ];
        }

        if (startDate && endDate) {
            criteria.createdAt = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
        }

        const options = {
            sort: { createdAt: -1 },
            skip: (page - 1) * limit,
            limit,
            populate: [
                { path: "customerId", select: "firstName lastName companyName" },
                { path: "returnPosOrderId", select: "returnOrderNo" },
                { path: "companyId", select: "name" }
            ]
        };

        const response = await getDataWithSorting(posCreditNoteModel, criteria, {}, options);
        const totalData = await countData(posCreditNoteModel, criteria);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Credit Note"), {
            posCreditNote_data: response,
            totalData,
            state: { page, limit, totalPages: Math.ceil(totalData / limit) || 1 }
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const getOnePosCreditNote = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getPosCreditNoteSchema.validate(req.params);
        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const response = await getFirstMatch(posCreditNoteModel, { _id: value?.id, isDeleted: false }, {}, {
            populate: [
                { path: "customerId", select: "firstName lastName companyName email phoneNo" },
                { path: "returnPosOrderId", select: "returnOrderNo items total", populate: [{ path: "items.productId", select: "name" }] },
                { path: "companyId", select: "name" }
            ]
        });

        if (!response) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Credit Note"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Credit Note"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const deletePosCreditNote = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = deletePosCreditNoteSchema.validate(req.params);
        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const isExist = await getFirstMatch(posCreditNoteModel, { _id: value?.id, isDeleted: false }, {}, {});
        if (!isExist) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Credit Note"), {}, {}));
        }

        const response = await updateData(posCreditNoteModel, { _id: value?.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

        if (!response) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.deleteDataError("POS Credit Note"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("POS Credit Note"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};
