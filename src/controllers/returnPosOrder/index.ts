
import { apiResponse, HTTP_STATUS, RETURN_POS_ORDER_TYPE } from "../../common";
import { returnPosOrderModel, productModel, stockModel, contactModel, PosOrderModel, bankModel, posCreditNoteModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, generateSequenceNumber, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addReturnPosOrderSchema, editReturnPosOrderSchema, getReturnPosOrderSchema, deleteReturnPosOrderSchema, returnPosOrderDropDownSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addReturnPosOrder = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = addReturnPosOrderSchema.validate(req.body);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        value.companyId = await checkCompany(user, value);
        if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

        if (value.posOrderId && !(await checkIdExist(PosOrderModel, value.posOrderId, "POS Order", res))) return;
        if (value.customerId && !(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;
        if (value.bankAccountId && !(await checkIdExist(bankModel, value.bankAccountId, "Bank Account", res))) return;

        for (const item of value.items) {
            if (!(await checkIdExist(productModel, item.productId, "Product", res))) return;
        }

        value.returnOrderNo = await generateSequenceNumber({ model: returnPosOrderModel, prefix: "RETPOS", fieldName: "returnOrderNo", companyId: value.companyId });

        value.createdBy = user?._id || null;
        value.updatedBy = user?._id || null;

        const response = await createOne(returnPosOrderModel, value);

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
        }

        // --- Stock Management Logic ---
        // Increase stock for returned items
        for (const item of response.items) {
            await stockModel.findOneAndUpdate(
                { productId: item.productId, companyId: response.companyId, isDeleted: false },
                { $inc: { qty: item.quantity } }
            );
        }
        // ----------------------------

        // --- Create POS Credit Note if type is sales_return ---
        if (response.type === RETURN_POS_ORDER_TYPE.SALES_RETURN) {
            const creditNoteData = {
                companyId: response.companyId,
                customerId: response.customerId,
                returnPosOrderId: response._id,
                totalAmount: response.total,
                creditsRemaining: response.total,
                creditNoteNo: await generateSequenceNumber({ model: posCreditNoteModel, prefix: "POSCN", fieldName: "creditNoteNo", companyId: response.companyId }),
                createdBy: user?._id || null,
                updatedBy: user?._id || null,
            };
            await createOne(posCreditNoteModel, creditNoteData);
        }
        // ------------------------------------------------------

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Return POS Order"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const editReturnPosOrder = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = editReturnPosOrderSchema.validate(req.body);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const isExist = await getFirstMatch(returnPosOrderModel, { _id: value?.returnPosOrderId, isDeleted: false }, {}, {});
        if (!isExist) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Return POS Order"), {}, {}));
        }

        if (value.posOrderId && !(await checkIdExist(PosOrderModel, value.posOrderId, "POS Order", res))) return;
        if (value.customerId && !(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;
        if (value.bankAccountId && !(await checkIdExist(bankModel, value.bankAccountId, "Bank Account", res))) return;

        if (value.items) {
            for (const item of value.items) {
                if (!(await checkIdExist(productModel, item.productId, "Product", res))) return;
            }
        }

        value.updatedBy = user?._id || null;

        const response = await updateData(returnPosOrderModel, { _id: value?.returnPosOrderId }, value, {});

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Return POS Order"), {}, {}));
        }

        // --- Stock Management Logic ---
        // 1. Revert old quantities (decrease stock since we increased it on create)
        for (const item of isExist.items) {
            await stockModel.findOneAndUpdate(
                { productId: item.productId, companyId: isExist.companyId, isDeleted: false },
                { $inc: { qty: -item.quantity } }
            );
        }

        // 2. Apply new quantities (increase stock)
        for (const item of response.items) {
            await stockModel.findOneAndUpdate(
                { productId: item.productId, companyId: response.companyId, isDeleted: false },
                { $inc: { qty: item.quantity } }
            );
        }
        // ----------------------------

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Return POS Order"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const getAllReturnPosOrder = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const companyId = user?.companyId?._id;
        let { page, limit, search, customerId, type, startDate, endDate } = req.query;

        page = Number(page);
        limit = Number(limit);

        let criteria: any = { isDeleted: false };
        if (companyId) criteria.companyId = companyId;
        if (customerId) criteria.customerId = new ObjectId(customerId);
        if (type) criteria.type = type;

        if (search) {
            criteria.$or = [
                { returnOrderNo: { $regex: search, $options: "si" } },
                { reason: { $regex: search, $options: "si" } }
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
                { path: "customerId", select: "firstName lastName " },
                { path: "posOrderId", select: "orderNo" },
                { path: "items.productId", select: "name" },
                { path: "bankAccountId", select: "name" },

                { path: "salesManId", select: "fullName" }
            ]
        };

        const response = await getDataWithSorting(returnPosOrderModel, criteria, {}, options);
        const totalData = await countData(returnPosOrderModel, criteria);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Return POS Order"), { returnPosOrder_data: response, totalData, state: { page, limit, totalPages: Math.ceil(totalData / limit) } }, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const getOneReturnPosOrder = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getReturnPosOrderSchema.validate(req.params);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        const response = await getFirstMatch(returnPosOrderModel, { _id: value.id, isDeleted: false }, {}, {
            populate: [
                { path: "customerId", select: "firstName lastName " },
                { path: "posOrderId", select: "orderNo" },
                { path: "items.productId", select: "name" },
                { path: "bankAccountId", select: "name" },

                { path: "salesManId", select: "fullName" }
            ]
        });

        if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Return POS Order"), {}, {}));

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Return POS Order"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const deleteReturnPosOrder = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = deleteReturnPosOrderSchema.validate(req.params);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        const isExist = await getFirstMatch(returnPosOrderModel, { _id: value.id, isDeleted: false }, {}, {});
        if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Return POS Order"), {}, {}));

        const response = await updateData(returnPosOrderModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

        if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Return POS Order"), {}, {}));

        // --- Stock Management Logic ---
        // Decrease stock for deleted return order
        for (const item of isExist.items) {
            await stockModel.findOneAndUpdate(
                { productId: item.productId, companyId: isExist.companyId, isDeleted: false },
                { $inc: { qty: -item.quantity } }
            );
        }
        // ----------------------------

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Return POS Order"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const returnPosOrderDropDown = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const companyId = user?.companyId?._id;
        const { error, value } = returnPosOrderDropDownSchema.validate(req.query);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        const { search, customerId, type } = value;
        let criteria: any = { isDeleted: false };
        if (companyId) criteria.companyId = companyId;
        if (customerId) criteria.customerId = new ObjectId(customerId);
        if (type) criteria.type = type;

        if (search) {
            criteria.$or = [{ returnOrderNo: { $regex: search, $options: "si" } }];
        }

        const response = await returnPosOrderModel.find(criteria, { returnOrderNo: 1, total: 1 }).sort({ createdAt: -1 }).limit(100);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Return POS Order Dropdown"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

// export const getCreditNotes = async (req, res) => {
//     reqInfo(req);
//     try {
//         const { user } = req?.headers;
//         const companyId = user?.companyId?._id;
//         let { page, limit, search, companyFilter } = req.query;

//         page = Number(page);
//         limit = Number(limit);

//         let criteria: any = { isDeleted: false, type: RETURN_POS_ORDER_TYPE.SALES_RETURN };
//         if (companyId) criteria.companyId = companyId;
//         if (companyFilter) criteria.companyId = new ObjectId(companyFilter);

//         if (search) {
//             criteria.$or = [
//                 { returnOrderNo: { $regex: search, $options: "si" } },
//                 { reason: { $regex: search, $options: "si" } }
//             ];
//         }

//         const options = {
//             sort: { createdAt: -1 },
//             skip: (page - 1) * limit,
//             limit,
//             populate: [
//                 { path: "customerId", select: "firstName lastName " },
//                 { path: "posOrderId", select: "orderNo" },
//                 { path: "items.productId", select: "name" }
//             ]
//         };

//         const response = await getDataWithSorting(returnPosOrderModel, criteria, {}, options);
//         const totalData = await countData(returnPosOrderModel, criteria);

//         return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales Return Credit Notes"), { data: response, totalData, state: { page, limit, totalPages: Math.ceil(totalData / limit) } }, {}));
//     } catch (error) {
//         console.error(error);
//         return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
//     }
// };
