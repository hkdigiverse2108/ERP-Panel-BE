import { ADJUSTMENT_TYPE, apiResponse, HTTP_STATUS, PREFIX_MODULES } from "../../common";
import { adjustmentNoteModel, bankModel } from "../../database";
import { checkBranch, checkCompany, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, checkIdExist, getAndIncrementPrefix } from "../../helper";
import { addCreditNoteSchema, deleteCreditNoteSchema, editCreditNoteSchema, getCreditNoteSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addCreditNoteSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!value.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));

    if (!(await checkIdExist(bankModel, value?.bankAccountId, "Bank", res))) return;

    if (value?.image) {
      if (!value?.image?.match(/\.(png|jpg|jpeg)$/)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fileIsNotValid("Image"), {}, {}));
      }
    }

    value.voucherNumber = await getAndIncrementPrefix({
      branchId: value.branchId,
      companyId: value.companyId,
      prefixType: PREFIX_MODULES.CREDIT_NOTE,
      model: adjustmentNoteModel,
      fieldName: "voucherNumber",
    });
    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(adjustmentNoteModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editCreditNoteSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(adjustmentNoteModel, { _id: value?.creditNoteId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Credit Note"), {}, {}));
    }

    if (!(await checkIdExist(bankModel, value?.bankAccountId, "Bank", res))) return;

    if (value?.image) {
      if (!value?.image?.match(/\.(png|jpg|jpeg)$/)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fileIsNotValid("Image"), {}, {}));
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(adjustmentNoteModel, { _id: value?.creditNoteId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Credit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteCreditNoteSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(adjustmentNoteModel, value?.id, "Credit Note", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(adjustmentNoteModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Credit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    let { page, limit, search, startDate, endDate, companyFilter, activeFilter, branchFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false, type: ADJUSTMENT_TYPE.PAYIN };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (branchId) {
      criteria.branchId = branchId;
    }

    if (branchFilter) {
      criteria.branchId = branchFilter;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ voucherNumber: { $regex: search, $options: "si" } }, { description: { $regex: search, $options: "si" } }];
    }

    applyDateFilter(criteria, startDate as string, endDate as string, "date");

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "bankAccountId", select: "name" },
        { path: "companyId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(adjustmentNoteModel, criteria, {}, options);
    const totalData = await countData(adjustmentNoteModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Credit Note"), { creditNote_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getCreditNoteSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      adjustmentNoteModel,
      { _id: value?.id, isDeleted: false, type: ADJUSTMENT_TYPE.PAYIN },
      {},
      {
        populate: [
          { path: "bankAccountId", select: "name" },
          { path: "companyId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Credit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
