import { apiResponse, HTTP_STATUS } from "../../common";
import { stockVerificationModel, productModel, categoryModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addStockVerificationSchema, deleteStockVerificationSchema, editStockVerificationSchema, getStockVerificationSchema } from "../../validation/stockVerification";

// Generate unique stock verification number
const generateStockVerificationNo = async (companyId): Promise<string> => {
  const count = await stockVerificationModel.countDocuments({ companyId });
  const prefix = "SV";
  const number = String(count + 1).padStart(6, "0");
  return `${prefix}${number}`;
};

export const addStockVerification = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addStockVerificationSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    if (!(await checkIdExist(categoryModel, value?.categoryId, "Category", res))) return;

    if (value.items) {
      for (const item of value.items) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    let stockVerificationNo = await generateStockVerificationNo(value.companyId);

    while (true) {
      const isExist = await getFirstMatch(stockVerificationModel, { companyId: value.companyId, isDeleted: false, stockVerificationNo }, {}, {});

      if (!isExist) break;

      const match = stockVerificationNo.match(/^([A-Z]+)(\d+)$/);
      if (!match) throw new Error("Invalid stockVerificationNo format");

      const [, text, numStr] = match;
      const nextNumber = String(Number(numStr) + 1).padStart(numStr.length, "0");

      stockVerificationNo = `${text}${nextNumber}`;
    }

    value.stockVerificationNo = stockVerificationNo;
    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(stockVerificationModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Stock Verification"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editStockVerification = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editStockVerificationSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(stockVerificationModel, { _id: value?.stockVerificationId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock Verification"), {}, {}));
    }

    if (value.items) {
      for (const item of value.items) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(stockVerificationModel, { _id: value?.stockVerificationId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Stock Verification"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Stock Verification"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteStockVerification = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = deleteStockVerificationSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(stockVerificationModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock Verification"), {}, {}));
    }

    const response = await updateData(stockVerificationModel, { _id: value?.id }, { isDeleted: true }, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Stock Verification"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Stock Verification"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllStockVerification = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { page = 1, limit = 10, search, startDate, endDate, status, branchId, activeFilter, companyFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ stockVerificationNo: { $regex: search, $options: "si" } }, { remark: { $regex: search, $options: "si" } }];
    }

    if (status) {
      criteria.status = status;
    }

    if (branchId) {
      criteria.branchId = branchId;
    }

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999); // Include the entire end date

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.verificationDate = {
          $gte: start,
          $lte: end,
        };
      }
    }

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        {
          path: "items.productId",
          select: "name itemCode",
          // populate: [{ path: "uomId", select: "name code" }],
        },
      ],
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      limit: parseInt(limit as string),
    };

    const response = await getDataWithSorting(stockVerificationModel, criteria, {}, options);
    const totalData = await countData(stockVerificationModel, criteria);

    const totalPages = Math.ceil(totalData / parseInt(limit as string)) || 1;

    const stateObj = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages,
      // totalData,
      // hasNextPage: parseInt(page as string) < totalPages,
      // hasPrevPage: parseInt(page as string) > 1,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Stock Verification"), { stockVerification_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneStockVerification = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getStockVerificationSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      stockVerificationModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          {
            path: "items.productId",
            select: "name itemCode",
            populate: [
              // { path: "uomId", select: "name code" },
              { path: "categoryId", select: "name" },
              { path: "brandId", select: "name" },
            ],
          },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock Verification"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Stock Verification"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
