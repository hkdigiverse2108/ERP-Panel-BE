import { posCreditNoteModel } from "../../database";
import { apiResponse, HTTP_STATUS } from "../../common";
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
    deletePosCreditNoteSchema
} from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

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
