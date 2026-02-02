import { apiResponse, HTTP_STATUS } from "../../common";
import { branchModel, materialConsumptionModel, productModel, stockModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, generateSequenceNumber, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addMaterialConsumptionSchema, deleteMaterialConsumptionSchema, editMaterialConsumptionSchema, getMaterialConsumptionSchema } from "../../validation";

export const generateConsumptionNo = async (companyId?: string | null) => {
  const latest = await getFirstMatch(
    materialConsumptionModel,
    {
      ...(companyId ? { companyId } : {}),
      isDeleted: false,
    },
    {},
    { sort: { createdAt: -1 } },
  );

  let nextNumber = 1;
  if (latest?.number) {
    const match = String(latest.number).match(/(\d+)\s*$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }

  let candidate = `Con-${nextNumber}`;
  while (
    await getFirstMatch(
      materialConsumptionModel,
      {
        number: candidate,
        isDeleted: false,
        ...(companyId ? { companyId } : {}),
      },
      {},
      {},
    )
  ) {
    nextNumber += 1;
    candidate = `Con-${nextNumber}`;
  }

  return candidate;
};

export const addMaterialConsumption = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addMaterialConsumptionSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    if (value.branchId) {
      if (!(await checkIdExist(branchModel, value.branchId, "Branch", res))) return;
    }

    for (const item of value.items || []) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;

      // check stock qty and update stock
      const stockCriteria: any = {
        productId: item?.productId,
        isDeleted: false,
      };

      stockCriteria.companyId = value?.companyId;

      const stock = await getFirstMatch(stockModel, stockCriteria, {}, {});
      if (!stock) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock"), {}, {}));

      if ((stock?.qty || 0) < item?.qty) continue;
      const currentQty = stock?.qty || 0;
      const nextQty = currentQty - item.qty;
      const updatedStock = await updateData(stockModel, { _id: stock?._id }, { qty: nextQty < 0 ? 0 : nextQty, updatedBy: user?._id || null }, {});

      if (!updatedStock) continue;
    }

    value.number = await generateSequenceNumber({ model: materialConsumptionModel, prefix: "Con", fieldName: "number", companyId: value.companyId });
   
    const isExist = await getFirstMatch(materialConsumptionModel, { companyId: value.companyId, number: value?.number, isDeleted: false }, {}, {});

    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Number"), {}, {}));

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(materialConsumptionModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Material Consumption"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editMaterialConsumption = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editMaterialConsumptionSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    const { materialConsumptionId } = value;
    const criteria: any = { _id: materialConsumptionId, isDeleted: false };

    const isExist = await getFirstMatch(materialConsumptionModel, criteria, {}, {});
    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Material Consumption"), {}, {}));

    if (value.branchId) {
      if (!(await checkIdExist(branchModel, value.branchId, "Branch", res))) return;
    }

    if (value.items) {
      // 1. Map Old Items
      const oldItemMap = new Map();
      if (isExist.items && isExist.items.length > 0) {
        isExist.items.forEach((item) => {
          oldItemMap.set(item.productId.toString(), item.qty);
        });
      }

      // 2. Map New Items
      const newItemMap = new Map();
      value.items.forEach((item) => {
        newItemMap.set(item.productId.toString(), item.qty);
      });

      // 3. Identify all affected products
      const allProductIds = new Set([...oldItemMap.keys(), ...newItemMap.keys()]);

      for (const productId of allProductIds) {
        if (!(await checkIdExist(productModel, productId, "Product", res))) return;

        const oldQty = oldItemMap.get(productId) || 0;
        const newQty = newItemMap.get(productId) || 0;
        const difference = newQty - oldQty;

        if (difference === 0) continue;

        const stockCriteria: any = {
          productId: productId,
          isDeleted: false,
          companyId: isExist.companyId, // Use existing company ID
        };
        // branchId logic if needed (assuming stock is company-wide or branch-specific based on existing patterns)
        // if (isExist.branchId) stockCriteria.branchId = isExist.branchId;
        const stock = await getFirstMatch(stockModel, stockCriteria, {}, {});
        if (!stock) {
          // If trying to increase consumption but no stock record exists
          // if (difference > 0) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound(`Stock for product ${productId}`), {}, {}));
          // If decreasing consumption (adding back to stock), we might need to handle 'creating' stock or erroring.
          // For now assuming stock record must exist to have consumed from it in the first place.
          continue;
        }

        let nextStockQty = stock.qty || 0;

        if (difference > 0) {
          // Consumption increased -> Decrease Stock
          if (nextStockQty < difference) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage(`Insufficient stock for product ${productId}`), {}, {}));
          }
          nextStockQty -= difference;
        } else {
          // Consumption decreased (negative difference) -> Increase Stock (Add back abs(difference))
          nextStockQty += Math.abs(difference);
        }

        const updatedStock = await updateData(stockModel, { _id: stock._id }, { qty: nextStockQty, updatedBy: user?._id || null }, {});
        if (!updatedStock) return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.updateDataError("Stock"), {}, {}));
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(materialConsumptionModel, { _id: materialConsumptionId }, value, { new: true });
    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.updateDataError("Material Consumption"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Material Consumption"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteMaterialConsumption = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteMaterialConsumptionSchema.validate(req.params);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    const isExist = await getFirstMatch(materialConsumptionModel, { _id: value.id, isDeleted: false }, {}, {});
    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Material Consumption"), {}, {}));

    const response = await updateData(materialConsumptionModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});
    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.deleteDataError("Material Consumption"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Material Consumption"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllMaterialConsumption = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, startDate, endDate, typeFilter, branchFilter, activeFilter, companyFilter } = req.query;

    page = Number(page) || 1;
    limit = Number(limit) || 10;

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";
    if (typeFilter) criteria.type = typeFilter;
    if (branchFilter) criteria.branchId = branchFilter;

    if (search) {
      criteria.$or = [{ number: { $regex: search, $options: "si" } }, { remark: { $regex: search, $options: "si" } }];
    }

    if (startDate && endDate) {
      criteria.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "items.productId", select: "name" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(materialConsumptionModel, criteria, {}, options);
    const totalData = await countData(materialConsumptionModel, criteria);
    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Material Consumption"), { material_consumption_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getMaterialConsumptionById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getMaterialConsumptionSchema.validate(req.params);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const response = await getFirstMatch(
      materialConsumptionModel,
      { _id: value.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "items.productId", select: "name" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Material Consumption"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Material Consumption"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
