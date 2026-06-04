import { apiResponse, HTTP_STATUS, USER_TYPES, PREFIX_MODULES } from "../../common";
import { PrefixModel, companyModel, branchModel } from "../../database";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addPrefixSchema, deletePrefixSchema, editPrefixSchema, getPrefixSchema } from "../../validation";
import { redisGet, redisSet, redisdelPattern } from "../../helper";

const ObjectId = require("mongoose").Types.ObjectId;

export const addPrefix = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;

    // Only Super Admin can add prefix templates (where companyId is null)
    if (userType !== USER_TYPES.SUPER_ADMIN) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accessDenied, {}, {}));
    }

    const { error, value } = addPrefixSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    // Check if prefix for this prefixType already exists as a template
    const isExist = await getFirstMatch(PrefixModel, { prefixType: value?.prefixType, companyId: null, isDeleted: false }, {}, {});
    if (isExist) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist(`Prefix for module ${value.prefixType}`), {}, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;
    value.companyId = null; // Ensure templates have no companyId

    const response = await createOne(PrefixModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    // Auto-create prefix for all existing branches
    try {
      const branches = await branchModel.find({ isDeleted: false });
      if (branches.length > 0) {
        const branchPrefixes = branches.map((branch: any) => ({
          prefixType: value.prefixType,
          prefix: value.prefix,
          sequenceNumber: value.sequenceNumber,
          currentNumber: value.sequenceNumber,
          isActive: value.isActive,
          companyId: branch.companyId,
          branchId: branch._id,
          createdBy: user?._id || null,
          updatedBy: user?._id || null,
        }));
        await PrefixModel.insertMany(branchPrefixes);
      }
    } catch (prefixError) {
      console.error("Error creating prefixes for existing branches:", prefixError);
      // We don't fail the template creation if cloning fails, but we log it
    }

    await redisdelPattern("prefix:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Prefix Template and populated to branches"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editPrefix = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;

    const { error, value } = editPrefixSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(PrefixModel, { _id: value?.prefixId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Prefix"), {}, {}));
    }

    // Ownership check: If not super admin, can only edit their own company's prefix
    if (userType !== USER_TYPES.SUPER_ADMIN) {
      if (!isExist.companyId || isExist.companyId.toString() !== companyId.toString()) {
        return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accessDenied, {}, {}));
      }
    }

    // If changing prefixType, check for duplicates in the same company scope
    if (value.prefixType && value.prefixType !== isExist.prefixType) {
      const typeExist = await getFirstMatch(
        PrefixModel,
        {
          prefixType: value.prefixType,
          companyId: isExist.companyId || null,
          isDeleted: false,
          _id: { $ne: value.prefixId },
        },
        {},
        {},
      );
      if (typeExist) {
        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist(`Prefix for module ${value.prefixType}`), {}, {}));
      }
    }

    value.updatedBy = user?._id || null;

    if (!isExist.companyId && value.isActive !== undefined) {
      // Global prefix template: propagate isActive status to all related company prefixes
      await PrefixModel.updateMany({ prefixType: isExist.prefixType, isDeleted: false }, { $set: { isActive: value.isActive, updatedBy: user?._id || null } });
    }

    const response = await updateData(PrefixModel, { _id: value?.prefixId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Prefix"), {}, {}));
    }

    await redisdelPattern("prefix:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Prefix"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deletePrefix = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;

    const { error, value } = deletePrefixSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(PrefixModel, { _id: value?.id, isDeleted: false }, {}, {});
    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Prefix"), {}, {}));
    }

    // Ownership check
    if (userType !== USER_TYPES.SUPER_ADMIN) {
      if (!isExist.companyId || isExist.companyId.toString() !== companyId.toString()) {
        return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accessDenied, {}, {}));
      }
    }

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    let response;
    if (!isExist.companyId) {
      // Global prefix deletion: delete all prefixes of this type across all companies
      await PrefixModel.updateMany({ prefixType: isExist.prefixType, isDeleted: false }, { $set: payload });
      response = isExist;
    } else {
      response = await updateData(PrefixModel, { _id: new ObjectId(value?.id) }, payload, {});
    }

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Prefix"), {}, {}));
    }

    await redisdelPattern("prefix:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Prefix"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllPrefix = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `prefix:all:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Prefix"), cachedData, {}));

    let { page, limit, search, prefixType, activeFilter, companyFilter, branchFilter } = req.query;

    let criteria: any = { isDeleted: false };
    // Scoping
    if (userType === USER_TYPES.SUPER_ADMIN) {
      if (!companyFilter) {
        criteria.companyId = null; // Default: templates
        if (!branchFilter) {
          criteria.branchId = null; // Default: templates
        }
      } else if (companyFilter !== "all") {
        criteria.companyId = new ObjectId(companyFilter as string); // Specific company
      }

      if (branchFilter && branchFilter !== "all") {
        criteria.branchId = new ObjectId(branchFilter as string); // Specific branch
      }
    } else {
      // Regular users are scoped to their company and branch
      criteria.companyId = companyId ? new ObjectId(companyId) : null;
      criteria.branchId = branchId ? new ObjectId(branchId) : null;
    }

    if (search) {
      criteria.$or = [{ prefixType: { $regex: search, $options: "si" } }, { prefix: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (prefixType) {
      criteria.prefixType = prefixType;
    }

    const options: any = {
      sort: { prefixType: 1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
        { path: "updatedBy", select: "fullName userType" },
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(PrefixModel, criteria, {}, options);
    const totalData = await countData(PrefixModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    const result = { prefix_data: response, totalData, state };
    await redisSet(cacheKey, result, 3600);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Prefix"), result, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOnePrefix = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getPrefixSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `prefix:one:req:${JSON.stringify(req.params)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Prefix"), cachedData, {}));

    const response = await getFirstMatch(
      PrefixModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
          { path: "updatedBy", select: "fullName userType" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Prefix"), {}, {}));
    }

    await redisSet(cacheKey, response, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Prefix"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// // Get prefix by prefixType
// export const getPrefixByType = async (req, res) => {
//   reqInfo(req);
//   try {
//     const { user } = req?.headers;
//     const companyId = user?.companyId?._id;
//     const { type } = req.params;

//     if (!type) {
//       return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Prefix type is required", {}, {}));
//     }

//     if (!Object.values(PREFIX_MODULES).includes(type as any)) {
//       return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Invalid prefix type", {}, {}));
//     }

//     let criteria: any = { prefixType: type, isDeleted: false };
//     if (companyId) {
//       criteria.companyId = companyId;
//     } else {
//       criteria.companyId = null; // Get template if no companyId
//     }

//     const response = await getFirstMatch(PrefixModel, criteria, {}, {});

//     if (!response) {
//       return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Prefix"), {}, {}));
//     }

//     return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Prefix"), response, {}));
//   } catch (error) {
//     console.error(error);
//     return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
//   }
// };
