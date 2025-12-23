import { apiResponse, HTTP_STATUS } from "../../common";
import { callRequestModel } from "../../database";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addCallRequestSchema, deleteCallRequestSchema, editCallRequestSchema, getCallRequestSchema } from "../../validation";

export const addCallRequest = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = addCallRequestSchema.validate(req.body);

    if (error) res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(callRequestModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, response, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Call Request"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editCallRequest = async (req, res) => {
  reqInfo(req);

  try {
    const { user } = req?.headers;
    let { error, value } = editCallRequestSchema.validate(req.body);

    if (error) res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    let isExist = await getFirstMatch(callRequestModel, { _id: value?.callRequestId, isDeleted: false }, {}, {});

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Call Request"), {}, {}));

    value.updatedBy = user?._id || null;

    const response = await updateData(callRequestModel, { _id: value?.callRequestId }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, response, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Call Request"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteCallRequest = async (req, res) => {
  reqInfo(req);

  try {
    const { user } = req?.headers;
    let { error, value } = deleteCallRequestSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const isExist = await getFirstMatch(callRequestModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Call Request"), {}, {}));

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(callRequestModel, { _id: value?.id }, payload, {});

    if (!response) return res.status(HTTP_STATUS?.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Call Request"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Call Request"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllCallRequest = async (req, res) => {
  reqInfo(req);
  try {
    let { page, limit, search, startDate, endDate, activeFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (search) {
      criteria.$or = [{ businessName: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.createdAt = {
          $gte: start,
          $lte: end,
        };
      }
    }

    const options: any = {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    };

    if (page && limit) {
      options.page = (parseInt(page) + 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(callRequestModel, criteria, {}, options);
    const totalData = await countData(callRequestModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = {
      page,
      limit,
      totalPages,
      
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Call Request"), { call_Request_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneCallRequest = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getCallRequestSchema.validate(req.params);
    const { id } = value;

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).status(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(callRequestModel, { _id: id }, {}, {});

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Call Request"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Call Request"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
