import { appendFile } from "fs";
import { apiResponse, HTTP_STATUS, isValidObjectId } from "../../common";
import { roleModel } from "../../database/model/role";
import { createOne, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addRoleSchema, deleteRoleSchema, editRoleSchema } from "../../validation";

export const addRole = async (req, res) => {
  reqInfo(req);
  const { user } = req?.headers;
  try {
    const { error, value } = addRoleSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, error?.details[0].message, {}, {}));

    const existingRole = await getFirstMatch(roleModel, { role: value?.role, isDeleted: false }, {}, {});

    if (existingRole) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Role"), {}, {}));

    const payload = {
      ...value,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    };

    const response = await createOne(roleModel, payload);

    if (!response) res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Role"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editRole = async (req, res) => {
  reqInfo(req);
  const { user } = req?.headers;
  try {
    let { error, value } = editRoleSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, error?.details[0]?.message, {}, {}));

    if (!isValidObjectId(value?.roleId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("Role Id"), {}, {}));
    }

    let existingRole = await getFirstMatch(roleModel, { _id: value?.roleId, isDeleted: false }, {}, {});

    if (!existingRole) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Role"), {}, {}));

    existingRole = await getFirstMatch(roleModel, { role: value?.role, isDeleted: false, _id: { $ne: value?.roleId } }, {}, {});
    if (existingRole) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Role"), {}, {}));

    value.updatedBy = user?._id;
    const response = await updateData(roleModel, { _id: value?.roleId, isDeleted: false }, value, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Role"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteRole = async (req, res) => {
  reqInfo(req);
  try {
    let { error, value } = deleteRoleSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, error?.details[0]?.message, {}, {}));

    if (!isValidObjectId(value?.id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("Role Id"), {}, {}));
    }

    const existingRole = await getFirstMatch(roleModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!existingRole) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Role"), {}, {}));

    const response = await updateData(roleModel, { _id: value?.id }, { isDeleted: true }, {});

    if (!response) return res.status(HTTP_STATUS?.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Role"), {}, {}));

    return res.status(HTTP_STATUS?.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Role"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllRole = async (req, res) => {
  reqInfo(req);
  try {

    

  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
