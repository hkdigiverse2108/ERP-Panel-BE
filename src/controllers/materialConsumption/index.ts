import { apiResponse, HTTP_STATUS } from "../../common";
import { branchModel, materialConsumptionModel, productModel, userModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
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
    }

    value.number = await generateConsumptionNo(value.companyId);
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

    // if (value?.number) {
    //   const duplicate = await getFirstMatch(
    //     materialConsumptionModel,
    //     {
    //       _id: { $ne: materialConsumptionId },
    //       companyId: isExist.companyId,
    //       number: value.number,
    //       isDeleted: false,
    //     },
    //     {},
    //     {},
    //   );

    //   if (duplicate) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Number"), {}, {}));
    // }

    if (value.branchId) {
      if (!(await checkIdExist(branchModel, value.branchId, "Branch", res))) return;
    }

    if (value.items) {
      for (const item of value.items) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
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
          { path: "items.productId", select: "name itemCode" },
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
