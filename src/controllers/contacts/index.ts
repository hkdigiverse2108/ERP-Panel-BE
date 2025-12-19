import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { contactModel } from "../../database";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addContactSchema, deleteContactSchema, editContactSchema, getContactSchema } from "../../validation";

const joiOptions = {
  abortEarly: true,
  allowUnknown: false,
  stripUnknown: true,
};

const ObjectId = require("mongoose").Types.ObjectId;

export const addContact = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = addContactSchema.validate(req.body, joiOptions);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    let existingContactDetails = await getFirstMatch(contactModel, { email: value?.email, isDeleted: false }, {}, {});
    if (existingContactDetails) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Email"), {}, {}));

    existingContactDetails = await getFirstMatch(contactModel, { phoneNo: value?.phoneNo, isDeleted: false }, {}, {});
    if (existingContactDetails) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Phone Number"), {}, {}));

    existingContactDetails = await getFirstMatch(contactModel, { panNo: value?.panNo, isDeleted: false }, {}, {});
    if (existingContactDetails) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("PAN Number"), {}, {}));


    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(contactModel, value);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Contact"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteContactById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = deleteContactSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).status(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

    const isContactExist = await getFirstMatch(contactModel, { _id: new ObjectId(value?.id), isDeleted: false }, {}, {});

    if (!isContactExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Contact"), {}, {}));

    value.isDeleted = true;
    value.updatedBy = user?._id || null

    const response = await updateData(contactModel, { _id: new ObjectId(value?.id) }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Contact details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Contact details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};



export const getAllContact = async (req, res) => {
  reqInfo(req);
  try {
    let { page, limit, search, startDate, endDate } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (search) {
      criteria.$or = [{ email: { $regex: search, $options: "i" } }, { panNo: { $regex: search, $options: "i" } }, { phoneNo: { $regex: search, $options: "i" } }, { companyName: { $regex: search, $options: "i" } }, { whatsappNo: { $regex: search, $options: "i" } }];
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && isNaN(end.getTime())) {
        criteria.createdAt = { $gte: start, $lte: end };
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

    const response = await getDataWithSorting(contactModel, criteria, {}, options);
    const totalData = await countData(contactModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = { page, limit, totalPages, totalData, hasNextPage: page < totalPages, hasPrevPage: page > 1 };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Contact"), { contact_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editContactById = async (req, res) => {
  reqInfo(req);

  try {
    const { user } = req?.headers;
    let existingContact = await getFirstMatch(contactModel, { _id: new ObjectId(req.body.id), isDeleted: false }, {}, {});

    if (!existingContact) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Contact"), {}, {}));
    }

    // let { error, value } = editContactSchema.validate(req.body, {
    //   ...joiOptions,
    //   context: { type: existingContact.type },
    // });

    const { error, value } = editContactSchema.validate(req.body, {
      context: { type: existingContact.type },
      stripUnknown: true,
    });


    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0].message, {}, {}));

    if (value.email) {
      existingContact = await getFirstMatch(contactModel, { email: value?.email, isDeleted: false }, {}, {});
      if (existingContact) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Email"), {}, {}));
    }

    if (value.phoneNo) {
      existingContact = await getFirstMatch(contactModel, { phoneNo: value?.phoneNo, isDeleted: false }, {}, {});
      if (existingContact) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Phone Number"), {}, {}));
    }

    if (value.panNo) {
      existingContact = await getFirstMatch(contactModel, { panNo: value?.panNo, isDeleted: false }, {}, {});
      if (existingContact) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("PAN number"), {}, {}));
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(contactModel, { _id: new ObjectId(value?.id), isDeleted: false }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Contact details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Contact details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getContactById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getContactSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    const response = await getFirstMatch(contactModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Contact details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Contact details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).status(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};
