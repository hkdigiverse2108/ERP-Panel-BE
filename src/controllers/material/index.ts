import { apiResponse, HTTP_STATUS } from "../../common";
import { materialModel } from "../../database";
import { checkCompany, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, checkBranch } from "../../helper";
import { addMaterialSchema, deleteMaterialSchema, editMaterialSchema, getMaterialSchema } from "../../validation";

export const addMaterial = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addMaterialSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);
    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!value.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));
    let isExist = await getFirstMatch(materialModel, { companyId: value.companyId, materialNo: value?.materialNo, isDeleted: false }, {}, {});

    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Material No"), {}, {}));

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(materialModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Material"), {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.getDataSuccess("Material"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editMaterial = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editMaterialSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    const { materialId } = value;

    const isExist = await getFirstMatch(
      materialModel,
      {
        _id: materialId,
        isDeleted: false,
      },
      {},
      {},
    );

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Material"), {}, {}));

    if (value?.materialNo) {
      const duplicate = await getFirstMatch(
        materialModel,
        {
          _id: { $ne: materialId },
          companyId: isExist.companyId,
          materialNo: value.materialNo,
          isDeleted: false,
        },
        {},
        {},
      );

      if (duplicate) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Material No"), {}, {}));
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(materialModel, { _id: materialId }, value, { new: true });

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.updateDataError("Material"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Material"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteMaterial = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = deleteMaterialSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    const isExist = await getFirstMatch(materialModel, { _id: value.id, isDeleted: false }, {}, {});

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Material"), {}, {}));

    const response = await updateData(materialModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Material"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Material"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

const formatMaterial = (mat: any) => {
  const matObj = mat.toObject ? mat.toObject() : mat;
  if (matObj.materialTaken) {
    matObj.materialTaken = matObj.materialTaken.map((item: any) => {
      const product = item.productId;
      if (product && product._id) {
        const matchedVariant = item.variantId
          ? (product.variants || []).find((v: any) => v._id.toString() === item.variantId.toString())
          : null;

        const updatedProduct = {
          ...product,
          variantId: item.variantId || null,
        };

        if (matchedVariant) {
          item.variant = matchedVariant;
          updatedProduct.name = `${product.name} - ${matchedVariant.name}`;
          if (matchedVariant.sku) updatedProduct.sku = matchedVariant.sku;
          if (matchedVariant.itemCode) updatedProduct.itemCode = matchedVariant.itemCode;
          if (matchedVariant.barcode) updatedProduct.barcode = matchedVariant.barcode;
          if (matchedVariant.barcodeType) updatedProduct.barcodeType = matchedVariant.barcodeType;
          updatedProduct.isActive = matchedVariant.isActive ?? updatedProduct.isActive;
          if (matchedVariant.attributes) updatedProduct.attributes = matchedVariant.attributes;
          updatedProduct.variants = [matchedVariant];
        } else {
          updatedProduct.variants = [];
        }
        item.productId = updatedProduct;
      }
      return item;
    });
  }
  if (matObj.goodsReceived) {
    matObj.goodsReceived = matObj.goodsReceived.map((item: any) => {
      const product = item.productId;
      if (product && product._id) {
        const matchedVariant = item.variantId
          ? (product.variants || []).find((v: any) => v._id.toString() === item.variantId.toString())
          : null;

        const updatedProduct = {
          ...product,
          variantId: item.variantId || null,
        };

        if (matchedVariant) {
          item.variant = matchedVariant;
          updatedProduct.name = `${product.name} - ${matchedVariant.name}`;
          if (matchedVariant.sku) updatedProduct.sku = matchedVariant.sku;
          if (matchedVariant.itemCode) updatedProduct.itemCode = matchedVariant.itemCode;
          if (matchedVariant.barcode) updatedProduct.barcode = matchedVariant.barcode;
          if (matchedVariant.barcodeType) updatedProduct.barcodeType = matchedVariant.barcodeType;
          updatedProduct.isActive = matchedVariant.isActive ?? updatedProduct.isActive;
          if (matchedVariant.attributes) updatedProduct.attributes = matchedVariant.attributes;
          updatedProduct.variants = [matchedVariant];
        } else {
          updatedProduct.variants = [];
        }
        item.productId = updatedProduct;
      }
      return item;
    });
  }
  return matObj;
};

export const getAllMaterial = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    let { page, limit, search, startDate, endDate, activeFilter, companyFilter, branchFilter } = req.query;

    page = Number(page) || 1;
    limit = Number(limit) || 10;

    let criteria: any = { isDeleted: false };

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
      criteria.$or = [{ materialNo: { $regex: search, $options: "si" } }, { description: { $regex: search, $options: "si" } }];
    }

    applyDateFilter(criteria, startDate as string, endDate as string, "materialDate");

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
        { path: "materialTaken.productId", select: "name sku itemCode barcode variants" },
        { path: "goodsReceived.productId", select: "name sku itemCode barcode variants" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(materialModel, criteria, {}, options);

    const totalData = await countData(materialModel, criteria);
    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = {
      page,
      limit,
      totalPages,
    };

    const formattedResponse = response.map(formatMaterial);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Material"), { material_data: formattedResponse, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getMaterialById = async (req, res) => {
  reqInfo(req);
  try {
    let { error, value } = getMaterialSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const response = await getFirstMatch(
      materialModel,
      { _id: value.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
          { path: "materialTaken.productId", select: "name sku itemCode barcode variants" },
          { path: "goodsReceived.productId", select: "name sku itemCode barcode variants" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Material"), {}, {}));

    const formattedResponse = formatMaterial(response);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Material"), formattedResponse, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
