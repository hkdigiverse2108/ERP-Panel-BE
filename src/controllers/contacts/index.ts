import { apiResponse, HTTP_STATUS } from "../../common";
import { contactModel, locationModel } from "../../database";
import {
  checkCompany,
  checkIdExist,
  countData,
  createOne,
  getData,
  getDataWithSorting,
  getFirstMatch,
  reqInfo,
  responseMessage,
  updateData,
  applyDateFilter,
  extractDataFromFile,
} from "../../helper";
import {
  addContactSchema,
  deleteContactSchema,
  editContactSchema,
  getContactSchema,
  addBulkContactSchema,
} from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addContact = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    let { error, value } = addContactSchema.validate(req.body);

    if (error)
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            error?.details[0]?.message,
            {},
            {},
          ),
        );

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            responseMessage?.fieldIsRequired("Company Id"),
            {},
            {},
          ),
        );
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
      isExist = await getFirstMatch(
        contactModel,
        { $or: orCondition, isDeleted: false },
        {},
        {},
      );

      if (isExist) {
        let errorText = "";

        if (isExist?.email === value?.email) errorText = "Email";
        else if (Number(isExist?.phoneNo?.phoneNo) === Number(phoneNo))
          errorText = "Phone number";
        else if (Number(isExist?.whatsappNo?.phoneNo) === Number(whatsappNo))
          errorText = "Whatsapp number";
        else if (isExist?.panNo === value?.panNo) errorText = "PAN Number";
        else errorText = "User";

        return res
          .status(HTTP_STATUS.CONFLICT)
          .json(
            new apiResponse(
              HTTP_STATUS.CONFLICT,
              responseMessage.dataAlreadyExist(errorText),
              {},
              {},
            ),
          );
      }
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(contactModel, value);
    if (!response)
      return res
        .status(HTTP_STATUS.NOT_IMPLEMENTED)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_IMPLEMENTED,
            responseMessage?.addDataError,
            {},
            {},
          ),
        );

    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new apiResponse(
          HTTP_STATUS.CREATED,
          responseMessage?.addDataSuccess("Contact"),
          response,
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          error.message || responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const editContactById = async (req, res) => {
  reqInfo(req);

  try {
    const { user } = req?.headers;

    const { error, value } = editContactSchema.validate(req.body);

    if (error)
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            error?.details[0].message,
            {},
            {},
          ),
        );

    let isExist = await getFirstMatch(
      contactModel,
      { _id: value?.contactId, isDeleted: false },
      {},
      {},
    );

    if (!isExist) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_FOUND,
            responseMessage?.getDataNotFound("Contact"),
            {},
            {},
          ),
        );
    }

    const phoneNo = value?.phoneNo?.phoneNo;
    const whatsappNo = value?.whatsappNo?.phoneNo;

    const orCondition = [];
    if (value?.email) orCondition.push({ email: value?.email });
    if (phoneNo) orCondition.push({ "phoneNo.phoneNo": phoneNo });
    if (whatsappNo) orCondition.push({ "whatsappNo.phoneNo": phoneNo });
    if (value?.panNo) orCondition.push({ panNo: value?.panNo });

    if (orCondition.length) {
      isExist = await getFirstMatch(
        contactModel,
        { $or: orCondition, isDeleted: false, _id: { $ne: value?.contactId } },
        {},
        {},
      );

      if (isExist) {
        let errorText = "";

        if (isExist?.email === value?.email) errorText = "Email";
        else if (Number(isExist?.phoneNo?.phoneNo) === Number(phoneNo))
          errorText = "Phone number";
        else if (Number(isExist?.whatsappNo?.phoneNo) === Number(whatsappNo))
          errorText = "Whatsapp number";
        else if (isExist?.panNo === value?.panNo) errorText = "PAN Number";
        else errorText = "User";

        return res
          .status(HTTP_STATUS.CONFLICT)
          .json(
            new apiResponse(
              HTTP_STATUS.CONFLICT,
              responseMessage.dataAlreadyExist(errorText),
              {},
              {},
            ),
          );
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(
      contactModel,
      { _id: value?.contactId, isDeleted: false },
      value,
      {},
    );

    if (!response)
      return res
        .status(HTTP_STATUS.NOT_IMPLEMENTED)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_IMPLEMENTED,
            responseMessage?.updateDataError("Contact"),
            {},
            {},
          ),
        );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.updateDataSuccess("Contact details"),
          response,
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const deleteContactById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = deleteContactSchema.validate(req.params);

    if (error)
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            error?.details[0]?.message,
            {},
            {},
          ),
        );

    if (!(await checkIdExist(contactModel, value?.id, "Contact", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(
      contactModel,
      { _id: new ObjectId(value?.id) },
      payload,
      {},
    );

    if (!response)
      return res
        .status(HTTP_STATUS.NOT_IMPLEMENTED)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_IMPLEMENTED,
            responseMessage?.deleteDataError("Contact details"),
            {},
            {},
          ),
        );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.deleteDataSuccess("Contact details"),
          response,
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const getAllContact = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let {
      page,
      limit,
      search,
      startDate,
      endDate,
      activeFilter,
      typeFilter,
      companyFilter,
    } = req.query;

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (search) {
      criteria.$or = [
        { email: { $regex: search, $options: "si" } },
        { panNo: { $regex: search, $options: "si" } },
        { phoneNo: { $regex: search, $options: "si" } },
        { companyName: { $regex: search, $options: "si" } },
        { whatsappNo: { $regex: search, $options: "si" } },
      ];
    }

    if (typeFilter) criteria.contactType = typeFilter;
    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    applyDateFilter(criteria, startDate as string, endDate as string);

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

    const response = await getDataWithSorting(
      contactModel,
      criteria,
      {},
      options,
    );
    const totalData = await countData(contactModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = { page, limit, totalPages };

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.getDataSuccess("Contact"),
          { contact_data: response, totalData, state: stateObj },
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const getContactById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getContactSchema.validate(req.params);

    if (error)
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            error?.details[0].message,
            {},
            {},
          ),
        );

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

    if (!response)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_FOUND,
            responseMessage?.getDataNotFound("Contact"),
            {},
            {},
          ),
        );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.getDataSuccess("Contact"),
          response,
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const getContactDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { typeFilter, search, companyFilter, startDate, endDate } = req.query; // typeFilter: 'supplier', 'customer', 'both'

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = new ObjectId(companyFilter);
    }

    // Filter by contact type
    if (typeFilter) {
      // if (typeFilter === "supplier") {
      //   criteria.$or = [{ contactType: "supplier" }, { contactType: "both" }];
      // } else if (typeFilter === "customer") {
      //   criteria.$or = [{ contactType: "customer" }, { contactType: "both" }];
      // } else {
      //   criteria.contactType = typeFilter;
      // }
      criteria.contactType = typeFilter;
    }

    applyDateFilter(criteria, startDate as string, endDate as string);

    // Search filter
    if (search) {
      const searchCriteria = {
        $or: [
          { firstName: { $regex: search, $options: "si" } },
          { lastName: { $regex: search, $options: "si" } },
          { companyName: { $regex: search, $options: "si" } },
          { email: { $regex: search, $options: "si" } },
          { "phoneNo.phoneNo": { $regex: search, $options: "si" } },
        ],
      };
      criteria = { ...criteria, ...searchCriteria };
    }

    const response = await getData(
      contactModel,
      criteria,
      {
        firstName: 1,
        lastName: 1,
        dob: 1,
        email: 1,
        phoneNo: 1,
        whatsappNo: 1,
        contactType: 1,
        customerType: 1,
        "address.addressLine1": 1,
        "address.city": 1,
        "address.state": 1,
        "address.country": 1,
        "address.pinCode": 1,
        "address._id": 1,
        "address.gstIn": 1,
      },
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
      name:
        item.companyName || `${item.firstName} ${item.lastName || ""}`.trim(),
      firstName: item.firstName,
      lastName: item.lastName,
      customerType: item.customerType,
      contactType: item.contactType,
      address: item.address,
      email: item.email,
      phoneNo: item.phoneNo,
      whatsappNo: item.whatsappNo,
      dob: item.dob,
    }));

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.getDataSuccess("Contact Dropdown"),
          dropdownData,
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const addBulkContact = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    if (!req.file) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            responseMessage?.fieldIsRequired("File"),
            {},
            {},
          ),
        );
    }

    const { data, error: extractError } = extractDataFromFile(req.file);
    if (extractError) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(new apiResponse(HTTP_STATUS.BAD_REQUEST, extractError, {}, {}));
    }


    if (!Array.isArray(data) || data.length === 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            "No data found in the file",
            {},
            {},
          ),
        );
    }

    const contactsToAdd = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      let item = data[i];

      // --- Pre-process the item ---

      // 1. Handle booleans string (TRUE/FALSE)
      Object.keys(item).forEach((key) => {
        if (typeof item[key] === "string") {
          const val = item[key].trim().toUpperCase();
          if (val === "TRUE") item[key] = true;
          else if (val === "FALSE") item[key] = false;
        }
      });

      // 2. Handle phone numbers and other fields that might come as numbers from Excel
      [
        "phoneNo",
        "whatsappNo",
        "contactNo",
        "panNo",
        "gstIn",
        "pinCode",
        "accountNumber",
        "telephoneNo",
      ].forEach((field) => {
        if (item[field] !== undefined && item[field] !== null) {
          item[field] = String(item[field]).trim();
        }
      });

      // 3. Handle date strings (DD-MM-YYYY or DD/MM/YYYY to Date object)
      ["dob", "anniversaryDate"].forEach((dateField) => {
        if (item[dateField] && typeof item[dateField] === "string") {
          const dateStr = item[dateField].trim();
          const dateParts = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
          if (dateParts) {
            const day = parseInt(dateParts[1], 10);
            const month = parseInt(dateParts[2], 10) - 1;
            const year = parseInt(dateParts[3], 10);
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
              item[dateField] = date;
            }
          }
        }
      });

      // Validate with Joi
      let { error, value } = addBulkContactSchema.validate(item);

      if (error) {
        errors.push({ row: i + 1, error: error.details[0].message });
        continue;
      }

      value.companyId = await checkCompany(user, value);

      if (!value.companyId) {
        errors.push({ row: i + 1, error: "Company ID is required" });
        continue;
      }

      // --- Structured Nesting ---

      // 1. Phone numbers (clean digits only)
      if (value.phoneNo) {
        const phoneDigits = String(value.phoneNo).replace(/\D/g, "");
        value.phoneNo = { phoneNo: Number(phoneDigits) };
      }
      if (value.whatsappNo) {
        const whatsappDigits = String(value.whatsappNo).replace(/\D/g, "");
        value.whatsappNo = { phoneNo: Number(whatsappDigits) };
      }

      // 2. Opening Balance
      value.openingBalance = {
        debitBalance: value.debitBalance || "0",
        creditBalance: value.creditBalance || "0",
      };
      delete value.debitBalance;
      delete value.creditBalance;

      // 3. Bank Details
      value.bankDetails = {
        ifscCode: value.ifscCode || "",
        name: value.bankName || "",
        branch: value.branch || "",
        accountNumber: value.accountNumber || "",
      };
      delete value.ifscCode;
      delete value.bankName;
      delete value.branch;
      delete value.accountNumber;

      // 4. Address & Location Mapping
      const addressObj: any = {
        gstType: value.gstType || "",
        gstIn: value.gstIn || "",
        contactFirstName: value.contactFirstName || "",
        contactLastName: value.contactLastName || "",
        contactCompanyName: value.contactCompanyName || "",
        contactNo: {
          phoneNo: Number(String(value.contactNo || 0).replace(/\D/g, "")),
        },
        contactEmail: value.contactEmail || "",
        addressLine1: value.addressLine1 || "",
        addressLine2: value.addressLine2 || "",
        pinCode: value.pinCode || null,
      };

      // Map Location Names to IDs
      if (value.country) {
        const countryRec = await getFirstMatch(
          locationModel,
          {
            name: { $regex: new RegExp(`^${value.country.trim()}$`, "i") },
            type: "country",
            isDeleted: false,
          },
          {},
          {},
        );
        if (countryRec) addressObj.country = countryRec._id;
      }
      if (value.state) {
        const stateRec = await getFirstMatch(
          locationModel,
          {
            name: { $regex: new RegExp(`^${value.state.trim()}$`, "i") },
            type: "state",
            isDeleted: false,
          },
          {},
          {},
        );
        if (stateRec) addressObj.state = stateRec._id;
      }
      if (value.city) {
        const cityRec = await getFirstMatch(
          locationModel,
          {
            name: { $regex: new RegExp(`^${value.city.trim()}$`, "i") },
            type: "city",
            isDeleted: false,
          },
          {},
          {},
        );
        if (cityRec) addressObj.city = cityRec._id;
      }

      value.address = [addressObj];

      // Clean up flattened address fields
      [
        "gstType",
        "gstIn",
        "contactFirstName",
        "contactLastName",
        "contactCompanyName",
        "contactNo",
        "contactEmail",
        "addressLine1",
        "addressLine2",
        "country",
        "state",
        "city",
        "pinCode",
      ].forEach((f) => delete value[f]);

      // --- Duplicate Check ---
      const orCondition = [];
      if (value.email) orCondition.push({ email: value.email });
      if (value.phoneNo?.phoneNo)
        orCondition.push({ "phoneNo.phoneNo": value.phoneNo.phoneNo });
      if (value.panNo) orCondition.push({ panNo: value.panNo });

      if (orCondition.length) {
        const isExist = await getFirstMatch(
          contactModel,
          { $or: orCondition, isDeleted: false, companyId: value.companyId },
          {},
          {},
        );
        if (isExist) {
          errors.push({
            row: i + 1,
            error: "Contact with this Email, Phone or PAN already exists",
          });
          continue;
        }
      }

      value.createdBy = user?._id || null;
      value.updatedBy = user?._id || null;
      contactsToAdd.push(value);
    }

    if (errors.length > 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            "Bulk upload failed due to some errors.",
            {},
            { errors },
          ),
        );
    }

    const response = await contactModel.insertMany(contactsToAdd);
    if (!response) {
      return res
        .status(HTTP_STATUS.NOT_IMPLEMENTED)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_IMPLEMENTED,
            responseMessage?.addDataError,
            {},
            {},
          ),
        );
    }

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.addDataSuccess("Bulk Contacts"),
          response,
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};
