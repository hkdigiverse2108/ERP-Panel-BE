import { apiResponse, HTTP_STATUS } from "../../common";
import { contactModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getData, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addContactSchema, deleteContactSchema, editContactSchema, getContactSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addContact = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    let { error, value } = addContactSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    }

    const phoneNo = value?.phoneNo?.phoneNo;
    const whatsappNo = value?.whatsappNo?.phoneNo;

    const orCondition = [];
    if (value?.email) orCondition.push({ email: value?.email });
    if (phoneNo) orCondition.push({ "phoneNo.phoneNo": phoneNo });
    if (whatsappNo) orCondition.push({ "whatsappNo.phoneNo": phoneNo });
    if (value?.panNo) orCondition.push({ panNo: value?.panNo });
    let isExist = null;

    if (orCondition.length) {
      isExist = await getFirstMatch(contactModel, { $or: orCondition, isDeleted: false }, {}, {});

      if (isExist) {
        let errorText = "";

        if (isExist?.email === value?.email) errorText = "Email";
        else if (Number(isExist?.phoneNo?.phoneNo) === Number(phoneNo)) errorText = "Phone number";
        else if (Number(isExist?.whatsappNo?.phoneNo) === Number(whatsappNo)) errorText = "Whatsapp number";
        else if (isExist?.panNo === value?.panNo) errorText = "PAN Number";
        else errorText = "User";

        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist(errorText), {}, {}));
      }
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(contactModel, value);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Contact"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editContactById = async (req, res) => {
  reqInfo(req);

  try {
    const { user } = req?.headers;

    const { error, value } = editContactSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    let isExist = await getFirstMatch(contactModel, { _id: value?.contactId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Bill Of Live Product"), {}, {}));
    }

    const phoneNo = value?.phoneNo?.phoneNo;
    const whatsappNo = value?.whatsappNo?.phoneNo;

    const orCondition = [];
    if (value?.email) orCondition.push({ email: value?.email });
    if (phoneNo) orCondition.push({ "phoneNo.phoneNo": phoneNo });
    if (whatsappNo) orCondition.push({ "whatsappNo.phoneNo": phoneNo });
    if (value?.panNo) orCondition.push({ panNo: value?.panNo });

    if (orCondition.length) {
      isExist = await getFirstMatch(contactModel, { $or: orCondition, isDeleted: false, _id: { $ne: value?.contactId } }, {}, {});

      if (isExist) {
        let errorText = "";

        if (isExist?.email === value?.email) errorText = "Email";
        else if (Number(isExist?.phoneNo?.phoneNo) === Number(phoneNo)) errorText = "Phone number";
        else if (Number(isExist?.whatsappNo?.phoneNo) === Number(whatsappNo)) errorText = "Whatsapp number";
        else if (isExist?.panNo === value?.panNo) errorText = "PAN Number";
        else errorText = "User";

        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist(errorText), {}, {}));
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(contactModel, { _id: value?.contactId, isDeleted: false }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Contact"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Contact details"), response, {}));
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

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (!(await checkIdExist(contactModel, value?.id, "Contact", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(contactModel, { _id: new ObjectId(value?.id) }, payload, {});

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
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, startDate, endDate, activeFilter, typeFilter, companyFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (search) {
      criteria.$or = [{ email: { $regex: search, $options: "si" } }, { panNo: { $regex: search, $options: "si" } }, { phoneNo: { $regex: search, $options: "si" } }, { companyName: { $regex: search, $options: "si" } }, { whatsappNo: { $regex: search, $options: "si" } }];
    }

    if (typeFilter) criteria.contactType = typeFilter;
    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && isNaN(end.getTime())) {
        criteria.createdAt = { $gte: start, $lte: end };
      }
    }

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "membershipId", select: "name" },
        { path: "address.country", select: "name code" },
        { path: "address.state", select: "name code" },
        { path: "address.city", select: "name code" },
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(contactModel, criteria, {}, options);
    const totalData = await countData(contactModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = { page, limit, totalPages };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Contact"), { contact_data: response, totalData, state: stateObj }, {}));
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

    const response = await getFirstMatch(
      contactModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "membershipId", select: "name" },
          { path: "address.country", select: "name code" },
          { path: "address.state", select: "name code" },
          { path: "address.city", select: "name code" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Contact"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Contact"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getContactDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { typeFilter, search, companyFilter } = req.query; // typeFilter: 'supplier', 'customer', 'both'

    let criteria: any = { isDeleted: false, isActive: true };

    // if (companyId) {
    //   criteria.companyId = companyId;
    // }

    // if (companyFilter) {
    //   criteria.companyId = companyFilter;
    // }

    // Filter by contact type
    if (typeFilter) {
      if (typeFilter === "supplier") {
        criteria.$or = [{ contactType: "supplier" }, { contactType: "both" }];
      } else if (typeFilter === "customer") {
        criteria.$or = [{ contactType: "customer" }, { contactType: "both" }];
      } else {
        criteria.contactType = typeFilter;
      }
    }

    // Search filter
    if (search) {
      const searchCriteria = {
        $or: [{ firstName: { $regex: search, $options: "si" } }, { lastName: { $regex: search, $options: "si" } }, { companyName: { $regex: search, $options: "si" } }, { email: { $regex: search, $options: "si" } }],
      };
      criteria = { ...criteria, ...searchCriteria };
    }

    const response = await getData(
      contactModel,
      criteria,
      { firstName: 1, lastName: 1, dob: 1,  email: 1, phoneNo: 1, whatsappNo: 1, contactType: 1, "address.addressLine1": 1, "address.city": 1, "address.state": 1, "address.country": 1, "address.pinCode": 1 },
      {
        sort: { companyName: 1, firstName: 1 },
        limit: search ? 50 : 1000,
        populate: [
          { path: "address.country", select: "name code" },
          { path: "address.state", select: "name code" },
          { path: "address.city", select: "name code" },
        ],
      },
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.companyName || `${item.firstName} ${item.lastName || ""}`.trim(),
      firstName: item.firstName,
      lastName: item.lastName,
      customerCategory: item.customerCategory,
      customerType: item.customerType,
      contactType: item.contactType,
      address: item.address,
      email: item.email,
      phoneNo: item.phoneNo,
      whatsappNo: item.whatsappNo,
      dob: item.dob,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Contact Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
