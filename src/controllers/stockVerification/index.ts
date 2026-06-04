import { apiResponse, APPROVAL_STATUS, HTTP_STATUS, PREFIX_MODULES } from "../../common";
import { stockVerificationModel, productModel, categoryModel, stockModel } from "../../database";
import { checkBranch, checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, getAndIncrementPrefix } from "../../helper";
import { addStockVerificationSchema, deleteStockVerificationSchema, editStockVerificationSchema, getStockVerificationSchema } from "../../validation";

export const addStockVerification = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addStockVerificationSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!value.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));

    if (!(await checkIdExist(categoryModel, value?.categoryId, "Category", res))) return;

    if (value.items) {
      for (const item of value.items) {
        const product = await getFirstMatch(productModel, { _id: item?.productId, isDeleted: false }, {}, {});
        if (!product) {
          return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));
        }
        if (item.variantId) {
          const variantExists = (product.variants || []).some(
            (v: any) => v._id.toString() === item.variantId.toString()
          );
          if (!variantExists) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Variant not found on this product", {}, {}));
          }
        }
      }
    }

    value.stockVerificationNo = await getAndIncrementPrefix({
      branchId: value.branchId,
      companyId: value.companyId,
      prefixType: PREFIX_MODULES.STOCK_VERIFICATION,
      model: stockVerificationModel,
      fieldName: "stockVerificationNo",
    });

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(stockVerificationModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    if (response.status === APPROVAL_STATUS.APPROVED) {
      for (const item of response.items) {
        const stockFilter: any = {
          productId: item.productId,
          companyId: response.companyId,
          branchId: response.branchId,
          isDeleted: false,
        };
        if (item.variantId) {
          stockFilter.variantId = item.variantId;
        } else {
          stockFilter.variantId = { $exists: false };
        }
        const existingStock = await getFirstMatch(stockModel, stockFilter, {}, {});
        if (existingStock) {
          await updateData(stockModel, { _id: existingStock._id }, { qty: item.physicalQty }, {});
        } else {
          const product = await getFirstMatch(productModel, { _id: item.productId }, {}, {});
          if (product) {
            let purchasePrice = product.purchasePrice || 0;
            let landingCost = product.landingCost || 0;
            let mrp = product.mrp || 0;
            let sellingPrice = product.sellingPrice || 0;

            if (item.variantId) {
              const matchedVariant = (product.variants || []).find(
                (v: any) => v._id.toString() === item.variantId.toString()
              );
              if (matchedVariant) {
                purchasePrice = matchedVariant.purchasePrice || purchasePrice;
                mrp = matchedVariant.mrp || mrp;
                sellingPrice = matchedVariant.sellingPrice || sellingPrice;
              }
            }

            const newStockPayload = {
              companyId: response.companyId,
              branchId: response.branchId,
              productId: item.productId,
              variantId: item.variantId || undefined,
              qty: item.physicalQty,
              uomId: product.uomId,
              purchasePrice,
              landingCost,
              mrp,
              sellingPrice,
              createdBy: user?._id || null,
              updatedBy: user?._id || null,
            };
            const newStock = await createOne(stockModel, newStockPayload);
            await updateData(productModel, { _id: item.productId }, { $push: { stockIds: newStock?._id } }, {});
          }
        }
      }
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
        const product = await getFirstMatch(productModel, { _id: item?.productId, isDeleted: false }, {}, {});
        if (!product) {
          return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));
        }
        if (item.variantId) {
          const variantExists = (product.variants || []).some(
            (v: any) => v._id.toString() === item.variantId.toString()
          );
          if (!variantExists) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Variant not found on this product", {}, {}));
          }
        }
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(stockVerificationModel, { _id: value?.stockVerificationId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Stock Verification"), {}, {}));
    }

    if (response.status === APPROVAL_STATUS.APPROVED) {
      for (const item of response.items) {
        const stockFilter: any = {
          productId: item.productId,
          companyId: response.companyId,
          branchId: response.branchId,
          isDeleted: false,
        };
        if (item.variantId) {
          stockFilter.variantId = item.variantId;
        } else {
          stockFilter.variantId = { $exists: false };
        }
        const existingStock = await getFirstMatch(stockModel, stockFilter, {}, {});
        if (existingStock) {
          await updateData(stockModel, { _id: existingStock._id }, { qty: item.physicalQty }, {});
        } else {
          const product = await getFirstMatch(productModel, { _id: item.productId }, {}, {});
          if (product) {
            let purchasePrice = product.purchasePrice || 0;
            let landingCost = product.landingCost || 0;
            let mrp = product.mrp || 0;
            let sellingPrice = product.sellingPrice || 0;

            if (item.variantId) {
              const matchedVariant = (product.variants || []).find(
                (v: any) => v._id.toString() === item.variantId.toString()
              );
              if (matchedVariant) {
                purchasePrice = matchedVariant.purchasePrice || purchasePrice;
                mrp = matchedVariant.mrp || mrp;
                sellingPrice = matchedVariant.sellingPrice || sellingPrice;
              }
            }

            const newStockPayload = {
              companyId: response.companyId,
              branchId: response.branchId,
              productId: item.productId,
              variantId: item.variantId || undefined,
              qty: item.physicalQty,
              uomId: product.uomId,
              purchasePrice,
              landingCost,
              mrp,
              sellingPrice,
              createdBy: user?._id || null,
              updatedBy: user?._id || null,
            };
            const newStock = await createOne(stockModel, newStockPayload);
            await updateData(productModel, { _id: item.productId }, { $push: { stockIds: newStock?._id } }, {});
          }
        }
      }
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

const formatStockVerification = (sv: any) => {
  const svObj = sv.toObject ? sv.toObject() : sv;
  if (svObj.items) {
    svObj.items = svObj.items.map((item: any) => {
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
  return svObj;
};

export const getAllStockVerification = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const { page, limit, search, startDate, endDate, status, branchFilter, activeFilter, companyFilter, statusFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ stockVerificationNo: { $regex: search, $options: "si" } }, { remark: { $regex: search, $options: "si" } }];
    }

    if (status) {
      criteria.status = status;
    }

    if (statusFilter) {
      criteria.status = statusFilter;
    }

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

    if (startDate && endDate) {
      let start = new Date(startDate as string);
      let end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      applyDateFilter(criteria, start.toISOString(), end.toISOString());
    }

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        {
          path: "items.productId",
          select: "name itemCode variants",
          // populate: [{ path: "uomId", select: "name code" }],
        },
        { path: "createdBy", select: "fullName userType" },
        { path: "updatedBy", select: "name userType" },
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

    const formattedResponse = response.map(formatStockVerification);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Stock Verification"), { stockVerification_data: formattedResponse, totalData, state: stateObj }, {}));
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
            select: "name itemCode variants",
            populate: [
              // { path: "uomId", select: "name code" },
              { path: "categoryId", select: "name" },
              { path: "brandId", select: "name" },
            ],
          },
          { path: "createdBy", select: "fullName userType" },
          { path: "updatedBy", select: "name userType" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock Verification"), {}, {}));
    }

    const formattedResponse = formatStockVerification(response);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Stock Verification"), formattedResponse, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
