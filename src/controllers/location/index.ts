import { HTTP_STATUS, LOCATION_TYPE } from "../../common";
import { apiResponse } from "../../common/utils";
import { locationModel } from "../../database";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addLocationSchema, deleteLocationSchema, editLocationSchema, getCityByStateSchema, getLocationSchema, getStateByCountrySchema } from "../../validation";

export const addLocation = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const { error, value } = addLocationSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    if (!(await checkIdExist(locationModel, value?.parentId, "Parent Location", res))) return;

    let isExist;

    isExist = await getFirstMatch(
      locationModel,
      {
        name: value.name,
        type: value.type,
        parentId: value.parentId || null,
        isDeleted: false,
      },
      {},
      {},
    );

    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Location"), {}, {}));

    if (value.type === LOCATION_TYPE.COUNTRY && value.code) {
      isExist = await getFirstMatch(
        locationModel,
        {
          type: LOCATION_TYPE.COUNTRY,
          code: value.code,
          isDeleted: false,
        },
        {},
        {},
      );

      if (isExist) {
        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Country code"), {}, {}));
      }
    }

    // STATE code uniqueness (within same country)
    if (value.type === LOCATION_TYPE.STATE && value.code) {
      isExist = await getFirstMatch(
        locationModel,
        {
          type: LOCATION_TYPE.STATE,
          code: value.code,
          parentId: value.parentId,
          isDeleted: false,
        },
        {},
        {},
      );

      if (isExist) {
        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("State code"), {}, {}));
      }
    }

    if (value.type === LOCATION_TYPE.COUNTRY && value.parentId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Country cannot have parent", {}, {}));
    }

    if ((value.type === LOCATION_TYPE.STATE || value.type === LOCATION_TYPE.CITY) && !value.parentId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Parent location is required", {}, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(locationModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Location"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editLocationById = async (req, res) => {
  reqInfo(req);
  try {
    const user = req.headers;

    const { error, value } = editLocationSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    if (!(await checkIdExist(locationModel, value?.locationId, "Location", res))) return;
    if (!(await checkIdExist(locationModel, value?.parentId, "Parent Location", res))) return;

    let isExist;

    isExist = await getFirstMatch(
      locationModel,
      {
        name: value.name,
        type: value.type,
        parentId: value.parentId || null,
        _id: { $ne: value.locationId },
        isDeleted: false,
      },
      {},
      {},
    );

    if (isExist) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Location"), {}, {}));
    }

    if (value.type === LOCATION_TYPE.COUNTRY && value.code) {
      isExist = await getFirstMatch(
        locationModel,
        {
          type: LOCATION_TYPE.COUNTRY,
          code: value.code,
          isDeleted: false,
          _id: { $ne: value.locationId },
        },
        {},
        {},
      );

      if (isExist) {
        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Country code"), {}, {}));
      }
    }

    // STATE code uniqueness (within same country)
    if (value.type === LOCATION_TYPE.STATE && value.code) {
      isExist = await getFirstMatch(
        locationModel,
        {
          type: LOCATION_TYPE.STATE,
          code: value.code,
          parentId: value.parentId,
          isDeleted: false,
          _id: { $ne: value.locationId },
        },
        {},
        {},
      );

      if (isExist) {
        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("State code"), {}, {}));
      }
    }

    if (value.type === LOCATION_TYPE.COUNTRY && value.parentId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Country cannot have parent", {}, {}));
    }

    if ((value.type === LOCATION_TYPE.STATE || value.type === LOCATION_TYPE.CITY) && value.parentId === null) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Parent location is required", {}, {}));
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(locationModel, { _id: value.locationId, isDeleted: false }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Location"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Location"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteLocationById = async (req, res) => {
  reqInfo(req);
  try {
    const user = req.headers;

    const { error, value } = deleteLocationSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const location = await getFirstMatch(locationModel, { _id: value.id, isDeleted: false }, {}, {});

    if (!location) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Location"), {}, {}));
    }

    const childExists = await getFirstMatch(locationModel, { parentId: value.id, isDeleted: false }, {}, {});

    if (childExists) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, "Cannot delete location with child locations", {}, {}));
    }

    const response = await updateData(
      locationModel,
      { _id: value.id },
      {
        isDeleted: true,
        updatedBy: user?._id || null,
      },
      {},
    );

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Location"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllLocation = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let { page, limit, search, startDate, endDate, activeFilter, typeFilter, parentFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (!parentFilter && typeFilter) {
      criteria.type = typeFilter;
    }

    if (parentFilter) {
      criteria.parentId = parentFilter;
    }

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { code: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.createdAt = {
          $gte: start,
          $lte: end,
        };
      }
    }

    const options: any = {
      sort: { createdAt: -1 },
      populate: [{ path: "parentId", select: "name type" }],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(locationModel, criteria, {}, options);

    const totalData = await countData(locationModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Location"), { location_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getLocationById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getLocationSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const response = await getFirstMatch(
      locationModel,
      { _id: value.id, isDeleted: false },
      {},
      {
        populate: [{ path: "parentId", select: "name type" }],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Location"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Location"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllCountries = async (req, res) => {
  reqInfo(req);

  try {
    const countries = await getDataWithSorting(
      locationModel,
      {
        type: LOCATION_TYPE.COUNTRY,
        isDeleted: false,
        isActive: true,
      },
      { name: 1, code: 1 },
      { sort: { name: 1 } },
    );

    const dropdownData = countries.map((item) => ({
      _id: item._id,
      name: item.name,
      code: item.code,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Country"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getStatesByCountry = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getStateByCountrySchema.validate(req.params);
    const { countryId } = value;

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    // Ensure country exists
    if (!(await checkIdExist(locationModel, countryId, "Country", res))) return;

    const states = await getDataWithSorting(
      locationModel,
      {
        type: LOCATION_TYPE.STATE,
        parentId: countryId,
        isDeleted: false,
        isActive: true,
      },
      { name: 1, code: 1 },
      { sort: { name: 1 } },
    );

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("State"), states, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getCitiesByState = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getCityByStateSchema.validate(req.params);
    const { stateId } = value;

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    // Ensure state exists
    if (!(await checkIdExist(locationModel, stateId, "State", res))) return;

    const cities = await getDataWithSorting(
      locationModel,
      {
        type: LOCATION_TYPE.CITY,
        parentId: stateId,
        isDeleted: false,
        isActive: true,
      },
      { name: 1 },
      { sort: { name: 1 } },
    );

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("City"), cities, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
