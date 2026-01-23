import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { feedbackModel, InvoiceModel, contactModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addFeedbackSchema, deleteFeedbackSchema, editFeedbackSchema, getFeedbackSchema } from "../../validation/feedback";

const ObjectId = require("mongoose").Types.ObjectId;

export const addFeedback = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addFeedbackSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    // Validate invoice if provided
    if (value.invoiceId && !(await checkIdExist(InvoiceModel, value.invoiceId, "Invoice", res))) return;

    // Validate customer if provided
    if (value.customerId && !(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(feedbackModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Feedback"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editFeedback = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editFeedbackSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(feedbackModel, { _id: value?.feedbackId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Feedback"), {}, {}));
    }

    // Validate invoice if being changed
    if (value.invoiceId && value.invoiceId !== isExist.invoiceId?.toString()) {
      if (!(await checkIdExist(InvoiceModel, value.invoiceId, "Invoice", res))) return;
    }

    // Validate customer if being changed
    if (value.customerId && value.customerId !== isExist.customerId?.toString()) {
      if (!(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(feedbackModel, { _id: value?.feedbackId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Feedback"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Feedback"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteFeedback = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteFeedbackSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(feedbackModel, value?.id, "Feedback", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(feedbackModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Feedback"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Feedback"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllFeedback = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page = 1, limit = 10, search, customerId, rating, startDate, endDate, activeFilter, companyFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ comment: { $regex: search, $options: "si" } }];
    }

    if (customerId) {
      criteria.customerId = customerId;
    }

    if (rating) {
      criteria.rating = Number(rating);
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.createdAt = { $gte: start, $lte: end };
      }
    }

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },

        { path: "invoiceId", select: "documentNo date netAmount" },
        { path: "customerId", select: "firstName lastName companyName" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(feedbackModel, criteria, {}, options);
    const totalData = await countData(feedbackModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Feedback"), { feedback_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneFeedback = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getFeedbackSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      feedbackModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "invoiceId", select: "documentNo date netAmount customerName" },
          { path: "customerId", select: "firstName lastName companyName email phoneNo" },
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Feedback"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Feedback"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
