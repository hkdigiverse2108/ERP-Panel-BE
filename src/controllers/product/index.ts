import { apiResponse, HTTP_STATUS } from "../../common";
import { productModel } from "../../database";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addProductSchema, deleteProductSchema, editProductSchema, getProductSchema } from "../../validation/product";
import { deleteController, getAllController, getOneController } from "../common";

export const addProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = addProductSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    let isExist = await getFirstMatch(productModel, { $or: [{ name: value?.name }, { itemCode: value?.itemCode }], isDeleted: false }, {}, {});

    if (isExist) {
      let errorText = "";
      if (isExist?.name === value?.name) errorText = "Product Name";
      if (isExist?.itemCode === value?.itemCode) errorText = "Product Item Code";

      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist(errorText), {}, {}));
    }

    let response = await createOne(productModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = editProductSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    let isExist = await getFirstMatch(productModel, { _id: value?.productId, isDeleted: false }, {}, {});

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

    isExist = await getFirstMatch(productModel, { isDeleted: false, $or: [{ name: value?.name }, { itemCode: value?.itemCode }], _id: { $ne: value?.productId } }, {}, {});

    if (isExist) {
      let errorText = "";
      if (isExist?.name === value?.name) errorText = "Product Name";
      if (isExist?.itemCode === value?.itemCode) errorText = "Product Item Code";
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.dataAlreadyExist(errorText), {}, {}));
    }

    const response = await updateData(productModel, { _id: value?.productId }, value, {});

    if (!response) return res.status(HTTP_STATUS?.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Product"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteProduct = async (req, res) => {
  deleteController(req, res, deleteProductSchema, productModel, "Product");
  // reqInfo(req);
  // try {
  //   const { error, value } = deleteProductSchema.validate(req.params);

  //   if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

  //   const isExist = await getFirstMatch(productModel, { _id: value?.id, isDeleted: false }, {}, {});

  //   if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Product"), {}, {}));

  //   const response = await updateData(productModel, { _id: value?.id }, { isDeleted: true }, {});

  //   if (!response) return res.status(HTTP_STATUS?.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS?.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Product"), {}, {}));

  //   return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Product"), response, {}));
  // } catch (error) {
  //   console.error(error);
  //   return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  // }
};

export const getAllProduct = async (req, res) => {
  getAllController(req, res, productModel, "Product");
  // reqInfo(req);
  // try {
  //   const { page, limit, search, startDate, endDate, activeFilter } = req.query;

  //   let criteria: any = { isDeleted: false };

  //   if (search) {
  //     criteria.$or = [{ name: { $regex: search, $options: "si" } }, { itemCode: { $regex: search, $options: "si" } }];
  //   }

  //   if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

  //   if (startDate && endDate) {
  //     const start = new Date(startDate);
  //     const end = new Date(endDate);

  //     if (!isNaN(start.getTime()) && isNaN(end.getTime())) {
  //       criteria.createdAt = {
  //         $gte: start,
  //         $lte: end,
  //       };
  //     }
  //   }

  //   const options: any = {
  //     sort: { createdAt: -1 },
  //     skip: (page - 1) * limit,
  //     limit,
  //   };

  //   if (page && limit) {
  //     options.page = (parseInt(page) + 1) * parseInt(limit);
  //     options.limit = parseInt(limit);
  //   }

  //   const response = await getDataWithSorting(productModel, criteria, { password: 0 }, options);
  //   const countTotal = await countData(productModel, criteria);

  //   const totalPages = Math.ceil(countTotal / limit) || 1;

  //   const stateObj = {
  //     page,
  //     limit,
  //     totalPages,
  //     countTotal,
  //     hasNextPage: page < totalPages,
  //     hasPrevPage: page > 1,
  //   };

  //   return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Productdd"), { product_data: response, state: stateObj }, {}));
  // } catch (error) {
  //   console.error(error);
  //   return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  // }
};

export const getOneProduct = async (req, res) => {
  getOneController(req, res, getProductSchema, productModel, "Product");
  // reqInfo(req);
  // try {
  //   const { error, value } = getProductSchema.validate(req.params);

  //   console.log(req.params);
  //   if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

  //   const response = await getFirstMatch(productModel, { _id: value?.id, isDeleted: false }, {}, {});

  //   if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

  //   return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), response, {}));
  // } catch (error) {
  //   console.error(error);
  //   return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  // }
};
